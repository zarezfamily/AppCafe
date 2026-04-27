// Fix AUCHAN photos using static.openfoodfacts.org
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

const auchanPhotos = {
  auchan_tradition_250: '324/567/816/9032/front_en.32.400.jpg',
  auchan_espresso_intense_dg: '324/567/815/1648/front_fr.51.400.jpg',
  auchan_fortissimo_nesp: '324/567/809/3870/front_fr.68.400.jpg',
  auchan_soluble_colombia: '841/101/020/6702/front_es.3.400.jpg',
  auchan_descaf_nesp_20: '324/567/809/3764/front_en.24.400.jpg',
  auchan_100_arabica_espresso_250: '324/567/816/9100/front_fr.17.400.jpg',
  auchan_clasico_soluble_200: '843/161/002/1734/front_es.3.400.jpg',
  auchan_cafe_descafeinado: '843/161/002/1697/front_es.3.400.jpg',
  auchan_classic_soluble_50: '324/567/811/5527/front_fr.26.400.jpg',
  auchan_bio_honduras_molido_250: '324/567/772/2085/front_en.18.400.jpg',
  auchan_bio_100_arabica_1kg: '324/567/816/8905/front_en.16.400.jpg',
  auchan_bio_mexico_nesp: '324/567/772/2092/front_en.20.400.jpg',
  auchan_gourmet_bresil_250: '324/567/816/9315/front_en.27.400.jpg',
  auchan_gourmet_ethiopie_250: '324/567/816/9391/front_en.26.400.jpg',
  auchan_gourmet_colombia_250: '324/567/816/9353/front_en.14.400.jpg',
  auchan_gourmet_burundi_250: '324/567/816/9445/front_en.22.400.jpg',
  // Also fix the original AUCHAN entry
  alcampo_561733: null,
};

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

async function main() {
  let ok = 0,
    fail = 0;
  const BASE = 'https://static.openfoodfacts.org/images/products/';

  for (const [docId, imgPath] of Object.entries(auchanPhotos)) {
    if (!imgPath) {
      // Try to get from Alcampo original
      const doc = await db.collection('cafes').doc(docId).get();
      if (doc.exists) {
        const offPhoto = doc.data().officialPhoto || doc.data().imageUrl;
        if (offPhoto && offPhoto.includes('compraonline.alcampo')) {
          try {
            await processAndUpload(docId, offPhoto);
            ok++;
            console.log(`✅ ${docId} (alcampo original)`);
          } catch (err) {
            console.log(`❌ ${docId}: ${err.message.substring(0, 60)}`);
            fail++;
          }
        }
      }
      continue;
    }
    const url = BASE + imgPath;
    try {
      await processAndUpload(docId, url);
      ok++;
      console.log(`✅ ${docId}`);
    } catch (err) {
      console.log(`❌ ${docId}: ${err.message.substring(0, 60)}`);
      fail++;
    }
  }

  console.log(`\n=== ${ok} fixed, ${fail} failed ===`);
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
