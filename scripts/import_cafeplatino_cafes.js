/*
  Importa cafés actuales de Café Platino a Firestore.

  Fuentes:
    https://cafeplatino.com/cafe-de-origen/
    https://cafeplatino.com/cafe-de-especialidad/

  Estrategia:
    - Consume la Store API pública de WooCommerce por categoría.
    - Deduplica productos repetidos entre "origen" y "especialidad".
    - Conserva sólo la representación canónica de "Café en grano".
    - Genera un JSON local y hace upsert en `cafes` con firebase-admin.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const CATEGORY_CONFIGS = [
  {
    id: 69,
    url: 'https://cafeplatino.com/cafe-de-origen/',
    label: 'cafe-de-origen',
  },
  {
    id: 58,
    url: 'https://cafeplatino.com/cafe-de-especialidad/',
    label: 'cafe-de-especialidad',
  },
];
const API_BASE = 'https://cafeplatino.com/wp-json/wc/store/v1/products';
const BASE_SITE = 'https://cafeplatino.com';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON ||
  path.resolve(process.cwd(), 'scripts/cafe-import-cafeplatino-real.json');
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const LIMIT = Number.parseInt(process.env.LIMIT || '', 10);
const CAFES_COLLECTION = 'cafes';
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  Referer: BASE_SITE,
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

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    redirect: 'follow',
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP_${response.status} ${url} ${text.slice(0, 200)}`);
  }
  return JSON.parse(text);
}

function ensureAdmin() {
  if (admin.apps.length) return;
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function extractAttributeTerms(product, attributeName) {
  const attr = (Array.isArray(product?.attributes) ? product.attributes : []).find(
    (item) =>
      normalizeForSlug(item?.name).toLowerCase() === normalizeForSlug(attributeName).toLowerCase()
  );
  return Array.isArray(attr?.terms) ? attr.terms : [];
}

function hasBeanVariant(product) {
  const moliendaTerms = extractAttributeTerms(product, 'Molienda');
  return moliendaTerms.some((term) =>
    normalizeForSlug(term?.name || term?.slug)
      .toLowerCase()
      .includes('cafe en grano')
  );
}

function extractAmount(product) {
  const pesoTerms = extractAttributeTerms(product, 'Peso');
  const raw = normalizeText(pesoTerms[0]?.name || product?.name);
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

function parseStorePrice(prices) {
  const minor = Number.parseInt(prices?.currency_minor_unit, 10);
  const raw = Number.parseInt(prices?.price, 10);
  if (!Number.isFinite(raw)) return null;
  if (!Number.isFinite(minor)) return raw;
  return raw / 10 ** minor;
}

function inferCategory(product) {
  const slugs = (Array.isArray(product?.categories) ? product.categories : []).map((cat) =>
    normalizeForSlug(cat?.slug).toLowerCase()
  );
  if (slugs.includes('cafe-de-especialidad')) return 'specialty';
  return 'daily';
}

function inferOrigin(product) {
  const origenTerms = extractAttributeTerms(product, 'Origen');
  if (origenTerms.length) return normalizeText(origenTerms[0].name);

  const haystack = normalizeForSlug(
    `${product?.name} ${product?.short_description} ${product?.description} ${product?.permalink}`
  ).toLowerCase();
  const mappings = [
    ['jamaica', 'Jamaica'],
    ['colombia', 'Colombia'],
    ['etiopia', 'Etiopia'],
    ['kenia', 'Kenia'],
    ['nicaragua', 'Nicaragua'],
  ];

  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) return value;
  }

  return '';
}

function inferRoast(product) {
  const tuesteTerms = extractAttributeTerms(product, 'Tueste');
  const raw = normalizeForSlug(tuesteTerms[0]?.name || '').toLowerCase();
  if (raw.includes('natural')) return 'medio';
  return '';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    'caramelo',
    'afrutado',
    'frutal',
    'dulce',
    'citric',
    'citrico',
    'chocolate',
    'cacao',
    'miel',
    'vino',
    'vinosa',
    'floral',
    'equilibrado',
    'elegante',
  ];

  return [
    ...new Set(
      dictionary
        .filter((note) => haystack.includes(note))
        .map((note) => {
          if (note === 'vinosa') return 'vino';
          if (note === 'citric') return 'citrico';
          return note;
        })
    ),
  ];
}

function buildCafeDocId(product) {
  const base = normalizeText(product?.sku || product?.slug || product?.id);
  return `cafeplatino_${slugify(base)}`;
}

async function discoverProducts() {
  const all = [];

  for (const category of CATEGORY_CONFIGS) {
    const url = `${API_BASE}?category=${category.id}&per_page=100`;
    const items = await fetchJson(url);
    for (const item of items) {
      all.push({
        ...item,
        sourceCategoryId: category.id,
        sourceCategoryLabel: category.label,
        sourceCategoryUrl: category.url,
      });
    }
  }

  const deduped = uniqueBy(all, (item) => String(item.id));
  const filtered = deduped.filter((item) => hasBeanVariant(item));
  if (!filtered.length)
    throw new Error('No se encontraron cafés con variante en grano en Café Platino.');
  return Number.isFinite(LIMIT) ? filtered.slice(0, LIMIT) : filtered;
}

function mapProductToCafe(product, now) {
  const description = stripTags(product?.short_description || product?.description || '');
  const longDescription = stripTags(product?.description || '');
  const name = normalizeText(product?.name);
  const image = toAbsoluteUrl(product?.images?.[0]?.src || product?.images?.[0]?.thumbnail || '');
  const category = inferCategory(product);
  const notes = inferNotes(`${description} ${longDescription}`);
  const amount = extractAmount(product);
  const origin = inferOrigin(product);
  const roast = inferRoast(product);
  const decaf = /descafeinado/i.test(normalizeForSlug(`${name} ${description}`));

  return {
    id: buildCafeDocId(product),
    fuente: 'cafeplatino',
    fuentePais: 'ES',
    fuenteUrl: toAbsoluteUrl(product?.permalink),
    urlProducto: toAbsoluteUrl(product?.permalink),

    nombre: name,
    name,
    marca: 'Cafe Platino',
    roaster: 'Cafe Platino',

    ean: '',
    normalizedEan: '',
    sku: normalizeText(product?.sku),
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

    precio: parseStorePrice(product?.prices),
    currency: normalizeText(product?.prices?.currency_code || 'EUR'),
    certificaciones: /fairtrade/i.test(normalizeForSlug(`${name} ${description}`))
      ? 'fairtrade'
      : '',
    isBio: false,
    inStock: Boolean(product?.is_in_stock),

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
      sourceType: 'cafeplatino',
      sourceCategoryId: product.sourceCategoryId,
      sourceCategoryLabel: product.sourceCategoryLabel,
      sourceCategoryUrl: product.sourceCategoryUrl,
      wcProductId: product.id,
      productType: normalizeText(product?.type),
      hasOptions: Boolean(product?.has_options),
      variationCount: Array.isArray(product?.variations) ? product.variations.length : 0,
      rawCategorySlugs: (Array.isArray(product?.categories) ? product.categories : []).map(
        (cat) => cat.slug
      ),
      longDescriptionPreview: longDescription.slice(0, 280),
    },
  };
}

async function main() {
  const products = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[CAFEPLATINO] Categories: ${CATEGORY_CONFIGS.length}`);
  console.log(`[CAFEPLATINO] Products discovered: ${products.length} dry=${DRY_RUN}`);

  const cafes = products.map((product) => mapProductToCafe(product, now));

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[CAFEPLATINO] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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
    console.log(`[CAFEPLATINO] Prepared: ${cafe.nombre}`);
  }

  console.log(`[CAFEPLATINO] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[CAFEPLATINO] Error:', error?.stack || error);
  process.exit(1);
});
