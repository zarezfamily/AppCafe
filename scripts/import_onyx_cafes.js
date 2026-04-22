/*
  Importa cafes actuales de Onyx Coffee Lab EU a Firestore.

  Fuente:
    https://onyxcoffeelab.eu/collections/coffee

  Estrategia:
    - Descubre fichas desde la coleccion Shopify.
    - Usa el HTML de coleccion para capturar origen, proceso, variedad, roast y notas.
    - Lee el JSON publico product.js de cada producto para precio, variantes e imagen.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const COLLECTION_URL = 'https://onyxcoffeelab.eu/collections/coffee';
const BASE_SITE = 'https://onyxcoffeelab.eu';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-onyx-real.json');
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
  const lbs = normalized.match(/(\d+(?:[.,]\d+)?)\s*lbs?\b/);
  if (lbs) return Math.round(Number.parseFloat(lbs[1].replace(',', '.')) * 453.592);
  const kilo = normalized.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kilo) return Math.round(Number.parseFloat(kilo[1].replace(',', '.')) * 1000);
  const gram = normalized.match(/(\d+)\s*g\b/);
  if (gram) return Number.parseInt(gram[1], 10);
  return null;
}

function shouldSkip(url, name) {
  const haystack = normalizeForSlug(`${url} ${name}`).toLowerCase();
  return haystack.includes('advent-calendar');
}

function discoverProductsFromCollection(html) {
  const source = String(html || '');
  const items = [];
  const blocks = [
    ...source.matchAll(
      /<div class="product-preview[\s\S]*?<hr class="scroll-class" \/>[\s\S]*?<\/div>\s*<\/div>/gi
    ),
  ];
  for (const match of blocks) {
    const block = match[0];
    const href = (block.match(/<a href="(\/products\/[^"]+)"/i) || [])[1];
    if (!href) continue;
    const url = toAbsoluteUrl(href);
    const name = normalizeText(
      decodeHtmlEntities(
        (block.match(/<h3[^>]*class="title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i) || [])[1] || ''
      )
    );
    const notes = normalizeText(
      decodeHtmlEntities((block.match(/<div class="notes">([\s\S]*?)<\/div>/i) || [])[1] || '')
    );
    const originRaw = decodeHtmlEntities(
      (block.match(/data-origin="([^"]+)"/i) || [])[1] || '[]'
    ).replace(/&quot;/g, '"');
    const processRaw = decodeHtmlEntities(
      (block.match(/data-process="([^"]+)"/i) || [])[1] || '[]'
    ).replace(/&quot;/g, '"');
    const varietyRaw = decodeHtmlEntities(
      (block.match(/data-variety="([^"]+)"/i) || [])[1] || '[]'
    ).replace(/&quot;/g, '"');
    const profile = normalizeText((block.match(/data-profile="([^"]+)"/i) || [])[1] || '');
    const roast = normalizeText((block.match(/data-roast="([^"]+)"/i) || [])[1] || '');
    items.push({
      url,
      name,
      notes,
      origin: safeJsonParse(originRaw) || [],
      process: safeJsonParse(processRaw) || [],
      variety: safeJsonParse(varietyRaw) || [],
      profile,
      roast,
    });
  }
  return uniqueBy(items, (item) => item.url);
}

function pickCanonicalVariant(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return null;
  const filtered = variants
    .map((variant) => ({
      variant,
      amount: parseAmount(`${variant?.title || ''} ${(variant?.options || []).join(' ')}`),
    }))
    .filter((item) => Number.isFinite(item.amount) && item.amount >= 250);

  const list = filtered.length
    ? filtered
    : variants.map((variant) => ({
        variant,
        amount: parseAmount(`${variant?.title || ''} ${(variant?.options || []).join(' ')}`),
      }));
  list.sort(
    (a, b) => (a.amount ?? Number.MAX_SAFE_INTEGER) - (b.amount ?? Number.MAX_SAFE_INTEGER)
  );
  return list[0]?.variant || variants[0];
}

async function fetchProductJson(productUrl) {
  const text = await fetchText(productUrl.replace(/\/$/, '') + '.js');
  return safeJsonParse(text);
}

function inferRoastLevel(rawValue) {
  const n = Number.parseInt(rawValue || '', 10);
  if (!Number.isFinite(n)) return 'light';
  if (n <= 76) return 'light';
  if (n <= 78) return 'medium';
  return 'dark';
}

async function main() {
  const collectionHtml = await fetchText(COLLECTION_URL);
  const items = discoverProductsFromCollection(collectionHtml).filter(
    (item) => !shouldSkip(item.url, item.name)
  );
  const selected = Number.isFinite(LIMIT) ? items.slice(0, LIMIT) : items;
  const now = new Date().toISOString();

  console.log(`[ONYX] Collection: ${COLLECTION_URL}`);
  console.log(`[ONYX] Products discovered: ${selected.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const item of selected) {
    const product = await fetchProductJson(item.url);
    if (!product) continue;
    const variant = pickCanonicalVariant(product);
    if (!variant) continue;
    const description = stripTags(product.description || '');
    const image = toAbsoluteUrl(variant?.featured_image?.src || product?.featured_image || '');
    const detailText = `${item.name} ${description} ${item.origin.join(' ')} ${item.process.join(' ')} ${item.variety.join(' ')}`;

    const cafe = {
      id: `onyx_${slugify(product.handle || item.url)}`,
      fuente: 'onyx',
      fuentePais: 'EU',
      fuenteUrl: item.url,
      urlProducto: item.url,

      nombre: item.name || normalizeText(product.title || ''),
      name: item.name || normalizeText(product.title || ''),
      marca: 'Onyx Coffee Lab',
      roaster: 'Onyx Coffee Lab',

      ean: '',
      normalizedEan: '',
      sku: normalizeText(variant?.sku || String(variant?.id || product?.id)),
      mpn: '',

      descripcion: description,
      description,

      category: 'specialty',
      coffeeCategory: 'specialty',
      isSpecialty: true,
      legacy: false,

      formato: 'beans',
      format: 'beans',
      sistemaCapsula: '',
      tipoProducto: 'cafe en grano',
      cantidad: parseAmount(`${variant?.title || ''} ${item.name}`),
      intensidad: null,
      tueste: inferRoastLevel(item.roast),
      roastLevel: inferRoastLevel(item.roast),
      pais: item.origin.join(', '),
      origen: item.origin.join(', '),
      proceso: item.process.join(', '),
      notas: item.notes.replace(/\s*\|\s*/g, ', '),
      notes: item.notes.replace(/\s*\|\s*/g, ', '),
      decaf: /decaf|descafe/i.test(normalizeForSlug(detailText)),

      precio: Number.isFinite(variant?.price) ? variant.price / 100 : null,
      currency: 'EUR',
      certificaciones: '',
      isBio: false,
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
        sourceType: 'onyx',
        productId: product.id,
        handle: product.handle,
        variantId: variant?.id || null,
        variantTitle: variant?.title || '',
        profile: item.profile,
        roastRaw: item.roast,
        variety: item.variety,
        sourceCollectionUrl: COLLECTION_URL,
      },
    };

    cafes.push(cafe);
    console.log(`[ONYX] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[ONYX] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[ONYX] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[ONYX] Error:', error?.stack || error);
  process.exit(1);
});
