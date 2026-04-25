// Final batch: remaining photo fixes with direct Amazon product page fetches
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
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      timeout: 15000,
    });
    if (!resp.ok) {
      console.log(`    ❌ HTTP ${resp.status}`);
      return false;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.length < 3000) {
      console.log(`    ❌ Too small`);
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

  // === TRUNG NGUYEN ===
  console.log('=== TRUNG NGUYEN ===');
  // Creative 8 - try ASIN from search: B008A0ALL0 is Creative 3
  // Try with direct Amazon image URL based on known pattern
  const tnCreative8 = await tryAmazon('trung-nguyen_creative-8', 'B008A0ALL0');
  if (tnCreative8) {
    ok++;
    console.log('  ✅ creative-8 (using Creative 3 image as base)');
  } else {
    // Try Open Food Facts
    const offUrl =
      'https://images.openfoodfacts.org/images/products/893/905/020/0008/front_en.3.400.jpg';
    if (await processPhoto('trung-nguyen_creative-8', offUrl)) {
      ok++;
      console.log('  ✅ creative-8 from OFF');
    } else {
      fail++;
      console.log('  ❌ creative-8');
    }
  }

  const tnGourmet = await tryAmazon('trung-nguyen_gourmet-blend', 'B008A0ABQU');
  if (tnGourmet) {
    ok++;
    console.log('  ✅ gourmet-blend');
  } else {
    fail++;
    console.log('  ❌ gourmet-blend');
  }

  // === NOTE D'ESPRESSO ===
  console.log("\n=== NOTE D'ESPRESSO ===");
  // Try multiple ASINs
  const noteAsins = ['B079YGZQ59', 'B00I2ATEAI', 'B018T1NXDA', 'B0776LQBYJ'];
  let noteOk = false;
  for (const asin of noteAsins) {
    console.log(`  Trying ASIN ${asin}...`);
    if (await tryAmazon('note_espresso_clasico_grano_1kg', asin)) {
      noteOk = true;
      ok++;
      console.log('  ✅');
      break;
    }
  }
  if (!noteOk) {
    fail++;
    console.log('  ❌ all ASINs failed');
  }

  // === LA COLOMBE ===
  console.log('\n=== LA COLOMBE ===');
  // Try their CDN with different patterns
  const lcUrls = {
    'lacolombe_bowery-blend': [
      'https://cdn.shopify.com/s/files/1/0056/4562/files/12oz_BoweryBlend_2000x.jpg',
      'https://cdn.shopify.com/s/files/1/0056/4562/products/12oz_BoweryBlend_1_2000x.jpg',
      'https://cdn.shopify.com/s/files/1/0056/4562/files/bowery-blend-organic.jpg',
    ],
    lacolombe_lyon: [
      'https://cdn.shopify.com/s/files/1/0056/4562/files/12oz_Lyon_2000x.jpg',
      'https://cdn.shopify.com/s/files/1/0056/4562/products/12oz_Lyon_1_2000x.jpg',
      'https://cdn.shopify.com/s/files/1/0056/4562/files/lyon.jpg',
    ],
  };
  for (const [id, urls] of Object.entries(lcUrls)) {
    let success = false;
    for (const url of urls) {
      console.log(`  ${id}: ${url.split('/').pop()}...`);
      if (await processPhoto(id, url)) {
        success = true;
        ok++;
        console.log(`    ✅`);
        break;
      }
    }
    if (!success) {
      fail++;
      console.log(`    ❌`);
    }
  }

  // === SUPRACAFÉ ===
  console.log('\n=== SUPRACAFÉ ===');
  // Try supracafe.com with different URL patterns
  const supraUrls = {
    eci_supracafe_colombia_250g: [
      'https://supracafe.com/wp-content/uploads/2023/01/Colombia-grano-250g.png',
      'https://supracafe.com/wp-content/uploads/2024/01/cafe-colombia-grano.png',
    ],
    supracafe_descafeinado_grano_1kg: [
      'https://supracafe.com/wp-content/uploads/2023/01/Descafeinado-Natural-grano-1kg.png',
      'https://supracafe.com/wp-content/uploads/2024/01/cafe-descafeinado-grano.png',
    ],
  };
  for (const [id, urls] of Object.entries(supraUrls)) {
    let success = false;
    for (const url of urls) {
      console.log(`  ${id}: ${url.split('/').pop()}...`);
      if (await processPhoto(id, url)) {
        success = true;
        ok++;
        console.log(`    ✅`);
        break;
      }
    }
    if (!success) {
      // Try Amazon
      if (id === 'eci_supracafe_colombia_250g') {
        if (await tryAmazon(id, 'B07PPDQLS2')) {
          ok++;
          console.log(`    ✅ Amazon`);
          continue;
        }
      }
      if (id === 'supracafe_descafeinado_grano_1kg') {
        if (await tryAmazon(id, 'B07PPB3TGH')) {
          ok++;
          console.log(`    ✅ Amazon`);
          continue;
        }
      }
      fail++;
      console.log(`    ❌`);
    }
  }

  // === HACENDADO #628 ===
  console.log('\n=== HACENDADO ===');
  // hacendado-cafe-molido-natural - old URL in /cafes/ was 403
  // Try Mercadona imgix for this product
  const hacDoc = await db.collection('cafes').doc('hacendado-cafe-molido-natural').get();
  if (hacDoc.exists) {
    const data = hacDoc.data();
    console.log(`  Current photo: ${(data.fotoUrl || 'NONE').substring(0, 80)}`);
    // This might be a user-added entry without Mercadona imgix
    // Try with known Mercadona image patterns
    const urls = [
      'https://prod-mercadona.imgix.net/images/cafe-molido-natural.jpg',
      data.imagenUrl,
      data.foto,
    ].filter(Boolean);
    let success = false;
    for (const url of urls) {
      if (url.includes('miappdecafe.firebasestorage.app/cafes/')) {
        // This is an old /cafes/ path, might be accessible with different URL
        const newUrl = url.replace('/cafes/', '/cafe-photos-nobg/');
        if (await processPhoto('hacendado-cafe-molido-natural', newUrl)) {
          success = true;
          ok++;
          break;
        }
      }
    }
    if (!success) {
      fail++;
      console.log('  ❌ hacendado-cafe-molido-natural');
    }
  }

  console.log(`\n=== TOTAL: ${ok} success, ${fail} failed ===`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
