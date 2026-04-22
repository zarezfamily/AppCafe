/*
  Importa cafes actuales de Peet's a Firestore.

  Fuente:
    https://www.peets.com/products.json

  Estrategia:
    - Recorre products.json paginado.
    - Filtra cafes reales de Peet's, excluyendo bundles, suscripciones, matcha y L'OR.
    - Selecciona una variante canonica priorizando cafe en grano.
*/

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

const BASE_SITE = 'https://www.peets.com';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-peets-real.json');
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const CAFES_COLLECTION = 'cafes';
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  Accept: 'application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
  Referer: 'https://www.google.com/',
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

function stripTags(html) {
  return normalizeText(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
  );
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    redirect: 'follow',
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP_${response.status} ${url} ${text.slice(0, 200)}`);
  }
  return JSON.parse(text);
}

function ensureAdmin() {
  if (admin.apps.length) return;
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function parseOuncesToGrams(value) {
  const match = normalizeForSlug(value)
    .toLowerCase()
    .match(/(\d+(?:[.,]\d+)?)\s*oz\b/);
  if (!match) return null;
  return Math.round(Number.parseFloat(match[1].replace(',', '.')) * 28.3495);
}

function parseCapsuleCount(value) {
  const haystack = normalizeForSlug(value).toLowerCase();
  const box = haystack.match(/(\d+)\s*(count|ct|pods|capsules)\b/);
  if (box) return Number.parseInt(box[1], 10);
  return null;
}

function shouldSkipProduct(product) {
  const haystack = normalizeForSlug(
    `${product?.title || ''} ${product?.product_type || ''} ${(product?.tags || []).join(' ')}`
  ).toLowerCase();
  const type = normalizeForSlug(product?.product_type || '').toLowerCase();
  const allowedType =
    type === 'coffee' ||
    type === 'k-cup pods' ||
    type === 'espresso capsules' ||
    type === 'coffee pods';

  return (
    !allowedType ||
    haystack.includes("l'or") ||
    haystack.includes('lor ') ||
    haystack.includes('bundle') ||
    haystack.includes('subscription') ||
    haystack.includes('series') ||
    haystack.includes('matcha') ||
    haystack.includes('chai') ||
    haystack.includes('tea') ||
    haystack.includes('keurig') ||
    haystack.includes('sampler') ||
    haystack.includes('gift') ||
    haystack.includes('mug') ||
    haystack.includes('filter') ||
    haystack.includes('coffeemaker') ||
    haystack.includes('recycling kit')
  );
}

function inferFormat(product) {
  const haystack = normalizeForSlug(
    `${product?.title || ''} ${product?.product_type || ''} ${(product?.tags || []).join(' ')}`
  ).toLowerCase();
  if (haystack.includes('pod') || haystack.includes('capsule')) return 'capsules';
  return 'beans';
}

function inferCategory(product) {
  const haystack = normalizeForSlug(
    `${product?.title || ''} ${stripTags(product?.body_html || '')} ${(product?.tags || []).join(' ')}`
  ).toLowerCase();
  if (
    haystack.includes('single origin') ||
    haystack.includes('limited release') ||
    haystack.includes('organic') ||
    haystack.includes('reserve')
  ) {
    return 'specialty';
  }
  return 'daily';
}

function inferOrigin(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  const mappings = [
    ['timor-leste', 'Timor-Leste'],
    ['papua new guinea', 'Papua New Guinea'],
    ['mexico', 'Mexico'],
    ['tanzania', 'Tanzania'],
    ['guatemala', 'Guatemala'],
    ['colombia', 'Colombia'],
    ['ethiopia', 'Etiopia'],
    ['sumatra', 'Indonesia'],
  ];
  const hits = [];
  for (const [needle, value] of mappings) {
    if (haystack.includes(needle)) hits.push(value);
  }
  return [...new Set(hits)].join(', ');
}

function inferRoast(text) {
  const haystack = normalizeForSlug(text).toLowerCase();
  if (haystack.includes('light')) return 'light';
  if (
    haystack.includes('dark') ||
    haystack.includes('french roast') ||
    haystack.includes('major dickason')
  )
    return 'dark';
  return 'medium';
}

function inferNotes(tags, description) {
  const source = `${(tags || []).join(' ')} ${description}`;
  const haystack = normalizeForSlug(source).toLowerCase();
  const dictionary = [
    ['cocoa', 'cacao'],
    ['fruit', 'fruta'],
    ['floral', 'floral'],
    ['spice', 'especias'],
    ['nut', 'frutos secos'],
    ['caramel', 'caramelo'],
    ['chocolate', 'chocolate'],
  ];
  return [
    ...new Set(dictionary.filter(([needle]) => haystack.includes(needle)).map(([, note]) => note)),
  ];
}

function pickCanonicalVariant(product, format) {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  if (!variants.length) return null;

  const scored = variants.map((variant) => {
    const title = normalizeText(variant?.title || '');
    const grams = parseOuncesToGrams(title);
    const capsuleCount = parseCapsuleCount(title);
    const wholeBean =
      /whole bean/i.test(title) ||
      /form:\s*beans/i.test((product?.tags || []).join(' ')) ||
      /coffee type/i.test(product?.product_type || '');

    return {
      variant,
      grams,
      capsuleCount,
      score:
        format === 'capsules' ? 0 : wholeBean ? 0 : /drip|press pot|espresso/i.test(title) ? 1 : 2,
    };
  });

  scored.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (format === 'capsules') return (a.capsuleCount || 999) - (b.capsuleCount || 999);
    return (a.grams || 99999) - (b.grams || 99999);
  });

  return scored[0]?.variant || variants[0];
}

async function discoverProducts() {
  const products = [];
  for (let page = 1; page <= 10; page += 1) {
    const data = await fetchJson(`${BASE_SITE}/products.json?limit=250&page=${page}`);
    const batch = Array.isArray(data?.products) ? data.products : [];
    if (!batch.length) break;
    products.push(...batch);
    if (batch.length < 250) break;
  }
  return products;
}

async function main() {
  const now = new Date().toISOString();
  const products = await discoverProducts();

  console.log(`[PEETS] Products discovered: ${products.length} dry=${DRY_RUN}`);

  const cafes = [];
  for (const product of products) {
    if (shouldSkipProduct(product)) continue;

    const name = normalizeText(product.title || '');
    const description = stripTags(product.body_html || '');
    const format = inferFormat(product);
    const variant = pickCanonicalVariant(product, format);
    if (!name || !variant) continue;

    const text = `${name} ${description} ${(product.tags || []).join(' ')} ${variant.title || ''}`;
    const category = inferCategory(product);
    const image = normalizeText(product?.images?.[0]?.src || '');
    const amount =
      format === 'capsules'
        ? parseCapsuleCount(variant.title || '') || 10
        : parseOuncesToGrams(variant.title || '') || 340;
    const origin = inferOrigin(text);
    const roast = inferRoast(text);
    const notes = inferNotes(product.tags, description);
    const decaf = /decaf/i.test(normalizeForSlug(text));
    const isBio = /organic/i.test(normalizeForSlug(text));

    const cafe = {
      id: `peets_${slugify(product.handle || product.id)}`,
      fuente: 'peets',
      fuentePais: 'US',
      fuenteUrl: `${BASE_SITE}/products/${product.handle}`,
      urlProducto: `${BASE_SITE}/products/${product.handle}`,

      nombre: name,
      name,
      marca: "Peet's",
      roaster: "Peet's",

      ean: '',
      normalizedEan: '',
      sku: normalizeText(variant.sku || String(variant.id || product.id || '')),
      mpn: '',

      descripcion: description,
      description,

      category,
      coffeeCategory: category === 'specialty' ? 'specialty' : 'daily',
      isSpecialty: category === 'specialty',
      legacy: false,

      formato: format,
      format,
      sistemaCapsula: format === 'capsules' ? 'k-cup' : '',
      tipoProducto: format === 'capsules' ? 'capsulas de cafe' : 'cafe en grano',
      cantidad: amount,
      intensidad: null,
      tueste: roast,
      roastLevel: roast,
      pais: origin,
      origen: origin,
      proceso: '',
      notas: notes.join(', '),
      notes: notes.join(', '),
      decaf,

      precio: Number.isFinite(variant.price) ? variant.price / 100 : null,
      currency: normalizeText(product.currency || 'USD'),
      certificaciones: isBio ? 'organico' : '',
      isBio,
      inStock: Boolean(variant.available),

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
        sourceType: 'peets',
        handle: product.handle || '',
        productType: product.product_type || '',
        variantTitle: variant.title || '',
        tags: product.tags || [],
      },
    };

    cafes.push(cafe);
    console.log(`[PEETS] Prepared: ${cafe.nombre}`);
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[PEETS] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[PEETS] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((error) => {
  console.error('[PEETS] Error:', error?.stack || error);
  process.exit(1);
});
