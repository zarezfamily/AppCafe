/*
  Importa cafes actuales de Cafes Orus a Firestore.

  Fuentes:
    https://cafesorus.es/tienda/categoria-producto/cafe/en-grano/
    https://cafesorus.es/tienda/categoria-producto/cafe/molido/
    https://cafesorus.es/tienda/categoria-producto/cafe/capsulas/

  Estrategia:
    - Descubre fichas desde WooCommerce.
    - Extrae Product JSON-LD y metadatos HTML.
    - Importa grano, molido y capsulas. Excluye solubles y no-cafe.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const CATEGORY_URLS = [
  'https://cafesorus.es/tienda/categoria-producto/cafe/en-grano/',
  'https://cafesorus.es/tienda/categoria-producto/cafe/en-grano/page/2/',
  'https://cafesorus.es/tienda/categoria-producto/cafe/molido/',
  'https://cafesorus.es/tienda/categoria-producto/cafe/molido/page/2/',
  'https://cafesorus.es/tienda/categoria-producto/cafe/capsulas/',
  'https://cafesorus.es/tienda/categoria-producto/cafe/capsulas/page/2/',
];
const BASE_SITE = 'https://cafesorus.es';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-orus-real.json');
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

function discoverCategoryItems(html, categoryUrl) {
  return uniqueBy(
    [...String(html || '').matchAll(/href="([^"]+)"/gi)]
      .map((match) => toAbsoluteUrl(match[1]))
      .filter((url) => url.startsWith(`${BASE_SITE}/tienda/producto/`))
      .map((url) => ({
        url,
        sourceCategoryUrl: categoryUrl,
      })),
    (item) => item.url
  );
}

function parseAmount(text, format) {
  const normalized = normalizeForSlug(text).toLowerCase();
  if (format === 'capsules') {
    const cap = normalized.match(/(\d+)\s*(caps|capsulas)/);
    if (cap) return Number.parseInt(cap[1], 10);
  }
  const packMatch = normalized.match(/(\d+)\s*x\s*(\d+)\s*g\b/);
  if (packMatch) return Number.parseInt(packMatch[1], 10) * Number.parseInt(packMatch[2], 10);
  const kiloMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kiloMatch) return Math.round(Number.parseFloat(kiloMatch[1].replace(',', '.')) * 1000);
  const gramMatch = normalized.match(/(\d+)\s*g\b/);
  if (gramMatch) return Number.parseInt(gramMatch[1], 10);
  return null;
}

function inferFormat(url, name, description) {
  const haystack = normalizeForSlug(`${url} ${name} ${description}`).toLowerCase();
  if (haystack.includes('/capsulas/') || haystack.includes('capsulas')) return 'capsules';
  if (haystack.includes('/molido/') || haystack.includes('molido')) return 'ground';
  return 'beans';
}

function inferCapsuleSystem(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('nes')) return 'nespresso';
  if (haystack.includes('point')) return 'point';
  return '';
}

function inferOrigin(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const mappings = [
    ['colombia', 'Colombia'],
    ['etiopia', 'Etiopia'],
    ['brasil', 'Brasil'],
    ['guatemala', 'Guatemala'],
    ['centroamerica', 'Centroamerica'],
  ];
  const hits = [];
  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) hits.push(value);
  }
  return [...new Set(hits)].join(', ');
}

function inferCategory(url, name, description) {
  const haystack = normalizeForSlug(`${url} ${name} ${description}`).toLowerCase();
  if (haystack.includes('origen') || haystack.includes('ecologico') || haystack.includes('agora')) {
    return 'specialty';
  }
  return 'daily';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    ['aroma', 'aromatico'],
    ['frut', 'fruta'],
    ['chocolate', 'chocolate'],
    ['suave', 'suave'],
    ['intenso', 'intenso'],
    ['crema', 'cremoso'],
    ['ecologico', 'ecologico'],
  ];
  return [
    ...new Set(dictionary.filter(([needle]) => haystack.includes(needle)).map(([, note]) => note)),
  ];
}

function shouldSkip(url, name, description) {
  const haystack = normalizeForSlug(`${url} ${name} ${description}`).toLowerCase();
  return haystack.includes('soluble') || haystack.includes('te ') || haystack.includes('infusion');
}

async function discoverProducts() {
  const all = [];
  for (const categoryUrl of CATEGORY_URLS) {
    try {
      const html = await fetchText(categoryUrl);
      all.push(...discoverCategoryItems(html, categoryUrl));
    } catch {
      // Algunas paginas /page/2/ pueden no existir.
    }
  }
  const deduped = uniqueBy(all, (item) => item.url);
  if (!deduped.length) throw new Error('No se encontraron fichas de producto en Orus.');
  return Number.isFinite(LIMIT) ? deduped.slice(0, LIMIT) : deduped;
}

async function enrichProduct(item, now) {
  const html = await fetchText(item.url);
  const productJsonLd = findProductJsonLd(html);
  if (!productJsonLd) return null;

  const title = extractFirstMatch(html, /<title>([^<]+)<\/title>/i);
  const canonical = extractFirstMatch(html, /<link rel="canonical" href="([^"]+)"/i) || item.url;
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
  if (shouldSkip(canonical, name, description)) return null;

  const format = inferFormat(canonical, name, description);
  const detailText = `${name} ${description}`;
  const offers = Array.isArray(productJsonLd.offers)
    ? productJsonLd.offers[0]
    : productJsonLd.offers;
  const price = Number.parseFloat(
    offers?.priceSpecification?.[0]?.price || offers?.lowPrice || offers?.price || ''
  );
  const image = toAbsoluteUrl(
    productJsonLd.image?.[0] ||
      productJsonLd.image ||
      extractFirstMatch(html, /<meta property="og:image" content="([^"]+)"/i)
  );
  const category = inferCategory(canonical, name, description);
  const origin = inferOrigin(detailText);
  const notes = inferNotes(detailText);
  const decaf = /descafeinad/i.test(normalizeForSlug(detailText));
  const isBio = /ecologic/i.test(normalizeForSlug(detailText));

  return {
    id: `orus_${slugify(canonical)}`,
    fuente: 'orus',
    fuentePais: 'ES',
    fuenteUrl: canonical,
    urlProducto: canonical,

    nombre: name,
    name,
    marca: 'Cafes Orus',
    roaster: 'Cafes Orus',

    ean: '',
    normalizedEan: '',
    sku: normalizeText(productJsonLd.sku || slugify(name)),
    mpn: '',

    descripcion: description,
    description,

    category,
    coffeeCategory: category === 'specialty' ? 'specialty' : 'daily',
    isSpecialty: category === 'specialty',
    legacy: false,

    formato: format,
    format,
    sistemaCapsula: format === 'capsules' ? inferCapsuleSystem(detailText) : '',
    tipoProducto:
      format === 'capsules'
        ? 'capsulas de cafe'
        : format === 'ground'
          ? 'cafe molido'
          : 'cafe en grano',
    cantidad: parseAmount(detailText, format),
    intensidad: null,
    tueste: 'medium',
    roastLevel: 'medium',
    pais: origin,
    origen: origin,
    proceso: '',
    notas: notes.join(', '),
    notes: notes.join(', '),
    decaf,

    precio: Number.isFinite(price) ? price : null,
    currency: 'EUR',
    certificaciones: isBio ? 'organico' : '',
    isBio,
    inStock: /instock$/i.test(normalizeText(offers?.availability || '')) || true,

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
      sourceType: 'orus',
      sourceCategoryUrl: item.sourceCategoryUrl,
      sourceTitle: title,
    },
  };
}

async function main() {
  const items = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[ORUS] Categories: ${CATEGORY_URLS.length}`);
  console.log(`[ORUS] Products discovered: ${items.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const item of items) {
    const cafe = await enrichProduct(item, now);
    if (!cafe) continue;
    cafes.push(cafe);
    console.log(`[ORUS] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[ORUS] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[ORUS] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[ORUS] Error:', error?.stack || error);
  process.exit(1);
});
