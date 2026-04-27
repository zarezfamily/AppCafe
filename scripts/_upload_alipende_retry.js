#!/usr/bin/env node
/**
 * Re-upload the 10 Alipende photos that failed due to "Too small" threshold.
 * These are Google Images thumbnails that are small but valid images.
 * Lowering the minimum size threshold to accept them.
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

const PHOTO_MAP = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'alipende_fullres.json'), 'utf8')
);

// Only the 10 that failed
const FAILED = [
  'ahorramas_alipende_molido_natural_250',
  'ahorramas_alipende_molido_descaf_250',
  'ahorramas_alipende_molido_colombia_250',
  'ahorramas_alipende_molido_natural_500',
  'ahorramas_alipende_grano_natural_500',
  'ahorramas_alipende_grano_descaf_500',
  'ahorramas_alipende_soluble_natural_200',
  'ahorramas_alipende_capsulas_descaf_nesp_10',
  'ahorramas_alipende_capsulas_intenso_nesp_10',
  'ahorramas_alipende_capsulas_intenso_dg_16',
];

async function downloadAndProcess(imageUrl) {
  const resp = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'image/*,*/*',
    },
    timeout: 20000,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  // Accept even tiny thumbnails (Google gstatic can be ~800 bytes)
  if (buf.length < 200) throw new Error(`Too small ${buf.length}b`);

  // Check if it's actually an image
  const meta = await sharp(buf).metadata();
  console.log(`    Source: ${meta.width}x${meta.height} ${meta.format} ${buf.length}b`);

  return sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();
}

async function uploadAndUpdate(docId, processed, originalUrl) {
  const storagePath = `cafe-photos-nobg/${docId}.png`;
  const file = bucket.file(storagePath);
  try {
    await file.delete();
  } catch {}
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
    'photos.original': originalUrl,
    'photos.bgRemoved': publicUrl,
  });
  return publicUrl;
}

async function main() {
  console.log(`=== Re-uploading ${FAILED.length} failed Alipende photos ===\n`);
  let ok = 0,
    fail = 0;

  for (const docId of FAILED) {
    const imageUrl = PHOTO_MAP[docId];
    if (!imageUrl) {
      console.log(`  ${docId}: no URL`);
      fail++;
      continue;
    }

    try {
      console.log(`  ${docId}`);
      console.log(`    URL: ${imageUrl.substring(0, 80)}...`);
      const processed = await downloadAndProcess(imageUrl);
      console.log(`    Processed: ${(processed.length / 1024).toFixed(0)}KB`);
      await uploadAndUpdate(docId, processed, imageUrl);
      console.log(`    OK`);
      ok++;
    } catch (e) {
      console.log(`    FAIL: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n=== DONE: ${ok} uploaded, ${fail} failed ===`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
