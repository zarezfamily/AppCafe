// Check Lavazza photos and try to re-download from lavazza.es with higher resolution
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const sharp = require('sharp');
const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

async function processPhoto(docId, imageUrl) {
  try {
    const resp = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      timeout: 15000,
    });
    if (!resp.ok) return false;
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 3000) return false;

    const processed = await sharp(buf)
      .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();

    const path = `cafe-photos-nobg/${docId}.png`;
    const file = bucket.file(path);
    try {
      await file.delete();
    } catch {}
    await file.save(processed, {
      contentType: 'image/png',
      metadata: { cacheControl: 'public, max-age=60' },
      public: true,
      resumable: false,
    });
    const publicUrl = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${path}`;
    await db.collection('cafes').doc(docId).update({
      fotoUrl: publicUrl,
      foto: publicUrl,
      imageUrl: publicUrl,
      officialPhoto: publicUrl,
      bestPhoto: publicUrl,
      imagenUrl: publicUrl,
      'photos.selected': publicUrl,
      'photos.original': imageUrl,
      'photos.bgRemoved': publicUrl,
    });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const snap = await db.collection('cafes').where('marca', '==', 'Lavazza').get();
  const cafes = [];
  snap.forEach((d) => cafes.push({ id: d.id, ...d.data() }));

  console.log(`Found ${cafes.length} Lavazza entries`);

  let ok = 0,
    fail = 0,
    skip = 0;

  for (const c of cafes) {
    // Get the original source URL (not our processed one)
    const originalUrl = c.photos?.original || '';
    const currentUrl = c.fotoUrl || c.imageUrl || c.foto || '';

    // Check if it's a lavazza.es teaser card URL (small/blurry)
    if (currentUrl.includes('lavazza.es/content/dam')) {
      // These are teaser card images - typically small. Try to get higher-res version
      // The pattern is: .../teaser-card-overview/main-asset/coffee/XXX_review.png
      // Higher res might be at: .../pdp-pag-dettaglio-prodotto/main-asset/coffee/XXX_review.png
      const teaserMatch = currentUrl.match(/\/teaser-card-overview\//);
      if (teaserMatch) {
        const hiResUrl = currentUrl.replace(
          '/teaser-card-overview/',
          '/pdp-pag-dettaglio-prodotto/'
        );
        console.log(`  ${c.id}: trying hi-res...`);
        const success = await processPhoto(c.id, hiResUrl);
        if (success) {
          ok++;
          console.log(`  ✅ hi-res`);
          continue;
        }

        // Try with larger width parameter
        // Original might be accessible without the path component
        console.log(`  ${c.id}: hi-res failed, re-processing original...`);
        const reprocess = await processPhoto(c.id, currentUrl);
        if (reprocess) {
          ok++;
          console.log(`  ✅ reprocessed`);
          continue;
        }
      }
      fail++;
      console.log(`  ❌ ${c.id}: couldn't improve`);
    } else if (currentUrl.includes('kaffekapslen.media')) {
      // These are from kaffekapslen - likely OK quality
      // Try to get a higher res version
      const hiRes = currentUrl.replace(/\/cache\/[^/]+\//, '/');
      console.log(`  ${c.id}: trying kaffekapslen hi-res...`);
      const success = await processPhoto(c.id, hiRes);
      if (success) {
        ok++;
        console.log(`  ✅ kaffekapslen hi-res`);
        continue;
      }

      // Reprocess current
      const reprocess = await processPhoto(c.id, currentUrl);
      if (reprocess) {
        ok++;
        console.log(`  ✅ reprocessed`);
        continue;
      }
      fail++;
      console.log(`  ❌ ${c.id}`);
    } else if (currentUrl.includes('miappdecafe.firebasestorage.app')) {
      // Already in our storage - check if original is available
      if (originalUrl && !originalUrl.includes('miappdecafe')) {
        console.log(`  ${c.id}: re-downloading from original...`);
        const success = await processPhoto(c.id, originalUrl);
        if (success) {
          ok++;
          console.log(`  ✅ re-downloaded`);
          continue;
        }
      }
      skip++;
    } else {
      skip++;
    }
  }

  console.log(`\n=== LAVAZZA: ${ok} improved, ${fail} failed, ${skip} skipped ===`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
