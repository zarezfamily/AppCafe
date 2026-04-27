#!/usr/bin/env node
/**
 * Upload official ECI/Aliada photos. Forces 1200x1200 resolution.
 * Then delete any Aliada products NOT in the official list.
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
  fs.readFileSync(path.join(__dirname, 'aliada_google_fullres.json'), 'utf8')
);

// Force all URLs to 1200x1200
for (const [k, v] of Object.entries(PHOTO_MAP)) {
  PHOTO_MAP[k] = v.replace(/\d+x\d+\.jpg/, '1200x1200.jpg');
}

const OFFICIAL_IDS = Object.keys(PHOTO_MAP);

async function downloadAndProcess(imageUrl) {
  const resp = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'image/*',
    },
    timeout: 20000,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length < 500) throw new Error(`Too small ${buf.length}b`);

  const meta = await sharp(buf).metadata();
  console.log(
    `    Source: ${meta.width}x${meta.height} ${meta.format} ${(buf.length / 1024).toFixed(0)}KB`
  );

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
  // Step 1: Upload photos for all 10 official products
  console.log(`=== Uploading ${OFFICIAL_IDS.length} official Aliada photos ===\n`);
  let ok = 0,
    fail = 0;

  for (const docId of OFFICIAL_IDS) {
    const short = docId.replace('eci_aliada_', '');
    const imageUrl = PHOTO_MAP[docId];
    console.log(`  [${short}]`);
    console.log(`    URL: ${imageUrl.substring(0, 100)}...`);

    try {
      const processed = await downloadAndProcess(imageUrl);
      console.log(`    Processed: ${(processed.length / 1024).toFixed(0)}KB PNG`);
      await uploadAndUpdate(docId, processed, imageUrl);
      console.log(`    OK\n`);
      ok++;
    } catch (e) {
      console.log(`    FAIL: ${e.message}\n`);
      fail++;
    }
  }

  console.log(`=== Upload done: ${ok} OK, ${fail} failed ===\n`);

  // Step 2: Delete any Aliada products NOT in the official list
  console.log('=== Checking for non-official Aliada products to delete ===\n');
  const snap = await db.collection('cafes').where('marca', '==', 'Aliada').get();
  let deleted = 0;

  for (const doc of snap.docs) {
    if (!OFFICIAL_IDS.includes(doc.id)) {
      console.log(`  DEL ${doc.id}`);
      await db.collection('cafes').doc(doc.id).delete();
      try {
        await bucket.file(`cafe-photos-nobg/${doc.id}.png`).delete();
      } catch {}
      deleted++;
    }
  }

  console.log(`\n=== Deleted ${deleted} non-official Aliada products ===`);
  console.log(`=== Kept ${OFFICIAL_IDS.length} official Aliada products ===`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
