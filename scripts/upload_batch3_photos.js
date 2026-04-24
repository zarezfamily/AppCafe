#!/usr/bin/env node
/**
 * upload_batch3_photos.js
 *
 * Uploads 9 product images (5 "by Amazon" + 4 Delta) from tmp_photos/ to Firebase Storage.
 * Resizes to 800x800, uploads as PNG, updates Firestore photo fields.
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
const TMP_DIR = path.join(__dirname, '..', 'tmp_photos');

// Map: docId -> { localFile, nombre, originalUrl }
const PHOTOS = {
  // --- by Amazon ---
  amazon_intenso_grano_1kg: {
    localFile: 'amazon_intenso_grano_1kg.jpg',
    nombre: 'by Amazon Café Intenso Grano 1kg',
    originalUrl: 'https://m.media-amazon.com/images/I/71Hqel4hx5L._SL1500_.jpg',
  },
  amazon_fuerte_grano_1kg: {
    localFile: 'amazon_fuerte_grano_1kg.jpg',
    nombre: 'by Amazon Café Fuerte Grano 1kg',
    originalUrl: 'https://m.media-amazon.com/images/I/71TQvKf7+iL._SL1500_.jpg',
  },
  amazon_colombiano_grano_1kg: {
    localFile: 'amazon_colombiano_grano_1kg.jpg',
    nombre: 'by Amazon Café Colombiano Grano 1kg',
    originalUrl: 'https://m.media-amazon.com/images/I/71V6bJGSTbL._SL1500_.jpg',
  },
  amazon_classico_grano_1kg: {
    localFile: 'amazon_classico_grano_1kg.jpg',
    nombre: 'by Amazon Café Classico Grano 1kg',
    originalUrl: 'https://m.media-amazon.com/images/I/71eS0+lCKHL._SL1500_.jpg',
  },
  amazon_espresso_crema_grano_1kg: {
    localFile: 'amazon_espresso_crema_grano_1kg.jpg',
    nombre: 'by Amazon Café Espresso Crema Grano 1kg',
    originalUrl: 'https://m.media-amazon.com/images/I/71H4d6GrGKL._SL1500_.jpg',
  },
  // --- Delta Cafés ---
  delta_lote_superior_grano_1kg: {
    localFile: 'delta_lote_superior_grano_1kg.jpg',
    nombre: 'Delta Cafés Lote Superior Grano 1kg',
    originalUrl: 'https://m.media-amazon.com/images/I/71pGqxqM2zL._SL1500_.jpg',
  },
  delta_platinum_grano_1kg: {
    localFile: 'delta_platinum_grano_1kg.jpg',
    nombre: 'Delta Cafés Platinum Grano 1kg',
    originalUrl: 'https://m.media-amazon.com/images/I/61NsWzLky5L._SL1500_.jpg',
  },
  delta_colombia_origen_grano_500g: {
    localFile: 'delta_colombia_origen_grano_500g.jpg',
    nombre: 'Delta Cafés Colombia Origen Grano 500g',
    originalUrl: 'https://m.media-amazon.com/images/I/71M3NAulMgL._SL1500_.jpg',
  },
  delta_expresso_bar_grano_1kg: {
    localFile: 'delta_expresso_bar_grano_1kg.jpg',
    nombre: 'Delta Cafés Espresso Bar Grano 1kg',
    originalUrl: 'https://m.media-amazon.com/images/I/81+FLc6DpkL._SL1500_.jpg',
  },
};

async function processOne(docId, config) {
  console.log(`\n  [${config.nombre}] (${docId})`);

  const localPath = path.join(TMP_DIR, config.localFile);
  if (!fs.existsSync(localPath)) {
    console.log(`    SKIP - local file not found: ${config.localFile}`);
    return 'skip';
  }

  let imgBuf = fs.readFileSync(localPath);
  console.log(`    Loaded local: ${(imgBuf.length / 1024).toFixed(0)} KB`);

  // Validate it's a real image
  try {
    const meta = await sharp(imgBuf).metadata();
    console.log(`    Image: ${meta.width}x${meta.height} ${meta.format}`);
  } catch (e) {
    console.log(`    Invalid image: ${e.message}`);
    return 'error';
  }

  // Resize to max 800px and convert to PNG
  const metadata = await sharp(imgBuf).metadata();
  if (metadata.width > 800 || metadata.height > 800) {
    imgBuf = await sharp(imgBuf).resize(800, 800, { fit: 'inside' }).png().toBuffer();
  } else {
    imgBuf = await sharp(imgBuf).png().toBuffer();
  }
  console.log(`    Resized: ${(imgBuf.length / 1024).toFixed(0)} KB`);

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
      'photos.original': config.originalUrl || publicUrl,
      'photos.bgRemoved': false,
    });
  console.log(`    Firestore updated`);
  return 'ok';
}

async function main() {
  console.log('=== Upload Batch 3 Photos (5 Amazon + 4 Delta) ===\n');

  if (!fs.existsSync(TMP_DIR)) {
    console.log('ERROR: tmp_photos directory not found');
    process.exit(1);
  }

  const results = { ok: 0, skip: 0, error: 0 };

  for (const [docId, config] of Object.entries(PHOTOS)) {
    try {
      const r = await processOne(docId, config);
      results[r]++;
    } catch (e) {
      console.log(`    ERROR: ${e.message}`);
      results.error++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`  OK: ${results.ok}, Skip: ${results.skip}, Error: ${results.error}`);
  process.exit(0);
}

main();
