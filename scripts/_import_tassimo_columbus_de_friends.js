#!/usr/bin/env node
/**
 * _import_tassimo_columbus_de_friends.js – April 2026
 * Imports from kaffek.es:
 *   - Tassimo system: Jacobs(13), L'OR(5), Marcilla(2), Tassimo(4), Gevalia(1),
 *     Grand'Mère(1), Kenco(4), Baileys(1), Coffee Shop Selections(1) = 32 products
 *   - Columbus: 3 Nespresso + 3 Dolce Gusto = 6
 *   - Douwe Egberts: 4 Nespresso + 5 Dolce Gusto + 1 Senseo = 10
 *   - Friends: 3 Nespresso
 * Total: ~51 new products, ~10 new brands
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
// TASSIMO – Jacobs (13)
// ═══════════════════════════════════════════════════════════════
const JACOBS_TASSIMO = [
  {
    id: 'jacobs_tassimo_cafe_au_lait_16',
    nombre: 'Jacobs Café au Lait 16 cápsulas para Tassimo',
    precio: 5.89,
    capsulas: 16,
    url: 'https://kaffek.es/cafe-au-lait-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_cappuccino_classico_16',
    nombre: 'Jacobs Cappuccino Classico 16 cápsulas para Tassimo',
    precio: 5.79,
    capsulas: 16,
    url: 'https://kaffek.es/cappuccino-classico-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_choco_cappuccino_10',
    nombre: 'Jacobs Choco Cappuccino 10 cápsulas para Tassimo',
    precio: 6.59,
    capsulas: 10,
    sabor: 'Chocolate',
    url: 'https://kaffek.es/cappuccino-choco-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_latte_macch_classico_16',
    nombre: 'Jacobs Latte Macchiato Classico 8+8 cápsulas para Tassimo',
    precio: 5.79,
    capsulas: 16,
    formato: '16 cápsulas (8 tazas)',
    url: 'https://kaffek.es/latte-macchiato-classico-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_latte_macch_vanilla_16',
    nombre: 'Jacobs Vanilla Latte Macchiato 16 cápsulas para Tassimo',
    precio: 6.59,
    capsulas: 16,
    sabor: 'Vainilla',
    url: 'https://kaffek.es/latte-macchiato-vanilla-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_latte_macch_caramel_16',
    nombre: 'Jacobs Caramel Latte Macchiato 16 cápsulas para Tassimo',
    precio: 5.89,
    capsulas: 16,
    sabor: 'Caramelo',
    url: 'https://kaffek.es/latte-macchiato-caramel-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_kronung_xl_16',
    nombre: 'Jacobs Krönung XL 16 cápsulas para Tassimo',
    precio: 5.19,
    capsulas: 16,
    url: 'https://kaffek.es/kronung-xl-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_medaille_dor_16',
    nombre: "Jacobs Médaille d'Or 16 cápsulas para Tassimo",
    precio: 5.39,
    capsulas: 16,
    url: 'https://kaffek.es/medaille-d-or-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_monarch_16',
    nombre: 'Jacobs Monarch 16 cápsulas para Tassimo',
    precio: 5.49,
    capsulas: 16,
    url: 'https://kaffek.es/monarch-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_crema_classico_xl_16',
    nombre: 'Jacobs Caffè Crema Classico XL 16 cápsulas para Tassimo',
    precio: 5.29,
    capsulas: 16,
    url: 'https://kaffek.es/caffe-crema-classico-xl-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_crema_mild_16',
    nombre: 'Jacobs Caffè Crema Mild 16 cápsulas para Tassimo',
    precio: 5.49,
    capsulas: 16,
    url: 'https://kaffek.es/caffe-crema-mild-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_crema_mild_xl_16',
    nombre: 'Jacobs Caffè Crema Mild XL 16 cápsulas para Tassimo',
    precio: 5.29,
    capsulas: 16,
    url: 'https://kaffek.es/caffe-crema-mild-xl-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_espresso_classico_16',
    nombre: 'Jacobs Espresso Classico 16 cápsulas para Tassimo',
    precio: 5.49,
    capsulas: 16,
    url: 'https://kaffek.es/espresse-classico-jacobs-tassimo.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// TASSIMO – L'OR (5)
// ═══════════════════════════════════════════════════════════════
const LOR_TASSIMO = [
  {
    id: 'lor_tassimo_cappuccino_16',
    nombre: "L'OR Cappuccino 16 cápsulas para Tassimo",
    precio: 6.49,
    capsulas: 16,
    url: 'https://kaffek.es/cappuccino-lor-tassimo.html',
  },
  {
    id: 'lor_tassimo_cafe_long_classique_24',
    nombre: "L'OR Café Long Classique 24 cápsulas para Tassimo",
    precio: 8.39,
    capsulas: 24,
    formato: '24 cápsulas',
    url: 'https://kaffek.es/cafe-long-classique-lor-tassimo.html',
  },
  {
    id: 'lor_tassimo_cafe_long_intense_16',
    nombre: "L'OR Café Long Intense 16 cápsulas para Tassimo",
    precio: 5.89,
    capsulas: 16,
    url: 'https://kaffek.es/cafe-long-intense-lor-tassimo.html',
  },
  {
    id: 'lor_tassimo_espresso_classique_16',
    nombre: "L'OR Espresso Classique 16 cápsulas para Tassimo",
    precio: 5.29,
    capsulas: 16,
    url: 'https://kaffek.es/espresso-classique-lor-tassimo.html',
  },
  {
    id: 'lor_tassimo_petit_dejeuner_24',
    nombre: "L'OR Petit Déjeuner Classique 24 cápsulas para Tassimo",
    precio: 8.29,
    capsulas: 24,
    formato: '24 cápsulas',
    url: 'https://kaffek.es/petit-dejeuner-classique-lor-tassimo-2508.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// TASSIMO – Marcilla (2)
// ═══════════════════════════════════════════════════════════════
const MARCILLA_TASSIMO = [
  {
    id: 'marcilla_tassimo_cortado_16',
    nombre: 'Marcilla Cortado 16 cápsulas para Tassimo',
    precio: 9.49,
    capsulas: 16,
    url: 'https://kaffek.es/marcilla-cortado-tassimo.html',
  },
  {
    id: 'marcilla_tassimo_cafe_con_leche_16',
    nombre: 'Marcilla Café con Leche 16 cápsulas para Tassimo',
    precio: 7.29,
    capsulas: 16,
    url: 'https://kaffek.es/cafe-con-leche-marcilla-tassimo.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// TASSIMO – Tassimo own brand (4)
// ═══════════════════════════════════════════════════════════════
const TASSIMO_OWN = [
  {
    id: 'tassimo_leche_16',
    nombre: 'Tassimo Leche 16 cápsulas para Tassimo',
    precio: 4.89,
    capsulas: 16,
    url: 'https://kaffek.es/leche-tassimo.html',
  },
  {
    id: 'tassimo_morning_cafe_strong_xl_21',
    nombre: 'Tassimo Morning Café Strong & Intense XL 21 cápsulas para Tassimo',
    precio: 5.89,
    capsulas: 21,
    formato: '21 cápsulas',
    url: 'https://kaffek.es/morning-cafe-strong-intense-xl-tassimo.html',
  },
  {
    id: 'tassimo_morning_cafe_mild_xl_21',
    nombre: 'Tassimo Morning Café Mild & Smooth XL 21 cápsulas para Tassimo',
    precio: 6.19,
    capsulas: 21,
    formato: '21 cápsulas',
    url: 'https://kaffek.es/morning-cafe-xl-mild-smooth-tassimo-tassimo.html',
  },
  {
    id: 'tassimo_latte_canela_16',
    nombre: 'Tassimo Latte Rollo de Canela 16 cápsulas para Tassimo',
    precio: 7.09,
    capsulas: 16,
    sabor: 'Canela',
    url: 'https://kaffek.es/latte-rollo-de-canela-tassimo.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// TASSIMO – Other brands (Gevalia, Grand'Mère, Kenco, Baileys, Coffee Shop Selections)
// ═══════════════════════════════════════════════════════════════
const GEVALIA_TASSIMO = [
  {
    id: 'gevalia_tassimo_dark_16',
    nombre: 'Gevalia Dark 16 cápsulas para Tassimo',
    precio: 5.59,
    capsulas: 16,
    url: 'https://kaffek.es/dark-gevalia-tassimo.html',
  },
];

const GRAND_MERE_TASSIMO = [
  {
    id: 'grandmere_tassimo_espresso_16',
    nombre: "Grand'Mère Espresso 16 cápsulas para Tassimo",
    precio: 4.79,
    capsulas: 16,
    url: 'https://kaffek.es/espresso-grand-mere-tassimo.html',
  },
];

const KENCO_TASSIMO = [
  {
    id: 'kenco_tassimo_flat_white_16',
    nombre: 'Kenco Flat White 16 cápsulas para Tassimo',
    precio: 6.19,
    capsulas: 16,
    url: 'https://kaffek.es/flat-white-kenco-tassimo.html',
  },
  {
    id: 'kenco_tassimo_cappuccino_16',
    nombre: 'Kenco Cappuccino 16 cápsulas para Tassimo',
    precio: 6.49,
    capsulas: 16,
    url: 'https://kaffek.es/cappuccino-kenco-tassimo.html',
  },
  {
    id: 'kenco_tassimo_cafe_au_lait_16',
    nombre: 'Kenco Café au Lait 16 cápsulas para Tassimo',
    precio: 6.49,
    capsulas: 16,
    url: 'https://kaffek.es/cafe-au-lait-kenco-tassimo.html',
  },
  {
    id: 'kenco_tassimo_americano_smooth_16',
    nombre: 'Kenco Americano Smooth 16 cápsulas para Tassimo',
    precio: 6.59,
    capsulas: 16,
    url: 'https://kaffek.es/americano-smooth-kenco-tassimo-16.html',
  },
];

const BAILEYS_TASSIMO = [
  {
    id: 'baileys_tassimo_latte_macchiato_16',
    nombre: 'Baileys Latte Macchiato 16 cápsulas para Tassimo',
    precio: 6.19,
    capsulas: 16,
    sabor: 'Baileys',
    url: 'https://kaffek.es/latte-macchiato-baileys-tassimo.html',
  },
];

const COFFEE_SHOP_TASSIMO = [
  {
    id: 'coffeeshop_tassimo_cappuccino_intenso_16',
    nombre: 'Coffee Shop Selections Cappuccino Intenso 16 cápsulas para Tassimo',
    precio: 6.99,
    capsulas: 16,
    url: 'https://kaffek.es/cappuccino-intenso-coffee-shop-selections-tassimo.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// COLUMBUS – Nespresso (3) + Dolce Gusto (3)
// ═══════════════════════════════════════════════════════════════
const COLUMBUS_NESP = [
  {
    id: 'columbus_nesp_caramelo_salado_10',
    nombre: 'Columbus Espresso al Caramelo Salado 10 cápsulas para Nespresso',
    precio: 4.29,
    sabor: 'Caramelo salado',
    url: 'https://kaffek.es/espresso-al-caramelo-salado-columbus-nespresso.html',
  },
  {
    id: 'columbus_nesp_vainilla_macadamia_10',
    nombre: 'Columbus Espresso Vainilla y Macadamia 10 cápsulas para Nespresso',
    precio: 4.19,
    sabor: 'Vainilla macadamia',
    url: 'https://kaffek.es/espresso-de-vainilla-y-nuez-de-macadamia-columbus-nespresso.html',
  },
  {
    id: 'columbus_nesp_galleta_chocolate_10',
    nombre: 'Columbus Espresso Galleta con Pepitas de Chocolate 10 cápsulas para Nespresso',
    precio: 4.19,
    sabor: 'Galleta chocolate',
    url: 'https://kaffek.es/espresso-de-galleta-con-petitas-de-chocolate-columbus-nespresso.html',
  },
];

const COLUMBUS_DG = [
  {
    id: 'columbus_dg_cappuccino_12',
    nombre: 'Columbus Cappuccino 12 cápsulas para Dolce Gusto',
    precio: 5.49,
    capsulas: 12,
    formato: '12 cápsulas',
    url: 'https://kaffek.es/cappuccino-columbus-dolce-gusto.html',
  },
  {
    id: 'columbus_dg_speculoos_latte_12',
    nombre: 'Columbus Speculoos Latte 12 cápsulas para Dolce Gusto',
    precio: 5.99,
    capsulas: 12,
    formato: '12 cápsulas',
    sabor: 'Speculoos',
    url: 'https://kaffek.es/latte-sabor-speculoos-columbus-dolce-gusto.html',
  },
  {
    id: 'columbus_dg_vanilla_macadamia_12',
    nombre: 'Columbus Vanilla Macadamia Latte 12 cápsulas para Dolce Gusto',
    precio: 5.89,
    capsulas: 12,
    formato: '12 cápsulas',
    sabor: 'Vainilla macadamia',
    url: 'https://kaffek.es/latte-vainilla-nuez-macadamia-columbus-dolce-gusto.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// DOUWE EGBERTS – Nespresso (4) + Dolce Gusto (5) + Senseo (1)
// ═══════════════════════════════════════════════════════════════
const DE_NESP = [
  {
    id: 'de_nesp_lungo_intenso_20',
    nombre: 'Douwe Egberts Lungo 8 Intenso 20 cápsulas para Nespresso',
    precio: 5.99,
    capsulas: 20,
    formato: '20 cápsulas',
    url: 'https://kaffek.es/lungo-8-intens-xl-douwe-egberts-nespresso.html',
  },
  {
    id: 'de_nesp_lungo_original_20',
    nombre: 'Douwe Egberts Lungo 6 Original 20 cápsulas para Nespresso',
    precio: 5.89,
    capsulas: 20,
    formato: '20 cápsulas',
    url: 'https://kaffek.es/lungo-6-original-xl-douwe-egberts-nespresso.html',
  },
  {
    id: 'de_nesp_excellent_mocca_20',
    nombre: 'Douwe Egberts Excellent Mocca Lungo 20 cápsulas para Nespresso',
    precio: 6.59,
    capsulas: 20,
    formato: '20 cápsulas',
    url: 'https://kaffek.es/excellent-mocca-lungo-douwe-egberts-nespresso.html',
  },
  {
    id: 'de_nesp_espresso_ristretto_20',
    nombre: 'Douwe Egberts Espresso Ristretto 20 cápsulas para Nespresso',
    precio: 6.29,
    capsulas: 20,
    formato: '20 cápsulas',
    url: 'https://kaffek.es/espresso-ristretto-douwe-egberts-nespresso-20.html',
  },
];

const DE_DG = [
  {
    id: 'de_dg_cafe_au_lait_16',
    nombre: 'Douwe Egberts Café au Lait 16 cápsulas para Dolce Gusto',
    precio: 5.49,
    capsulas: 16,
    url: 'https://kaffek.es/cafe-au-lait-douwe-egberts-dolce-gusto-16.html',
  },
  {
    id: 'de_dg_cappuccino_16',
    nombre: 'Douwe Egberts Cappuccino 16 cápsulas para Dolce Gusto',
    precio: 5.49,
    capsulas: 16,
    url: 'https://kaffek.es/cappuccino-douwe-egberts-dolce-gusto-8-8.html',
  },
  {
    id: 'de_dg_latte_macchiato_16',
    nombre: 'Douwe Egberts Latte Macchiato 16 cápsulas para Dolce Gusto',
    precio: 5.49,
    capsulas: 16,
    url: 'https://kaffek.es/latte-macchiato-douwe-egberts-dolce-gusto-8-8.html',
  },
  {
    id: 'de_dg_lungo_16',
    nombre: 'Douwe Egberts Lungo 16 cápsulas para Dolce Gusto',
    precio: 5.29,
    capsulas: 16,
    url: 'https://kaffek.es/lungo-douwe-egberts-dolce-gusto-16.html',
  },
  {
    id: 'de_dg_espresso_intenso_16',
    nombre: 'Douwe Egberts Espresso Intenso 16 cápsulas para Dolce Gusto',
    precio: 5.49,
    capsulas: 16,
    url: 'https://kaffek.es/espresso-intenso-douwe-egberts-dolce-gusto-16.html',
  },
];

const DE_SENSEO = [
  {
    id: 'de_senseo_aroma_rood_54',
    nombre: 'Douwe Egberts Aroma Rood 54 monodosis para Senseo',
    precio: 10.39,
    capsulas: 54,
    formato: '54 monodosis',
    url: 'https://kaffek.es/aroma-rood-54-douwe-egberts-senseo.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// FRIENDS – Nespresso (3)
// ═══════════════════════════════════════════════════════════════
const FRIENDS_NESP = [
  {
    id: 'friends_nesp_chocolate_cereza_10',
    nombre: 'Friends Chocolate y Cereza 10 cápsulas para Nespresso',
    precio: 2.95,
    sabor: 'Chocolate cereza',
    url: 'https://kaffek.es/chocolate-y-cereza-friends-nespresso.html',
  },
  {
    id: 'friends_nesp_variety_pack_50',
    nombre: 'Friends Variety Pack 50 cápsulas para Nespresso',
    precio: 15.49,
    capsulas: 50,
    formato: '50 cápsulas',
    url: 'https://kaffek.es/variety-pack-friends-nespresso.html',
  },
  {
    id: 'friends_nesp_caramel_toffee_10',
    nombre: 'Friends Caramel Toffee 10 cápsulas para Nespresso',
    precio: 2.79,
    sabor: 'Caramelo toffee',
    url: 'https://kaffek.es/caramelo-toffee-friends-nespresso.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// Build unified list
// ═══════════════════════════════════════════════════════════════
function withMeta(list, marca, sistema) {
  return list.map((p) => ({
    ...p,
    marca,
    sistema,
    compatibilidad: sistema,
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: p.formato || `${p.capsulas || 10} cápsulas`,
    tamano: p.formato || `${p.capsulas || 10} cápsulas`,
    capsulas: p.capsulas || 10,
    descafeinado: p.descafeinado || false,
  }));
}

const ALL = [
  ...withMeta(JACOBS_TASSIMO, 'Jacobs', 'Tassimo'),
  ...withMeta(LOR_TASSIMO, "L'OR", 'Tassimo'),
  ...withMeta(MARCILLA_TASSIMO, 'Marcilla', 'Tassimo'),
  ...withMeta(TASSIMO_OWN, 'Tassimo', 'Tassimo'),
  ...withMeta(GEVALIA_TASSIMO, 'Gevalia', 'Tassimo'),
  ...withMeta(GRAND_MERE_TASSIMO, "Grand'Mère", 'Tassimo'),
  ...withMeta(KENCO_TASSIMO, 'Kenco', 'Tassimo'),
  ...withMeta(BAILEYS_TASSIMO, 'Baileys', 'Tassimo'),
  ...withMeta(COFFEE_SHOP_TASSIMO, 'Coffee Shop Selections', 'Tassimo'),
  ...withMeta(COLUMBUS_NESP, 'Columbus', 'Nespresso'),
  ...withMeta(COLUMBUS_DG, 'Columbus', 'Dolce Gusto'),
  ...withMeta(DE_NESP, 'Douwe Egberts', 'Nespresso'),
  ...withMeta(DE_DG, 'Douwe Egberts', 'Dolce Gusto'),
  ...withMeta(DE_SENSEO, 'Douwe Egberts', 'Senseo'),
  ...withMeta(FRIENDS_NESP, 'Friends', 'Nespresso'),
];

// ═══════════════════════════════════════════════════════════════
// Helpers (same as previous import)
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
  const { data: buf, status } = await httpGet(imgUrl, true);
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
  console.log(`\n=== Importing ${ALL.length} products ===\n`);
  let created = 0,
    photos = 0,
    errors = 0;
  const byBrand = {};

  for (const p of ALL) {
    if (!byBrand[p.marca]) byBrand[p.marca] = 0;
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
  console.log(`Created: ${created} | Photos: ${photos} | Errors: ${errors}`);
  for (const [b, c] of Object.entries(byBrand)) console.log(`  ${b}: ${c}`);
  process.exit(0);
})();
