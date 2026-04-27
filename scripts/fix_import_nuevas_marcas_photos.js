#!/usr/bin/env node
/**
 * fix_import_nuevas_marcas_photos.js
 *
 * Fixes the 44 broken photo URLs for cafes imported via import_nuevas_marcas_es.
 *
 * Strategy:
 *  1. Query Firestore for cafes with fuente='import_nuevas_marcas_es'
 *  2. Skip any that already have working photos (Firebase Storage or 200 OK)
 *  3. For each broken cafe, search Open Food Facts by EAN for a real photo
 *  4. If found: download -> resize (800px) -> upload to Firebase Storage -> update Firestore
 *  5. If not found: set fallback generic coffee image
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

const FALLBACK_IMAGE =
  'https://images.openfoodfacts.org/images/products/327/019/002/5765/front_fr.13.400.jpg';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function download(url, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'EtioveApp/1.0 - coffee catalog app',
          Accept: 'image/*,application/json,*/*',
        },
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
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
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

function downloadJSON(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'EtioveApp/1.0 - coffee catalog app',
          Accept: 'application/json',
        },
        timeout: 15000,
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString()));
          } catch (e) {
            reject(e);
          }
        });
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

// Search Open Food Facts by EAN barcode
async function searchOFF_byEAN(ean) {
  if (!ean || ean === 'N/A') return null;
  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${ean}.json?fields=product_name,image_front_url,image_url`;
    const data = await downloadJSON(url);
    if (data.status === 1 && data.product) {
      const p = data.product;
      const imgUrl = p.image_front_url || p.image_url;
      if (imgUrl) {
        console.log(`    OFF EAN hit: ${p.product_name || ean} -> ${imgUrl.substring(0, 80)}`);
        return imgUrl;
      }
    }
  } catch (_e) {
    // silent
  }
  return null;
}

// Search Open Food Facts by brand name
async function searchOFF_byBrand(brand, productName) {
  if (!brand) return null;
  try {
    const brandSlug = brand
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+$/, '');
    const url = `https://world.openfoodfacts.org/brand/${encodeURIComponent(brandSlug)}.json`;
    const data = await downloadJSON(url);
    if (data.products && data.products.length > 0) {
      // Try to find a product with a name match
      const keywords = (productName || '')
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3);
      for (const p of data.products) {
        const pName = (p.product_name || '').toLowerCase();
        const matchCount = keywords.filter((k) => pName.includes(k)).length;
        if (matchCount >= 2 && p.image_front_url) {
          console.log(
            `    OFF brand match: ${p.product_name} -> ${p.image_front_url.substring(0, 80)}`
          );
          return p.image_front_url;
        }
      }
      // Fallback: any product from this brand with an image
      for (const p of data.products) {
        if (p.image_front_url) {
          console.log(
            `    OFF brand any: ${p.product_name} -> ${p.image_front_url.substring(0, 80)}`
          );
          return p.image_front_url;
        }
      }
    }
  } catch (_e) {
    // silent
  }
  return null;
}

async function uploadToStorage(docId, imgBuf) {
  const metadata = await sharp(imgBuf).metadata();
  if (metadata.width > 800 || metadata.height > 800) {
    imgBuf = await sharp(imgBuf).resize(800, 800, { fit: 'inside' }).png().toBuffer();
  } else {
    imgBuf = await sharp(imgBuf).png().toBuffer();
  }

  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
  fs.writeFileSync(path.join(TMP_DIR, `${docId}.png`), imgBuf);

  const storagePath = `cafe-photos-nobg/${docId}.png`;
  const file = bucket.file(storagePath);
  await file.save(Buffer.from(imgBuf), {
    metadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000',
    },
    public: true,
  });

  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

async function updateFirestorePhoto(docId, publicUrl, originalUrl) {
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
      'photos.original': originalUrl || publicUrl,
      'photos.bgRemoved': false,
    });
}

async function processOne(doc) {
  const data = doc.data();
  const nombre = data.nombre || doc.id;
  const marca = data.marca || data.roaster || '';
  const ean = data.ean || '';
  const currentUrl = data.bestPhoto || data.officialPhoto || '';

  console.log(`\n  [${nombre}] (${doc.id})`);
  console.log(`    EAN: ${ean} | Marca: ${marca}`);

  // Skip if already on Firebase Storage
  if (currentUrl.includes('storage.googleapis.com') || currentUrl.includes('firebasestorage.app')) {
    console.log('    SKIP - already on Firebase Storage');
    return 'skip';
  }

  // Quick HEAD check to see if URL works
  let urlWorks = false;
  if (currentUrl) {
    try {
      await download(currentUrl);
      urlWorks = true;
    } catch {
      // broken
    }
  }
  if (urlWorks) {
    console.log('    SKIP - current URL works');
    return 'skip';
  }

  console.log(`    Current URL broken: ${currentUrl.substring(0, 60)}...`);

  // --- Try to find a real photo ---

  let photoUrl = null;

  // Strategy 1: Open Food Facts by EAN
  photoUrl = await searchOFF_byEAN(ean);
  await delay(600);

  // Strategy 2: Open Food Facts by brand
  if (!photoUrl) {
    photoUrl = await searchOFF_byBrand(marca, nombre);
    await delay(600);
  }

  // If we found a real photo, download and upload to Storage
  if (photoUrl) {
    try {
      console.log(`    Downloading: ${photoUrl.substring(0, 80)}`);
      const imgBuf = await download(photoUrl);
      console.log(`    Downloaded ${(imgBuf.length / 1024).toFixed(0)} KB`);

      const publicUrl = await uploadToStorage(doc.id, imgBuf);
      console.log(`    Uploaded: ${publicUrl.substring(0, 70)}...`);

      await updateFirestorePhoto(doc.id, publicUrl, photoUrl);
      console.log(`    Firestore updated OK`);
      return 'fixed';
    } catch (e) {
      console.log(`    Download/upload failed: ${e.message}`);
    }
  }

  // Fallback: set generic coffee image
  console.log(`    No real photo found. Setting fallback.`);
  try {
    await updateFirestorePhoto(doc.id, FALLBACK_IMAGE, currentUrl);
    console.log(`    Fallback set OK`);
    return 'fallback';
  } catch (e) {
    console.log(`    Fallback error: ${e.message}`);
    return 'error';
  }
}

async function main() {
  console.log('=== Fix Photos: import_nuevas_marcas_es ===\n');

  const snap = await db.collection('cafes').where('fuente', '==', 'import_nuevas_marcas_es').get();

  console.log(`Found ${snap.size} cafes from import_nuevas_marcas_es\n`);

  let fixed = 0,
    fallback = 0,
    skipped = 0,
    errors = 0;

  for (const doc of snap.docs) {
    try {
      const result = await processOne(doc);
      if (result === 'fixed') fixed++;
      else if (result === 'fallback') fallback++;
      else if (result === 'skip') skipped++;
      else errors++;
    } catch (e) {
      console.log(`    ERROR: ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`  Fixed (real photo):    ${fixed}`);
  console.log(`  Fallback (generic):    ${fallback}`);
  console.log(`  Skipped (already OK):  ${skipped}`);
  console.log(`  Errors:                ${errors}`);
  console.log(`  Total:                 ${snap.size}`);

  process.exit(0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
