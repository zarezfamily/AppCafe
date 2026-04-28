#!/usr/bin/env node
/**
 * _import_perfectted_kitkat.js – April 2026
 * NEW brands from kaffek.es:
 *   - PerfectTed (3 NCC matcha capsules) – brand new
 *   - KitKat (1 DG) – Nescafé KitKat cocoa drink
 * Total: 4 products
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
  // ═══ PerfectTed – NCC Matcha (3) ═══
  {
    id: 'perfectted_ncc_matcha_ceremonial_10',
    nombre: 'PerfectTed Matcha de grado ceremonial 10 cápsulas para Nespresso',
    marca: 'PerfectTed',
    sistema: 'Nespresso',
    capsulas: 10,
    precio: 5.99,
    sabor: 'Matcha',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/matcha-de-grado-ceremonial-perfectted-nespresso.html',
  },
  {
    id: 'perfectted_ncc_matcha_vainilla_10',
    nombre: 'PerfectTed Matcha vainilla 10 cápsulas para Nespresso',
    marca: 'PerfectTed',
    sistema: 'Nespresso',
    capsulas: 10,
    precio: 5.89,
    sabor: 'Matcha y Vainilla',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/matcha-vainilla-perfectted-nespresso.html',
  },
  {
    id: 'perfectted_ncc_matcha_fresa_10',
    nombre: 'PerfectTed Fresa Matcha 10 cápsulas para Nespresso',
    marca: 'PerfectTed',
    sistema: 'Nespresso',
    capsulas: 10,
    precio: 5.89,
    sabor: 'Matcha y Fresa',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/fresa-matcha-perfectted-nespresso.html',
  },

  // ═══ KitKat – DG (1) ═══
  {
    id: 'kitkat_dg_cocoa_16',
    nombre: 'Nescafé KitKat 16 cápsulas para Dolce Gusto',
    marca: 'KitKat',
    sistema: 'Dolce Gusto',
    capsulas: 16,
    precio: 6.09,
    sabor: 'Chocolate KitKat',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/kit-kat-nestle-dolce-gusto.html',
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

async function discoverImageUrl(productUrl) {
  try {
    const { data: html, status } = await httpGet(productUrl);
    if (status !== 200) return null;
    const m = html.match(
      /https:\/\/kaffekapslen\.media\/media\/catalog\/product\/cache\/[^"'\s]+?-1201\.webp/
    );
    return m ? m[0] : null;
  } catch {
    return null;
  }
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
  console.log(`\n=== Importing ${ALL.length} products (PerfectTed + KitKat) ===\n`);
  let created = 0,
    skipped = 0,
    photos = 0,
    errors = 0;

  for (const p of ALL) {
    const existing = await db.collection('cafes').doc(p.id).get();
    if (existing.exists) {
      console.log(`SKIP: ${p.id}`);
      skipped++;
      continue;
    }

    console.log(`CREATE: ${p.id}`);
    let imgUrl = null;
    try {
      imgUrl = await discoverImageUrl(p.url);
      if (imgUrl) console.log(`  Img: ...${imgUrl.slice(-40)}`);
      else console.log('  No image found');
    } catch (e) {
      console.log(`  Img err: ${e.message}`);
    }

    const data = {
      nombre: p.nombre,
      marca: p.marca,
      roaster: p.marca,
      tipo: p.tipo,
      tipoProducto: p.tipoProducto,
      formato: `${p.capsulas} cápsulas`,
      tamano: `${p.capsulas} cápsulas`,
      capsulas: p.capsulas,
      precio: p.precio,
      sistema: p.sistema,
      compatibilidad: p.sistema,
      fuente: 'KaffeK',
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
    if (p.sabor) data.sabor = p.sabor;

    if (imgUrl) {
      try {
        const photoUrl = await uploadPhoto(p.id, imgUrl);
        if (photoUrl) {
          Object.assign(data, photoFields(photoUrl));
          photos++;
          console.log('  Photo OK');
        }
      } catch (e) {
        console.log(`  Photo ERR: ${e.message}`);
        errors++;
      }
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
