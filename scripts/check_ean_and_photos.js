#!/usr/bin/env node
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

(async () => {
  const ean = '8422675000604';

  // Check all possible EAN fields
  for (const field of ['ean', 'barcode', 'codigoBarras', 'EAN']) {
    const snap = await db.collection('cafes').where(field, '==', ean).get();
    console.log(`${field} = ${ean}: ${snap.size} results`);
    snap.forEach((d) => console.log(`  docId: ${d.id} | nombre: ${d.data().nombre}`));
  }

  // Also check for the known docId pattern
  const possibleIds = ['satans_coffee_corner_blend_grano_340g', 'satans_blend_grano_340g'];
  for (const id of possibleIds) {
    const doc = await db.collection('cafes').doc(id).get();
    if (doc.exists) {
      const d = doc.data();
      console.log(`\nDoc ${id} EXISTS:`);
      console.log(`  nombre: ${d.nombre}`);
      console.log(`  ean: ${d.ean}`);
      console.log(`  barcode: ${d.barcode}`);
      console.log(`  imagenUrl: ${d.imagenUrl ? 'yes' : 'no'}`);
    } else {
      console.log(`\nDoc ${id} NOT FOUND`);
    }
  }

  // Search by name
  const allSnap = await db.collection('cafes').get();
  let found = 0;
  allSnap.forEach((d) => {
    const data = d.data();
    if (data.nombre && data.nombre.toLowerCase().includes('satan')) {
      console.log(`\nFound Satan's: ${d.id} => ${data.nombre}, ean=${data.ean}`);
      found++;
    }
    if (data.ean === ean || data.barcode === ean || data.codigoBarras === ean) {
      console.log(`\nFound by EAN field: ${d.id} => ${data.nombre}`);
      found++;
    }
  });
  if (!found) console.log('\nNo Satan/EAN matches found in full scan');

  // Count cafes without photos
  let noPhoto = 0;
  let noPhotoList = [];
  allSnap.forEach((d) => {
    const data = d.data();
    const hasPhoto =
      data.imagenUrl &&
      !data.imagenUrl.includes('placeholder') &&
      !data.imagenUrl.includes('noimage');
    if (!hasPhoto) {
      noPhoto++;
      noPhotoList.push({ id: d.id, nombre: data.nombre, ean: data.ean });
    }
  });
  console.log(`\n=== Cafes WITHOUT photo: ${noPhoto} ===`);
  noPhotoList.forEach((c) => console.log(`  ${c.id} | ${c.nombre} | EAN: ${c.ean || 'N/A'}`));

  console.log(`\n=== Total cafes: ${allSnap.size} ===`);

  process.exit(0);
})();
