const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const snap = await db.collection('cafes').get();
  const noUpdated = [];
  snap.forEach((d) => {
    const data = d.data();
    if (!data.updatedAt)
      noUpdated.push({ id: d.id, nombre: data.nombre, createdAt: data.createdAt || '(none)' });
  });
  console.log(`Without updatedAt: ${noUpdated.length}`);
  noUpdated.forEach((c) => console.log(`  ${c.id} - ${c.nombre} (created: ${c.createdAt})`));
  process.exit(0);
})();
