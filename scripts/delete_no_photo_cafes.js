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
  const ids = JSON.parse(fs.readFileSync('data/cafes_sin_foto_ids.json', 'utf8'));
  console.log(`Deleting ${ids.length} cafes without photos...`);

  // Firestore batch delete (max 500 per batch)
  let deleted = 0;
  for (let i = 0; i < ids.length; i += 500) {
    const batch = db.batch();
    const chunk = ids.slice(i, i + 500);
    chunk.forEach((id) => batch.delete(db.collection('cafes').doc(id)));
    await batch.commit();
    deleted += chunk.length;
    console.log(`  Deleted ${deleted}/${ids.length}`);
  }

  // Verify
  const remaining = await db.collection('cafes').get();
  console.log(`\nDone. Remaining cafes: ${remaining.size}`);
  let withPhoto = 0;
  remaining.forEach((d) => {
    const url = d.data().imagenUrl || '';
    if (url && url.startsWith('http') && !url.includes('placeholder') && !url.includes('noimage'))
      withPhoto++;
  });
  console.log(`With photo: ${withPhoto}`);

  process.exit(0);
})();
