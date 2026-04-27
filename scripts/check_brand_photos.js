require('dotenv').config();
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const brands = [
  'Puchero',
  'Nomad',
  'Syra',
  'Right Side',
  'Hidden Coffee',
  'Ineffable',
  'The Fix',
  'INCAPTO',
  'Magnífico',
  'Hola Coffee',
];

(async () => {
  const snap = await db.collection('cafes').get();
  for (const brand of brands) {
    const matching = snap.docs.filter((d) => {
      const m = (d.data().marca || d.data().roaster || '').toLowerCase();
      return m.includes(brand.toLowerCase());
    });
    if (matching.length === 0) continue;
    console.log(`\n=== ${brand} (${matching.length}) ===`);
    for (const doc of matching) {
      const d = doc.data();
      const f = d.foto || '';
      console.log(`  ${d.nombre || doc.id}`);
      console.log(`    foto: ${(f || '(vacío)').substring(0, 120)}`);
      console.log(`    bestPhoto: ${(d.bestPhoto || '(vacío)').substring(0, 120)}`);
    }
  }
  process.exit(0);
})();
