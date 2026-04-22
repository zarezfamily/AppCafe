/*
  Importa cafés actuales de San Jorge Coffee Roasters a Firestore.

  Fuente:
    https://sanjorge.cafe/pages/todos-los-cafes

  Estrategia:
    - Descubre fichas de producto desde la página "Todos los cafés".
    - Extrae el Product JSON-LD y el objeto `meta.product` de Shopify.
    - Selecciona la variante "En grano" como representación canónica del café.
    - Excluye suscripciones para no mezclar producto físico con servicio recurrente.
    - Genera un JSON local y hace upsert en `cafes` con firebase-admin.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const COLLECTION_URL = 'https://sanjorge.cafe/pages/todos-los-cafes';
const BASE_SITE = 'https://sanjorge.cafe';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-sanjorge-real.json');
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
  const raw = normalizeText(url);
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

function findProductJsonLd(html) {
  const scripts = [
    ...String(html || '').matchAll(
      /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    ),
  ]
    .map((match) => safeJsonParse(match[1]))
    .filter(Boolean);

  return scripts.find((item) => item?.['@type'] === 'Product') || null;
}

function findShopifyMetaProduct(html) {
  const match = html.match(/var meta = (\{[\s\S]*?\});\s*for \(var attr in meta\)/i);
  const parsed = safeJsonParse(match?.[1] || '');
  return parsed?.product || null;
}

function discoverProductLinks(html) {
  return uniqueBy(
    [...String(html || '').matchAll(/href="([^"]*\/products\/[^"]+)"/gi)]
      .map((match) => toAbsoluteUrl(match[1]))
      .filter((url) => url.startsWith(`${BASE_SITE}/products/`)),
    (url) => url
  );
}

function parseVariantTitle(variantTitle) {
  const raw = normalizeText(variantTitle);
  const parts = raw.split('/').map((part) => normalizeText(part));
  return {
    preparationLabel: parts[0] || raw,
    amountLabel: parts[1] || '',
  };
}

function extractQuantityFromLabel(label, fallbackName) {
  const normalized = normalizeForSlug(`${label} ${fallbackName}`).toLowerCase();
  const kiloMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kiloMatch) {
    return Math.round(Number.parseFloat(kiloMatch[1].replace(',', '.')) * 1000);
  }

  const gramMatch = normalized.match(/(\d+)\s*gr\b|(\d+)\s*g\b/);
  if (gramMatch) {
    return Number.parseInt(gramMatch[1] || gramMatch[2], 10);
  }

  return null;
}

function selectBeanVariant(productJsonLd, metaProduct) {
  const offers = Array.isArray(productJsonLd?.offers) ? productJsonLd.offers : [];
  const metaVariants = Array.isArray(metaProduct?.variants) ? metaProduct.variants : [];

  const merged = offers.map((offer) => {
    const offerUrl = normalizeText(offer?.url || '');
    const variantId = normalizeText((offerUrl.match(/variant=(\d+)/) || [])[1] || '');
    const metaVariant = metaVariants.find((item) => String(item.id) === variantId) || null;
    const variantName = normalizeText(
      metaVariant?.public_title || offer?.name || metaVariant?.name || ''
    );
    const { preparationLabel, amountLabel } = parseVariantTitle(variantName);

    return {
      id: variantId,
      sku: normalizeText(offer?.sku || metaVariant?.sku || ''),
      name: variantName,
      preparationLabel,
      amountLabel,
      quantity: extractQuantityFromLabel(
        amountLabel,
        metaVariant?.name || metaProduct?.handle || ''
      ),
      price: typeof offer?.price === 'number' ? offer.price : Number(offer?.price) || null,
      currency: normalizeText(offer?.priceCurrency || 'EUR'),
      availability: normalizeText(offer?.availability || ''),
      url: toAbsoluteUrl(offerUrl),
    };
  });

  const beanVariants = merged.filter((variant) =>
    normalizeForSlug(`${variant.name} ${variant.preparationLabel}`)
      .toLowerCase()
      .includes('en grano')
  );

  if (!beanVariants.length) return null;

  beanVariants.sort((a, b) => {
    const qa = Number.isFinite(a.quantity) ? a.quantity : Number.MAX_SAFE_INTEGER;
    const qb = Number.isFinite(b.quantity) ? b.quantity : Number.MAX_SAFE_INTEGER;
    return qa - qb;
  });

  return beanVariants[0] || null;
}

function inferOrigin(name, description, handle) {
  const haystack = normalizeForSlug(`${name} ${description} ${handle}`).toLowerCase();
  const mappings = [
    ['colombia', 'Colombia'],
    ['etiopia', 'Etiopia'],
    ['ethiopia', 'Etiopia'],
    ['mexico', 'Mexico'],
  ];

  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) return value;
  }
  return '';
}

function inferRoast(name, description, handle) {
  const haystack = normalizeForSlug(`${name} ${description} ${handle}`).toLowerCase();
  if (haystack.includes('descafeinado')) return 'medio';
  if (haystack.includes('blend')) return 'medio';
  return '';
}

function inferCategory(name, description, handle) {
  const haystack = normalizeForSlug(`${name} ${description} ${handle}`).toLowerCase();
  if (haystack.includes('pack') || haystack.includes('moka warriors')) return 'daily';
  return 'specialty';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    'chocolate',
    'cacao',
    'caramelo',
    'fruta',
    'frutal',
    'floral',
    'dulce',
    'avellana',
    'citrico',
    'cremoso',
  ];

  return [
    ...new Set(
      dictionary
        .filter((note) => haystack.includes(note))
        .map((note) => {
          if (note === 'frutal') return 'fruta';
          return note;
        })
    ),
  ];
}

function buildCafeDocId(handle, sku) {
  return `sanjorge_${slugify(sku || handle)}`;
}

function shouldSkipProduct(url, name, description) {
  const haystack = normalizeForSlug(`${url} ${name} ${description}`).toLowerCase();
  return haystack.includes('suscripcion');
}

async function discoverProducts() {
  const html = await fetchText(COLLECTION_URL);
  const urls = discoverProductLinks(html);
  if (!urls.length) throw new Error('No se encontraron fichas de producto en San Jorge.');
  return Number.isFinite(LIMIT) ? urls.slice(0, LIMIT) : urls;
}

async function enrichProduct(url, now) {
  const html = await fetchText(url);
  const productJsonLd = findProductJsonLd(html);
  const metaProduct = findShopifyMetaProduct(html);
  if (!productJsonLd || !metaProduct) {
    throw new Error(`No se pudo extraer el producto Shopify en ${url}`);
  }

  const canonical = extractFirstMatch(html, /<link rel="canonical" href="([^"]+)"/i);
  const title = extractFirstMatch(html, /<title>([^<]+)<\/title>/i);
  const description = extractFirstMatch(html, /<meta name="description" content="([^"]+)"/i);
  const image = toAbsoluteUrl(
    extractFirstMatch(html, /<meta property="og:image" content="([^"]+)"/i)
  );
  const pageText = stripTags(html);
  const handle = normalizeText(metaProduct.handle || canonical.split('/products/')[1] || '');
  const name = normalizeText(productJsonLd.name || title);

  if (shouldSkipProduct(canonical || url, name, description)) {
    return null;
  }

  const variant = selectBeanVariant(productJsonLd, metaProduct);
  if (!variant) return null;

  const category = inferCategory(name, description, handle);
  const origin = inferOrigin(name, description, handle);
  const roast = inferRoast(name, description, handle);
  const notes = inferNotes(description);
  const decaf = /descafeinado|swiss water/i.test(`${name} ${description} ${handle}`);

  return {
    id: buildCafeDocId(handle, variant.sku),
    fuente: 'sanjorge',
    fuentePais: 'ES',
    fuenteUrl: canonical || url,
    urlProducto: canonical || url,

    nombre: name,
    name,
    marca: 'San Jorge Coffee Roasters',
    roaster: 'San Jorge Coffee Roasters',

    ean: '',
    normalizedEan: '',
    sku: variant.sku,
    mpn: '',

    descripcion: description,
    description,

    category,
    coffeeCategory: category === 'specialty' ? 'specialty' : 'daily',
    isSpecialty: category === 'specialty',
    legacy: false,

    formato: 'beans',
    format: 'beans',
    sistemaCapsula: '',
    tipoProducto: 'cafe en grano',
    cantidad: variant.quantity,
    intensidad: null,
    tueste: roast,
    roastLevel: roast,
    pais: origin,
    origen: origin,
    proceso: '',
    notas: notes.join(', '),
    notes: notes.join(', '),
    decaf,

    precio: Number.isFinite(variant.price) ? variant.price : null,
    currency: variant.currency || 'EUR',
    certificaciones: '',
    isBio: false,
    inStock: /instock$/i.test(variant.availability),

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
      sourceType: 'sanjorge',
      sourceTitle: title,
      handle,
      selectedVariantId: variant.id,
      selectedVariantTitle: `${variant.preparationLabel}${variant.amountLabel ? ` / ${variant.amountLabel}` : ''}`,
      pageTextPreview: pageText.slice(0, 280),
    },
  };
}

async function main() {
  const urls = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[SANJORGE] Collection: ${COLLECTION_URL}`);
  console.log(`[SANJORGE] Products discovered: ${urls.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const url of urls) {
    const cafe = await enrichProduct(url, now);
    if (!cafe) continue;
    cafes.push(cafe);
    console.log(`[SANJORGE] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[SANJORGE] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[SANJORGE] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[SANJORGE] Error:', error?.stack || error);
  process.exit(1);
});
