#!/usr/bin/env node
/**
 * _import_belmio_caferene_dolcevita.js – April 2026
 * Imports 3 NEW brands from kaffek.es:
 *   - Belmio: 13 Nespresso capsules (flavored coffees)
 *   - Café René: 9 Nespresso + 9 Senseo + 15 Dolce Gusto = 33 coffee products
 *   - Dolce Vita: 11 Nespresso capsules (flavored/specialty)
 * Total: ~57 new products
 * Auto-discovers images from product pages (no manual image filenames needed)
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
const IMG_BASE =
  'https://kaffekapslen.media/media/catalog/product/cache/999c06501d91fbafc897cca169a07457/';

// ─── BELMIO (13 Nespresso) ──────────────────────────────────────
const BELMIO = [
  {
    id: 'belmio_nesp_chocolate_therapy_10',
    nombre: 'Belmio Chocolate Therapy 10 cápsulas para Nespresso',
    precio: 2.69,
    intensidad: 6,
    descafeinado: false,
    sabor: 'Chocolate',
    url: 'https://kaffek.es/chocolate-therapy-belmio-nespresso.html',
  },
  {
    id: 'belmio_nesp_lets_go_coconutz_10',
    nombre: "Belmio Let's go Coconutz 10 cápsulas para Nespresso",
    precio: 2.85,
    intensidad: 6,
    descafeinado: false,
    sabor: 'Coco',
    url: 'https://kaffek.es/lets-go-coconutz-belmio-nespresso.html',
  },
  {
    id: 'belmio_nesp_madame_creme_brulee_10',
    nombre: 'Belmio Madame Crème Brulée 10 cápsulas para Nespresso',
    precio: 2.65,
    intensidad: 6,
    descafeinado: false,
    sabor: 'Crème Brûlée',
    url: 'https://kaffek.es/madame-creme-brulee-belmio-nespresso.html',
  },
  {
    id: 'belmio_nesp_caramel_caramba_10',
    nombre: 'Belmio Caramel Caramba 10 cápsulas para Nespresso',
    precio: 2.65,
    intensidad: 6,
    descafeinado: false,
    sabor: 'Caramelo',
    url: 'https://kaffek.es/caramel-caramba-belmio-nespresso.html',
  },
  {
    id: 'belmio_nesp_irish_dream_10',
    nombre: 'Belmio Irish Dream 10 cápsulas para Nespresso',
    precio: 2.85,
    intensidad: 6,
    descafeinado: false,
    sabor: 'Irish Cream',
    url: 'https://kaffek.es/irish-dream-belmio-nespresso.html',
  },
  {
    id: 'belmio_nesp_arabic_cardamom_10',
    nombre: 'Belmio Arabic Cardamom 10 cápsulas para Nespresso',
    precio: 3.09,
    intensidad: 6,
    descafeinado: false,
    sabor: 'Cardamomo',
    url: 'https://kaffek.es/arabic-cardamom-belmio-nespresso.html',
  },
  {
    id: 'belmio_nesp_viva_la_vanilla_10',
    nombre: 'Belmio Viva la Vanilla 10 cápsulas para Nespresso',
    precio: 2.85,
    intensidad: 6,
    descafeinado: false,
    sabor: 'Vainilla',
    url: 'https://kaffek.es/viva-la-vanilla-belmio-nespresso.html',
  },
  {
    id: 'belmio_nesp_decaf_caramel_10',
    nombre: 'Belmio Decaffeinato Caramel 10 cápsulas para Nespresso',
    precio: 3.19,
    intensidad: 6,
    descafeinado: true,
    sabor: 'Caramelo',
    url: 'https://kaffek.es/decaffeinato-caramel-belmio-nespresso.html',
  },
  {
    id: 'belmio_nesp_driving_hazelnuts_10',
    nombre: 'Belmio Driving you Hazelnuts 10 cápsulas para Nespresso',
    precio: 2.95,
    intensidad: 6,
    descafeinado: false,
    sabor: 'Avellana',
    url: 'https://kaffek.es/driving-you-hazelnuts-belmio-nespresso.html',
  },
  {
    id: 'belmio_nesp_espresso_descaf_10',
    nombre: 'Belmio Espresso Descafeinado 10 cápsulas para Nespresso',
    precio: 2.99,
    intensidad: 6,
    descafeinado: true,
    url: 'https://kaffek.es/espresso-decaffeinato-belmio-nespresso.html',
  },
  {
    id: 'belmio_nesp_pumpkin_spice_10',
    nombre: 'Belmio Pumpkin Spice 10 cápsulas para Nespresso',
    precio: 2.25,
    intensidad: 6,
    descafeinado: false,
    sabor: 'Calabaza especiada',
    url: 'https://kaffek.es/pumpkin-spice-belmio-nespresso.html',
  },
  {
    id: 'belmio_nesp_gingerbread_10',
    nombre: 'Belmio Galleta de Jengibre 10 cápsulas para Nespresso',
    precio: 2.65,
    intensidad: 6,
    descafeinado: false,
    sabor: 'Jengibre',
    url: 'https://kaffek.es/gingerbread-belmio-nespresso.html',
  },
  {
    id: 'belmio_nesp_pistachio_gelato_10',
    nombre: 'Belmio Pistachio Gelato 10 cápsulas para Nespresso',
    precio: 2.75,
    intensidad: 6,
    descafeinado: false,
    sabor: 'Pistacho',
    url: 'https://kaffek.es/pistachio-gelato-belmio-nespresso-10.html',
  },
];

// ─── CAFÉ RENÉ – Nespresso (9) ─────────────────────────────────
const CAFE_RENE_NESP = [
  {
    id: 'caferene_nesp_espresso_descaf_10',
    nombre: 'Café René Espresso Descafeinado 10 cápsulas para Nespresso',
    precio: 1.49,
    descafeinado: true,
    url: 'https://kaffek.es/espresso-decaffeinato-cafe-rene-nespresso.html',
  },
  {
    id: 'caferene_nesp_avellana_10',
    nombre: 'Café René Avellana 10 cápsulas para Nespresso',
    precio: 1.95,
    descafeinado: false,
    sabor: 'Avellana',
    url: 'https://kaffek.es/avellana-cafe-rene-nespresso.html',
  },
  {
    id: 'caferene_nesp_chocolate_10',
    nombre: 'Café René Chocolate 10 cápsulas para Nespresso',
    precio: 1.69,
    descafeinado: false,
    sabor: 'Chocolate',
    url: 'https://kaffek.es/chocolate-cafe-rene-nespresso.html',
  },
  {
    id: 'caferene_nesp_lungo_100',
    nombre: 'Café René Lungo 100 cápsulas para Nespresso',
    precio: 13.89,
    capsulas: 100,
    formato: '100 cápsulas',
    descafeinado: false,
    url: 'https://kaffek.es/big-pack-100-lungo-cafe-rene-nespresso.html',
  },
  {
    id: 'caferene_nesp_lungo_milano_100',
    nombre: 'Café René Lungo Milano 100 cápsulas para Nespresso',
    precio: 13.89,
    capsulas: 100,
    formato: '100 cápsulas',
    descafeinado: false,
    url: 'https://kaffek.es/big-pack-100-lungo-milano-cafe-rene-nespresso.html',
  },
  {
    id: 'caferene_nesp_lungo_forte_100',
    nombre: 'Café René Lungo Forte 100 cápsulas para Nespresso',
    precio: 13.99,
    capsulas: 100,
    formato: '100 cápsulas',
    descafeinado: false,
    url: 'https://kaffek.es/big-pack-100-lungo-forte-cafe-rene-nespresso.html',
  },
  {
    id: 'caferene_nesp_sublimo_100',
    nombre: 'Café René Sublimo 100 cápsulas para Nespresso',
    precio: 13.99,
    capsulas: 100,
    formato: '100 cápsulas',
    descafeinado: false,
    url: 'https://kaffek.es/big-pack-100-sublimo-cafe-rene-nespresso.html',
  },
  {
    id: 'caferene_nesp_intensiva_100',
    nombre: 'Café René Intensiva 100 cápsulas para Nespresso',
    precio: 14.09,
    capsulas: 100,
    formato: '100 cápsulas',
    descafeinado: false,
    url: 'https://kaffek.es/big-pack-100-intensiva-cafe-rene-nespresso.html',
  },
  {
    id: 'caferene_nesp_leche_10',
    nombre: 'Café René Leche 10 cápsulas para Nespresso',
    precio: 1.25,
    descafeinado: false,
    sabor: 'Leche',
    url: 'https://kaffek.es/leche-cafe-rene-nespresso.html',
  },
];

// ─── CAFÉ RENÉ – Senseo (9) ────────────────────────────────────
const CAFE_RENE_SENSEO = [
  {
    id: 'caferene_senseo_strong_36',
    nombre: 'Café René Strong 36 monodosis para Senseo',
    precio: 3.49,
    capsulas: 36,
    formato: '36 monodosis',
    descafeinado: false,
    url: 'https://kaffek.es/big-pack-strong-cafe-rene-senseo.html',
  },
  {
    id: 'caferene_senseo_classic_xl_20',
    nombre: 'Café René Classic Taza Grande 20 monodosis para Senseo',
    precio: 3.49,
    capsulas: 20,
    formato: '20 monodosis',
    descafeinado: false,
    url: 'https://kaffek.es/classic-xl-large-cup-cafe-rene-senseo.html',
  },
  {
    id: 'caferene_senseo_almendra_18',
    nombre: 'Café René Almendra 18 monodosis para Senseo',
    precio: 2.49,
    capsulas: 18,
    formato: '18 monodosis',
    descafeinado: false,
    sabor: 'Almendra',
    url: 'https://kaffek.es/almendra-cafe-rene-senseo.html',
  },
  {
    id: 'caferene_senseo_classic_36',
    nombre: 'Café René Classic 36 monodosis para Senseo',
    precio: 3.59,
    capsulas: 36,
    formato: '36 monodosis',
    descafeinado: false,
    url: 'https://kaffek.es/big-pack-36-classic-cafe-rene-senseo.html',
  },
  {
    id: 'caferene_senseo_avellana_18',
    nombre: 'Café René Avellana 18 monodosis para Senseo',
    precio: 2.49,
    capsulas: 18,
    formato: '18 monodosis',
    descafeinado: false,
    sabor: 'Avellana',
    url: 'https://kaffek.es/avellana-cafe-rene-senseo.html',
  },
  {
    id: 'caferene_senseo_espresso_36',
    nombre: 'Café René Espresso 36 monodosis para Senseo',
    precio: 3.89,
    capsulas: 36,
    formato: '36 monodosis',
    descafeinado: false,
    url: 'https://kaffek.es/big-pack-36-espresso-cafe-rene-senseo.html',
  },
  {
    id: 'caferene_senseo_strong_xl_20',
    nombre: 'Café René Strong Taza Grande 20 monodosis para Senseo',
    precio: 3.49,
    capsulas: 20,
    formato: '20 monodosis',
    descafeinado: false,
    url: 'https://kaffek.es/strong-xl-large-cup-cafe-rene-senseo.html',
  },
  {
    id: 'caferene_senseo_caramelo_18',
    nombre: 'Café René Caramelo 18 monodosis para Senseo',
    precio: 2.49,
    capsulas: 18,
    formato: '18 monodosis',
    descafeinado: false,
    sabor: 'Caramelo',
    url: 'https://kaffek.es/karamel-cafe-rene-senseo.html',
  },
  {
    id: 'caferene_senseo_vainilla_18',
    nombre: 'Café René Vainilla 18 monodosis para Senseo',
    precio: 2.49,
    capsulas: 18,
    formato: '18 monodosis',
    descafeinado: false,
    sabor: 'Vainilla',
    url: 'https://kaffek.es/vainilla-cafe-rene-senseo.html',
  },
];

// ─── CAFÉ RENÉ – Dolce Gusto (15 coffee products) ──────────────
const CAFE_RENE_DG = [
  {
    id: 'caferene_dg_cappuccino_16',
    nombre: 'Café René Cappuccino 16 cápsulas para Dolce Gusto',
    precio: 3.69,
    capsulas: 16,
    formato: '16 cápsulas',
    descafeinado: false,
    url: 'https://kaffek.es/cappuccino-cafe-rene-dolce-gusto.html',
  },
  {
    id: 'caferene_dg_cafe_au_lait_16',
    nombre: 'Café René Café au Lait 16 cápsulas para Dolce Gusto',
    precio: 3.89,
    capsulas: 16,
    formato: '16 cápsulas',
    descafeinado: false,
    url: 'https://kaffek.es/cafe-au-lait-cafe-rene-dolce-gusto.html',
  },
  {
    id: 'caferene_dg_latte_macchiato_16',
    nombre: 'Café René Latte Macchiato 16 cápsulas para Dolce Gusto',
    precio: 3.59,
    capsulas: 16,
    formato: '16 cápsulas',
    descafeinado: false,
    url: 'https://kaffek.es/latte-macchiato-cafe-rene-dolce-gusto.html',
  },
  {
    id: 'caferene_dg_latte_macch_caramel_16',
    nombre: 'Café René Latte Macchiato Caramel 16 cápsulas para Dolce Gusto',
    precio: 3.69,
    capsulas: 16,
    formato: '16 cápsulas',
    descafeinado: false,
    sabor: 'Caramelo',
    url: 'https://kaffek.es/latte-macchiato-caramel-cafe-rene-dolce-gusto.html',
  },
  {
    id: 'caferene_dg_vanilla_latte_16',
    nombre: 'Café René Latte Macchiato Vainilla 16 cápsulas para Dolce Gusto',
    precio: 3.69,
    capsulas: 16,
    formato: '16 cápsulas',
    descafeinado: false,
    sabor: 'Vainilla',
    url: 'https://kaffek.es/vanilla-latte-macchiato-cafe-rene-dolce-gusto.html',
  },
  {
    id: 'caferene_dg_grande_16',
    nombre: 'Café René Grande 16 cápsulas para Dolce Gusto',
    precio: 3.29,
    capsulas: 16,
    formato: '16 cápsulas',
    descafeinado: false,
    url: 'https://kaffek.es/grande-cafe-rene-dolce-gusto.html',
  },
  {
    id: 'caferene_dg_descafeinado_16',
    nombre: 'Café René Grande Descafeinado 16 cápsulas para Dolce Gusto',
    precio: 3.39,
    capsulas: 16,
    formato: '16 cápsulas',
    descafeinado: true,
    url: 'https://kaffek.es/cafe-descafeinado-cafe-rene-dolce-gusto.html',
  },
  {
    id: 'caferene_dg_lungo_forte_16',
    nombre: 'Café René Lungo Forte 16 cápsulas para Dolce Gusto',
    precio: 3.29,
    capsulas: 16,
    formato: '16 cápsulas',
    descafeinado: false,
    url: 'https://kaffek.es/lungo-forte-cafe-rene-dolce-gusto.html',
  },
  {
    id: 'caferene_dg_americano_16',
    nombre: 'Café René Americano 16 cápsulas para Dolce Gusto',
    precio: 3.29,
    capsulas: 16,
    formato: '16 cápsulas',
    descafeinado: false,
    url: 'https://kaffek.es/americano-cafe-rene-dolce-gusto.html',
  },
  {
    id: 'caferene_dg_espresso_16',
    nombre: 'Café René Espresso 16 cápsulas para Dolce Gusto',
    precio: 3.29,
    capsulas: 16,
    formato: '16 cápsulas',
    descafeinado: false,
    url: 'https://kaffek.es/espresso-cafe-rene-dolce-gusto.html',
  },
  {
    id: 'caferene_dg_cafe_avellana_16',
    nombre: 'Café René Café Avellana 16 cápsulas para Dolce Gusto',
    precio: 3.69,
    capsulas: 16,
    formato: '16 cápsulas',
    descafeinado: false,
    sabor: 'Avellana',
    url: 'https://kaffek.es/cafe-de-avellana-cafe-rene-dolce-gusto.html',
  },
  {
    id: 'caferene_dg_cafe_vainilla_16',
    nombre: 'Café René Café Vainilla 16 cápsulas para Dolce Gusto',
    precio: 4.29,
    capsulas: 16,
    formato: '16 cápsulas',
    descafeinado: false,
    sabor: 'Vainilla',
    url: 'https://kaffek.es/cafe-de-vainilla-cafe-rene-dolce-gusto.html',
  },
  {
    id: 'caferene_dg_cafe_caramelo_16',
    nombre: 'Café René Café Caramelo 16 cápsulas para Dolce Gusto',
    precio: 3.79,
    capsulas: 16,
    formato: '16 cápsulas',
    descafeinado: false,
    sabor: 'Caramelo',
    url: 'https://kaffek.es/cafe-de-caramelo-cafe-rene-dolce-gusto.html',
  },
  {
    id: 'caferene_dg_cafe_chocolate_16',
    nombre: 'Café René Café Chocolate 16 cápsulas para Dolce Gusto',
    precio: 3.49,
    capsulas: 16,
    formato: '16 cápsulas',
    descafeinado: false,
    sabor: 'Chocolate',
    url: 'https://kaffek.es/chocolate-cafe-cafe-rene-dolce-gusto.html',
  },
  {
    id: 'caferene_dg_ice_coffee_caramel_16',
    nombre: 'Café René Café Helado Caramelo 16 cápsulas para Dolce Gusto',
    precio: 4.09,
    capsulas: 16,
    formato: '16 cápsulas',
    descafeinado: false,
    sabor: 'Caramelo',
    url: 'https://kaffek.es/ice-coffee-caramel-cafe-rene-dolce-gusto.html',
  },
];

// ─── DOLCE VITA – Nespresso (11) ───────────────────────────────
const DOLCE_VITA_NESP = [
  {
    id: 'dolcevita_nesp_mokaccino_10',
    nombre: 'Dolce Vita Mokaccino 10 cápsulas para Nespresso',
    precio: 1.65,
    descafeinado: false,
    sabor: 'Mokaccino',
    url: 'https://kaffek.es/mokaccino-dolce-vita-nespresso-10.html',
  },
  {
    id: 'dolcevita_nesp_caramelito_10',
    nombre: 'Dolce Vita Caramelito Cappuccino Caramelo 10 cápsulas para Nespresso',
    precio: 1.55,
    descafeinado: false,
    sabor: 'Caramelo',
    url: 'https://kaffek.es/caramelito-dolce-vita-nespresso-10.html',
  },
  {
    id: 'dolcevita_nesp_nocciolino_10',
    nombre: 'Dolce Vita Nocciolino Cappuccino Avellana 10 cápsulas para Nespresso',
    precio: 2.09,
    descafeinado: false,
    sabor: 'Avellana',
    url: 'https://kaffek.es/nocciolino-dolce-vita-nespresso-10.html',
  },
  {
    id: 'dolcevita_nesp_vaniglietta_10',
    nombre: 'Dolce Vita Vaniglietta Cappuccino Vainilla 10 cápsulas para Nespresso',
    precio: 1.55,
    descafeinado: false,
    sabor: 'Vainilla',
    url: 'https://kaffek.es/vaniglietta-dolce-vita-nespresso-10.html',
  },
  {
    id: 'dolcevita_nesp_biscottino_10',
    nombre: 'Dolce Vita Biscottino Speculoos 10 cápsulas para Nespresso',
    precio: 2.49,
    descafeinado: false,
    sabor: 'Speculoos',
    url: 'https://kaffek.es/biscottino-dolce-vita-nespresso-10.html',
  },
  {
    id: 'dolcevita_nesp_creme_brulee_10',
    nombre: 'Dolce Vita Crème Brûlée 10 cápsulas para Nespresso',
    precio: 1.79,
    descafeinado: false,
    sabor: 'Crème Brûlée',
    url: 'https://kaffek.es/creme-brulee-dolce-vita-nespresso-10.html',
  },
  {
    id: 'dolcevita_nesp_miniciok_10',
    nombre: 'Dolce Vita Miniciok Chocolate 10 cápsulas para Nespresso',
    precio: 1.59,
    descafeinado: false,
    sabor: 'Chocolate',
    url: 'https://kaffek.es/miniciok-dolce-vita-nespresso-10.html',
  },
  {
    id: 'dolcevita_nesp_cioccolatte_10',
    nombre: 'Dolce Vita Ciocco Latte Chocolate 10 cápsulas para Nespresso',
    precio: 1.65,
    descafeinado: false,
    sabor: 'Chocolate con leche',
    url: 'https://kaffek.es/ciocco-latte-dolce-vita-nespresso-10.html',
  },
  {
    id: 'dolcevita_nesp_cioccomenta_10',
    nombre: 'Dolce Vita Cioccomenta Chocolate con Menta 10 cápsulas para Nespresso',
    precio: 1.65,
    descafeinado: false,
    sabor: 'Chocolate menta',
    url: 'https://kaffek.es/cioccomenta-dolce-vita-nespresso-10.html',
  },
  {
    id: 'dolcevita_nesp_almendra_macaron_10',
    nombre: 'Dolce Vita Almendra Macaron 10 cápsulas para Nespresso',
    precio: 1.55,
    descafeinado: false,
    sabor: 'Almendra',
    url: 'https://kaffek.es/almendra-macaron-dolce-vita-nespresso-10.html',
  },
  {
    id: 'dolcevita_nesp_te_limon_10',
    nombre: 'Dolce Vita Té de Limón 10 cápsulas para Nespresso',
    precio: 2.19,
    descafeinado: false,
    sabor: 'Limón',
    url: 'https://kaffek.es/te-de-limon-dolce-vita-nespresso-10.html',
  },
];

// ─── Build unified list with brand metadata ────────────────────

function withMeta(list, marca, sistema, defaults = {}) {
  return list.map((p) => ({
    ...p,
    marca,
    sistema,
    compatibilidad: sistema,
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: p.formato || '10 cápsulas',
    tamano: p.formato || '10 cápsulas',
    capsulas: p.capsulas || 10,
    ...defaults,
  }));
}

const ALL = [
  ...withMeta(BELMIO, 'Belmio', 'Nespresso'),
  ...withMeta(CAFE_RENE_NESP, 'Café René', 'Nespresso'),
  ...withMeta(CAFE_RENE_SENSEO, 'Café René', 'Senseo'),
  ...withMeta(CAFE_RENE_DG, 'Café René', 'Dolce Gusto'),
  ...withMeta(DOLCE_VITA_NESP, 'Dolce Vita', 'Nespresso'),
];

// ─── Helpers ────────────────────────────────────────────────────

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const get = (u) =>
      https
        .get(u, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
            return get(res.headers.location);
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () =>
            resolve({ text: Buffer.concat(chunks).toString(), status: res.statusCode })
          );
          res.on('error', reject);
        })
        .on('error', reject);
    get(url);
  });
}

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    const get = (u) =>
      https
        .get(u, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
            return get(res.headers.location);
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve({ buf: Buffer.concat(chunks), status: res.statusCode }));
          res.on('error', reject);
        })
        .on('error', reject);
    get(url);
  });
}

/** Fetch product page and extract first kaffekapslen CDN image URL */
async function discoverImageUrl(productUrl) {
  try {
    const { text, status } = await fetchText(productUrl);
    if (status !== 200) return null;
    // Match: kaffekapslen.media/media/catalog/product/cache/…/X/Y/filename-1201.webp
    const m = text.match(
      /https:\/\/kaffekapslen\.media\/media\/catalog\/product\/cache\/[^"'\s]+?-1201\.webp/
    );
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

async function uploadPhoto(docId, imgUrl) {
  const { buf, status } = await fetchBuf(imgUrl);
  if (buf.length < 1000) {
    console.log(`  SKIP photo: too small (${buf.length}b, status:${status})`);
    return null;
  }
  const out = await sharp(buf)
    .resize(800, 800, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
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
  console.log(`\n=== Importing ${ALL.length} products (3 brands) ===\n`);
  let created = 0,
    photos = 0,
    errors = 0;
  const byBrand = {};

  for (const p of ALL) {
    const docId = p.id;
    if (!byBrand[p.marca]) byBrand[p.marca] = 0;
    console.log(`\nCREATE: ${docId}`);

    // Discover image
    let imgUrl = null;
    try {
      imgUrl = await discoverImageUrl(p.url);
      if (imgUrl) console.log(`  Image found: ...${imgUrl.slice(-40)}`);
      else console.log(`  Image NOT found on page`);
    } catch (e) {
      console.log(`  Image discover error: ${e.message}`);
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
    if (p.intensidad) data.intensidad = p.intensidad;
    if (p.descafeinado) data.descafeinado = true;
    if (p.sabor) data.sabor = p.sabor;
    if (p.origen) data.origen = p.origen;

    // Upload photo
    if (imgUrl) {
      try {
        const photoUrl = await uploadPhoto(docId, imgUrl);
        if (photoUrl) {
          Object.assign(data, photoFields(photoUrl));
          photos++;
          console.log(`  Photo OK`);
        }
      } catch (e) {
        console.log(`  Photo ERROR: ${e.message}`);
        errors++;
      }
    }

    try {
      await db.collection('cafes').doc(docId).set(data);
      created++;
      byBrand[p.marca]++;
      console.log(`  Created: ${p.nombre} → ${p.precio}€`);
    } catch (e) {
      console.log(`  DB ERROR: ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Created: ${created}`);
  console.log(`Photos:  ${photos}`);
  console.log(`Errors:  ${errors}`);
  console.log('By brand:');
  for (const [b, c] of Object.entries(byBrand)) console.log(`  ${b}: ${c}`);
  process.exit(0);
})();
