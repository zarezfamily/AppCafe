/*
  Importa los cafés de INCAPTO (WooCommerce Store API) a Firestore.

  Fuente:
    - Listado: https://incapto.com/wp-json/wc/store/products?category=<id>
    - Categorías: https://incapto.com/wp-json/wc/store/products/categories

  Uso:
    DRY_RUN=true node --env-file=.env scripts/import_incapto_cafes.js
    node --env-file=.env scripts/import_incapto_cafes.js

  Opcionales:
    LIMIT=50                 -> limita nº productos procesados
    PER_PAGE=50              -> tamaño de página del API
    INCLUDE_BUNDLES=true     -> incluye packs (type=bundle)
    OUTPUT_JSON=scripts/cafe-import-incapto-real.json

  Notas importantes:
    - Incapto no expone siempre una puntuación SCA “oficial”. Si no aparece en los datos,
      se calcula un SCA estimado con el mismo algoritmo que usa la app.
    - Escritura con `firebase-admin` usando `scripts/serviceAccountKey.json`.
*/

const fs = require('fs');
const path = require('path');

const fetch = require('node-fetch');

const admin = require('firebase-admin');

const OUTPUT_JSON =
  process.env.OUTPUT_JSON || path.resolve(process.cwd(), 'scripts/cafe-import-incapto-real.json');
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const LIMIT = Number.parseInt(process.env.LIMIT || '', 10);
const PER_PAGE = Math.max(1, Number.parseInt(process.env.PER_PAGE || '50', 10) || 50);
const INCLUDE_BUNDLES = String(process.env.INCLUDE_BUNDLES || '').toLowerCase() === 'true';

const BASE = 'https://incapto.com';
const STORE_PRODUCTS = `${BASE}/wp-json/wc/store/products`;
const STORE_CATEGORIES = `${BASE}/wp-json/wc/store/products/categories`;
const CAFES_COLLECTION = 'cafes';

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanEan(value) {
  const cleaned = String(value || '').replace(/\D/g, '');
  return cleaned.length >= 8 ? cleaned : '';
}

function slugify(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function stripHtml(html) {
  const raw = String(html || '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

  return raw
    .replace(/[ \\t\\f\\v]+/g, ' ')
    .replace(/\\n\\s+/g, '\n')
    .trim();
}

function extractField(text, label) {
  const t = String(text || '');
  const re = new RegExp(`${label}\\s*:?\\s*([^\\n\\r]+)`, 'i');
  const m = t.match(re);
  return m ? normalizeText(m[1]) : '';
}

function extractNumber(text, label) {
  const value = extractField(text, label);
  const m = value.match(/(\\d+(?:[.,]\\d+)?)/);
  if (!m) return null;
  const n = Number(String(m[1]).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parsePrice(prices) {
  const minor = Number(prices?.currency_minor_unit ?? 2);
  const raw = prices?.price;
  if (!raw) return null;
  const cents = Number(raw);
  if (!Number.isFinite(cents)) return null;
  return cents / Math.pow(10, minor);
}

// === SCA (mismo enfoque que en scripts/backfill_sca_firestore.js) ===

function normalizeEnum(value, allowedValues = []) {
  const normalized = normalizeText(value).toLowerCase();
  return allowedValues.includes(normalized) ? normalized : '';
}

function normalizeBoolean(value) {
  if (value === true || value === false) return value;

  const normalized = normalizeText(value).toLowerCase();
  if (['true', '1', 'yes', 'si', 'sí'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;

  return null;
}

function normalizeNumber(value) {
  if (value === null || value === undefined || value === '') return null;

  const normalized = String(value).replace(',', '.').trim();
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseNotesList(value) {
  const raw = normalizeText(value);
  if (!raw) return [];

  return raw
    .split(/[,;|·/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const CATEGORY_VALUES = ['specialty', 'supermarket', 'bio'];
const FORMAT_VALUES = ['beans', 'ground', 'capsules'];
const ROAST_LEVEL_VALUES = ['light', 'medium', 'dark'];
const SPECIES_VALUES = ['arabica', 'robusta', 'blend'];

function getLegacyAwareValue(payload = {}, keys = []) {
  for (const key of keys) {
    const value = payload?.[key];
    if (
      value !== undefined &&
      value !== null &&
      typeof value !== 'object' &&
      String(value).trim() !== ''
    ) {
      return value;
    }
  }
  return '';
}

function sanitizeCafePayload(payload = {}) {
  const ean = cleanEan(payload.ean || payload.normalizedEan);

  const name = normalizeText(getLegacyAwareValue(payload, ['name', 'nombre']));
  const roaster = normalizeText(getLegacyAwareValue(payload, ['roaster', 'marca']));
  const origin = normalizeText(getLegacyAwareValue(payload, ['origin', 'origen', 'pais']));
  const process = normalizeText(getLegacyAwareValue(payload, ['process', 'proceso']));
  const variety = normalizeText(getLegacyAwareValue(payload, ['variety', 'variedad']));
  const notes = normalizeText(getLegacyAwareValue(payload, ['notes', 'notas']));

  const category =
    normalizeEnum(payload.category, CATEGORY_VALUES) ||
    (() => {
      const coffeeCategory = normalizeText(payload.coffeeCategory).toLowerCase();
      if (coffeeCategory === 'daily' || coffeeCategory === 'commercial') return 'supermarket';
      if (coffeeCategory === 'specialty') return 'specialty';
      return '';
    })();

  const format = normalizeEnum(getLegacyAwareValue(payload, ['format', 'formato']), FORMAT_VALUES);
  const roastLevel = normalizeEnum(
    getLegacyAwareValue(payload, ['roastLevel', 'tueste']),
    ROAST_LEVEL_VALUES
  );
  const species = normalizeEnum(
    getLegacyAwareValue(payload, ['species', 'especie']),
    SPECIES_VALUES
  );

  const altitude = normalizeNumber(getLegacyAwareValue(payload, ['altitude', 'altura']));
  const scaScoreOfficial =
    normalizeNumber(getLegacyAwareValue(payload, ['scaScoreOfficial'])) ||
    (payload?.sca && typeof payload.sca === 'object'
      ? normalizeNumber(payload.sca.officialScore ?? payload.sca.score)
      : normalizeNumber(getLegacyAwareValue(payload, ['sca'])));

  const decaf = normalizeBoolean(getLegacyAwareValue(payload, ['decaf', 'descafeinado']));

  return {
    ean,
    normalizedEan: ean,
    name,
    nombre: name,
    roaster,
    marca: roaster,
    origin,
    origen: origin,
    pais: origin,
    process,
    proceso: process,
    variety,
    variedad: variety,
    notes,
    notas: notes,
    category,
    coffeeCategory:
      category === 'supermarket' ? 'daily' : category === 'specialty' ? 'specialty' : '',
    format,
    formato: format,
    roastLevel,
    tueste: roastLevel,
    species,
    altitude,
    altura: altitude,
    scaScoreOfficial,
    decaf,
  };
}

function computeAutomaticSca(payload = {}) {
  const cafe = sanitizeCafePayload(payload);

  const officialScore = cafe.scaScoreOfficial;
  if (Number.isFinite(officialScore) && officialScore >= 60 && officialScore <= 100) {
    return {
      score: Number(clamp(officialScore, 60, 100).toFixed(1)),
      type: 'official',
      confidence: 1,
      officialScore: Number(clamp(officialScore, 60, 100).toFixed(1)),
      reasons: ['SCA oficial indicado manualmente'],
      signals: {
        category: cafe.category || '',
        format: cafe.format || '',
        roastLevel: cafe.roastLevel || '',
        origin: !!cafe.origin,
        process: !!cafe.process,
        variety: !!cafe.variety,
        altitude: !!cafe.altitude,
        notesCount: parseNotesList(cafe.notes).length,
      },
    };
  }

  let score = 70;
  let confidence = 0.3;

  const notesList = parseNotesList(cafe.notes);
  const reasons = [];

  if (cafe.category === 'specialty') {
    score += 8;
    confidence += 0.15;
    reasons.push('Café de especialidad');
  }

  if (cafe.category === 'bio') {
    score += 3;
    confidence += 0.08;
    reasons.push('Café bio');
  }

  if (cafe.category === 'supermarket') {
    score -= 1;
    reasons.push('Café de supermercado');
  }

  if (cafe.origin) {
    score += 2;
    confidence += 0.08;
    reasons.push('Origen definido');
  }

  if (cafe.process) {
    score += 2;
    confidence += 0.08;
    reasons.push('Proceso conocido');
  }

  if (cafe.variety) {
    score += 2;
    confidence += 0.08;
    reasons.push('Variedad identificada');
  }

  if (cafe.altitude && cafe.altitude >= 1000) {
    score += 2;
    confidence += 0.08;
    reasons.push('Altitud elevada');
  } else if (cafe.altitude && cafe.altitude > 0) {
    score += 1;
    confidence += 0.04;
    reasons.push('Altitud disponible');
  }

  if (notesList.length >= 2) {
    score += 2;
    confidence += 0.06;
    reasons.push('Notas de cata definidas');
  } else if (notesList.length === 1) {
    score += 1;
    confidence += 0.03;
    reasons.push('Perfil sensorial básico');
  }

  if (cafe.roaster) {
    score += 1;
    confidence += 0.04;
    reasons.push('Tostador identificado');
  }

  if (cafe.roastLevel === 'light') {
    score += 1.5;
    reasons.push('Tueste claro');
  } else if (cafe.roastLevel === 'medium') {
    score += 1;
    reasons.push('Tueste medio');
  } else if (cafe.roastLevel === 'dark') {
    score -= 1;
    reasons.push('Tueste oscuro');
  }

  if (cafe.format === 'beans') {
    score += 1;
    reasons.push('Formato grano');
  } else if (cafe.format === 'ground') {
    score -= 0.5;
    reasons.push('Formato molido');
  } else if (cafe.format === 'capsules') {
    score -= 2;
    reasons.push('Formato cápsulas');
  }

  if (cafe.species === 'arabica') {
    score += 1;
    reasons.push('Especie arábica');
  } else if (cafe.species === 'blend') {
    score += 0.3;
    reasons.push('Blend');
  } else if (cafe.species === 'robusta') {
    score -= 1.5;
    reasons.push('Presencia de robusta');
  }

  if (cafe.decaf === true) {
    score -= 0.5;
    reasons.push('Descafeinado');
  }

  score = clamp(score, 60, 89);
  confidence = clamp(confidence, 0.2, 0.95);

  return {
    score: Number(score.toFixed(1)),
    type: 'estimated',
    confidence: Number(confidence.toFixed(2)),
    officialScore: null,
    reasons: reasons.filter(Boolean),
    signals: {
      category: cafe.category || '',
      format: cafe.format || '',
      roastLevel: cafe.roastLevel || '',
      origin: !!cafe.origin,
      process: !!cafe.process,
      variety: !!cafe.variety,
      altitude: !!cafe.altitude,
      notesCount: notesList.length,
      species: cafe.species || '',
      decaf: cafe.decaf,
    },
  };
}

function buildScaPayload(payload = {}) {
  const sca = computeAutomaticSca(payload);
  return { ...sca, lastCalculatedAt: new Date().toISOString() };
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  const txt = await res.text();
  if (!res.ok) throw new Error(`HTTP_${res.status}: ${txt.slice(0, 200)}`);
  return txt ? JSON.parse(txt) : null;
}

async function getCategoryIdBySlug(slug) {
  const url = `${STORE_CATEGORIES}?per_page=100`;
  const cats = await fetchJson(url);
  const match = (cats || []).find((c) => c?.slug === slug);
  if (!match?.id) {
    throw new Error(`No se encontró categoría con slug="${slug}".`);
  }
  return match.id;
}

async function listProductsByCategory(categoryId) {
  const out = [];
  let page = 1;

  while (true) {
    const url = `${STORE_PRODUCTS}?category=${encodeURIComponent(
      String(categoryId)
    )}&per_page=${encodeURIComponent(String(PER_PAGE))}&page=${encodeURIComponent(String(page))}`;
    const items = await fetchJson(url);
    if (!Array.isArray(items) || items.length === 0) break;
    out.push(...items);
    if (items.length < PER_PAGE) break;
    page += 1;
    if (page > 50) break;
  }

  return out;
}

function inferCategoryFlags(product) {
  const name = normalizeText(product?.name).toLowerCase();
  const cats = (product?.categories || []).map((c) => String(c?.slug || '').toLowerCase());
  const isDecaf = name.includes('descafe') || cats.some((s) => s.includes('descafe'));
  const isBio = name.includes('bio') || cats.some((s) => s.includes('bio'));
  const isBlend = name.includes('blend') || cats.some((s) => s.includes('blend'));

  return { isDecaf, isBio, isBlend };
}

function mapProductToCafe(product) {
  const { isDecaf, isBio, isBlend } = inferCategoryFlags(product);

  const permalink = normalizeText(product?.permalink);
  const name = normalizeText(product?.name);
  const sku = cleanEan(product?.sku);
  const slug = String(product?.slug || '').trim() || slugify(name || permalink);

  const img = product?.images?.[0]?.src || product?.images?.[0]?.thumbnail || '';
  const officialPhoto = normalizeText(img);

  const price = parsePrice(product?.prices);

  const text = stripHtml(`${product?.short_description || ''}\n${product?.description || ''}`);

  const origin =
    extractField(text, 'Origen') || extractField(text, 'País') || extractField(text, 'Pais') || '';
  const process = extractField(text, 'Proceso') || extractField(text, 'Procesado') || '';
  const variety = extractField(text, 'Variedad') || extractField(text, 'Varietal') || '';
  const roastLevel = extractField(text, 'Tueste') || '';
  const altitude = extractNumber(text, 'Altitud') || extractNumber(text, 'Altura') || null;
  const notes =
    extractField(text, 'Notas') ||
    extractField(text, 'Notas de cata') ||
    extractField(text, 'Perfil') ||
    '';

  const scaScoreOfficial = extractNumber(text, 'SCA');

  const now = new Date().toISOString();

  const category = isBio ? 'bio' : 'specialty';
  const coffeeCategory = 'specialty';

  const base = {
    fuente: 'incapto',
    fuentePais: 'ES',
    fuenteUrl: permalink,
    urlProducto: permalink,

    nombre: name,
    name,
    marca: 'INCAPTO',
    roaster: 'INCAPTO',

    ean: sku || '',
    normalizedEan: sku || '',

    pais: origin,
    origen: origin,
    origin,

    proceso: process,
    process,
    variedad: variety,
    variety,
    tueste: roastLevel,
    roastLevel,

    altura: altitude,
    altitude,

    notas: notes,
    notes,

    certificaciones: isBio ? 'BIO' : '',
    isBio: isBio === true,
    decaf: isDecaf === true,
    blend: isBlend === true,

    category,
    coffeeCategory,

    formato: 'beans',
    format: 'beans',

    precio: Number.isFinite(price) ? Number(price.toFixed(2)) : null,

    officialPhoto,
    bestPhoto: officialPhoto,
    imageUrl: officialPhoto,
    foto: officialPhoto,

    scaScoreOfficial: Number.isFinite(scaScoreOfficial) ? scaScoreOfficial : null,

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

  const sca = buildScaPayload(base);
  return {
    id: sku ? sku : `incapto_${slug}`,
    ...base,
    sca,
  };
}

function shouldImportProduct(product) {
  const type = String(product?.type || '').toLowerCase();
  if (!INCLUDE_BUNDLES && type === 'bundle') return false;
  if (type === 'grouped') return false;
  return true;
}

function ensureAdmin() {
  if (admin.apps.length) return;
  const saPath = path.resolve(__dirname, 'serviceAccountKey.json');
  if (!fs.existsSync(saPath)) {
    throw new Error(`No existe ${saPath}`);
  }
  const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

async function main() {
  const categoryId = await getCategoryIdBySlug('cafes-en-grano');
  const products = await listProductsByCategory(categoryId);
  const filtered = products.filter(shouldImportProduct);

  const cafes = [];
  for (const product of filtered) {
    cafes.push(mapProductToCafe(product));
    if (Number.isFinite(LIMIT) && cafes.length >= LIMIT) break;
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[INCAPTO] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

  ensureAdmin();
  const db = admin.firestore();

  let written = 0;
  for (const cafe of cafes) {
    if (!cafe?.id) continue;

    const { id, ...payload } = cafe;

    if (!DRY_RUN) {
      await db.collection(CAFES_COLLECTION).doc(id).set(payload, { merge: true });
    }
    written += 1;
    if (written % 25 === 0) {
      console.log(`[INCAPTO] Progreso: ${written}/${cafes.length} (dry=${DRY_RUN})`);
    }
  }

  console.log(`[INCAPTO] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((err) => {
  console.error('❌', err?.message || err);
  process.exit(1);
});
