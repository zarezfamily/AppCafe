/*
  Importa cafés actuales de Café Dromedario a Firestore.

  Fuente:
    https://cafedromedario.com/productos/cafe/

  Estrategia:
    - Descubre fichas desde las páginas de categoría de WooCommerce.
    - Extrae Product JSON-LD y `data-product_variations` de cada ficha.
    - Conserva sólo la representación canónica de "en grano" o packs de café puro.
    - Excluye molidos, cápsulas y artículos no-café.
    - Genera un JSON local y hace upsert en `cafes` con firebase-admin.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const CATEGORY_URLS = [
  'https://cafedromedario.com/productos/cafe/',
  'https://cafedromedario.com/productos/cafe/page/2/',
  'https://cafedromedario.com/productos/cafe/page/3/',
  'https://cafedromedario.com/productos/cafe/page/4/',
];
const BASE_SITE = 'https://cafedromedario.com';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON ||
  path.resolve(process.cwd(), 'scripts/cafe-import-dromedario-real.json');
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
      /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    ),
  ]
    .map((match) => safeJsonParse(match[1]))
    .filter(Boolean);

  for (const script of scripts) {
    if (script?.['@graph']) {
      const product = script['@graph'].find((item) => item?.['@type'] === 'Product');
      if (product) return product;
    }
    if (script?.['@type'] === 'Product') return script;
  }
  return null;
}

function parseProductVariations(html) {
  const raw = (String(html || '').match(/data-product_variations="([\s\S]*?)"/i) || [])[1] || '';
  if (!raw) return [];
  return safeJsonParse(decodeHtmlEntities(raw)) || [];
}

function discoverCategoryItems(html, categoryUrl) {
  return uniqueBy(
    [...String(html || '').matchAll(/href="([^"]+)"/gi)]
      .map((match) => toAbsoluteUrl(match[1]))
      .filter((url) => url.startsWith(`${BASE_SITE}/tienda/cafe/`))
      .filter((url) => !/\/molido\/|\/capsulas\/|\/soluble\/|\/camiseta-/i.test(url))
      .map((url) => ({
        url,
        sourceCategoryUrl: categoryUrl,
      })),
    (item) => item.url
  );
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

function selectBeanVariation(variations, name, description) {
  const candidates = variations
    .map((variation) => {
      const attributes = variation?.attributes || {};
      const attrText = Object.values(attributes)
        .map((value) => normalizeText(value))
        .join(' ');
      const haystack = normalizeForSlug(`${name} ${description} ${attrText}`).toLowerCase();
      return {
        variation,
        haystack,
        attrText,
      };
    })
    .filter((item) => item.haystack.includes('grano') || item.haystack.includes('sin moler'));

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const qa = parseAmount(a.attrText || name) ?? Number.MAX_SAFE_INTEGER;
    const qb = parseAmount(b.attrText || name) ?? Number.MAX_SAFE_INTEGER;
    return qa - qb;
  });

  return candidates[0].variation;
}

function inferOrigin(name, description, url) {
  const haystack = normalizeForSlug(`${name} ${description} ${url}`).toLowerCase();
  const mappings = [
    ['colombia', 'Colombia'],
    ['ruanda', 'Ruanda'],
    ['rwanda', 'Ruanda'],
    ['brasil', 'Brasil'],
    ['bolivia', 'Bolivia'],
    ['venezuela', 'Venezuela'],
    ['guatemala', 'Guatemala'],
    ['china', 'China'],
    ['kenia', 'Kenia'],
    ['costa rica', 'Costa Rica'],
  ];

  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) return value;
  }
  return '';
}

function inferRoast(name, description, url) {
  const haystack = normalizeForSlug(`${name} ${description} ${url}`).toLowerCase();
  if (haystack.includes('natural')) return 'medio';
  if (haystack.includes('descafeinado')) return 'medio';
  return '';
}

function inferCategory(url, name, description) {
  const haystack = normalizeForSlug(`${url} ${name} ${description}`).toLowerCase();
  if (haystack.includes('dromedario-por-el-mundo') || haystack.includes('cafes-de-especialidad'))
    return 'specialty';
  return 'daily';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    'floral',
    'fruta',
    'frutal',
    'chocolate',
    'cacao',
    'caramelo',
    'dulce',
    'fresco',
    'cremoso',
    'acidez',
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

function buildCafeDocId(sku, url) {
  return `dromedario_${slugify(sku || url)}`;
}

function shouldSkip(name, url, description) {
  const haystack = normalizeForSlug(`${name} ${url} ${description}`).toLowerCase();
  return (
    haystack.includes('capsulas') || haystack.includes('molido') || haystack.includes('camiseta')
  );
}

async function discoverProducts() {
  const all = [];
  for (const categoryUrl of CATEGORY_URLS) {
    const html = await fetchText(categoryUrl);
    all.push(...discoverCategoryItems(html, categoryUrl));
  }
  const deduped = uniqueBy(all, (item) => item.url);
  if (!deduped.length) throw new Error('No se encontraron fichas de producto en Dromedario.');
  return Number.isFinite(LIMIT) ? deduped.slice(0, LIMIT) : deduped;
}

async function enrichProduct(item, now) {
  const html = await fetchText(item.url);
  const productJsonLd = findProductJsonLd(html);
  if (!productJsonLd) return null;

  const title = extractFirstMatch(html, /<title>([^<]+)<\/title>/i);
  const canonical = extractFirstMatch(html, /<link rel="canonical" href="([^"]+)"/i);
  const name = normalizeText(
    productJsonLd.name ||
      extractFirstMatch(html, /<h1[^>]*class="[^"]*product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i) ||
      title
  );
  const description = stripTags(
    productJsonLd.description ||
      extractFirstMatch(
        html,
        /<div class="woocommerce-product-details__short-description">([\s\S]*?)<\/div>/i
      )
  );
  const image = toAbsoluteUrl(
    productJsonLd.image || extractFirstMatch(html, /<meta property="og:image" content="([^"]+)"/i)
  );
  const variations = parseProductVariations(html);
  const selectedVariation = selectBeanVariation(variations, name, description);

  if (shouldSkip(name, canonical || item.url, description)) return null;

  let sku = normalizeText(productJsonLd.sku || '');
  let price = null;
  let inStock = /instock$/i.test(normalizeText(productJsonLd?.offers?.availability || ''));
  let amount = parseAmount(name);

  if (selectedVariation) {
    sku = normalizeText(selectedVariation.sku || sku);
    price = Number.isFinite(selectedVariation.display_price)
      ? selectedVariation.display_price
      : null;
    inStock = /hay existencias/i.test(stripTags(selectedVariation.availability_html || ''));
    amount =
      parseAmount(`${name} ${Object.values(selectedVariation.attributes || {}).join(' ')}`) ||
      amount;
  } else {
    const aggOffer = Array.isArray(productJsonLd.offers)
      ? productJsonLd.offers[0]
      : productJsonLd.offers;
    price = Number.parseFloat(
      aggOffer?.priceSpecification?.[0]?.price || aggOffer?.lowPrice || aggOffer?.price || ''
    );
    if (!Number.isFinite(price)) price = null;
  }

  const category = inferCategory(canonical || item.url, name, description);
  const origin = inferOrigin(name, description, canonical || item.url);
  const roast = inferRoast(name, description, canonical || item.url);
  const notes = inferNotes(description);
  const decaf = /descafeinado|swiss water/i.test(normalizeForSlug(`${name} ${description}`));
  const isBio = /ecologico/i.test(normalizeForSlug(`${name} ${description}`));

  return {
    id: buildCafeDocId(sku, canonical || item.url),
    fuente: 'dromedario',
    fuentePais: 'ES',
    fuenteUrl: canonical || item.url,
    urlProducto: canonical || item.url,

    nombre: name,
    name,
    marca: 'Café Dromedario',
    roaster: 'Café Dromedario',

    ean: '',
    normalizedEan: '',
    sku,
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
      sourceType: 'dromedario',
      sourceCategoryUrl: item.sourceCategoryUrl,
      sourceTitle: title,
      selectedVariationAttrs: selectedVariation?.attributes || null,
    },
  };
}

async function main() {
  const items = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[DROMEDARIO] Categories: ${CATEGORY_URLS.length}`);
  console.log(`[DROMEDARIO] Products discovered: ${items.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const item of items) {
    const cafe = await enrichProduct(item, now);
    if (!cafe) continue;
    cafes.push(cafe);
    console.log(`[DROMEDARIO] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[DROMEDARIO] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[DROMEDARIO] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[DROMEDARIO] Error:', error?.stack || error);
  process.exit(1);
});
