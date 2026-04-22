/*
  Importa cafés actuales de De'Longhi a Firestore.

  Fuente:
    https://www.delonghi.com/es-es/c/cafe/accesorios/cafe-en-grano

  Estrategia:
    - Descubre fichas desde las páginas del listado.
    - Resuelve la URL localizada `es-es` desde el `hreflang` de cada ficha.
    - Extrae `WebPage`, `Product` y `BreadcrumbList` del JSON-LD.
    - Excluye packs que añaden accesorios (vasos, filtros) además del café.
    - Genera un JSON local y hace upsert en `cafes` con firebase-admin.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const CATEGORY_URLS = [
  'https://www.delonghi.com/es-es/c/cafe/accesorios/cafe-en-grano',
  'https://www.delonghi.com/es-es/c/cafe/accesorios/cafe-en-grano?page=2',
];
const BASE_SITE = 'https://www.delonghi.com';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-delonghi-real.json');
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

async function fetchText(url, options = {}) {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    redirect: options.redirect || 'follow',
  });
  const text = await response.text();
  if (!response.ok && response.status !== 301 && response.status !== 302) {
    throw new Error(`HTTP_${response.status} ${url} ${text.slice(0, 200)}`);
  }
  return { response, text };
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

function findJsonLdItems(html) {
  return [
    ...String(html || '').matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    ),
  ]
    .map((match) => safeJsonParse(match[1]))
    .filter(Boolean);
}

function findJsonLdByType(items, type) {
  return items.find((item) => item?.['@type'] === type) || null;
}

function discoverCategoryItems(html, categoryUrl) {
  const jsonLdItems = findJsonLdItems(html);
  const itemList = findJsonLdByType(jsonLdItems, 'ItemList');
  const urls = Array.isArray(itemList?.itemListElement)
    ? itemList.itemListElement.map((entry) => toAbsoluteUrl(entry?.url || ''))
    : [];

  return uniqueBy(
    urls.map((url) => ({
      url,
      sourceCategoryUrl: categoryUrl,
    })),
    (item) => item.url
  );
}

function extractEsLocalizedUrl(html, fallbackUrl) {
  const localized = normalizeText(
    (String(html || '').match(/hreflang="es-es"[^>]*href="([^"]+)"/i) || [])[1] || ''
  );
  return toAbsoluteUrl(localized || fallbackUrl);
}

function parseAmount(name, description) {
  const normalized = normalizeForSlug(`${name} ${description}`).toLowerCase();
  const packMatch = normalized.match(/(\d+)\s*x\s*(\d+)\s*g\b/);
  if (packMatch) {
    return Number.parseInt(packMatch[1], 10) * Number.parseInt(packMatch[2], 10);
  }

  const kiloMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kiloMatch) {
    return Math.round(Number.parseFloat(kiloMatch[1].replace(',', '.')) * 1000);
  }

  const gramMatch = normalized.match(/(\d+)\s*g\b/);
  if (gramMatch) {
    return Number.parseInt(gramMatch[1], 10);
  }

  return null;
}

function inferOrigin(name, description, url) {
  const haystack = normalizeForSlug(`${name} ${description} ${url}`).toLowerCase();
  const mappings = [
    ['brasil', 'Brasil'],
    ['brazil', 'Brasil'],
    ['etiopia', 'Etiopia'],
    ['ethiopia', 'Etiopia'],
    ['india', 'India'],
    ['kimbo', 'Italia'],
  ];

  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) return value;
  }
  return '';
}

function inferRoast(name, description, url) {
  const haystack = normalizeForSlug(`${name} ${description} ${url}`).toLowerCase();
  if (
    haystack.includes('gourmet') ||
    haystack.includes('100 arabica') ||
    haystack.includes('tueste ligero')
  ) {
    return 'suave';
  }
  if (
    haystack.includes('classico') ||
    haystack.includes('selezione') ||
    haystack.includes('prestige')
  ) {
    return 'medio';
  }
  if (haystack.includes('robusta') || haystack.includes('decaffeinato')) {
    return 'intenso';
  }
  return '';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    'caramelo',
    'fruta',
    'frutas',
    'cana de azucar',
    'cacao',
    'chocolate',
    'especias',
    'crema',
    'dulce',
    'aromatico',
  ];

  return [
    ...new Set(
      dictionary
        .filter((note) => haystack.includes(note))
        .map((note) => {
          if (note === 'frutas') return 'fruta';
          return note;
        })
    ),
  ];
}

function isAccessoryBundle(name, description, url) {
  const haystack = normalizeForSlug(`${name} ${description} ${url}`).toLowerCase();
  return (
    (haystack.includes('vasos') || haystack.includes('vaso') || haystack.includes('filtro')) &&
    (haystack.includes('pack essential') || haystack.includes('kit de degustacion'))
  );
}

function buildCafeDocId(sku) {
  return `delonghi_${slugify(sku)}`;
}

function parsePriceFallback(html) {
  const raw =
    (String(html || '').match(/"price"\s*:\s*([0-9.]+)/i) || [])[1] ||
    (String(html || '').match(/"price"\s*:\s*"([0-9.]+)"/i) || [])[1] ||
    '';
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

async function discoverProducts() {
  const all = [];
  for (const categoryUrl of CATEGORY_URLS) {
    const { text } = await fetchText(categoryUrl);
    all.push(...discoverCategoryItems(text, categoryUrl));
  }
  const deduped = uniqueBy(all, (item) => item.url);
  if (!deduped.length) throw new Error('No se encontraron productos en DeLonghi.');
  return Number.isFinite(LIMIT) ? deduped.slice(0, LIMIT) : deduped;
}

async function enrichProduct(item, now) {
  const { text: genericHtml } = await fetchText(item.url);
  const localizedUrl = extractEsLocalizedUrl(genericHtml, item.url);
  const { text: html } = await fetchText(localizedUrl);

  const jsonLdItems = findJsonLdItems(html);
  const webPage = findJsonLdByType(jsonLdItems, 'WebPage');
  const product = findJsonLdByType(jsonLdItems, 'Product');
  const breadcrumb = findJsonLdByType(jsonLdItems, 'BreadcrumbList');

  if (!product && !webPage) {
    throw new Error(`No Product JSON-LD en ${localizedUrl}`);
  }

  const h1 = normalizeText(
    decodeHtmlEntities((String(html).match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || '').replace(
      /<[^>]+>/g,
      ' '
    )
  );
  const name = normalizeText(product?.name || webPage?.name || h1);
  const description = normalizeText(webPage?.description || '');
  const sku = normalizeText((localizedUrl.match(/\/([A-Z0-9]+)\.html/i) || [])[1] || '');
  const image = toAbsoluteUrl(product?.image?.contentUrl || product?.image?.url || '');
  const price =
    typeof product?.offers?.price === 'number'
      ? product.offers.price
      : Number(product?.offers?.price) || parsePriceFallback(html);
  const availability = normalizeText(product?.offers?.availability || '');
  const amount = parseAmount(name, description);
  const origin = inferOrigin(name, description, localizedUrl);
  const roast = inferRoast(name, description, localizedUrl);
  const notes = inferNotes(description);
  const decaf = /decaffeinato|descafeinado/i.test(normalizeForSlug(`${name} ${description}`));

  if (isAccessoryBundle(name, description, localizedUrl)) {
    return null;
  }

  return {
    id: buildCafeDocId(sku || localizedUrl),
    fuente: 'delonghi',
    fuentePais: 'ES',
    fuenteUrl: localizedUrl,
    urlProducto: localizedUrl,

    nombre: name,
    name,
    marca: "De'Longhi",
    roaster: "De'Longhi",

    ean: '',
    normalizedEan: '',
    sku,
    mpn: '',

    descripcion: description,
    description,

    category: 'daily',
    coffeeCategory: 'daily',
    isSpecialty: false,
    legacy: false,

    formato: 'beans',
    format: 'beans',
    sistemaCapsula: '',
    tipoProducto: 'cafe en grano',
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

    precio: price,
    currency: normalizeText(product?.offers?.priceCurrency || 'EUR'),
    certificaciones: '',
    isBio: false,
    inStock: /instock$/i.test(availability),

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
      sourceType: 'delonghi',
      sourceCategoryUrl: item.sourceCategoryUrl,
      genericUrl: item.url,
      localizedUrl,
      breadcrumbLast: normalizeText(
        breadcrumb?.itemListElement?.[breadcrumb.itemListElement.length - 1]?.item?.name || ''
      ),
    },
  };
}

async function main() {
  const items = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[DELONGHI] Categories: ${CATEGORY_URLS.length}`);
  console.log(`[DELONGHI] Products discovered: ${items.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const item of items) {
    const cafe = await enrichProduct(item, now);
    if (!cafe) continue;
    cafes.push(cafe);
    console.log(`[DELONGHI] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[DELONGHI] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[DELONGHI] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[DELONGHI] Error:', error?.stack || error);
  process.exit(1);
});
