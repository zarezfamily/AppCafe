/*
  Importa cafés en grano desde la categoría actual de Alcampo.

  Fuente:
    https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/caf%C3%A9s/OC100806

  Nota:
    Se apoya en el estado inicial embebido en la categoría, donde Alcampo ya expone
    marca, nombre, precio, foto, disponibilidad y tamaño.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const CATEGORY_URL =
  process.env.CATEGORY_URL ||
  'https://www.compraonline.alcampo.es/categories/desayuno-y-merienda/caf%C3%A9s/OC100806';
const BASE_SITE = 'https://www.compraonline.alcampo.es';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-alcampo-real.json');
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

function decodeEscapedSlashes(value) {
  return String(value || '')
    .replace(/\\u002F/g, '/')
    .replace(/\\\//g, '/');
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

function inferRoast(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('torrefacto')) return 'intenso';
  if (haystack.includes('mezcla')) return 'medio';
  if (haystack.includes('descafeinado')) return 'medio';
  return 'medio';
}

function inferOrigin(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const hits = [];
  const mappings = [
    ['colombia', 'Colombia'],
    ['brasil', 'Brasil'],
    ['honduras', 'Honduras'],
    ['guatemala', 'Guatemala'],
    ['nicaragua', 'Nicaragua'],
    ['india', 'India'],
  ];
  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) hits.push(value);
  }
  return hits.join(', ');
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    ['crema', 'cremoso'],
    ['intenso', 'intenso'],
    ['suave', 'suave'],
    ['aroma', 'aromatico'],
    ['natural', 'natural'],
  ];
  return [
    ...new Set(dictionary.filter(([needle]) => haystack.includes(needle)).map(([, note]) => note)),
  ];
}

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractInitialState(html) {
  const match = String(html || '').match(/window\.__INITIAL_STATE__=(\{[\s\S]*?\});<\/script>/i);
  return match?.[1] || '';
}

function extractProductFragments(stateText) {
  const source = String(stateText || '');
  const items = [];
  let start = 0;

  while (true) {
    const idx = source.indexOf('{"productId":"', start);
    if (idx === -1) break;

    let inString = false;
    let escaped = false;
    let depth = 0;
    let end = -1;

    for (let i = idx; i < source.length; i += 1) {
      const ch = source[i];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === '{') depth += 1;
      if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }

    if (end === -1) break;

    const raw = source.slice(idx, end);
    start = end;

    const parsed = safeJsonParse(raw);
    if (
      parsed?.retailerProductId &&
      parsed?.name &&
      parsed?.price?.current?.amount &&
      parsed?.image?.src
    ) {
      items.push(parsed);
    }
  }

  return uniqueBy(items, (item) => item.retailerProductId);
}

function isBeanCoffee(item) {
  const haystack = normalizeForSlug(
    `${item?.name || ''} ${item?.image?.description || ''} ${item?.size?.value || ''}`
  ).toLowerCase();

  return haystack.includes('cafe en grano');
}

function toProductUrl(item) {
  const description = item?.image?.description || item?.name || '';
  const slug = slugify(description);
  return `${BASE_SITE}/products/${slug}/${item.retailerProductId}`;
}

function mapItemToCafe(item, now) {
  const name = normalizeText(item?.name || '');
  const description = normalizeText(item?.image?.description || name);
  const amount = parseAmount(`${item?.size?.value || ''} ${name} ${description}`);
  const detailText = `${name} ${description} ${item?.size?.value || ''}`;
  const origin = inferOrigin(detailText);
  const notes = inferNotes(detailText);
  const decaf = /descafeinad/i.test(normalizeForSlug(detailText));
  const isBio = /\becologic|bio\b/i.test(normalizeForSlug(detailText));
  const image = decodeEscapedSlashes(item?.image?.src || '');
  const price = Number.parseFloat(item?.price?.current?.amount || '');
  const fullUrl = toProductUrl(item);

  return {
    id: `alcampo_${String(item?.retailerProductId || '').trim()}`,
    fuente: 'alcampo',
    fuentePais: 'ES',
    fuenteUrl: fullUrl,
    urlProducto: fullUrl,

    nombre: name,
    name,
    marca: normalizeText(item?.brand || 'Alcampo'),
    roaster: normalizeText(item?.brand || 'Alcampo'),

    ean: '',
    normalizedEan: '',
    sku: normalizeText(item?.retailerProductId || ''),
    mpn: '',

    descripcion: description,
    description,

    category: 'daily',
    coffeeCategory: 'daily',
    isSpecialty: false,
    legacy: false,

    formato: 'beans',
    format: 'beans',
    sistemaCapsula: '',
    tipoProducto: 'cafe en grano',
    cantidad: amount,
    intensidad: null,
    tueste: inferRoast(detailText),
    roastLevel: inferRoast(detailText),
    pais: origin,
    origen: origin,
    proceso: '',
    notas: notes.join(', '),
    notes: notes.join(', '),
    decaf,

    precio: Number.isFinite(price) ? price : null,
    currency: normalizeText(item?.price?.current?.currency || 'EUR'),
    certificaciones: isBio ? 'organico' : '',
    isBio,
    inStock: Boolean(item?.available),

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
      sourceType: 'alcampo',
      categoryUrl: CATEGORY_URL,
      categoryPath: item?.categoryPath || [],
      size: item?.size?.value || '',
      unitPrice: item?.price?.unit?.current?.amount || null,
    },
  };
}

async function main() {
  const html = await fetchText(CATEGORY_URL);
  const stateText = extractInitialState(html);
  if (!stateText) throw new Error('No se encontró window.__INITIAL_STATE__ en Alcampo.');

  const products = extractProductFragments(stateText).filter(isBeanCoffee);

  const selected = Number.isFinite(LIMIT) ? products.slice(0, LIMIT) : products;
  const now = new Date().toISOString();

  console.log(`[ALCAMPO] Category: ${CATEGORY_URL}`);
  console.log(`[ALCAMPO] Product fragments: ${products.length} dry=${DRY_RUN}`);

  const cafes = selected.map((item) => mapItemToCafe(item, now));
  for (const cafe of cafes) {
    console.log(`[ALCAMPO] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[ALCAMPO] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[ALCAMPO] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[ALCAMPO] Error:', error?.stack || error);
  process.exit(1);
});
