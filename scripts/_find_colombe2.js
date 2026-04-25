const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').get();
  snap.forEach((d) => {
    const data = d.data();
    const n = (data.nombre || '').toLowerCase();
    const m = (data.marca || '').toLowerCase();
    if (n.includes('colombe') || m.includes('colombe')) {
      const photo = data.photos?.selected || data.bestPhoto || '';
      console.log(`${d.id} | ${data.nombre} (${data.marca}) | ${photo}`);
    }
  });
  process.exit(0);
})();
