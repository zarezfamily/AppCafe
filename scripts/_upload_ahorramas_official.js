#!/usr/bin/env node
/**
 * Upload official Ahorramas photos for Alipende products.
 * Manual mapping from Ahorramas product pages to our Firestore docIds.
 * Only 8 products are available on Ahorramas online (no cápsulas/grano/500g/1kg).
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

// Manual mapping: Ahorramas product page slug → { docId, imageUrl }
// URLs built from the product page visit results
const MANUAL_MAP = [
  {
    docId: 'ahorramas_alipende_molido_natural_250',
    pageUrl: 'https://www.ahorramas.com/cafe-molido-alipende-250g-tueste-natural-48073.html',
    code: '048073',
  },
  {
    docId: 'ahorramas_alipende_molido_mezcla_250',
    pageUrl: 'https://www.ahorramas.com/cafe-molido-alipende-250g-mezcla-50-50-48072.html',
    code: '048072',
  },
  {
    docId: 'ahorramas_alipende_molido_colombia_250',
    pageUrl:
      'https://www.ahorramas.com/cafe-molido-alipende-250g-colombia-tueste-natural-75974.html',
    code: '075974',
  },
  {
    docId: 'ahorramas_alipende_molido_descaf_250',
    pageUrl:
      'https://www.ahorramas.com/cafe-molido-descafeinado-alipende-250g-mezcla-50-50-48074.html',
    code: '048074',
  },
  {
    docId: 'ahorramas_alipende_soluble_descaf_200',
    pageUrl: 'https://www.ahorramas.com/cafe-soluble-alipende-descafeinado-200g-mezcla-46060.html',
    code: '046060',
  },
  {
    docId: 'ahorramas_alipende_soluble_natural_200',
    pageUrl: 'https://www.ahorramas.com/cafe-soluble-alipende-200g-46068.html',
    code: '046068',
  },
];

// Note: Ahorramas also has these but they don't map to our catalog entries:
// - cafe-molido-descafeinado-alipende-250g-tueste-natural-75975 (2nd descaf variant)
// - cafe-molido-alipende-250g-espresso-mezcla-80-20-75976 (espresso mezcla 80/20 - not in our catalog)

async function downloadFromPage(pageUrl) {
  // Fetch the product page HTML and extract the main image URL
  const resp = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'text/html,*/*',
    },
    timeout: 20000,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${pageUrl}`);
  const html = await resp.text();

  // Extract image URL from the HTML
  // Ahorramas uses demandware.static URLs for product images
  // Look for the primary product image in meta tags or img tags
  let imgUrl = null;

  // Method 1: og:image meta tag (usually the main product image)
  const ogMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
  if (ogMatch) {
    imgUrl = ogMatch[1];
  }

  // Method 2: Look for the main product image in the PDP
  if (!imgUrl) {
    const imgMatch = html.match(
      /class="[^"]*primary[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^"]+BFNH_PRD[^"]+)"/
    );
    if (imgMatch) imgUrl = imgMatch[1];
  }

  // Method 3: Any BFNH_PRD image
  if (!imgUrl) {
    const imgMatch = html.match(/<img[^>]+src="([^"]+BFNH_PRD[^"]+)"/);
    if (imgMatch) imgUrl = imgMatch[1];
  }

  if (!imgUrl) throw new Error('No image URL found in page HTML');

  // Ensure high resolution
  if (imgUrl.includes('sw=') || imgUrl.includes('sh=')) {
    imgUrl = imgUrl.replace(/sw=\d+/g, 'sw=2400').replace(/sh=\d+/g, 'sh=2400');
  } else if (!imgUrl.includes('?')) {
    imgUrl += '?sw=2400&sh=2400&sm=fit';
  }

  console.log(`    Image URL: ${imgUrl.substring(0, 100)}...`);

  // Download the image
  const imgResp = await fetch(imgUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'image/*',
      Referer: 'https://www.ahorramas.com/',
    },
    timeout: 20000,
  });
  if (!imgResp.ok) throw new Error(`Image HTTP ${imgResp.status}`);
  const buf = Buffer.from(await imgResp.arrayBuffer());
  console.log(`    Downloaded: ${(buf.length / 1024).toFixed(0)}KB`);

  const meta = await sharp(buf).metadata();
  console.log(`    Source: ${meta.width}x${meta.height} ${meta.format}`);

  return { buf, imgUrl };
}

async function processAndUpload(docId, buf, originalUrl) {
  const processed = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();

  console.log(`    Processed: ${(processed.length / 1024).toFixed(0)}KB PNG`);

  const storagePath = `cafe-photos-nobg/${docId}.png`;
  const file = bucket.file(storagePath);
  try {
    await file.delete();
  } catch {}
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
    'photos.original': originalUrl,
    'photos.bgRemoved': publicUrl,
  });

  return publicUrl;
}

async function main() {
  console.log(`=== Uploading ${MANUAL_MAP.length} official Ahorramas photos ===\n`);
  let ok = 0,
    fail = 0;

  for (const { docId, pageUrl, code } of MANUAL_MAP) {
    const short = docId.replace('ahorramas_alipende_', '');
    console.log(`  [${short}] (code: ${code})`);

    try {
      const { buf, imgUrl } = await downloadFromPage(pageUrl);
      await processAndUpload(docId, buf, imgUrl);
      console.log(`    OK\n`);
      ok++;
    } catch (e) {
      console.log(`    FAIL: ${e.message}\n`);
      fail++;
    }
  }

  console.log(`=== DONE: ${ok} uploaded, ${fail} failed ===`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
