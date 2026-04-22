/*
  Importa cafés en grano desde la búsqueda actual de El Corte Inglés Supermercado.

  Fuente:
    https://www.elcorteingles.es/supermercado/2/buscar/?question=caf%C3%A9+en+grano&catalog=supermercado&stype=text_box

  Nota:
    Las fichas individuales están protegidas con challenge anti-bot, así que este importador
    se apoya en los datos estructurados que ya vienen embebidos en la página de búsqueda.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const SEARCH_URL =
  process.env.SEARCH_URL ||
  'https://www.elcorteingles.es/supermercado/2/buscar/?question=caf%C3%A9+en+grano&catalog=supermercado&stype=text_box';
const BASE_SITE = 'https://www.elcorteingles.es';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-eci-real.json');
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

function toAbsoluteUrl(url) {
  const raw = normalizeText(url);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${BASE_SITE}${raw}`;
  return raw;
}

function cleanPrice(value) {
  const normalized = normalizeText(value).replace(/\./g, '').replace(',', '.');
  const number = Number.parseFloat(normalized);
  return Number.isFinite(number) ? Number(number.toFixed(2)) : null;
}

function parseQuantityToGrams(quantityText) {
  const text = normalizeForSlug(quantityText).toLowerCase();
  const kg = text.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kg) return Math.round(Number.parseFloat(kg[1].replace(',', '.')) * 1000);
  const grams = text.match(/(\d+)\s*g\b/);
  if (grams) return Number.parseInt(grams[1], 10);
  return null;
}

function inferRoast(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('intensidad 11') || haystack.includes('intensidad 10')) return 'intenso';
  if (haystack.includes('intensidad 9') || haystack.includes('intensidad 8')) return 'medio';
  if (haystack.includes('intensidad 7') || haystack.includes('intensidad 6')) return 'medio';
  if (haystack.includes('descafeinado')) return 'medio';
  return '';
}

function inferOrigin(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('colombia')) return 'Colombia';
  if (haystack.includes('brasil')) return 'Brasil';
  if (haystack.includes('honduras')) return 'Honduras';
  if (haystack.includes('kenya')) return 'Kenya';
  if (haystack.includes('etiopia')) return 'Etiopía';
  return 'Mezcla';
}

function inferSpecies(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('100 arabica') || haystack.includes('100% arabica')) return 'arabica';
  if (haystack.includes('arabica')) return 'arabica';
  if (haystack.includes('mezcla')) return 'blend';
  return '';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    'intenso',
    'cremoso',
    'aromatica',
    'aromatico',
    'chocolate',
    'frutos secos',
    'caramelo',
    'suave',
  ];
  return [...new Set(dictionary.filter((note) => haystack.includes(note)))];
}

function extractIntensity(text) {
  const match = normalizeForSlug(text)
    .toLowerCase()
    .match(/intensidad\s*(\d{1,2})/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function isCoffeeBeanItem(item) {
  const description = normalizeForSlug(item?.description || '').toLowerCase();
  const additional = normalizeForSlug(item?.additional_product_descriptions || '').toLowerCase();
  const categories = Array.isArray(item?.categories)
    ? item.categories.map((category) => normalizeForSlug(category?.name || '').toLowerCase())
    : [];

  return (
    description.includes('cafe en grano') ||
    additional.includes('cafe en grano') ||
    categories.includes('cafe en grano')
  );
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

function extractSearchItems(html) {
  const source = String(html || '');
  const items = [];
  let start = 0;

  while (true) {
    const idx = source.indexOf('{"id":"B', start);
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

    try {
      const parsed = JSON.parse(raw);
      if (parsed?.type === 'item' && String(parsed?.observer_id || '').startsWith('item-')) {
        items.push(parsed);
      }
    } catch {
      // ignore malformed fragments
    }
  }

  return uniqueBy(items, (item) => item?.id || item?.url);
}

function ensureAdmin() {
  if (admin.apps.length) return;
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function mapItemToCafe(item, now) {
  const description = normalizeText(item?.description || '');
  const brandName = normalizeText(item?.brand?.name || '');
  const additionalDescription = normalizeText(item?.additional_product_descriptions || '');
  const quantityText = normalizeText(item?.presentation_detail_quantity || '');
  const detailText = [description, additionalDescription, quantityText].filter(Boolean).join(' ');
  const intensity = extractIntensity(detailText);
  const roast = inferRoast(detailText);
  const origin = inferOrigin(detailText);
  const species = inferSpecies(detailText);
  const notes = inferNotes(detailText);
  const nombre =
    normalizeText(
      additionalDescription
        .replace(/\s{2,}/g, ' ')
        .replace(new RegExp(`\\b${brandName}\\b`, 'i'), '')
    ) || description;

  const fullUrl = toAbsoluteUrl(item?.url || '');

  return {
    id: `eci_${String(item?.id || '').trim()}`,
    fuente: 'eci_supermercado',
    fuentePais: 'ES',
    fuenteUrl: fullUrl,
    urlProducto: fullUrl,

    nombre,
    name: nombre,
    marca: brandName || 'El Corte Inglés',
    roaster: brandName || 'El Corte Inglés',

    ean: '',
    normalizedEan: '',

    descripcion: description,
    description: description,

    category: 'supermarket',
    coffeeCategory: 'daily',
    isSpecialty: false,
    legacy: false,

    formato: 'beans',
    format: 'beans',
    tipoProducto: 'cafe en grano',
    cantidad: parseQuantityToGrams(quantityText),
    intensidad: intensity,
    tueste: roast,
    roastLevel: roast,
    pais: origin,
    origen: origin,
    species,
    notas: notes.join(', '),
    notes: notes.join(', '),
    decaf: /descafeinado/i.test(detailText),

    precio: cleanPrice(item?.priceSpecification?.salePrice || item?.priceSpecification?.price),
    precioPorUnidad: cleanPrice(item?.priceSpecification?.measurementUnitPrice),
    precioUnidadDescripcion: normalizeText(
      item?.priceSpecification?.pum_description || item?.pum || ''
    ),
    certificaciones: '',
    isBio: false,

    fecha: now,
    puntuacion: 0,
    votos: 0,

    officialPhoto: toAbsoluteUrl(item?.image || ''),
    bestPhoto: toAbsoluteUrl(item?.image || ''),
    imageUrl: toAbsoluteUrl(item?.image || ''),
    foto: toAbsoluteUrl(item?.image || ''),

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
      sourceType: 'eci_supermercado_search',
      sourceSearchUrl: SEARCH_URL,
      sourceProductId: String(item?.id || ''),
      sourceQuantityLabel: quantityText,
    },
  };
}

async function main() {
  const html = await fetchText(SEARCH_URL);
  console.log(`[ECI] HTML length: ${html.length}`);
  console.log(`[ECI] First item token index: ${html.indexOf('{"id":"B')}`);
  const extractedItems = extractSearchItems(html);
  const rawItems = extractedItems.filter(isCoffeeBeanItem);
  const items = Number.isFinite(LIMIT) ? rawItems.slice(0, LIMIT) : rawItems;
  const now = new Date().toISOString();

  console.log(`[ECI] Search: ${SEARCH_URL}`);
  console.log(`[ECI] Raw items extracted: ${extractedItems.length}`);
  console.log(`[ECI] Coffee bean items discovered: ${items.length} dry=${DRY_RUN}`);

  const cafes = items.map((item) => mapItemToCafe(item, now));

  for (const cafe of cafes) {
    console.log(`[ECI] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[ECI] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[ECI] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[ECI] Error:', error?.stack || error);
  process.exit(1);
});
