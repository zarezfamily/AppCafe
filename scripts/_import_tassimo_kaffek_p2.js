#!/usr/bin/env node
/**
 * _import_tassimo_kaffek_p2.js – April 2026
 * 1) Create NEW Tassimo products from page 2
 * 2) Fix photos for 9 products from batch 1 that had wrong URLs (⚠️)
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

// ═══ NEW products from page 2 ═══
const NEW_PRODUCTS = [
  {
    id: 'coffeeshop_tassimo_cappuccino_intenso_16',
    nombre: 'Coffee Shop Selections Cappuccino Intenso 16 cápsulas para Tassimo',
    marca: 'Coffee Shop Selections',
    capsulas: 16,
    precio: 6.99,
    url: 'https://kaffek.es/cappuccino-intenso-coffee-shop-selections-tassimo.html',
  },
  {
    id: 'marcilla_tassimo_cafe_largo_16',
    nombre: 'Marcilla Café Largo 16 cápsulas para Tassimo',
    marca: 'Marcilla',
    capsulas: 16,
    precio: 6.29,
    url: 'https://kaffek.es/cafe-largo-marcilla-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_kronung_16',
    nombre: 'Jacobs Krönung 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 5.39,
    url: 'https://kaffek.es/kronung-jacobs-tassimo.html',
  },
  {
    id: 'teatime_tassimo_te_verde_menta_16',
    nombre: 'Tea Time Té verde y menta 16 cápsulas para Tassimo',
    marca: 'Tea Time',
    capsulas: 16,
    precio: 7.29,
    sabor: 'Menta',
    url: 'https://kaffek.es/green-tea-mint-twinings-tassimo.html',
  },
  {
    id: 'lor_tassimo_petit_dejeuner_24',
    nombre: "L'OR Petit Déjeuner Classique 24 cápsulas para Tassimo",
    marca: "L'OR",
    capsulas: 24,
    precio: 8.29,
    url: 'https://kaffek.es/petit-dejeuner-classique-lor-tassimo-2508.html',
  },
  {
    id: 'jacobs_tassimo_monarch_16',
    nombre: 'Jacobs Monarch 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 5.49,
    url: 'https://kaffek.es/monarch-jacobs-tassimo.html',
  },
];

// ═══ Fix photo URLs for batch 1 ⚠️ products ═══
const FIX_PHOTOS = [
  {
    id: 'lor_tassimo_latte_macchiato_16',
    url: 'https://kaffek.es/latte-macchiato-lor-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_crema_intenso_16',
    url: 'https://kaffek.es/caffe-crema-intenso-jacobs-tassimo.html',
  },
  { id: 'jacobs_tassimo_flat_white_16', url: 'https://kaffek.es/flat-white-jacobs-tassimo.html' },
  {
    id: 'marcilla_tassimo_espresso_16',
    url: 'https://kaffek.es/espresso-marcilla-tassimo-2504.html',
  },
  { id: 'marcilla_tassimo_largo_16', url: 'https://kaffek.es/largo-marcilla-tassimo.html' },
  { id: 'costa_tassimo_americano_16', url: 'https://kaffek.es/americano-costa-tassimo-12.html' },
  {
    id: 'kenco_tassimo_americano_grande_xl_16',
    url: 'https://kaffek.es/americano-grande-xl-kenco-tassimo.html',
  },
  { id: 'kenco_tassimo_colombian_16', url: 'https://kaffek.es/colombian-100-kenco-tassimo.html' },
  {
    id: 'coffeeshop_tassimo_flat_white_16',
    url: 'https://kaffek.es/flat-white-coffee-shop-selections-tassimo.html',
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
    let m = html.match(
      /https:\/\/kaffekapslen\.media\/media\/catalog\/product\/cache\/[^"'\s]+?-1201\.webp/
    );
    if (m) return m[0];
    m = html.match(
      /https:\/\/kaffekapslen\.media\/media\/catalog\/product\/cache\/[^"'\s]+?-0001\.(jpg|webp)/
    );
    if (m) return m[0];
    // fallback: any product image from CDN
    m = html.match(
      /https:\/\/kaffekapslen\.media\/media\/catalog\/product\/cache\/[^"'\s]+?\.(webp|jpg)/
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
  let created = 0,
    fixed = 0,
    skipped = 0,
    errors = 0;

  // ─── Part 1: Create new products from page 2 ───
  console.log(`\n=== Creating ${NEW_PRODUCTS.length} new Tassimo products (page 2) ===\n`);
  for (const p of NEW_PRODUCTS) {
    const existing = await db.collection('cafes').doc(p.id).get();
    if (existing.exists) {
      console.log(`SKIP: ${p.id}`);
      skipped++;
      continue;
    }

    process.stdout.write(`CREATE: ${p.id}`);
    let imgUrl = null;
    try {
      imgUrl = await discoverImageUrl(p.url);
    } catch {}

    const data = {
      nombre: p.nombre,
      marca: p.marca,
      roaster: p.marca,
      tipo: 'capsula',
      tipoProducto: 'capsulas',
      formato: `${p.capsulas} cápsulas`,
      tamano: `${p.capsulas} cápsulas`,
      capsulas: p.capsulas,
      precio: p.precio,
      sistema: 'Tassimo',
      compatibilidad: 'Tassimo',
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
        if (photoUrl) Object.assign(data, photoFields(photoUrl));
      } catch (e) {
        console.log(` Photo ERR: ${e.message}`);
      }
    }

    try {
      await db.collection('cafes').doc(p.id).set(data);
      created++;
      console.log(` → ${p.precio}€ ${imgUrl ? '📸' : '⚠️'}`);
    } catch (e) {
      console.log(` DB ERR: ${e.message}`);
      errors++;
    }
  }

  // ─── Part 2: Fix photos for batch 1 ⚠️ products ───
  console.log(`\n=== Fixing photos for ${FIX_PHOTOS.length} batch-1 products ===\n`);
  for (const p of FIX_PHOTOS) {
    const doc = await db.collection('cafes').doc(p.id).get();
    if (!doc.exists) {
      console.log(`MISS: ${p.id}`);
      continue;
    }
    if (doc.data().fotoUrl) {
      console.log(`OK: ${p.id} (already has photo)`);
      continue;
    }

    process.stdout.write(`FIX: ${p.id}`);
    let imgUrl = null;
    try {
      imgUrl = await discoverImageUrl(p.url);
    } catch {}
    if (!imgUrl) {
      console.log(` → no image found`);
      continue;
    }

    try {
      const photoUrl = await uploadPhoto(p.id, imgUrl);
      if (photoUrl) {
        await db
          .collection('cafes')
          .doc(p.id)
          .update({ ...photoFields(photoUrl), fuenteUrl: p.url });
        fixed++;
        console.log(` → 📸 fixed!`);
      }
    } catch (e) {
      console.log(` ERR: ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(
    `Created: ${created} | Fixed photos: ${fixed} | Skipped: ${skipped} | Errors: ${errors}`
  );
  process.exit(0);
})();
