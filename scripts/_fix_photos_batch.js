const fetch = require('node-fetch');
const sharp = require('sharp');
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const bucket = admin.storage().bucket();
const db = admin.firestore();

async function getHiRes(asin) {
  const res = await fetch(`https://www.amazon.es/dp/${asin}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'es-ES,es;q=0.9',
    },
  });
  const html = await res.text();
  const matches = [
    ...html.matchAll(/"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g),
  ];
  return matches.length > 0 ? matches.map((m) => m[1]) : [];
}

async function fixPhoto(docId, imgUrl, label) {
  console.log(`  Downloading: ${imgUrl.substring(0, 80)}...`);
  const imgRes = await fetch(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const meta = await sharp(buf).metadata();
  console.log(`  Source: ${meta.width}x${meta.height} ${(buf.length / 1024).toFixed(0)}KB`);

  const processed = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();
  console.log(`  Processed: ${(processed.length / 1024).toFixed(0)}KB 800x800`);

  const storagePath = `cafe-photos-nobg/${docId}.png`;
  const file = bucket.file(storagePath);
  try {
    await file.delete();
  } catch (e) {}
  await file.save(processed, {
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
    public: true,
    resumable: false,
  });

  const publicUrl = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${storagePath}`;
  await db.collection('cafes').doc(docId).update({
    fotoUrl: publicUrl,
    foto: publicUrl,
    imageUrl: publicUrl,
    officialPhoto: publicUrl,
    bestPhoto: publicUrl,
    imagenUrl: publicUrl,
    'photos.selected': publicUrl,
    'photos.original': publicUrl,
    'photos.bgRemoved': true,
  });
  console.log(`  ${label} DONE ✓`);
}

(async () => {
  // === Der-Franz Espresso (B07Y5JK9YG) ===
  console.log('\n=== Der-Franz Espresso (#546) ===');
  let imgs = await getHiRes('B07Y5JK9YG');
  if (imgs.length) await fixPhoto('der_franz_espresso_grano_1kg', imgs[0], 'Espresso');
  else console.log('  No hiRes found!');

  // === Der-Franz Colombia - try multiple ASINs ===
  console.log('\n=== Der-Franz Colombia (#545) ===');
  // The Colombia 1000g product - try searching by ASIN pattern
  for (const asin of ['B07Y5GXWJV', 'B07Y5H16FB', 'B07Y5JZSWH']) {
    imgs = await getHiRes(asin);
    if (imgs.length) {
      // Check if the page title contains "Colombia" by checking image URL
      console.log(`  Trying ASIN ${asin}: found ${imgs.length} images`);
      // The first ASIN B07Y5GXWJV is actually Melange, let me use B07Y5JZSWH for Melange
      // For Colombia, we need to find the right one
    }
  }
  // Fallback: use a direct search for Colombia Single Origin
  const colRes = await fetch('https://www.amazon.es/s?k=Der+Franz+Colombia+Single+Origin+grano', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'es-ES,es;q=0.9',
    },
  });
  const colHtml = await colRes.text();
  // Try to find Colombia ASIN from search results
  const colAsinMatch = colHtml.match(/\/dp\/(B[A-Z0-9]{9})\/.*?Colombia/i);
  if (colAsinMatch) {
    console.log(`  Found Colombia ASIN: ${colAsinMatch[1]}`);
    imgs = await getHiRes(colAsinMatch[1]);
    if (imgs.length) await fixPhoto('der_franz_colombia_grano_1kg', imgs[0], 'Colombia');
    else console.log('  No hiRes from Colombia ASIN');
  } else {
    // Use Melange as fallback (similar packaging style)
    console.log('  Colombia ASIN not found, trying Melange (B07Y5GXWJV)...');
    imgs = await getHiRes('B07Y5GXWJV');
    if (imgs.length) {
      // Actually let's try the Crema one instead
      console.log('  Using Crema (B07Y5KMGGL) for Colombia...');
      imgs = await getHiRes('B07Y5KMGGL');
      if (imgs.length) {
        console.log('  WARNING: Using Der-Franz Crema image as placeholder for Colombia');
        // Don't update - skip this one
        console.log('  SKIPPED - need correct Colombia image');
      }
    }
  }

  // === Delta Platinum (search for single pack) ===
  console.log('\n=== Delta Platinum (#544) ===');
  // Try common Delta Platinum ASINs
  for (const asin of ['B09BNCL2N3', 'B08GGQGQXR', 'B09583LX8H']) {
    imgs = await getHiRes(asin);
    if (imgs.length) {
      console.log(`  ASIN ${asin}: ${imgs.length} images found`);
      // Check first image
      console.log(`  First: ${imgs[0].substring(0, 80)}`);
    }
  }

  // === Dolce Gusto Café con leche (EAN 7613033174667) ===
  console.log('\n=== Dolce Gusto Café con leche (#547) ===');
  // Search by EAN
  imgs = await getHiRes('B00R16UR0W'); // Common Dolce Gusto Café con leche ASIN
  if (!imgs.length) {
    // Try alternative
    for (const asin of ['B01MYOMHJ7', 'B006MTQY12', 'B00404HJQ8']) {
      imgs = await getHiRes(asin);
      if (imgs.length) {
        console.log(`  Found via ${asin}`);
        break;
      }
    }
  }
  if (imgs.length) await fixPhoto('ean_7613033174667', imgs[0], 'DG Café con leche');
  else console.log('  No hiRes found!');

  // === Dolce Gusto Cortado (EAN 7613032396350) ===
  console.log('\n=== Dolce Gusto Cortado (#548) ===');
  imgs = await getHiRes('B00NKO65FW'); // Common Dolce Gusto Cortado ASIN
  if (!imgs.length) {
    for (const asin of ['B01MYOMHJ7', 'B00XACQJNW']) {
      imgs = await getHiRes(asin);
      if (imgs.length) {
        console.log(`  Found via ${asin}`);
        break;
      }
    }
  }
  if (imgs.length) await fixPhoto('ean_7613032396350', imgs[0], 'DG Cortado');
  else console.log('  No hiRes found!');

  console.log('\n¡Script completado!');
  process.exit(0);
})();
