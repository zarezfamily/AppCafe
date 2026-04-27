const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const ids = ['daddy_long_legs_house_blend_250g', 'daddy_long_legs_kenya_250g'];
  for (const id of ids) {
    const doc = await db.collection('cafes').doc(id).get();
    const d = doc.data();
    console.log(`=== ${id} ===`);
    console.log('imagenUrl:', d.imagenUrl || '(empty)');
    console.log('imageUrl:', d.imageUrl || '(empty)');
    console.log('bestPhoto:', d.bestPhoto || '(empty)');
    console.log('officialPhoto:', d.officialPhoto || '(empty)');
    console.log('foto:', d.foto || '(empty)');
    console.log('photos.selected:', d.photos?.selected || '(empty)');
    console.log('photos.bgRemoved:', d.photos?.bgRemoved);
    console.log('');
  }
  process.exit(0);
})();
