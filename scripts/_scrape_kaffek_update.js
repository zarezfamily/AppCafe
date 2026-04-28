/**
 * Scrape missing products from kaffek.es for multiple brands.
 * Extracts: title, price, image, EAN from product pages.
 * Outputs cafe-import-kaffek-update.json
 */
const fs = require('fs');

const MISSING_SLUGS = [
  // ---- LAVAZZA (10) ----
  'espresso-gourmet-chocolate-lavazza-nespresso',
  'lungo-lavazza-nespresso',
  'espresso-ristretto-lavazza-nespresso',
  'tierra-for-africa-lavazza-nespresso',
  'tierra-for-amazonia-lavazza-nespresso',
  // ---- ILLY (20) ----
  'intenso-illy-iperespresso',
  'brasil-illy-iperespresso',
  'lungo-intenso-illy-nespresso',
  'decaffeinato-illy-iperespresso',
  'intenso-illy-ese',
  'decaffeinato-illy-ese',
  'forte-illy-iperespresso',
  'colombia-illy-iperespresso',
  'forte-illy-ese',
  'ethiopia-arabica-illy-iperespresso',
  'espresso-forte-illy-nespresso',
  'espresso-intenso-illy-nespresso',
  // ---- BORBONE Nespresso (7) ----
  'miscela-oro-caffe-borbone-nespresso',
  'miscela-blu-caffe-borbone-nespresso',
  'miscela-rossa-caffe-borbone-nespresso',
  'miscela-nera-caffe-borbone-nespresso',
  'miscela-verde-descafeinado-caffe-borbone-nespresso',
  'miscela-light-caffe-borbone-nespresso',
  'cortado-caffe-borbone-nespresso',
  // ---- L'OR (15) ----
  'ristretto-imola-lor-nespresso',
  'espresso-brazil-lor-nespresso',
  'coconut-lor-nespresso',
  'lungo-estremo-maxi-pack-lor-nespresso-40',
  'espresso-avellana-lor-nespresso-10',
  'ristretto-50-lor',
  'lungo-profondo-50-lor',
  'ultimo-10-lor',
  'ristretto-lor-nes-pro',
  'lungo-intense-lor-nes-pro',
  'espresso-subtil-lor-nes-pro',
  'forza-maxi-pack-lor-nespresso',
  'ristretto-maxi-pack-lor-nespresso',
  'supremo-maxi-pack-lor-nespresso',
  'lungo-profondo-maxi-pack-lor-nespresso',
  // ---- SEGAFREDO (7) ----
  'espresso-classico-aluminium-segafredo-nespresso',
  'espresso-intenso-aluminium-segafredo-nespresso',
  'ristretto-segafredo-nespresso',
  'peru-segafredo-nespresso',
  'espresso-decaffeinato-segafredo-nespresso',
  'intermezzeo-segafredo-senseo',
  'intermezzo-segafredo-dolce-gusto',
  // ---- TASSIMO top picks (15 - skip accessories/machines) ----
  'cappuccino-costa-tassimo-12',
  'americano-costa-tassimo-12',
  'cappuccino-intenso-coffee-shop-selections-tassimo',
  'cappuccino-kenco-tassimo',
  'colombian-100-kenco-tassimo',
  'flat-white-kenco-tassimo',
  'marcilla-cortado-tassimo',
  'espresso-marcilla-tassimo-2504',
  'crema-jacobs-tassimo-16',
  'cappuccino-jacobs-tassimo-16',
  'espresso-intenso-jacobs-tassimo-16',
  'cafe-au-lait-jacobs-tassimo-16',
  'caramel-latte-macchiato-jacobs-tassimo-16',
  'vanilla-latte-macchiato-jacobs-tassimo-16',
  'espresso-delicato-jacobs-tassimo-16',
  // ---- NESCAFÉ (6) ----
  'gold-crema-instant-nescafe',
  'gold-instant-nescafe',
  'nescafe-latte-instant',
  'iced-latte-salted-caramel-nescafe-instant',
  'nescafe-gold-latte-instant',
  'cappuccino-nescafe-8-bolsas',
  // ---- JACOBS (4) ----
  'guten-morgen-jacobs-nespresso',
  'kronung-crema-jacobs-nespresso-20',
  'lungo-8-intenso-xl-jacobs-nespresso',
  'espresso-10-intenso-xl-jacobs-nespresso',
];

async function scrape(slug) {
  const url = `https://kaffek.es/${slug}.html`;
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html',
      'Accept-Language': 'es-ES,es;q=0.9',
    },
    signal: AbortSignal.timeout(10000),
  });
  const html = await r.text();
  if (!html || html.length < 500)
    return { slug, title: '', img: '', price: null, ean: 'N/A', count: null };

  const ogTitle = html.match(/property="og:title"\s+content="([^"]+)"/i);
  const title = ogTitle ? ogTitle[1].replace(/&#039;/g, "'").replace(/&amp;/g, '&') : '';

  const ogImg = html.match(/property="og:image"\s+content="([^"]+)"/i);
  const img = ogImg ? ogImg[1] : '';

  const priceMatch =
    html.match(/"price"\s*:\s*"?(\d+[\.,]?\d*)/) || html.match(/data-price-amount="([^"]+)"/);
  const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null;

  const eanMatch = html.match(/"gtin13"\s*:\s*"(\d+)"/) || html.match(/"ean"\s*:\s*"(\d+)"/);
  const ean = eanMatch ? eanMatch[1] : 'N/A';

  // Try to extract capsule count from title or page
  const countMatch =
    (title || slug).match(/(\d+)\s*(cápsulas|capsulas|monodosis|pods|cáps)/i) ||
    slug.match(/(\d+)$/);
  const count = countMatch ? parseInt(countMatch[1]) : null;

  return { slug, title, img, price, ean, count };
}

function detectBrand(slug) {
  if (slug.includes('lavazza')) return 'Lavazza';
  if (slug.includes('illy')) return 'illy';
  if (slug.includes('borbone')) return 'Caffè Borbone';
  if (slug.includes('-lor-') || slug.endsWith('-lor')) return "L'OR";
  if (slug.includes('segafredo')) return 'Segafredo';
  if (slug.includes('tassimo')) return 'Tassimo'; // multi-brand
  if (slug.includes('nescafe')) return 'Nescafé';
  if (slug.includes('jacobs')) return 'Jacobs';
  return 'Unknown';
}

function detectTassimoBrand(title, slug) {
  if (/costa/i.test(title) || /costa/i.test(slug)) return 'Costa';
  if (/kenco/i.test(title) || /kenco/i.test(slug)) return 'Kenco';
  if (/marcilla/i.test(title) || /marcilla/i.test(slug)) return 'Marcilla';
  if (/jacobs/i.test(title) || /jacobs/i.test(slug)) return 'Jacobs';
  if (/coffee shop/i.test(title) || /coffee-shop/i.test(slug)) return 'Coffee Shop Selections';
  if (/milka/i.test(title) || /milka/i.test(slug)) return 'Milka';
  return 'Tassimo';
}

function detectSystem(slug) {
  if (slug.includes('nespresso') || slug.includes('nes-pro')) return 'nespresso';
  if (slug.includes('dolce-gusto')) return 'dolce_gusto';
  if (slug.includes('tassimo')) return 'tassimo';
  if (slug.includes('senseo')) return 'senseo';
  if (slug.includes('iperespresso')) return 'iperespresso';
  if (slug.includes('modo-mio')) return 'a_modo_mio';
  if (slug.includes('-ese')) return 'ese';
  if (slug.includes('instant')) return '';
  return '';
}

function slug2id(slug) {
  return slug.replace(/-/g, '_').replace(/[^a-z0-9_]/g, '');
}

function buildCafe(r) {
  const brand = detectBrand(r.slug);
  const sistema = detectSystem(r.slug);
  const isTassimo = r.slug.includes('tassimo');
  const actualBrand = isTassimo ? detectTassimoBrand(r.title, r.slug) : brand;

  let formato = 'capsule';
  let tipoProducto = 'capsulas';
  if (sistema === 'nespresso') tipoProducto = 'capsulas nespresso';
  else if (sistema === 'dolce_gusto') tipoProducto = 'capsulas dolce gusto';
  else if (sistema === 'tassimo') tipoProducto = 'capsulas tassimo';
  else if (sistema === 'senseo') {
    tipoProducto = 'monodosis senseo';
    formato = 'pod';
  } else if (sistema === 'iperespresso') tipoProducto = 'capsulas iperespresso';
  else if (sistema === 'ese') {
    tipoProducto = 'monodosis ESE';
    formato = 'pod';
  } else if (!sistema && r.slug.includes('instant')) {
    formato = 'instant';
    tipoProducto = 'cafe soluble';
  }

  const nombre = r.title
    .replace(/&eacute;/g, 'é')
    .replace(/&egrave;/g, 'è')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&');

  return {
    id: slug2id(r.slug),
    nombre,
    marca: actualBrand,
    roaster: actualBrand,
    ean: r.ean,
    descripcion: `${nombre}. Disponible en kaffek.es.`,
    coffeeCategory: 'daily',
    isSpecialty: false,
    formato,
    sistemaCapsula: sistema,
    tipoProducto,
    cantidad: r.count || 0,
    tueste: '',
    pais: 'Mezcla',
    origen: 'Mezcla',
    notas: '',
    decaf: /descaf|decaf|decaff/i.test(r.slug),
    precio: r.price,
    isBio: false,
    officialPhoto: r.img,
  };
}

(async () => {
  const cafes = [];
  let ok = 0;
  let fail = 0;
  const OUT = 'scripts/cafe-import-kaffek-update.json';

  for (let i = 0; i < MISSING_SLUGS.length; i++) {
    const slug = MISSING_SLUGS[i];
    try {
      const data = await scrape(slug);
      if (!data.title || !data.img) {
        console.log(`  [${i + 1}/${MISSING_SLUGS.length}] SKIP: ${slug}`);
        fail++;
      } else {
        cafes.push(buildCafe(data));
        console.log(`  [${i + 1}/${MISSING_SLUGS.length}] OK: ${data.title} | ${data.price}€`);
        ok++;
        // Save partial results after every product
        fs.writeFileSync(OUT, JSON.stringify(cafes, null, 2));
      }
    } catch (e) {
      console.log(`  [${i + 1}/${MISSING_SLUGS.length}] ERR: ${slug} - ${e.message}`);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} OK, ${fail} failed. Total in file: ${cafes.length}`);
})();
