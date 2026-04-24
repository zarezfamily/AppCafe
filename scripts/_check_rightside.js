const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').where('marca', '==', 'Right Side Coffee').get();
  console.log('Total Right Side docs:', snap.size);
  snap.docs.forEach((d) => {
    const data = d.data();
    console.log(d.id);
    console.log('  officialPhoto:', (data.officialPhoto || '').slice(0, 100));
    console.log('  bestPhoto:    ', (data.bestPhoto || '').slice(0, 100));
    console.log('  foto:         ', (data.foto || '').slice(0, 100));
    console.log('  imageUrl:     ', (data.imageUrl || '').slice(0, 100));
  });
  process.exit(0);
})();
