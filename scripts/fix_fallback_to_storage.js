#!/usr/bin/env node
/**
 * fix_fallback_to_storage.js
 *
 * For the 42 cafes that have no real photo available:
 * 1. Create a clean generic coffee placeholder image using sharp
 * 2. Upload it to Firebase Storage as cafe-photos-nobg/generic-coffee.png
 * 3. Update all 42 broken cafes to point to that Firebase Storage URL
 *
 * The 2 Jurado cafes (already uploaded with real OFF photos) and
 * 2 Satan's Coffee Corner (already working) are skipped.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}

const db = admin.firestore();
const bucket = admin.storage().bucket();

// Create a simple coffee-colored placeholder image
async function createPlaceholder() {
  // Create a nice warm coffee-brown gradient-like square
  const size = 400;
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="bg" cx="50%" cy="40%" r="70%">
          <stop offset="0%" style="stop-color:#8B6914;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#4A3728;stop-opacity:1" />
        </radialGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="20" fill="url(#bg)"/>
      <text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" 
            font-family="Arial,sans-serif" font-size="120" fill="#D4A96A">☕</text>
      <text x="50%" y="72%" dominant-baseline="middle" text-anchor="middle"
            font-family="Arial,sans-serif" font-size="24" fill="#D4A96A" font-weight="bold">CAFÉ</text>
    </svg>`;

  return sharp(Buffer.from(svg)).resize(400, 400).png().toBuffer();
}

async function main() {
  console.log('=== Fix Fallback Photos → Firebase Storage ===\n');

  // 1. Create and upload generic placeholder
  console.log('Creating placeholder image...');
  const imgBuf = await createPlaceholder();
  console.log(`  Placeholder: ${(imgBuf.length / 1024).toFixed(0)} KB`);

  const storagePath = 'cafe-photos-nobg/generic-coffee-placeholder.png';
  const file = bucket.file(storagePath);
  await file.save(Buffer.from(imgBuf), {
    metadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000',
    },
    public: true,
  });
  const placeholderUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  console.log(`  Uploaded: ${placeholderUrl}\n`);

  // Save locally too
  const tmpDir = path.join(__dirname, '..', 'tmp_photos');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'generic-coffee-placeholder.png'), imgBuf);

  // 2. Query all cafes from this import
  const snap = await db.collection('cafes').where('fuente', '==', 'import_nuevas_marcas_es').get();

  console.log(`Found ${snap.size} cafes from import_nuevas_marcas_es\n`);

  let updated = 0,
    skipped = 0,
    errors = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const nombre = data.nombre || doc.id;
    const currentUrl = data.bestPhoto || data.officialPhoto || '';

    // Skip if already on Firebase Storage (Jurado photos or Satan's Coffee)
    if (
      currentUrl.includes('storage.googleapis.com') ||
      currentUrl.includes('firebasestorage.app')
    ) {
      console.log(`  SKIP ${nombre} (already on Storage)`);
      skipped++;
      continue;
    }

    // Skip Satan's Coffee Corner (external URLs that work)
    if (doc.id.includes('satan_coffee')) {
      console.log(`  SKIP ${nombre} (Satan's working)`);
      skipped++;
      continue;
    }

    // Update to placeholder
    try {
      await db.collection('cafes').doc(doc.id).update({
        imagenUrl: placeholderUrl,
        bestPhoto: placeholderUrl,
        officialPhoto: placeholderUrl,
        imageUrl: placeholderUrl,
        foto: placeholderUrl,
        'photos.selected': placeholderUrl,
        'photos.original': currentUrl,
        'photos.bgRemoved': false,
      });
      console.log(`  OK ${nombre}`);
      updated++;
    } catch (e) {
      console.log(`  ERR ${nombre}: ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`  Updated to placeholder: ${updated}`);
  console.log(`  Skipped (already OK):   ${skipped}`);
  console.log(`  Errors:                 ${errors}`);
  console.log(`  Total:                  ${snap.size}`);

  process.exit(0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
