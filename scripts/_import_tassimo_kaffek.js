#!/usr/bin/env node
/**
 * _import_tassimo_kaffek.js – April 2026
 * Import ALL Tassimo capsules from kaffek.es (60 products)
 * Brands: Jacobs, L'OR, Tassimo, Marcilla, Costa, Milka, Gevalia,
 *         Baileys, Café Hag, Coffee Shop Selections, Kenco, Grand'Mère, Friele
 * Uses auto-discovery: fetches each product URL, extracts image, creates doc
 * Skips products already in DB by doc ID
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

// All 60 Tassimo products from kaffek.es (pages 1-2)
const ALL = [
  // ═══ Tassimo brand (5) ═══
  {
    id: 'tassimo_morning_cafe_strong_xl_21',
    nombre: 'Tassimo Morning Café Strong & Intense XL 21 cápsulas para Tassimo',
    marca: 'Tassimo',
    capsulas: 21,
    precio: 5.89,
    url: 'https://kaffek.es/morning-cafe-strong-intense-xl-tassimo.html',
  },
  {
    id: 'tassimo_morning_cafe_mild_xl_21',
    nombre: 'Tassimo Morning Café Mild & Smooth XL 21 cápsulas para Tassimo',
    marca: 'Tassimo',
    capsulas: 21,
    precio: 6.19,
    url: 'https://kaffek.es/morning-cafe-xl-mild-smooth-tassimo-tassimo.html',
  },
  {
    id: 'tassimo_morning_cafe_filter_xl_21',
    nombre: 'Tassimo Morning Café Filter XL 21 cápsulas para Tassimo',
    marca: 'Tassimo',
    capsulas: 21,
    precio: 6.19,
    url: 'https://kaffek.es/filter-morning-cafe-xl-tassimo-tassimo.html',
  },
  {
    id: 'tassimo_leche_16',
    nombre: 'Tassimo Leche 16 cápsulas para Tassimo',
    marca: 'Tassimo',
    capsulas: 16,
    precio: 4.89,
    sabor: 'Leche',
    url: 'https://kaffek.es/leche-tassimo.html',
  },
  {
    id: 'tassimo_latte_canela_16',
    nombre: 'Tassimo Latte rollo de canela 16 cápsulas para Tassimo',
    marca: 'Tassimo',
    capsulas: 16,
    precio: 7.09,
    sabor: 'Canela',
    url: 'https://kaffek.es/latte-rollo-de-canela-tassimo.html',
  },

  // ═══ L'OR Tassimo (12) ═══
  {
    id: 'lor_tassimo_splendente_16',
    nombre: "L'OR Splendente 16 cápsulas para Tassimo",
    marca: "L'OR",
    capsulas: 16,
    precio: 5.89,
    url: 'https://kaffek.es/splendente-lor-tassimo.html',
  },
  {
    id: 'lor_tassimo_fortissimo_16',
    nombre: "L'OR Fortissimo 16 cápsulas para Tassimo",
    marca: "L'OR",
    capsulas: 16,
    precio: 6.99,
    url: 'https://kaffek.es/fortissimo-lor-tassimo.html',
  },
  {
    id: 'lor_tassimo_cafe_long_classique_24',
    nombre: "L'OR Café Long Classique 24 cápsulas para Tassimo",
    marca: "L'OR",
    capsulas: 24,
    precio: 8.39,
    url: 'https://kaffek.es/cafe-long-classique-lor-tassimo.html',
  },
  {
    id: 'lor_tassimo_xl_intense_16',
    nombre: "L'OR XL Intense 16 cápsulas para Tassimo",
    marca: "L'OR",
    capsulas: 16,
    precio: 5.89,
    url: 'https://kaffek.es/intense-xl-lor-tassimo.html',
  },
  {
    id: 'lor_tassimo_cafe_long_intense_16',
    nombre: "L'OR Café Long Intense 16 cápsulas para Tassimo",
    marca: "L'OR",
    capsulas: 16,
    precio: 5.89,
    url: 'https://kaffek.es/cafe-long-intense-lor-tassimo.html',
  },
  {
    id: 'lor_tassimo_xl_classique_16',
    nombre: "L'OR XL Classique 16 cápsulas para Tassimo",
    marca: "L'OR",
    capsulas: 16,
    precio: 5.59,
    url: 'https://kaffek.es/classique-xl-lor-tassimo.html',
  },
  {
    id: 'lor_tassimo_lungo_colombia_16',
    nombre: "L'OR Lungo Colombia 16 cápsulas para Tassimo",
    marca: "L'OR",
    capsulas: 16,
    precio: 6.99,
    origen: 'Colombia',
    url: 'https://kaffek.es/lungo-colombia-lor-tassimo-2507.html',
  },
  {
    id: 'lor_tassimo_delizioso_16',
    nombre: "L'OR Delizioso 16 cápsulas para Tassimo",
    marca: "L'OR",
    capsulas: 16,
    precio: 6.39,
    url: 'https://kaffek.es/delizioso-lor-tassimo.html',
  },
  {
    id: 'lor_tassimo_espresso_classique_16',
    nombre: "L'OR Espresso Classique 16 cápsulas para Tassimo",
    marca: "L'OR",
    capsulas: 16,
    precio: 5.29,
    url: 'https://kaffek.es/espresso-classique-lor-tassimo.html',
  },
  {
    id: 'lor_tassimo_cappuccino_16',
    nombre: "L'OR Cappuccino 16 cápsulas para Tassimo",
    marca: "L'OR",
    capsulas: 16,
    precio: 6.49,
    sabor: 'Cappuccino',
    url: 'https://kaffek.es/cappuccino-lor-tassimo.html',
  },
  {
    id: 'lor_tassimo_descafeinado_16',
    nombre: "L'OR Descafeinado Espresso 16 cápsulas para Tassimo",
    marca: "L'OR",
    capsulas: 16,
    precio: 6.39,
    descafeinado: true,
    url: 'https://kaffek.es/decaffeinato-lor-tassimo.html',
  },
  {
    id: 'lor_tassimo_latte_macchiato_16',
    nombre: "L'OR Latte Macchiato 16 cápsulas para Tassimo",
    marca: "L'OR",
    capsulas: 16,
    precio: 6.79,
    sabor: 'Leche',
    url: 'https://kaffek.es/latte-macchiato-lor-tassimo.html',
  },

  // ═══ Jacobs Tassimo (17) ═══
  {
    id: 'jacobs_tassimo_crema_classico_xl_16',
    nombre: 'Jacobs Caffè Crema Classico XL 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 5.29,
    url: 'https://kaffek.es/caffe-crema-classico-xl-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_kronung_kraftig_xl_16',
    nombre: 'Jacobs Krönung Kräftig XL 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 5.19,
    url: 'https://kaffek.es/kronung-xl-kraftig-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_medaille_dor_16',
    nombre: "Jacobs Médaille d'Or 16 cápsulas para Tassimo",
    marca: 'Jacobs',
    capsulas: 16,
    precio: 5.39,
    url: 'https://kaffek.es/medaille-d-or-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_latte_caramel_16',
    nombre: 'Jacobs Caramel Latte Macchiato 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 5.89,
    sabor: 'Caramelo',
    url: 'https://kaffek.es/latte-macchiato-caramel-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_cappuccino_classico_16',
    nombre: 'Jacobs Cappuccino Classico 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 5.79,
    url: 'https://kaffek.es/cappuccino-classico-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_crema_mild_xl_16',
    nombre: 'Jacobs Caffè Crema Mild XL 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 5.29,
    url: 'https://kaffek.es/caffe-crema-mild-xl-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_latte_vanilla_16',
    nombre: 'Jacobs Vanilla Latte Macchiato 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 6.59,
    sabor: 'Vainilla',
    url: 'https://kaffek.es/latte-macchiato-vanilla-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_cafe_au_lait_24',
    nombre: 'Jacobs Café au Lait 24 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 24,
    precio: 9.09,
    url: 'https://kaffek.es/cafe-au-lait-24-capsulas-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_espresso_ristretto_16',
    nombre: 'Jacobs Espresso Ristretto 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 5.59,
    url: 'https://kaffek.es/espresso-ristretto-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_crema_mild_16',
    nombre: 'Jacobs Caffè Crema Mild 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 5.49,
    url: 'https://kaffek.es/caffe-crema-mild-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_cafe_au_lait_16',
    nombre: 'Jacobs Café au Lait 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 5.89,
    url: 'https://kaffek.es/cafe-au-lait-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_kronung_xl_16',
    nombre: 'Jacobs Krönung XL 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 5.19,
    url: 'https://kaffek.es/kronung-xl-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_latte_classico_16',
    nombre: 'Jacobs Latte Macchiato Classico 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 5.79,
    url: 'https://kaffek.es/latte-macchiato-classico-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_espresso_classico_16',
    nombre: 'Jacobs Espresso Classico 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 5.29,
    url: 'https://kaffek.es/espresso-classico-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_cappuccino_choco_16',
    nombre: 'Jacobs Cappuccino Choco 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 6.29,
    sabor: 'Chocolate',
    url: 'https://kaffek.es/cappuccino-choco-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_crema_intenso_16',
    nombre: 'Jacobs Caffè Crema Intenso 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 5.29,
    url: 'https://kaffek.es/caffe-crema-intenso-jacobs-tassimo.html',
  },
  {
    id: 'jacobs_tassimo_flat_white_16',
    nombre: 'Jacobs Flat White 16 cápsulas para Tassimo',
    marca: 'Jacobs',
    capsulas: 16,
    precio: 6.29,
    url: 'https://kaffek.es/flat-white-jacobs-tassimo.html',
  },

  // ═══ Marcilla Tassimo (4) ═══
  {
    id: 'marcilla_tassimo_cafe_con_leche_16',
    nombre: 'Marcilla Café con Leche 16 cápsulas para Tassimo',
    marca: 'Marcilla',
    capsulas: 16,
    precio: 7.29,
    url: 'https://kaffek.es/cafe-con-leche-marcilla-tassimo.html',
  },
  {
    id: 'marcilla_tassimo_cortado_16',
    nombre: 'Marcilla Cortado 16 cápsulas para Tassimo',
    marca: 'Marcilla',
    capsulas: 16,
    precio: 9.49,
    url: 'https://kaffek.es/marcilla-cortado-tassimo.html',
  },
  {
    id: 'marcilla_tassimo_espresso_16',
    nombre: 'Marcilla Espresso 16 cápsulas para Tassimo',
    marca: 'Marcilla',
    capsulas: 16,
    precio: 5.69,
    url: 'https://kaffek.es/espresso-marcilla-tassimo.html',
  },
  {
    id: 'marcilla_tassimo_largo_16',
    nombre: 'Marcilla Largo 16 cápsulas para Tassimo',
    marca: 'Marcilla',
    capsulas: 16,
    precio: 5.29,
    url: 'https://kaffek.es/largo-marcilla-tassimo.html',
  },

  // ═══ Costa Tassimo (3) ═══
  {
    id: 'costa_tassimo_latte_12',
    nombre: 'Costa Latte 12 cápsulas para Tassimo',
    marca: 'Costa',
    capsulas: 12,
    precio: 3.99,
    url: 'https://kaffek.es/latte-costa-tassimo.html',
  },
  {
    id: 'costa_tassimo_americano_16',
    nombre: 'Costa Americano 16 cápsulas para Tassimo',
    marca: 'Costa',
    capsulas: 16,
    precio: 5.29,
    url: 'https://kaffek.es/americano-costa-tassimo.html',
  },
  {
    id: 'costa_tassimo_cappuccino_12',
    nombre: 'Costa Cappuccino 12 cápsulas para Tassimo',
    marca: 'Costa',
    capsulas: 12,
    precio: 5.29,
    url: 'https://kaffek.es/cappuccino-costa-tassimo.html',
  },

  // ═══ Kenco Tassimo (6) ═══
  {
    id: 'kenco_tassimo_flat_white_16',
    nombre: 'Kenco Flat White 16 cápsulas para Tassimo',
    marca: 'Kenco',
    capsulas: 16,
    precio: 6.19,
    url: 'https://kaffek.es/flat-white-kenco-tassimo.html',
  },
  {
    id: 'kenco_tassimo_americano_grande_xl_16',
    nombre: 'Kenco Americano Grande XL 16 cápsulas para Tassimo',
    marca: 'Kenco',
    capsulas: 16,
    precio: 6.59,
    url: 'https://kaffek.es/americano-grande-xl-kenco-tassimo.html',
  },
  {
    id: 'kenco_tassimo_cafe_au_lait_16',
    nombre: 'Kenco Café au lait 16 cápsulas para Tassimo',
    marca: 'Kenco',
    capsulas: 16,
    precio: 6.49,
    url: 'https://kaffek.es/cafe-au-lait-kenco-tassimo.html',
  },
  {
    id: 'kenco_tassimo_americano_smooth_16',
    nombre: 'Kenco Americano Smooth 16 cápsulas para Tassimo',
    marca: 'Kenco',
    capsulas: 16,
    precio: 5.89,
    url: 'https://kaffek.es/americano-smooth-kenco-tassimo.html',
  },
  {
    id: 'kenco_tassimo_colombian_16',
    nombre: 'Kenco Colombian 16 cápsulas para Tassimo',
    marca: 'Kenco',
    capsulas: 16,
    precio: 6.69,
    origen: 'Colombia',
    url: 'https://kaffek.es/colombian-kenco-tassimo.html',
  },
  {
    id: 'kenco_tassimo_cappuccino_16',
    nombre: 'Kenco Cappuccino 16 cápsulas para Tassimo',
    marca: 'Kenco',
    capsulas: 16,
    precio: 6.59,
    url: 'https://kaffek.es/cappuccino-kenco-tassimo.html',
  },

  // ═══ Milka Tassimo (2) ═══
  {
    id: 'milka_tassimo_cacao_10',
    nombre: 'Milka Cacao 10 cápsulas para Tassimo',
    marca: 'Milka',
    capsulas: 10,
    precio: 6.29,
    sabor: 'Chocolate',
    url: 'https://kaffek.es/milka-cacao-10-tassimo.html',
  },
  {
    id: 'milka_tassimo_pistacho_10',
    nombre: 'Milka Chocolate de pistacho 10 cápsulas para Tassimo',
    marca: 'Milka',
    capsulas: 10,
    precio: 6.09,
    sabor: 'Chocolate y Pistacho',
    url: 'https://kaffek.es/chocolate-pistacho-milka-tassimo-10.html',
  },

  // ═══ Gevalia Tassimo (2) ═══
  {
    id: 'gevalia_tassimo_dark_16',
    nombre: 'Gevalia Dark 16 cápsulas para Tassimo',
    marca: 'Gevalia',
    capsulas: 16,
    precio: 5.59,
    url: 'https://kaffek.es/dark-gevalia-tassimo.html',
  },
  {
    id: 'gevalia_tassimo_original_16',
    nombre: 'Gevalia Original 16 cápsulas para Tassimo',
    marca: 'Gevalia',
    capsulas: 16,
    precio: 4.99,
    url: 'https://kaffek.es/original-gevalia-tassimo.html',
  },

  // ═══ Grand'Mère Tassimo (2) ═══
  {
    id: 'grandmere_tassimo_petit_dejeuner_16',
    nombre: 'Grand Mère Petit Déjeuner 16 cápsulas para Tassimo',
    marca: "Grand'Mère",
    capsulas: 16,
    precio: 4.19,
    url: 'https://kaffek.es/petit-dejeuner-grand-mere-tassimo.html',
  },
  {
    id: 'grandmere_tassimo_espresso_16',
    nombre: 'Grand Mère Espresso 16 cápsulas para Tassimo',
    marca: "Grand'Mère",
    capsulas: 16,
    precio: 4.79,
    url: 'https://kaffek.es/espresso-grand-mere-tassimo.html',
  },

  // ═══ Baileys Tassimo (1) ═══
  {
    id: 'baileys_tassimo_latte_macchiato_16',
    nombre: 'Baileys Latte Macchiato 16 cápsulas para Tassimo',
    marca: 'Baileys',
    capsulas: 16,
    precio: 6.19,
    sabor: 'Baileys',
    url: 'https://kaffek.es/latte-macchiato-baileys-tassimo.html',
  },

  // ═══ Café Hag Tassimo (1) ═══
  {
    id: 'cafehag_tassimo_crema_descaf_16',
    nombre: 'Café Hag Crema Descafeinado 16 cápsulas para Tassimo',
    marca: 'Café Hag',
    capsulas: 16,
    precio: 6.59,
    descafeinado: true,
    url: 'https://kaffek.es/cafe-hag-crema-descafeinado-tassimo.html',
  },

  // ═══ Coffee Shop Selections Tassimo (3) ═══
  {
    id: 'coffeeshop_tassimo_chai_latte_10',
    nombre: 'Coffee Shop Selections Chai Latte 10 cápsulas para Tassimo',
    marca: 'Coffee Shop Selections',
    capsulas: 10,
    precio: 5.69,
    sabor: 'Chai',
    url: 'https://kaffek.es/chai-latte-tassimo.html',
  },
  {
    id: 'coffeeshop_tassimo_toffee_nut_latte_16',
    nombre: 'Coffee Shop Selections Toffee Nut Latte 16 cápsulas para Tassimo',
    marca: 'Coffee Shop Selections',
    capsulas: 16,
    precio: 6.39,
    sabor: 'Toffee',
    url: 'https://kaffek.es/toffee-nut-latte-coffee-shop-selections-tassimo.html',
  },
  {
    id: 'coffeeshop_tassimo_flat_white_16',
    nombre: 'Coffee Shop Selections Flat White 16 cápsulas para Tassimo',
    marca: 'Coffee Shop Selections',
    capsulas: 16,
    precio: 5.69,
    url: 'https://kaffek.es/flat-white-coffee-shop-selections-tassimo.html',
  },

  // ═══ Friele Tassimo (1) ═══
  {
    id: 'friele_tassimo_cafe_manana_16',
    nombre: 'Friele Café de la Mañana 16 cápsulas para Tassimo',
    marca: 'Friele',
    capsulas: 16,
    precio: 5.59,
    url: 'https://kaffek.es/cafe-de-la-mana-a-friele-tassimo.html',
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
  console.log(`\n=== Importing ${ALL.length} Tassimo products from kaffek.es ===\n`);
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
    if (p.origen) data.origen = p.origen;
    if (p.descafeinado) data.descafeinado = true;

    if (imgUrl) {
      try {
        const photoUrl = await uploadPhoto(p.id, imgUrl);
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
      await db.collection('cafes').doc(p.id).set(data);
      created++;
      console.log(` → ${p.precio}€ ${imgUrl ? '📸' : '⚠️'}`);
    } catch (e) {
      console.log(` DB ERR: ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Created: ${created} | Skipped: ${skipped} | Photos: ${photos} | Errors: ${errors}`);
  process.exit(0);
})();
