const fetch = require('node-fetch');
const sharp = require('sharp');
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const bucket = admin.storage().bucket();
const db = admin.firestore();

(async () => {
  const docId = 'barco_natural_grano_500g';
  const storagePath = 'cafe-photos-nobg/' + docId + '.png';
  const publicUrl = 'https://storage.googleapis.com/miappdecafe.firebasestorage.app/' + storagePath;

  // 1. Delete old file first
  console.log('1. Deleting old file...');
  try {
    await bucket.file(storagePath).delete();
    console.log('   Deleted OK');
  } catch (e) {
    console.log('   Delete error (may not exist):', e.message);
  }

  // 2. Download Amazon image
  console.log('2. Downloading Amazon image...');
  const imgUrl = 'https://m.media-amazon.com/images/I/71HiwpI8QCL._AC_SL1500_.jpg';
  const imgRes = await fetch(imgUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  if (!imgRes.ok) throw new Error('Download failed: ' + imgRes.status);
  const imgBuf = Buffer.from(await imgRes.arrayBuffer());
  console.log('   Downloaded:', imgBuf.length, 'bytes');

  // 3. Process with sharp
  console.log('3. Processing...');
  const processed = await sharp(imgBuf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();
  console.log('   Processed:', processed.length, 'bytes');

  // 4. Upload new file
  console.log('4. Uploading new file...');
  const file = bucket.file(storagePath);
  await file.save(processed, {
    contentType: 'image/png',
    metadata: {
      cacheControl: 'public, max-age=60', // shorter cache
    },
    public: true,
    resumable: false, // force direct upload
  });
  console.log('   Uploaded OK');

  // 5. Verify via API metadata
  console.log('5. Verifying via API...');
  const [meta] = await file.getMetadata();
  console.log('   API metadata - size:', meta.size, 'updated:', meta.updated);

  // 6. Verify via HTTP
  console.log('6. Verifying via HTTP (may be cached)...');
  const checkRes = await fetch(publicUrl + '?t=' + Date.now(), {
    headers: { 'Cache-Control': 'no-cache' },
  });
  console.log('   HTTP content-length:', checkRes.headers.get('content-length'));
  console.log('   HTTP last-modified:', checkRes.headers.get('last-modified'));
  const body = Buffer.from(await checkRes.arrayBuffer());
  console.log('   Actual body size:', body.length);
  const verifyMeta = await sharp(body).metadata();
  console.log('   Image dimensions:', verifyMeta.width + 'x' + verifyMeta.height);

  // 7. Update Firestore with cache-busted URL
  console.log('7. Updating Firestore...');
  const cacheBustUrl = publicUrl;
  await db.collection('cafes').doc(docId).update({
    fotoUrl: cacheBustUrl,
    foto: cacheBustUrl,
    imageUrl: cacheBustUrl,
    officialPhoto: cacheBustUrl,
    bestPhoto: cacheBustUrl,
    imagenUrl: cacheBustUrl,
    'photos.selected': cacheBustUrl,
    'photos.original': cacheBustUrl,
    'photos.bgRemoved': true,
  });
  console.log('   Firestore updated');

  console.log('\nDONE - Barco Natural fixed!');
  process.exit(0);
})();
