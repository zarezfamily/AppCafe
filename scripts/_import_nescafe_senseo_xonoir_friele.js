#!/usr/bin/env node
/**
 * _import_nescafe_senseo_xonoir_friele.js – April 2026
 * Imports from kaffek.es:
 *   - Nescafé DG+NCC (29 products)
 *   - Senseo own brand (20 products)
 *   - XO Noir NCC+Pro (7 products)
 *   - Friele Tassimo+Senseo (3 products)
 *   - Café Hag Tassimo (1 product)
 *   - Grand'Mère Senseo (1 product)
 *   - Baileys Senseo (1 product)
 * Total: 62 new products
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
// NESCAFÉ – Dolce Gusto (27)
// ═══════════════════════════════════════════════════════════════
const NESCAFE_DG = [
  {
    id: 'nescafe_dg_ristretto_barista_16',
    nombre: 'Nescafé Ristretto Barista 16 cápsulas para Dolce Gusto',
    precio: 5.69,
    capsulas: 16,
    url: 'https://kaffek.es/ristretto-barista-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_ristretto_barista_30',
    nombre: 'Nescafé Ristretto Barista 30 cápsulas para Dolce Gusto',
    precio: 9.99,
    capsulas: 30,
    formato: '30 cápsulas',
    url: 'https://kaffek.es/big-pack-ristretto-barista-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_ristretto_ardenza_16',
    nombre: 'Nescafé Ristretto Ardenza 16 cápsulas para Dolce Gusto',
    precio: 5.59,
    capsulas: 16,
    url: 'https://kaffek.es/ristretto-ardenza-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_ristretto_ardenza_30',
    nombre: 'Nescafé Ristretto Ardenza 30 cápsulas para Dolce Gusto',
    precio: 8.59,
    capsulas: 30,
    formato: '30 cápsulas',
    url: 'https://kaffek.es/big-pack-ristretto-ardenza-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_espresso_roma_16',
    nombre: 'Nescafé Espresso Roma 16 cápsulas para Dolce Gusto',
    precio: 4.79,
    capsulas: 16,
    url: 'https://kaffek.es/espresso-roma-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_lungo_30',
    nombre: 'Nescafé Lungo 30 cápsulas para Dolce Gusto',
    precio: 8.39,
    capsulas: 30,
    formato: '30 cápsulas',
    url: 'https://kaffek.es/big-pack-lungo-30-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_doppio_espresso_16',
    nombre: 'Nescafé Doppio Espresso 16 cápsulas para Dolce Gusto',
    precio: 6.09,
    capsulas: 16,
    url: 'https://kaffek.es/espresso-doppio-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_cortado_30',
    nombre: 'Nescafé Cortado 30 cápsulas para Dolce Gusto',
    precio: 10.89,
    capsulas: 30,
    formato: '30 cápsulas',
    url: 'https://kaffek.es/big-pack-cortado-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_espresso_napoli_16',
    nombre: 'Nescafé Espresso Napoli 16 cápsulas para Dolce Gusto',
    precio: 5.99,
    capsulas: 16,
    url: 'https://kaffek.es/espresso-napoli-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_espresso_30',
    nombre: 'Nescafé Espresso 30 cápsulas para Dolce Gusto',
    precio: 8.79,
    capsulas: 30,
    formato: '30 cápsulas',
    url: 'https://kaffek.es/big-pack-30-espresso-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_grande_16',
    nombre: 'Nescafé Grande 16 cápsulas para Dolce Gusto',
    precio: 5.79,
    capsulas: 16,
    url: 'https://kaffek.es/grande-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_grande_30',
    nombre: 'Nescafé Grande 30 cápsulas para Dolce Gusto',
    precio: 8.89,
    capsulas: 30,
    formato: '30 cápsulas',
    url: 'https://kaffek.es/big-pack-30-grande-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_flat_white_30',
    nombre: 'Nescafé Flat White 30 cápsulas para Dolce Gusto',
    precio: 8.59,
    capsulas: 30,
    formato: '30 cápsulas',
    url: 'https://kaffek.es/flat-white-dolce-gusto-nescafe-30.html',
  },
  {
    id: 'nescafe_dg_americano_descaf_16',
    nombre: 'Nescafé Americano Descafeinado 16 cápsulas para Dolce Gusto',
    precio: 5.79,
    capsulas: 16,
    descafeinado: true,
    url: 'https://kaffek.es/americano-decaffeinato-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_skinny_cappuccino_16',
    nombre: 'Nescafé Skinny Cappuccino 16 cápsulas para Dolce Gusto',
    precio: 5.79,
    capsulas: 16,
    url: 'https://kaffek.es/cappuccino-light-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_cappuccino_16',
    nombre: 'Nescafé Cappuccino 16 cápsulas para Dolce Gusto',
    precio: 5.79,
    capsulas: 16,
    url: 'https://kaffek.es/cappuccino-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_cappuccino_30',
    nombre: 'Nescafé Cappuccino 30 cápsulas para Dolce Gusto',
    precio: 10.79,
    capsulas: 30,
    formato: '30 cápsulas',
    url: 'https://kaffek.es/big-pack-cappuccino-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_lungo_intenso_16',
    nombre: 'Nescafé Lungo Intenso 16 cápsulas para Dolce Gusto',
    precio: 5.79,
    capsulas: 16,
    url: 'https://kaffek.es/lungo-intenso-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_zoegas_mollbergs_16',
    nombre: 'Nescafé Zoégas Mollbergs 16 cápsulas para Dolce Gusto',
    precio: 5.69,
    capsulas: 16,
    url: 'https://kaffek.es/zoegas-mollberg-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_miami_morning_18',
    nombre: 'Nescafé Miami Morning Blend 18 cápsulas para Dolce Gusto',
    precio: 5.69,
    capsulas: 18,
    formato: '18 cápsulas',
    url: 'https://kaffek.es/miami-morning-blend-grande-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_cafe_au_lait_30',
    nombre: 'Nescafé Café au Lait 30 cápsulas para Dolce Gusto',
    precio: 8.69,
    capsulas: 30,
    formato: '30 cápsulas',
    url: 'https://kaffek.es/big-pack-30-cafe-au-lait-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_iced_frappe_16',
    nombre: 'Nescafé Iced Frappé 16 cápsulas para Dolce Gusto',
    precio: 5.59,
    capsulas: 16,
    url: 'https://kaffek.es/iced-frappe-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_buondi_original_16',
    nombre: 'Nescafé Buondi Original 16 cápsulas para Dolce Gusto',
    precio: 3.99,
    capsulas: 16,
    url: 'https://kaffek.es/buondi-nescafe-dolce-gusto-16.html',
  },
  {
    id: 'nescafe_dg_buondi_original_30',
    nombre: 'Nescafé Buondi Original 30 cápsulas para Dolce Gusto',
    precio: 8.29,
    capsulas: 30,
    formato: '30 cápsulas',
    url: 'https://kaffek.es/buondi-nescafe-dolce-gusto-30.html',
  },
  {
    id: 'nescafe_dg_caffe_ginseng_16',
    nombre: 'Nescafé Caffè Ginseng 16 cápsulas para Dolce Gusto',
    precio: 4.99,
    capsulas: 16,
    sabor: 'Ginseng',
    url: 'https://kaffek.es/caffe-ginseng-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_ricore_latte_16',
    nombre: 'Nescafé Ricoré Latte 16 cápsulas para Dolce Gusto',
    precio: 4.99,
    capsulas: 16,
    url: 'https://kaffek.es/ricore-latte-nescafe-dolce-gusto.html',
  },
  {
    id: 'nescafe_dg_new_york_morning_18',
    nombre: 'Nescafé New York Morning Blend 18 cápsulas para Dolce Gusto',
    precio: 5.99,
    capsulas: 18,
    formato: '18 cápsulas',
    url: 'https://kaffek.es/new-york-morning-blend-grand-necafe-dolce-gusto.html',
  },
];

// NESCAFÉ – Nespresso (2)
const NESCAFE_NCC = [
  {
    id: 'nescafe_ncc_india_espresso_10',
    nombre: 'Nescafé India Espresso 10 cápsulas para Nespresso',
    precio: 2.85,
    capsulas: 10,
    url: 'https://kaffek.es/india-espresso-nescafe-nespresso.html',
  },
  {
    id: 'nescafe_ncc_andes_lungo_10',
    nombre: 'Nescafé Andes Lungo 10 cápsulas para Nespresso',
    precio: 2.79,
    capsulas: 10,
    url: 'https://kaffek.es/farmers-origins-andes-nescafe-nespresso.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// SENSEO – own brand (20)
// ═══════════════════════════════════════════════════════════════
const SENSEO_OWN = [
  {
    id: 'senseo_mild_48',
    nombre: 'Senseo Mild 48 monodosis para Senseo',
    precio: 8.39,
    capsulas: 48,
    formato: '48 monodosis',
    url: 'https://kaffek.es/mild-xl-senseo-senseo.html',
  },
  {
    id: 'senseo_gold_36',
    nombre: 'Senseo Gold 36 monodosis para Senseo',
    precio: 7.29,
    capsulas: 36,
    formato: '36 monodosis',
    url: 'https://kaffek.es/gold-36-senseo-senseo.html',
  },
  {
    id: 'senseo_strong_48',
    nombre: 'Senseo Strong 48 monodosis para Senseo',
    precio: 9.29,
    capsulas: 48,
    formato: '48 monodosis',
    url: 'https://kaffek.es/strong-48-senseo-senseo.html',
  },
  {
    id: 'senseo_decaf_40',
    nombre: 'Senseo Decaf 40 monodosis para Senseo',
    precio: 8.49,
    capsulas: 40,
    formato: '40 monodosis',
    descafeinado: true,
    url: 'https://kaffek.es/senseo-decaf-40-senseo-senseo.html',
  },
  {
    id: 'senseo_corse_xl_60',
    nombre: 'Senseo Corsé XL 60 monodosis para Senseo',
    precio: 11.59,
    capsulas: 60,
    formato: '60 monodosis',
    url: 'https://kaffek.es/corse-xl-senseo-senseo.html',
  },
  {
    id: 'senseo_classic_48',
    nombre: 'Senseo Classic 48 monodosis para Senseo',
    precio: 9.19,
    capsulas: 48,
    formato: '48 monodosis',
    url: 'https://kaffek.es/classic-48-senseo-senseo.html',
  },
  {
    id: 'senseo_caramelo_32',
    nombre: 'Senseo Caramelo 32 monodosis para Senseo',
    precio: 4.99,
    capsulas: 32,
    formato: '32 monodosis',
    sabor: 'Caramelo',
    url: 'https://kaffek.es/caramelo-senseo-senseo.html',
  },
  {
    id: 'senseo_vainilla_32',
    nombre: 'Senseo Vainilla 32 monodosis para Senseo',
    precio: 5.79,
    capsulas: 32,
    formato: '32 monodosis',
    sabor: 'Vainilla',
    url: 'https://kaffek.es/vainilla-senseo-senseo.html',
  },
  {
    id: 'senseo_espresso_16',
    nombre: 'Senseo Espresso 16 monodosis para Senseo',
    precio: 3.29,
    capsulas: 16,
    url: 'https://kaffek.es/espresso-senseo-senseo.html',
  },
  {
    id: 'senseo_cafe_latte_8',
    nombre: 'Senseo Café Latte 8 monodosis para Senseo',
    precio: 2.99,
    capsulas: 8,
    formato: '8 monodosis',
    url: 'https://kaffek.es/cafe-latte-senseo.html',
  },
  {
    id: 'senseo_cappuccino_16',
    nombre: 'Senseo Cappuccino 16 monodosis para Senseo',
    precio: 4.99,
    capsulas: 16,
    url: 'https://kaffek.es/cappuccino-senseo-16.html',
  },
  {
    id: 'senseo_cappuccino_8',
    nombre: 'Senseo Cappuccino 8 monodosis para Senseo',
    precio: 2.69,
    capsulas: 8,
    formato: '8 monodosis',
    url: 'https://kaffek.es/cappuccino-senseo.html',
  },
  {
    id: 'senseo_extra_strong_36',
    nombre: 'Senseo Extra Strong 36 monodosis para Senseo',
    precio: 7.19,
    capsulas: 36,
    formato: '36 monodosis',
    url: 'https://kaffek.es/extra-strong-big-pack-medium-cup-senseo-senseo.html',
  },
  {
    id: 'senseo_descafeinado_36',
    nombre: 'Senseo Descafeinado 36 monodosis para Senseo',
    precio: 7.89,
    capsulas: 36,
    formato: '36 monodosis',
    descafeinado: true,
    url: 'https://kaffek.es/descafeinado-senseo.html',
  },
  {
    id: 'senseo_classic_36',
    nombre: 'Senseo Classic 36 monodosis para Senseo',
    precio: 6.39,
    capsulas: 36,
    formato: '36 monodosis',
    url: 'https://kaffek.es/big-pack-classic-senseo.html',
  },
  {
    id: 'senseo_choco_cappuccino_8',
    nombre: 'Senseo Choco Cappuccino 8 monodosis para Senseo',
    precio: 2.75,
    capsulas: 8,
    formato: '8 monodosis',
    sabor: 'Chocolate',
    url: 'https://kaffek.es/cappuccino-choco-senseo-senseo.html',
  },
  {
    id: 'senseo_vanilla_cafe_latte_8',
    nombre: 'Senseo Vanilla Café Latte 8 monodosis para Senseo',
    precio: 2.75,
    capsulas: 8,
    formato: '8 monodosis',
    sabor: 'Vainilla',
    url: 'https://kaffek.es/vanilla-cafe-latte-senseo-senseo.html',
  },
  {
    id: 'senseo_caramel_cappuccino_8',
    nombre: 'Senseo Caramel Cappuccino 8 monodosis para Senseo',
    precio: 2.75,
    capsulas: 8,
    formato: '8 monodosis',
    sabor: 'Caramelo',
    url: 'https://kaffek.es/caramel-cappuccino-senseo-senseo.html',
  },
  {
    id: 'senseo_xl_buenos_dias_10',
    nombre: 'Senseo XL Buenos Días 10 monodosis para Senseo',
    precio: 3.29,
    capsulas: 10,
    formato: '10 monodosis',
    url: 'https://kaffek.es/xl-morning-cafe-guten-morgen-senseo-senseo.html',
  },
  {
    id: 'senseo_cafe_latte_dubai_choco_8',
    nombre: 'Senseo Café Latte Dubai Chocolate Style 8 monodosis para Senseo',
    precio: 2.75,
    capsulas: 8,
    formato: '8 monodosis',
    sabor: 'Chocolate Dubai',
    url: 'https://kaffek.es/cafe-latte-dubai-chocolate-style-senseo-8.html',
  },
];

// ═══════════════════════════════════════════════════════════════
// XO NOIR – Nespresso Pro (6) + NCC (1)
// ═══════════════════════════════════════════════════════════════
const XO_NOIR = [
  {
    id: 'xonoir_pro_lungo_50',
    nombre: 'XO Noir Lungo 50 cápsulas para Nespresso Pro',
    precio: 16.29,
    capsulas: 50,
    formato: '50 cápsulas',
    url: 'https://kaffek.es/lungo-xo-noir-nespresso-pro.html',
    sist: 'Nespresso Pro',
  },
  {
    id: 'xonoir_pro_lungo_forte_50',
    nombre: 'XO Noir Lungo Forte 50 cápsulas para Nespresso Pro',
    precio: 16.19,
    capsulas: 50,
    formato: '50 cápsulas',
    url: 'https://kaffek.es/lungo-forte-xo-noir-nespresso-pro.html',
    sist: 'Nespresso Pro',
  },
  {
    id: 'xonoir_pro_espresso_50',
    nombre: 'XO Noir Espresso 50 cápsulas para Nespresso Pro',
    precio: 16.09,
    capsulas: 50,
    formato: '50 cápsulas',
    url: 'https://kaffek.es/espresso-xo-noir-nespresso-pro.html',
    sist: 'Nespresso Pro',
  },
  {
    id: 'xonoir_pro_ristretto_50',
    nombre: 'XO Noir Ristretto 50 cápsulas para Nespresso Pro',
    precio: 19.09,
    capsulas: 50,
    formato: '50 cápsulas',
    url: 'https://kaffek.es/ristretto-xo-noir-nespresso-pro.html',
    sist: 'Nespresso Pro',
  },
  {
    id: 'xonoir_pro_descafeinado_50',
    nombre: 'XO Noir Descafeinado 50 cápsulas para Nespresso Pro',
    precio: 16.99,
    capsulas: 50,
    formato: '50 cápsulas',
    descafeinado: true,
    url: 'https://kaffek.es/descafeinado-xo-noir.html',
    sist: 'Nespresso Pro',
  },
  {
    id: 'xonoir_pro_espresso_forte_50',
    nombre: 'XO Noir Espresso Forte 50 cápsulas para Nespresso Pro',
    precio: 16.29,
    capsulas: 50,
    formato: '50 cápsulas',
    url: 'https://kaffek.es/espresso-forte-xo-noir-nespresso-pro.html',
    sist: 'Nespresso Pro',
  },
  {
    id: 'xonoir_ncc_lungo_30',
    nombre: 'XO Noir Lungo 30 cápsulas para Nespresso',
    precio: 6.69,
    capsulas: 30,
    formato: '30 cápsulas',
    url: 'https://kaffek.es/lungo-xo-noir-nespresso.html',
    sist: 'Nespresso',
  },
];

// ═══════════════════════════════════════════════════════════════
// FRIELE (3)
// ═══════════════════════════════════════════════════════════════
const FRIELE = [
  {
    id: 'friele_senseo_36',
    nombre: 'Friele 36 monodosis para Senseo',
    precio: 5.79,
    capsulas: 36,
    formato: '36 monodosis',
    url: 'https://kaffek.es/big-pack-medium-cup-friele-senseo.html',
    sist: 'Senseo',
  },
  {
    id: 'friele_senseo_xl_20',
    nombre: 'Friele Taza Grande 20 monodosis para Senseo',
    precio: 5.89,
    capsulas: 20,
    formato: '20 monodosis',
    url: 'https://kaffek.es/xl-large-cup-friele-senseo.html',
    sist: 'Senseo',
  },
  {
    id: 'friele_tassimo_16',
    nombre: 'Friele Café de la Mañana 16 cápsulas para Tassimo',
    precio: 5.59,
    capsulas: 16,
    url: 'https://kaffek.es/cafe-de-la-mana-a-friele-tassimo.html',
    sist: 'Tassimo',
  },
];

// ═══════════════════════════════════════════════════════════════
// CAFÉ HAG (1)
// ═══════════════════════════════════════════════════════════════
const CAFE_HAG = [
  {
    id: 'cafehag_tassimo_crema_descaf_16',
    nombre: 'Café Hag Crema Descafeinado 16 cápsulas para Tassimo',
    precio: 6.59,
    capsulas: 16,
    descafeinado: true,
    url: 'https://kaffek.es/cafe-hag-crema-descafeinado-tassimo.html',
    sist: 'Tassimo',
  },
];

// ═══════════════════════════════════════════════════════════════
// GRAND'MÈRE Senseo (1 extra)
// ═══════════════════════════════════════════════════════════════
const GRANDMERE_SENSEO = [
  {
    id: 'grandmere_senseo_classique_54',
    nombre: "Grand'Mère Classique 54 monodosis para Senseo",
    precio: 7.29,
    capsulas: 54,
    formato: '54 monodosis',
    url: 'https://kaffek.es/classique-grand-mere-senseo.html',
    sist: 'Senseo',
  },
];

// ═══════════════════════════════════════════════════════════════
// BAILEYS Senseo (1 extra)
// ═══════════════════════════════════════════════════════════════
const BAILEYS_SENSEO = [
  {
    id: 'baileys_senseo_cappuccino_8',
    nombre: 'Baileys Cappuccino 8 monodosis para Senseo',
    precio: 2.95,
    capsulas: 8,
    formato: '8 monodosis',
    sabor: 'Baileys',
    url: 'https://kaffek.es/cappuccino-baileys-senseo.html',
    sist: 'Senseo',
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
  ...withMeta(NESCAFE_DG, 'Nescafé', 'Dolce Gusto'),
  ...withMeta(NESCAFE_NCC, 'Nescafé', 'Nespresso'),
  ...withMeta(SENSEO_OWN, 'Senseo', 'Senseo'),
  ...withMeta(XO_NOIR, 'XO Noir', null),
  ...withMeta(FRIELE, 'Friele', null),
  ...withMeta(CAFE_HAG, 'Café Hag', null),
  ...withMeta(GRANDMERE_SENSEO, "Grand'Mère", null),
  ...withMeta(BAILEYS_SENSEO, 'Baileys', null),
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
