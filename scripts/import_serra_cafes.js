/*
  Importa blends actuales de Cafès Serra a Firestore.

  Fuente:
    https://cafesserra.com/es/collections/blends

  Estrategia:
    - Descubre fichas desde la colección Shopify.
    - Lee el JSON público `product.js` de cada producto.
    - Selecciona la variante "En grano" de menor peso como representación canónica.
    - Excluye regalos y deja sólo café.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const COLLECTION_URL = 'https://cafesserra.com/es/collections/blends';
const BASE_SITE = 'https://cafesserra.com';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-serra-real.json');
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

function parseAmount(text) {
  const normalized = normalizeForSlug(text).toLowerCase();
  const kiloMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kiloMatch) return Math.round(Number.parseFloat(kiloMatch[1].replace(',', '.')) * 1000);
  const gramMatch = normalized.match(/(\d+)\s*g\b/);
  if (gramMatch) return Number.parseInt(gramMatch[1], 10);
  return null;
}

function shouldSkip(url, name) {
  const haystack = normalizeForSlug(`${url} ${name}`).toLowerCase();
  return (
    haystack.includes('regala-cafe') ||
    haystack.includes('capsul') ||
    haystack.includes('monodosis') ||
    haystack.includes('tea') ||
    haystack.includes('te-')
  );
}

function discoverProductLinks(html) {
  return uniqueBy(
    [...String(html || '').matchAll(/href="(\/es\/collections\/blends\/products\/[^"#?]+)"/gi)]
      .map((match) => toAbsoluteUrl(match[1].replace('/collections/blends', '')))
      .filter((url) => url.startsWith(`${BASE_SITE}/es/products/`))
      .filter((url) => !shouldSkip(url, '')),
    (url) => url
  );
}

function pickBeanVariant(product) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const beanVariants = variants
    .map((variant) => {
      const optionText = normalizeText(
        `${variant?.title || ''} ${variant?.public_title || ''} ${(variant?.options || []).join(' ')}`
      );
      return {
        variant,
        optionText,
        amount: parseAmount(optionText),
      };
    })
    .filter((item) => /en grano/i.test(item.optionText));

  if (!beanVariants.length) return null;
  beanVariants.sort(
    (a, b) => (a.amount ?? Number.MAX_SAFE_INTEGER) - (b.amount ?? Number.MAX_SAFE_INTEGER)
  );
  return beanVariants[0].variant;
}

function inferOrigin(name, description) {
  const haystack = normalizeForSlug(`${name} ${description}`).toLowerCase();
  const hits = [];
  const mappings = [
    ['centroamerica', 'Centroamérica'],
    ['brasil', 'Brasil'],
    ['india', 'India'],
    ['colombia', 'Colombia'],
    ['etiopia', 'Etiopía'],
    ['ethiopia', 'Etiopía'],
    ['sumatra', 'Indonesia'],
  ];

  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) hits.push(value);
  }
  return hits.join(', ');
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    ['chocolate', 'chocolate'],
    ['frutas del bosque', 'frutos rojos'],
    ['fruta', 'fruta'],
    ['aromatica', 'aromatico'],
    ['crema', 'cremoso'],
    ['acidez suave', 'acidez suave'],
    ['cuerpo', 'cuerpo'],
  ];
  return [
    ...new Set(dictionary.filter(([needle]) => haystack.includes(needle)).map(([, note]) => note)),
  ];
}

function buildCafeDocId(productId, url) {
  return `serra_${slugify(productId || url)}`;
}

async function fetchProductJson(productUrl) {
  const jsonUrl = productUrl.replace(/\/$/, '') + '.js';
  const text = await fetchText(jsonUrl);
  return safeJsonParse(text);
}

async function discoverProducts() {
  const html = await fetchText(COLLECTION_URL);
  const links = discoverProductLinks(html);
  if (!links.length) throw new Error('No se encontraron productos en la colección de Serra.');
  return Number.isFinite(LIMIT) ? links.slice(0, LIMIT) : links;
}

async function enrichProduct(productUrl, now) {
  const html = await fetchText(productUrl);
  const product = await fetchProductJson(productUrl);
  if (!product) return null;

  const name = normalizeText(
    product.title || extractFirstMatch(html, /<title>\s*([^<]+)\s*<\/title>/i)
  );
  if (!name || shouldSkip(productUrl, name)) return null;

  const beanVariant = pickBeanVariant(product);
  if (!beanVariant) return null;

  const description = stripTags(
    product.description || extractFirstMatch(html, /<meta name="description" content="([^"]+)"/i)
  );
  const image = toAbsoluteUrl(
    beanVariant?.featured_image?.src ||
      product?.featured_image ||
      extractFirstMatch(html, /<meta property="og:image" content="([^"]+)"/i)
  );
  const amount = parseAmount(beanVariant.title || beanVariant.public_title || name);
  const origin = inferOrigin(name, description);
  const notes = inferNotes(description);
  const decaf = /descafe/i.test(normalizeForSlug(`${name} ${description}`));
  const isBio = /\becologic|bio\b/i.test(normalizeForSlug(`${name} ${description}`));

  return {
    id: buildCafeDocId(product.id, productUrl),
    fuente: 'serra',
    fuentePais: 'ES',
    fuenteUrl: productUrl,
    urlProducto: productUrl,

    nombre: name,
    name,
    marca: 'Cafès Serra',
    roaster: 'Cafès Serra',

    ean: '',
    normalizedEan: '',
    sku: normalizeText(beanVariant.sku || String(beanVariant.id)),
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
    tueste: 'medio',
    roastLevel: 'medio',
    pais: origin,
    origen: origin,
    proceso: '',
    notas: notes.join(', '),
    notes: notes.join(', '),
    decaf,

    precio: Number.isFinite(beanVariant.price) ? beanVariant.price / 100 : null,
    currency: 'EUR',
    certificaciones: isBio ? 'organico' : '',
    isBio,
    inStock: Boolean(beanVariant.available),

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
      sourceType: 'serra',
      productId: product.id,
      handle: product.handle,
      variantId: beanVariant.id,
      variantTitle: beanVariant.title,
      sourceCollectionUrl: COLLECTION_URL,
    },
  };
}

async function main() {
  const items = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[SERRA] Collection: ${COLLECTION_URL}`);
  console.log(`[SERRA] Products discovered: ${items.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const productUrl of items) {
    const cafe = await enrichProduct(productUrl, now);
    if (!cafe) continue;
    cafes.push(cafe);
    console.log(`[SERRA] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[SERRA] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[SERRA] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[SERRA] Error:', error?.stack || error);
  process.exit(1);
});
