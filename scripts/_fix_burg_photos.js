#!/usr/bin/env node
/**
 * Fix Burg photos: re-download using gallery_square (900x900) instead of og_image (cropped)
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrl(res.headers.location).then(resolve, reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function getGallerySquareUrl(slug, cid) {
  const url = `https://www.cremashop.eu/es/products/burg/${slug}/${cid}`;
  const { body } = await fetchUrl(url);
  const html = body.toString();
  // gallery_square is the best square crop
  const m = html.match(
    /media\/cache\/gallery_square\/content\/products\/burg\/[^"'\s]+\.(jpg|jpeg|png|webp)/i
  );
  if (m) return 'https://www.cremashop.eu/' + m[0];
  return null;
}

const products = [
  { slug: 'flavoured-coffee-hazelnut', cid: 3544 },
  { slug: 'flavoured-coffee-vanilla', cid: 3542 },
  { slug: 'flavoured-coffee-toffee', cid: 4478 },
  { slug: 'flavoured-coffee-irish-cream', cid: 4475 },
  { slug: 'flavoured-coffee-amaretto', cid: 4469 },
  { slug: 'flavoured-coffee-chocolate', cid: 3541 },
  { slug: 'flavoured-coffee-orange', cid: 5490 },
  { slug: 'flavoured-coffee-coconut', cid: 9026 },
  { slug: 'flavoured-coffee-strawberry-cream', cid: 9011 },
  { slug: 'flavoured-coffee-chocolate-mint', cid: 4476 },
  { slug: 'flavoured-coffee-tiramisu', cid: 4477 },
  { slug: 'flavoured-coffee-jamaica-rum', cid: 9021 },
  { slug: 'flavoured-coffee-cinnamon', cid: 4480 },
  { slug: 'flavoured-coffee-angel-kisses', cid: 9006 },
  { slug: 'flavoured-coffee-chocolate-chili', cid: 3543 },
  { slug: 'flavoured-coffee-french-nougat', cid: 9016 },
  { slug: 'flavoured-coffee-roasted-almond', cid: 5494 },
  { slug: 'flavoured-coffee-chocolate-cream', cid: 9036 },
  { slug: 'flavoured-coffee-macadamia-nut', cid: 9031 },
  { slug: 'flavoured-coffee-dark-chocolate', cid: 4479 },
  { slug: 'flavoured-coffee-egg-liqueur', cid: 4474 },
  { slug: 'colombia-excelso-decaf', cid: 10260 },
  { slug: 'uganda-robusta-ngoma', cid: 10245 },
  { slug: 'papua-new-guinea-sigiri', cid: 10250 },
];

async function main() {
  console.log(`=== Fix Burg photos (${products.length} products) ===\n`);
  let fixed = 0,
    failed = 0;

  for (const p of products) {
    const docId = `burg_${p.slug}`;
    try {
      const imgUrl = await getGallerySquareUrl(p.slug, p.cid);
      if (!imgUrl) {
        console.log(`  SKIP ${p.slug}: no gallery_square`);
        failed++;
        continue;
      }

      const { body, status } = await fetchUrl(imgUrl);
      if (status !== 200) {
        console.log(`  SKIP ${p.slug}: HTTP ${status}`);
        failed++;
        continue;
      }

      const processed = await sharp(body)
        .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .png({ quality: 90 })
        .toBuffer();

      const sp = `${PREFIX}/${docId}.png`;
      const f = bucket.file(sp);
      try {
        await f.delete();
      } catch {}
      await f.save(processed, {
        resumable: false,
        contentType: 'image/png',
        metadata: { cacheControl: 'public, max-age=60' },
      });
      await f.makePublic();
      const photoUrl = `https://storage.googleapis.com/${bucket.name}/${sp}`;

      // Update Firestore doc
      await db
        .collection('cafes')
        .doc(docId)
        .update({
          fotoUrl: photoUrl,
          foto: photoUrl,
          imageUrl: photoUrl,
          officialPhoto: photoUrl,
          bestPhoto: photoUrl,
          imagenUrl: photoUrl,
          photos: { selected: photoUrl, original: photoUrl, bgRemoved: photoUrl },
          updatedAt: new Date().toISOString(),
        });
      fixed++;
      process.stdout.write(`\r  Fixed ${fixed}/${products.length}`);
    } catch (e) {
      console.log(`\n  ERROR ${p.slug}: ${e.message}`);
      failed++;
    }
  }
  console.log(`\n\n=== Done: ${fixed} fixed, ${failed} failed ===`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
