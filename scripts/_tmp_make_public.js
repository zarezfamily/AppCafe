const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const bucket = admin.storage().bucket();

(async () => {
  const [files] = await bucket.getFiles({ prefix: 'cafe-photos-nobg/alcampo_' });
  console.log(`Found ${files.length} alcampo photos to make public`);
  let ok = 0;
  for (const f of files) {
    try {
      await f.makePublic();
      ok++;
    } catch (e) {
      console.log('  ERROR:', f.name, e.message);
    }
  }
  console.log(`Done: ${ok}/${files.length} made public`);

  // Also check bio ones
  const [bioFiles] = await bucket.getFiles({ prefix: 'cafe-photos-nobg/alcampo_bio_' });
  console.log(`Found ${bioFiles.length} bio photos (already included above)`);
})();
