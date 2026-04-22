/*
  Importa cafés actuales de Cafés Baqué a Firestore.

  Fuentes:
    https://www.baque.com/es/comprar/cafe-grano/
    https://www.baque.com/es/comprar/specialty-coffees/
    https://www.baque.com/es/comprar/cafe-organico/
    https://www.baque.com/es/comprar/cafe-molido/
    https://www.baque.com/es/comprar/cafe-capsulas/

  Estrategia:
    - Descubre fichas desde el loop de WooCommerce en cada categoría.
    - Visita cada ficha y extrae el Product JSON-LD y el resumen del producto.
    - Deduplica entre categorías y omite fichas caídas.
    - Genera un JSON local y hace upsert en `cafes` con firebase-admin.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const CATEGORY_URLS = [
  'https://www.baque.com/es/comprar/cafe-grano/',
  'https://www.baque.com/es/comprar/specialty-coffees/',
  'https://www.baque.com/es/comprar/cafe-organico/',
  'https://www.baque.com/es/comprar/cafe-molido/',
  'https://www.baque.com/es/comprar/cafe-capsulas/',
];
const BASE_SITE = 'https://www.baque.com';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-baque-real.json');
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

function findProductJsonLd(html) {
  const scripts = [
    ...String(html || '').matchAll(
      /<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    ),
  ].map((match) => match[1]);

  for (const raw of scripts) {
    const parsed = safeJsonParse(raw);
    if (!parsed) continue;
    if (parsed?.['@type'] === 'Product') return parsed;
  }

  return null;
}

function discoverCategoryItems(html, categoryUrl) {
  return [
    ...String(html || '').matchAll(
      /<li class="product[\s\S]*?<a href="([^"]+)" class="woocommerce-LoopProduct-link[\s\S]*?<h2 class="woocommerce-loop-product__title">([\s\S]*?)<\/h2>[\s\S]*?<span class="price">([\s\S]*?)<\/span>/gi
    ),
  ].map((match) => ({
    categoryUrl,
    url: toAbsoluteUrl(match[1]),
    title: normalizeText(decodeHtmlEntities(match[2].replace(/<[^>]+>/g, ' '))),
    priceLabel: normalizeText(decodeHtmlEntities(match[3].replace(/<[^>]+>/g, ' '))),
  }));
}

function extractSummaryFields(html) {
  const title = extractFirstMatch(html, /<h1 class="product_title entry-title">([\s\S]*?)<\/h1>/i);
  const subtitle = extractFirstMatch(
    html,
    /<h1 class="product_title entry-title">[\s\S]*?<\/h1>\s*<h2>([\s\S]*?)<\/h2>/i
  );
  const sku = extractFirstMatch(
    html,
    /<p class="sku_wrapper">[\s\S]*?<span class="sku">([\s\S]*?)<\/span>/i
  );
  const priceLabel = extractFirstMatch(html, /<p class="price[^"]*">([\s\S]*?)<\/p>/i);
  const stockLabel = extractFirstMatch(html, /<p class="stock ([^"]+)">([\s\S]*?)<\/p>/i) || '';
  const descriptionBlock = extractFirstMatch(
    html,
    /<div class="description">([\s\S]*?)<\/div>\s*<div/i
  );
  const intensity = extractFirstMatch(
    html,
    /<h3>Intensidad<\/h3>\s*<p class="intensity">([\s\S]*?)<\/p>/i
  );

  return {
    title,
    subtitle,
    sku,
    priceLabel,
    stockLabel,
    descriptionBlock,
    intensity: Number.parseInt(intensity || '', 10) || null,
  };
}

function parseAmount(text) {
  const normalized = normalizeForSlug(text).toLowerCase();
  const capsuleMatch = normalized.match(/(\d+)\s*capsulas?/);
  if (capsuleMatch) return Number.parseInt(capsuleMatch[1], 10);

  const kiloMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kiloMatch) return Math.round(Number.parseFloat(kiloMatch[1].replace(',', '.')) * 1000);

  const gramMatch = normalized.match(/(\d+)\s*g\b/);
  if (gramMatch) return Number.parseInt(gramMatch[1], 10);

  return null;
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

function inferFormat(url, name, subtitle, description) {
  const haystack = normalizeForSlug(`${url} ${name} ${subtitle} ${description}`).toLowerCase();
  if (haystack.includes('capsula')) return 'capsules';
  if (haystack.includes('grano')) return 'beans';
  if (haystack.includes('molido')) return 'ground';
  return '';
}

function inferCapsuleSystem(url, name) {
  const haystack = normalizeForSlug(`${url} ${name}`).toLowerCase();
  if (haystack.includes('nespresso')) return 'nespresso';
  if (haystack.includes('dolce gusto')) return 'dolce gusto';
  return '';
}

function inferOrigin(name, description, url) {
  const haystack = normalizeForSlug(`${name} ${description} ${url}`).toLowerCase();
  const mappings = [
    ['colombia', 'Colombia'],
    ['varanasi', 'India'],
    ['costa rica', 'Costa Rica'],
    ['arabica', 'Arabica'],
    ['mezcla', 'Mezcla'],
  ];

  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) return value;
  }
  return '';
}

function inferRoast(name, description, url) {
  const haystack = normalizeForSlug(`${name} ${description} ${url}`).toLowerCase();
  if (haystack.includes('extra intenso') || haystack.includes('intenso')) return 'intenso';
  if (haystack.includes('natural')) return 'medio';
  if (haystack.includes('descafeinado')) return 'medio';
  return '';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    'cremoso',
    'cuerpo',
    'intenso',
    'dulce',
    'frutal',
    'floral',
    'cacao',
    'chocolate',
  ];

  return [...new Set(dictionary.filter((note) => haystack.includes(note)))];
}

function inferCategory(url, format) {
  const haystack = normalizeForSlug(url).toLowerCase();
  if (haystack.includes('specialty')) return 'specialty';
  if (format === 'capsules') return 'capsules';
  return 'supermarket';
}

function buildCafeDocId(sku, url) {
  if (sku) return `baque_${slugify(sku)}`;
  return `baque_${slugify(url.replace(/^https?:\/\/www\.baque\.com\//i, ''))}`;
}

async function discoverProducts() {
  const items = [];
  for (const categoryUrl of CATEGORY_URLS) {
    const html = await fetchText(categoryUrl);
    items.push(...discoverCategoryItems(html, categoryUrl));
  }

  const deduped = uniqueBy(items, (item) => item.url);
  if (!deduped.length) throw new Error('No se encontraron productos en Baqué.');
  return Number.isFinite(LIMIT) ? deduped.slice(0, LIMIT) : deduped;
}

async function enrichProduct(item, now) {
  try {
    const html = await fetchText(item.url);
    if (/<title>\s*Pagina no encontrada|<title>\s*P[áa]gina no encontrada/i.test(html)) {
      return null;
    }

    const product = findProductJsonLd(html);
    if (!product) return null;

    const summary = extractSummaryFields(html);
    const title = extractFirstMatch(html, /<title>([^<]+)<\/title>/i);
    const canonical = extractFirstMatch(html, /<link rel="canonical" href="([^"]+)"/i);
    const name = normalizeText(summary.title || product.name || item.title);
    const description = normalizeText(product.description || summary.subtitle || '');
    const image = toAbsoluteUrl(product.image || '');
    const sku = normalizeText(product.sku || summary.sku);
    const priceSpec = Array.isArray(product?.offers?.[0]?.priceSpecification)
      ? product.offers[0].priceSpecification[0]
      : Array.isArray(product?.offers)
        ? product.offers[0]?.priceSpecification?.[0] || product.offers[0]?.priceSpecification
        : product?.offers?.priceSpecification?.[0] || product?.offers?.priceSpecification;
    const availability = normalizeText(
      Array.isArray(product?.offers)
        ? product.offers[0]?.availability || ''
        : product?.offers?.availability || ''
    );
    const price = parsePrice(priceSpec?.price ?? summary.priceLabel ?? item.priceLabel);
    const amount = parseAmount(`${name} ${summary.subtitle} ${item.title}`);
    const format = inferFormat(item.url, name, summary.subtitle, description);
    const system = inferCapsuleSystem(item.url, name);
    const origin = inferOrigin(name, `${description} ${summary.descriptionBlock}`, item.url);
    const roast = inferRoast(name, `${description} ${summary.descriptionBlock}`, item.url);
    const notes = inferNotes(`${description} ${summary.descriptionBlock}`);
    const pageText = stripTags(html);
    const isBio = /organico/i.test(normalizeForSlug(`${name} ${item.url}`));
    const decaf = /descafeinado/i.test(normalizeForSlug(`${name} ${description}`));
    const category = inferCategory(item.url, format);

    return {
      id: buildCafeDocId(sku, canonical || item.url),
      fuente: 'baque',
      fuentePais: 'ES',
      fuenteUrl: canonical || item.url,
      urlProducto: canonical || item.url,

      nombre: name,
      name,
      marca: 'Cafés Baqué',
      roaster: 'Cafés Baqué',

      ean: '',
      normalizedEan: '',
      sku,
      mpn: '',

      descripcion: description,
      description,

      category,
      coffeeCategory:
        category === 'specialty' ? 'specialty' : format === 'capsules' ? 'capsules' : 'daily',
      isSpecialty: category === 'specialty',
      legacy: false,

      formato: format,
      format,
      sistemaCapsula: system,
      tipoProducto:
        format === 'beans'
          ? 'cafe en grano'
          : format === 'ground'
            ? 'cafe molido'
            : format === 'capsules'
              ? 'capsulas'
              : '',
      cantidad: amount,
      intensidad: summary.intensity,
      tueste: roast,
      roastLevel: roast,
      pais: origin,
      origen: origin,
      notas: notes.join(', '),
      notes: notes.join(', '),
      decaf,

      precio: price,
      currency: normalizeText(priceSpec?.priceCurrency || 'EUR'),
      certificaciones: isBio ? 'organico' : '',
      isBio,
      inStock: /instock$/i.test(availability) || /en stock/i.test(summary.stockLabel),

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
        sourceType: 'baque',
        sourceCategoryUrl: item.categoryUrl,
        sourceTitle: title,
        subtitle: summary.subtitle,
        descriptionBlock: summary.descriptionBlock,
        pageTextPreview: pageText.slice(0, 280),
      },
    };
  } catch (error) {
    console.warn(`[BAQUE] Skip ${item.url}: ${error.message}`);
    return null;
  }
}

async function main() {
  const items = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[BAQUE] Categories: ${CATEGORY_URLS.length}`);
  console.log(`[BAQUE] Products discovered: ${items.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const item of items) {
    const cafe = await enrichProduct(item, now);
    if (!cafe) continue;
    cafes.push(cafe);
    console.log(`[BAQUE] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[BAQUE] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[BAQUE] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[BAQUE] Error:', error?.stack || error);
  process.exit(1);
});
