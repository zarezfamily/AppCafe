/*
  Importa cafés actuales de Cafés Camuy a Firestore.

  Fuentes:
    - https://cafescamuy.com/8-cafes-especiales
    - https://cafescamuy.com/3-espresso

  Estrategia:
    - Descubre las fichas desde las categorías visibles.
    - Extrae nombre, precio, foto y descripción desde el HTML de PrestaShop.
    - Conserva únicamente cafés y evita cápsulas, té y complementos.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const CATEGORY_URLS = [
  'https://cafescamuy.com/8-cafes-especiales',
  'https://cafescamuy.com/3-espresso',
];
const BASE_SITE = 'https://cafescamuy.com';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-camuy-real.json');
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

function repairMojibake(value) {
  return String(value || '')
    .replace(/Ã¡/g, 'á')
    .replace(/Ã©/g, 'é')
    .replace(/Ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/Ãº/g, 'ú')
    .replace(/Ã/g, 'Á')
    .replace(/Ã‰/g, 'É')
    .replace(/Ã/g, 'Í')
    .replace(/Ã“/g, 'Ó')
    .replace(/Ãš/g, 'Ú')
    .replace(/Ã±/g, 'ñ')
    .replace(/Ã‘/g, 'Ñ')
    .replace(/Ã¼/g, 'ü')
    .replace(/Ãœ/g, 'Ü')
    .replace(/Â/g, '');
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
  return repairMojibake(
    String(value || '')
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#x27;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&aacute;/gi, 'á')
      .replace(/&eacute;/gi, 'é')
      .replace(/&iacute;/gi, 'í')
      .replace(/&oacute;/gi, 'ó')
      .replace(/&uacute;/gi, 'ú')
      .replace(/&ntilde;/gi, 'ñ')
      .replace(/&uuml;/gi, 'ü')
      .replace(/&Aacute;/g, 'Á')
      .replace(/&Eacute;/g, 'É')
      .replace(/&Iacute;/g, 'Í')
      .replace(/&Oacute;/g, 'Ó')
      .replace(/&Uacute;/g, 'Ú')
      .replace(/&Ntilde;/g, 'Ñ')
  );
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
  const rawText = await response.text();
  const text = /Ã.|Â./.test(rawText) ? Buffer.from(rawText, 'latin1').toString('utf8') : rawText;
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

function parsePrice(text) {
  const normalized = normalizeText(text)
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '');
  const price = Number.parseFloat(normalized);
  return Number.isFinite(price) ? price : null;
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

function shouldSkip(url, name) {
  const haystack = normalizeForSlug(`${url} ${name}`).toLowerCase();
  return (
    haystack.includes('caps') ||
    haystack.includes('capsulas') ||
    haystack.includes('monodosis') ||
    haystack.includes('/15-tea') ||
    /\btea\b/.test(haystack) ||
    haystack.includes('complemento')
  );
}

function discoverCategoryItems(html, categoryUrl) {
  const products = [
    ...String(html || '').matchAll(/<a[^>]+href="([^"]+\.html)"[^>]*class="product_img_link"/gi),
  ]
    .map((match) => toAbsoluteUrl(match[1]))
    .filter((url) => url.startsWith(BASE_SITE))
    .map((url) => ({
      url,
      sourceCategoryUrl: categoryUrl,
    }));

  return uniqueBy(products, (item) => item.url).filter((item) => !shouldSkip(item.url, ''));
}

function inferCategory(item, name, description) {
  const haystack = normalizeForSlug(
    `${item.sourceCategoryUrl} ${name} ${description}`
  ).toLowerCase();
  if (haystack.includes('cafes-especiales')) return 'specialty';
  return 'daily';
}

function inferOrigin(name, description, url) {
  const haystack = normalizeForSlug(`${name} ${description} ${url}`).toLowerCase();
  const mappings = [
    ['indonesia', 'Indonesia'],
    ['australia', 'Australia'],
    ['jamaica', 'Jamaica'],
    ['brasil', 'Brasil'],
    ['kenya', 'Kenia'],
    ['ethiopia', 'Etiopía'],
    ['etiopia', 'Etiopía'],
    ['costa rica', 'Costa Rica'],
    ['papua new guinea', 'Papúa Nueva Guinea'],
    ['sumatra', 'Indonesia'],
    ['colombia', 'Colombia'],
    ['guatemala', 'Guatemala'],
    ['honduras', 'Honduras'],
    ['nicaragua', 'Nicaragua'],
    ['india', 'India'],
    ['maragogype', 'México'],
    ['caracolillo', 'Colombia'],
    ['ruanda', 'Ruanda'],
    ['rwanda', 'Ruanda'],
    ['antigua', 'Guatemala'],
    ['parana', 'Brasil'],
    ['bukavu', 'República Democrática del Congo'],
  ];

  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) return value;
  }
  return '';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    'aroma',
    'acidez',
    'cuerpo',
    'dulce',
    'chocolate',
    'fruta',
    'floral',
    'especias',
  ];
  return [...new Set(dictionary.filter((note) => haystack.includes(note)))];
}

function buildCafeDocId(sku, url) {
  return `camuy_${slugify(sku || url)}`;
}

async function discoverProducts() {
  const all = [];
  for (const categoryUrl of CATEGORY_URLS) {
    const html = await fetchText(categoryUrl);
    all.push(...discoverCategoryItems(html, categoryUrl));
  }
  const deduped = uniqueBy(all, (item) => item.url);
  if (!deduped.length) throw new Error('No se encontraron fichas de producto en Camuy.');
  return Number.isFinite(LIMIT) ? deduped.slice(0, LIMIT) : deduped;
}

async function enrichProduct(item, now) {
  const html = await fetchText(item.url);
  const title = extractFirstMatch(html, /<title>([\s\S]*?)<\/title>/i);
  const canonical =
    extractFirstMatch(html, /<meta property="og:url" content="([^"]+)"/i) || item.url;
  const name = extractFirstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || title;
  if (!name || shouldSkip(canonical, name)) return null;

  const shortDescription = extractFirstMatch(
    html,
    /<div id="short_description_content"[^>]*>([\s\S]*?)<\/div>/i
  );
  const metaDescription = extractFirstMatch(html, /<meta name="description" content="([^"]+)"/i);
  const description = shortDescription || metaDescription;
  const image = toAbsoluteUrl(
    extractFirstMatch(html, /<meta property="og:image" content="([^"]+)"/i) ||
      extractFirstMatch(html, /<img id="bigpic"[^>]+src="([^"]+)"/i)
  );
  const price = parsePrice(
    extractFirstMatch(html, /<span\s+id="our_price_display">([\s\S]*?)<\/span>/i) ||
      extractFirstMatch(html, /<meta property="product:price:amount" content="([^"]+)"/i)
  );
  const sku = extractFirstMatch(
    html,
    /<p id="product_reference"[\s\S]*?<span[^>]*class="editable"[^>]*>([\s\S]*?)<\/span>/i
  );
  const amount = parseAmount(`${name} ${description}`);
  const origin = inferOrigin(name, description, canonical);
  const category = inferCategory(item, name, description);
  const notes = inferNotes(description);
  const decaf = /descafeinad/i.test(normalizeForSlug(`${name} ${description}`));
  const inStock = !/no disponible|agotado/i.test(normalizeForSlug(html));

  return {
    id: buildCafeDocId(sku, canonical),
    fuente: 'camuy',
    fuentePais: 'ES',
    fuenteUrl: canonical,
    urlProducto: canonical,

    nombre: name,
    name,
    marca: 'Cafés Camuy',
    roaster: 'Cafés Camuy',

    ean: '',
    normalizedEan: '',
    sku,
    mpn: '',

    descripcion: description,
    description,

    category,
    coffeeCategory: category,
    isSpecialty: category === 'specialty',
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

    precio: price,
    currency: 'EUR',
    certificaciones: '',
    isBio: false,
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
      sourceType: 'camuy',
      sourceCategoryUrl: item.sourceCategoryUrl,
      sourceTitle: title,
    },
  };
}

async function main() {
  const items = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[CAMUY] Categories: ${CATEGORY_URLS.length}`);
  console.log(`[CAMUY] Products discovered: ${items.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const item of items) {
    const cafe = await enrichProduct(item, now);
    if (!cafe) continue;
    cafes.push(cafe);
    console.log(`[CAMUY] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[CAMUY] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[CAMUY] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[CAMUY] Error:', error?.stack || error);
  process.exit(1);
});
