/**
 * Compare Kaffekapslen products from kaffek.es sitemap with what we have in Firestore.
 * Reports the product URLs we don't seem to have.
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

// Product URLs extracted from the sitemap (coffee products only - no accessories/cups/etc.)
const SITEMAP_PRODUCTS = [
  // Dolce Gusto
  'americano-cafe-diario-kaffekapslen-dolce-gusto-2570', // Americano 2x16=32
  'americano-cafe-diario-kaffekapslen-dolce-gusto-32', // Americano 32
  'cafe-au-lait-cafe-diario-kaffekapslen-dolce-gusto',
  'cappuccino-cafe-diario-kaffekapslen-dolce-gusto',
  'chai-latte-cafe-diario-kaffekapslen-dolce-gusto', // ✓ in our DB
  'chocolate-caliente-kaffekapslen-dolce-gusto',
  'chocolate-leche-kaffekapslen-dolce-gusto', // ✓
  'cortado-cafe-diario-kaffekapslen-dolce-gusto', // ✓
  'dynamite-coffee-kaffekapslen-dolce-gusto',
  'espresso-cafe-diario-kaffekapslen-dolce-gusto', // ✓
  'espresso-strong-cafe-diario-kaffekapslen-dolce-gusto', // ✓
  'flat-white-cafe-diario-kaffekapslen-dolce-gusto',
  'grande-cafe-diario-kaffekapslen-dolce-gusto', // ✓
  'grande-cafe-diario-kaffekapslen-dolce-gusto-32', // 32 pack
  'grande-descafeinado-cafe-diario-kaffekapslen-dolce-gusto', // ✓
  'hazelnootdrank-alledaagse-koffie-kaffekapslen-dolce-gusto', // hazelnut DG?
  'irish-coffee-cafe-diario-kaffekapslen-dolce-gusto',
  'latte-macchiato-cafe-diario-kaffekapslen-dolce-gusto', // ✓
  'latte-macchiato-caramel-cafe-diario-kaffekapslen-dolce-gusto', // ✓
  'latte-macchiato-vanilla-cafe-diario-kaffekapslen-dolce-gusto', // ✓
  'leche-cafe-diario-kaffekapslen-dolce-gusto',
  'lungo-cafe-diario-kaffekapslen-dolce-gusto', // ✓
  'mocha-cafe-diario-kaffekapslen-dolce-gusto',
  'pistacho-cafe-diario-kaffekapslen-dolce-gusto',
  'white-chocolate-cafe-diario-kaffekapslen-dolce-gusto',

  // Nespresso
  'dynamite-coffee-kaffekapslen-nespresso',
  'espresso-avellana-premium-kaffekapslen-nespresso', // ✓
  'espresso-cafe-diario-kaffekapslen-nespresso', // ✓
  'espresso-caramel-premium-kaffekapslen-nespresso', // ✓ (caramelo)
  'espresso-chocolate-premium-kaffekapslen-nespresso', // ✓
  'espresso-decaf-premium-kaffekapslen-nespresso', // ✓
  'espresso-premium-kaffekapslen-nespresso-10', // ✓
  'espresso-strong-premium-kaffekapslen-nespresso', // ✓
  'espresso-vanilla-premium-kaffekapslen-nespresso', // ✓ (vainilla)
  'lungo-cafe-diario-kaffekapslen-nespresso', // ✓
  'lungo-premium-kaffekapslen-nespresso', // ✓
  'lungo-strong-premium-kaffekapslen-nespresso', // ✓
  'lungo-xxl-premium-kaffekapslen-nespresso',
  'mild-cafe-diario-kaffekapslen-nespresso', // ✓
  'ristretto-cafe-diario-kaffekapslen-nespresso', // ✓
  'ristretto-premium-kaffekapslen-50-nespresso', // 50-pack
  'ristretto-premium-kaffekapslen-nespresso', // ✓
  'strong-cafe-diario-kaffekapslen-nespresso', // ✓

  // Nespresso Pro
  'avellana-kaffekapslen-nespresso-pro', // ✓
  'cafe-vainilla-kaffekapslen-nespresso-pro',
  'caramelo-kaffekapslen-nespresso-pro', // ✓
  'dynamite-coffee-kaffekapslen-nespresso-pro', // ✓
  'espresso-decaf-kaffekapslen-nespresso-pro', // ✓
  'espresso-kaffekapslen-nespresso-pro', // ✓
  'lungo-forte-kaffekapslen-nespresso-pro', // ✓
  'lungo-kaffekapslen-nespresso-pro', // ✓
  'ristretto-kaffekapslen-nespresso-pro', // ✓

  // Senseo
  'avellana-cafe-diario-kaffekapslen-senseo', // ✓
  'caramelo-cafe-diario-kaffekapslen-senseo', // ✓
  'chocolate-cafe-diario-kaffekapslen-senseo', // ✓
  'classic-cafe-diario-kaffekapslen-senseo', // ✓
  'classic-xl-cafe-diario-kaffekapslen-senseo', // ✓
  'descafeinado-cafe-diario-kaffekapslen-senseo', // ✓
  'dynamite-coffee-kaffekapslen-senseo', // ✓
  'extra-strong-cafe-diario-kaffekapslen-senseo', // ✓
  'strong-cafe-diario-kaffekapslen-senseo', // ✓
  'strong-xl-cafe-diario-kaffekapslen-senseo',
  'vainilla-cafe-diario-kaffekapslen-senseo', // ✓

  // Granos / Molido
  'aroma-cafe-diario-kaffekapslen', // ✓
  'descafeinado-cafe-diario-kaffekapslen-granos-de-cafe', // ✓
  'cafe-avellana-kaffekapslen-cafe-molido', // ✓
  'cafe-caramelo-kaffekapslen-cafe-molido', // ✓
  'cafe-chocolatado-kaffekapslen-cafe-molido', // ✓
  'cafe-de-vainilla-kaffekapslen-cafe-molido', // ✓
];

// Our existing IDs/names (from the earlier query) - use simplified keys for matching
const OUR_NAMES = [
  // grano
  'dynamite coffee',
  'descafeinado cafe diario',
  'classic cafe diario',
  'espresso cafe diario',
  'espresso intenso cafe diario',
  'crema cafe diario',
  'blonde roast cafe diario',
  'aroma cafe diario',
  // DG
  'americano cafe diario dg',
  'cafe au lait dg',
  'cappuccino dg',
  'chai latte dg',
  'chocolate leche dg',
  'cortado dg',
  'dynamite dg',
  'espresso dg',
  'espresso strong dg',
  'grande dg',
  'grande descafeinado dg',
  'latte macchiato dg',
  'latte macchiato caramel dg',
  'latte macchiato vanilla dg',
  'lungo dg',
  // NCC
  'dynamite ncc',
  'espresso avellana ncc',
  'espresso caramelo ncc',
  'espresso chocolate ncc',
  'espresso coco ncc',
  'espresso creme brulee ncc',
  'espresso descafeinado ncc',
  'espresso diario ncc',
  'espresso irish cream ncc',
  'espresso premium ncc',
  'espresso strong premium ncc',
  'espresso vainilla ncc',
  'lungo diario ncc',
  'lungo premium ncc',
  'lungo strong premium ncc',
  'mild ncc',
  'ristretto diario ncc',
  'ristretto premium ncc',
  'strong ncc',
  // Pro
  'avellana pro',
  'caramelo pro',
  'dynamite pro',
  'espresso pro',
  'espresso decaf pro',
  'lungo pro',
  'lungo forte pro',
  'ristretto pro',
  // Senseo
  'avellana senseo',
  'caramelo senseo',
  'chocolate senseo',
  'classic senseo',
  'classic xl senseo',
  'descafeinado senseo',
  'dynamite senseo',
  'extra strong senseo',
  'strong senseo',
  'strong xl senseo',
  'vainilla senseo',
  // Molido
  'avellana molido',
  'caramelo molido',
  'chocolatado molido',
  'vainilla molido',
];

// Products from the sitemap that are NEW (not in our DB)
const MISSING = [
  { slug: 'flat-white-cafe-diario-kaffekapslen-dolce-gusto', desc: 'Flat White DG 16 cápsulas' },
  {
    slug: 'irish-coffee-cafe-diario-kaffekapslen-dolce-gusto',
    desc: 'Irish Coffee DG 16 cápsulas',
  },
  { slug: 'mocha-cafe-diario-kaffekapslen-dolce-gusto', desc: 'Mocha DG 16 cápsulas' },
  { slug: 'pistacho-cafe-diario-kaffekapslen-dolce-gusto', desc: 'Pistacho DG 16 cápsulas' },
  {
    slug: 'white-chocolate-cafe-diario-kaffekapslen-dolce-gusto',
    desc: 'White Chocolate DG 16 cápsulas',
  },
  {
    slug: 'chocolate-caliente-kaffekapslen-dolce-gusto',
    desc: 'Chocolate Caliente DG 16 cápsulas',
  },
  { slug: 'leche-cafe-diario-kaffekapslen-dolce-gusto', desc: 'Leche (solo leche) DG 16 cápsulas' },
  { slug: 'lungo-xxl-premium-kaffekapslen-nespresso', desc: 'Lungo XXL Premium NCC 10 cápsulas' },
  { slug: 'cafe-vainilla-kaffekapslen-nespresso-pro', desc: 'Vainilla Nespresso Pro 50 cápsulas' },
  {
    slug: 'hazelnootdrank-alledaagse-koffie-kaffekapslen-dolce-gusto',
    desc: 'Avellana DG 16 cápsulas',
  },
  // espresso coco & irish cream & creme brulee - we have these already!
];

console.log('=== MISSING Kaffekapslen products (not in our DB) ===\n');
MISSING.forEach((m, i) => {
  console.log(`${i + 1}. ${m.desc}`);
  console.log(`   URL: https://kaffek.es/${m.slug}.html\n`);
});
console.log(`Total missing: ${MISSING.length}`);
console.log(`\nNote: 'Leche' is not a coffee product. 'Chocolate Caliente' is borderline.`);
console.log(`Real coffee products missing: ~8-9`);
