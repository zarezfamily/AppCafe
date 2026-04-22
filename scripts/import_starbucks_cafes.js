/*
  Importa cafés actuales de Starbucks At Home España a Firestore.

  Fuente:
    https://www.starbucksathome.com/es/productos

  Estrategia:
    - Lee el JSON-LD de la página de colección para descubrir los productos vigentes.
    - Visita cada ficha de producto y extrae metadatos públicos del HTML.
    - Genera un JSON local y hace upsert en `cafes` con firebase-admin.

  Uso:
    DRY_RUN=true node scripts/import_starbucks_cafes.js
    node scripts/import_starbucks_cafes.js

  Opcionales:
    OUTPUT_JSON=scripts/cafe-import-starbucks-real.json
    LIMIT=5
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const COLLECTION_URL = 'https://www.starbucksathome.com/es/productos';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-starbucks-real.json');
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const LIMIT = Number.parseInt(process.env.LIMIT || '', 10);
const CAFES_COLLECTION = 'cafes';

const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
const BASE_SITE = 'https://www.starbucksathome.com';

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

function extractJsonLdBlocks(html) {
  return [
    ...String(html || '').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi),
  ]
    .map((match) => match[1]?.trim())
    .filter(Boolean);
}

function parseJsonLdCollection(html) {
  const blocks = extractJsonLdBlocks(html);

  for (const raw of blocks) {
    try {
      const json = JSON.parse(raw);
      const itemList = json?.mainEntity?.itemListElement;
      if (Array.isArray(itemList) && itemList.length) {
        return itemList.map((item) => ({
          name: normalizeText(item?.name || ''),
          url: normalizeText(item?.url || ''),
          image: normalizeText(item?.image || ''),
          brand: normalizeText(item?.brand?.name || 'Starbucks'),
        }));
      }
    } catch {
      // ignore malformed blocks
    }
  }

  return [];
}

function extractProductGraph(html) {
  const blocks = extractJsonLdBlocks(html);

  for (const raw of blocks) {
    try {
      const json = JSON.parse(raw);
      const graph = Array.isArray(json?.['@graph']) ? json['@graph'] : [];
      const product = graph.find((item) => item?.['@type'] === 'Product');
      if (product) return product;
    } catch {
      // ignore malformed blocks
    }
  }

  return null;
}

function inferSystem(url, text) {
  const lowerUrl = String(url || '').toLowerCase();
  const haystack = String(text || '').toLowerCase();
  if (lowerUrl.includes('nespresso')) return 'nespresso';
  if (haystack.includes('by nespresso')) return 'nespresso';
  if (haystack.includes('dolce gusto')) return 'dolce-gusto';
  return '';
}

function inferFormat(url, text) {
  const lowerUrl = String(url || '').toLowerCase();
  const haystack = normalizeForSlug(text).toLowerCase();
  if (lowerUrl.includes('nespresso')) return 'capsules';
  if (haystack.includes('dolce gusto')) return 'capsules';
  if (haystack.includes('cafe en grano') || haystack.includes('café en grano')) return 'beans';
  if (haystack.includes('cafe molido') || haystack.includes('café molido')) return 'ground';
  return '';
}

function inferRoast(text, intensity) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('tueste intenso') || haystack.includes('dark')) return 'intenso';
  if (haystack.includes('tueste medio') || haystack.includes('medium')) return 'medio';
  if (haystack.includes('tueste suave') || haystack.includes('blonde')) return 'suave';
  if (Number.isFinite(intensity)) {
    if (intensity >= 10) return 'intenso';
    if (intensity >= 7) return 'medio';
    if (intensity >= 4) return 'suave';
  }
  return '';
}

function inferOrigin(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (
    (haystack.includes('latinoamerica') || haystack.includes('america latina')) &&
    !haystack.includes('asia/pacifico') &&
    !haystack.includes('asia pacifico')
  ) {
    return 'Latinoamérica';
  }
  if (haystack.includes('asia/pacifico') || haystack.includes('asia pacifico')) return 'Mezcla';
  if (haystack.includes('madagascar')) return 'Madagascar';
  if (haystack.includes('italiano') || haystack.includes('italian style')) return 'Italia';
  return 'Mezcla';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    'vainilla',
    'galleta',
    'caramelo',
    'chocolate',
    'frutos secos',
    'nueces tostadas',
    'azucar caramelizado',
    'frutos rojos',
    'dulce',
    'suave',
    'envolvente',
    'tostado',
  ];

  const notes = dictionary.filter((note) => haystack.includes(note));
  const cleaned = notes.map((note) =>
    note === 'azucar caramelizado' ? 'azucar caramelizado' : note
  );
  return [...new Set(cleaned)];
}

function extractIntensity(text) {
  const match = String(text || '').match(/\bINTENSIDAD\s*:?\s*(\d{1,2})\b/i);
  return match ? Number.parseInt(match[1], 10) : null;
}

function extractPackCount(text) {
  const haystack = String(text || '');
  const capsules = haystack.match(/\b(\d+)\s+c[áa]psulas\b/i);
  if (capsules) return Number.parseInt(capsules[1], 10);

  const cups = haystack.match(/\b(\d+)\s+tazas\b/i);
  if (cups) return Number.parseInt(cups[1], 10);
  return null;
}

function extractCupSize(text) {
  const sizes = [
    ...String(text || '').matchAll(/\b(Espresso|Lungo|Ristretto)\s+(\d+)\s*ml\b/gi),
  ].map((match) => `${normalizeText(match[1])} ${match[2]}ml`);
  return sizes[0] || '';
}

function extractEan(...values) {
  for (const value of values) {
    const match = String(value || '').match(/(\d{13})/);
    if (match?.[1]) return match[1];
  }
  return '';
}

function buildCafeDocId(ean, name, url, format) {
  if (ean) return `starbucks_${ean}`;
  return `starbucks_${slugify(`${name}-${format || ''}-${url}`)}`;
}

function buildLegacyCompatDocId(name, url) {
  return `starbucks_${slugify(`${name}-capsules-${url}`)}`;
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

async function discoverProducts() {
  const html = await fetchText(COLLECTION_URL);
  const items = parseJsonLdCollection(html).filter((item) => item.name && item.url);

  if (!items.length) {
    throw new Error('No se encontraron productos en el JSON-LD de Starbucks.');
  }

  return Number.isFinite(LIMIT) ? items.slice(0, LIMIT) : items;
}

async function enrichProduct(item, now) {
  const html = await fetchText(item.url);
  const text = stripTags(html);
  const productGraph = extractProductGraph(html);
  const metaDescription = normalizeText(
    getMeta(html, 'description') || getMeta(html, 'og:description')
  );

  const name = normalizeText(productGraph?.name || item.name);
  const description = normalizeText(metaDescription || productGraph?.description || '');
  const image = toAbsoluteUrl(
    productGraph?.image?.url ||
      item.image ||
      getMeta(html, 'og:image') ||
      getMeta(html, 'twitter:image')
  );

  const ean = extractEan(image, item.image, html, description);
  const sourceText = `${name} ${description} ${productGraph?.description || ''}`;
  let format = inferFormat(item.url, sourceText);
  const intensity = extractIntensity(text);
  const packCount = extractPackCount(text);
  let system = inferSystem(item.url, sourceText);
  if (!format && Number.isFinite(packCount)) format = 'capsules';
  if (!format && /c[áa]psulas|capsule/i.test(text)) format = 'capsules';
  if (!format && /cafe en grano|whole bean/i.test(normalizeForSlug(sourceText).toLowerCase())) {
    format = 'beans';
  }
  if (!system && format === 'capsules') {
    system = /madagascar|dolce gusto/i.test(sourceText) ? 'dolce-gusto' : 'nespresso';
  }
  if (!format && system) format = 'capsules';

  const roast = inferRoast(sourceText, intensity);
  const origin = inferOrigin(sourceText);
  const notes = inferNotes(sourceText);
  const cupSize = extractCupSize(text);
  const decaf = /decaf|descafeinado/i.test(`${name} ${description} ${item.url}`);

  const cafe = {
    id: buildCafeDocId(ean, name, item.url, format),
    fuente: 'starbucks',
    fuentePais: 'ES',
    fuenteUrl: item.url,
    urlProducto: item.url,

    nombre: name,
    name,
    marca: 'Starbucks',
    roaster: 'Starbucks',

    ean,
    normalizedEan: ean,

    descripcion: description,
    description,

    category: 'supermarket',
    coffeeCategory: 'daily',
    isSpecialty: false,
    legacy: false,

    formato: format,
    format,
    sistemaCapsula: system || '',
    tipoProducto: format === 'capsules' ? 'capsulas' : format === 'beans' ? 'cafe en grano' : '',
    cantidad: packCount,
    intensidad: intensity,
    tueste: roast,
    roastLevel: roast,
    pais: origin,
    origen: origin,
    notas: notes.join(', '),
    notes: notes.join(', '),
    cupSize,
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
  };

  return cafe;
}

async function main() {
  const products = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[STARBUCKS] Collection: ${COLLECTION_URL}`);
  console.log(`[STARBUCKS] Products discovered: ${products.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const product of products) {
    const cafe = await enrichProduct(product, now);
    cafes.push(cafe);
    console.log(`[STARBUCKS] Prepared: ${cafe.nombre}${cafe.ean ? ` (${cafe.ean})` : ''}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[STARBUCKS] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

  ensureAdmin();
  const db = admin.firestore();

  let written = 0;
  for (const cafe of cafes) {
    const { id, ...payload } = cafe;
    if (!id) continue;
    if (!DRY_RUN) {
      await db.collection(CAFES_COLLECTION).doc(id).set(payload, { merge: true });

      const legacyCompatId = buildLegacyCompatDocId(cafe.nombre, cafe.urlProducto);
      if (legacyCompatId && legacyCompatId !== id) {
        const legacyRef = db.collection(CAFES_COLLECTION).doc(legacyCompatId);
        const legacySnap = await legacyRef.get();
        if (legacySnap.exists) {
          await legacyRef.set(
            {
              legacy: true,
              duplicateOf: id,
              reviewStatus: 'approved',
              appVisible: false,
              scannerVisible: false,
              updatedAt: now,
            },
            { merge: true }
          );
        }
      }
    }
    written += 1;
  }

  console.log(`[STARBUCKS] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[STARBUCKS] Error:', error?.stack || error);
  process.exit(1);
});
