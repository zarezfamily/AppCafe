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
  console.log('Puchero matches:', puchero.length);
  puchero.forEach((d) => {
    const data = d.data();
    const photo =
      data.photos?.selected ||
      data.bestPhoto ||
      data.officialPhoto ||
      data.foto ||
      data.imageUrl ||
      '';
    console.log(d.id, '| marca:', data.marca);
    console.log('  photo:', photo.slice(0, 150));
  });
  process.exit(0);
})();
