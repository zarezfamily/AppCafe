/*
  Importa cafés en grano actuales de Kaffek España a Firestore.

  Fuente:
    https://kaffek.es/cafe-en-granos/granos-de-cafe.html

  Estrategia:
    - Lee el CollectionPage JSON-LD de la categoría para descubrir las 108 fichas.
    - Visita cada ficha y extrae el Product JSON-LD.
    - Genera un JSON local y hace upsert en `cafes` con firebase-admin.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const COLLECTION_URL = 'https://kaffek.es/cafe-en-granos/granos-de-cafe.html';
const BASE_SITE = 'https://kaffek.es';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-kaffek-real.json');
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

function findJsonLdByType(html, type) {
  const scriptContents = [
    ...String(html || '').matchAll(
      /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/gi
    ),
  ].map((match) => match[1]);

  for (const raw of scriptContents) {
    const parsed = safeJsonParse(raw);
    if (!parsed) continue;

    if (Array.isArray(parsed)) {
      const found = parsed.find((item) => item?.['@type'] === type);
      if (found) return found;
      continue;
    }

    if (parsed?.['@type'] === type) return parsed;
  }

  return null;
}

function findCollectionPage(html) {
  return findJsonLdByType(html, 'CollectionPage');
}

function findProduct(html) {
  return findJsonLdByType(html, 'Product');
}

function extractBrandAndSubtitle(html) {
  const h1 = extractFirstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const brand = extractFirstMatch(h1, /<span[^>]*>([\s\S]*?)<\/span>/i);
  const subtitleMatches = [...String(h1).matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)].map((match) =>
    normalizeText(decodeHtmlEntities(match[1]))
  );
  const subtitle = subtitleMatches.length > 1 ? subtitleMatches.at(-1) : '';
  const name = normalizeText(
    decodeHtmlEntities(
      String(h1)
        .replace(/<span[^>]*>[\s\S]*?<\/span>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
    )
  );

  return { brand, name, subtitle };
}

function inferBrand(product, h1Brand) {
  const manufacturer = normalizeText(product?.manufacturer?.name || product?.manufacturer || '');
  const genericBrand = normalizeText(product?.brand?.name || product?.brand || '');

  if (manufacturer) return manufacturer;
  if (h1Brand) return h1Brand;
  if (genericBrand && !/^whole beans$/i.test(genericBrand)) return genericBrand;
  return '';
}

function inferRoast(name, description) {
  const haystack = normalizeForSlug(`${name} ${description}`).toLowerCase();
  if (
    haystack.includes('ristretto') ||
    haystack.includes('intenso') ||
    haystack.includes('forte')
  ) {
    return 'intenso';
  }
  if (
    haystack.includes('medio') ||
    haystack.includes('medium roast') ||
    haystack.includes('tostado medio')
  ) {
    return 'medio';
  }
  if (haystack.includes('suave') || haystack.includes('dolce')) return 'suave';
  return '';
}

function inferIntensity(name, description) {
  const haystack = normalizeForSlug(`${name} ${description}`).toLowerCase();
  if (haystack.includes('ristretto')) return 10;
  if (haystack.includes('extra intenso') || haystack.includes('extra strong')) return 10;
  if (haystack.includes('intenso') || haystack.includes('forte')) return 9;
  if (haystack.includes('espresso')) return 7;
  if (haystack.includes('crema') || haystack.includes('suave') || haystack.includes('dolce'))
    return 5;
  return null;
}

function inferOrigin(name, description) {
  const haystack = normalizeForSlug(`${name} ${description}`).toLowerCase();
  if (haystack.includes('colombia')) return 'Colombia';
  if (haystack.includes('brasil')) return 'Brasil';
  if (haystack.includes('arabica')) return 'Arabica';
  if (haystack.includes('robusta')) return 'Robusta';
  if (haystack.includes('mezcla') || haystack.includes('blend')) return 'Mezcla';
  return '';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    'cremoso',
    'cremosa',
    'cacao',
    'chocolate',
    'frutal',
    'frutado',
    'citricos',
    'floral',
    'dulce',
    'suave',
    'intenso',
    'acidez',
    'cuerpo',
  ];

  return [
    ...new Set(
      dictionary
        .filter((note) => haystack.includes(note))
        .map((note) => {
          if (note === 'cremosa') return 'cremoso';
          if (note === 'frutado') return 'frutal';
          if (note === 'citricos') return 'citrico';
          return note;
        })
    ),
  ];
}

function extractQuantity(name, subtitle, description) {
  const combined = normalizeForSlug(`${name} ${subtitle} ${description}`).toLowerCase();
  const kiloMatch = combined.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kiloMatch) {
    return Math.round(Number.parseFloat(kiloMatch[1].replace(',', '.')) * 1000);
  }

  const gramMatches = [...combined.matchAll(/(\d+)\s*g\b/g)].map((match) =>
    Number.parseInt(match[1], 10)
  );
  if (gramMatches.length) return Math.max(...gramMatches);
  return null;
}

function buildCafeDocId(url, gtin, name) {
  if (gtin) return `ean_${gtin}`;
  return `kaffek_${slugify(url.replace(/^https?:\/\/kaffek\.es\//i, '') || name)}`;
}

function isCoffeeProduct(name, description, subtitle) {
  const normalizedName = normalizeForSlug(name).toLowerCase();
  const haystack = normalizeForSlug(`${name} ${description} ${subtitle}`).toLowerCase();

  if (normalizedName.includes('recipiente de cafe al vacio')) return false;
  if (normalizedName.includes('vacuum coffee container')) return false;
  if (normalizedName.includes('contenedor de cafe')) return false;
  if (haystack.includes('numero de producto dlsc063')) return false;

  return true;
}

function discoverCategoryPages(html) {
  const pages = [
    COLLECTION_URL,
    ...[
      ...String(html || '').matchAll(
        /href="(https:\/\/kaffek\.es\/cafe-en-granos\/granos-de-cafe\.html\?p=\d+)"/gi
      ),
    ].map((match) => match[1]),
  ];

  return uniqueBy(pages, (url) => url);
}

async function discoverProducts() {
  const firstHtml = await fetchText(COLLECTION_URL);
  const categoryPages = discoverCategoryPages(firstHtml);
  const urls = [];

  for (const categoryUrl of categoryPages) {
    const html = categoryUrl === COLLECTION_URL ? firstHtml : await fetchText(categoryUrl);
    const collection = findCollectionPage(html);
    const items = collection?.mainEntity?.itemListElement || [];
    urls.push(
      ...items
        .map((item) => toAbsoluteUrl(item?.url))
        .filter((url) => /^https:\/\/kaffek\.es\/[^?#]+\.html$/i.test(url))
    );
  }

  const deduped = uniqueBy(urls, (url) => url);
  if (!deduped.length) throw new Error('No se encontraron fichas de producto en Kaffek.');
  return Number.isFinite(LIMIT) ? deduped.slice(0, LIMIT) : deduped;
}

async function enrichProduct(url, now) {
  const html = await fetchText(url);
  if (/<title>\s*404/i.test(html) || /No se encontro la pagina/i.test(normalizeForSlug(html))) {
    throw new Error(`Ficha no disponible: ${url}`);
  }

  const product = findProduct(html);
  if (!product) throw new Error(`No se encontró JSON-LD Product en ${url}`);

  const { brand: h1Brand, name: h1Name, subtitle } = extractBrandAndSubtitle(html);
  const pageText = stripTags(html);
  const title = extractFirstMatch(html, /<title>([^<]+)<\/title>/i);
  const canonical = extractFirstMatch(html, /<link rel="canonical" href="([^"]+)"/i);
  const name = normalizeText(h1Name || product.name || title);
  const description = normalizeText(
    product.description || extractFirstMatch(html, /<meta name="description" content="([^"]+)"/i)
  );
  const brand = inferBrand(product, h1Brand);
  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers || {};
  const gtin = normalizeText(product.gtin13 || product.gtin || offers.gtin13 || offers.gtin || '');
  const image = toAbsoluteUrl(
    Array.isArray(product.image) ? product.image[0] : product.image || ''
  );
  const quantity = extractQuantity(name, subtitle, description);
  const notes = inferNotes(`${name} ${description}`);
  const roast = inferRoast(name, description);
  const intensity = inferIntensity(name, description);
  const origin = inferOrigin(name, description);
  const decaf = /descafeinado|decaf/i.test(`${name} ${description}`);
  const price =
    offers?.price != null && offers.price !== '' ? Number.parseFloat(offers.price) : null;
  const availability = normalizeText(offers.availability || '');
  const ratingValue = Number.parseFloat(product?.aggregateRating?.ratingValue || '');
  const reviewCount = Number.parseInt(product?.aggregateRating?.reviewCount || '', 10);

  if (!isCoffeeProduct(name, description, subtitle)) {
    return null;
  }

  return {
    id: buildCafeDocId(canonical || url, gtin, name),
    fuente: 'kaffek',
    fuentePais: 'ES',
    fuenteUrl: canonical || url,
    urlProducto: canonical || url,

    nombre: name,
    name,
    marca: brand,
    roaster: brand,

    ean: gtin,
    normalizedEan: gtin,
    sku: normalizeText(product.sku || offers.sku || ''),
    mpn: normalizeText(product.mpn || offers.mpn || ''),

    descripcion: description,
    description,

    category: 'supermarket',
    coffeeCategory: 'daily',
    isSpecialty: false,
    legacy: false,

    formato: 'beans',
    format: 'beans',
    sistemaCapsula: '',
    tipoProducto: 'cafe en grano',
    cantidad: quantity,
    intensidad: intensity,
    tueste: roast,
    roastLevel: roast,
    pais: origin,
    origen: origin,
    notas: notes.join(', '),
    notes: notes.join(', '),
    decaf,

    precio: Number.isFinite(price) ? price : null,
    currency: normalizeText(offers.priceCurrency || 'EUR'),
    certificaciones: '',
    isBio: false,
    inStock: /instock$/i.test(availability),

    fecha: now,
    puntuacion: Number.isFinite(ratingValue) ? ratingValue : 0,
    votos: Number.isFinite(reviewCount) ? reviewCount : 0,

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
      sourceType: 'kaffek',
      sourceTitle: title,
      subtitle,
      availability,
      pageTextPreview: pageText.slice(0, 280),
    },
  };
}

async function main() {
  const urls = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[KAFFEK] Collection: ${COLLECTION_URL}`);
  console.log(`[KAFFEK] Products discovered: ${urls.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const url of urls) {
    const cafe = await enrichProduct(url, now);
    if (!cafe) continue;
    cafes.push(cafe);
    console.log(`[KAFFEK] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[KAFFEK] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[KAFFEK] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[KAFFEK] Error:', error?.stack || error);
  process.exit(1);
});
