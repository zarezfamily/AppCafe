/*
  Importa cafés actuales de Mogorttini a Firestore.

  Fuentes:
    https://www.mogorttini.com/3-cafe-en-grano-
    https://www.mogorttini.com/9-nespresso-pro
    https://www.mogorttini.com/4-nespresso
    https://www.mogorttini.com/7-dolce-gusto

  Estrategia:
    - Descubre fichas de producto desde las cuatro categorías pedidas.
    - Extrae el JSON-LD Product de cada ficha.
    - Genera un JSON local y hace upsert en `cafes` con firebase-admin.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const CATEGORY_URLS = [
  'https://www.mogorttini.com/3-cafe-en-grano-',
  'https://www.mogorttini.com/9-nespresso-pro',
  'https://www.mogorttini.com/4-nespresso',
  'https://www.mogorttini.com/7-dolce-gusto',
];
const BASE_SITE = 'https://www.mogorttini.com';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON ||
  path.resolve(process.cwd(), 'scripts/cafe-import-mogorttini-real.json');
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
  const scriptContents = [
    ...String(html || '').matchAll(
      /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/gi
    ),
  ].map((match) => match[1]);

  for (const raw of scriptContents) {
    const parsed = safeJsonParse(raw);
    if (!parsed) continue;

    if (Array.isArray(parsed)) {
      const product = parsed.find((item) => item?.['@type'] === 'Product');
      if (product) return product;
      continue;
    }

    if (parsed?.['@type'] === 'Product') return parsed;
  }

  return null;
}

function discoverProductLinks(html) {
  const urls = [
    ...[
      ...String(html || '').matchAll(
        /"url"\s*:\s*"(https:\\\/\\\/www\.mogorttini\.com\\\/[^"]+\.html)"/gi
      ),
    ].map((match) => match[1].replace(/\\\//g, '/')),
    ...[
      ...String(html || '').matchAll(/href="(https:\/\/www\.mogorttini\.com\/[^"]+\.html)"/gi),
    ].map((match) => match[1]),
  ];

  return uniqueBy(
    urls
      .map((url) => toAbsoluteUrl(url))
      .filter((url) => /^https:\/\/www\.mogorttini\.com\/.+\.html$/i.test(url)),
    (url) => url
  );
}

function inferBrand(name, brandFromJson) {
  const explicit = normalizeText(brandFromJson?.name || brandFromJson || '');
  if (explicit) return explicit;
  const haystack = normalizeForSlug(name).toLowerCase();
  if (haystack.includes('kfetea')) return 'Kfetea';
  return 'Mogorttini';
}

function inferFormat(category, name, text) {
  const haystack = normalizeForSlug(`${category} ${name} ${text}`).toLowerCase();
  if (haystack.includes('cafe en grano')) return 'beans';
  if (
    haystack.includes('capsulas') ||
    haystack.includes('nespresso') ||
    haystack.includes('dolce gusto')
  ) {
    return 'capsules';
  }
  return '';
}

function inferCapsuleSystem(category, url, name) {
  const haystack = normalizeForSlug(`${category} ${url} ${name}`).toLowerCase();
  if (haystack.includes('nespresso pro')) return 'nespresso pro';
  if (haystack.includes('nespresso')) return 'nespresso';
  if (haystack.includes('dolce gusto')) return 'dolce gusto';
  return '';
}

function inferOrigin(name, description) {
  const haystack = normalizeForSlug(`${name} ${description}`).toLowerCase();
  if (haystack.includes('colombia')) return 'Colombia';
  if (haystack.includes('brasil')) return 'Brasil';
  if (haystack.includes('arabica')) return 'Arabica';
  if (haystack.includes('mezcla')) return 'Mezcla';
  return '';
}

function inferRoast(name, description) {
  const haystack = normalizeForSlug(`${name} ${description}`).toLowerCase();
  if (
    haystack.includes('ristretto') ||
    haystack.includes('intenso') ||
    haystack.includes('extra intenso')
  ) {
    return 'intenso';
  }
  if (haystack.includes('espresso')) return 'medio';
  if (haystack.includes('descafeinado')) return 'medio';
  return '';
}

function inferIntensity(name, description) {
  const haystack = normalizeForSlug(`${name} ${description}`).toLowerCase();
  if (haystack.includes('ristretto')) return 10;
  if (haystack.includes('extra intenso')) return 10;
  if (haystack.includes('intenso')) return 9;
  if (haystack.includes('espresso')) return 7;
  return null;
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    'frutales',
    'frutal',
    'cacao',
    'cereal',
    'crema',
    'cremosa',
    'denso',
    'intenso',
    'potente',
    'suave',
    'dulce',
  ];

  return [
    ...new Set(
      dictionary
        .filter((note) => haystack.includes(note))
        .map((note) => {
          if (note === 'frutales') return 'frutal';
          if (note === 'cremosa') return 'crema';
          return note;
        })
    ),
  ];
}

function extractCapsuleCount(name, description) {
  const combined = normalizeForSlug(`${name} ${description}`).toLowerCase();

  if (combined.includes('tasting box') && /\b4\s+variedades\b/.test(combined)) {
    return 4;
  }

  const directBoxByUnit = combined.match(
    /(\d+)\s*cajas?.*?(\d+)\s*(?:capsulas|unidades)\s*por\s*caja/
  );
  if (directBoxByUnit) {
    const boxes = Number.parseInt(directBoxByUnit[1], 10);
    const perBox = Number.parseInt(directBoxByUnit[2], 10);
    if (Number.isFinite(boxes) && Number.isFinite(perBox)) {
      return boxes * perBox;
    }
  }

  const multipliedPatterns = [
    /(\d+)\s*cajas?\s*(?:de)?\s*(\d+)\s*(?:capsulas|unidades)/g,
    /(\d+)\s*(?:capsulas|unidades)\s*por\s*caja/g,
  ];

  const explicitBoxCount = Number.parseInt((combined.match(/(\d+)\s*cajas?/) || [])[1] || '', 10);

  for (const pattern of multipliedPatterns) {
    let match;
    while ((match = pattern.exec(combined))) {
      if (match.length >= 3) {
        const boxes = Number.parseInt(match[1], 10);
        const perBox = Number.parseInt(match[2], 10);
        if (Number.isFinite(boxes) && Number.isFinite(perBox)) {
          return boxes * perBox;
        }
      } else if (match.length >= 2 && Number.isFinite(explicitBoxCount)) {
        const perBox = Number.parseInt(match[1], 10);
        if (Number.isFinite(perBox)) {
          return explicitBoxCount * perBox;
        }
      }
    }
  }

  const singleCapsuleMentions = [...combined.matchAll(/\b1\s*capsula\b/g)].length;
  if (singleCapsuleMentions > 1) return singleCapsuleMentions;

  const values = [...combined.matchAll(/(\d+)\s*capsulas?/g)].map((match) =>
    Number.parseInt(match[1], 10)
  );
  if (!values.length) return null;
  return Math.max(...values);
}

function extractQuantity(format, name, description, weight) {
  if (format === 'capsules') {
    return extractCapsuleCount(name, description);
  }

  const combined = normalizeForSlug(`${name} ${description}`).toLowerCase();
  const grams = [...combined.matchAll(/(\d+)\s*(?:gr|g|kg)\b/g)].map((match) => {
    const value = Number.parseFloat(match[1]);
    const unit = match[0].includes('kg') ? 'kg' : 'g';
    return unit === 'kg' ? Math.round(value * 1000) : Math.round(value);
  });
  if (grams.length) return Math.max(...grams);

  if (weight?.value) {
    const numeric = Number.parseFloat(weight.value);
    if (Number.isFinite(numeric)) {
      return String(weight.unitCode || '').toLowerCase() === 'kg'
        ? Math.round(numeric * 1000)
        : Math.round(numeric);
    }
  }

  return null;
}

function buildCafeDocId(productUrl, gtin13, name) {
  if (gtin13) return `ean_${gtin13}`;
  const slugBase = slugify(productUrl.replace(/^https?:\/\/www\.mogorttini\.com\//i, '') || name);
  return `mogorttini_${slugBase}`;
}

async function discoverProducts() {
  const urls = [];
  for (const categoryUrl of CATEGORY_URLS) {
    const html = await fetchText(categoryUrl);
    urls.push(...discoverProductLinks(html));
  }

  const deduped = uniqueBy(urls, (url) => url);
  if (!deduped.length) throw new Error('No se encontraron fichas de producto en Mogorttini.');
  return Number.isFinite(LIMIT) ? deduped.slice(0, LIMIT) : deduped;
}

async function enrichProduct(url, now) {
  const html = await fetchText(url);
  const product = findProductJsonLd(html);
  if (!product) throw new Error(`No se encontró JSON-LD Product en ${url}`);

  const pageText = stripTags(html);
  const name = normalizeText(product.name || extractFirstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i));
  const description = normalizeText(product.description);
  const category = normalizeText(product.category);
  const canonical = extractFirstMatch(html, /<link rel="canonical" href="([^"]+)"/i);
  const title = extractFirstMatch(html, /<title>([^<]+)<\/title>/i);
  const brand = inferBrand(name, product.brand);
  const gtin13 = normalizeText(product.gtin13 || product.gtin || '');
  const image = Array.isArray(product.image)
    ? toAbsoluteUrl(product.image[0])
    : toAbsoluteUrl(
        product.image || extractFirstMatch(html, /<meta property="og:image" content="([^"]+)"/i)
      );
  const format = inferFormat(category, name, description);
  const system = inferCapsuleSystem(category, url, name);
  const quantity = extractQuantity(format, name, description, product.weight);
  const notes = inferNotes(`${name} ${description}`);
  const decaf = /descafeinado/i.test(`${name} ${description}`);
  const roast = inferRoast(name, description);
  const intensity = inferIntensity(name, description);
  const origin = inferOrigin(name, description);
  const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers || {};
  const price =
    offers?.price != null && offers.price !== '' ? Number.parseFloat(offers.price) : null;
  const availability = normalizeText(offers.availability || '');

  return {
    id: buildCafeDocId(canonical || url, gtin13, name),
    fuente: 'mogorttini',
    fuentePais: 'ES',
    fuenteUrl: canonical || url,
    urlProducto: canonical || url,

    nombre: name,
    name,
    marca: brand,
    roaster: brand,

    ean: gtin13,
    normalizedEan: gtin13,
    sku: normalizeText(product.sku || ''),
    mpn: normalizeText(product.mpn || ''),

    descripcion: description,
    description,

    category: 'supermarket',
    coffeeCategory: format === 'beans' ? 'daily' : 'capsules',
    isSpecialty: false,
    legacy: false,

    formato: format,
    format,
    sistemaCapsula: system,
    tipoProducto: format === 'beans' ? 'cafe en grano' : format === 'capsules' ? 'capsulas' : '',
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
      sourceType: 'mogorttini',
      sourceCategory: category,
      sourceTitle: title,
      availability,
      pageTextPreview: pageText.slice(0, 280),
    },
  };
}

async function main() {
  const urls = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[MOGORTTINI] Categories: ${CATEGORY_URLS.length}`);
  console.log(`[MOGORTTINI] Products discovered: ${urls.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const url of urls) {
    const cafe = await enrichProduct(url, now);
    cafes.push(cafe);
    console.log(`[MOGORTTINI] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[MOGORTTINI] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[MOGORTTINI] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[MOGORTTINI] Error:', error?.stack || error);
  process.exit(1);
});
