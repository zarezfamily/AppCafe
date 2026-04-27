#!/usr/bin/env node
/**
 * _import_sensonocturno_starbucks.js – April 2026
 * Imports from kaffek.es:
 *   - Senso Nocturno (12 DG products) – new brand
 *   - Starbucks NCC (24 products) – expand existing
 *   - Starbucks DG (12 products) – expand existing
 *   - Starbucks Nespresso Pro (3 products) – expand existing
 * Skips products that already exist in Firestore.
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

// ═══════════════════════════════════════════════════════════════
// SENSO NOCTURNO – Dolce Gusto (12)
// ═══════════════════════════════════════════════════════════════
const SENSO_NOCTURNO = [
  {
    id: 'sensonocturno_dg_pistacho_cappuccino_16',
    nombre: 'Senso Nocturno Cappuccino de Pistacho 16 cápsulas para Dolce Gusto',
    precio: 3.69,
    capsulas: 16,
    sabor: 'Pistacho',
    url: 'https://kaffek.es/cappuccino-de-pistacho-senso-nocturno-dolce-gusto.html',
  },
  {
    id: 'sensonocturno_dg_orange_chocolate_16',
    nombre: 'Senso Nocturno Orange Chocolate 16 cápsulas para Dolce Gusto',
    precio: 3.39,
    capsulas: 16,
    sabor: 'Naranja y Chocolate',
    url: 'https://kaffek.es/orange-chocolate-senso-nocturno-dolce-gusto.html',
  },
  {
    id: 'sensonocturno_dg_creme_brulee_16',
    nombre: 'Senso Nocturno Latte Creme Brulee 16 cápsulas para Dolce Gusto',
    precio: 3.59,
    capsulas: 16,
    sabor: 'Crème Brûlée',
    url: 'https://kaffek.es/latte-creme-brulee-senso-nocturno-dolce-gusto.html',
  },
  {
    id: 'sensonocturno_dg_coconut_flat_white_16',
    nombre: 'Senso Nocturno Coconut Heaven Flat White 16 cápsulas para Dolce Gusto',
    precio: 3.59,
    capsulas: 16,
    sabor: 'Coco',
    url: 'https://kaffek.es/coconut-heaven-flat-white-senso-nocturno-dolce-gusto.html',
  },
  {
    id: 'sensonocturno_dg_avellana_cappuccino_16',
    nombre: 'Senso Nocturno Avellana Cappuccino 16 cápsulas para Dolce Gusto',
    precio: 3.89,
    capsulas: 16,
    sabor: 'Avellana',
    url: 'https://kaffek.es/avellana-cappuccino-senso-nocturno-dolce-gusto.html',
  },
  {
    id: 'sensonocturno_dg_vainilla_cappuccino_16',
    nombre: 'Senso Nocturno Vainilla Cappuccino 16 cápsulas para Dolce Gusto',
    precio: 3.89,
    capsulas: 16,
    sabor: 'Vainilla',
    url: 'https://kaffek.es/vainilla-cappuccino-senso-nocturno-dolce-gusto.html',
  },
  {
    id: 'sensonocturno_dg_caramelo_salado_mocha_16',
    nombre: 'Senso Nocturno Caramelo Salado Mocha 16 cápsulas para Dolce Gusto',
    precio: 3.59,
    capsulas: 16,
    sabor: 'Caramelo Salado',
    url: 'https://kaffek.es/caramelo-salado-mocha-senso-nocturno-dolce-gusto.html',
  },
  {
    id: 'sensonocturno_dg_dubai_chocolate_16',
    nombre: 'Senso Nocturno Dubai Chocolate 16 cápsulas para Dolce Gusto',
    precio: 4.49,
    capsulas: 16,
    sabor: 'Chocolate Dubai',
    url: 'https://kaffek.es/dubai-chocolate-senso-nocturno-dolce-gusto.html',
  },
  {
    id: 'sensonocturno_dg_toffee_cappuccino_16',
    nombre: 'Senso Nocturno Toffee Cappuccino 16 cápsulas para Dolce Gusto',
    precio: 3.69,
    capsulas: 16,
    sabor: 'Toffee',
    url: 'https://kaffek.es/toffee-cappuccino-senso-nocturno-dolce-gusto.html',
  },
  {
    id: 'sensonocturno_dg_white_chocolate_latte_16',
    nombre: 'Senso Nocturno White Chocolate Latte 16 cápsulas para Dolce Gusto',
    precio: 3.69,
    capsulas: 16,
    sabor: 'Chocolate Blanco',
    url: 'https://kaffek.es/white-chocolate-latte-senso-nocturno-dolce-gusto.html',
  },
  {
    id: 'sensonocturno_dg_gingerbread_latte_16',
    nombre: 'Senso Nocturno Gingerbread Latte 16 cápsulas para Dolce Gusto',
    precio: 3.49,
    capsulas: 16,
    sabor: 'Pan de Jengibre',
    url: 'https://kaffek.es/gingerbread-latte-senso-nocturno-dolce-gusto.html',
  },
  {
    id: 'sensonocturno_dg_pumpkin_spice_latte_16',
    nombre: 'Senso Nocturno Pumpkin Spice Latte 16 cápsulas para Dolce Gusto',
    precio: 3.49,
    capsulas: 16,
    sabor: 'Pumpkin Spice',
    url: 'https://kaffek.es/pumpkin-spice-latte-senso-nocturno-dolce-gusto.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// STARBUCKS – Nespresso (24)
// ═══════════════════════════════════════════════════════════════
const STARBUCKS_NCC = [
  {
    id: 'starbucks_ncc_espresso_roast_10',
    nombre: 'Starbucks Espresso Roast 10 cápsulas para Nespresso',
    precio: 4.49,
    capsulas: 10,
    url: 'https://kaffek.es/espresso-roast-starbucks-nespresso.html',
  },
  {
    id: 'starbucks_ncc_espresso_roast_18',
    nombre: 'Starbucks Espresso Roast 18 cápsulas para Nespresso',
    precio: 6.29,
    capsulas: 18,
    formato: '18 cápsulas',
    url: 'https://kaffek.es/espresso-roast-18-capsulas-starbucks-nespresso.html',
  },
  {
    id: 'starbucks_ncc_espresso_roast_36',
    nombre: 'Starbucks Espresso Roast 36 cápsulas para Nespresso',
    precio: 10.89,
    capsulas: 36,
    formato: '36 cápsulas',
    url: 'https://kaffek.es/espresso-roast-starbucks-nespresso-36.html',
  },
  {
    id: 'starbucks_ncc_blonde_espresso_10',
    nombre: 'Starbucks Blonde Espresso Roast 10 cápsulas para Nespresso',
    precio: 4.19,
    capsulas: 10,
    url: 'https://kaffek.es/blonde-espresso-roast-starbucks-nespresso.html',
  },
  {
    id: 'starbucks_ncc_blonde_espresso_18',
    nombre: 'Starbucks Blonde Espresso Roast 18 cápsulas para Nespresso',
    precio: 6.29,
    capsulas: 18,
    formato: '18 cápsulas',
    url: 'https://kaffek.es/blonde-espresso-roast-18-nespresso.html',
  },
  {
    id: 'starbucks_ncc_blonde_espresso_36',
    nombre: 'Starbucks Blonde Espresso Roast 36 cápsulas para Nespresso',
    precio: 13.19,
    capsulas: 36,
    formato: '36 cápsulas',
    url: 'https://kaffek.es/blonde-espresso-roast-starbucks-nespresso-36.html',
  },
  {
    id: 'starbucks_ncc_colombia_10',
    nombre: 'Starbucks Colombia 10 cápsulas para Nespresso',
    precio: 4.49,
    capsulas: 10,
    url: 'https://kaffek.es/colombia-starbucks-nespresso.html',
  },
  {
    id: 'starbucks_ncc_colombia_18',
    nombre: 'Starbucks Colombia 18 cápsulas para Nespresso',
    precio: 6.39,
    capsulas: 18,
    formato: '18 cápsulas',
    url: 'https://kaffek.es/colombia-starbucks-18-nespresso.html',
  },
  {
    id: 'starbucks_ncc_colombia_36',
    nombre: 'Starbucks Colombia 36 cápsulas para Nespresso',
    precio: 11.59,
    capsulas: 36,
    formato: '36 cápsulas',
    url: 'https://kaffek.es/colombia-starbucks-nespresso-36.html',
  },
  {
    id: 'starbucks_ncc_lungo_house_blend_10',
    nombre: 'Starbucks Lungo House Blend 10 cápsulas para Nespresso',
    precio: 4.09,
    capsulas: 10,
    url: 'https://kaffek.es/lungo-house-blend-starbucks-nespresso.html',
  },
  {
    id: 'starbucks_ncc_lungo_house_blend_18',
    nombre: 'Starbucks Lungo House Blend 18 cápsulas para Nespresso',
    precio: 6.29,
    capsulas: 18,
    formato: '18 cápsulas',
    url: 'https://kaffek.es/lungo-house-blend-18-capsulas-starbucks-nespresso.html',
  },
  {
    id: 'starbucks_ncc_lungo_house_blend_36',
    nombre: 'Starbucks Lungo House Blend 36 cápsulas para Nespresso',
    precio: 11.49,
    capsulas: 36,
    formato: '36 cápsulas',
    url: 'https://kaffek.es/lungo-house-blend-starbucks-nespresso-36.html',
  },
  {
    id: 'starbucks_ncc_pike_place_10',
    nombre: 'Starbucks Pike Place Roast 10 cápsulas para Nespresso',
    precio: 3.69,
    capsulas: 10,
    url: 'https://kaffek.es/lungo-pike-place-roast-starbucks-nespresso.html',
  },
  {
    id: 'starbucks_ncc_breakfast_blend_10',
    nombre: 'Starbucks Breakfast Blend 10 cápsulas para Nespresso',
    precio: 3.69,
    capsulas: 10,
    url: 'https://kaffek.es/breakfast-blend-starbucks-nespresso.html',
  },
  {
    id: 'starbucks_ncc_sunny_day_10',
    nombre: 'Starbucks Sunny Day Blend 10 cápsulas para Nespresso',
    precio: 3.69,
    capsulas: 10,
    url: 'https://kaffek.es/lungo-sunny-day-starbucks-nespresso.html',
  },
  {
    id: 'starbucks_ncc_italian_style_10',
    nombre: 'Starbucks Italian Style Roast 10 cápsulas para Nespresso',
    precio: 3.69,
    capsulas: 10,
    url: 'https://kaffek.es/italian-style-roast-espresso-starbucks-nespresso.html',
  },
  {
    id: 'starbucks_ncc_descaf_espresso_10',
    nombre: 'Starbucks Descafeinado Espresso Roast 10 cápsulas para Nespresso',
    precio: 3.89,
    capsulas: 10,
    descafeinado: true,
    url: 'https://kaffek.es/descafeinado-espresso-roast-starbucks-nespresso.html',
  },
  {
    id: 'starbucks_ncc_blonde_descaf_10',
    nombre: 'Starbucks Blonde Espresso Roast Descafeinado 10 cápsulas para Nespresso',
    precio: 3.69,
    capsulas: 10,
    descafeinado: true,
    url: 'https://kaffek.es/blonde-espresso-decaf-starbucks-nespresso.html',
  },
  {
    id: 'starbucks_ncc_caffe_verona_10',
    nombre: 'Starbucks Caffè Verona Ristretto 10 cápsulas para Nespresso',
    precio: 4.69,
    capsulas: 10,
    url: 'https://kaffek.es/caffe-verona-ristretto-starbucks-nespresso.html',
  },
  {
    id: 'starbucks_ncc_caramel_10',
    nombre: 'Starbucks Caramel 10 cápsulas para Nespresso',
    precio: 4.79,
    capsulas: 10,
    sabor: 'Caramelo',
    url: 'https://kaffek.es/caramel-starbucks-nespresso.html',
  },
  {
    id: 'starbucks_ncc_vanilla_10',
    nombre: 'Starbucks Vanilla 10 cápsulas para Nespresso',
    precio: 4.19,
    capsulas: 10,
    sabor: 'Vainilla',
    url: 'https://kaffek.es/vanilla-starbucks-nespresso.html',
  },
  {
    id: 'starbucks_ncc_toffee_nut_10',
    nombre: 'Starbucks Toffee Nut 10 cápsulas para Nespresso',
    precio: 3.89,
    capsulas: 10,
    sabor: 'Toffee',
    url: 'https://kaffek.es/toffee-nut-starbucks-nespresso.html',
  },
  {
    id: 'starbucks_ncc_chocolate_avellana_10',
    nombre: 'Starbucks Chocolate Avellana 10 cápsulas para Nespresso',
    precio: 3.89,
    capsulas: 10,
    sabor: 'Chocolate y Avellana',
    url: 'https://kaffek.es/chocolate-avellana-starbucks-nespresso-10.html',
  },
  {
    id: 'starbucks_ncc_ristretto_shot_10',
    nombre: 'Starbucks Ristretto Shot 10 cápsulas para Nespresso',
    precio: 3.69,
    capsulas: 10,
    url: 'https://kaffek.es/ristretto-shot-starbucks-nespresso.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// STARBUCKS – Dolce Gusto (12)
// ═══════════════════════════════════════════════════════════════
const STARBUCKS_DG = [
  {
    id: 'starbucks_dg_cappuccino_12',
    nombre: 'Starbucks Cappuccino 12 cápsulas para Dolce Gusto',
    precio: 5.39,
    capsulas: 12,
    url: 'https://kaffek.es/cappuccino-starbucks-dolce-gusto.html',
  },
  {
    id: 'starbucks_dg_caramel_macchiato_12',
    nombre: 'Starbucks Caramel Macchiato 12 cápsulas para Dolce Gusto',
    precio: 4.49,
    capsulas: 12,
    sabor: 'Caramelo',
    url: 'https://kaffek.es/caramel-macchiato-starbucks-dolce-gusto.html',
  },
  {
    id: 'starbucks_dg_caffe_latte_12',
    nombre: 'Starbucks Caffè Latte 12 cápsulas para Dolce Gusto',
    precio: 4.59,
    capsulas: 12,
    url: 'https://kaffek.es/caffe-latte-starbucks-dolce-gusto.html',
  },
  {
    id: 'starbucks_dg_white_mocha_12',
    nombre: 'Starbucks White Mocha 12 cápsulas para Dolce Gusto',
    precio: 5.19,
    capsulas: 12,
    sabor: 'White Mocha',
    url: 'https://kaffek.es/white-mocha-starbucks-dolce-gusto.html',
  },
  {
    id: 'starbucks_dg_toffee_nut_latte_12',
    nombre: 'Starbucks Toffee Nut Latte 12 cápsulas para Dolce Gusto',
    precio: 5.79,
    capsulas: 12,
    sabor: 'Toffee',
    url: 'https://kaffek.es/toffee-nut-latte-starbucks-dolce-gusto.html',
  },
  {
    id: 'starbucks_dg_pumpkin_spice_latte_12',
    nombre: 'Starbucks Pumpkin Spice Latte 12 cápsulas para Dolce Gusto',
    precio: 3.69,
    capsulas: 12,
    sabor: 'Pumpkin Spice',
    url: 'https://kaffek.es/pumpkin-spice-latte-starbucks-dolce-gusto.html',
  },
  {
    id: 'starbucks_dg_vanilla_macchiato_12',
    nombre: 'Starbucks Madagascar Vanilla Macchiato 12 cápsulas para Dolce Gusto',
    precio: 4.49,
    capsulas: 12,
    sabor: 'Vainilla',
    url: 'https://kaffek.es/vanilla-macchiato-madagascar-starbucks-dolce-gusto.html',
  },
  {
    id: 'starbucks_dg_grande_house_blend_12',
    nombre: 'Starbucks Grande House Blend 12 cápsulas para Dolce Gusto',
    precio: 4.59,
    capsulas: 12,
    url: 'https://kaffek.es/grande-house-blend-starbucks-dolce-gusto.html',
  },
  {
    id: 'starbucks_dg_espresso_roast_12',
    nombre: 'Starbucks Espresso Roast 12 cápsulas para Dolce Gusto',
    precio: 4.39,
    capsulas: 12,
    url: 'https://kaffek.es/espresso-starbucks-dolce-gusto.html',
  },
  {
    id: 'starbucks_dg_colombia_espresso_12',
    nombre: 'Starbucks Colombia Espresso 12 cápsulas para Dolce Gusto',
    precio: 5.09,
    capsulas: 12,
    url: 'https://kaffek.es/colombia-espresso-starbucks-dolce-gusto.html',
  },
  {
    id: 'starbucks_dg_hazelnut_macchiato_12',
    nombre: 'Starbucks Hazelnut Macchiato 12 cápsulas para Dolce Gusto',
    precio: 4.39,
    capsulas: 12,
    sabor: 'Avellana',
    url: 'https://kaffek.es/hazelnut-macchiato-starbucks-dolce-gusto.html',
  },
  {
    id: 'starbucks_dg_latte_macchiato_12',
    nombre: 'Starbucks Latte Macchiato 12 cápsulas para Dolce Gusto',
    precio: 5.19,
    capsulas: 12,
    url: 'https://kaffek.es/latte-macchiato-starbucks-dolce-gusto.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// STARBUCKS – Nespresso Pro (3)
// ═══════════════════════════════════════════════════════════════
const STARBUCKS_PRO = [
  {
    id: 'starbucks_pro_espresso_roast_50',
    nombre: 'Starbucks Espresso Roast 50 cápsulas para Nespresso Pro',
    precio: 23.69,
    capsulas: 50,
    formato: '50 cápsulas',
    url: 'https://kaffek.es/espresso-roast-starbucks-nes-pro.html',
    sist: 'Nespresso Pro',
  },
  {
    id: 'starbucks_pro_blonde_espresso_50',
    nombre: 'Starbucks Blonde Espresso Roast 50 cápsulas para Nespresso Pro',
    precio: 23.69,
    capsulas: 50,
    formato: '50 cápsulas',
    url: 'https://kaffek.es/blonde-roast-starbucks-nes-pro.html',
    sist: 'Nespresso Pro',
  },
  {
    id: 'starbucks_pro_house_blend_50',
    nombre: 'Starbucks House Blend 50 cápsulas para Nespresso Pro',
    precio: 23.69,
    capsulas: 50,
    formato: '50 cápsulas',
    url: 'https://kaffek.es/house-blend-starbucks-nespresso-pro.html',
    sist: 'Nespresso Pro',
  },
];

// ═══════════════════════════════════════════════════════════════
// Build unified list
// ═══════════════════════════════════════════════════════════════
function withMeta(list, marca, defSistema) {
  return list.map((p) => ({
    ...p,
    marca,
    sistema: p.sist || defSistema,
    compatibilidad: p.sist || defSistema,
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: p.formato || `${p.capsulas || 10} cápsulas`,
    tamano: p.formato || `${p.capsulas || 10} cápsulas`,
    capsulas: p.capsulas || 10,
    descafeinado: p.descafeinado || false,
  }));
}

const ALL = [
  ...withMeta(SENSO_NOCTURNO, 'Senso Nocturno', 'Dolce Gusto'),
  ...withMeta(STARBUCKS_NCC, 'Starbucks', 'Nespresso'),
  ...withMeta(STARBUCKS_DG, 'Starbucks', 'Dolce Gusto'),
  ...withMeta(STARBUCKS_PRO, 'Starbucks', null),
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

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════
(async () => {
  console.log(`\n=== Importing up to ${ALL.length} products (with exists check) ===\n`);
  let created = 0,
    skipped = 0,
    photos = 0,
    errors = 0;
  const byBrand = {};

  for (const p of ALL) {
    if (!byBrand[p.marca]) byBrand[p.marca] = 0;

    // Check if already exists
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
      tipo: p.tipo,
      tipoProducto: p.tipoProducto,
      formato: p.formato,
      tamano: p.tamano,
      capsulas: p.capsulas,
      precio: p.precio,
      sistema: p.sistema,
      compatibilidad: p.compatibilidad,
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
