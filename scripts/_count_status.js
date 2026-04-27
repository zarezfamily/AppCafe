const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const snap = await db.collection('cafes').get();
  console.log('Total cafes:', snap.size);

  // Count by status
  const statuses = {};
  snap.forEach((d) => {
    const s = d.data().status || d.data().estado || 'sin_status';
    statuses[s] = (statuses[s] || 0) + 1;
  });
  console.log('\nBy status:');
  Object.entries(statuses)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  // Check reviewStatus too
  const review = {};
  snap.forEach((d) => {
    const r = d.data().reviewStatus || 'sin_reviewStatus';
    review[r] = (review[r] || 0) + 1;
  });
  console.log('\nBy reviewStatus:');
  Object.entries(review)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  process.exit(0);
})();
