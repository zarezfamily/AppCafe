/*
  Importa cafés de Cafés La Mexicana (PrestaShop) a Firestore.

  Fuente (categoría):
    https://www.lamexicana.es/3-cafes-clasicos

  Estrategia:
    - Se extraen los enlaces de producto del listado de categoría.
    - Para cada producto se lee el JSON-LD (@type=Product) y se mapea a la colección `cafes`.

  Uso:
    DRY_RUN=true node --env-file=.env scripts/import_lamexicana_cafes.js
    node --env-file=.env scripts/import_lamexicana_cafes.js

  Opcionales:
    CATEGORY_URL=https://www.lamexicana.es/3-cafes-clasicos
    LIMIT=50
    OUTPUT_JSON=scripts/cafe-import-lamexicana-real.json

  Nota:
    - Si no hay SCA oficial, se calcula un SCA estimado (algoritmo local).
    - Escritura con `firebase-admin` usando `scripts/serviceAccountKey.json`.
*/

const fs = require('fs');
const path = require('path');

const fetch = require('node-fetch');
const admin = require('firebase-admin');

const CATEGORY_URL = process.env.CATEGORY_URL || 'https://www.lamexicana.es/3-cafes-clasicos';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON ||
  path.resolve(process.cwd(), 'scripts/cafe-import-lamexicana-real.json');
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const LIMIT = Number.parseInt(process.env.LIMIT || '', 10);

const CAFES_COLLECTION = 'cafes';

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripHash(url) {
  return String(url || '').split('#')[0];
}

function slugify(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

function parseFloatSafe(value) {
  const n = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parseWeightKgToGrams(weight) {
  const value = parseFloatSafe(weight?.value);
  const unit = String(weight?.unitCode || weight?.unitText || '').toLowerCase();
  if (!value) return null;
  if (unit === 'kg') return Math.round(value * 1000);
  if (unit === 'g') return Math.round(value);
  return null;
}

function extractJsonLdProducts(html) {
  const scripts = [
    ...String(html || '').matchAll(
      /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    ),
  ]
    .map((m) => m[1])
    .map((txt) => txt.trim())
    .filter(Boolean);

  const products = [];
  for (const txt of scripts) {
    try {
      const json = JSON.parse(txt);
      if (!json) continue;

      if (Array.isArray(json)) {
        json.forEach((item) => {
          if (item?.['@type'] === 'Product') products.push(item);
        });
        continue;
      }

      if (json?.['@type'] === 'Product') {
        products.push(json);
      }
    } catch {
      // ignore
    }
  }
  return products;
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'etiove-import/1.0 (+local script)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`HTTP_${res.status} ${txt.slice(0, 200)}`);
  return txt;
}

function extractProductLinksFromCategory(html) {
  const links = [
    ...String(html || '').matchAll(
      /class="[^"]*product-title[^"]*"[^>]*>\s*<a[^>]+href="([^"]+)"/g
    ),
  ].map((m) => stripHash(m[1]));
  return [...new Set(links)].filter(Boolean);
}

// === SCA (mismo algoritmo local usado en otros imports) ===

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

function inferFormatFromLinkOrName(link, name) {
  const t = `${normalizeText(link)} ${normalizeText(name)}`.toLowerCase();
  if (t.includes('capsul')) return 'capsules';
  if (t.includes('molido')) return 'ground';
  return 'beans';
}

function mapJsonLdProductToCafe(product, productUrl) {
  const now = new Date().toISOString();

  const name = normalizeText(product?.name);
  const desc = normalizeText(product?.description);
  const brandName = normalizeText(product?.brand?.name) || 'Cafés La Mexicana';

  const images = Array.isArray(product?.offers?.image)
    ? product.offers.image
    : Array.isArray(product?.image)
      ? product.image
      : [];
  const officialPhoto = normalizeText(images[0] || '');

  const price = parseFloatSafe(product?.offers?.price);
  const weightG = parseWeightKgToGrams(product?.weight);

  const isDecaf = /descafe/i.test(name) || /descafe/i.test(desc);
  const isBio = /\bbio\b/i.test(name) || /\bbio\b/i.test(desc);

  const format = inferFormatFromLinkOrName(productUrl, name);

  const base = {
    fuente: 'lamexicana',
    fuentePais: 'ES',
    fuenteUrl: productUrl,
    urlProducto: productUrl,

    nombre: name,
    name,
    marca: 'Cafés La Mexicana',
    roaster: 'Cafés La Mexicana',
    brandName,

    cantidad: weightG || null,

    notas: '',
    notes: '',

    certificaciones: isBio ? 'BIO' : '',
    isBio: isBio === true,
    decaf: isDecaf === true,

    category: isBio ? 'bio' : 'specialty',
    coffeeCategory: 'specialty',

    formato: format,
    format,

    precio: Number.isFinite(price) ? Number(price.toFixed(2)) : null,

    officialPhoto,
    bestPhoto: officialPhoto,
    imageUrl: officialPhoto,
    foto: officialPhoto,

    scaScoreOfficial: null,

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

  const mpn = normalizeText(product?.mpn || '');
  const id = mpn ? `lamexicana_${mpn}` : `lamexicana_${slugify(name || productUrl)}`;

  return {
    id,
    ...base,
    sca,
  };
}

function ensureAdmin() {
  if (admin.apps.length) return;
  const saPath = path.resolve(__dirname, 'serviceAccountKey.json');
  if (!fs.existsSync(saPath)) throw new Error(`No existe ${saPath}`);
  const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

async function main() {
  const categoryHtml = await fetchText(CATEGORY_URL);
  const productLinks = extractProductLinksFromCategory(categoryHtml);

  const links = Number.isFinite(LIMIT) ? productLinks.slice(0, LIMIT) : productLinks;
  console.log(`[LAMEXICANA] Category: ${CATEGORY_URL}`);
  console.log(
    `[LAMEXICANA] Products discovered: ${productLinks.length} (processing ${links.length})`
  );

  const cafes = [];
  for (const link of links) {
    const html = await fetchText(link);
    const products = extractJsonLdProducts(html);
    const product = products[0];
    if (!product) {
      console.log('[LAMEXICANA] Sin JSON-LD Product:', link);
      continue;
    }
    cafes.push(mapJsonLdProductToCafe(product, link));
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[LAMEXICANA] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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

  console.log(`[LAMEXICANA] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((err) => {
  console.error('❌', err?.message || err);
  process.exit(1);
});
