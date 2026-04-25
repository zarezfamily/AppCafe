// Fix remaining bad photos with verified working URLs + clear unfixable ones
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

// Verified working URLs
const TO_FIX = [
  {
    id: 'k32C1FfcqVaauDvzAqQU',
    nombre: 'Nespresso Ristretto',
    url: 'https://images.openfoodfacts.net/images/products/763/042/872/0643/front_es.3.full.jpg',
  },
];

// These have bad/wrong photos in Storage - clear them so the app shows a coffee icon instead of garbage
const TO_CLEAR = [
  { id: 'daddy_long_legs_kenya_250g', nombre: 'Daddy Long Legs Kenya AA' },
  { id: 'daddy_long_legs_house_blend_250g', nombre: 'Daddy Long Legs House Blend' },
  { id: 'lacolombe_lyon', nombre: 'Lyon (La Colombe)' },
  { id: 'lacolombe_bowery-blend', nombre: 'Bowery Blend (La Colombe)' },
];

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 15000,
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return downloadImage(res.headers.location).then(resolve).catch(reject);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return reject(new Error(`HTTP ${res.statusCode}`));
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }
      )
      .on('error', reject);
  });
}

async function uploadAndUpdate(docId, buf, sourceUrl) {
  const processed = await sharp(buf)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  const storagePath = `cafe-photos-nobg/${docId}.png`;
  await bucket.file(storagePath).save(processed, {
    metadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000' },
    public: true,
  });

  const photoUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  await db.collection('cafes').doc(docId).update({
    'photos.selected': photoUrl,
    'photos.bgRemoved': false,
    'photos.original': sourceUrl,
    bestPhoto: photoUrl,
    officialPhoto: photoUrl,
    imagenUrl: photoUrl,
    foto: photoUrl,
    updatedAt: new Date().toISOString(),
  });
  return photoUrl;
}

async function clearBadPhoto(docId) {
  // Remove all photo fields so the app shows its default coffee fallback
  await db.collection('cafes').doc(docId).update({
    'photos.selected': admin.firestore.FieldValue.delete(),
    'photos.bgRemoved': admin.firestore.FieldValue.delete(),
    'photos.original': admin.firestore.FieldValue.delete(),
    bestPhoto: admin.firestore.FieldValue.delete(),
    officialPhoto: admin.firestore.FieldValue.delete(),
    imageUrl: admin.firestore.FieldValue.delete(),
    imagenUrl: admin.firestore.FieldValue.delete(),
    foto: admin.firestore.FieldValue.delete(),
    updatedAt: new Date().toISOString(),
  });
}

(async () => {
  // Fix ones with verified URLs
  for (const fix of TO_FIX) {
    console.log(`\n→ Fix: ${fix.nombre} [${fix.id}]`);
    try {
      const buf = await downloadImage(fix.url);
      console.log(`  Downloaded: ${buf.length} bytes`);
      const url = await uploadAndUpdate(fix.id, buf, fix.url);
      console.log(`  ✓ Updated: ${url}`);
    } catch (err) {
      console.log(`  ✗ ${err.message}`);
    }
  }

  // Clear bad photos
  for (const item of TO_CLEAR) {
    console.log(`\n→ Clear: ${item.nombre} [${item.id}]`);
    try {
      await clearBadPhoto(item.id);
      console.log(`  ✓ Photo fields cleared`);
    } catch (err) {
      console.log(`  ✗ ${err.message}`);
    }
  }

  // Also check Starbucks Colombia - the existing photo is small (29KB). Let's try a direct Amazon fetch
  console.log('\n→ Fix: Starbucks Colombia [starbucks-starbucks-colombia]');
  try {
    // Try the signed URL from photos.original which was from our own storage
    const origUrl = 'https://m.media-amazon.com/images/I/41PxKn4KPZL._AC_.jpg';
    const buf = await downloadImage(origUrl);
    if (buf.length > 10000) {
      console.log(`  Downloaded: ${buf.length} bytes`);
      const url = await uploadAndUpdate('starbucks-starbucks-colombia', buf, origUrl);
      console.log(`  ✓ Updated: ${url}`);
    } else {
      console.log(`  Image too small, clearing`);
      await clearBadPhoto('starbucks-starbucks-colombia');
      console.log(`  ✓ Photo fields cleared`);
    }
  } catch (_err) {
    console.log(`  Clearing bad photo instead`);
    await clearBadPhoto('starbucks-starbucks-colombia');
    console.log(`  ✓ Photo fields cleared`);
  }

  console.log('\nDone.');
  process.exit(0);
})();
