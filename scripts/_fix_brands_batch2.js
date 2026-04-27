const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const fixes = [
  // #421, #422 → INCAPTO
  {
    id: 'orus_https-cafesorus-es-tienda-producto-capsulas-puro-arabica',
    marca: 'INCAPTO',
    num: 421,
  },
  {
    id: 'orus_https-cafesorus-es-tienda-producto-capsulas-tueste-natural',
    marca: 'INCAPTO',
    num: 422,
  },
  // #427 → L'OR ESPRESSO (matches existing L'OR ESPRESSO entries)
  { id: 'serra_12594500305056', marca: "L'OR ESPRESSO", num: 427 },
];

(async () => {
  for (const f of fixes) {
    const doc = await db.collection('cafes').doc(f.id).get();
    const old = doc.data().marca;
    await db.collection('cafes').doc(f.id).update({ marca: f.marca });
    console.log(`#${f.num}: "${old}" → "${f.marca}" ✓`);
  }
  console.log('Done');
  process.exit(0);
})();
