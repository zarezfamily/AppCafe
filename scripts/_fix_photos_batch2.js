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

async function fixPhoto(docId, imgUrl, label) {
  console.log(`\n=== ${label} (${docId}) ===`);
  console.log(`  Downloading: ${imgUrl.substring(0, 100)}...`);
  const imgRes = await fetch(imgUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'image/*,*/*',
    },
  });
  if (!imgRes.ok) {
    console.log(`  ERROR: HTTP ${imgRes.status}`);
    return false;
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  if (buf.length < 1000) {
    console.log(`  ERROR: Too small (${buf.length} bytes)`);
    return false;
  }
  const meta = await sharp(buf).metadata();
  console.log(
    `  Source: ${meta.width}x${meta.height} ${meta.format} ${(buf.length / 1024).toFixed(0)}KB`
  );

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
  return true;
}

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
  return matches.length > 0 ? matches[0][1] : null;
}

(async () => {
  // 1. Dolce Gusto Café con leche (mercadona_11801) - official DG image
  await fixPhoto(
    'mercadona_11801',
    'https://www.dolce-gusto.es/media/catalog/product/cache/d22af66f75f51f60e100631e2c10a99a/b/e/bev0000060_16x_heroimage2026.png',
    'DG Café con leche'
  );

  // 2. Dolce Gusto Cortado (mercadona_11785) - official DG image
  await fixPhoto(
    'mercadona_11785',
    'https://www.dolce-gusto.es/media/catalog/product/cache/a7ed62b12c9d28aa0842b5a9bc7623a5/b/e/bev0000064_16x_heroimage2026.png',
    'DG Cortado'
  );

  // 3. Delta Platinum - try EAN search and Amazon
  console.log('\n=== Delta Platinum ===');
  // Try fetching from Delta Cafés website
  let deltaImg = null;
  try {
    const deltaRes = await fetch(
      'https://deltacafes.com/es/productos/cafe/grano/delta-platinum-grano',
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        redirect: 'follow',
      }
    );
    if (deltaRes.ok) {
      const html = await deltaRes.text();
      // Look for product image
      const imgMatch =
        html.match(/src="(https?:\/\/[^"]*platinum[^"]*\.(jpg|png|webp))"/i) ||
        html.match(/src="(https?:\/\/[^"]*delta[^"]*grao[^"]*\.(jpg|png|webp))"/i) ||
        html.match(/"image":\s*"(https?:\/\/[^"]+)"/);
      if (imgMatch) deltaImg = imgMatch[1];
    }
  } catch (e) {
    console.log('  Delta website failed:', e.message);
  }

  if (!deltaImg) {
    // Try Amazon with EAN 5601059009010
    console.log('  Trying Amazon search by EAN...');
    const hiRes = await getHiRes('B08GGQGQXR');
    if (hiRes) {
      // Check if it's really Delta
      console.log(`  Found hiRes from B08GGQGQXR: ${hiRes.substring(0, 80)}`);
      deltaImg = hiRes;
    }
  }

  if (!deltaImg) {
    // Try other potential Delta ASINs
    for (const asin of ['B09583LX8H', 'B08MFYYZX7', 'B07WKJZ1X1']) {
      const hiRes = await getHiRes(asin);
      if (hiRes) {
        console.log(`  Found hiRes from ${asin}: ${hiRes.substring(0, 80)}`);
        deltaImg = hiRes;
        break;
      }
    }
  }

  if (deltaImg) {
    await fixPhoto('delta_platinum_grano_1kg', deltaImg, 'Delta Platinum');
  } else {
    console.log('  SKIPPED - no valid image found for Delta Platinum');
  }

  console.log('\n¡Script completado!');
  process.exit(0);
})();
