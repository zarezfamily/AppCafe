// Identify all entries and photo status for the brands to fix
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();

const BRANDS = [
  'Cafes La Mexicana',
  'Cafes Orus',
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
  'Lavazza',
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
];

async function main() {
  for (const marca of BRANDS) {
    const snap = await db.collection('cafes').where('marca', '==', marca).get();
    console.log(`\n=== ${marca}: ${snap.size} entries ===`);
    snap.docs.forEach((d) => {
      const data = d.data();
      const foto =
        data.fotoUrl || data.foto || data.imageUrl || data.officialPhoto || data.bestPhoto || '';
      const hasStorage = foto.includes('storage.googleapis.com');
      const photosOrig = data.photos?.original || '';
      console.log(
        `  ${d.id} | ${(data.nombre || '').substring(0, 60)} | storage:${hasStorage} | orig:${photosOrig.substring(0, 60)}`
      );
    });
  }

  // Also find Lavazza Qualità Oro
  const lavazza = await db.collection('cafes').where('marca', '==', 'Lavazza').get();
  console.log('\n=== LAVAZZA QUALITÀ ORO ===');
  lavazza.docs.forEach((d) => {
    const n = d.data().nombre || '';
    if (n.toLowerCase().includes('qualità oro') || n.toLowerCase().includes('qualita oro')) {
      console.log(`  DELETE: ${d.id} | ${n}`);
    }
  });

  process.exit(0);
}
main();
