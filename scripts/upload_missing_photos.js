#!/usr/bin/env node
/**
 * Upload product photos for 5 cafes that have no image.
 * Downloads from source URLs, removes background, uploads to Firebase Storage, updates Firestore.
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

const cafes = [
  {
    id: '3U68wP8ALa2mYBa8ZMtR',
    nombre: 'Oquendo Espresso',
    imageUrl: 'https://www.cafesoquendo.com/wp-content/uploads/2019/10/italiano-500-granos.png',
  },
  {
    id: 'DrAD40l6JJVBsBMjlIuD',
    nombre: 'Fortaleza Natural',
    imageUrl:
      'https://images.openfoodfacts.org/images/products/841/019/221/2211/front_es.45.400.jpg',
  },
  {
    id: 'F1ZSkDVbqiETPUH8ZMP3',
    nombre: 'Illy Espresso Classico',
    imageUrl:
      'https://www.illy.com/dw/image/v2/BBDD_PRD/on/demandware.static/-/Sites-masterCatalog_illycaffe/default/dw24a445be/products/sfra/coffee/High2x/7577ME_High_2x_01.png',
  },
  {
    id: 'QKUAnsYTsKnyaTFmmo16',
    nombre: 'Marcilla Gran Aroma',
    imageUrl:
      'https://www.marcilla.com/siteassets/products/grain/marcilla-grano-gran-aroma-natural.png',
  },
  {
    id: 'ROVfLM5d9sFcFwsiGlI3',
    nombre: 'Saula Premium Original',
    imageUrl:
      'https://images.openfoodfacts.org/images/products/841/157/724/1307/front_es.4.400.jpg',
  },
];

function download(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'EtioveApp/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function tryFindMarcilla() {
  console.log('🔍 Trying to find Marcilla Gran Aroma image...');
  // Try searching Open Food Facts by brand
  try {
    const url = 'https://world.openfoodfacts.org/brand/marcilla.json';
    const data = await download(url);
    const json = JSON.parse(data.toString());
    for (const p of json.products || []) {
      const name = (p.product_name || '').toLowerCase();
      if (name.includes('gran aroma') && p.image_front_url) {
        console.log(`  Found: ${p.product_name} -> ${p.image_front_url}`);
        return p.image_front_url;
      }
    }
    // Fallback: use any Marcilla product with an image
    for (const p of json.products || []) {
      if (p.image_front_url && (p.product_name || '').toLowerCase().includes('molido')) {
        console.log(`  Fallback: ${p.product_name} -> ${p.image_front_url}`);
        return p.image_front_url;
      }
    }
    for (const p of json.products || []) {
      if (p.image_front_url) {
        console.log(`  Any Marcilla: ${p.product_name} -> ${p.image_front_url}`);
        return p.image_front_url;
      }
    }
  } catch (e) {
    console.log(`  Open Food Facts error: ${e.message}`);
  }
  return null;
}

async function processOne(cafe, removeBackground) {
  console.log(`\n📦 Processing: ${cafe.nombre} (${cafe.id})`);

  if (!cafe.imageUrl) {
    console.log('  ⏭  No image URL, skipping.');
    return false;
  }

  // 1. Download
  console.log(`  ⬇ Downloading from ${cafe.imageUrl.substring(0, 80)}...`);
  let imgBuf;
  try {
    imgBuf = await download(cafe.imageUrl);
  } catch (e) {
    console.log(`  ❌ Download failed: ${e.message}`);
    return false;
  }
  console.log(`  ✅ Downloaded ${(imgBuf.length / 1024).toFixed(0)} KB`);

  // 2. Convert to PNG
  console.log('  🔄 Converting to PNG...');
  imgBuf = await sharp(imgBuf).png().toBuffer();
  const contentType = 'image/png';

  // Save tmp
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
  const tmpPath = path.join(TMP_DIR, `${cafe.id}_original.png`);
  fs.writeFileSync(tmpPath, imgBuf);

  // 3. Remove background using Blob (required by @imgly/background-removal-node)
  console.log('  🎨 Removing background (this takes a while)...');
  try {
    const inputBlob = new Blob([imgBuf], { type: contentType });
    const blob = await removeBackground(inputBlob, {
      output: { format: 'image/png' },
    });
    imgBuf = Buffer.from(await blob.arrayBuffer());
    console.log(`  ✅ Background removed, ${(imgBuf.length / 1024).toFixed(0)} KB`);
  } catch (e) {
    console.log(`  ⚠️  BG removal failed: ${e.message}. Using original.`);
  }

  // 4. Resize to max 800px
  const metadata = await sharp(imgBuf).metadata();
  if (metadata.width > 800 || metadata.height > 800) {
    imgBuf = await sharp(imgBuf).resize(800, 800, { fit: 'inside' }).png().toBuffer();
  }

  const finalPath = path.join(TMP_DIR, `${cafe.id}_nobg.png`);
  fs.writeFileSync(finalPath, imgBuf);

  // 5. Upload to Firebase Storage (same path convention as remove_bg_local.js)
  const storagePath = `cafe-photos-nobg/${cafe.id}.png`;
  console.log(`  ☁️  Uploading to gs://${bucket.name}/${storagePath}...`);
  const file = bucket.file(storagePath);
  await file.save(Buffer.from(imgBuf), {
    metadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000',
    },
    public: true,
  });
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  console.log(`  ✅ Uploaded: ${publicUrl}`);

  // 6. Update Firestore (same fields as remove_bg_local.js)
  await db.collection('cafes').doc(cafe.id).update({
    imagenUrl: publicUrl,
    'photos.selected': publicUrl,
    'photos.original': cafe.imageUrl,
    'photos.bgRemoved': true,
    bestPhoto: publicUrl,
  });
  console.log(`  ✅ Firestore updated`);

  return true;
}

async function main() {
  console.log('=== Upload Missing Photos ===\n');

  // Dynamic import for ESM module
  const { removeBackground } = await import('@imgly/background-removal-node');

  // Try to find Marcilla image first
  const marcillaUrl = await tryFindMarcilla();
  if (marcillaUrl) {
    cafes.find((c) => c.id === 'QKUAnsYTsKnyaTFmmo16').imageUrl = marcillaUrl;
  }

  let success = 0;
  let failed = 0;
  for (const cafe of cafes) {
    try {
      const ok = await processOne(cafe, removeBackground);
      if (ok) success++;
      else failed++;
    } catch (e) {
      console.log(`  ❌ Error: ${e.message}`);
      failed++;
    }
  }

  console.log(`\n=== Done: ${success} uploaded, ${failed} failed/skipped ===`);
  process.exit(0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
