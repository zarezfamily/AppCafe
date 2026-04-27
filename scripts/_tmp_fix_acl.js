const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const bucket = admin.storage().bucket();

(async () => {
  // Working file
  const working = bucket.file('cafe-photos-nobg/0gbaTRLkg5agxlSfqKM7.png');
  const [wMeta] = await working.getMetadata();

  // Broken file
  const broken = bucket.file('cafe-photos-nobg/alcampo_cafe_en_capsulas_brasil_i5_32_uds.png');
  const [bMeta] = await broken.getMetadata();

  // Compare key metadata fields
  const keys = [
    'contentType',
    'cacheControl',
    'size',
    'storageClass',
    'contentEncoding',
    'metadata',
  ];
  console.log('WORKING:');
  for (const k of keys) console.log(`  ${k}: ${JSON.stringify(wMeta[k])}`);
  console.log('\nBROKEN:');
  for (const k of keys) console.log(`  ${k}: ${JSON.stringify(bMeta[k])}`);

  // Try to make one alcampo file public
  console.log('\nMaking broken file public...');
  await broken.makePublic();
  const url = `https://storage.googleapis.com/${bucket.name}/${broken.name}`;
  const resp = await fetch(url, { method: 'HEAD' });
  console.log('After makePublic, HTTP:', resp.status);
})();
