const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

(async () => {
  const ids = [
    'delta_platinum_grano_1kg',
    'ean_7613033174667',
    'ean_7613032396350',
    'orus_capsulas_nespresso_colombia_52g',
    'pont_arabica_premium_grano_250g',
  ];
  for (const id of ids) {
    const doc = await db.collection('cafes').doc(id).get();
    if (!doc.exists) {
      console.log(`${id}: NOT FOUND`);
      continue;
    }
    const d = doc.data();
    console.log(`\n=== ${id} ===`);
    console.log(`  nombre: ${d.nombre || d.name}`);
    console.log(`  marca: ${d.marca}`);
    console.log(`  amazonUrl: ${d.amazonUrl || d.url || 'N/A'}`);
    console.log(`  imageUrl: ${d.imageUrl || 'N/A'}`);
    console.log(`  fotoUrl: ${d.fotoUrl || 'N/A'}`);
    console.log(`  officialPhoto: ${d.officialPhoto || 'N/A'}`);
    console.log(`  bestPhoto: ${d.bestPhoto || 'N/A'}`);
    console.log(`  asin: ${d.asin || 'N/A'}`);
    console.log(`  ean: ${d.ean || d.codigoBarras || 'N/A'}`);
  }
  process.exit(0);
})();
