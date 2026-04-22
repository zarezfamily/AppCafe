/*
  Importa cafés actuales de Segafredo a Firestore.

  Fuente:
    https://segafredo.es/cafe-en-casa/

  Estrategia:
    - Descubre fichas desde el loop de WooCommerce de la categoría.
    - Extrae nombre, descripción, imagen y categorías desde cada ficha.
    - Mapea formatos de cápsulas, molido y grano.
    - Genera un JSON local y hace upsert en `cafes` con firebase-admin.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const CATEGORY_URL = 'https://segafredo.es/cafe-en-casa/';
const BASE_SITE = 'https://segafredo.es';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-segafredo-real.json');
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

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(html) {
  return normalizeText(
    decodeHtmlEntities(
      String(html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
    )
  );
}

function toAbsoluteUrl(url) {
  const raw = normalizeText(url).split('#')[0];
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) return `https:${raw}`;
  if (raw.startsWith('/')) return `${BASE_SITE}${raw}`;
  return `${BASE_SITE}/${raw.replace(/^\/+/, '')}`;
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

function extractFirstMatch(html, pattern) {
  const match = String(html || '').match(pattern);
  return normalizeText(decodeHtmlEntities(match?.[1] || ''));
}

function discoverCategoryItems(html) {
  return uniqueBy(
    [
      ...String(html || '').matchAll(
        /<a[^>]*href="([^"]+)"[^>]*class="woocommerce-LoopProduct-link[^"]*"/gi
      ),
    ].map((match) => ({
      url: toAbsoluteUrl(match[1]),
    })),
    (item) => item.url
  );
}

function parseAmount(text) {
  const normalized = normalizeForSlug(text).toLowerCase();
  const capsuleMatch =
    normalized.match(/cx(\d+)\s*capsulas?/) || normalized.match(/(\d+)\s*capsulas?/);
  if (capsuleMatch) return Number.parseInt(capsuleMatch[1], 10);

  // Segafredo usa "500mg" en el frontal, pero por contexto de producto corresponde a 500g.
  const typo500mgMatch = normalized.match(/500mg/);
  if (typo500mgMatch) return 500;

  const gramMatch = normalized.match(/(\d+)\s*g\b/);
  if (gramMatch) return Number.parseInt(gramMatch[1], 10);

  return null;
}

function inferFormat(name, description, url, categories) {
  const haystack = normalizeForSlug(
    `${name} ${description} ${url} ${categories.join(' ')}`
  ).toLowerCase();
  if (haystack.includes('capsulas') || haystack.includes('nespresso')) return 'capsules';
  if (haystack.includes('molido') || haystack.includes('molidos')) return 'ground';
  if (haystack.includes('grano') || haystack.includes('/grano/')) return 'beans';
  return '';
}

function inferCapsuleSystem(name, url, categories) {
  const haystack = normalizeForSlug(`${name} ${url} ${categories.join(' ')}`).toLowerCase();
  if (haystack.includes('nespresso')) return 'nespresso';
  return '';
}

function inferOrigin(name, description, url) {
  const haystack = normalizeForSlug(`${name} ${description} ${url}`).toLowerCase();
  const mappings = [
    ['brasil', 'Brasil'],
    ['brazil', 'Brasil'],
    ['peru', 'Peru'],
    ['100 arabica', 'Arabica'],
  ];

  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) return value;
  }
  return '';
}

function inferRoast(name, description, url) {
  const haystack = normalizeForSlug(`${name} ${description} ${url}`).toLowerCase();
  if (haystack.includes('ristretto') || haystack.includes('intenso')) return 'intenso';
  if (haystack.includes('classico') || haystack.includes('clasico')) return 'medio';
  if (haystack.includes('100 arabica') || haystack.includes('descafeinado')) return 'suave';
  return '';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    'chocolate',
    'cacao',
    'frutas maduras',
    'frutos secos',
    'especias',
    'intenso',
    'cremosidad',
    'cremosa',
    'crema',
  ];

  return [
    ...new Set(
      dictionary
        .filter((note) => haystack.includes(note))
        .map((note) => {
          if (note === 'cremosa' || note === 'cremosidad') return 'cremoso';
          return note;
        })
    ),
  ];
}

function buildCafeDocId(url) {
  return `segafredo_${slugify(url.replace(/^https?:\/\/segafredo\.es\/product\//i, ''))}`;
}

async function discoverProducts() {
  const html = await fetchText(CATEGORY_URL);
  const items = discoverCategoryItems(html);
  if (!items.length) throw new Error('No se encontraron productos en Segafredo.');
  return Number.isFinite(LIMIT) ? items.slice(0, LIMIT) : items;
}

async function enrichProduct(item, now) {
  const html = await fetchText(item.url);
  const title = extractFirstMatch(html, /<title>([^<]+)<\/title>/i);
  const canonical = extractFirstMatch(html, /<link rel="canonical" href="([^"]+)"/i);
  const name = stripTags(
    (String(html).match(/<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
      [])[1] || title
  );
  const shortDescription = extractFirstMatch(
    html,
    /<div class="woocommerce-product-details__short-description">([\s\S]*?)<\/div>/i
  );
  const image = toAbsoluteUrl(
    extractFirstMatch(html, /<meta property="og:image" content="([^"]+)"/i)
  );
  const breadcrumbScript = extractFirstMatch(
    html,
    /<script type="application\/ld\+json">([\s\S]*?"@type":"BreadcrumbList"[\s\S]*?)<\/script>/i
  );

  const categoryMatches = [...String(html).matchAll(/product-category\/([a-z0-9-]+)/gi)].map(
    (match) => match[1]
  );
  const categories = [...new Set(categoryMatches)];
  const description = shortDescription;
  const amount = parseAmount(name);
  const format = inferFormat(name, description, item.url, categories);
  const system = inferCapsuleSystem(name, item.url, categories);
  const origin = inferOrigin(name, description, item.url);
  const roast = inferRoast(name, description, item.url);
  const notes = inferNotes(description);
  const decaf = /descafeinado/i.test(normalizeForSlug(`${name} ${description}`));

  return {
    id: buildCafeDocId(canonical || item.url),
    fuente: 'segafredo',
    fuentePais: 'ES',
    fuenteUrl: canonical || item.url,
    urlProducto: canonical || item.url,

    nombre: name,
    name,
    marca: 'Segafredo',
    roaster: 'Segafredo',

    ean: '',
    normalizedEan: '',
    sku: '',
    mpn: '',

    descripcion: description,
    description,

    category: format === 'capsules' ? 'capsules' : 'daily',
    coffeeCategory: format === 'capsules' ? 'capsules' : 'daily',
    isSpecialty: false,
    legacy: false,

    formato: format,
    format,
    sistemaCapsula: system,
    tipoProducto:
      format === 'beans'
        ? 'cafe en grano'
        : format === 'ground'
          ? 'cafe molido'
          : format === 'capsules'
            ? 'capsulas'
            : '',
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

    precio: null,
    currency: 'EUR',
    certificaciones: '',
    isBio: false,
    inStock: true,

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
      sourceType: 'segafredo',
      sourceTitle: title,
      sourceCategoryUrl: CATEGORY_URL,
      sourceCategories: categories,
      breadcrumbRaw: breadcrumbScript.slice(0, 280),
      priceUnavailable: true,
    },
  };
}

async function main() {
  const items = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[SEGAFREDO] Category: ${CATEGORY_URL}`);
  console.log(`[SEGAFREDO] Products discovered: ${items.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const item of items) {
    const cafe = await enrichProduct(item, now);
    cafes.push(cafe);
    console.log(`[SEGAFREDO] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[SEGAFREDO] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[SEGAFREDO] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[SEGAFREDO] Error:', error?.stack || error);
  process.exit(1);
});
