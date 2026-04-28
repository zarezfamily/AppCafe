#!/usr/bin/env node
/**
 * _fix_cafetearte_photos.js – Fix 44 Cafetearte products missing photos
 * Downloads images from cafetearte.es (which are publicly accessible),
 * processes with sharp, uploads to Storage, updates Firestore docs.
 */

const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (admin.apps.length === 0)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

// Hardcoded mapping: docId → cafetearte.es large_default image URL
const PHOTO_MAP = {
  // Natural / Origen
  cafetearte_australia_skybury:
    'https://www.cafetearte.es/7344-large_default/australia-skybury.jpg',
  cafetearte_caracolillo: 'https://www.cafetearte.es/8231-large_default/cafe-caracolillo.jpg',
  cafetearte_colombia_supremo: 'https://www.cafetearte.es/8103-large_default/cafe-colombia.jpg',
  cafetearte_costa_rica_tarrazu: 'https://www.cafetearte.es/8118-large_default/cafe-costa-rica.jpg',
  cafetearte_etiopia_limu: 'https://www.cafetearte.es/8114-large_default/etiopia-limu.jpg',
  cafetearte_guatemala_oro_plus: 'https://www.cafetearte.es/8124-large_default/guatemala.jpg',
  cafetearte_honduras_marcala: 'https://www.cafetearte.es/8134-large_default/cafe-honduras.jpg',
  cafetearte_kenia_aa_cimazul: 'https://www.cafetearte.es/8129-large_default/kenia-cimazul.jpg',
  cafetearte_maragogype: 'https://www.cafetearte.es/8143-large_default/maragogype.jpg',
  cafetearte_republica_dominicana:
    'https://www.cafetearte.es/8138-large_default/republica-dominicana.jpg',

  // De la Casa blends
  cafetearte_de_la_casa_premium: 'https://www.cafetearte.es/8249-large_default/premium.jpg',
  cafetearte_de_la_casa_suave: 'https://www.cafetearte.es/8164-large_default/arabico-suave.jpg',
  cafetearte_de_la_casa_medio: 'https://www.cafetearte.es/8158-large_default/de-la-casa.jpg',
  cafetearte_de_la_casa_intenso: 'https://www.cafetearte.es/8152-large_default/robusta-intenso.jpg',

  // Sabores
  cafetearte_sabor_galleta: 'https://www.cafetearte.es/7872-large_default/cafe-de-galleta.jpg',
  cafetearte_sabor_melocoton: 'https://www.cafetearte.es/7873-large_default/cafe-melocoton.jpg',
  cafetearte_sabor_avellana: 'https://www.cafetearte.es/7867-large_default/cafe-avellana.jpg',
  cafetearte_sabor_canela: 'https://www.cafetearte.es/7870-large_default/cafe-canela.jpg',
  cafetearte_sabor_chocolate: 'https://www.cafetearte.es/8691-large_default/cafe-chocolate.jpg',
  cafetearte_sabor_vainilla: 'https://www.cafetearte.es/8692-large_default/cafe-vainilla.jpg',
  cafetearte_sabor_chocolate_vainilla:
    'https://www.cafetearte.es/8693-large_default/cafe-chocolate-vainilla.jpg',
  cafetearte_sabor_naranja_chocolate:
    'https://www.cafetearte.es/7874-large_default/cafe-naranja.jpg',
  cafetearte_sabor_toffee: 'https://www.cafetearte.es/7875-large_default/cafe-toffee.jpg',
  cafetearte_sabor_chai: 'https://www.cafetearte.es/7869-large_default/cafe-chai.jpg',
  cafetearte_sabor_calabaza: 'https://www.cafetearte.es/8684-large_default/cafe-de-calabaza.jpg',
  cafetearte_sabor_navidad: 'https://www.cafetearte.es/8696-large_default/cafe-navidad.jpg',

  // Descafeinados
  cafetearte_descafeinado: 'https://www.cafetearte.es/8147-large_default/arabico-natural.jpg',
  cafetearte_descafeinado_mexico:
    'https://www.cafetearte.es/8239-large_default/cafe-descafeinado-mexico.jpg',
  cafetearte_descafeinado_galleta:
    'https://www.cafetearte.es/9360-large_default/cafe-descafeinado-galleta.jpg',
  cafetearte_descafeinado_canela: 'https://www.cafetearte.es/8694-large_default/canela.jpg',
  cafetearte_descafeinado_chocolate: 'https://www.cafetearte.es/7876-large_default/chocolate.jpg',
  cafetearte_descafeinado_vainilla: 'https://www.cafetearte.es/8695-large_default/vainilla.jpg',
  cafetearte_descafeinado_avellana: 'https://www.cafetearte.es/7868-large_default/avellana.jpg',

  // Café Verde
  cafetearte_verde_honduras: 'https://www.cafetearte.es/2534-large_default/cafe-verde-honduras.jpg',
  cafetearte_verde_robusta_vietnam:
    'https://www.cafetearte.es/8075-large_default/cafe-verde-robusta-vietnam.jpg',
  cafetearte_verde_costa_rica:
    'https://www.cafetearte.es/4612-large_default/costa-rica-tarrazu.jpg',
  cafetearte_verde_guatemala: 'https://www.cafetearte.es/4613-large_default/guatemala-oro-plus.jpg',
  cafetearte_verde_colombia: 'https://www.cafetearte.es/8064-large_default/colombia-supremo.jpg',
  cafetearte_verde_jamaica:
    'https://www.cafetearte.es/4964-large_default/jamaica-blue-mountain.jpg',

  // Monodosis ESE
  cafetearte_monodosis_natural:
    'https://www.cafetearte.es/3080-large_default/monodosis-natural.jpg',
  cafetearte_monodosis_colombia:
    'https://www.cafetearte.es/3081-large_default/monodosis-colombia.jpg',
  cafetearte_monodosis_jamaica:
    'https://www.cafetearte.es/3082-large_default/monodosis-jamaica-blue-mountain.jpg',
  cafetearte_monodosis_brasil: 'https://www.cafetearte.es/3083-large_default/monodosis-brasil.jpg',
  cafetearte_monodosis_descafeinado: 'https://www.cafetearte.es/3079-large_default/monodosis.jpg',
};

function httpGet(url, wantBuf = false) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
      },
    };
    const get = (o) =>
      https
        .get(o, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const loc = res.headers.location.startsWith('http')
              ? res.headers.location
              : `https://${parsed.hostname}${res.headers.location}`;
            const p2 = new URL(loc);
            return get({
              hostname: p2.hostname,
              path: p2.pathname + p2.search,
              headers: o.headers,
            });
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const buf = Buffer.concat(chunks);
            resolve({ data: wantBuf ? buf : buf.toString(), status: res.statusCode });
          });
          res.on('error', reject);
        })
        .on('error', reject);
    get(opts);
  });
}

async function uploadPhoto(docId, imgUrl) {
  const { data: buf, status } = await httpGet(imgUrl, true);
  if (status !== 200) throw new Error(`HTTP ${status}`);
  if (buf.length < 1000) throw new Error(`Too small: ${buf.length}b`);
  const out = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
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
  const entries = Object.entries(PHOTO_MAP);
  console.log(`\n=== Fixing ${entries.length} Cafetearte photos ===\n`);
  let fixed = 0,
    errors = 0,
    skipped = 0;

  for (const [docId, imgUrl] of entries) {
    process.stdout.write(`${docId}`);

    // Verify doc exists and has no photo
    const doc = await db.collection('cafes').doc(docId).get();
    if (!doc.exists) {
      console.log(' → NOT_FOUND');
      skipped++;
      continue;
    }
    const data = doc.data();
    if (data.fotoUrl || data.foto || data.imageUrl) {
      console.log(' → ALREADY_HAS_PHOTO');
      skipped++;
      continue;
    }

    try {
      const photoUrl = await uploadPhoto(docId, imgUrl);
      await db.collection('cafes').doc(docId).update(photoFields(photoUrl));
      fixed++;
      console.log(' → 📸');
    } catch (e) {
      console.log(` → ❌ ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Fixed: ${fixed} | Skipped: ${skipped} | Errors: ${errors}`);
  process.exit(0);
})();
