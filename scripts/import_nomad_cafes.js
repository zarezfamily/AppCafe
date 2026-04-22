/*
  Importa cafés actuales de Nomad Coffee a Firestore.

  Fuente:
    https://nomadcoffee.es/collections/coffee

  Estrategia:
    - Descubre fichas de producto desde la colección.
    - Extrae el ProductGroup del JSON-LD y el objeto `meta.product` de Shopify.
    - Selecciona la variante "Café en Grano" como representación canónica del café.
    - Genera un JSON local y hace upsert en `cafes` con firebase-admin.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const COLLECTION_URL = 'https://nomadcoffee.es/collections/coffee';
const BASE_SITE = 'https://nomadcoffee.es';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-nomad-real.json');
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

function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function findJsonLdGraph(html) {
  const scriptContents = [
    ...String(html || '').matchAll(
      /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    ),
  ].map((match) => match[1]);

  for (const raw of scriptContents) {
    const parsed = safeJsonParse(raw);
    if (parsed?.['@graph']) return parsed['@graph'];
  }

  return [];
}

function findProductGroup(html) {
  const graph = findJsonLdGraph(html);
  return graph.find((item) => item?.['@type'] === 'ProductGroup') || null;
}

function findShopifyMetaProduct(html) {
  const match = html.match(/var meta = (\{[\s\S]*?\});\s*for \(var attr in meta\)/i);
  const parsed = safeJsonParse(match?.[1] || '');
  return parsed?.product || null;
}

function discoverProductLinks(html) {
  return uniqueBy(
    [...String(html || '').matchAll(/href="(\/products\/[^"#?]+)"/gi)].map((match) =>
      toAbsoluteUrl(match[1])
    ),
    (url) => url
  );
}

function parseVariantTitle(variantTitle) {
  const raw = normalizeText(variantTitle);
  const parts = raw.split('/').map((part) => normalizeText(part));
  return {
    amountLabel: parts[0] || '',
    preparationLabel: parts[1] || '',
  };
}

function extractQuantityFromLabel(label) {
  const normalized = normalizeForSlug(label).toLowerCase();
  const kiloMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*kg\b/);
  if (kiloMatch) {
    return Math.round(Number.parseFloat(kiloMatch[1].replace(',', '.')) * 1000);
  }

  const gramMatch = normalized.match(/(\d+)\s*gr\b|(\d+)\s*g\b/);
  if (gramMatch) {
    return Number.parseInt(gramMatch[1] || gramMatch[2], 10);
  }

  return null;
}

function selectBeanVariant(productGroup, metaProduct) {
  const groupVariants = Array.isArray(productGroup?.hasVariant) ? productGroup.hasVariant : [];
  const metaVariants = Array.isArray(metaProduct?.variants) ? metaProduct.variants : [];

  const merged = groupVariants.map((variant) => {
    const id = normalizeText(
      String(variant?.offers?.url || variant?.['@id'] || '').match(/variant=(\d+)/)?.[1] ||
        variant?.['@id']?.split('/').pop() ||
        ''
    );
    const metaVariant = metaVariants.find((item) => String(item.id) === id) || null;
    const name = normalizeText(variant?.name || metaVariant?.name || '');
    const { amountLabel, preparationLabel } = parseVariantTitle(
      metaVariant?.public_title || metaVariant?.title || name.split(' - ').slice(1).join(' - ')
    );
    const priceSpec = Array.isArray(variant?.offers?.priceSpecification)
      ? variant.offers.priceSpecification[0]
      : variant?.offers?.priceSpecification || null;

    return {
      id,
      name,
      sku: normalizeText(variant?.sku || metaVariant?.sku || ''),
      amountLabel,
      preparationLabel,
      quantity: extractQuantityFromLabel(amountLabel),
      price: Number.parseFloat(
        priceSpec?.price ?? (metaVariant?.price != null ? metaVariant.price / 100 : NaN)
      ),
      currency: normalizeText(priceSpec?.priceCurrency || 'EUR'),
      availability: normalizeText(variant?.offers?.availability || ''),
      image: toAbsoluteUrl(metaVariant?.featured_image?.src || metaVariant?.image?.src || ''),
      url: toAbsoluteUrl(variant?.offers?.url || ''),
    };
  });

  const beanVariants = merged.filter((variant) =>
    normalizeForSlug(`${variant.name} ${variant.preparationLabel}`)
      .toLowerCase()
      .includes('cafe en grano')
  );

  if (!beanVariants.length) return null;

  const candidates = beanVariants;
  candidates.sort((a, b) => {
    const qa = Number.isFinite(a.quantity) ? a.quantity : Number.MAX_SAFE_INTEGER;
    const qb = Number.isFinite(b.quantity) ? b.quantity : Number.MAX_SAFE_INTEGER;
    if (qa !== qb) return qa - qb;
    return (a.preparationLabel || '').localeCompare(b.preparationLabel || '');
  });

  return candidates[0] || null;
}

function inferRoast(name, description, handle) {
  const haystack = normalizeForSlug(`${name} ${description} ${handle}`).toLowerCase();
  if (haystack.includes('espresso')) return 'intenso';
  if (haystack.includes('decaf') || haystack.includes('descafeinado')) return 'medio';
  if (haystack.includes('filtro') || haystack.includes('filter')) return 'suave';
  return '';
}

function inferOrigin(name, description, handle) {
  const haystack = normalizeForSlug(`${name} ${description} ${handle}`).toLowerCase();
  const mappings = [
    ['colombia', 'Colombia'],
    ['etiopia', 'Etiopía'],
    ['ethiopia', 'Etiopía'],
    ['kenya', 'Kenia'],
    ['burundi', 'Burundi'],
    ['honduras', 'Honduras'],
    ['guatemala', 'Guatemala'],
    ['brazil', 'Brasil'],
    ['brasil', 'Brasil'],
    ['mexico', 'México'],
    ['peru', 'Perú'],
    ['rwanda', 'Ruanda'],
    ['costa rica', 'Costa Rica'],
    ['el salvador', 'El Salvador'],
  ];

  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) return value;
  }

  return '';
}

function inferNotes(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const dictionary = [
    'chocolate',
    'cacao',
    'cereza',
    'cereza madura',
    'arandano',
    'nueces',
    'datiles',
    'pasas',
    'azucaradas',
    'dulce',
    'cremoso',
    'cremosa',
    'jugoso',
    'floral',
    'citrico',
    'fruta',
    'frutal',
  ];

  return [
    ...new Set(
      dictionary
        .filter((note) => haystack.includes(note))
        .map((note) => {
          if (note === 'cremosa') return 'cremoso';
          if (note === 'cereza madura') return 'cereza';
          return note;
        })
    ),
  ];
}

function inferProcess(description) {
  const haystack = normalizeForSlug(description).toLowerCase();
  if (haystack.includes('lavado')) return 'lavado';
  if (haystack.includes('natural')) return 'natural';
  if (haystack.includes('honey')) return 'honey';
  if (haystack.includes('anaerob')) return 'anaerobico';
  return '';
}

function buildCafeDocId(handle, sku) {
  const base = sku || handle;
  return `nomad_${slugify(base)}`;
}

async function discoverProducts() {
  const html = await fetchText(COLLECTION_URL);
  const urls = discoverProductLinks(html);
  if (!urls.length) throw new Error('No se encontraron fichas de producto en Nomad.');
  return Number.isFinite(LIMIT) ? urls.slice(0, LIMIT) : urls;
}

async function enrichProduct(url, now) {
  const html = await fetchText(url);
  const productGroup = findProductGroup(html);
  const metaProduct = findShopifyMetaProduct(html);
  if (!productGroup || !metaProduct) {
    throw new Error(`No se pudo extraer el producto Shopify en ${url}`);
  }

  const canonical = extractFirstMatch(html, /<link rel="canonical" href="([^"]+)"/i);
  const title = extractFirstMatch(html, /<title>([^<]+)<\/title>/i);
  const description = extractFirstMatch(html, /<meta name="description" content="([^"]+)"/i);
  const image = toAbsoluteUrl(
    extractFirstMatch(html, /<meta property="og:image" content="([^"]+)"/i)
  );
  const pageText = stripTags(html);
  const variant = selectBeanVariant(productGroup, metaProduct);
  if (!variant) return null;

  const handle = normalizeText(metaProduct.handle || canonical.split('/products/')[1] || '');
  const name = normalizeText(productGroup.name || metaProduct.title || title);
  const notes = inferNotes(description);
  const roast = inferRoast(name, description, handle);
  const origin = inferOrigin(name, description, handle);
  const process = inferProcess(description);
  const decaf = /decaf|descafeinado|sin cafeina/i.test(`${name} ${description} ${handle}`);

  return {
    id: buildCafeDocId(handle, variant.sku),
    fuente: 'nomad',
    fuentePais: 'ES',
    fuenteUrl: canonical || url,
    urlProducto: canonical || url,

    nombre: name,
    name,
    marca: 'Nomad Coffee',
    roaster: 'Nomad Coffee',

    ean: '',
    normalizedEan: '',
    sku: variant.sku,
    mpn: '',

    descripcion: description,
    description,

    category: 'specialty',
    coffeeCategory: 'specialty',
    isSpecialty: true,
    legacy: false,

    formato: 'beans',
    format: 'beans',
    sistemaCapsula: '',
    tipoProducto: 'cafe en grano',
    cantidad: variant.quantity,
    intensidad: null,
    tueste: roast,
    roastLevel: roast,
    pais: origin,
    origen: origin,
    proceso: process,
    notas: notes.join(', '),
    notes: notes.join(', '),
    decaf,

    precio: Number.isFinite(variant.price) ? variant.price : null,
    currency: variant.currency || 'EUR',
    certificaciones: '',
    isBio: false,
    inStock: /instock$/i.test(variant.availability),

    fecha: now,
    puntuacion: 0,
    votos: 0,

    officialPhoto: image || variant.image,
    bestPhoto: image || variant.image,
    imageUrl: image || variant.image,
    foto: image || variant.image,

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
      sourceType: 'nomad',
      sourceTitle: title,
      handle,
      selectedVariantId: variant.id,
      selectedVariantTitle: `${variant.amountLabel} / ${variant.preparationLabel}`.trim(),
      pageTextPreview: pageText.slice(0, 280),
    },
  };
}

async function main() {
  const urls = await discoverProducts();
  const now = new Date().toISOString();

  console.log(`[NOMAD] Collection: ${COLLECTION_URL}`);
  console.log(`[NOMAD] Products discovered: ${urls.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const url of urls) {
    const cafe = await enrichProduct(url, now);
    if (!cafe) continue;
    cafes.push(cafe);
    console.log(`[NOMAD] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[NOMAD] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[NOMAD] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[NOMAD] Error:', error?.stack || error);
  process.exit(1);
});
