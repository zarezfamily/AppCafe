const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const snap = await db.collection('cafes').get();
  snap.forEach((d) => {
    const data = d.data();
    if (
      (data.marca || '').toLowerCase().includes('black donkey') ||
      (data.nombre || '').toLowerCase().includes('black donkey')
    ) {
      const photos = [data.imagenUrl, data.bestPhoto, data.officialPhoto, data.foto].filter(
        Boolean
      );
      const hasReal = photos.some((u) => u && !u.includes('placeholder') && !u.includes('generic'));
      console.log(`${hasReal ? '✅' : '❌'} ${d.id}`);
      console.log(`   nombre: ${data.nombre}`);
      console.log(`   imagenUrl: ${data.imagenUrl || '(empty)'}`);
      console.log(`   bestPhoto: ${data.bestPhoto || '(empty)'}`);
      console.log(`   photos.bgRemoved: ${data.photos?.bgRemoved}`);
      console.log('');
    }
  });
  process.exit(0);
})();
