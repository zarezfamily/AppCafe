/*
  Importa cafés actuales de Cafés Granell a Firestore.

  Fuentes:
    https://cafesgranell.es/es/45-cafe-en-grano
    https://cafesgranell.es/es/40-cafe-de-especialidad
    https://cafesgranell.es/es/48-cafe-organico
    https://cafesgranell.es/es/49-cafe-origenes
    https://cafesgranell.es/es/58-descafeinado

  Estrategia:
    - Descubre fichas desde las categorías públicas de PrestaShop.
    - Extrae el Product JSON-LD y el bloque `data-product` de cada ficha.
    - Deduplica entre categorías.
    - Conserva café y packs de café en grano, excluyendo molido, cápsulas y bundles con accesorios.
    - Genera un JSON local y hace upsert en `cafes` con firebase-admin.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const CATEGORY_URLS = [
  'https://cafesgranell.es/es/45-cafe-en-grano',
  'https://cafesgranell.es/es/40-cafe-de-especialidad',
  'https://cafesgranell.es/es/48-cafe-organico',
  'https://cafesgranell.es/es/49-cafe-origenes',
  'https://cafesgranell.es/es/58-descafeinado',
];
const BASE_SITE = 'https://cafesgranell.es';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-granell-real.json');
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

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function findProductJsonLd(html) {
  const scripts = [
    ...String(html || '').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi),
  ]
    .map((match) => safeJsonParse(match[1]))
    .filter(Boolean);

  for (const parsed of scripts) {
    if (parsed?.['@type'] === 'Product') return parsed;
  }

  return null;
}

function findDataProduct(html) {
  const match =
    String(html || '').match(/<div[^>]+id="product-details"[^>]+data-product='([\s\S]*?)'/i) ||
    String(html || '').match(/<div[^>]+id="product-details"[^>]+data-product="([\s\S]*?)"/i);

  if (!match?.[1]) return null;
  return safeJsonParse(decodeHtmlEntities(match[1]));
}

function extractFirstMatch(html, pattern) {
  const match = String(html || '').match(pattern);
  return normalizeText(decodeHtmlEntities(match?.[1] || ''));
}

function discoverCategoryItems(html, categoryUrl) {
  return uniqueBy(
    [
      ...String(html || '').matchAll(/<a[^>]+href="([^"]+)" class="thumbnail product-thumbnail"/gi),
    ].map((match) => ({
      url: toAbsoluteUrl(match[1]),
      sourceCategoryUrl: categoryUrl,
    })),
    (item) => item.url
  );
}

function parsePrice(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const raw = normalizeText(value);
  if (!raw) return null;

  let normalized = raw.replace(/[^\d,.-]/g, '');
  if (normalized.includes(',') && normalized.includes('.')) {
    normalized = normalized.replace(/\./g, '').replace(',', '.');
  } else if (normalized.includes(',')) {
    normalized = normalized.replace(',', '.');
  }

  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseWeightToGrams(value, name) {
  const raw = normalizeText(value || name);
  const normalized = normalizeForSlug(raw).toLowerCase();

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

function normalizeImages(imageValue, fallbackImage) {
  if (Array.isArray(imageValue)) {
    return toAbsoluteUrl(imageValue[0] || fallbackImage);
  }
  if (imageValue && typeof imageValue === 'object') {
    return toAbsoluteUrl(imageValue.url || imageValue.contentUrl || fallbackImage);
  }
  return toAbsoluteUrl(imageValue || fallbackImage);
}

function inferOrigin(name, description, url) {
  const haystack = normalizeForSlug(`${name} ${description} ${url}`).toLowerCase();
  const mappings = [
    ['burundi', 'Burundi'],
    ['brasil', 'Brasil'],
    ['brazil', 'Brasil'],
    ['colombia', 'Colombia'],
    ['costa rica', 'Costa Rica'],
    ['etiopia', 'Etiopia'],
    ['ethiopia', 'Etiopia'],
    ['guatemala', 'Guatemala'],
    ['honduras', 'Honduras'],
    ['india', 'India'],
    ['indonesia', 'Indonesia'],
    ['jamaica', 'Jamaica'],
    ['kenya', 'Kenia'],
    ['kenia', 'Kenia'],
    ['kopi luwak', 'Indonesia'],
    ['mexico', 'Mexico'],
    ['peru', 'Peru'],
    ['rwanda', 'Ruanda'],
    ['sulawesi', 'Indonesia'],
  ];

  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) return value;
  }
  return '';
}

function inferRoast(name, description, url) {
  const haystack = normalizeForSlug(`${name} ${description} ${url}`).toLowerCase();
  if (haystack.includes('muy intenso')) return 'muy intenso';
  if (haystack.includes('intenso')) return 'intenso';
  if (haystack.includes('suave')) return 'suave';
  if (haystack.includes('medio')) return 'medio';
  if (haystack.includes('tueste reciente') || haystack.includes('tueste natural')) return 'medio';
  return '';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    'chocolate',
    'cacao',
    'caramelo',
    'frutas tropicales',
    'frutos rojos',
    'frutal',
    'afrutado',
    'citrico',
    'citricos',
    'mandarina',
    'manzana',
    'miel',
    'almendra',
    'floral',
    'dulce',
    'herbal',
    'uva',
  ];

  return [
    ...new Set(
      dictionary
        .filter((note) => haystack.includes(note))
        .map((note) => {
          if (note === 'citricos') return 'citrico';
          if (note === 'afrutado') return 'frutal';
          return note;
        })
    ),
  ];
}

function inferCategory(sourceCategoryUrls, name, url) {
  const haystack = normalizeForSlug(`${sourceCategoryUrls.join(' ')} ${name} ${url}`).toLowerCase();
  if (
    haystack.includes('cafe-de-especialidad') ||
    haystack.includes('cafe-origenes') ||
    haystack.includes('geisha') ||
    haystack.includes('kopi luwak') ||
    haystack.includes('jamaica blue mountain') ||
    haystack.includes('sulawesi')
  ) {
    return 'specialty';
  }
  return 'daily';
}

function isExcludedProduct(name, description, url) {
  const haystack = normalizeForSlug(`${name} ${description} ${url}`).toLowerCase();

  const blockedWords = [
    'capsula',
    'capsulas',
    'molido',
    'cafetera',
    'molinillo',
    'aeropress',
    'hario',
    'v60',
    'french press',
    'cold brew',
  ];

  return blockedWords.some((word) => haystack.includes(word));
}

function buildCafeDocId(sku, url) {
  return `granell_${slugify(sku || url)}`;
}

async function discoverProducts() {
  const all = [];

  for (const categoryUrl of CATEGORY_URLS) {
    const html = await fetchText(categoryUrl);
    all.push(...discoverCategoryItems(html, categoryUrl));
  }

  const grouped = new Map();
  for (const item of all) {
    const key = item.url;
    if (!grouped.has(key)) {
      grouped.set(key, {
        url: item.url,
        sourceCategoryUrls: [],
      });
    }
    grouped.get(key).sourceCategoryUrls.push(item.sourceCategoryUrl);
  }

  const deduped = [...grouped.values()].map((item) => ({
    ...item,
    sourceCategoryUrls: [...new Set(item.sourceCategoryUrls)],
  }));

  if (!deduped.length) throw new Error('No se encontraron productos en Cafés Granell.');
  return Number.isFinite(LIMIT) ? deduped.slice(0, LIMIT) : deduped;
}

async function enrichProduct(item, now) {
  try {
    const html = await fetchText(item.url);
    const productLd = findProductJsonLd(html);
    const dataProduct = findDataProduct(html);

    if (!productLd && !dataProduct) return null;

    const title = extractFirstMatch(html, /<title>([^<]+)<\/title>/i);
    const canonical = extractFirstMatch(html, /<link rel="canonical" href="([^"]+)"/i);
    const shortDescription = extractFirstMatch(
      html,
      /<div id="product-description-short-[^"]+"[^>]*>([\s\S]*?)<\/div>/i
    );

    const name = normalizeText(productLd?.name || dataProduct?.name || title);
    const description = normalizeText(
      productLd?.description ||
        dataProduct?.meta_description ||
        shortDescription ||
        stripTags(dataProduct?.description_short || dataProduct?.description || '')
    );
    const longDescription = stripTags(dataProduct?.description || '');
    const sourceUrl = canonical || productLd?.offers?.url || item.url;
    const sku = normalizeText(productLd?.sku || productLd?.mpn || dataProduct?.reference || '');
    const price = parsePrice(productLd?.offers?.price || dataProduct?.price);
    const image = normalizeImages(
      productLd?.image,
      extractFirstMatch(html, /<meta property="og:image" content="([^"]+)"/i)
    );
    const amount =
      parseWeightToGrams(productLd?.weight?.value ? `${productLd.weight.value} kg` : '', name) ||
      parseWeightToGrams(dataProduct?.weight || '', name);
    const inStock =
      /instock$/i.test(normalizeText(productLd?.offers?.availability || '')) ||
      String(dataProduct?.quantity || '').trim() !== '0';

    if (isExcludedProduct(name, description, sourceUrl)) {
      return null;
    }

    const category = inferCategory(item.sourceCategoryUrls, name, sourceUrl);
    const origin = inferOrigin(name, `${description} ${longDescription}`, sourceUrl);
    const roast = inferRoast(name, `${description} ${longDescription}`, sourceUrl);
    const notes = inferNotes(`${description} ${longDescription}`);
    const decaf = /descafeinado/i.test(normalizeForSlug(`${name} ${description}`));
    const isBio = /organico/i.test(
      normalizeForSlug(`${name} ${description} ${item.sourceCategoryUrls.join(' ')}`)
    );

    return {
      id: buildCafeDocId(sku, sourceUrl),
      fuente: 'granell',
      fuentePais: 'ES',
      fuenteUrl: sourceUrl,
      urlProducto: sourceUrl,

      nombre: name,
      name,
      marca: 'Cafes Granell',
      roaster: 'Cafes Granell',

      ean: '',
      normalizedEan: '',
      sku,
      mpn: normalizeText(productLd?.mpn || ''),

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
      currency: normalizeText(productLd?.offers?.priceCurrency || 'EUR'),
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
        sourceType: 'granell',
        sourceTitle: title,
        sourceCategoryUrls: item.sourceCategoryUrls,
        sourceSchemaCategory: normalizeText(productLd?.category || ''),
        pageCategoryDefault: normalizeText(dataProduct?.id_category_default || ''),
        priceRaw: normalizeText(dataProduct?.price || productLd?.offers?.price || ''),
        longDescriptionPreview: longDescription.slice(0, 280),
      },
    };
  } catch (error) {
    console.warn(`[GRANELL] Skip ${item.url}: ${error.message}`);
    return null;
  }
}

async function main() {
  const items = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[GRANELL] Categories: ${CATEGORY_URLS.length}`);
  console.log(`[GRANELL] Products discovered: ${items.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const item of items) {
    const cafe = await enrichProduct(item, now);
    if (!cafe) continue;
    cafes.push(cafe);
    console.log(`[GRANELL] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[GRANELL] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[GRANELL] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[GRANELL] Error:', error?.stack || error);
  process.exit(1);
});
