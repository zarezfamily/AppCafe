// Fix Saimaza photos using correct CDN URLs from saimaza.es
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

async function processPhoto(docId, imageUrl) {
  try {
    console.log(`  Fetching: ${imageUrl.substring(0, 100)}...`);
    const resp = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
      timeout: 15000,
    });
    if (!resp.ok) {
      console.log(`  ❌ HTTP ${resp.status}`);
      return false;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 3000) {
      console.log(`  ❌ Too small (${buf.length})`);
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
    console.log(`  ✅ updated`);
    return true;
  } catch (err) {
    console.log(`  ❌ ${err.message}`);
    return false;
  }
}

const CDN =
  'https://www.saimaza.es/cdn-cgi/image/width=520,fit=contain,format=png,onerror=redirect';

const fixes = {
  'saimaza_https-www-saimaza-es-productos-natural-y-mezcla-natural': `${CDN}/siteassets/products/p_saimaza-cafe-molido-natural.png`,
  'saimaza_https-www-saimaza-es-productos-natural-y-mezcla-mezcla': `${CDN}/siteassets/products/p_saimaza-cafe-molido-mezcla.png`,
  'saimaza_https-www-saimaza-es-productos-descafeinado-natural': `${CDN}/siteassets/products/p_saimaza-cafe-molido-descafeinado-natural.png`,
  'saimaza_https-www-saimaza-es-productos-descafeinado-mezcla': `${CDN}/siteassets/products/p_saimaza-cafe-molido-descafeinado-mezcla.png`,
  'saimaza_https-www-saimaza-es-productos-gran-seleccion-natural': `${CDN}/siteassets/products/p_saimaza-cafe-molido-gran-seleccion-natural.png`,
  'saimaza_https-www-saimaza-es-productos-gran-seleccion-descafeinado': `${CDN}/siteassets/products/p_saimaza-cafe-molido-gran-seleccion-descafeinado.png`,
  'saimaza_https-www-saimaza-es-productos-capsulas-extra-fuerte': `${CDN}/siteassets/products/saimaza-espresso-11-capsulas-extra-fuerte.png`,
  'saimaza_https-www-saimaza-es-productos-capsulas-fuerte': `${CDN}/siteassets/products/saimaza-espresso-9-capsulas-fuerte.png`,
  'saimaza_https-www-saimaza-es-productos-capsulas-descafeinado': `${CDN}/siteassets/products/saimaza-espresso-6-capsulas-descafeinado.png`,
  'saimaza_https-www-saimaza-es-productos-grano-saimaza-catering-mezcla': `${CDN}/siteassets/products/catering-mezcla.png`,
};

async function main() {
  let ok = 0,
    fail = 0;
  for (const [docId, url] of Object.entries(fixes)) {
    console.log(`Processing ${docId}...`);
    if (await processPhoto(docId, url)) ok++;
    else fail++;
  }
  console.log(`\n=== SAIMAZA: ${ok} success, ${fail} failed ===`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
