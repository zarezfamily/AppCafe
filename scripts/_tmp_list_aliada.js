const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

const TO_DELETE = ['eci_aliada_grano_natural_500', 'eci_aliada_soluble_200'];

(async () => {
  for (const id of TO_DELETE) {
    const ref = db.collection('cafes').doc(id);
    const doc = await ref.get();
    if (!doc.exists) {
      console.log(`  SKIP ${id} (not found)`);
      continue;
    }
    console.log(`  DELETE ${id} — ${doc.data().nombre}`);
    await ref.delete();
    try {
      await bucket.file(`cafe-photos-nobg/${id}.png`).delete();
      console.log(`    photo deleted`);
    } catch {
      console.log(`    no photo`);
    }
  }
  const remaining = await db.collection('cafes').where('marca', '==', 'Aliada').get();
  console.log(`\nAliada remaining: ${remaining.size}`);
  remaining.docs.forEach((d) => console.log(`  ${d.id} | ${d.data().nombre}`));
})();
