const admin = require('firebase-admin');
const fs = require('fs');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

(async () => {
  const backup = JSON.parse(
    fs.readFileSync('data/backup_cafes_2026-04-24T17-16-42-914Z.json', 'utf8')
  );
  console.log(`Restoring ${backup.length} cafes from backup...`);

  let restored = 0;
  for (let i = 0; i < backup.length; i += 500) {
    const batch = db.batch();
    const chunk = backup.slice(i, i + 500);
    chunk.forEach((cafe) => {
      const { id, ...data } = cafe;
      batch.set(db.collection('cafes').doc(id), data);
    });
    await batch.commit();
    restored += chunk.length;
    console.log(`  Restored ${restored}/${backup.length}`);
  }

  const verify = await db.collection('cafes').get();
  console.log(`\nDone. Total cafes now: ${verify.size}`);
  process.exit(0);
})();
