const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const bucket = admin.storage().bucket();

(async () => {
  const [files] = await bucket.getFiles({ prefix: 'cafe-photos-nobg/alcampo_', maxResults: 5 });
  for (const f of files) {
    console.log(f.name, f.metadata.size + 'b');
    // Check if public
    const url = `https://storage.googleapis.com/${bucket.name}/${f.name}`;
    try {
      const resp = await fetch(url, { method: 'HEAD' });
      console.log('  HTTP', resp.status, resp.headers.get('content-type'));
    } catch (e) {
      console.log('  fetch error:', e.message);
    }
  }
  console.log('\nTotal files with prefix:', files.length);
})();
