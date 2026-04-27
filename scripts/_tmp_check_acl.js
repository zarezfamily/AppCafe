const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const bucket = admin.storage().bucket();

(async () => {
  // Check a known working photo (e.g. Bonka or Lavazza)
  const [files] = await bucket.getFiles({ prefix: 'cafe-photos-nobg/', maxResults: 3 });
  for (const f of files) {
    const [metadata] = await f.getMetadata();
    console.log(f.name);
    console.log('  acl:', JSON.stringify(metadata.acl || 'none'));
    console.log('  predefinedAcl:', metadata.predefinedAcl || 'none');
    console.log('  contentType:', metadata.contentType);
    console.log('  cacheControl:', metadata.cacheControl);
    // Check public access
    const url = `https://storage.googleapis.com/${bucket.name}/${f.name}`;
    const resp = await fetch(url, { method: 'HEAD' });
    console.log('  HTTP:', resp.status);
    console.log();
  }

  // Check a Bonka photo specifically
  const bonkaFile = bucket.file('cafe-photos-nobg/8410076630025.png');
  const [exists] = await bonkaFile.exists();
  if (exists) {
    const [meta] = await bonkaFile.getMetadata();
    console.log('Bonka (8410076630025.png):');
    console.log(
      '  HTTP:',
      (
        await fetch(
          `https://storage.googleapis.com/${bucket.name}/cafe-photos-nobg/8410076630025.png`,
          { method: 'HEAD' }
        )
      ).status
    );
  }
})();
