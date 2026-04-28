#!/usr/bin/env node
/**
 * _import_ikea.js – April 2026
 * Imports IKEA FLÖJT coffee products (3 products)
 *   - FLÖJT Café molido tueste fuerte 250g
 *   - FLÖJT Café en grano tueste fuerte 250g
 *   - FLÖJT Café en grano espresso mezcla exclusiva 250g
 * All Rainforest Alliance certified, solo tienda física
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

const PRODUCTS = [
  {
    id: 'ikea_flojt_molido_tueste_fuerte_250',
    nombre: 'IKEA FLÖJT Café molido tueste fuerte 250g',
    tipo: 'molido',
    tipoProducto: 'molido',
    formato: '250g',
    tamano: '250g',
    peso: '250g',
    precio: 6.79,
    tueste: 'Fuerte',
    intensidad: 'Alta',
    certificacion: 'Rainforest Alliance',
    url: 'https://www.ikea.com/es/es/p/flojt-cafe-molido-tueste-fuerte-90619479/',
    imgUrl:
      'https://www.ikea.com/es/es/images/products/flojt-cafe-molido-tueste-fuerte__1525499_pe1013950_s5.jpg?f=xl',
  },
  {
    id: 'ikea_flojt_grano_tueste_fuerte_250',
    nombre: 'IKEA FLÖJT Café en grano tueste fuerte 250g',
    tipo: 'grano',
    tipoProducto: 'grano',
    formato: '250g',
    tamano: '250g',
    peso: '250g',
    precio: 6.79,
    tueste: 'Fuerte',
    intensidad: 'Alta',
    certificacion: 'Rainforest Alliance',
    url: 'https://www.ikea.com/es/es/p/flojt-cafe-grano-tueste-fuerte-00619775/',
    imgUrl:
      'https://www.ikea.com/es/es/images/products/flojt-cafe-grano-tueste-fuerte__1525501_pe1013947_s5.jpg?f=xl',
  },
  {
    id: 'ikea_flojt_grano_espresso_mezcla_250',
    nombre: 'IKEA FLÖJT Café en grano espresso mezcla exclusiva 250g',
    tipo: 'grano',
    tipoProducto: 'grano',
    formato: '250g',
    tamano: '250g',
    peso: '250g',
    precio: 6.79,
    tueste: 'Fuerte',
    intensidad: 'Alta',
    certificacion: 'Rainforest Alliance',
    variedad: 'Espresso',
    url: 'https://www.ikea.com/es/es/p/flojt-cafe-grano-espresso-mezcla-exclusiva-60620568/',
    imgUrl:
      'https://www.ikea.com/es/es/images/products/flojt-cafe-grano-espresso-mezcla-exclusiva__1525495_pe1013946_s5.jpg?f=xl',
  },
];

// ─── Helpers ────────────────────────────────────────────────────

function httpGet(url, wantBuf = false) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'image/webp,image/jpeg,image/png,*/*;q=0.8',
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
  if (status !== 200 || buf.length < 1000) return null;
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

// ─── Main ───────────────────────────────────────────────────────

(async () => {
  console.log(`\n=== Importing ${PRODUCTS.length} IKEA FLÖJT coffees ===\n`);
  let created = 0,
    skipped = 0,
    photos = 0,
    errors = 0;

  for (const p of PRODUCTS) {
    const existing = await db.collection('cafes').doc(p.id).get();
    if (existing.exists) {
      console.log(`SKIP: ${p.id}`);
      skipped++;
      continue;
    }

    console.log(`CREATE: ${p.id}`);
    const data = {
      nombre: p.nombre,
      marca: 'IKEA',
      roaster: 'IKEA',
      tipo: p.tipo,
      tipoProducto: p.tipoProducto,
      formato: p.formato,
      tamano: p.tamano,
      peso: p.peso,
      precio: p.precio,
      tueste: p.tueste,
      intensidad: p.intensidad,
      certificacion: p.certificacion,
      fuente: 'IKEA',
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
    if (p.variedad) data.variedad = p.variedad;

    try {
      const photoUrl = await uploadPhoto(p.id, p.imgUrl);
      if (photoUrl) {
        Object.assign(data, photoFields(photoUrl));
        photos++;
        console.log('  Photo OK');
      } else console.log('  No photo');
    } catch (e) {
      console.log(`  Photo ERR: ${e.message}`);
      errors++;
    }

    try {
      await db.collection('cafes').doc(p.id).set(data);
      created++;
      console.log(`  ${p.nombre} → ${p.precio}€`);
    } catch (e) {
      console.log(`  DB ERR: ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Created: ${created} | Skipped: ${skipped} | Photos: ${photos} | Errors: ${errors}`);
  process.exit(0);
})();
