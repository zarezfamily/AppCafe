/*
  Importa catalogo actual de Cafes La Estrella a Firestore.

  Fuente:
    https://www.cafeslaestrella.com/nuestro-cafe.html

  Nota:
    Sitio de catalogo sin compra directa, por lo que `precio` queda a null.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const INDEX_URL = 'https://www.cafeslaestrella.com/nuestro-cafe.html';
const BASE_SITE = 'https://www.cafeslaestrella.com';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON ||
  path.resolve(process.cwd(), 'scripts/cafe-import-laestrella-real.json');
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
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

function toAbsoluteUrl(url) {
  const raw = normalizeText(decodeHtmlEntities(url));
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

function discoverLinks(html) {
  return uniqueBy(
    [...String(html || '').matchAll(/href="([^"]*\/productos\/[^"]+\.html)"/gi)]
      .map((match) => toAbsoluteUrl(match[1]))
      .filter((url) => !url.includes('soluble'))
      .filter((url) => url !== INDEX_URL),
    (url) => url
  );
}

function inferFormat(url, name) {
  const haystack = normalizeForSlug(`${url} ${name}`).toLowerCase();
  if (haystack.includes('grano')) return 'beans';
  return 'ground';
}

function inferAmount(text, format) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const kilo = haystack.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kilo) return Math.round(Number.parseFloat(kilo[1].replace(',', '.')) * 1000);
  const gram = haystack.match(/(\d+)\s*g\b/);
  if (gram) return Number.parseInt(gram[1], 10);
  return format === 'beans' ? 500 : 250;
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    ['aroma', 'aromatico'],
    ['suave', 'suave'],
    ['mezcla', 'mezcla'],
    ['premium', 'premium'],
  ];
  return [
    ...new Set(dictionary.filter(([needle]) => haystack.includes(needle)).map(([, note]) => note)),
  ];
}

function bestImage(html) {
  const imgs = [
    ...new Set(
      [...String(html || '').matchAll(/(?:src|data-src)="([^"]+)"/g)]
        .map((match) => toAbsoluteUrl(match[1]))
        .filter((url) => /\/sites\/default\/files\/.*\.(png|jpg|jpeg)/i.test(url))
        .filter((url) => !/logotipo|favicon|js_/i.test(url))
    ),
  ];
  return imgs[0] || '';
}

async function main() {
  const indexHtml = await fetchText(INDEX_URL);
  const productUrls = discoverLinks(indexHtml);
  const now = new Date().toISOString();

  console.log(`[LAESTRELLA] Index: ${INDEX_URL}`);
  console.log(`[LAESTRELLA] Products discovered: ${productUrls.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const url of productUrls) {
    const html = await fetchText(url);
    const title = extractFirstMatch(html, /<title>([^<]+)<\/title>/i).replace(
      /\s*\|\s*Cafés La Estrella$/i,
      ''
    );
    const description = extractFirstMatch(html, /<meta name="description" content="([^"]+)"/i);
    const format = inferFormat(url, title);
    const detailText = `${title} ${description}`;
    const cafe = {
      id: `laestrella_${slugify(url)}`,
      fuente: 'laestrella',
      fuentePais: 'ES',
      fuenteUrl: url,
      urlProducto: url,

      nombre: title,
      name: title,
      marca: 'Cafes La Estrella',
      roaster: 'Cafes La Estrella',

      ean: '',
      normalizedEan: '',
      sku: slugify(title),
      mpn: '',

      descripcion: description,
      description,

      category: /premium/i.test(normalizeForSlug(detailText)) ? 'specialty' : 'daily',
      coffeeCategory: /premium/i.test(normalizeForSlug(detailText)) ? 'specialty' : 'daily',
      isSpecialty: /premium/i.test(normalizeForSlug(detailText)),
      legacy: false,

      formato: format,
      format,
      sistemaCapsula: '',
      tipoProducto: format === 'beans' ? 'cafe en grano' : 'cafe molido',
      cantidad: inferAmount(detailText, format),
      intensidad: null,
      tueste: 'medium',
      roastLevel: 'medium',
      pais: '',
      origen: '',
      proceso: '',
      notas: inferNotes(detailText).join(', '),
      notes: inferNotes(detailText).join(', '),
      decaf: /descafeinad/i.test(normalizeForSlug(detailText)),

      precio: null,
      currency: 'EUR',
      certificaciones: '',
      isBio: false,
      inStock: true,

      fecha: now,
      puntuacion: 0,
      votos: 0,

      officialPhoto: bestImage(html),
      bestPhoto: bestImage(html),
      imageUrl: bestImage(html),
      foto: bestImage(html),

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
        sourceType: 'laestrella',
        sourceTitle: title,
      },
    };

    cafes.push(cafe);
    console.log(`[LAESTRELLA] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[LAESTRELLA] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[LAESTRELLA] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[LAESTRELLA] Error:', error?.stack || error);
  process.exit(1);
});
