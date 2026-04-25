// Fix remaining photos: La Colombe, Trung Nguyen, Note d'Espresso, Supracafé, Hacendado
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
    const resp = await fetch(imageUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      },
      timeout: 15000,
    });
    if (!resp.ok) {
      console.log(`    ❌ HTTP ${resp.status}`);
      return false;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 3000) {
      console.log(`    ❌ Too small (${buf.length})`);
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
    return true;
  } catch (err) {
    console.log(`    ❌ ${err.message}`);
    return false;
  }
}

async function tryAmazon(docId, asin) {
  try {
    const resp = await fetch(`https://www.amazon.es/dp/${asin}`, {
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
    if (hiRes.length > 0) return await processPhoto(docId, hiRes[0][1]);
    return false;
  } catch {
    return false;
  }
}

async function main() {
  let ok = 0,
    fail = 0;

  // === LA COLOMBE - try lacolombe.com with different URL patterns ===
  console.log('=== LA COLOMBE ===');
  const lacolombe = {
    'lacolombe_bowery-blend': [
      'https://cdn.shopify.com/s/files/1/0056/4562/files/Bowery_Blend_Organic_12oz.png',
      'https://cdn.shopify.com/s/files/1/0056/4562/products/12oz_BoweryBlend.jpg',
    ],
    'lacolombe_colombia-inga-red-honey': [
      'https://cdn.shopify.com/s/files/1/0056/4562/files/12oz_IngaRedHoney00004.jpg',
    ],
    lacolombe_lyon: [
      'https://cdn.shopify.com/s/files/1/0056/4562/files/Lyon_12oz.png',
      'https://cdn.shopify.com/s/files/1/0056/4562/products/12oz_Lyon.jpg',
    ],
  };
  for (const [id, urls] of Object.entries(lacolombe)) {
    let success = false;
    for (const url of urls) {
      console.log(`  ${id}: trying ${url.substring(url.lastIndexOf('/') + 1)}...`);
      if (await processPhoto(id, url)) {
        success = true;
        ok++;
        console.log(`    ✅`);
        break;
      }
    }
    if (!success) {
      fail++;
      console.log(`    ❌ all URLs failed`);
    }
  }

  // === TRUNG NGUYEN - different ASINs ===
  console.log('\n=== TRUNG NGUYEN ===');
  // Creative 8
  console.log('  creative-8...');
  let tn1 = await tryAmazon('trung-nguyen_creative-8', 'B07DYBQV3Y'); // old ASIN
  if (!tn1) tn1 = await tryAmazon('trung-nguyen_creative-8', 'B073W6C3CZ');
  if (!tn1) tn1 = await tryAmazon('trung-nguyen_creative-8', 'B01NCJK1IG');
  if (tn1) {
    ok++;
    console.log('    ✅');
  } else {
    fail++;
    console.log('    ❌');
  }

  // Gourmet Blend
  console.log('  gourmet-blend...');
  let tn2 = await tryAmazon('trung-nguyen_gourmet-blend', 'B01LYC6M0W');
  if (!tn2) tn2 = await tryAmazon('trung-nguyen_gourmet-blend', 'B0185X35GI');
  if (!tn2) tn2 = await tryAmazon('trung-nguyen_gourmet-blend', 'B00KTWFX1C');
  if (tn2) {
    ok++;
    console.log('    ✅');
  } else {
    fail++;
    console.log('    ❌');
  }

  // === NOTE D'ESPRESSO ===
  console.log("\n=== NOTE D'ESPRESSO ===");
  console.log('  clasico...');
  let ne = await tryAmazon('note_espresso_clasico_grano_1kg', 'B018T1NXDA');
  if (!ne) ne = await tryAmazon('note_espresso_clasico_grano_1kg', 'B00I2ATEAI');
  if (!ne) ne = await tryAmazon('note_espresso_clasico_grano_1kg', 'B079YGZQ59');
  if (ne) {
    ok++;
    console.log('    ✅');
  } else {
    fail++;
    console.log('    ❌');
  }

  // === SUPRACAFÉ ===
  console.log('\n=== SUPRACAFÉ ===');
  // Try supracafe.com
  console.log('  colombia...');
  let sc1 = await processPhoto(
    'eci_supracafe_colombia_250g',
    'https://supracafe.com/wp-content/uploads/2023/05/cafe-colombia-supracafe-250g.jpg'
  );
  if (!sc1)
    sc1 = await processPhoto(
      'eci_supracafe_colombia_250g',
      'https://supracafe.com/wp-content/uploads/cafe-grano-colombia-natural.png'
    );
  if (sc1) {
    ok++;
    console.log('    ✅');
  } else {
    fail++;
    console.log('    ❌');
  }

  console.log('  descafeinado...');
  let sc2 = await processPhoto(
    'supracafe_descafeinado_grano_1kg',
    'https://supracafe.com/wp-content/uploads/2023/05/cafe-descafeinado-supracafe-1kg.jpg'
  );
  if (!sc2)
    sc2 = await processPhoto(
      'supracafe_descafeinado_grano_1kg',
      'https://supracafe.com/wp-content/uploads/cafe-grano-descafeinado-natural.png'
    );
  if (sc2) {
    ok++;
    console.log('    ✅');
  } else {
    fail++;
    console.log('    ❌');
  }

  // === HACENDADO missing photos (#623, #628, #634) ===
  console.log('\n=== HACENDADO ===');
  // #623: mercadona_11715 "Café molido Colombia Hacendado"
  // #628: hacendado-cafe-molido-natural "Café molido natural"
  // #634: mercadona_11049 "Café soluble classic en sobres Hacendado"

  // Check current photos
  for (const id of ['mercadona_11715', 'hacendado-cafe-molido-natural', 'mercadona_11049']) {
    const doc = await db.collection('cafes').doc(id).get();
    if (!doc.exists) {
      console.log(`  ${id}: NOT FOUND`);
      continue;
    }
    const data = doc.data();
    const url = data.fotoUrl || data.imageUrl || data.foto || '';
    const original = data.photos?.original || '';
    console.log(`  ${id}: current=${url.substring(0, 80)}`);
    console.log(`          original=${original.substring(0, 80)}`);

    // These are Mercadona products - try reprocessing from current URL
    if (url.includes('prod-mercadona.imgix.net') || url.includes('miappdecafe')) {
      const sourceUrl = url.includes('prod-mercadona')
        ? url.split('?')[0] + '?fit=crop&w=800&h=800'
        : url;
      console.log(`  Reprocessing...`);
      if (await processPhoto(id, url.split('?')[0])) {
        ok++;
        console.log(`    ✅`);
      } else {
        fail++;
        console.log(`    ❌`);
      }
    }
  }

  console.log(`\n=== TOTAL: ${ok} success, ${fail} failed ===`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
