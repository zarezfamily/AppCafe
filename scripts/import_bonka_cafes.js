/*
  Importa cafés actuales de Bonka España a Firestore.

  Fuente:
    https://www.bonka.es/cafe

  Estrategia:
    - Descubre enlaces de producto desde la landing de café.
    - Visita cada ficha y extrae metadatos públicos del HTML.
    - Genera un JSON local y hace upsert en `cafes` con firebase-admin.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const COLLECTION_URL = 'https://www.bonka.es/cafe';
const BASE_SITE = 'https://www.bonka.es';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-bonka-real.json');
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
  if (/Access Denied/i.test(text) || /temporarily unavailable/i.test(text)) {
    throw new Error(`Blocked response for ${url}`);
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

function extractFirstMatch(html, pattern) {
  const match = String(html || '').match(pattern);
  return normalizeText(decodeHtmlEntities(match?.[1] || ''));
}

function discoverProductLinks(html) {
  return uniqueBy(
    [...String(html || '').matchAll(/href=["'](cafe\/[^"'#?]+)["']/gi)]
      .map((match) => toAbsoluteUrl(match[1]))
      .filter((url) => /^https:\/\/www\.bonka\.es\/cafe\/[^/]+$/i.test(url)),
    (url) => url
  );
}

function extractProductImage(html) {
  const matches = [...String(html || '').matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)].map(
    (match) => toAbsoluteUrl(match[1])
  );

  const preferred =
    matches.find((url) => /\/_productos\/[^"'?#]+_frontal\.(png|jpg|jpeg)(\?|$)/i.test(url)) ||
    matches.find((url) =>
      /\/_productos\/[^"'?#]+_frontal_[^"'?#]+\.(png|jpg|jpeg)(\?|$)/i.test(url)
    ) ||
    matches.find((url) => /\/_productos\//i.test(url));

  return preferred || '';
}

function inferFormat(url, text) {
  const haystack = normalizeForSlug(`${url} ${text}`).toLowerCase();
  if (haystack.includes('grano')) return 'beans';
  if (haystack.includes('molido')) return 'ground';
  return '';
}

function inferRoast(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('extra fuerte') || haystack.includes('extrafuerte')) return 'intenso';
  if (haystack.includes('intenso') || haystack.includes('espresso')) return 'intenso';
  if (haystack.includes('medio')) return 'medio';
  if (haystack.includes('suave')) return 'suave';
  return '';
}

function inferOrigin(url, text) {
  const haystack = normalizeForSlug(`${url} ${text}`).toLowerCase();
  if (haystack.includes('colombia')) return 'Colombia';
  if (haystack.includes('brasil')) return 'Brasil';
  if (haystack.includes('arabica')) return 'Arabica';
  return 'Mezcla';
}

function inferIntensity(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('extrafuerte') || haystack.includes('extra fuerte')) return 10;
  if (haystack.includes('espresso')) return 8;
  if (haystack.includes('intenso')) return 8;
  if (haystack.includes('equilibrado')) return 6;
  return null;
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    'afrutado',
    'afrutadas',
    'citricas',
    'florales',
    'cacao',
    'dulce',
    'dulzura',
    'intenso',
    'equilibrado',
    'cuerpo',
    'jugoso',
    'aroma',
  ];

  return [
    ...new Set(
      dictionary
        .filter((note) => haystack.includes(note))
        .map((note) => {
          if (note === 'afrutadas') return 'afrutado';
          if (note === 'citricas') return 'citrico';
          if (note === 'florales') return 'floral';
          return note;
        })
    ),
  ];
}

function extractWeight(name, subtitle, description) {
  const combined = normalizeForSlug(`${name} ${subtitle} ${description}`).toLowerCase();
  const grams = [...combined.matchAll(/(\d+)\s*gr/g)].map((match) => Number.parseInt(match[1], 10));
  if (grams.length) return Math.max(...grams);
  return null;
}

function extractCategoryLabel(html) {
  const block = extractFirstMatch(
    html,
    /<div[^>]+class=["'][^"']*banner-content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  );
  return extractFirstMatch(block, /<span[^>]*>([\s\S]*?)<\/span>/i);
}

function extractFormatLabel(html) {
  const block = extractFirstMatch(
    html,
    /<div[^>]+class=["'][^"']*classic-coffee[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
  );
  return extractFirstMatch(block, /<span[^>]*>([\s\S]*?)<\/span>/i);
}

function buildCafeDocId(url) {
  const slug = slugify(url.replace(/^https?:\/\/www\.bonka\.es\/cafe\//i, ''));
  return `bonka_${slug}`;
}

async function discoverProducts() {
  const html = await fetchText(COLLECTION_URL);
  const urls = discoverProductLinks(html);
  if (!urls.length) throw new Error('No se encontraron fichas de producto en Bonka.');
  return Number.isFinite(LIMIT) ? urls.slice(0, LIMIT) : urls;
}

async function enrichProduct(url, now) {
  const html = await fetchText(url);
  const pageText = stripTags(html);

  const name = extractFirstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = normalizeText(
    getMeta(html, 'title') || extractFirstMatch(html, /<title>([^<]+)<\/title>/i)
  );
  const description = normalizeText(
    getMeta(html, 'description') || getMeta(html, 'og:description')
  );
  const canonical = normalizeText(
    extractFirstMatch(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
  );
  const subtitle = extractFormatLabel(html);
  const categoryLabel = extractCategoryLabel(html);
  const tastingNote = extractFirstMatch(html, /Nota de cata[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/i);
  const image = extractProductImage(html);
  const format = inferFormat(url, `${name} ${subtitle} ${title}`);
  const amount = extractWeight(name, subtitle, description);
  const decaf = /descafeinado/i.test(`${url} ${name} ${description} ${title}`);
  const isBio = /ecologico/i.test(normalizeForSlug(`${url} ${name} ${description}`));
  const roast = inferRoast(`${name} ${description} ${tastingNote}`);
  const origin = inferOrigin(url, `${name} ${description} ${tastingNote}`);
  const notes = inferNotes(`${description} ${tastingNote}`);
  const intensidad = inferIntensity(`${name} ${description} ${tastingNote}`);

  return {
    id: buildCafeDocId(url),
    fuente: 'bonka',
    fuentePais: 'ES',
    fuenteUrl: canonical || url,
    urlProducto: canonical || url,

    nombre: name,
    name,
    marca: 'Bonka',
    roaster: 'Bonka',

    ean: '',
    normalizedEan: '',

    descripcion: description,
    description,
    notaDeCata: tastingNote,

    category: 'supermarket',
    coffeeCategory: isBio || /premium/i.test(url) ? 'premium' : 'daily',
    isSpecialty: false,
    legacy: false,

    formato: format,
    format,
    sistemaCapsula: '',
    tipoProducto: format === 'beans' ? 'cafe en grano' : format === 'ground' ? 'cafe molido' : '',
    cantidad: amount,
    intensidad,
    tueste: roast,
    roastLevel: roast,
    pais: origin,
    origen: origin,
    notas: notes.join(', '),
    notes: notes.join(', '),
    decaf,

    precio: null,
    certificaciones: isBio ? 'ecologico' : '',
    isBio,

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
      sourceType: 'bonka',
      title,
      categoryLabel,
      subtitle,
      tastingNote,
      pageTextPreview: pageText.slice(0, 280),
    },
  };
}

async function main() {
  const urls = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[BONKA] Collection: ${COLLECTION_URL}`);
  console.log(`[BONKA] Products discovered: ${urls.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const url of urls) {
    const cafe = await enrichProduct(url, now);
    cafes.push(cafe);
    console.log(`[BONKA] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[BONKA] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[BONKA] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[BONKA] Error:', error?.stack || error);
  process.exit(1);
});
