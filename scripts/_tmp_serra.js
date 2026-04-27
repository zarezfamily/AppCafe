const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (admin.apps.length === 0)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
(async () => {
  for (const marca of ['Cafès Serra', 'Cafes Serra', 'Cafés Serra']) {
    const snap = await db.collection('cafes').where('marca', '==', marca).get();
    if (snap.size > 0) {
      console.log(`"${marca}": ${snap.size} docs`);
      snap.docs.forEach((d) => console.log(`  ${d.id} | ${d.data().nombre} | ${d.data().formato}`));
    }
  }
  console.log('Done');
})();
