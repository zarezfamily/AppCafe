/*
  Importa cafes actuales de Cafe Fortaleza a Firestore.

  Fuente:
    https://www.cafefortaleza.com/10_cafes

  Estrategia:
    - Recorre la paginacion de la categoria principal.
    - Descubre fichas reales de producto desde el HTML.
    - Lee el Product JSON-LD de cada ficha.
    - Filtra packs, soluble y otros productos no objetivo.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const CATEGORY_PAGES = [
  'https://www.cafefortaleza.com/10_cafes',
  'https://www.cafefortaleza.com/10_cafes?page=2',
  'https://www.cafefortaleza.com/10_cafes?page=3',
  'https://www.cafefortaleza.com/10_cafes?page=4',
];
const BASE_SITE = 'https://www.cafefortaleza.com';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-fortaleza-real.json');
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const LIMIT = Number.parseInt(process.env.LIMIT || '', 10);
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
    ...String(html || '').matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    ),
  ]
    .map((match) => safeJsonParse(match[1]))
    .filter(Boolean);
}

function discoverProductUrls(html) {
  return uniqueBy(
    [...String(html || '').matchAll(/href="(https:\/\/www\.cafefortaleza\.com\/[^"#?]+\.html)"/gi)]
      .map((match) => normalizeText(match[1]))
      .filter((url) => url.includes('/tienda-online/') || url.includes('/capsulas-compatibles-')),
    (url) => url
  );
}

function findProductJsonLd(html) {
  const scripts = extractJsonLd(html);
  return scripts.find((script) => script?.['@type'] === 'Product') || null;
}

function inferFormat(url, name, description) {
  const haystack = normalizeForSlug(`${url} ${name} ${description}`).toLowerCase();
  if (haystack.includes('capsula') || haystack.includes('capsulas')) return 'capsules';
  if (haystack.includes('molido')) return 'ground';
  if (haystack.includes('unidosis') || haystack.includes('ese')) return 'pods';
  return 'beans';
}

function inferCapsuleSystem(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('nespresso')) return 'nespresso';
  if (haystack.includes('dolce gusto')) return 'dolce-gusto';
  if (haystack.includes('caffitaly')) return 'caffitaly';
  if (haystack.includes('platinium')) return 'fortaleza-platinium';
  return '';
}

function inferCategory(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (
    haystack.includes('origen') ||
    haystack.includes('colombia') ||
    haystack.includes('costa rica') ||
    haystack.includes('etiopia') ||
    haystack.includes('100% arabica') ||
    haystack.includes('arabica')
  ) {
    return 'specialty';
  }
  return 'daily';
}

function inferOrigin(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const mappings = [
    ['colombia', 'Colombia'],
    ['costa rica', 'Costa Rica'],
    ['etiopia', 'Etiopia'],
    ['brasil', 'Brasil'],
  ];
  const hits = [];
  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) hits.push(value);
  }
  return [...new Set(hits)].join(', ');
}

function inferRoast(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('suave')) return 'light';
  if (haystack.includes('intens') || haystack.includes('torrefacto')) return 'dark';
  return 'medium';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    ['floral', 'floral'],
    ['herbal', 'herbal'],
    ['aroma', 'aromatico'],
    ['suavidad', 'suave'],
    ['cremos', 'cremoso'],
    ['intens', 'intenso'],
  ];
  return [
    ...new Set(dictionary.filter(([needle]) => haystack.includes(needle)).map(([, note]) => note)),
  ];
}

function inferAmount(name, weight, format) {
  const haystack = normalizeForSlug(name).toLowerCase();
  if (format === 'capsules' || format === 'pods') {
    const cap = haystack.match(/(\d+)\s*(caps|capsulas|uds|ud)\b/);
    if (cap) return Number.parseInt(cap[1], 10);
  }
  if (weight?.value && weight?.unitCode === 'kg') {
    return Math.round(Number.parseFloat(String(weight.value).replace(',', '.')) * 1000);
  }
  const kilo = haystack.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kilo) return Math.round(Number.parseFloat(kilo[1].replace(',', '.')) * 1000);
  const gram = haystack.match(/(\d+)\s*g\b/);
  if (gram) return Number.parseInt(gram[1], 10);
  return format === 'capsules' || format === 'pods' ? 10 : 500;
}

function shouldSkip(url, name, description) {
  const haystack = normalizeForSlug(`${url} ${name} ${description}`).toLowerCase();
  return (
    haystack.includes('pack') ||
    haystack.includes('soluble') ||
    haystack.includes('chocolat') ||
    haystack.includes('te ') ||
    haystack.includes('infusion') ||
    haystack.includes('cafe con leche')
  );
}

async function main() {
  const discovered = [];
  for (const pageUrl of CATEGORY_PAGES) {
    const html = await fetchText(pageUrl);
    for (const url of discoverProductUrls(html)) {
      discovered.push(url);
    }
  }

  const productUrls = Number.isFinite(LIMIT)
    ? uniqueBy(discovered, (url) => url).slice(0, LIMIT)
    : uniqueBy(discovered, (url) => url);
  const now = new Date().toISOString();

  console.log(`[FORTALEZA] Pages: ${CATEGORY_PAGES.length}`);
  console.log(`[FORTALEZA] Products discovered: ${productUrls.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const url of productUrls) {
    const html = await fetchText(url);
    const product = findProductJsonLd(html);
    if (!product) continue;

    const name = normalizeText(product.name || '');
    const description = normalizeText(product.description || '');
    if (!name || shouldSkip(url, name, description)) continue;

    const text = `${name} ${description}`;
    const format = inferFormat(url, name, description);
    const category = inferCategory(text);
    const image = Array.isArray(product.image)
      ? product.image[0]
      : normalizeText(product.image || '');
    const amount = inferAmount(name, product.weight, format);
    const origin = inferOrigin(text);
    const roast = inferRoast(text);
    const notes = inferNotes(text);
    const decaf = /descafeinad|decaf/i.test(normalizeForSlug(text));
    const isBio = /\bbio\b|organico|ecologico/i.test(normalizeForSlug(text));

    const cafe = {
      id: `fortaleza_${slugify(url)}`,
      fuente: 'fortaleza',
      fuentePais: 'ES',
      fuenteUrl: url,
      urlProducto: url,

      nombre: name,
      name,
      marca: 'Cafe Fortaleza',
      roaster: 'Cafe Fortaleza',

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

      formato: format === 'pods' ? 'capsules' : format,
      format: format === 'pods' ? 'capsules' : format,
      sistemaCapsula: format === 'capsules' || format === 'pods' ? inferCapsuleSystem(text) : '',
      tipoProducto:
        format === 'capsules' || format === 'pods'
          ? 'capsulas de cafe'
          : format === 'ground'
            ? 'cafe molido'
            : 'cafe en grano',
      cantidad: amount,
      intensidad: null,
      tueste: roast,
      roastLevel: roast,
      pais: origin,
      origen: origin,
      proceso: '',
      notas: notes.join(', '),
      notes: notes.join(', '),
      decaf,

      precio: Number.parseFloat(product?.offers?.price || '') || null,
      currency: normalizeText(product?.offers?.priceCurrency || 'EUR'),
      certificaciones: isBio ? 'organico' : '',
      isBio,
      inStock: /instock$/i.test(normalizeText(product?.offers?.availability || '')) || true,

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
        sourceType: 'fortaleza',
        sourceCategory: normalizeText(product.category || ''),
      },
    };

    cafes.push(cafe);
    console.log(`[FORTALEZA] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[FORTALEZA] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[FORTALEZA] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[FORTALEZA] Error:', error?.stack || error);
  process.exit(1);
});
