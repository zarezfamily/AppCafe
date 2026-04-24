const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const snap = await db.collection('cafes').get();
  const noStatus = [];
  const noReview = [];
  snap.forEach((d) => {
    const data = d.data();
    if (!data.status && !data.estado) noStatus.push({ id: d.id, nombre: data.nombre });
    if (!data.reviewStatus) noReview.push(d.id);
  });
  console.log('Without status/estado:', noStatus.length);
  noStatus.forEach((c) => console.log(`  ${c.id} - ${c.nombre}`));

  // Fix them
  const batch = db.batch();
  for (const c of noStatus) {
    batch.update(db.collection('cafes').doc(c.id), { status: 'approved', estado: 'approved' });
  }
  for (const id of noReview) {
    batch.update(db.collection('cafes').doc(id), { reviewStatus: 'approved' });
  }
  await batch.commit();
  console.log(`\nFixed: ${noStatus.length} status + ${noReview.length} reviewStatus`);
  process.exit(0);
})();
