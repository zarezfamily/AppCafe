const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

const docIds = [
  'jurado_dolcegusto_extra_intenso',
  'laestrella_https-www-cafeslaestrella-com-productos-grano-natural-html',
  'laestrella_https-www-cafeslaestrella-com-productos-cafe-premium-grano-tueste-natural-html',
  'laestrella_https-www-cafeslaestrella-com-productos-grano-torrefacto-html',
  'laestrella_https-www-cafeslaestrella-com-productos-molido-natural-html',
];

(async () => {
  for (const id of docIds) {
    const doc = await db.collection('cafes').doc(id).get();
    if (!doc.exists) {
      console.log(`NOT FOUND: ${id}`);
      continue;
    }
    const d = doc.data();
    console.log(`\n--- ${id} ---`);
    console.log('  brand:', d.brand || d.marca);
    console.log('  name:', d.name || d.nombre);
    console.log(
      '  foto:',
      (d.photos?.selected || d.fotoUrl || d.foto || d.imageUrl || 'none').substring(0, 100)
    );
  }
  process.exit(0);
})();
