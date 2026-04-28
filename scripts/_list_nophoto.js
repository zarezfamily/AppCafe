const admin = require('firebase-admin');
const fs = require('fs');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const TARGET_BRAND = process.argv[2] || 'Consum';

(async () => {
  const snap = await db.collection('cafes').where('marca', '==', TARGET_BRAND).get();
  console.log(`${TARGET_BRAND}: ${snap.size} docs total`);

  const noPhoto = [];
  snap.forEach((d) => {
    const data = d.data();
    const photo = data.officialPhoto || data.photoURL || '';
    if (!photo) {
      noPhoto.push({ id: d.id, nombre: data.nombre, marca: data.marca });
    }
  });

  console.log(`Sin foto: ${noPhoto.length}`);
  noPhoto.forEach((c) => console.log(`  ${c.id} | ${c.nombre}`));

  fs.writeFileSync(
    `data/nophoto_${TARGET_BRAND.toLowerCase().replace(/[^a-z0-9]/g, '_')}.json`,
    JSON.stringify(noPhoto, null, 2),
    'utf8'
  );
  process.exit(0);
})();
