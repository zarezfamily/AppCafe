// Fix Pellini, Peet's, San Jorge, Zoégas, Trung Nguyen, Note d'Espresso, La Colombe, illy photos
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
    if (hiRes.length > 0) {
      return await processPhoto(docId, hiRes[0][1]);
    }
    return false;
  } catch {
    return false;
  }
}

async function redownloadBrand(brandName) {
  const snap = await db.collection('cafes').where('marca', '==', brandName).get();
  const cafes = [];
  snap.forEach((d) => cafes.push({ id: d.id, ...d.data() }));

  let ok = 0,
    fail = 0;
  for (const c of cafes) {
    const url = c.fotoUrl || c.imageUrl || c.foto || '';
    const original = c.photos?.original || '';

    // Try to reprocess from Amazon images (already hi-res)
    if (url.includes('m.media-amazon.com') || original.includes('m.media-amazon.com')) {
      const sourceUrl = url.includes('m.media-amazon.com') ? url : original;
      console.log(`  ${c.id}: reprocessing Amazon image...`);
      if (await processPhoto(c.id, sourceUrl)) {
        ok++;
        console.log(`    ✅`);
      } else {
        fail++;
        console.log(`    ❌`);
      }
    } else if (url.includes('cdn.shopify.com') || original.includes('cdn.shopify.com')) {
      const sourceUrl = (original || url).includes('cdn.shopify.com') ? original || url : url;
      console.log(`  ${c.id}: reprocessing Shopify image...`);
      if (await processPhoto(c.id, sourceUrl)) {
        ok++;
        console.log(`    ✅`);
      } else {
        fail++;
        console.log(`    ❌`);
      }
    } else if (original && !original.includes('miappdecafe')) {
      console.log(`  ${c.id}: reprocessing original...`);
      if (await processPhoto(c.id, original)) {
        ok++;
        console.log(`    ✅`);
      } else {
        fail++;
        console.log(`    ❌`);
      }
    } else {
      console.log(`  ${c.id}: skipped (no better source)`);
    }
  }
  return { ok, fail };
}

async function main() {
  let totalOk = 0,
    totalFail = 0;

  // === PELLINI - reprocess all from Amazon sources ===
  console.log('=== PELLINI ===');
  const pellini = await redownloadBrand('Pellini');
  totalOk += pellini.ok;
  totalFail += pellini.fail;
  console.log(`  Pellini: ${pellini.ok} ok, ${pellini.fail} fail\n`);

  // === PEET'S - specific blurry ones ===
  console.log("=== PEET'S (blurry) ===");
  const peetsIds = [
    'peets_dubs-blend',
    'peets_ethiopian-super-natural',
    'peets_papua-new-guinea-bunum-wo',
    'peets_simply-oatmeal',
  ];
  for (const id of peetsIds) {
    const doc = await db.collection('cafes').doc(id).get();
    if (!doc.exists) continue;
    const data = doc.data();
    const url = data.fotoUrl || data.imageUrl || '';
    const original = data.photos?.original || '';
    const source = (original || url).includes('cdn.shopify.com') ? original || url : url;
    if (source && source.includes('shopify')) {
      // Try higher res version
      const hiRes = source.replace(/(_x\d+|_\d+x\d+)/, '').replace(/\?.*/, '');
      console.log(`  ${id}: trying hi-res shopify...`);
      if (await processPhoto(id, hiRes)) {
        totalOk++;
        console.log(`    ✅`);
      } else if (await processPhoto(id, source)) {
        totalOk++;
        console.log(`    ✅ original`);
      } else {
        totalFail++;
        console.log(`    ❌`);
      }
    } else {
      console.log(`  ${id}: no shopify source, trying reprocess...`);
      if (source && (await processPhoto(id, source))) {
        totalOk++;
        console.log(`    ✅`);
      } else {
        totalFail++;
        console.log(`    ❌`);
      }
    }
  }

  // === SAN JORGE - blurry ===
  console.log('\n=== SAN JORGE ===');
  const sjIds = ['sanjorge_chet-eti-250', 'sanjorge_pk-mw-250'];
  for (const id of sjIds) {
    const doc = await db.collection('cafes').doc(id).get();
    if (!doc.exists) continue;
    const data = doc.data();
    const url = data.fotoUrl || data.imageUrl || '';
    const original = data.photos?.original || '';
    const source = original || url;
    if (source) {
      console.log(`  ${id}: reprocessing...`);
      if (await processPhoto(id, source.replace(/\?.*/, ''))) {
        totalOk++;
        console.log(`    ✅`);
      } else {
        totalFail++;
        console.log(`    ❌`);
      }
    }
  }

  // === ZOÉGAS - blurry ===
  console.log('\n=== ZOÉGAS ===');
  const zoegasIds = ['ean_7310731103219', 'ean_7310731103202'];
  for (const id of zoegasIds) {
    const doc = await db.collection('cafes').doc(id).get();
    if (!doc.exists) continue;
    const data = doc.data();
    const url = data.fotoUrl || data.imageUrl || '';
    const original = data.photos?.original || '';
    const source = original || url;
    if (source && source.includes('kaffekapslen')) {
      const hiRes = source.replace(/\/cache\/[^/]+\//, '/');
      console.log(`  ${id}: trying hi-res kaffekapslen...`);
      if (await processPhoto(id, hiRes)) {
        totalOk++;
        console.log(`    ✅`);
      } else if (await processPhoto(id, source)) {
        totalOk++;
        console.log(`    ✅ original`);
      } else {
        totalFail++;
        console.log(`    ❌`);
      }
    }
  }

  // === TRUNG NGUYEN #1332 and #1341 - no photo ===
  console.log('\n=== TRUNG NGUYEN ===');
  // Try Amazon for these
  if (await tryAmazon('trung-nguyen_creative-8', 'B07DYBQV3Y')) {
    totalOk++;
    console.log('  ✅ creative-8');
  } else {
    totalFail++;
    console.log('  ❌ creative-8');
  }
  if (await tryAmazon('trung-nguyen_gourmet-blend', 'B01LYC6M0W')) {
    totalOk++;
    console.log('  ✅ gourmet-blend');
  } else {
    totalFail++;
    console.log('  ❌ gourmet-blend');
  }

  // === NOTE D'ESPRESSO ===
  console.log("\n=== NOTE D'ESPRESSO ===");
  if (await tryAmazon('note_espresso_clasico_grano_1kg', 'B018T1NXDA')) {
    totalOk++;
    console.log('  ✅');
  } else {
    totalFail++;
    console.log('  ❌');
  }

  // === LA COLOMBE ===
  console.log('\n=== LA COLOMBE ===');
  // #788 Bowery Blend, #790 Colombia Inga Red Honey (hands), #797 Lyon
  const lacolombe = {
    'lacolombe_bowery-blend':
      'https://cdn.shopify.com/s/files/1/0056/4562/files/12oz_BoweryBlend.jpg',
    'lacolombe_colombia-inga-red-honey':
      'https://cdn.shopify.com/s/files/1/0056/4562/files/12oz_IngaRedHoney.jpg',
    lacolombe_lyon: 'https://cdn.shopify.com/s/files/1/0056/4562/files/12oz_Lyon.jpg',
  };
  for (const [id, url] of Object.entries(lacolombe)) {
    console.log(`  ${id}...`);
    if (await processPhoto(id, url)) {
      totalOk++;
      console.log(`    ✅`);
    } else {
      totalFail++;
      console.log(`    ❌`);
    }
  }

  // === ILLY #671 (INCAPTO, not illy) - better photo ===
  console.log('\n=== INCAPTO #671 ===');
  // This is actually incapto_cafe-en-grano-colombia
  const illyDoc = await db.collection('cafes').doc('incapto_cafe-en-grano-colombia').get();
  if (illyDoc.exists) {
    const data = illyDoc.data();
    const original = data.photos?.original || '';
    if (original) {
      console.log(`  Reprocessing from original: ${original.substring(0, 80)}`);
      if (await processPhoto('incapto_cafe-en-grano-colombia', original)) {
        totalOk++;
        console.log('    ✅');
      } else {
        totalFail++;
      }
    }
  }

  // === SUPRACAFÉ ===
  console.log('\n=== SUPRACAFÉ ===');
  // eci_supracafe_colombia_250g and supracafe_descafeinado_grano_1kg
  if (await tryAmazon('eci_supracafe_colombia_250g', 'B082DZ9VXY')) {
    totalOk++;
    console.log('  ✅ colombia');
  } else {
    totalFail++;
    console.log('  ❌ colombia');
  }
  if (await tryAmazon('supracafe_descafeinado_grano_1kg', 'B09MFZ1K72')) {
    totalOk++;
    console.log('  ✅ descafeinado');
  } else {
    totalFail++;
    console.log('  ❌ descafeinado');
  }

  console.log(`\n=== TOTAL: ${totalOk} success, ${totalFail} failed ===`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
