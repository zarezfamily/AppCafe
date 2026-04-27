#!/usr/bin/env node
/**
 * _import_new_brands_dg.js – April 2026
 * Imports new DG brands from kaffek.es (all Dolce Gusto unless noted):
 *   - Mars (2): Chocolate caliente + Celebrations
 *   - Milky Way (1): Chocolate caliente
 *   - Snickers (1): Chocolate caliente
 *   - Twix (1): Chocolate caliente
 *   - Galaxy (3): Chocolate caliente + Caramel + Orange
 *   - Looney Tunes (4): Daffy's Vanilla, Tweety's Banana, Sylvester's Strawberry, Bugs' Chocolate
 *   - Foodness (6): Unicorn Latte, Mermaid Latte, Matcha Latte DG, Matcha NCC, Jengibre+Limón, Pomegranate
 *   - Buondi (2): Original 16 + Original 30
 *   - Banania (1): Chocolate caliente
 *   - Benco (1): Chocolate caliente
 *   - Drink Me Chai (2): Dirty Chai Latte + Spiced Chai Latte (only DG capsules)
 * Total: 24 products
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

const ALL = [
  // ═══ MARS (2) ═══
  {
    id: 'mars_dg_chocolate_caliente_8',
    nombre: 'Mars Chocolate caliente 8 cápsulas para Dolce Gusto',
    marca: 'Mars',
    precio: 4.09,
    capsulas: 8,
    sistema: 'Dolce Gusto',
    sabor: 'Chocolate',
    url: 'https://kaffek.es/mars-8-capsulas-dolce-gusto.html',
  },
  {
    id: 'mars_dg_celebrations_8',
    nombre: 'Mars Celebrations chocolates calientes 8 cápsulas para Dolce Gusto',
    marca: 'Mars',
    precio: 4.69,
    capsulas: 8,
    sistema: 'Dolce Gusto',
    sabor: 'Chocolate Surtido',
    url: 'https://kaffek.es/mars-celebrations-dolce-gusto.html',
  },

  // ═══ MILKY WAY (1) ═══
  {
    id: 'milkyway_dg_chocolate_caliente_8',
    nombre: 'Milky Way Chocolate caliente 8 cápsulas para Dolce Gusto',
    marca: 'Milky Way',
    precio: 4.09,
    capsulas: 8,
    sistema: 'Dolce Gusto',
    sabor: 'Chocolate',
    url: 'https://kaffek.es/milky-way-8-capsulas-dolce-gusto.html',
  },

  // ═══ SNICKERS (1) ═══
  {
    id: 'snickers_dg_chocolate_caliente_8',
    nombre: 'Snickers Chocolate caliente 8 cápsulas para Dolce Gusto',
    marca: 'Snickers',
    precio: 3.99,
    capsulas: 8,
    sistema: 'Dolce Gusto',
    sabor: 'Chocolate y Cacahuete',
    url: 'https://kaffek.es/snickers-dolce-gusto.html',
  },

  // ═══ TWIX (1) ═══
  {
    id: 'twix_dg_chocolate_caliente_8',
    nombre: 'Twix Chocolate caliente 8 cápsulas para Dolce Gusto',
    marca: 'Twix',
    precio: 4.09,
    capsulas: 8,
    sistema: 'Dolce Gusto',
    sabor: 'Chocolate y Caramelo',
    url: 'https://kaffek.es/twix-8-capsulas-dolce-gusto.html',
  },

  // ═══ GALAXY (3) ═══
  {
    id: 'galaxy_dg_chocolate_caliente_8',
    nombre: 'Galaxy Chocolate Caliente 8 cápsulas para Dolce Gusto',
    marca: 'Galaxy',
    precio: 5.09,
    capsulas: 8,
    sistema: 'Dolce Gusto',
    sabor: 'Chocolate',
    url: 'https://kaffek.es/chocolate-caliente-galaxy-dolce-gusto.html',
  },
  {
    id: 'galaxy_dg_caramel_8',
    nombre: 'Galaxy Chocolate a caramelo 8 cápsulas para Dolce Gusto',
    marca: 'Galaxy',
    precio: 4.99,
    capsulas: 8,
    sistema: 'Dolce Gusto',
    sabor: 'Chocolate y Caramelo',
    url: 'https://kaffek.es/chocolate-con-caramelo-galaxy-dolce-gusto.html',
  },
  {
    id: 'galaxy_dg_orange_8',
    nombre: 'Galaxy Orange Chocolate Caliente 8 cápsulas para Dolce Gusto',
    marca: 'Galaxy',
    precio: 4.99,
    capsulas: 8,
    sistema: 'Dolce Gusto',
    sabor: 'Chocolate y Naranja',
    url: 'https://kaffek.es/galaxy-orange-dolce-gusto.html',
  },

  // ═══ LOONEY TUNES (4) ═══
  {
    id: 'looneytunes_dg_daffys_vanilla_10',
    nombre: "Looney Tunes Daffy's Vanilla 10 cápsulas para Dolce Gusto",
    marca: 'Looney Tunes',
    precio: 3.49,
    capsulas: 10,
    sistema: 'Dolce Gusto',
    sabor: 'Vainilla',
    url: 'https://kaffek.es/daffys-vanilla-looney-tunes-dolce-gusto.html',
  },
  {
    id: 'looneytunes_dg_tweetys_banana_10',
    nombre: "Looney Tunes Tweety's Banana 10 cápsulas para Dolce Gusto",
    marca: 'Looney Tunes',
    precio: 3.19,
    capsulas: 10,
    sistema: 'Dolce Gusto',
    sabor: 'Plátano',
    url: 'https://kaffek.es/tweetys-banana-looney-tunes-dolce-gusto.html',
  },
  {
    id: 'looneytunes_dg_sylvesters_strawberry_10',
    nombre: "Looney Tunes Sylvester's Strawberry 10 cápsulas para Dolce Gusto",
    marca: 'Looney Tunes',
    precio: 3.49,
    capsulas: 10,
    sistema: 'Dolce Gusto',
    sabor: 'Fresa',
    url: 'https://kaffek.es/sylvesters-strawberry-looney-tunes-dolce-gusto.html',
  },
  {
    id: 'looneytunes_dg_bugs_chocolate_10',
    nombre: "Looney Tunes Bugs' Chocolate 10 cápsulas para Dolce Gusto",
    marca: 'Looney Tunes',
    precio: 3.49,
    capsulas: 10,
    sistema: 'Dolce Gusto',
    sabor: 'Chocolate',
    url: 'https://kaffek.es/bugs-chocolate-looney-tunes-dolce-gusto.html',
  },

  // ═══ FOODNESS (6) ═══
  {
    id: 'foodness_dg_unicorn_latte_10',
    nombre: 'Foodness Unicorn Latte 10 cápsulas para Dolce Gusto',
    marca: 'Foodness',
    precio: 4.19,
    capsulas: 10,
    sistema: 'Dolce Gusto',
    sabor: 'Frutas',
    url: 'https://kaffek.es/unicorn-latte-foodness-dolce-gusto.html',
  },
  {
    id: 'foodness_dg_mermaid_latte_10',
    nombre: 'Foodness Mermaid Latte 10 cápsulas para Dolce Gusto',
    marca: 'Foodness',
    precio: 3.99,
    capsulas: 10,
    sistema: 'Dolce Gusto',
    sabor: 'Frutas del bosque',
    url: 'https://kaffek.es/mermaid-latte-foodness-dolce-gusto.html',
  },
  {
    id: 'foodness_dg_matcha_latte_ginseng_10',
    nombre: 'Foodness Matcha Latte con Ginseng 10 cápsulas para Dolce Gusto',
    marca: 'Foodness',
    precio: 4.09,
    capsulas: 10,
    sistema: 'Dolce Gusto',
    sabor: 'Matcha y Ginseng',
    url: 'https://kaffek.es/matcha-latte-foodness-dolce-gusto.html',
  },
  {
    id: 'foodness_ncc_matcha_latte_ginseng_10',
    nombre: 'Foodness Matcha Latte con Ginseng 10 cápsulas para Nespresso',
    marca: 'Foodness',
    precio: 2.95,
    capsulas: 10,
    sistema: 'Nespresso',
    sabor: 'Matcha y Ginseng',
    url: 'https://kaffek.es/ginseng-matcha-foodness-dolce-gusto.html',
  },
  {
    id: 'foodness_dg_jengibre_limon_10',
    nombre: 'Foodness Té de jengibre y limón 10 cápsulas para Dolce Gusto',
    marca: 'Foodness',
    precio: 3.29,
    capsulas: 10,
    sistema: 'Dolce Gusto',
    sabor: 'Jengibre y Limón',
    url: 'https://kaffek.es/ginger-lemon-tea-foodness-dolce-gusto.html',
  },
  {
    id: 'foodness_dg_pomegranate_mirtelo_10',
    nombre: 'Foodness Té Pomegranate & Mirtelo 10 cápsulas para Dolce Gusto',
    marca: 'Foodness',
    precio: 3.69,
    capsulas: 10,
    sistema: 'Dolce Gusto',
    sabor: 'Granada y Arándano',
    url: 'https://kaffek.es/te-pomegranate-y-mirtelo-foodness-dolce-gusto.html',
  },

  // ═══ BUONDI (2) ═══
  {
    id: 'buondi_dg_original_16',
    nombre: 'Buondi Original 16 cápsulas para Dolce Gusto',
    marca: 'Buondi',
    precio: 3.99,
    capsulas: 16,
    sistema: 'Dolce Gusto',
    url: 'https://kaffek.es/buondi-nescafe-dolce-gusto-16.html',
  },
  {
    id: 'buondi_dg_original_30',
    nombre: 'Buondi Original 30 cápsulas para Dolce Gusto',
    marca: 'Buondi',
    precio: 8.29,
    capsulas: 30,
    sistema: 'Dolce Gusto',
    formato: '30 cápsulas',
    url: 'https://kaffek.es/buondi-nescafe-dolce-gusto-30.html',
  },

  // ═══ BANANIA (1) ═══
  {
    id: 'banania_dg_chocolate_caliente_12',
    nombre: 'Banania Chocolate caliente 12 cápsulas para Dolce Gusto',
    marca: 'Banania',
    precio: 4.79,
    capsulas: 12,
    sistema: 'Dolce Gusto',
    sabor: 'Chocolate',
    url: 'https://kaffek.es/cacao-banania-dolce-gusto.html',
  },

  // ═══ BENCO (1) ═══
  {
    id: 'benco_dg_chocolate_caliente_12',
    nombre: 'Benco Chocolate caliente 12 cápsulas para Dolce Gusto',
    marca: 'Benco',
    precio: 5.19,
    capsulas: 12,
    sistema: 'Dolce Gusto',
    sabor: 'Chocolate',
    url: 'https://kaffek.es/cacao-benco-dolce-gusto.html',
  },

  // ═══ DRINK ME CHAI (2 DG capsules only) ═══
  {
    id: 'drinkme_dg_dirty_chai_latte_8',
    nombre: 'Drink Me Chai Dirty Chai Latte 8 cápsulas para Dolce Gusto',
    marca: 'Drink Me Chai',
    precio: 3.99,
    capsulas: 8,
    sistema: 'Dolce Gusto',
    sabor: 'Chai',
    url: 'https://kaffek.es/dirty-chai-latte-drink-me-chai-dolce-gusto.html',
  },
  {
    id: 'drinkme_dg_spiced_chai_latte_8',
    nombre: 'Drink Me Chai Spiced Chai Latte 8 cápsulas para Dolce Gusto',
    marca: 'Drink Me Chai',
    precio: 4.29,
    capsulas: 8,
    sistema: 'Dolce Gusto',
    sabor: 'Chai Especiado',
    url: 'https://kaffek.es/spiced-chai-latte-drink-me-chai-dolce-gusto.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════
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
  console.log(`\n=== Importing ${ALL.length} products from 10+ new brands ===\n`);
  let created = 0,
    skipped = 0,
    photos = 0,
    errors = 0;
  const byBrand = {};

  for (const p of ALL) {
    if (!byBrand[p.marca]) byBrand[p.marca] = 0;

    const existing = await db.collection('cafes').doc(p.id).get();
    if (existing.exists) {
      console.log(`SKIP: ${p.id} (already exists)`);
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
      tipo: 'capsula',
      tipoProducto: 'capsulas',
      formato: p.formato || `${p.capsulas} cápsulas`,
      tamano: p.formato || `${p.capsulas} cápsulas`,
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
    if (p.descafeinado) data.descafeinado = true;

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
      byBrand[p.marca]++;
      console.log(`  ${p.nombre} → ${p.precio}€`);
    } catch (e) {
      console.log(`  DB ERR: ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Created: ${created} | Skipped: ${skipped} | Photos: ${photos} | Errors: ${errors}`);
  for (const [b, c] of Object.entries(byBrand)) if (c > 0) console.log(`  ${b}: ${c}`);
  process.exit(0);
})();
