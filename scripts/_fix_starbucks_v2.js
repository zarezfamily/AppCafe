#!/usr/bin/env node
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const https = require('https');
const fs = require('fs');
const sharp = require('sharp');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

function downloadBuf(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadBuf(res.headers.location).then(resolve).catch(reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ buf: Buffer.concat(chunks), status: res.statusCode }));
      })
      .on('error', reject);
  });
}

function fetchHtml(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchHtml(res.headers.location).then(resolve).catch(reject);
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

async function processAndUpload(docId, imageUrl, label) {
  console.log(`\n=== ${label} ===`);
  console.log(`  Downloading: ${imageUrl}`);
  const { buf, status } = await downloadBuf(imageUrl);
  if (status !== 200 || buf.length < 1000) {
    console.log(`  FAILED: status=${status}, size=${buf.length}`);
    return null;
  }
  console.log(`  Downloaded: ${buf.length} bytes`);

  const processed = await sharp(buf)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  console.log(`  Processed: ${processed.length} bytes`);

  const destPath = `cafe-photos-nobg/${docId}.png`;
  const file = bucket.file(destPath);
  await file.save(processed, { contentType: 'image/png' });
  await file.makePublic();
  const publicUrl = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${destPath}`;

  await db.collection('cafes').doc(docId).update({
    officialPhoto: publicUrl,
    bestPhoto: publicUrl,
    'photos.selected': publicUrl,
  });
  console.log(`  Uploaded & updated: ${docId}`);
  return publicUrl;
}

(async () => {
  try {
    // Re-upload Starbucks photos with full-size cremashop images (direct content URLs = ~80KB vs cached = ~3KB)

    // 1. Find ALL cremashop Starbucks image hashes by scraping the listing page
    const listHtml = await fetchHtml(
      'https://www.cremashop.eu/es/store/coffee?brand=starbucks&view=all'
    );
    const imgPattern = /content\/products\/starbucks\/([^/]+)\/(\d+-[a-f0-9]+)\.jpg/g;
    const cremashopHashes = {};
    let m;
    while ((m = imgPattern.exec(listHtml)) !== null) {
      cremashopHashes[m[1]] = m[2];
    }
    console.log('Cremashop Starbucks products found:', Object.keys(cremashopHashes));

    // Map our Firestore docs to cremashop for beans/capsules that need better photos
    const photoFixes = [
      {
        docId: 'starbucks-starbucks-decaf-espresso-roast',
        cremashop: 'espresso-roast',
        label: 'Decaf Espresso Roast (beans→use espresso roast bean image)',
      },
      {
        docId: 'starbucks-starbucks-caffe-verona',
        cremashop: 'nespresso-caffe-verona',
        label: 'Caffè Verona (beans→capsule image is best available)',
      },
      {
        docId: 'starbucks-starbucks-colombia',
        cremashop: 'nespresso-single-origin-colombia',
        label: 'Colombia Medium Roast (ground→Colombia capsule image)',
      },
      {
        docId: 'starbucks_1711621270983',
        cremashop: 'nespresso-blonde-espresso-decaf',
        label: 'Blonde Decaf Espresso Roast (capsules)',
      },
      {
        docId: 'starbucks_1732704053671',
        cremashop: 'nespresso-espresso-roast',
        label: 'Ristretto Shot (capsules→use espresso roast capsule image)',
      },
    ];

    for (const fix of photoFixes) {
      const hash = cremashopHashes[fix.cremashop];
      if (hash) {
        // Use the full-size direct content URL (not cached/resized)
        const url = `https://www.cremashop.eu/content/products/starbucks/${fix.cremashop}/${hash}.jpg`;
        await processAndUpload(fix.docId, url, fix.label);
      } else {
        console.log(`\n=== ${fix.label} === SKIPPED (no cremashop hash)`);
      }
    }

    // Also check if existing Starbucks photos in our DB are blurry/low quality
    // by checking the file size in Storage
    console.log('\n=== Checking existing Starbucks photo quality ===');
    const allSB = await db.collection('cafes').where('marca', '==', 'Starbucks').get();
    for (const doc of allSB.docs) {
      const data = doc.data();
      const photo =
        (data.photos && data.photos.selected) || data.officialPhoto || data.bestPhoto || '';
      if (photo && photo.includes('storage.googleapis.com')) {
        try {
          const storagePath = photo.split('miappdecafe.firebasestorage.app/')[1];
          if (storagePath) {
            const [metadata] = await bucket.file(storagePath).getMetadata();
            const sizeKB = Math.round(metadata.size / 1024);
            if (sizeKB < 5) {
              console.log(`  LOW QUALITY: ${doc.id} | ${data.nombre} | ${sizeKB}KB`);
            }
          }
        } catch (e) {
          /* ignore */
        }
      }
    }

    console.log('\n=== ALL DONE ===');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
