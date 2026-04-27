const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

// 1. Find Café Jurado Dolce Gusto Extra Intenso
// 2. Find duplicate "Café Natural Arábico en Grano" entries
// 3. Find Peet's Simply Oatmeal
// 4. List all brands NOT yet processed with white bg

(async () => {
  console.log('=== SEARCHING FOR ENTRIES TO DELETE/MERGE ===\n');

  // Search Café Jurado
  const jurado = await db.collection('cafes').where('marca', '==', 'Café Jurado').get();
  console.log(`Café Jurado (${jurado.size}):`);
  jurado.forEach((d) => console.log(`  ${d.id}: "${d.data().nombre}"`));

  // Search for the duplicate Arábico en Grano
  const allCafes = await db.collection('cafes').get();
  console.log(`\nSearching "Arábico en Grano"...`);
  allCafes.forEach((d) => {
    const n = d.data().nombre || '';
    if (n.includes('Arábico en Grano') || n.includes('Arabico en Grano')) {
      console.log(`  ${d.id}: "${n}" | marca: ${d.data().marca}`);
    }
  });

  // Search Peet's Simply Oatmeal
  console.log(`\nSearching "Simply Oatmeal"...`);
  allCafes.forEach((d) => {
    const n = d.data().nombre || '';
    if (n.includes('Oatmeal') || n.includes('oatmeal')) {
      console.log(`  ${d.id}: "${n}" | marca: ${d.data().marca}`);
    }
  });

  // List all brands and count
  const brandsDone = new Set([
    "De'Longhi",
    'Dolce Gusto',
    'Hacendado',
    'illy',
    'INCAPTO',
    'Ineffable Coffee',
    'Kaffekapslen',
    'Kfetea',
    'Kimbo',
    "L'OR",
    'La Colombe',
    'Melitta',
    'Mogorttini',
    'Montecelio',
    'Mövenpick',
    'Nomad Coffee',
    'Novell',
    'Onyx Coffee Lab',
    "Peet's",
    'Right Side Coffee',
    'San Jorge Coffee Roasters',
    'Cafes Orus',
    'Cafe de Finca',
    'Café Dromedario',
    'Cafe Fortaleza',
    'Cafe Platino',
    'Café Royal',
    'Cafe Saula',
    'Cafés Baqué',
    'Cafés Camuy',
    'Cafes Candelas',
    'Cafés El Criollo',
    // Previously done: Carrefour, AUCHAN, Alcampo, Trung Nguyen, Lavazza, Marcilla, etc from imports
    'Carrefour',
    'AUCHAN',
    'Alcampo',
    'Trung Nguyen',
  ]);

  const brandCounts = {};
  allCafes.forEach((d) => {
    const m = d.data().marca || 'Sin marca';
    brandCounts[m] = (brandCounts[m] || 0) + 1;
  });

  console.log(`\n=== ALL BRANDS NOT YET PROCESSED ===`);
  const sorted = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]);
  let pending = 0;
  for (const [brand, count] of sorted) {
    if (!brandsDone.has(brand)) {
      console.log(`  ${brand} (${count})`);
      pending += count;
    }
  }
  console.log(
    `\nTotal pending: ${pending} entries across ${sorted.filter(([b]) => !brandsDone.has(b)).length} brands`
  );

  process.exit(0);
})();
