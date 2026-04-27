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
  console.log(`  URL: ${imgUrl}`);
  const imgRes = await fetch(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!imgRes.ok) {
    console.log(`  ERROR: HTTP ${imgRes.status}`);
    return false;
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  if (buf.length < 1000) {
    console.log(`  Too small: ${buf.length}b`);
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
  console.log(`  DONE ✓`);
  return true;
}

async function getOFFImage(ean) {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${ean}.json?fields=image_front_url,selected_images`
  );
  const data = await res.json();
  if (data.status !== 1) return null;
  // Try to get high-res front image
  const p = data.product;
  const sel = p.selected_images;
  if (sel && sel.front && sel.front.display) {
    const langs = Object.keys(sel.front.display);
    if (langs.length > 0) return sel.front.display[langs[0]];
  }
  return p.image_front_url || null;
}

(async () => {
  // 1. DG Café con leche via Open Food Facts
  let url = await getOFFImage('7613033174667');
  console.log('OFF Café con leche:', url);
  if (url) await fixPhoto('mercadona_11801', url, 'DG Café con leche');

  // 2. DG Cortado via Open Food Facts
  url = await getOFFImage('7613032396350');
  console.log('OFF Cortado:', url);
  if (url) await fixPhoto('mercadona_11785', url, 'DG Cortado');

  // 3. Also check Delta Platinum in OFF
  url = await getOFFImage('5601059009010');
  console.log('OFF Delta Platinum:', url);

  console.log('\nDone!');
  process.exit(0);
})();
