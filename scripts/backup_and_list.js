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
  const snap = await db.collection('cafes').get();
  const all = [];
  snap.forEach((d) => all.push({ id: d.id, ...d.data() }));

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `data/backup_cafes_${ts}.json`;
  fs.writeFileSync(path, JSON.stringify(all, null, 2));
  console.log(`Backup saved: ${path} (${all.length} docs)`);

  // Stats
  let withPhoto = 0,
    noPhoto = 0;
  const noPhotoList = [];
  all.forEach((c) => {
    const url = c.imagenUrl || '';
    if (url && url.startsWith('http') && !url.includes('placeholder') && !url.includes('noimage')) {
      withPhoto++;
    } else {
      noPhoto++;
      noPhotoList.push(c.id);
    }
  });
  console.log(`Total: ${all.length} | With photo: ${withPhoto} | Without: ${noPhoto}`);

  // Save the no-photo IDs for deletion
  fs.writeFileSync('data/cafes_sin_foto_ids.json', JSON.stringify(noPhotoList, null, 2));
  console.log(`No-photo IDs saved: data/cafes_sin_foto_ids.json`);

  process.exit(0);
})();
