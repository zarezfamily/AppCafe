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

async function fixPhoto(docId, imgUrl, label) {
  console.log(`\n=== ${label} (${docId}) ===`);
  console.log(`  Downloading: ${imgUrl.substring(0, 100)}...`);
  const imgRes = await fetch(imgUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'image/*,*/*',
      Referer: 'https://www.dolce-gusto.es/',
    },
  });
  console.log(`  HTTP ${imgRes.status} ${imgRes.headers.get('content-type')}`);
  if (!imgRes.ok) return false;
  const buf = Buffer.from(await imgRes.arrayBuffer());
  if (buf.length < 1000) {
    console.log(`  Too small (${buf.length})`);
    return false;
  }
  const meta = await sharp(buf).metadata();
  console.log(
    `  Source: ${meta.width}x${meta.height} ${meta.format} ${(buf.length / 1024).toFixed(0)}KB`
  );
  const processed = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();
  console.log(`  Processed: ${(processed.length / 1024).toFixed(0)}KB`);
  const storagePath = `cafe-photos-nobg/${docId}.png`;
  const file = bucket.file(storagePath);
  try {
    await file.delete();
  } catch (e) {}
  await file.save(processed, {
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
    public: true,
    resumable: false,
  });
  const publicUrl = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${storagePath}`;
  await db.collection('cafes').doc(docId).update({
    fotoUrl: publicUrl,
    foto: publicUrl,
    imageUrl: publicUrl,
    officialPhoto: publicUrl,
    bestPhoto: publicUrl,
    imagenUrl: publicUrl,
    'photos.selected': publicUrl,
    'photos.original': publicUrl,
    'photos.bgRemoved': true,
  });
  console.log(`  ${label} DONE ✓`);
  return true;
}

(async () => {
  // Try multiple URL patterns for DG images
  const dgUrls = {
    cafeConLeche: [
      'https://www.dolce-gusto.es/media/catalog/product/b/e/bev0000060_16x_heroimage2026.png',
      'https://www.dolce-gusto.es/media/catalog/product/cache/d22af66f75f51f60e100631e2c10a99a/b/e/bev0000060_16x_heroimage2026.png',
      'https://www.dolce-gusto.es/media/wysiwyg/dolcegusto-neo-V3/BEV0000060-16-CupandMembrane.png',
    ],
    cortado: [
      'https://www.dolce-gusto.es/media/catalog/product/b/e/bev0000064_16x_heroimage2026.png',
      'https://www.dolce-gusto.es/media/catalog/product/cache/a7ed62b12c9d28aa0842b5a9bc7623a5/b/e/bev0000064_16x_heroimage2026.png',
    ],
  };

  // Try Café con leche
  let done = false;
  for (const url of dgUrls.cafeConLeche) {
    done = await fixPhoto('mercadona_11801', url, 'DG Café con leche');
    if (done) break;
  }
  if (!done) console.log('  ALL URLs FAILED for Café con leche');

  // Try Cortado
  done = false;
  for (const url of dgUrls.cortado) {
    done = await fixPhoto('mercadona_11785', url, 'DG Cortado');
    if (done) break;
  }
  if (!done) console.log('  ALL URLs FAILED for Cortado');

  process.exit(0);
})();
