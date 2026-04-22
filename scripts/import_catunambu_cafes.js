/*
  Importa cafes actuales de Cafe Catunambu a Firestore.

  Fuentes:
    https://tienda.catunambu.com/collections/cafe-en-grano
    https://tienda.catunambu.com/collections/cafes-premium
    https://tienda.catunambu.com/collections/cafe-molido
    https://tienda.catunambu.com/collections/capsulas-compatibles

  Estrategia:
    - Descubre fichas desde varias colecciones Shopify.
    - Lee el JSON publico product.js de cada producto.
    - Filtra accesorios, bebidas frias y productos que no son cafe.
    - Conserva una representacion canonica por producto.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const COLLECTIONS = [
  {
    url: 'https://tienda.catunambu.com/collections/cafe-en-grano',
    tag: 'beans',
    category: 'daily',
  },
  {
    url: 'https://tienda.catunambu.com/collections/cafes-premium',
    tag: 'premium',
    category: 'specialty',
  },
  { url: 'https://tienda.catunambu.com/collections/cafe-molido', tag: 'ground', category: 'daily' },
  {
    url: 'https://tienda.catunambu.com/collections/capsulas-compatibles',
    tag: 'capsules',
    category: 'daily',
  },
];
const BASE_SITE = 'https://tienda.catunambu.com';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-catunambu-real.json');
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

function parseCapsuleCount(text) {
  const normalized = normalizeForSlug(text).toLowerCase();
  const match = normalized.match(/(\d+)\s*(caps|capsulas|ud|uds)\b/);
  if (match) return Number.parseInt(match[1], 10);
  return null;
}

function discoverProductLinks(html) {
  return uniqueBy(
    [...String(html || '').matchAll(/href="(\/products\/[^"#?]+)"/gi)]
      .map((match) => toAbsoluteUrl(match[1]))
      .filter((url) => url.startsWith(`${BASE_SITE}/products/`)),
    (url) => url
  );
}

function shouldSkip(url, title, description) {
  const haystack = normalizeForSlug(`${url} ${title} ${description}`).toLowerCase();
  return (
    haystack.includes('vaso') ||
    haystack.includes('cappuccino soluble') ||
    haystack.includes('cafe frio') ||
    haystack.includes('latte macchiato') ||
    haystack.includes('ristora') ||
    haystack.includes('soluble') ||
    haystack.includes('accesorio')
  );
}

function inferFormat(product, sourceCollections) {
  const titleText = normalizeForSlug(product?.title || '').toLowerCase();
  const collectionText = normalizeForSlug(
    (sourceCollections || []).map((item) => item.tag).join(' ')
  ).toLowerCase();
  const fullText = normalizeForSlug(
    `${product?.title || ''} ${product?.description || ''}`
  ).toLowerCase();

  if (titleText.includes('capsul')) return 'capsules';
  if (titleText.includes('molido')) return 'ground';
  if (titleText.includes('grano')) return 'beans';

  if (collectionText.includes('capsules')) return 'capsules';
  if (collectionText.includes('ground')) return 'ground';
  if (collectionText.includes('beans')) return 'beans';

  if (fullText.includes('capsul')) return 'capsules';
  if (fullText.includes('molido')) return 'ground';
  if (fullText.includes('grano')) return 'beans';
  return 'beans';
}

function inferSystem(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('nespresso')) return 'nespresso';
  if (haystack.includes('dolcegusto') || haystack.includes('dolce gusto')) return 'dolce-gusto';
  return '';
}

function inferCategory(product, sourceCollections) {
  const haystack = normalizeForSlug(
    `${product?.title || ''} ${product?.description || ''}`
  ).toLowerCase();
  const generic =
    haystack.includes('natural') ||
    haystack.includes('mezcla') ||
    haystack.includes('descafeinado') ||
    haystack.includes('alta seleccion');

  if (
    haystack.includes('colombia') ||
    haystack.includes('honduras') ||
    haystack.includes('mexico') ||
    haystack.includes('india') ||
    haystack.includes('costa rica') ||
    haystack.includes('fairtrade') ||
    haystack.includes('light roast') ||
    haystack.includes('kaapi royal') ||
    haystack.includes('kalahari')
  ) {
    return 'specialty';
  }

  const explicit = (sourceCollections || []).find((item) => item.category === 'specialty');
  if (explicit && !generic) return 'specialty';
  return 'daily';
}

function inferOrigin(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const mappings = [
    ['colombia', 'Colombia'],
    ['honduras', 'Honduras'],
    ['mexico', 'Mexico'],
    ['india', 'India'],
    ['brasil', 'Brasil'],
    ['sudamerica', 'Sudamerica'],
    ['centro y sudamerica', 'Centro y Sudamerica'],
  ];

  const hits = [];
  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) hits.push(value);
  }
  return [...new Set(hits)].join(', ');
}

function inferRoast(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('light roast') || haystack.includes('suave')) return 'light';
  if (haystack.includes('mezcla') || haystack.includes('fuerte')) return 'dark';
  return 'medium';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    ['cremos', 'cremoso'],
    ['aroma', 'aromatico'],
    ['delicado', 'delicado'],
    ['suave', 'suave'],
    ['intenso', 'intenso'],
    ['frut', 'fruta'],
    ['cacao', 'cacao'],
  ];
  return [
    ...new Set(dictionary.filter(([needle]) => haystack.includes(needle)).map(([, note]) => note)),
  ];
}

function pickCanonicalVariant(product, format) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return null;

  const scored = variants.map((variant) => {
    const text = normalizeText(
      `${variant?.title || ''} ${variant?.public_title || ''} ${(variant?.options || []).join(' ')} ${product?.title || ''}`
    );
    return {
      variant,
      amount: format === 'capsules' ? parseCapsuleCount(text) : parseAmount(text),
    };
  });

  scored.sort(
    (a, b) => (a.amount ?? Number.MAX_SAFE_INTEGER) - (b.amount ?? Number.MAX_SAFE_INTEGER)
  );
  return scored[0]?.variant || variants[0];
}

async function fetchProductJson(productUrl) {
  const jsonUrl = productUrl.replace(/\/$/, '') + '.js';
  try {
    const text = await fetchText(jsonUrl);
    return safeJsonParse(text);
  } catch (error) {
    if (String(error?.message || '').includes('HTTP_404')) {
      return null;
    }
    throw error;
  }
}

async function discoverProducts() {
  const discovered = [];
  for (const collection of COLLECTIONS) {
    const html = await fetchText(collection.url);
    const links = discoverProductLinks(html);
    for (const url of links) {
      discovered.push({
        url,
        sourceCollectionUrl: collection.url,
        tag: collection.tag,
        category: collection.category,
      });
    }
  }

  const grouped = new Map();
  for (const item of discovered) {
    const current = grouped.get(item.url) || { url: item.url, collections: [] };
    current.collections.push({
      sourceCollectionUrl: item.sourceCollectionUrl,
      tag: item.tag,
      category: item.category,
    });
    grouped.set(item.url, current);
  }

  const items = [...grouped.values()];
  return Number.isFinite(LIMIT) ? items.slice(0, LIMIT) : items;
}

async function enrichProduct(item, now) {
  const product = await fetchProductJson(item.url);
  if (!product) return null;

  const title = normalizeText(product.title || '');
  const description = stripTags(product.description || '');
  if (!title || shouldSkip(item.url, title, description)) return null;

  const format = inferFormat(product, item.collections);
  const variant = pickCanonicalVariant(product, format);
  const text = `${title} ${description} ${variant?.title || ''}`;

  const image = toAbsoluteUrl(
    variant?.featured_image?.src || product?.featured_image || product?.images?.[0]?.src || ''
  );
  const amount = format === 'capsules' ? parseCapsuleCount(text) : parseAmount(text);
  const category = inferCategory(product, item.collections);
  const origin = inferOrigin(text);
  const roast = inferRoast(text);
  const notes = inferNotes(text);
  const decaf = /descafe/i.test(normalizeForSlug(text));
  const isBio = /\bbio\b|organico|ecologico/i.test(normalizeForSlug(text));
  const system = format === 'capsules' ? inferSystem(text) : '';

  return {
    id: `catunambu_${slugify(product.handle || product.id || item.url)}`,
    fuente: 'catunambu',
    fuentePais: 'ES',
    fuenteUrl: item.url,
    urlProducto: item.url,

    nombre: title,
    name: title,
    marca: 'Catunambu',
    roaster: 'Catunambu',

    ean: '',
    normalizedEan: '',
    sku: normalizeText(variant?.sku || String(variant?.id || product?.id || '')),
    mpn: '',

    descripcion: description,
    description,

    category,
    coffeeCategory: category === 'specialty' ? 'specialty' : 'daily',
    isSpecialty: category === 'specialty',
    legacy: false,

    formato: format,
    format,
    sistemaCapsula: system,
    tipoProducto:
      format === 'capsules'
        ? 'capsulas de cafe'
        : format === 'ground'
          ? 'cafe molido'
          : 'cafe en grano',
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

    precio: Number.isFinite(variant?.price) ? variant.price / 100 : null,
    currency: 'EUR',
    certificaciones: isBio ? 'organico' : '',
    isBio,
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
      sourceType: 'catunambu',
      handle: product.handle || '',
      productId: product.id || null,
      variantId: variant?.id || null,
      variantTitle: variant?.title || '',
      sourceCollections: item.collections || [],
    },
  };
}

async function main() {
  const items = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[CATUNAMBU] Collections: ${COLLECTIONS.length}`);
  console.log(`[CATUNAMBU] Products discovered: ${items.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const item of items) {
    let cafe = null;
    try {
      cafe = await enrichProduct(item, now);
    } catch (error) {
      console.log(`[CATUNAMBU] Skip error: ${item.url} -> ${error.message}`);
      continue;
    }
    if (!cafe) continue;
    cafes.push(cafe);
    console.log(`[CATUNAMBU] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[CATUNAMBU] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[CATUNAMBU] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[CATUNAMBU] Error:', error?.stack || error);
  process.exit(1);
});
