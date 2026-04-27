// Fix remaining Marcilla photos - using CDN URLs from marcilla.com
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

const fixes = {
  'marcilla_www-marcilla-com-productos-capsulas-descafeinado':
    'https://www.marcilla.com/cdn-cgi/image/width=520,fit=contain,format=png,onerror=redirect/siteassets/products/capsules/marcilla-capsulas-descafeinado-20-capsulas.jpg',
  'marcilla_www-marcilla-com-productos-capsulas-extra-intenso':
    'https://www.marcilla.com/cdn-cgi/image/width=520,fit=contain,format=png,onerror=redirect/siteassets/products/capsules/marcilla-capsulas-extra-intenso-20-capsulas.png',
  'marcilla_www-marcilla-com-productos-gran-aroma-extra':
    'https://www.marcilla.com/cdn-cgi/image/width=520,fit=contain,format=png,onerror=redirect/siteassets/products/ground/1-gran-aroma-extra-fuerte-front.png',
  'marcilla_www-marcilla-com-productos-gran-aroma-mezcla-grano':
    'https://www.marcilla.com/cdn-cgi/image/width=520,fit=contain,format=png,onerror=redirect/siteassets/products/grain/marcilla-grano-gran-aroma-mezcla.png',
  'marcilla_www-marcilla-com-productos-gran-aroma-natural-grano':
    'https://www.marcilla.com/cdn-cgi/image/width=520,fit=contain,format=png,onerror=redirect/siteassets/products/grain/marcilla-grano-gran-aroma-natural.png',
  'marcilla_www-marcilla-com-productos-puro-arabica-sudamerica':
    'https://www.marcilla.com/cdn-cgi/image/width=520,fit=contain,format=png,onerror=redirect/siteassets/products/grain/marcilla-grano-puro-arabica-sudamerica.png',
};

async function processPhoto(docId, imageUrl) {
  try {
    console.log(`  Fetching: ${imageUrl.substring(0, 90)}...`);
    const resp = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      timeout: 15000,
    });
    if (!resp.ok) {
      console.log(`  ❌ HTTP ${resp.status} for ${docId}`);
      return false;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 3000) {
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
  for (const [docId, url] of Object.entries(fixes)) {
    console.log(`Processing ${docId}...`);
    if (await processPhoto(docId, url)) ok++;
    else fail++;
  }
  console.log(`\n=== RESULTS: ${ok} success, ${fail} failed ===`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
