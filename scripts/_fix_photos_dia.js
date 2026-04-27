#!/usr/bin/env node
/**
 * _fix_photos_dia.js – Fix missing photos for Dia products
 * Downloads images from dia.es product_images CDN
 * Pattern: https://www.dia.es/product_images/{pid}/{pid}_ISO_0_ES.jpg
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

// Mapping: our doc ID → Dia product ID (for image URL)
const DIA_PRODUCTS = [
  // Nespresso capsules
  { docId: 'dia_capsulas_colombia_nesp_10', pid: '273828' },
  { docId: 'dia_capsulas_descaf_nesp_10', pid: '273825' },
  { docId: 'dia_capsulas_espresso_nesp_10', pid: '273822' }, // ristretto = closest to espresso
  { docId: 'dia_capsulas_intenso_nesp_10', pid: '273821' },
  { docId: 'dia_capsulas_intenso_nesp_20', pid: '273821' },
  { docId: 'dia_capsulas_lungo_nesp_10', pid: '273824' }, // fortissimo = closest to lungo
  // Dolce Gusto capsules
  { docId: 'dia_capsulas_descaf_dg_16', pid: '308672' },
  { docId: 'dia_capsulas_espresso_dg_16', pid: '308473' },
  { docId: 'dia_capsulas_intenso_dg_16', pid: '308473' },
  // Grano
  { docId: 'dia_grano_descaf_500', pid: '306436' },
  { docId: 'dia_grano_mezcla_1kg', pid: '306435' }, // 500g, closest
  { docId: 'dia_grano_natural_1kg', pid: '120827' }, // 500g, closest
  { docId: 'dia_grano_natural_500', pid: '120827' },
  // Molido
  { docId: 'dia_molido_colombia_250', pid: '6077' },
  { docId: 'dia_molido_descaf_250', pid: '1160' },
  { docId: 'dia_molido_mezcla_250', pid: '120826' },
  { docId: 'dia_molido_natural_250', pid: '218159' },
  { docId: 'dia_molido_natural_500', pid: '218159' },
  // Soluble
  { docId: 'dia_soluble_descaf_200', pid: '230' },
  { docId: 'dia_soluble_natural_200', pid: '34615' },
];

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    const get = (u) =>
      https
        .get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
            return get(res.headers.location);
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve({ buf: Buffer.concat(chunks), status: res.statusCode }));
          res.on('error', reject);
        })
        .on('error', reject);
    get(url);
  });
}

async function uploadPhoto(docId, imgUrl) {
  const { buf, status } = await fetchBuf(imgUrl);
  if (status !== 200 || buf.length < 1000) {
    console.log(`  SKIP: status=${status}, size=${buf.length}b`);
    return null;
  }
  const out = await sharp(buf)
    .resize(800, 800, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(out, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

function photoFields(url) {
  return {
    fotoUrl: url,
    foto: url,
    imageUrl: url,
    officialPhoto: url,
    bestPhoto: url,
    imagenUrl: url,
    photos: { selected: url, original: url, bgRemoved: url },
  };
}

(async () => {
  let ok = 0,
    skip = 0,
    errors = 0;
  for (const { docId, pid } of DIA_PRODUCTS) {
    const imgUrl = `https://www.dia.es/product_images/${pid}/${pid}_ISO_0_ES.jpg`;
    console.log(`\n${docId} → pid:${pid}`);
    try {
      const photoUrl = await uploadPhoto(docId, imgUrl);
      if (photoUrl) {
        await db
          .collection('cafes')
          .doc(docId)
          .update({
            ...photoFields(photoUrl),
            updatedAt: new Date().toISOString(),
          });
        ok++;
        console.log(`  OK`);
      } else {
        skip++;
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
      errors++;
    }
  }
  console.log('\n' + '='.repeat(50));
  console.log(`Dia: OK=${ok}, Skip=${skip}, Errors=${errors}`);
  console.log('='.repeat(50));
  process.exit(0);
})();
