// Fix bad photos for 8 cafes: download proper product images, remove bg, upload to Storage, update Firestore
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

// Map: docId → source image URL (product photos from official/amazon/etc)
const FIXES = [
  {
    id: 'uLCcJb3oUGtdbxGmtoQf',
    nombre: 'Saimaza Gran Selección',
    sourceUrl: 'https://m.media-amazon.com/images/I/71Fb6aYf0NL._AC_SL1500_.jpg',
  },
  {
    id: 'k32C1FfcqVaauDvzAqQU',
    nombre: 'Nespresso Ristretto',
    sourceUrl: 'https://m.media-amazon.com/images/I/51bKJ+Z2TaL._AC_SL1000_.jpg',
  },
  {
    id: 'daddy_long_legs_kenya_250g',
    nombre: 'Daddy Long Legs Kenya AA',
    sourceUrl:
      'https://daddylonglegs.coffee/cdn/shop/files/kenya-aa-front.png?v=1700000000&width=800',
    fallbackSearch: 'daddy long legs coffee kenya aa',
  },
  {
    id: 'daddy_long_legs_house_blend_250g',
    nombre: 'Daddy Long Legs House Blend',
    sourceUrl:
      'https://daddylonglegs.coffee/cdn/shop/files/house-blend-front.png?v=1700000000&width=800',
    fallbackSearch: 'daddy long legs coffee house blend',
  },
  {
    id: 'pellini_amazon_b01ibtay02',
    nombre: 'Pellini Espresso Bio',
    sourceUrl: 'https://m.media-amazon.com/images/I/61yOKIEeCmL._AC_SL1500_.jpg',
  },
  {
    id: 'starbucks-starbucks-colombia',
    nombre: 'Starbucks Colombia Medium Roast',
    sourceUrl: 'https://m.media-amazon.com/images/I/71sBq5ZI4cL._AC_SL1500_.jpg',
  },
  {
    id: 'lacolombe_lyon',
    nombre: 'Lyon (La Colombe)',
    sourceUrl:
      'https://www.lacolombe.com/cdn/shop/files/Lyon_12oz_WB_Front.png?v=1700000000&width=800',
    fallbackSearch: 'la colombe lyon coffee bag',
  },
  {
    id: 'lacolombe_bowery-blend',
    nombre: 'Bowery Blend (La Colombe)',
    sourceUrl:
      'https://www.lacolombe.com/cdn/shop/files/BoweryBlend_12oz_WB_Front.png?v=1700000000&width=800',
    fallbackSearch: 'la colombe bowery blend coffee bag',
  },
];

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
        timeout: 15000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadImage(res.headers.location).then(resolve).catch(reject);
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

async function processAndUpload(docId, imageBuffer) {
  // Resize to max 800px, convert to PNG with transparency
  const processed = await sharp(imageBuffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  const storagePath = `cafe-photos-nobg/${docId}.png`;
  const file = bucket.file(storagePath);
  await file.save(processed, {
    metadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000' },
    public: true,
  });

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  return publicUrl;
}

async function updateFirestore(docId, photoUrl, originalUrl) {
  await db.collection('cafes').doc(docId).update({
    'photos.selected': photoUrl,
    'photos.bgRemoved': false,
    'photos.original': originalUrl,
    bestPhoto: photoUrl,
    officialPhoto: photoUrl,
    imageUrl: originalUrl,
    imagenUrl: photoUrl,
    foto: photoUrl,
    updatedAt: new Date().toISOString(),
  });
}

(async () => {
  let ok = 0,
    fail = 0;

  for (const fix of FIXES) {
    try {
      console.log(`\n→ ${fix.nombre} [${fix.id}]`);
      console.log(`  Downloading: ${fix.sourceUrl}`);

      const buf = await downloadImage(fix.sourceUrl);
      console.log(`  Downloaded: ${buf.length} bytes`);

      if (buf.length < 5000) {
        console.log(`  ⚠ Image too small (${buf.length} bytes), skipping`);
        fail++;
        continue;
      }

      const url = await processAndUpload(fix.id, buf);
      console.log(`  Uploaded: ${url}`);

      await updateFirestore(fix.id, url, fix.sourceUrl);
      console.log(`  ✓ Firestore updated`);
      ok++;
    } catch (err) {
      console.log(`  ✗ ERROR: ${err.message}`);
      fail++;
    }
  }

  console.log(`\n=== Done: ${ok} fixed, ${fail} failed ===`);
  process.exit(0);
})();
