/*
  Importa cafes actuales de Cafe Saula a Firestore.

  Fuentes:
    https://www.cafesaula.com/store/es/6-cafe-molido
    https://www.cafesaula.com/store/es/7-cafe-en-grano
    https://www.cafesaula.com/store/es/8-cafe-en-capsulas

  Estrategia:
    - Descubre URLs reales de producto desde ItemList JSON-LD de categoria.
    - Lee Product JSON-LD de cada ficha.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const CATEGORY_URLS = [
  'https://www.cafesaula.com/store/es/6-cafe-molido',
  'https://www.cafesaula.com/store/es/7-cafe-en-grano',
  'https://www.cafesaula.com/store/es/8-cafe-en-capsulas',
];
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-saula-real.json');
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const CAFES_COLLECTION = 'cafes';
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  Referer: 'https://www.google.com/',
  'Upgrade-Insecure-Requests': '1',
};

function normalizeText(value) {
  return String(value || '')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForSlug(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function slugify(value) {
  return normalizeForSlug(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

function uniqueBy(items, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    redirect: 'follow',
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP_${response.status} ${url} ${text.slice(0, 200)}`);
  }
  return text;
}

function ensureAdmin() {
  if (admin.apps.length) return;
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractJsonLd(html) {
  return [
    ...String(html || '').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi),
  ]
    .map((match) => safeJsonParse(match[1]))
    .filter(Boolean);
}

function discoverProductUrls(categoryHtml) {
  const scripts = extractJsonLd(categoryHtml);
  const list = scripts.find((script) => script?.['@type'] === 'ItemList');
  const urls = (list?.itemListElement || [])
    .map((item) => normalizeText(item?.url || ''))
    .filter(Boolean);
  return uniqueBy(urls, (url) => url);
}

function findProductJsonLd(html) {
  const scripts = extractJsonLd(html);
  return scripts.find((script) => script?.['@type'] === 'Product') || null;
}

function inferFormat(category, name) {
  const haystack = normalizeForSlug(`${category} ${name}`).toLowerCase();
  if (haystack.includes('capsula')) return 'capsules';
  if (haystack.includes('molido')) return 'ground';
  return 'beans';
}

function inferCategory(name, description) {
  const haystack = normalizeForSlug(`${name} ${description}`).toLowerCase();
  if (
    haystack.includes('premium') ||
    haystack.includes('bourbon') ||
    haystack.includes('dark india')
  ) {
    return 'specialty';
  }
  return 'daily';
}

function inferAmount(name, format) {
  const haystack = normalizeForSlug(name).toLowerCase();
  if (format === 'capsules') {
    const cap = haystack.match(/(\d+)\s*(caps|capsulas)/);
    if (cap) return Number.parseInt(cap[1], 10);
    return 10;
  }
  const kilo = haystack.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kilo) return Math.round(Number.parseFloat(kilo[1].replace(',', '.')) * 1000);
  const gram = haystack.match(/(\d+)\s*g(?:rs?)?\b/);
  if (gram) return Number.parseInt(gram[1], 10);
  return 500;
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    ['cremos', 'cremoso'],
    ['redonda', 'redondo'],
    ['delicada', 'delicado'],
    ['afrut', 'fruta'],
    ['intenso', 'intenso'],
    ['arabica', 'arabica'],
  ];
  return [
    ...new Set(dictionary.filter(([needle]) => haystack.includes(needle)).map(([, note]) => note)),
  ];
}

function inferCapsuleSystem(name) {
  const haystack = normalizeForSlug(name).toLowerCase();
  if (haystack.includes('capsula')) return 'nespresso';
  return '';
}

function shouldSkip(name, description) {
  const haystack = normalizeForSlug(`${name} ${description}`).toLowerCase();
  return (
    haystack.includes('cafetera') ||
    haystack.includes('espresso point') ||
    haystack.includes('maquina')
  );
}

async function main() {
  const allUrls = [];
  for (const categoryUrl of CATEGORY_URLS) {
    const html = await fetchText(categoryUrl);
    allUrls.push(...discoverProductUrls(html));
  }
  const productUrls = uniqueBy(allUrls, (url) => url);
  const now = new Date().toISOString();

  console.log(`[SAULA] Categories: ${CATEGORY_URLS.length}`);
  console.log(`[SAULA] Products discovered: ${productUrls.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const url of productUrls) {
    const html = await fetchText(url);
    const product = findProductJsonLd(html);
    if (!product) continue;

    const name = normalizeText(product.name || '').replace(/&amp;/g, '&');
    const description = normalizeText(product.description || '').replace(/&amp;/g, '&');
    const categoryText = normalizeText(product.category || '');
    if (shouldSkip(name, description)) continue;
    const format = inferFormat(categoryText, name);
    const category = inferCategory(name, description);
    const offer = product.offers || {};
    const image = Array.isArray(offer.image)
      ? offer.image[0]
      : normalizeText(product.image || offer.image || '');

    const cafe = {
      id: `saula_${slugify(url)}`,
      fuente: 'saula',
      fuentePais: 'ES',
      fuenteUrl: url,
      urlProducto: url,

      nombre: name,
      name,
      marca: 'Cafe Saula',
      roaster: 'Cafe Saula',

      ean: '',
      normalizedEan: '',
      sku: normalizeText(product.sku || ''),
      mpn: normalizeText(product.mpn || ''),

      descripcion: description,
      description,

      category,
      coffeeCategory: category === 'specialty' ? 'specialty' : 'daily',
      isSpecialty: category === 'specialty',
      legacy: false,

      formato: format,
      format,
      sistemaCapsula: format === 'capsules' ? inferCapsuleSystem(name) : '',
      tipoProducto:
        format === 'capsules'
          ? 'capsulas de cafe'
          : format === 'ground'
            ? 'cafe molido'
            : 'cafe en grano',
      cantidad: inferAmount(name, format),
      intensidad: null,
      tueste: 'medium',
      roastLevel: 'medium',
      pais: '',
      origen: '',
      proceso: '',
      notas: inferNotes(`${name} ${description}`).join(', '),
      notes: inferNotes(`${name} ${description}`).join(', '),
      decaf: /descafeinad/i.test(normalizeForSlug(`${name} ${description}`)),

      precio: Number.parseFloat(offer.price || '') || null,
      currency: normalizeText(offer.priceCurrency || 'EUR'),
      certificaciones: /\becologic/i.test(normalizeForSlug(`${name} ${description}`))
        ? 'organico'
        : '',
      isBio: /\becologic/i.test(normalizeForSlug(`${name} ${description}`)),
      inStock: /instock$/i.test(normalizeText(offer.availability || '')) || true,

      fecha: now,
      puntuacion: 0,
      votos: 0,

      officialPhoto: image,
      bestPhoto: image,
      imageUrl: image,
      foto: image,

      status: 'approved',
      reviewStatus: 'approved',
      provisional: false,
      appVisible: true,
      scannerVisible: true,
      adminReviewedAt: now,
      updatedAt: now,
      approvedAt: now,
      createdAt: now,
      importMeta: {
        importedAt: now,
        sourceType: 'saula',
        sourceCategory: categoryText,
      },
    };

    cafes.push(cafe);
    console.log(`[SAULA] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[SAULA] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

  ensureAdmin();
  const db = admin.firestore();

  let written = 0;
  for (const cafe of cafes) {
    const { id, ...payload } = cafe;
    if (!id) continue;
    if (!DRY_RUN) {
      await db.collection(CAFES_COLLECTION).doc(id).set(payload, { merge: true });
    }
    written += 1;
  }

  console.log(`[SAULA] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[SAULA] Error:', error?.stack || error);
  process.exit(1);
});
