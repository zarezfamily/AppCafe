/*
  Importa cafés actuales de Marcilla España a Firestore.

  Fuente:
    https://www.marcilla.com/productos/

  Estrategia:
    - Descubre enlaces de producto desde la landing de productos.
    - Visita cada ficha y extrae metadatos públicos del HTML.
    - Genera un JSON local y hace upsert en `cafes` con firebase-admin.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const COLLECTION_URL = 'https://www.marcilla.com/productos/';
const BASE_SITE = 'https://www.marcilla.com';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-marcilla-real.json');
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const LIMIT = Number.parseInt(process.env.LIMIT || '', 10);
const CAFES_COLLECTION = 'cafes';
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');

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

function toAbsoluteUrl(url) {
  const raw = normalizeText(url);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${BASE_SITE}${raw}`;
  return raw;
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

function getMeta(html, property, attr = 'content') {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+${attr}=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+${attr}=["']([^"']+)["'][^>]+property=["']${escaped}["']`, 'i'),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+${attr}=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+${attr}=["']([^"']+)["'][^>]+name=["']${escaped}["']`, 'i'),
  ];

  for (const pattern of patterns) {
    const match = String(html || '').match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1]);
  }
  return '';
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
    headers: {
      'User-Agent': 'etiove-import/1.0 (+local script)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP_${response.status} ${text.slice(0, 200)}`);
  return text;
}

function ensureAdmin() {
  if (admin.apps.length) return;
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function discoverProductLinks(html) {
  const hrefs = [...String(html || '').matchAll(/href="([^"]+)"/gi)].map((match) => match[1]);

  return uniqueBy(
    hrefs
      .map((href) => toAbsoluteUrl(href))
      .filter(Boolean)
      .filter((url) => /^https:\/\/www\.marcilla\.com\/productos\/[^/]+\/?$/i.test(url))
      .filter((url) => !/\/productos\/?$/i.test(url)),
    (url) => url.replace(/\/+$/, '/')
  );
}

function inferFormat(url, text) {
  const haystack = normalizeForSlug(`${url} ${text}`).toLowerCase();
  if (haystack.includes('/creme-express-mezcla-molido')) return 'ground';
  if (haystack.includes('/creme-express-mezcla-descafeinado')) return 'ground';
  if (haystack.includes('/creme-express-natural-molido')) return 'ground';
  if (haystack.includes('/marcilla-colombia-natural-molido')) return 'ground';
  if (haystack.includes('/gran-aroma-extra')) return 'ground';
  if (haystack.includes('/cafe-marcilla-aroma-mezcla')) return 'ground';
  if (haystack.includes('/gran-aroma-descafeinado')) return 'ground';
  if (haystack.includes('/gran-aroma-natural-molido')) return 'ground';
  if (haystack.includes('/creme-express-refill-soluble')) return 'instant';
  if (haystack.includes('/tassimo-')) return 'capsules';
  if (haystack.includes('/capsulas-')) return 'capsules';
  if (haystack.includes('/gran-aroma-monodosis-')) return 'pods';
  if (
    haystack.includes('/gran-aroma-natural-grano') ||
    haystack.includes('/gran-aroma-mezcla-grano') ||
    haystack.includes('/puro-arabica-sudamerica')
  ) {
    return 'beans';
  }
  if (haystack.includes('/molido') || haystack.includes(' molido')) return 'ground';
  if (haystack.includes('/soluble') || haystack.includes(' soluble')) return 'instant';
  if (haystack.includes(' grano')) return 'beans';
  if (haystack.includes(' monodosis')) return 'pods';
  return '';
}

function inferCapsuleSystem(url, text) {
  const haystack = normalizeForSlug(`${url} ${text}`).toLowerCase();
  if (haystack.includes('tassimo')) return 'tassimo';
  if (haystack.includes('monodosis') || haystack.includes('senseo')) return 'senseo';
  if (haystack.includes('/capsulas-')) return 'marcilla';
  return '';
}

function inferRoast(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('extra fuerte') || haystack.includes('extra intenso')) return 'intenso';
  if (haystack.includes('intenso') || haystack.includes('espresso')) return 'intenso';
  if (haystack.includes('mezcla')) return 'medio';
  if (haystack.includes('natural')) return 'medio';
  return '';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    'afrutado',
    'afrutadas',
    'dulzura',
    'dulce',
    'intenso',
    'suave',
    'aromatico',
    'cremoso',
    'denso',
    'profundo',
  ];
  const notes = dictionary.filter((note) => haystack.includes(note));
  return [...new Set(notes.map((note) => (note === 'afrutadas' ? 'afrutado' : note)))];
}

function inferOrigin(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('colombia')) return 'Colombia';
  if (haystack.includes('sudamerica')) return 'Sudamérica';
  if (haystack.includes('arabica')) return 'Arabica';
  return 'Mezcla';
}

function extractFormatLabel(text) {
  const match = String(text || '').match(
    /Formato\s*\|\s*([^|]+?)(?:CON CAFE|DESCAFEINADO|Cafeteras recomendadas)/i
  );
  return normalizeText(decodeHtmlEntities(match?.[1] || ''));
}

function extractWeightOrUnits(formatLabel, format) {
  const t = normalizeForSlug(formatLabel).toLowerCase();
  if (!t) return null;

  if (format === 'capsules' || format === 'pods') {
    const values = [...t.matchAll(/(\d+)\s*(?:capsulas|unidads|unidades|ud)/g)].map((m) =>
      Number.parseInt(m[1], 10)
    );
    if (values.length) return Math.max(...values);
  }

  const gramValues = [...t.matchAll(/(\d+)\s*gramos/g)].map((m) => Number.parseInt(m[1], 10));
  if (gramValues.length) return Math.max(...gramValues);

  return null;
}

function buildCafeDocId(url) {
  return `marcilla_${slugify(url.replace(/^https?:\/\//i, ''))}`;
}

async function discoverProducts() {
  const html = await fetchText(COLLECTION_URL);
  const urls = discoverProductLinks(html);
  if (!urls.length) throw new Error('No se encontraron fichas de producto en Marcilla.');
  return Number.isFinite(LIMIT) ? urls.slice(0, LIMIT) : urls;
}

async function enrichProduct(url, now) {
  const html = await fetchText(url);
  const text = stripTags(html);

  let name = normalizeText(getMeta(html, 'og:title') || getMeta(html, 'title'));
  const description = normalizeText(
    getMeta(html, 'description') || getMeta(html, 'og:description')
  );
  const image = toAbsoluteUrl(getMeta(html, 'og:image'));
  const focusedText = `${name} ${description}`;
  const format = inferFormat(url, focusedText);
  const formatLabel = extractFormatLabel(text);
  const amount = extractWeightOrUnits(formatLabel, format);
  const decaf = /descafeinado/i.test(`${url} ${name} ${description}`);
  const roast = inferRoast(`${url} ${name} ${description}`);
  const notes = inferNotes(focusedText);
  const origin = inferOrigin(focusedText);
  const system = inferCapsuleSystem(url, focusedText);

  if (/creme-express-refill-soluble/i.test(url)) {
    name = 'Crème Express Natural Paper Refill';
  }

  return {
    id: buildCafeDocId(url),
    fuente: 'marcilla',
    fuentePais: 'ES',
    fuenteUrl: url,
    urlProducto: url,

    nombre: name,
    name,
    marca: 'Marcilla',
    roaster: 'Marcilla',

    ean: '',
    normalizedEan: '',

    descripcion: description,
    description,

    category: 'supermarket',
    coffeeCategory: 'daily',
    isSpecialty: false,
    legacy: false,

    formato: format,
    format,
    sistemaCapsula: system,
    tipoProducto:
      format === 'capsules'
        ? 'capsulas'
        : format === 'beans'
          ? 'cafe en grano'
          : format === 'ground'
            ? 'cafe molido'
            : format === 'instant'
              ? 'soluble'
              : format === 'pods'
                ? 'monodosis'
                : '',
    cantidad: amount,
    intensidad: null,
    tueste: roast,
    roastLevel: roast,
    pais: origin,
    origen: origin,
    notas: notes.join(', '),
    notes: notes.join(', '),
    decaf,

    precio: null,
    certificaciones: '',
    isBio: false,

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
      sourceType: 'marcilla',
      formatLabel,
    },
  };
}

async function main() {
  const urls = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[MARCILLA] Collection: ${COLLECTION_URL}`);
  console.log(`[MARCILLA] Products discovered: ${urls.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const url of urls) {
    const cafe = await enrichProduct(url, now);
    cafes.push(cafe);
    console.log(`[MARCILLA] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[MARCILLA] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[MARCILLA] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[MARCILLA] Error:', error?.stack || error);
  process.exit(1);
});
