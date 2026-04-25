const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const doc = await db.collection('cafes').doc('jurado_dolcegusto_extra_intenso').get();
  const d = doc.data();
  const keys = Object.keys(d).filter((k) => /brand|marca/i.test(k));
  console.log('Brand-related keys:', keys);
  keys.forEach((k) => console.log(' ', k, '=', d[k]));
  process.exit(0);
})();
