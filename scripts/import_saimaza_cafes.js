/*
  Importa catalogo actual de Saimaza a Firestore.

  Fuente:
    https://www.saimaza.es/productos/

  Nota:
    Saimaza muestra fichas de catalogo sin compra directa, asi que `precio` queda a null.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const INDEX_URL = 'https://www.saimaza.es/productos/';
const BASE_SITE = 'https://www.saimaza.es';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-saimaza-real.json');
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

function discoverLinks(html) {
  return uniqueBy(
    [...String(html || '').matchAll(/href="([^"]*\/productos\/[^"]+)"/g)]
      .map((match) => toAbsoluteUrl(match[1]))
      .filter((url) => url.startsWith(`${BASE_SITE}/productos/`))
      .filter((url) => url !== INDEX_URL)
      .filter((url) => /\/productos\/[^/]+\/[^/]+\/?$/.test(url)),
    (url) => url
  );
}

function inferFormat(url, name) {
  const haystack = normalizeForSlug(`${url} ${name}`).toLowerCase();
  if (haystack.includes('/capsulas/') || haystack.includes('capsula')) return 'capsules';
  if (haystack.includes('/grano/') || haystack.includes('catering mezcla')) return 'beans';
  return 'ground';
}

function inferAmount(text, format) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (format === 'capsules') {
    const m = haystack.match(/(\d+)\s*(caps|capsulas)\b/);
    if (m) return Number.parseInt(m[1], 10);
  }
  const kiloMatch = haystack.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kiloMatch) return Math.round(Number.parseFloat(kiloMatch[1].replace(',', '.')) * 1000);
  const gramMatch = haystack.match(/(\d+)\s*g\b/);
  if (gramMatch) return Number.parseInt(gramMatch[1], 10);
  if (format === 'ground') return 250;
  if (format === 'beans') return 1000;
  return null;
}

function inferCategory(url, name, description) {
  const haystack = normalizeForSlug(`${url} ${name} ${description}`).toLowerCase();
  if (haystack.includes('gran seleccion')) return 'specialty';
  return 'daily';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    ['aroma', 'aromatico'],
    ['envolvente', 'envolvente'],
    ['suave', 'suave'],
    ['intenso', 'intenso'],
    ['puro', 'puro'],
    ['cremos', 'cremoso'],
  ];
  return [
    ...new Set(dictionary.filter(([needle]) => haystack.includes(needle)).map(([, note]) => note)),
  ];
}

function bestImageFromHtml(html) {
  const imgs = [
    ...new Set(
      [...String(html || '').matchAll(/(?:src|data-src|srcset)="([^"]+)"/g)]
        .map((match) => match[1].split(',')[0].trim().split(' ')[0])
        .filter((url) => /siteassets\/products\//i.test(url))
        .map(toAbsoluteUrl)
    ),
  ];
  return (
    imgs[0] ||
    toAbsoluteUrl(extractFirstMatch(html, /<meta property="og:image" content="([^"]+)"/i))
  );
}

async function main() {
  const indexHtml = await fetchText(INDEX_URL);
  const productUrls = discoverLinks(indexHtml);
  const now = new Date().toISOString();

  console.log(`[SAIMAZA] Index: ${INDEX_URL}`);
  console.log(`[SAIMAZA] Products discovered: ${productUrls.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const url of productUrls) {
    const html = await fetchText(url);
    const title = extractFirstMatch(html, /<title>([^<]+)<\/title>/i);
    const h1 = extractFirstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const name = normalizeText(h1 || title.replace(/\s*\|\s*Saimaza ES$/i, ''));
    const description = extractFirstMatch(html, /<meta name="description" content="([^"]+)"/i);
    const format = inferFormat(url, name);
    const detailText = `${name} ${description}`;
    const image = bestImageFromHtml(html);
    const category = inferCategory(url, name, description);
    const notes = inferNotes(detailText);

    const cafe = {
      id: `saimaza_${slugify(url)}`,
      fuente: 'saimaza',
      fuentePais: 'ES',
      fuenteUrl: url,
      urlProducto: url,

      nombre: name,
      name,
      marca: 'Saimaza',
      roaster: 'Saimaza',

      ean: '',
      normalizedEan: '',
      sku: slugify(name),
      mpn: '',

      descripcion: description || stripTags(html),
      description: description || stripTags(html),

      category,
      coffeeCategory: category === 'specialty' ? 'specialty' : 'daily',
      isSpecialty: category === 'specialty',
      legacy: false,

      formato: format,
      format,
      sistemaCapsula: format === 'capsules' ? 'nespresso' : '',
      tipoProducto:
        format === 'capsules'
          ? 'capsulas de cafe'
          : format === 'ground'
            ? 'cafe molido'
            : 'cafe en grano',
      cantidad: inferAmount(detailText, format),
      intensidad: null,
      tueste: 'medium',
      roastLevel: 'medium',
      pais: '',
      origen: '',
      proceso: '',
      notas: notes.join(', '),
      notes: notes.join(', '),
      decaf: /descafeinad/i.test(normalizeForSlug(detailText)),

      precio: null,
      currency: 'EUR',
      certificaciones: '',
      isBio: false,
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
        sourceType: 'saimaza',
        sourceTitle: title,
      },
    };

    cafes.push(cafe);
    console.log(`[SAIMAZA] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[SAIMAZA] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[SAIMAZA] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[SAIMAZA] Error:', error?.stack || error);
  process.exit(1);
});
