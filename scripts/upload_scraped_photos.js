#!/usr/bin/env node
/**
 * upload_scraped_photos.js
 *
 * Downloads scraped product images and uploads to Firebase Storage.
 * Updates Firestore photo fields.
 *
 * For Guilis: uses botasaurus to bypass Cloudflare (called from Python helper)
 * For CrazyBeans/Shopify: direct download via Shopify CDN
 */

const admin = require('firebase-admin');
const https = require('https');
const http = require('http');
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
const TMP_DIR = path.join(__dirname, '..', 'tmp_photos');

// Map: docId -> { url, nombre }
// CrazyBeans Colombia 500g - from Shopify product JSON API
// CrazyBeans Brasil 500g - they don't sell Brasil, use their generic Colombia image (same brand)
// Guilis: use images already downloaded by botasaurus helper
const PHOTOS = {
  // --- 69 CrazyBeans (Shopify CDN - direct download works) ---
  crazybeans_colombia_specialty_500g: {
    nombre: '69 CrazyBeans Colombia Specialty Grano 500g',
    url: 'https://cdn.shopify.com/s/files/1/0834/1635/0986/files/5.jpg?v=1726131505',
  },
  crazybeans_brasil_specialty_500g: {
    nombre: '69 CrazyBeans Brasil Specialty Grano 500g',
    // They don't sell Brasil - use their brand Colombia image
    url: 'https://cdn.shopify.com/s/files/1/0834/1635/0986/files/5.jpg?v=1726131505',
  },
  // --- Cafés Guilis (need local files from botasaurus download) ---
  guilis_blend_gourmet_grano_1kg: {
    nombre: 'Cafés Guilis Blend Gourmet Grano 1kg',
    localFile: 'guilis_blend_gourmet_grano_1kg.jpg', // downloaded by helper
  },
  guilis_colombiano_grano_1kg: {
    nombre: 'Cafés Guilis Colombiano Grano 1kg',
    localFile: 'guilis_colombiano_grano_1kg.jpg',
  },
  guilis_etiopia_grano_1kg: {
    nombre: 'Cafés Guilis Etiopía Grano 1kg',
    localFile: 'guilis_etiopia_grano_1kg.jpg', // uses Eco Beans image (closest)
  },
};

function download(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      {
        headers: { 'User-Agent': 'EtioveApp/1.0' },
        timeout: 30000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let loc = res.headers.location;
          if (loc.startsWith('/')) {
            const parsed = new URL(url);
            loc = `${parsed.protocol}//${parsed.host}${loc}`;
          }
          return download(loc, maxRedirects - 1)
            .then(resolve)
            .catch(reject);
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
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function processOne(docId, config) {
  console.log(`\n  [${config.nombre}] (${docId})`);

  let imgBuf;

  if (config.localFile) {
    // Load from local file (downloaded by botasaurus helper)
    const localPath = path.join(TMP_DIR, config.localFile);
    if (!fs.existsSync(localPath)) {
      console.log(`    SKIP - local file not found: ${config.localFile}`);
      return 'skip';
    }
    imgBuf = fs.readFileSync(localPath);
    console.log(`    Loaded local: ${(imgBuf.length / 1024).toFixed(0)} KB`);
  } else if (config.url) {
    // Download from URL
    try {
      console.log(`    Downloading: ${config.url.substring(0, 80)}`);
      imgBuf = await download(config.url);
      console.log(`    Downloaded ${(imgBuf.length / 1024).toFixed(0)} KB`);
    } catch (e) {
      console.log(`    Download failed: ${e.message}`);
      return 'error';
    }
  } else {
    console.log('    SKIP - no URL or local file');
    return 'skip';
  }

  // Validate it's a real image
  try {
    const meta = await sharp(imgBuf).metadata();
    console.log(`    Image: ${meta.width}x${meta.height} ${meta.format}`);
  } catch (e) {
    console.log(`    Invalid image: ${e.message}`);
    return 'error';
  }

  // Resize to max 800px
  const metadata = await sharp(imgBuf).metadata();
  if (metadata.width > 800 || metadata.height > 800) {
    imgBuf = await sharp(imgBuf).resize(800, 800, { fit: 'inside' }).png().toBuffer();
  } else {
    imgBuf = await sharp(imgBuf).png().toBuffer();
  }

  // Save locally
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
  fs.writeFileSync(path.join(TMP_DIR, `${docId}.png`), imgBuf);

  // Upload to Firebase Storage
  const storagePath = `cafe-photos-nobg/${docId}.png`;
  const file = bucket.file(storagePath);
  await file.save(Buffer.from(imgBuf), {
    metadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000',
    },
    public: true,
  });

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  console.log(`    Uploaded: ${publicUrl}`);

  // Update Firestore
  await db
    .collection('cafes')
    .doc(docId)
    .update({
      imagenUrl: publicUrl,
      bestPhoto: publicUrl,
      officialPhoto: publicUrl,
      imageUrl: publicUrl,
      foto: publicUrl,
      'photos.selected': publicUrl,
      'photos.original': config.url || publicUrl,
      'photos.bgRemoved': false,
    });
  console.log(`    Firestore updated`);
  return 'ok';
}

async function main() {
  console.log('=== Upload Scraped Photos ===\n');

  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  let ok = 0,
    skipped = 0,
    errors = 0;
  for (const [docId, config] of Object.entries(PHOTOS)) {
    try {
      const result = await processOne(docId, config);
      if (result === 'ok') ok++;
      else if (result === 'skip') skipped++;
      else errors++;
    } catch (e) {
      console.log(`    ERROR: ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`  Uploaded:  ${ok}`);
  console.log(`  Skipped:   ${skipped}`);
  console.log(`  Errors:    ${errors}`);

  process.exit(0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
