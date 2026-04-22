/*
  Importa cafés en grano actuales de Cafés Oquendo a Firestore.

  Fuentes:
    - https://www.cafesoquendo.com/cafe/en-grano/
    - https://www.cafesoquendo.com/cafe/en-grano/grandes-origenes/
    - https://www.cafesoquendo.com/cafe/en-grano/estandar/
    - https://www.cafesoquendo.com/cafe/en-grano/bio/

  Estrategia:
    - Descubre productos desde las categorías WooCommerce de café en grano.
    - Extrae metadatos desde Yoast JSON-LD y el bloque PixelYourSite.
    - Conserva sólo café en grano y genera el JSON local antes del upsert.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const CATEGORY_URLS = [
  'https://www.cafesoquendo.com/cafe/en-grano/',
  'https://www.cafesoquendo.com/cafe/en-grano/grandes-origenes/',
  'https://www.cafesoquendo.com/cafe/en-grano/estandar/',
  'https://www.cafesoquendo.com/cafe/en-grano/bio/',
];
const BASE_SITE = 'https://www.cafesoquendo.com';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-oquendo-real.json');
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

function decodeUnicodeEscapes(value) {
  return String(value || '').replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );
}

function stripTags(html) {
  return normalizeText(
    decodeHtmlEntities(
      String(html || '')
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<br\s*\/?>/gi, ' ')
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

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parsePrice(text) {
  const raw = normalizeText(text);
  const normalized = raw.includes(',')
    ? raw
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^\d.]/g, '')
    : raw.replace(/[^\d.]/g, '');
  const price = Number.parseFloat(normalized);
  return Number.isFinite(price) ? price : null;
}

function parseAmount(text) {
  const normalized = normalizeForSlug(text).toLowerCase();
  const packMatch = normalized.match(/(\d+)\s*x\s*(\d+)\s*g\b/);
  if (packMatch) {
    return Number.parseInt(packMatch[1], 10) * Number.parseInt(packMatch[2], 10);
  }
  const kiloMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kiloMatch) return Math.round(Number.parseFloat(kiloMatch[1].replace(',', '.')) * 1000);
  const gramMatch = normalized.match(/(\d+)\s*g\b/);
  if (gramMatch) return Number.parseInt(gramMatch[1], 10);
  return null;
}

function shouldSkip(url, name) {
  const haystack = normalizeForSlug(`${url} ${name}`).toLowerCase();
  return haystack.includes('capsul') || haystack.includes('molido') || haystack.includes('soluble');
}

function discoverCategoryItems(html, categoryUrl) {
  const products = [
    ...String(html || '').matchAll(
      /<a[^>]+href="([^"]+)"[^>]*class="woocommerce-LoopProduct-link/gi
    ),
  ]
    .map((match) => toAbsoluteUrl(match[1]))
    .filter((url) => url.startsWith(`${BASE_SITE}/tienda-oquendo/`))
    .map((url) => ({
      url,
      sourceCategoryUrl: categoryUrl,
    }));

  return uniqueBy(products, (item) => item.url).filter((item) => !shouldSkip(item.url, ''));
}

function findYoastGraph(html) {
  const raw = extractFirstMatch(
    html,
    /<script type="application\/ld\+json" class="yoast-schema-graph">([\s\S]*?)<\/script>/i
  );
  return safeJsonParse(raw);
}

function extractWebPageNode(graph) {
  return graph?.['@graph']?.find((node) => node?.['@type'] === 'WebPage') || null;
}

function extractBreadcrumbNames(graph) {
  const breadcrumb = graph?.['@graph']?.find((node) => node?.['@type'] === 'BreadcrumbList');
  const elements = Array.isArray(breadcrumb?.itemListElement) ? breadcrumb.itemListElement : [];
  return elements.map((item) => normalizeText(item?.name || '')).filter(Boolean);
}

function extractPysInfo(html) {
  const contentName = decodeUnicodeEscapes(extractFirstMatch(html, /"content_name":"([^"]+)"/i));
  const categoryName = decodeUnicodeEscapes(extractFirstMatch(html, /"category_name":"([^"]+)"/i));
  const price = parsePrice(extractFirstMatch(html, /"product_price":"([^"]+)"/i));
  const stock = extractFirstMatch(html, /"stock":"([^"]+)"/i);
  const postId = extractFirstMatch(html, /"post_id":(\d+)/i);
  return {
    contentName,
    categoryName,
    price,
    stock,
    postId,
  };
}

function inferCategory(item, breadcrumbs, pysCategoryName) {
  const haystack = normalizeForSlug(
    `${item.sourceCategoryUrl} ${breadcrumbs.join(' ')} ${pysCategoryName}`
  ).toLowerCase();
  if (haystack.includes('grandes origenes')) return 'specialty';
  return 'daily';
}

function inferOrigin(name, description, url) {
  const haystack = normalizeForSlug(`${name} ${description} ${url}`).toLowerCase();
  const mappings = [
    ['colombia', 'Colombia'],
    ['brasil', 'Brasil'],
    ['bio', ''],
    ['descafeinado', ''],
    ['espresso italiano', 'Italia'],
  ];

  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) return value;
  }
  return '';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = ['intenso', 'equilibrado', 'suave', 'aromatico', 'dulce', 'cacao', 'fruta'];
  return [...new Set(dictionary.filter((note) => haystack.includes(note)))];
}

function buildCafeDocId(sku, url) {
  return `oquendo_${slugify(sku || url)}`;
}

async function discoverProducts() {
  const all = [];
  for (const categoryUrl of CATEGORY_URLS) {
    const html = await fetchText(categoryUrl);
    all.push(...discoverCategoryItems(html, categoryUrl));
  }
  const deduped = uniqueBy(all, (item) => item.url);
  if (!deduped.length) throw new Error('No se encontraron fichas de producto en Oquendo.');
  return Number.isFinite(LIMIT) ? deduped.slice(0, LIMIT) : deduped;
}

async function enrichProduct(item, now) {
  const html = await fetchText(item.url);
  const graph = findYoastGraph(html);
  const webPage = extractWebPageNode(graph);
  const breadcrumbs = extractBreadcrumbNames(graph);
  const pys = extractPysInfo(html);

  const canonical = normalizeText(webPage?.url || item.url);
  const name = normalizeText(
    pys.contentName || webPage?.name || extractFirstMatch(html, /<title>([\s\S]*?)<\/title>/i)
  )
    .replace(/\s*-\s*Paquete\s+\d+\s*gr\b/i, '')
    .replace(/\s+\|\s+Cafés Oquendo$/i, '');

  if (!name || shouldSkip(canonical, name)) return null;

  const description = normalizeText(webPage?.description || breadcrumbs.join(', '));
  const image = toAbsoluteUrl(
    normalizeText(
      webPage?.thumbnailUrl ||
        extractFirstMatch(html, /<meta property="og:image" content="([^"]+)"/i)
    )
  );
  const sku =
    extractFirstMatch(html, /"singleProductId":(\d+)/i) || pys.postId || slugify(canonical);
  const price = pys.price;
  const amount = parseAmount(`${name} ${description}`);
  const category = inferCategory(item, breadcrumbs, pys.categoryName);
  const origin = inferOrigin(name, description, canonical);
  const notes = inferNotes(description);
  const decaf = /descafeinad/i.test(normalizeForSlug(`${name} ${description}`));
  const isBio = /\bbio\b|organico|ecologic/i.test(
    normalizeForSlug(`${name} ${description} ${pys.categoryName}`)
  );
  const inStock = pys.stock
    ? pys.stock.toLowerCase() === 'instock'
    : !/agotado/i.test(normalizeForSlug(html));

  return {
    id: buildCafeDocId(sku, canonical),
    fuente: 'oquendo',
    fuentePais: 'ES',
    fuenteUrl: canonical,
    urlProducto: canonical,

    nombre: name,
    name,
    marca: 'Cafés Oquendo',
    roaster: 'Cafés Oquendo',

    ean: '',
    normalizedEan: '',
    sku,
    mpn: '',

    descripcion: description,
    description,

    category,
    coffeeCategory: category,
    isSpecialty: category === 'specialty',
    legacy: false,

    formato: 'beans',
    format: 'beans',
    sistemaCapsula: '',
    tipoProducto: 'cafe en grano',
    cantidad: amount,
    intensidad: null,
    tueste: 'medio',
    roastLevel: 'medio',
    pais: origin,
    origen: origin,
    proceso: '',
    notas: notes.join(', '),
    notes: notes.join(', '),
    decaf,

    precio: price,
    currency: 'EUR',
    certificaciones: isBio ? 'organico' : '',
    isBio,
    inStock,

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
      sourceType: 'oquendo',
      sourceCategoryUrl: item.sourceCategoryUrl,
      breadcrumbs,
      pysCategoryName: pys.categoryName || '',
    },
  };
}

async function main() {
  const items = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[OQUENDO] Categories: ${CATEGORY_URLS.length}`);
  console.log(`[OQUENDO] Products discovered: ${items.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const item of items) {
    const cafe = await enrichProduct(item, now);
    if (!cafe) continue;
    cafes.push(cafe);
    console.log(`[OQUENDO] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[OQUENDO] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[OQUENDO] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[OQUENDO] Error:', error?.stack || error);
  process.exit(1);
});
