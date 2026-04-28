#!/usr/bin/env node
/**
 * _import_brasilia.js – Import Nestlé Brasilia products (5 cafés)
 * Brand: Brasilia (Nestlé Professional) – Spain hostelería
 * Source: nestleprofessional.es
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

const ALL = [
  {
    id: 'brasilia_mezcla_80_20_nectar',
    nombre: 'Brasilia Nectar Tostado Mezcla 80/20 en grano',
    tipo: 'grano',
    blend: true,
    imgUrl:
      'https://www.nestleprofessional.es/sites/default/files/styles/np_product_teaser_2x/public/2022-06/07613287496645_A1L1_s44089615_BRASILIA-NECTAR-80_20-1kg.png',
    url: 'https://www.nestleprofessional.es/cafe-bebidas-hosteleria/cafe-en-grano/cafe-tostado-mezcla-8020-en-grano-brasilia-nectar',
  },
  {
    id: 'brasilia_descafeinado',
    nombre: 'Brasilia Tostado Natural Descafeinado en grano',
    tipo: 'grano',
    descafeinado: true,
    imgUrl:
      'https://www.nestleprofessional.es/sites/default/files/styles/np_product_teaser_2x/public/2022-06/07613287456465_A1L1_s44089613_BRASILIA-Decaf-500g%281%29.png',
    url: 'https://www.nestleprofessional.es/cafe-bebidas-hosteleria/cafe-en-grano/brasilia/cafe-tostado-natural-descafeinado-en-grano-brasilia',
  },
  {
    id: 'brasilia_descafeinado_nectar',
    nombre: 'Brasilia Nectar Tostado Natural Descafeinado en grano',
    tipo: 'grano',
    descafeinado: true,
    imgUrl:
      'https://www.nestleprofessional.es/sites/default/files/styles/np_product_teaser_2x/public/2022-06/07613287496683_A1L1_s44089607_BRASILIA%20NECTAR%20Decaf%20500g.jpg',
    url: 'https://www.nestleprofessional.es/cafe-bebidas-hosteleria/cafe-en-grano/cafe-tostado-natural-descafeinado-en-grano-brasilia-nectar',
  },
  {
    id: 'brasilia_natural',
    nombre: 'Brasilia Tostado Natural en grano',
    tipo: 'grano',
    imgUrl:
      'https://www.nestleprofessional.es/sites/default/files/styles/np_product_teaser_2x/public/2022-06/07613287456502_A1L1_s44089611_BRASILIA-Natural-1kg.png',
    url: 'https://www.nestleprofessional.es/cafe-bebidas-hosteleria/cafe-en-grano/cafe-tostado-natural-en-grano-brasilia',
  },
  {
    id: 'brasilia_mezcla_80_20',
    nombre: 'Brasilia Tostado Mezcla 80/20 en grano',
    tipo: 'grano',
    blend: true,
    imgUrl:
      'https://www.nestleprofessional.es/sites/default/files/styles/np_product_teaser_2x/public/2022-06/07613287456526_A1L1_s44089603_BRASILIA-80-20-1kg.png',
    url: 'https://www.nestleprofessional.es/cafe-bebidas-hosteleria/cafe-en-grano/cafe-tostado-mezcla-8020-en-grano-brasilia',
  },
];

function httpGet(url, wantBuf = false) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,image/webp,*/*;q=0.8',
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
  const { data: buf } = await httpGet(imgUrl, true);
  if (buf.length < 1000) return null;
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
  console.log(`\n=== Importing ${ALL.length} Brasilia (Nestlé Professional) products ===\n`);
  let created = 0,
    skipped = 0,
    photos = 0,
    errors = 0;

  for (const p of ALL) {
    const docId = p.id;
    const existing = await db.collection('cafes').doc(docId).get();
    if (existing.exists) {
      console.log(`SKIP: ${docId}`);
      skipped++;
      continue;
    }

    process.stdout.write(`CREATE: ${docId}`);

    const data = {
      nombre: p.nombre,
      marca: 'Brasilia',
      roaster: 'Nestlé Professional',
      tipo: p.tipo,
      tipoProducto: 'grano',
      formato: '1kg',
      tamano: '1kg',
      fuente: 'nestleprofessional.es',
      fuentePais: 'ES',
      fuenteUrl: p.url,
      fecha: new Date().toISOString(),
      puntuacion: 0,
      votos: 0,
      status: 'approved',
      reviewStatus: 'approved',
      appVisible: true,
      updatedAt: new Date().toISOString(),
    };
    if (p.descafeinado) data.descafeinado = true;
    if (p.blend) data.blend = true;

    if (p.imgUrl) {
      try {
        const photoUrl = await uploadPhoto(docId, p.imgUrl);
        if (photoUrl) {
          Object.assign(data, photoFields(photoUrl));
          photos++;
        }
      } catch (e) {
        console.log(` Photo ERR: ${e.message}`);
        errors++;
      }
    }

    try {
      await db.collection('cafes').doc(docId).set(data);
      created++;
      console.log(` → ${p.imgUrl ? '📸' : '⚠️'}`);
    } catch (e) {
      console.log(` DB ERR: ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Created: ${created} | Skipped: ${skipped} | Photos: ${photos} | Errors: ${errors}`);
  process.exit(0);
})();
