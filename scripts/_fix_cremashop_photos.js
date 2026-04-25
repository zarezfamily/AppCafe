#!/usr/bin/env node
/**
 * Fix cremashop photos: make them square with white padding
 * so they look good with resizeMode="cover" in grid cards.
 *
 * Downloads each PNG from Storage, adds white padding to make
 * it square (centered), re-uploads.
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

async function downloadFromStorage(path) {
  const [buf] = await bucket.file(path).download();
  return buf;
}

async function makeSquareWithPadding(buf) {
  const meta = await sharp(buf).metadata();
  const w = meta.width;
  const h = meta.height;

  // Already square with reasonable aspect ratio (within 5%)
  if (Math.abs(w - h) < Math.max(w, h) * 0.05) {
    // Still add a 10% margin
    const margin = Math.round(Math.max(w, h) * 0.08);
    const newSize = Math.max(w, h) + margin * 2;
    const padLeft = Math.round((newSize - w) / 2);
    const padTop = Math.round((newSize - h) / 2);
    return sharp(buf)
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .extend({
        top: padTop,
        bottom: newSize - h - padTop,
        left: padLeft,
        right: newSize - w - padLeft,
        background: { r: 255, g: 255, b: 255 },
      })
      .resize(800, 800, { fit: 'inside', withoutEnlargement: false })
      .png()
      .toBuffer();
  }

  // Not square: make it square with padding
  const size = Math.max(w, h);
  // Add extra 10% margin around the product
  const margin = Math.round(size * 0.08);
  const finalSize = size + margin * 2;

  const padLeft = Math.round((finalSize - w) / 2);
  const padTop = Math.round((finalSize - h) / 2);

  return sharp(buf)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .extend({
      top: padTop,
      bottom: finalSize - h - padTop,
      left: padLeft,
      right: finalSize - w - padLeft,
      background: { r: 255, g: 255, b: 255 },
    })
    .resize(800, 800, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();
}

(async () => {
  try {
    // Get all cremashop cafes
    const snap = await db.collection('cafes').where('source', '==', 'cremashop').get();
    console.log(`Total cremashop cafes: ${snap.size}`);

    const docs = [];
    snap.forEach((d) => docs.push({ id: d.id, data: d.data() }));

    let fixed = 0;
    let skipped = 0;
    let errors = 0;

    for (const doc of docs) {
      const storagePath = `cafe-photos-nobg/${doc.id}.png`;

      try {
        const buf = await downloadFromStorage(storagePath);
        const meta = await sharp(buf).metadata();

        // Process: make square with padding
        const processed = await makeSquareWithPadding(buf);
        const newMeta = await sharp(processed).metadata();

        // Upload
        const file = bucket.file(storagePath);
        await file.save(processed, { contentType: 'image/png' });
        await file.makePublic();

        fixed++;
        if (fixed % 20 === 0) {
          console.log(`Progress: ${fixed}/${docs.length} (errors: ${errors})`);
        }
      } catch (e) {
        if (e.code === 404 || e.message?.includes('No such object')) {
          skipped++;
        } else {
          errors++;
          console.error(`Error ${doc.id}: ${e.message}`);
        }
      }

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 30));
    }

    console.log(`\n=== DONE ===`);
    console.log(`Fixed: ${fixed}`);
    console.log(`Skipped (no file): ${skipped}`);
    console.log(`Errors: ${errors}`);
    process.exit(0);
  } catch (e) {
    console.error('Fatal:', e);
    process.exit(1);
  }
})();
