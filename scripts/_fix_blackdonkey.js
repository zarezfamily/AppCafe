const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const ids = ['black_donkey_colombia_grano_250g', 'black_donkey_world_coffees_6x100g'];
  for (const id of ids) {
    const doc = await db.collection('cafes').doc(id).get();
    const bp = doc.data().bestPhoto;
    await db.collection('cafes').doc(id).update({
      imagenUrl: bp,
      officialPhoto: bp,
      foto: bp,
      'photos.selected': bp,
      'photos.bgRemoved': true,
    });
    console.log('Fixed:', doc.data().nombre, '→', bp);
  }
  process.exit(0);
})();
