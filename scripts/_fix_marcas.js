const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const fixes = [
  { id: 'jurado_dolcegusto_extra_intenso', marca: 'Dolce Gusto', num: 192 },
  {
    id: 'laestrella_https-www-cafeslaestrella-com-productos-grano-natural-html',
    marca: 'INCAPTO',
    num: 378,
  },
  {
    id: 'laestrella_https-www-cafeslaestrella-com-productos-cafe-premium-grano-tueste-natural-html',
    marca: 'INCAPTO',
    num: 379,
  },
  {
    id: 'laestrella_https-www-cafeslaestrella-com-productos-grano-torrefacto-html',
    marca: 'INCAPTO',
    num: 380,
  },
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
