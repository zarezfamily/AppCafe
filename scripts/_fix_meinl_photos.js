#!/usr/bin/env node
/**
 * Fix Julius Meinl photos - replace cup images with real product package images
 * Uses the actual product images found in the HTML (not og:image which shows RED-CUP)
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
          return fetchBuf(res.headers.location).then(resolve, reject);
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function processAndUpload(docId, url) {
  const buf = await fetchBuf(url);
  const processed = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(processed, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

const M = 'https://juliusmeinl.com/getmedia';

// Real product package images (not the RED-CUP)
// Bio Melange & Espresso Moka already have correct images, skip them
// Capsules already have correct images from the capsules listing page, skip them
const fixes = [
  // BEANS - Vienna Line
  {
    id: 'jm_beans_caffe_crema_vienna',
    img: `${M}/fbc89d4d-ab94-4932-b2df-e94f5e74cb7f/9971799717_VRL_Crema_1000g_Front-400x750px.png?maxSideSize=1200`,
  },
  {
    id: 'jm_beans_espresso_vienna',
    img: `${M}/f1fb3fa7-654e-4c04-b665-6838de5b94ac/9533095338_JM-VRL-Espresso-1000G-BEANS_Front-400x750px.png?maxSideSize=1200`,
  },
  {
    id: 'jm_beans_melange_vienna',
    img: `${M}/de39ec5d-e5a9-48a0-a4cc-3ffcd0491b65/9533195339_JM-VRL-Melange-1000G-BEANS_Front-400x750px.png?maxSideSize=1200`,
  },
  // BEANS - Premium
  {
    id: 'jm_beans_espresso_arabica',
    img: `${M}/b61cd09a-66c5-4f1e-afd0-fab4de74fbd4/8953289905_JM-PR-COLL-Espresso-Arabica-1000G-BEANS_Front-400x750px.png?maxSideSize=1200`,
  },
  {
    id: 'jm_beans_caffe_crema_premium',
    img: `${M}/b3fa0599-6cfe-481c-9505-f9a4c4a40048/8953389906_JM-PR-COLL-Caffe-Crema-1000G-BEANS_Front-400x750px.png?maxSideSize=1200`,
  },
  // BEANS - Trend
  {
    id: 'jm_beans_espresso_classico',
    img: `${M}/dd979dbf-c30f-4c4b-8958-01bcf24d756c/8953489907_JM-TR-COLL-Espresso-Classico-1000G-BEANS_Front-400x750px.png?maxSideSize=1200`,
  },
  {
    id: 'jm_beans_caffe_crema_intenso',
    img: `${M}/68dc9756-bc47-435a-87cb-4e303d51a79a/8953589909_JM-TR-COLL-Caffe-Crema-Intenso-1000G-BEANS_Front-400x750px.png?maxSideSize=1200`,
  },
  // BEANS - Classic
  {
    id: 'jm_beans_prasident_1kg',
    img: `${M}/b5a2fe37-5b4f-48b0-87de-af30b9d7924b/8993389908_JM-CL-COLL-Prasident-1000G-BEANS_Front-400x750px.png?maxSideSize=1200`,
  },
  {
    id: 'jm_beans_jubilaum_1kg',
    img: `${M}/e7d9f0e7-340c-4dcc-84a3-60d8c30ae1d7/9447894479_JM-CL-COLL-Jubilaum-1000G-BEANS_Front-400x750px.png?maxSideSize=1200`,
  },
  // BEANS - Präsident 500g: no product image found on page, try the 1kg image shape
  // BEANS - Poetry
  {
    id: 'jm_beans_king_hadhramaut',
    img: `${M}/a2398146-a184-499f-9fd5-423dea24a442/JM_KingH3D_BO_250g_2022.png?maxSideSize=1200`,
  },
  // GROUND
  {
    id: 'jm_ground_melange_vienna',
    img: `${M}/4b0da767-8c6a-4b63-898b-26cf87d8bb02/9911420827_JM-VRL-Melange-500g-Softpack-GROUND_Front-400x750px.png?maxSideSize=1200`,
  },
  {
    id: 'jm_ground_espresso_buonaroma',
    img: `${M}/fa5164dc-9de3-45e2-b70f-ea51620d923a/9774497743_JM_Trend_Collection_Buonaroma_220g_Ground_0325_frontal-400x750px.png?maxSideSize=1200`,
  },
  {
    id: 'jm_ground_prasident_500g',
    img: `${M}/03accc44-2d99-43df-9b5d-6c0bba29e733/98735,-2004898715_JM-CL-COLL-Prasident-500G-GROUND_Front-400x750px.png?maxSideSize=1200`,
  },
  {
    id: 'jm_ground_prasident_fine',
    img: `${M}/ebcf9eff-03f4-4283-866d-a6dee84494c0/9774097739_JM_Vienna_Retail_Line_PRAESIDENT_220g_GROUND_0325_frontal-400x750px.png?maxSideSize=1200`,
  },
  {
    id: 'jm_ground_jubilaum_500g',
    img: `${M}/3aefbb40-6aed-4a97-9b34-a0ced60a2026/98733,-2004798716_JM-CL-COLL-Jubilaum-500G-GROUND_Front-400x750px.png?maxSideSize=1200`,
  },
  {
    id: 'jm_ground_jubilaum_fine',
    img: `${M}/640aad00-f924-4a4b-8612-b7dd795c626b/9774297741_JM_Vienna_Retail_Line_JUBILAEUM_220g_GROUND_0325_frontal-400x750px.png?maxSideSize=1200`,
  },
  {
    id: 'jm_ground_fruhstuck',
    img: `${M}/5b068251-cd9b-4e46-9fe1-1262c1be38b5/9911320825_JM-CL-COLL-Fruhstuck-500G-GROUND_Front-400x750px.png?maxSideSize=1200`,
  },
  {
    id: 'jm_ground_king_hadhramaut',
    img: `${M}/7ce22522-8da7-4cf6-a03d-a283742178ce/JM_KingH2022_250g_MK_2022.png?maxSideSize=1200`,
  },
];

async function main() {
  console.log(`=== Fix Julius Meinl photos === (${fixes.length} to fix)\n`);
  let ok = 0,
    fail = 0;
  for (const f of fixes) {
    try {
      const photoUrl = await processAndUpload(f.id, f.img);
      await db
        .collection('cafes')
        .doc(f.id)
        .update({
          fotoUrl: photoUrl,
          foto: photoUrl,
          imageUrl: photoUrl,
          officialPhoto: photoUrl,
          bestPhoto: photoUrl,
          imagenUrl: photoUrl,
          photos: { selected: photoUrl, original: photoUrl, bgRemoved: photoUrl },
          updatedAt: new Date().toISOString(),
        });
      ok++;
      process.stdout.write(`\r  Fixed ${ok}/${fixes.length}`);
    } catch (e) {
      fail++;
      console.log(`\n  ERROR ${f.id}: ${e.message}`);
    }
  }
  console.log(`\n\n=== Done: ${ok} fixed, ${fail} failed ===`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
