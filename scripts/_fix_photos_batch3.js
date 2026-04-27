// Fix Saimaza photos - all pointing to generic jde-coffee-tea.jpg
// Also fix Kfetea #738-740 wrong photos
// Also fix Note d'Espresso #1069, Tupinamba #1348
// Also fix Supracafé photos

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
    console.log(`  Fetching: ${imageUrl.substring(0, 90)}...`);
    const resp = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 15000,
    });
    if (!resp.ok) {
      console.log(`  ❌ HTTP ${resp.status}`);
      return false;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 3000) {
      console.log(`  ❌ Image too small (${buf.length} bytes)`);
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
    console.log(`  ❌ Error: ${err.message}`);
    return false;
  }
}

async function tryAmazonAsin(docId, asin) {
  const url = `https://www.amazon.es/dp/${asin}`;
  console.log(`  Trying Amazon ASIN ${asin}...`);
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
      timeout: 15000,
    });
    const html = await resp.text();
    const hiRes = [
      ...html.matchAll(/"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g),
    ];
    if (hiRes.length > 0) {
      const imageUrl = hiRes[0][1];
      console.log(`  Found hiRes: ${imageUrl.substring(0, 80)}`);
      return await processPhoto(docId, imageUrl);
    }
    console.log(`  No hiRes found`);
    return false;
  } catch (err) {
    console.log(`  ❌ Amazon error: ${err.message}`);
    return false;
  }
}

async function main() {
  let ok = 0,
    fail = 0;

  // === SAIMAZA - try saimaza.es product pages ===
  console.log('\n=== SAIMAZA ===');
  // Saimaza uses saimaza.es/globalassets/jde-coffee-tea.jpg for all - that's a generic image
  // Let's try Amazon for Saimaza products
  const saimazaAmazon = {
    'saimaza_https-www-saimaza-es-productos-descafeinado-mezcla': 'B0CVHYQF4V',
    'saimaza_https-www-saimaza-es-productos-descafeinado-natural': 'B0CVHYQF4V', // same pack
    'saimaza_https-www-saimaza-es-productos-gran-seleccion-descafeinado': 'B08GVXYWV2',
    'saimaza_https-www-saimaza-es-productos-gran-seleccion-natural': 'B08GVXYWV2',
    'saimaza_https-www-saimaza-es-productos-capsulas-descafeinado': 'B0DH6FCV5V',
    'saimaza_https-www-saimaza-es-productos-capsulas-extra-fuerte': 'B0DH6FCV5V',
    'saimaza_https-www-saimaza-es-productos-capsulas-fuerte': 'B0DH6FCV5V',
    'saimaza_https-www-saimaza-es-productos-grano-saimaza-catering-mezcla': 'B0C4GNXQ3Q',
    'saimaza_https-www-saimaza-es-productos-natural-y-mezcla-mezcla': 'B00QOCSIXG',
    'saimaza_https-www-saimaza-es-productos-natural-y-mezcla-natural': 'B00QOCSIOU',
  };

  // Try saimaza.es product pages first for better images
  const saimazaPages = {
    'saimaza_https-www-saimaza-es-productos-descafeinado-mezcla':
      'https://www.saimaza.es/siteassets/products/saimaza-descafeinado-mezcla.png',
    'saimaza_https-www-saimaza-es-productos-descafeinado-natural':
      'https://www.saimaza.es/siteassets/products/saimaza-descafeinado-natural.png',
    'saimaza_https-www-saimaza-es-productos-gran-seleccion-descafeinado':
      'https://www.saimaza.es/siteassets/products/saimaza-gran-seleccion-descafeinado.png',
    'saimaza_https-www-saimaza-es-productos-gran-seleccion-natural':
      'https://www.saimaza.es/siteassets/products/saimaza-gran-seleccion-natural.png',
    'saimaza_https-www-saimaza-es-productos-capsulas-descafeinado':
      'https://www.saimaza.es/siteassets/products/saimaza-capsulas-descafeinado.png',
    'saimaza_https-www-saimaza-es-productos-capsulas-extra-fuerte':
      'https://www.saimaza.es/siteassets/products/saimaza-capsulas-extra-fuerte.png',
    'saimaza_https-www-saimaza-es-productos-capsulas-fuerte':
      'https://www.saimaza.es/siteassets/products/saimaza-capsulas-fuerte.png',
    'saimaza_https-www-saimaza-es-productos-grano-saimaza-catering-mezcla':
      'https://www.saimaza.es/siteassets/products/saimaza-catering-mezcla.png',
    'saimaza_https-www-saimaza-es-productos-natural-y-mezcla-mezcla':
      'https://www.saimaza.es/siteassets/products/saimaza-mezcla.png',
    'saimaza_https-www-saimaza-es-productos-natural-y-mezcla-natural':
      'https://www.saimaza.es/siteassets/products/saimaza-natural.png',
  };

  for (const [docId, url] of Object.entries(saimazaPages)) {
    console.log(`Processing ${docId}...`);
    let success = await processPhoto(docId, url);
    if (!success && saimazaAmazon[docId]) {
      success = await tryAmazonAsin(docId, saimazaAmazon[docId]);
    }
    if (success) ok++;
    else fail++;
  }

  // === KFETEA #738-740 wrong photos ===
  console.log('\n=== KFETEA ===');
  // These are Kfetea Nespresso capsules - try kfetea/mogorttini website
  const kfeteaFixes = {
    ean_8436583660799:
      'https://www.mogorttini.com/222-home_default/10-cajas-de-descafeinado-kfetea-nespresso-100-capsulas.jpg',
    ean_8436583660775:
      'https://www.mogorttini.com/220-home_default/10-cajas-de-intenso-kfetea-nespresso-100-capsulas.jpg',
    ean_8436583660768:
      'https://www.mogorttini.com/219-home_default/10-cajas-de-ristretto-kfetea-nespresso-100-capsulas.jpg',
  };

  for (const [docId, url] of Object.entries(kfeteaFixes)) {
    console.log(`Processing ${docId}...`);
    if (await processPhoto(docId, url)) ok++;
    else fail++;
  }

  // === NOTE D'ESPRESSO #1069 ===
  console.log("\n=== NOTE D'ESPRESSO ===");
  // Try Amazon for Note d'Espresso Clasico Grano 1kg
  if (await tryAmazonAsin('note_espresso_clasico_grano_1kg', 'B019WG7O8O')) ok++;
  else fail++;

  // === TUPINAMBA #1348 ===
  console.log('\n=== TUPINAMBA ===');
  // Tupinamba Cafe molido Top Quality 250g - from tupinamba shop
  const tupiUrl =
    'https://cdn.shopify.com/s/files/1/0933/6406/0486/files/cafe-molido-top-quality-250g.png';
  console.log(`Processing tupinamba_cafe-molido-top-quality-250g...`);
  if (await processPhoto('tupinamba_cafe-molido-top-quality-250g', tupiUrl)) ok++;
  else {
    // Try alternative
    if (await tryAmazonAsin('tupinamba_cafe-molido-top-quality-250g', 'B09X56HRMV')) ok++;
    else fail++;
  }

  // === SUPRACAFÉ ===
  console.log('\n=== SUPRACAFÉ ===');
  // Two Supracafé entries: eci_supracafe_colombia_250g and supracafe_descafeinado_grano_1kg
  if (await tryAmazonAsin('eci_supracafe_colombia_250g', 'B0BM46NWYP')) ok++;
  else fail++;
  if (await tryAmazonAsin('supracafe_descafeinado_grano_1kg', 'B0BM4BFZ1Q')) ok++;
  else fail++;

  console.log(`\n=== TOTAL: ${ok} success, ${fail} failed ===`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
