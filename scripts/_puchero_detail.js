const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').get();
  const puchero = snap.docs.filter((d) => {
    const str = JSON.stringify(d.data()).toLowerCase();
    return str.includes('puchero');
  });
  console.log('Puchero docs:', puchero.length);
  puchero.forEach((d) => {
    const data = d.data();
    console.log(
      JSON.stringify(
        {
          id: d.id,
          nombre: data.nombre || data.name,
          roaster: data.roaster,
          marca: data.marca,
          fuente: data.fuente,
          allPhotos: {
            selected: data.photos?.selected,
            bestPhoto: data.bestPhoto,
            officialPhoto: data.officialPhoto,
            foto: data.foto,
            imageUrl: data.imageUrl,
            image: data.image,
          },
        },
        null,
        2
      )
    );
  });
  process.exit(0);
})();
