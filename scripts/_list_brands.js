const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const s = await db.collection('cafes').get();
  const m = new Map();
  s.forEach((d) => {
    const b = (d.data().marca || '').trim();
    if (b) m.set(b.toLowerCase(), (m.get(b.toLowerCase()) || 0) + 1);
  });
  console.log('Total cafes:', s.size);
  console.log('Total unique brands:', m.size);
  [...m.entries()].sort().forEach(([k, v]) => console.log(String(v).padStart(4), k));
  process.exit(0);
})();
