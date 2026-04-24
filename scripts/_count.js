const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
(async () => {
  const snap = await admin.firestore().collection('cafes').get();
  console.log('Total cafes:', snap.size);
  // check satan
  let satan = 0;
  snap.forEach((d) => {
    if (d.id.includes('satan')) satan++;
  });
  console.log('Satan cafes remaining:', satan);
  process.exit(0);
})();
