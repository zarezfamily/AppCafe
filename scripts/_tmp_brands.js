const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').get();
  const brands = {};
  snap.docs.forEach((d) => {
    const m = d.data().marca || 'SIN MARCA';
    if (!brands[m]) brands[m] = 0;
    brands[m]++;
  });
  const sorted = Object.entries(brands).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([b, c]) => console.log(c.toString().padStart(4) + '  ' + b));
  console.log('\nTotal marcas:', sorted.length);
})();
