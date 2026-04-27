#!/usr/bin/env node
/**
 * Upload scraped photos for 53 coffees (Alipende, Aliada, AUCHAN, BM).
 * Reads URLs from scripts/scraped_photo_urls.json.
 * Downloads, processes with sharp (800x800 white bg PNG),
 * uploads to Firebase Storage, updates all Firestore photo fields.
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

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
  fs.readFileSync(path.join(__dirname, 'scraped_photo_urls.json'), 'utf8')
);

async function downloadAndProcess(imageUrl) {
  const resp = await fetch(imageUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      Accept: 'image/*,*/*',
    },
    timeout: 20000,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length < 1000) throw new Error(`Too small ${buf.length}b`);
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
  const entries = Object.entries(PHOTO_MAP);
  console.log(`=== Uploading ${entries.length} scraped photos ===\n`);

  // Deduplicate URLs to avoid downloading same image multiple times
  const urlToBuffer = new Map();
  let ok = 0,
    fail = 0;

  for (const [docId, imageUrl] of entries) {
    try {
      let processed;
      if (urlToBuffer.has(imageUrl)) {
        processed = urlToBuffer.get(imageUrl);
      } else {
        processed = await downloadAndProcess(imageUrl);
        urlToBuffer.set(imageUrl, processed);
        console.log(
          `  Downloaded: ${imageUrl.substring(0, 80)}... (${(processed.length / 1024).toFixed(0)}KB)`
        );
      }
      await uploadAndUpdate(docId, processed, imageUrl);
      ok++;
      process.stdout.write(`  [${ok + fail}/${entries.length}] ${docId} OK\n`);
    } catch (e) {
      fail++;
      console.log(`  [${ok + fail}/${entries.length}] ${docId} FAIL: ${e.message}`);
    }
  }

  console.log(`\n=== DONE: ${ok} uploaded, ${fail} failed ===`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
