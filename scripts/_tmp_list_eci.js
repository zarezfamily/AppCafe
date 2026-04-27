const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

(async () => {
  for (const marca of ['El Corte Inglés', 'El Corte Inglés Selection', 'Club del Gourmet']) {
    const snap = await db.collection('cafes').where('marca', '==', marca).get();
    console.log(`${marca}: ${snap.size} docs`);
    snap.docs.forEach((d) => console.log(`  ${d.id} → ${d.data().nombre}`));
  }
})();
