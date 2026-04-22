/*
  Importa cafes actuales de Cafes Candelas a Firestore.

  Fuentes:
    https://www.cafescandelas.com/tienda/grano
    https://www.cafescandelas.com/tienda/molido
    https://www.cafescandelas.com/tienda/capsulas

  Estrategia:
    - Descubre fichas desde las categorias y su segunda pagina.
    - Extrae nombre, descripcion, imagen y precio directamente del HTML.
    - Clasifica por formato y filtra no-cafe.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const CATEGORY_URLS = [
  'https://www.cafescandelas.com/tienda/grano',
  'https://www.cafescandelas.com/tienda/grano?page=2',
  'https://www.cafescandelas.com/tienda/molido',
  'https://www.cafescandelas.com/tienda/molido?page=2',
  'https://www.cafescandelas.com/tienda/capsulas',
  'https://www.cafescandelas.com/tienda/capsulas?page=2',
];
const BASE_SITE = 'https://www.cafescandelas.com';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-candelas-real.json');
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
    .replace(/&aacute;/gi, 'a')
    .replace(/&eacute;/gi, 'e')
    .replace(/&iacute;/gi, 'i')
    .replace(/&oacute;/gi, 'o')
    .replace(/&uacute;/gi, 'u')
    .replace(/&ntilde;/gi, 'n')
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
  const raw = normalizeText(decodeHtmlEntities(url)).split('#')[0];
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

function cleanProductName(value) {
  const head = normalizeText(value).split('|')[0].trim();
  return head
    .replace(/\s*-\s*(grano|molido|capsulas?|cafe)\s*-\s*cafe\s*$/i, '')
    .replace(/\s*-\s*(grano|molido|capsulas?)\s*$/i, '')
    .trim();
}

function parsePrice(text) {
  const clean = normalizeText(text).replace(/\./g, '').replace(',', '.');
  const value = Number.parseFloat(clean);
  return Number.isFinite(value) ? value : null;
}

function parseAmount(text) {
  const normalized = normalizeForSlug(text).toLowerCase();
  const capsuleMatch = normalized.match(/(\d+)\s*(caps|capsulas)\b/);
  if (capsuleMatch) return Number.parseInt(capsuleMatch[1], 10);
  const kiloMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kiloMatch) return Math.round(Number.parseFloat(kiloMatch[1].replace(',', '.')) * 1000);
  const gramMatch = normalized.match(/(\d+)\s*g\b/);
  if (gramMatch) return Number.parseInt(gramMatch[1], 10);
  return null;
}

function discoverCategoryLinks(html) {
  return uniqueBy(
    [...String(html || '').matchAll(/<h2[^>]*>[\s\S]{0,220}?href="([^"]+)"/gi)]
      .map((match) => toAbsoluteUrl(match[1]))
      .filter((url) => url.startsWith(`${BASE_SITE}/tienda/`))
      .filter((url) => url !== '#'),
    (url) => url
  );
}

function shouldSkip(url, name, description) {
  const haystack = normalizeForSlug(`${url} ${name} ${description}`).toLowerCase();
  return (
    haystack.includes('take-away') ||
    haystack.includes('vasos') ||
    haystack.includes('tapas') ||
    haystack.includes('paletinas') ||
    haystack.includes('portavasos') ||
    haystack.includes('dispensadores') ||
    haystack.includes('siropes') ||
    haystack.includes('salsas') ||
    haystack.includes('frappes') ||
    haystack.includes('maquinaria') ||
    haystack.includes('cafeteras') ||
    haystack.includes('molinos') ||
    haystack.includes('repuestos') ||
    haystack.includes('vajilla') ||
    haystack.includes('textil') ||
    haystack.includes('merchandising')
  );
}

function inferFormat(url, name, description) {
  const haystack = normalizeForSlug(`${url} ${name} ${description}`).toLowerCase();
  if (haystack.includes('/capsulas/') || haystack.includes('capsula')) return 'capsules';
  if (haystack.includes('/molido/') || haystack.includes('molido')) return 'ground';
  return 'beans';
}

function inferCapsuleSystem(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('point')) return 'point';
  if (haystack.includes('compostable')) return 'compostable';
  return '';
}

function inferOrigin(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const mappings = [
    ['colombia', 'Colombia'],
    ['brasil', 'Brasil'],
    ['guatemala', 'Guatemala'],
    ['etiopia', 'Etiopia'],
    ['honduras', 'Honduras'],
    ['nicaragua', 'Nicaragua'],
    ['jamaica', 'Jamaica'],
    ['centroamericanos', 'Centroamerica'],
  ];
  const hits = [];
  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) hits.push(value);
  }
  return [...new Set(hits)].join(', ');
}

function inferCategory(url, name, description) {
  const haystack = normalizeForSlug(`${url} ${name} ${description}`).toLowerCase();
  if (
    haystack.includes('origin') ||
    haystack.includes('blue mountain') ||
    haystack.includes('jamaica') ||
    haystack.includes('supremo') ||
    haystack.includes('guatemala') ||
    haystack.includes('etiopia') ||
    haystack.includes('nicaragua maragogype') ||
    haystack.includes('comercio justo')
  ) {
    return 'specialty';
  }
  return 'daily';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    ['afrutad', 'fruta'],
    ['avellana', 'avellana'],
    ['suave', 'suave'],
    ['aroma', 'aromatico'],
    ['intensidad', 'intenso'],
    ['crema', 'cremoso'],
    ['equilibr', 'equilibrado'],
  ];
  return [
    ...new Set(dictionary.filter(([needle]) => haystack.includes(needle)).map(([, note]) => note)),
  ];
}

async function discoverProducts() {
  const discovered = [];
  for (const categoryUrl of CATEGORY_URLS) {
    const html = await fetchText(categoryUrl);
    const links = discoverCategoryLinks(html);
    for (const url of links) {
      discovered.push({ url, sourceCategoryUrl: categoryUrl });
    }
  }

  const items = uniqueBy(discovered, (item) => item.url);
  const filtered = items.filter((item) => {
    const haystack = normalizeForSlug(item.url).toLowerCase();
    return (
      haystack.includes('/tienda/grano/') ||
      haystack.includes('/tienda/molido/') ||
      haystack.includes('/tienda/capsulas/') ||
      haystack.includes('/tienda/cafe/')
    );
  });

  return Number.isFinite(LIMIT) ? filtered.slice(0, LIMIT) : filtered;
}

async function enrichProduct(item, now) {
  const html = await fetchText(item.url);
  const title = extractFirstMatch(html, /<title>([^<]+)<\/title>/i);
  const name = cleanProductName(title);
  const description = extractFirstMatch(html, /<meta name="description" content="([^"]+)"/i);
  const image = toAbsoluteUrl(
    extractFirstMatch(html, /<meta property="og:image" content="([^"]+)"/i)
  );
  const priceText =
    extractFirstMatch(html, /<div class="precio">\s*([^<]+)\s*<\/div>/i) ||
    extractFirstMatch(html, /itemprop="price" content="([^"]+)"/i);

  if (!name || shouldSkip(item.url, name, description)) return null;

  const detailText = `${name} ${description}`;
  const format = inferFormat(item.url, name, description);
  const category = inferCategory(item.url, name, description);
  const amount = parseAmount(detailText) || parseAmount(description);
  const origin = inferOrigin(detailText);
  const notes = inferNotes(detailText);
  const decaf = /descafeinad/i.test(normalizeForSlug(detailText));
  const isBio = /\becologic/i.test(normalizeForSlug(detailText));
  const system = format === 'capsules' ? inferCapsuleSystem(detailText) : '';

  return {
    id: `candelas_${slugify(item.url)}`,
    fuente: 'candelas',
    fuentePais: 'ES',
    fuenteUrl: item.url,
    urlProducto: item.url,

    nombre: name,
    name,
    marca: 'Cafes Candelas',
    roaster: 'Cafes Candelas',

    ean: '',
    normalizedEan: '',
    sku: slugify(name),
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
    tueste: 'medium',
    roastLevel: 'medium',
    pais: origin,
    origen: origin,
    proceso: '',
    notas: notes.join(', '),
    notes: notes.join(', '),
    decaf,

    precio: parsePrice(priceText),
    currency: 'EUR',
    certificaciones: isBio ? 'organico' : '',
    isBio,
    inStock: true,

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
      sourceType: 'candelas',
      sourceCategoryUrl: item.sourceCategoryUrl,
      sourceTitle: title,
    },
  };
}

async function main() {
  const items = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[CANDELAS] Categories: ${CATEGORY_URLS.length}`);
  console.log(`[CANDELAS] Products discovered: ${items.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const item of items) {
    const cafe = await enrichProduct(item, now);
    if (!cafe) continue;
    cafes.push(cafe);
    console.log(`[CANDELAS] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[CANDELAS] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[CANDELAS] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[CANDELAS] Error:', error?.stack || error);
  process.exit(1);
});
