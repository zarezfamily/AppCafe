const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const snap = await db.collection('cafes').get();
  let found = 0;
  snap.forEach((d) => {
    const data = d.data();
    const n = (data.nombre || '').toLowerCase();
    const m = (data.marca || '').toLowerCase();
    if (
      n.includes('satan') ||
      m.includes('satan') ||
      n.includes('daddy') ||
      m.includes('daddy') ||
      n.includes('lengs') ||
      m.includes('lengs')
    ) {
      found++;
      console.log('=== ' + d.id + ' ===');
      console.log('nombre:', data.nombre);
      console.log('marca:', data.marca);
      console.log('imagenUrl:', data.imagenUrl || '(empty)');
      console.log('bestPhoto:', data.bestPhoto || '(empty)');
      console.log('officialPhoto:', data.officialPhoto || '(empty)');
      console.log('foto:', data.foto || '(empty)');
      console.log('photos:', JSON.stringify(data.photos || {}));
      console.log('');
    }
  });
  console.log('Found:', found);
  process.exit(0);
})();
