/*
  Importa cafes actuales de Stumptown Coffee a Firestore.

  Fuente:
    https://www.stumptowncoffee.com/collections/coffee

  Estrategia:
    - Descubre fichas de producto desde la coleccion Shopify.
    - Lee product.js para variantes, imagen y precio.
    - Excluye bundles, gear y suscripciones.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const COLLECTION_URL = 'https://www.stumptowncoffee.com/collections/coffee';
const BASE_SITE = 'https://www.stumptowncoffee.com';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-stumptown-real.json');
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
        .replace(/<meta[^>]*>/gi, ' ')
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

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseAmount(text) {
  const normalized = normalizeForSlug(text).toLowerCase();
  const ounce = normalized.match(/(\d+(?:[.,]\d+)?)\s*oz\b/);
  if (ounce) return Math.round(Number.parseFloat(ounce[1].replace(',', '.')) * 28.3495);
  const lbs = normalized.match(/(\d+(?:[.,]\d+)?)\s*lb?s?\b/);
  if (lbs) return Math.round(Number.parseFloat(lbs[1].replace(',', '.')) * 453.592);
  const gram = normalized.match(/(\d+)\s*g\b/);
  if (gram) return Number.parseInt(gram[1], 10);
  return null;
}

function discoverProductLinks(html) {
  return uniqueBy(
    [
      ...String(html || '').matchAll(
        /href="(https:\/\/www\.stumptowncoffee\.com\/products\/[^"#?]+|\/products\/[^"#?]+)"/gi
      ),
    ]
      .map((match) => toAbsoluteUrl(match[1]))
      .filter((url) => url.startsWith(`${BASE_SITE}/products/`)),
    (url) => url
  );
}

function shouldSkip(url, name, description) {
  const haystack = normalizeForSlug(`${url} ${name} ${description}`).toLowerCase();
  return (
    haystack.includes('bundle') ||
    haystack.includes('subscription') ||
    haystack.includes('gear') ||
    haystack.includes('cold-brew') ||
    haystack.includes('goodies') ||
    haystack.includes('bulk')
  );
}

function pickCoffeeVariant(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return null;
  const filtered = variants
    .map((variant) => ({
      variant,
      label: normalizeText(`${variant?.title || ''} ${(variant?.options || []).join(' ')}`),
      amount: parseAmount(`${variant?.title || ''} ${(variant?.options || []).join(' ')}`),
    }))
    .filter((item) => Number.isFinite(item.amount));
  filtered.sort(
    (a, b) => (a.amount ?? Number.MAX_SAFE_INTEGER) - (b.amount ?? Number.MAX_SAFE_INTEGER)
  );
  return filtered[0]?.variant || variants[0];
}

function inferOrigin(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const mappings = [
    ['colombia', 'Colombia'],
    ['indonesia', 'Indonesia'],
    ['sumatra', 'Indonesia'],
    ['guatemala', 'Guatemala'],
    ['ethiopia', 'Etiopia'],
    ['honduras', 'Honduras'],
    ['peru', 'Peru'],
    ['latin america', 'Latinoamerica'],
  ];
  const hits = [];
  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) hits.push(value);
  }
  return [...new Set(hits)].join(', ');
}

function inferRoastLevel(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('dark roast') || haystack.includes('french roast')) return 'dark';
  if (haystack.includes('medium roast')) return 'medium';
  return 'light';
}

function inferCategory(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('single origin')) return 'specialty';
  return 'daily';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    ['chocolate', 'chocolate'],
    ['caramel', 'caramelo'],
    ['cherry', 'cereza'],
    ['fruit', 'fruta'],
    ['pineapple', 'pina'],
    ['clove', 'clavo'],
    ['smoky', 'ahumado'],
    ['bold', 'intenso'],
  ];
  return [
    ...new Set(dictionary.filter(([needle]) => haystack.includes(needle)).map(([, note]) => note)),
  ];
}

async function fetchProductJson(productUrl) {
  const text = await fetchText(productUrl.replace(/\/$/, '') + '.js');
  return safeJsonParse(text);
}

async function discoverProducts() {
  const html = await fetchText(COLLECTION_URL);
  const links = discoverProductLinks(html);
  if (!links.length) throw new Error('No se encontraron productos en la coleccion de Stumptown.');
  const filtered = links.filter((url) => !shouldSkip(url, '', ''));
  return Number.isFinite(LIMIT) ? filtered.slice(0, LIMIT) : filtered;
}

async function enrichProduct(productUrl, now) {
  const product = await fetchProductJson(productUrl);
  if (!product) return null;

  const name = normalizeText(product.title || '');
  const description = stripTags(product.description || '');
  if (!name || shouldSkip(productUrl, name, description)) return null;

  const variant = pickCoffeeVariant(product);
  if (!variant) return null;
  const detailText = `${name} ${description} ${product.type || ''} ${(product.tags || []).join(' ')}`;
  const image = toAbsoluteUrl(
    variant?.featured_image?.src || product?.featured_image || product?.images?.[0] || ''
  );

  return {
    id: `stumptown_${slugify(product.handle || productUrl)}`,
    fuente: 'stumptown',
    fuentePais: 'US',
    fuenteUrl: productUrl,
    urlProducto: productUrl,

    nombre: name,
    name,
    marca: 'Stumptown Coffee',
    roaster: 'Stumptown Coffee',

    ean: '',
    normalizedEan: '',
    sku: normalizeText(variant?.sku || String(variant?.id || product?.id)),
    mpn: '',

    descripcion: description,
    description,

    category: inferCategory(detailText),
    coffeeCategory: inferCategory(detailText) === 'specialty' ? 'specialty' : 'daily',
    isSpecialty: inferCategory(detailText) === 'specialty',
    legacy: false,

    formato: 'beans',
    format: 'beans',
    sistemaCapsula: '',
    tipoProducto: 'cafe en grano',
    cantidad: parseAmount(`${variant?.title || ''} ${name}`),
    intensidad: null,
    tueste: inferRoastLevel(detailText),
    roastLevel: inferRoastLevel(detailText),
    pais: inferOrigin(detailText),
    origen: inferOrigin(detailText),
    proceso: '',
    notas: inferNotes(detailText).join(', '),
    notes: inferNotes(detailText).join(', '),
    decaf: /decaf/i.test(normalizeForSlug(detailText)),

    precio: Number.isFinite(variant?.price) ? variant.price / 100 : null,
    currency: 'USD',
    certificaciones: /\borganic\b/i.test(normalizeForSlug(detailText)) ? 'organico' : '',
    isBio: /\borganic\b/i.test(normalizeForSlug(detailText)),
    inStock: Boolean(variant?.available),

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
      sourceType: 'stumptown',
      productId: product.id,
      handle: product.handle,
      variantId: variant?.id || null,
      variantTitle: variant?.title || '',
      sourceCollectionUrl: COLLECTION_URL,
    },
  };
}

async function main() {
  const items = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[STUMPTOWN] Collection: ${COLLECTION_URL}`);
  console.log(`[STUMPTOWN] Products discovered: ${items.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const productUrl of items) {
    let cafe = null;
    try {
      cafe = await enrichProduct(productUrl, now);
    } catch (error) {
      console.log(`[STUMPTOWN] Skip error: ${productUrl} -> ${error.message}`);
      continue;
    }
    if (!cafe) continue;
    cafes.push(cafe);
    console.log(`[STUMPTOWN] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[STUMPTOWN] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[STUMPTOWN] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[STUMPTOWN] Error:', error?.stack || error);
  process.exit(1);
});
