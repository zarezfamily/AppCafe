#!/usr/bin/env node
/**
 * _import_kaffekapslen.js – April 2026
 * Imports Kaffekapslen capsule products from kaffek.es:
 *   - Nespresso Compatible (19 unique varieties – café diario + premium)
 *   - Nespresso Pro (8 products)
 *   - Dolce Gusto (15 products)
 *   - Senseo (10 products)
 * Total: 52 capsule products. Skips already-existing docs.
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
// KAFFEKAPSLEN – Nespresso Compatible "Café diario" (6)
// ═══════════════════════════════════════════════════════════════
const NCC_DIARIO = [
  {
    id: 'kaffekapslen_ncc_strong_10',
    nombre: 'Kaffekapslen Strong - Café diario 10 cápsulas para Nespresso',
    precio: 1.35,
    capsulas: 10,
    intensidad: 'Fuerte',
    url: 'https://kaffek.es/strong-cafe-diario-kaffekapslen-nespresso.html',
  },
  {
    id: 'kaffekapslen_ncc_mild_10',
    nombre: 'Kaffekapslen Mild - Café diario 10 cápsulas para Nespresso',
    precio: 1.35,
    capsulas: 10,
    intensidad: 'Suave',
    url: 'https://kaffek.es/mild-cafe-diario-kaffekapslen-nespresso.html',
  },
  {
    id: 'kaffekapslen_ncc_lungo_diario_10',
    nombre: 'Kaffekapslen Lungo - Café diario 10 cápsulas para Nespresso',
    precio: 1.35,
    capsulas: 10,
    intensidad: 'Medio',
    url: 'https://kaffek.es/lungo-cafe-diario-kaffekapslen-nespresso.html',
  },
  {
    id: 'kaffekapslen_ncc_ristretto_diario_10',
    nombre: 'Kaffekapslen Ristretto - Café diario 10 cápsulas para Nespresso',
    precio: 1.45,
    capsulas: 10,
    intensidad: 'Fuerte',
    url: 'https://kaffek.es/ristretto-cafe-diario-kaffekapslen-nespresso.html',
  },
  {
    id: 'kaffekapslen_ncc_espresso_diario_10',
    nombre: 'Kaffekapslen Espresso - Café diario 10 cápsulas para Nespresso',
    precio: 1.65,
    capsulas: 10,
    intensidad: 'Fuerte',
    url: 'https://kaffek.es/espresso-cafe-diario-kaffekapslen-nespresso.html',
  },
  {
    id: 'kaffekapslen_ncc_dynamite_10',
    nombre: 'Kaffekapslen Dynamite Coffee 10 cápsulas para Nespresso',
    precio: 1.29,
    capsulas: 10,
    intensidad: 'Muy fuerte',
    url: 'https://kaffek.es/dynamite-coffee-kaffekapslen-nespresso.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// KAFFEKAPSLEN – Nespresso Compatible "Premium" (13)
// ═══════════════════════════════════════════════════════════════
const NCC_PREMIUM = [
  {
    id: 'kaffekapslen_ncc_espresso_premium_10',
    nombre: 'Kaffekapslen Espresso - Premium 10 cápsulas para Nespresso',
    precio: 1.69,
    capsulas: 10,
    intensidad: 'Fuerte',
    url: 'https://kaffek.es/espresso-premium-kaffekapslen-nespresso-10.html',
  },
  {
    id: 'kaffekapslen_ncc_ristretto_premium_10',
    nombre: 'Kaffekapslen Ristretto - Premium 10 cápsulas para Nespresso',
    precio: 1.65,
    capsulas: 10,
    intensidad: 'Muy fuerte',
    url: 'https://kaffek.es/ristretto-premium-kaffekapslen-nespresso.html',
  },
  {
    id: 'kaffekapslen_ncc_espresso_strong_premium_10',
    nombre: 'Kaffekapslen Espresso Strong - Premium 10 cápsulas para Nespresso',
    precio: 1.65,
    capsulas: 10,
    intensidad: 'Fuerte',
    url: 'https://kaffek.es/espresso-strong-premium-kaffekapslen-nespresso.html',
  },
  {
    id: 'kaffekapslen_ncc_lungo_premium_10',
    nombre: 'Kaffekapslen Lungo - Premium 10 cápsulas para Nespresso',
    precio: 1.79,
    capsulas: 10,
    intensidad: 'Medio',
    url: 'https://kaffek.es/lungo-premium-kaffekapslen-nespresso.html',
  },
  {
    id: 'kaffekapslen_ncc_lungo_strong_premium_10',
    nombre: 'Kaffekapslen Lungo Strong - Premium 10 cápsulas para Nespresso',
    precio: 1.65,
    capsulas: 10,
    intensidad: 'Fuerte',
    url: 'https://kaffek.es/lungo-strong-premium-kaffekapslen-nespresso.html',
  },
  {
    id: 'kaffekapslen_ncc_espresso_decaf_premium_10',
    nombre: 'Kaffekapslen Espresso Descafeinado - Premium 10 cápsulas para Nespresso',
    precio: 2.25,
    capsulas: 10,
    descafeinado: true,
    url: 'https://kaffek.es/espresso-decaf-premium-kaffekapslen-nespresso.html',
  },
  {
    id: 'kaffekapslen_ncc_espresso_chocolate_10',
    nombre: 'Kaffekapslen Espresso Chocolate - Premium 10 cápsulas para Nespresso',
    precio: 2.35,
    capsulas: 10,
    sabor: 'Chocolate',
    url: 'https://kaffek.es/espresso-chocolate-premium-kaffekapslen-nespresso.html',
  },
  {
    id: 'kaffekapslen_ncc_espresso_caramelo_10',
    nombre: 'Kaffekapslen Espresso Caramelo - Premium 10 cápsulas para Nespresso',
    precio: 2.35,
    capsulas: 10,
    sabor: 'Caramelo',
    url: 'https://kaffek.es/espresso-caramel-premium-kaffekapslen-nespresso.html',
  },
  {
    id: 'kaffekapslen_ncc_espresso_avellana_10',
    nombre: 'Kaffekapslen Espresso Avellana - Premium 10 cápsulas para Nespresso',
    precio: 2.75,
    capsulas: 10,
    sabor: 'Avellana',
    url: 'https://kaffek.es/espresso-avellana-premium-kaffekapslen-nespresso.html',
  },
  {
    id: 'kaffekapslen_ncc_espresso_creme_brulee_10',
    nombre: 'Kaffekapslen Espresso Crème Brûlée - Premium 10 cápsulas para Nespresso',
    precio: 2.49,
    capsulas: 10,
    sabor: 'Crème Brûlée',
    url: 'https://kaffek.es/espresso-creme-brulee-premium-nespresso.html',
  },
  {
    id: 'kaffekapslen_ncc_espresso_coco_10',
    nombre: 'Kaffekapslen Espresso Coco - Premium 10 cápsulas para Nespresso',
    precio: 2.55,
    capsulas: 10,
    sabor: 'Coco',
    url: 'https://kaffek.es/espresso-coconut-premium-nespresso.html',
  },
  {
    id: 'kaffekapslen_ncc_espresso_vainilla_10',
    nombre: 'Kaffekapslen Espresso Vainilla - Premium 10 cápsulas para Nespresso',
    precio: 2.25,
    capsulas: 10,
    sabor: 'Vainilla',
    url: 'https://kaffek.es/espresso-vanilla-premium-kaffekapslen-nespresso.html',
  },
  {
    id: 'kaffekapslen_ncc_espresso_irish_cream_10',
    nombre: 'Kaffekapslen Espresso Irish Cream - Premium 10 cápsulas para Nespresso',
    precio: 2.45,
    capsulas: 10,
    sabor: 'Irish Cream',
    url: 'https://kaffek.es/espresso-irish-cream-premium-nespresso.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// KAFFEKAPSLEN – Nespresso Pro (8)
// ═══════════════════════════════════════════════════════════════
const NESPRESSO_PRO = [
  {
    id: 'kaffekapslen_pro_espresso_50',
    nombre: 'Kaffekapslen Espresso 50 cápsulas para Nespresso Pro',
    precio: 13.29,
    capsulas: 50,
    intensidad: 'Fuerte',
    url: 'https://kaffek.es/espresso-kaffekapslen-nespresso-pro.html',
  },
  {
    id: 'kaffekapslen_pro_lungo_forte_50',
    nombre: 'Kaffekapslen Lungo Forte 50 cápsulas para Nespresso Pro',
    precio: 13.79,
    capsulas: 50,
    intensidad: 'Fuerte',
    url: 'https://kaffek.es/lungo-forte-kaffekapslen-nespresso-pro.html',
  },
  {
    id: 'kaffekapslen_pro_ristretto_50',
    nombre: 'Kaffekapslen Ristretto 50 cápsulas para Nespresso Pro',
    precio: 12.59,
    capsulas: 50,
    intensidad: 'Muy fuerte',
    url: 'https://kaffek.es/ristretto-kaffekapslen-nespresso-pro.html',
  },
  {
    id: 'kaffekapslen_pro_caramelo_50',
    nombre: 'Kaffekapslen Café Caramelo 50 cápsulas para Nespresso Pro',
    precio: 14.69,
    capsulas: 50,
    sabor: 'Caramelo',
    url: 'https://kaffek.es/caramelo-kaffekapslen-nespresso-pro.html',
  },
  {
    id: 'kaffekapslen_pro_avellana_50',
    nombre: 'Kaffekapslen Café Avellana 50 cápsulas para Nespresso Pro',
    precio: 13.39,
    capsulas: 50,
    sabor: 'Avellana',
    url: 'https://kaffek.es/avellana-kaffekapslen-nespresso-pro.html',
  },
  {
    id: 'kaffekapslen_pro_espresso_decaf_50',
    nombre: 'Kaffekapslen Espresso Descafeinado 50 cápsulas para Nespresso Pro',
    precio: 13.19,
    capsulas: 50,
    descafeinado: true,
    url: 'https://kaffek.es/espresso-decaf-kaffekapslen-nespresso-pro.html',
  },
  {
    id: 'kaffekapslen_pro_lungo_50',
    nombre: 'Kaffekapslen Lungo 50 cápsulas para Nespresso Pro',
    precio: 11.29,
    capsulas: 50,
    intensidad: 'Medio',
    url: 'https://kaffek.es/lungo-kaffekapslen-nespresso-pro.html',
  },
  {
    id: 'kaffekapslen_pro_dynamite_50',
    nombre: 'Kaffekapslen Dynamite Coffee 50 cápsulas para Nespresso Pro',
    precio: 12.49,
    capsulas: 50,
    intensidad: 'Muy fuerte',
    url: 'https://kaffek.es/dynamite-coffee-kaffekapslen-nespresso-pro.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// KAFFEKAPSLEN – Dolce Gusto (15)
// ═══════════════════════════════════════════════════════════════
const DOLCE_GUSTO = [
  {
    id: 'kaffekapslen_dg_americano_16',
    nombre: 'Kaffekapslen Americano - Café diario 16 cápsulas para Dolce Gusto',
    precio: 2.95,
    capsulas: 16,
    intensidad: 'Medio',
    url: 'https://kaffek.es/americano-cafe-diario-kaffekapslen-dolce-gusto-2570.html',
  },
  {
    id: 'kaffekapslen_dg_lungo_16',
    nombre: 'Kaffekapslen Lungo - Café diario 16 cápsulas para Dolce Gusto',
    precio: 2.95,
    capsulas: 16,
    intensidad: 'Medio',
    url: 'https://kaffek.es/lungo-cafe-diario-kaffekapslen-dolce-gusto.html',
  },
  {
    id: 'kaffekapslen_dg_cortado_16',
    nombre: 'Kaffekapslen Cortado - Café diario 16 cápsulas para Dolce Gusto',
    precio: 3.39,
    capsulas: 16,
    intensidad: 'Fuerte',
    url: 'https://kaffek.es/cortado-cafe-diario-kaffekapslen-dolce-gusto.html',
  },
  {
    id: 'kaffekapslen_dg_chocolate_leche_16',
    nombre: 'Kaffekapslen Chocolate con leche 16 cápsulas para Dolce Gusto',
    precio: 2.99,
    capsulas: 16,
    sabor: 'Chocolate',
    url: 'https://kaffek.es/chocolate-leche-kaffekapslen-dolce-gusto.html',
  },
  {
    id: 'kaffekapslen_dg_grande_descaf_16',
    nombre: 'Kaffekapslen Grande Descafeinado - Café diario 16 cápsulas para Dolce Gusto',
    precio: 4.49,
    capsulas: 16,
    descafeinado: true,
    url: 'https://kaffek.es/grande-descafeinado-cafe-diario-kaffekapslen-dolce-gusto.html',
  },
  {
    id: 'kaffekapslen_dg_dynamite_16',
    nombre: 'Kaffekapslen Dynamite Coffee 16 cápsulas para Dolce Gusto',
    precio: 3.09,
    capsulas: 16,
    intensidad: 'Muy fuerte',
    url: 'https://kaffek.es/dynamite-coffee-kaffekapslen-dolce-gusto.html',
  },
  {
    id: 'kaffekapslen_dg_latte_macchiato_16',
    nombre: 'Kaffekapslen Latte Macchiato - Café diario 16 cápsulas para Dolce Gusto',
    precio: 2.99,
    capsulas: 16,
    url: 'https://kaffek.es/latte-macchiato-cafe-diario-kaffekapslen-dolce-gusto.html',
  },
  {
    id: 'kaffekapslen_dg_cafe_au_lait_16',
    nombre: 'Kaffekapslen Café Au Lait - Café diario 16 cápsulas para Dolce Gusto',
    precio: 3.29,
    capsulas: 16,
    url: 'https://kaffek.es/cafe-au-lait-cafe-diario-kaffekapslen-dolce-gusto.html',
  },
  {
    id: 'kaffekapslen_dg_cappuccino_16',
    nombre: 'Kaffekapslen Cappuccino - Café diario 16 cápsulas para Dolce Gusto',
    precio: 3.19,
    capsulas: 16,
    url: 'https://kaffek.es/cappuccino-cafe-diario-kaffekapslen-dolce-gusto.html',
  },
  {
    id: 'kaffekapslen_dg_grande_16',
    nombre: 'Kaffekapslen Grande - Café diario 16 cápsulas para Dolce Gusto',
    precio: 2.95,
    capsulas: 16,
    intensidad: 'Medio',
    url: 'https://kaffek.es/grande-cafe-diario-kaffekapslen-dolce-gusto.html',
  },
  {
    id: 'kaffekapslen_dg_espresso_16',
    nombre: 'Kaffekapslen Espresso - Café diario 16 cápsulas para Dolce Gusto',
    precio: 2.89,
    capsulas: 16,
    intensidad: 'Fuerte',
    url: 'https://kaffek.es/espresso-cafe-diario-kaffekapslen-dolce-gusto.html',
  },
  {
    id: 'kaffekapslen_dg_espresso_strong_16',
    nombre: 'Kaffekapslen Espresso Strong - Café diario 16 cápsulas para Dolce Gusto',
    precio: 2.75,
    capsulas: 16,
    intensidad: 'Fuerte',
    url: 'https://kaffek.es/espresso-strong-cafe-diario-kaffekapslen-dolce-gusto.html',
  },
  {
    id: 'kaffekapslen_dg_latte_macchiato_caramel_16',
    nombre: 'Kaffekapslen Latte Macchiato Caramel - Café diario 16 cápsulas para Dolce Gusto',
    precio: 3.49,
    capsulas: 16,
    sabor: 'Caramelo',
    url: 'https://kaffek.es/latte-macchiato-caramel-cafe-diario-kaffekapslen-dolce-gusto.html',
  },
  {
    id: 'kaffekapslen_dg_latte_macchiato_vanilla_16',
    nombre: 'Kaffekapslen Latte Macchiato Vanilla - Café diario 16 cápsulas para Dolce Gusto',
    precio: 2.99,
    capsulas: 16,
    sabor: 'Vainilla',
    url: 'https://kaffek.es/latte-macchiato-vanilla-cafe-diario-kaffekapslen-dolce-gusto.html',
  },
  {
    id: 'kaffekapslen_dg_chai_latte_16',
    nombre: 'Kaffekapslen Chai Latte 16 cápsulas para Dolce Gusto',
    precio: 2.69,
    capsulas: 16,
    sabor: 'Chai',
    url: 'https://kaffek.es/chai-latte-cafe-diario-kaffekapslen-dolce-gusto.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// KAFFEKAPSLEN – Senseo (10)
// ═══════════════════════════════════════════════════════════════
const SENSEO = [
  {
    id: 'kaffekapslen_senseo_vainilla_36',
    nombre: 'Kaffekapslen Vainilla - Café diario 36 monodosis para Senseo',
    precio: 3.89,
    capsulas: 36,
    sabor: 'Vainilla',
    url: 'https://kaffek.es/vainilla-cafe-diario-kaffekapslen-senseo.html',
  },
  {
    id: 'kaffekapslen_senseo_avellana_36',
    nombre: 'Kaffekapslen Avellana - Café diario 36 monodosis para Senseo',
    precio: 4.39,
    capsulas: 36,
    sabor: 'Avellana',
    url: 'https://kaffek.es/avellana-cafe-diario-kaffekapslen-senseo.html',
  },
  {
    id: 'kaffekapslen_senseo_caramelo_36',
    nombre: 'Kaffekapslen Caramelo - Café diario 36 monodosis para Senseo',
    precio: 4.59,
    capsulas: 36,
    sabor: 'Caramelo',
    url: 'https://kaffek.es/caramelo-cafe-diario-kaffekapslen-senseo.html',
  },
  {
    id: 'kaffekapslen_senseo_classic_36',
    nombre: 'Kaffekapslen Classic - Café diario 36 monodosis para Senseo',
    precio: 3.19,
    capsulas: 36,
    intensidad: 'Medio',
    url: 'https://kaffek.es/classic-cafe-diario-kaffekapslen-senseo.html',
  },
  {
    id: 'kaffekapslen_senseo_chocolate_36',
    nombre: 'Kaffekapslen Chocolate - Café diario 36 monodosis para Senseo',
    precio: 4.09,
    capsulas: 36,
    sabor: 'Chocolate',
    url: 'https://kaffek.es/chocolate-cafe-diario-kaffekapslen-senseo.html',
  },
  {
    id: 'kaffekapslen_senseo_extra_strong_36',
    nombre: 'Kaffekapslen Extra Strong - Café diario 36 monodosis para Senseo',
    precio: 2.69,
    capsulas: 36,
    intensidad: 'Muy fuerte',
    url: 'https://kaffek.es/extra-strong-cafe-diario-kaffekapslen-senseo.html',
  },
  {
    id: 'kaffekapslen_senseo_descafeinado_36',
    nombre: 'Kaffekapslen Descafeinado - Café diario 36 monodosis para Senseo',
    precio: 2.99,
    capsulas: 36,
    descafeinado: true,
    url: 'https://kaffek.es/descafeinado-cafe-diario-kaffekapslen-senseo.html',
  },
  {
    id: 'kaffekapslen_senseo_strong_36',
    nombre: 'Kaffekapslen Strong - Café diario 36 monodosis para Senseo',
    precio: 2.89,
    capsulas: 36,
    intensidad: 'Fuerte',
    url: 'https://kaffek.es/strong-cafe-diario-kaffekapslen-senseo.html',
  },
  {
    id: 'kaffekapslen_senseo_classic_xl_20',
    nombre: 'Kaffekapslen Classic XL - Café diario 20 monodosis para Senseo',
    precio: 3.29,
    capsulas: 20,
    intensidad: 'Medio',
    url: 'https://kaffek.es/classic-xl-cafe-diario-kaffekapslen-senseo.html',
  },
  {
    id: 'kaffekapslen_senseo_dynamite_18',
    nombre: 'Kaffekapslen Dynamite Coffee 18 monodosis para Senseo',
    precio: 1.89,
    capsulas: 18,
    intensidad: 'Muy fuerte',
    url: 'https://kaffek.es/dynamite-coffee-kaffekapslen-senseo.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// Build unified list
// ═══════════════════════════════════════════════════════════════
function withMeta(list, sistema) {
  return list.map((p) => ({
    ...p,
    marca: 'Kaffekapslen',
    sistema,
    compatibilidad: sistema,
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: `${p.capsulas} ${sistema === 'Senseo' ? 'monodosis' : 'cápsulas'}`,
    tamano: `${p.capsulas} ${sistema === 'Senseo' ? 'monodosis' : 'cápsulas'}`,
    descafeinado: p.descafeinado || false,
  }));
}

const ALL = [
  ...withMeta(NCC_DIARIO, 'Nespresso'),
  ...withMeta(NCC_PREMIUM, 'Nespresso'),
  ...withMeta(NESPRESSO_PRO, 'Nespresso Pro'),
  ...withMeta(DOLCE_GUSTO, 'Dolce Gusto'),
  ...withMeta(SENSEO, 'Senseo'),
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
  console.log(`\n=== Importing up to ${ALL.length} Kaffekapslen capsule products ===\n`);
  let created = 0,
    skipped = 0,
    photos = 0,
    errors = 0;
  const bySys = {};

  for (const p of ALL) {
    if (!bySys[p.sistema]) bySys[p.sistema] = 0;

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
    if (p.intensidad) data.intensidad = p.intensidad;
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
      bySys[p.sistema]++;
      console.log(`  ${p.nombre} → ${p.precio}€`);
    } catch (e) {
      console.log(`  DB ERR: ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Created: ${created} | Skipped: ${skipped} | Photos: ${photos} | Errors: ${errors}`);
  for (const [s, c] of Object.entries(bySys)) if (c > 0) console.log(`  ${s}: ${c}`);
  process.exit(0);
})();
