const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const bucket = admin.storage().bucket();
const db = admin.firestore();

const ids = [
  'laestrella_https-www-cafeslaestrella-com-productos-molido-descafeinado-mezcla-html',
  'laestrella_https-www-cafeslaestrella-com-productos-molido-mezcla-intensa-html',
];

(async () => {
  for (const id of ids) {
    const [meta] = await bucket.file('cafe-photos-nobg/' + id + '.png').getMetadata();
    console.log(id.substring(0, 50), '|', (meta.size / 1024).toFixed(0) + 'KB');
    const doc = await db.collection('cafes').doc(id).get();
    const d = doc.data();
    console.log('  nombre:', d.nombre);
    console.log(
      '  foto:',
      (
        d.photos?.selected ||
        d.bestPhoto ||
        d.officialPhoto ||
        d.imageUrl ||
        d.imagenUrl ||
        d.foto ||
        ''
      ).substring(0, 150)
    );
    console.log('  sourceUrl:', d.sourceUrl || d.url || '');
  }
  process.exit(0);
})();
