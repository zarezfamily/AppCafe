// Check existing Carrefour and AUCHAN entries
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();

async function main() {
  // Check Carrefour
  const carrefour = await db.collection('cafes').where('marca', '==', 'Carrefour').get();
  console.log(`Carrefour: ${carrefour.size} entries`);
  carrefour.docs.forEach((d) => console.log(`  ${d.id} | ${d.data().nombre}`));

  // Check variations
  for (const m of ['carrefour', 'CARREFOUR', 'Carrefour Classic', 'Carrefour Extra']) {
    const q = await db.collection('cafes').where('marca', '==', m).get();
    if (q.size > 0) console.log(`  "${m}": ${q.size} entries`);
  }

  // Check AUCHAN
  const auchan = await db.collection('cafes').where('marca', '==', 'AUCHAN').get();
  console.log(`\nAUCHAN: ${auchan.size} entries`);
  auchan.docs.forEach((d) => console.log(`  ${d.id} | ${d.data().nombre}`));

  // Check Alcampo variations
  for (const m of ['Alcampo', 'ALCAMPO', 'Auchan', 'auchan', 'PRODUCTO ALCAMPO']) {
    const q = await db.collection('cafes').where('marca', '==', m).get();
    if (q.size > 0) console.log(`  "${m}": ${q.size} entries`);
  }

  process.exit(0);
}
main();
