// Fix missing photos for Carrefour products by scraping individual product pages
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

async function processAndUpload(docId, imageUrl) {
  const resp = await fetch(imageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
    timeout: 15000,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const buf = Buffer.from(await resp.arrayBuffer());
  if (buf.length < 2000) throw new Error(`Too small ${buf.length}b`);
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
  return publicUrl;
}

async function scrapeCarrefourImage(url) {
  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'text/html',
    },
    timeout: 15000,
  });
  const html = await resp.text();
  // Find image URLs: static.carrefour.es/hd_510x_/img_pim_food/XXXXX_00_1.jpg
  const matches = [
    ...html.matchAll(/static\.carrefour\.es\/hd_\d+x_\/img_pim_food\/(\d+_00_\d+\.jpg)/g),
  ];
  if (matches.length) return matches[0][1]; // Return image ID
  return null;
}

const missing = [
  {
    id: 'carrefour_capsulas_intenso_dg_16',
    url: 'https://www.carrefour.es/supermercado/cafe-capsulas-intenso-carrefour-extra-compatible-con-dolce-gusto-16-unidades-de-7-g/R-fprod1280761/p',
  },
  {
    id: 'carrefour_capsulas_descaf_dg_30',
    url: 'https://www.carrefour.es/supermercado/cafe-capsulas-descafeinado-al-agua-carrefour-extra-compatible-con-dolce-gusto-30-unidades-de-7-g/R-fprod1280762/p',
  },
  {
    id: 'carrefour_capsulas_descaf_dg_16',
    url: 'https://www.carrefour.es/supermercado/cafe-capsulas-descafeinado-al-agua-carrefour-extra-compatible-con-dolce-gusto-16-unidades-de-7-g/R-fprod1280742/p',
  },
  {
    id: 'carrefour_soluble_colombia_100',
    url: 'https://www.carrefour.es/supermercado/cafe-colombia-soluble-liofilizado-carrefour-extra-100-g/R-VC4AECOMM-676925/p',
  },
  {
    id: 'carrefour_capsulas_descaf_nesp_50',
    url: 'https://www.carrefour.es/supermercado/cafe-descafeinado-en-capsulas-carrefour-extra-compatible-con-nespresso-pack-de-50-unidades-de-52-g/R-540202030/p',
  },
  {
    id: 'carrefour_grano_descaf_1kg',
    url: 'https://www.carrefour.es/supermercado/cafe-grano-descafeinado-carrefour-classic-1-kg/R-VC4AECOMM-675388/p',
  },
  {
    id: 'carrefour_capsulas_extrafuerte_dg_16',
    url: 'https://www.carrefour.es/supermercado/cafe-capsulas-extrafuerte-carrefour-extra-compatible-con-dolce-gusto-16-ud/R-VC4AECOMM-675365/p',
  },
];

async function main() {
  let ok = 0,
    fail = 0;

  for (const { id, url } of missing) {
    console.log(`${id}...`);
    try {
      const imgId = await scrapeCarrefourImage(url);
      if (imgId) {
        console.log(`  Found: ${imgId}`);
        // Try hi-res first
        try {
          await processAndUpload(id, `https://static.carrefour.es/hd_1280x_/img_pim_food/${imgId}`);
          ok++;
          console.log(`  ✅`);
          continue;
        } catch {
          await processAndUpload(id, `https://static.carrefour.es/hd_510x_/img_pim_food/${imgId}`);
          ok++;
          console.log(`  ✅ (510px)`);
          continue;
        }
      }
      console.log(`  ❌ No image found in HTML`);
      fail++;
    } catch (err) {
      console.log(`  ❌ ${err.message}`);
      fail++;
    }
  }

  // Also retry AUCHAN photos from OFF (might be back up)
  console.log('\n=== RETRY AUCHAN PHOTOS ===');
  const auchanDocs = await db.collection('cafes').where('marca', '==', 'AUCHAN').get();
  for (const doc of auchanDocs.docs) {
    const data = doc.data();
    if (data.fotoUrl && data.fotoUrl.includes('storage.googleapis.com')) continue; // Already has photo
    const offImg = data.photos?.original;
    if (offImg && offImg.includes('openfoodfacts')) {
      try {
        await processAndUpload(doc.id, offImg);
        ok++;
        console.log(`  ✅ ${doc.id}`);
      } catch (err) {
        console.log(`  ❌ ${doc.id}: ${err.message.substring(0, 60)}`);
        fail++;
      }
    }
  }

  console.log(`\n=== ${ok} fixed, ${fail} failed ===`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
