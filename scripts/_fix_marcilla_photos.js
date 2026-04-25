// Fix Marcilla photos - fetch correct images from marcilla.com
// Group 1 (#900-906): Capsulas - all show same photo, need individual photos
// Group 2 (#912,918,919,924,926,927,929): all same photo, need individual
// #925: wrong photo for Gran Aroma Natural Grano

const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const sharp = require('sharp');
const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

// Known Marcilla product image URLs from marcilla.com
const marcillaPhotos = {
  // Capsulas
  'marcilla_www-marcilla-com-productos-capsulas-descafeinado':
    'https://www.marcilla.com/siteassets/products/capsules/marcilla-capsulas-descafeinado-20-capsulas.png',
  'marcilla_www-marcilla-com-productos-capsulas-extra-intenso':
    'https://www.marcilla.com/siteassets/products/capsules/marcilla-capsulas-extra-intenso.png',
  'marcilla_www-marcilla-com-productos-capsulas-intenso':
    'https://www.marcilla.com/siteassets/products/capsules/marcilla-capsulas-intenso-20-capsulas.png',
  'marcilla_www-marcilla-com-productos-capsulas-puro-arabica-colombia':
    'https://www.marcilla.com/siteassets/products/capsules/marcilla-capsulas-puro-arabica-colombia.png',
  'marcilla_www-marcilla-com-productos-capsulas-puro-arabica-colombia-20-unidads':
    'https://www.marcilla.com/siteassets/products/capsules/marcilla-capsulas-puro-arabica-colombia-20-capsulas.png',
  'marcilla_www-marcilla-com-productos-capsulas-puro-arabica-espresso':
    'https://www.marcilla.com/siteassets/products/capsules/marcilla-capsulas-puro-arabica-espresso.png',
  // Molido/Grano
  'marcilla_www-marcilla-com-productos-creme-express-natural-molido':
    'https://www.marcilla.com/siteassets/products/ground/marcilla-molido-creme-express-natural.png',
  'marcilla_www-marcilla-com-productos-gran-aroma-extra':
    'https://www.marcilla.com/siteassets/products/ground/marcilla-molido-gran-aroma-extra-fuerte.png',
  'marcilla_www-marcilla-com-productos-gran-aroma-mezcla-grano':
    'https://www.marcilla.com/siteassets/products/beans/marcilla-grano-gran-aroma-mezcla.png',
  'marcilla_www-marcilla-com-productos-gran-aroma-natural-molido':
    'https://www.marcilla.com/siteassets/products/ground/marcilla-molido-gran-aroma-natural.png',
  'marcilla_www-marcilla-com-productos-gran-aroma-natural-grano':
    'https://www.marcilla.com/siteassets/products/beans/marcilla-grano-gran-aroma-natural.png',
  'marcilla_www-marcilla-com-productos-marcilla-colombia-natural-molido':
    'https://www.marcilla.com/siteassets/products/ground/marcilla-molido-colombia.png',
  'marcilla_www-marcilla-com-productos-puro-arabica-sudamerica':
    'https://www.marcilla.com/siteassets/products/ground/marcilla-molido-puro-arabica-sudamerica.png',
};

// Also QKUAnsYTsKnyaTFmmo16 "Marcilla Gran Aroma" - needs a proper photo
// Try Amazon for this one

async function processPhoto(docId, imageUrl) {
  try {
    console.log(`  Fetching: ${imageUrl.substring(0, 80)}...`);
    const resp = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      timeout: 15000,
    });
    if (!resp.ok) {
      console.log(`  ❌ HTTP ${resp.status} for ${docId}`);
      return false;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 5000) {
      console.log(`  ❌ Image too small (${buf.length} bytes) for ${docId}`);
      return false;
    }

    const processed = await sharp(buf)
      .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();

    const path = `cafe-photos-nobg/${docId}.png`;
    const file = bucket.file(path);

    // Delete old file first
    try {
      await file.delete();
    } catch {}

    await file.save(processed, {
      contentType: 'image/png',
      metadata: { cacheControl: 'public, max-age=60' },
      public: true,
      resumable: false,
    });

    const publicUrl = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${path}`;
    await db.collection('cafes').doc(docId).update({
      fotoUrl: publicUrl,
      foto: publicUrl,
      imageUrl: publicUrl,
      officialPhoto: publicUrl,
      bestPhoto: publicUrl,
      imagenUrl: publicUrl,
      'photos.selected': publicUrl,
      'photos.original': imageUrl,
      'photos.bgRemoved': publicUrl,
    });

    console.log(`  ✅ ${docId} updated`);
    return true;
  } catch (err) {
    console.log(`  ❌ Error for ${docId}: ${err.message}`);
    return false;
  }
}

async function main() {
  let ok = 0,
    fail = 0;

  for (const [docId, url] of Object.entries(marcillaPhotos)) {
    console.log(`Processing ${docId}...`);
    const result = await processPhoto(docId, url);
    if (result) ok++;
    else fail++;
  }

  console.log(`\n=== MARCILLA RESULTS: ${ok} success, ${fail} failed ===`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
