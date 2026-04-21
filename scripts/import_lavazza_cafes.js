/*
  Importa cafés de Lavazza España (lavazza.es) a Firestore.

  Fuente (categoría):
    https://www.lavazza.es/es/cafe-en-grano

  Estrategia:
    - Se extraen las cards (<article class="lvz-product-card">) del listado.
    - Se obtienen variantes (data-variants) => IDs "athena".
    - Se enriquece con el API público de Lavazza:
        https://servicecommerce.lavazza.com/rest/v2/lavazzastoreES/products/athena/prices?products=<ids>
      (incluye GTIN/EAN, tamaño y datos técnicos; no siempre incluye precio).
    - Se escribe en `cafes` con `firebase-admin` usando `scripts/serviceAccountKey.json`.

  Uso:
    DRY_RUN=true node --env-file=.env scripts/import_lavazza_cafes.js
    node --env-file=.env scripts/import_lavazza_cafes.js

  Opcionales:
    CATEGORY_URL=https://www.lavazza.es/es/cafe-en-grano
    LIMIT=50
    OUTPUT_JSON=scripts/cafe-import-lavazza-grano-real.json

  Nota importante:
    - En lavazza.es (ES) estos productos suelen ser "where to buy" (no compra online),
      por lo que el API no devuelve precio. Se guarda `precio: null` (dato real).
    - SCA: Lavazza no expone SCA oficial; se calcula un SCA estimado.
*/

const fs = require('fs');
const path = require('path');

const fetch = require('node-fetch');
const admin = require('firebase-admin');

const CATEGORY_URL = process.env.CATEGORY_URL || 'https://www.lavazza.es/es/cafe-en-grano';
const OUTPUT_JSON =
  process.env.OUTPUT_JSON ||
  path.resolve(process.cwd(), 'scripts/cafe-import-lavazza-grano-real.json');
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const LIMIT = Number.parseInt(process.env.LIMIT || '', 10);

const BASE_SITE = 'https://www.lavazza.es';
const SERVICE_BASE = 'https://servicecommerce.lavazza.com/rest/v2/lavazzastoreES/products/athena';
const CAFES_COLLECTION = 'cafes';

function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
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

function decodeHtmlEntities(value) {
  const s = String(value || '');
  if (!s) return '';

  return s
    .replace(/&#34;/g, '"')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, num) => {
      const n = Number(num);
      return Number.isFinite(n) ? String.fromCharCode(n) : _;
    });
}

function toAbsoluteUrl(urlOrPath) {
  const raw = normalizeText(urlOrPath);
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return `${BASE_SITE}${raw}`;
  return raw;
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

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'etiove-import/1.0 (+local script)',
      Accept: 'application/json',
    },
    redirect: 'follow',
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`HTTP_${res.status} ${txt.slice(0, 200)}`);
  try {
    return JSON.parse(txt);
  } catch {
    throw new Error(`JSON_PARSE_ERROR: ${url}`);
  }
}

function extractAttributes(tagHtml) {
  const attrs = {};
  const tag = String(tagHtml || '');
  for (const m of tag.matchAll(/([a-zA-Z0-9_:-]+)=\"([^\"]*)\"/g)) {
    attrs[m[1]] = decodeHtmlEntities(m[2]);
  }
  return attrs;
}

function extractProductCardsFromCategory(html) {
  const blocks = [
    ...String(html || '').matchAll(
      /<article[^>]+class=\"[^\"]*lvz-product-card[\s\S]*?<\/article>/gi
    ),
  ].map((m) => m[0]);

  const cards = [];
  for (const block of blocks) {
    const openTag = block.match(/<article[^>]*>/i)?.[0] || '';
    const attrs = extractAttributes(openTag);

    const href = block.match(/href=\"([^\"]+)\"/i)?.[1] || '';
    const img = block.match(/<img[^>]+src=\"([^\"]+)\"/i)?.[1] || '';

    const rawVariants = attrs['data-variants'] || '';
    let variants = [];
    if (rawVariants) {
      try {
        const parsed = JSON.parse(rawVariants);
        if (Array.isArray(parsed)) variants = parsed.map((v) => String(v));
      } catch {
        // fallback: digits
        variants = [...rawVariants.matchAll(/\d+/g)].map((m) => String(m[0]));
      }
    }

    const defaultVariant = String(attrs['data-default-variant'] || '').trim();
    if (defaultVariant && !variants.includes(defaultVariant)) variants.unshift(defaultVariant);

    const productPath = normalizeText(href);
    const productUrl = productPath ? toAbsoluteUrl(productPath) : '';

    cards.push({
      productPath,
      productUrl,
      productName: normalizeText(attrs['data-product-name'] || ''),
      categoryLabel: normalizeText(attrs['data-category'] || ''),
      baseCode: normalizeText(attrs['data-base-code'] || ''),
      collection: normalizeText(attrs['data-collection'] || ''),
      formatLabel: normalizeText(attrs['data-format'] || ''),
      intensityLabel: normalizeText(attrs['data-intensity'] || ''),
      packSizeLabel: normalizeText(attrs['data-packsize'] || ''),
      blendLabel: normalizeText(attrs['data-blend'] || ''),
      aromaticNotesLabel: normalizeText(attrs['data-aromaticnotes'] || ''),
      preparationLabel: normalizeText(attrs['data-preparation'] || ''),
      roastLabel: normalizeText(attrs['data-roast'] || ''),
      imageUrl: toAbsoluteUrl(img),
      descripcion: '',
      description: '',
      jsonLdImages: [],
      variants: variants.filter(Boolean),
    });
  }

  return cards;
}

function extractJsonLdProducts(html) {
  const scripts = [
    ...String(html || '').matchAll(
      /<script[^>]+type=\"application\/ld\+json\"[^>]*>([\s\S]*?)<\/script>/gi
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
      if (json?.['@type'] === 'Product') products.push(json);
    } catch {
      // ignore
    }
  }
  return products;
}

async function enrichCardsWithJsonLd(cards) {
  const uniqueUrls = [...new Set(cards.map((c) => c.productUrl).filter(Boolean))];
  const byUrl = new Map();

  for (const url of uniqueUrls) {
    try {
      const html = await fetchText(url);
      const products = extractJsonLdProducts(html);
      const product = products[0] || null;
      if (!product) continue;

      const descripcion = normalizeText(product?.description || '');
      const name = normalizeText(product?.name || '');

      const images = Array.isArray(product?.image)
        ? product.image
        : product?.image
          ? [product.image]
          : [];

      byUrl.set(url, {
        name,
        descripcion,
        images: images.map(toAbsoluteUrl).filter(Boolean),
      });
    } catch (err) {
      console.warn(`[LAVAZZA] JSON-LD fallo en ${url}: ${err?.message || err}`);
    }
  }

  for (const card of cards) {
    const extra = byUrl.get(card.productUrl);
    if (!extra) continue;
    if (extra.name && !card.productName) card.productName = extra.name;
    card.descripcion = extra.descripcion || '';
    card.description = extra.descripcion || '';
    card.jsonLdImages = Array.isArray(extra.images) ? extra.images : [];
  }
}

function parseIntensity(intensityLabel) {
  const t = normalizeText(intensityLabel);
  if (!t) return null;
  const m = t.match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = Number(String(m[1]).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parseWeightGramsFromSizeLabel(sizeLabel) {
  const t = normalizeText(sizeLabel).toLowerCase();
  if (!t) return null;
  const kg = t.match(/(\d+(?:[.,]\d+)?)\s*kg/);
  if (kg) return Math.round(parseFloat(kg[1].replace(',', '.')) * 1000);
  const g = t.match(/(\d+(?:[.,]\d+)?)\s*g/);
  if (g) return Math.round(parseFloat(g[1].replace(',', '.')));
  return null;
}

function inferFormatFromCard(card) {
  const t = [
    card?.formatLabel,
    card?.categoryLabel,
    card?.productUrl,
    card?.productPath,
    card?.productName,
  ]
    .map((v) => normalizeText(v).toLowerCase())
    .join(' ');

  if (
    t.includes('cápsul') ||
    t.includes('capsul') ||
    t.includes('capsula') ||
    t.includes('capsule')
  )
    return 'capsules';
  if (t.includes('molido')) return 'ground';
  if (t.includes('en grano') || t.includes('grano') || t.includes('beans')) return 'beans';
  return 'beans';
}

function inferRoastLevel(roastLabel) {
  const t = normalizeText(roastLabel).toLowerCase();
  if (!t) return '';
  if (t.includes('claro')) return 'light';
  if (t.includes('medio') || t.includes('médio') || t.includes('medium')) return 'medium';
  if (t.includes('oscuro') || t.includes('scuro') || t.includes('dark')) return 'dark';
  return '';
}

function inferSpeciesFromBlend(blendLabel) {
  const t = normalizeText(blendLabel).toLowerCase();
  if (!t) return '';
  const hasArabica = t.includes('arábica') || t.includes('arabica');
  const hasRobusta = t.includes('robusta');
  if (hasArabica && hasRobusta) return 'blend';
  if (hasArabica) return 'arabica';
  if (hasRobusta) return 'robusta';
  return 'blend';
}

function inferDecafFromText(text) {
  return /\bdescafe/i.test(String(text || ''));
}

async function fetchAthenaPricesByIds(ids) {
  if (!ids.length) return new Map();
  const url = `${SERVICE_BASE}/prices?products=${encodeURIComponent(ids.join(','))}`;
  const json = await fetchJson(url);
  const products = Array.isArray(json?.products) ? json.products : [];
  const map = new Map();
  for (const p of products) {
    const code = String(p?.code || '').trim();
    if (!code) continue;
    map.set(code, p);
  }
  return map;
}

function ensureAdmin() {
  if (admin.apps.length) return;
  const saPath = path.resolve(__dirname, 'serviceAccountKey.json');
  if (!fs.existsSync(saPath)) throw new Error(`No existe ${saPath}`);
  const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

// === SCA (estimado, mismo algoritmo base usado en otros imports) ===

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

function cleanEan(value) {
  const cleaned = String(value || '').replace(/\D/g, '');
  return cleaned.length >= 8 ? cleaned : '';
}

function sanitizeCafePayload(payload = {}) {
  const ean = cleanEan(payload.ean || payload.normalizedEan);

  const name = normalizeText(getLegacyAwareValue(payload, ['name', 'nombre']));
  const roaster = normalizeText(getLegacyAwareValue(payload, ['roaster', 'marca']));
  const origin = normalizeText(getLegacyAwareValue(payload, ['origin', 'origen', 'pais']));
  const process = normalizeText(getLegacyAwareValue(payload, ['process', 'proceso']));
  const variety = normalizeText(getLegacyAwareValue(payload, ['variety', 'variedad']));
  const notes = normalizeText(getLegacyAwareValue(payload, ['notes', 'notas']));
  const imageUrl = normalizeText(
    getLegacyAwareValue(payload, ['imageUrl', 'bestPhoto', 'officialPhoto', 'foto', 'image'])
  );

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
    roaster,
    origin,
    process,
    variety,
    notes,
    imageUrl,
    category,
    coffeeCategory:
      category === 'supermarket' ? 'daily' : category === 'specialty' ? 'specialty' : '',
    format,
    roastLevel,
    species,
    altitude,
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
    reasons.push('Marca identificada');
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

function buildCafeDocId(variantId, ean, name) {
  const clean = cleanEan(ean);
  if (clean) return `lavazza_${clean}`;
  if (variantId) return `lavazza_${variantId}`;
  return `lavazza_${slugify(name || 'cafe')}`;
}

function mergeVariantName(baseName, sizeLabel) {
  const name = normalizeText(baseName);
  const size = normalizeText(sizeLabel);
  if (!name) return size || '';
  if (!size) return name;
  if (name.toLowerCase().includes(size.toLowerCase())) return name;
  return `${name} (${size})`;
}

function mapCardVariantToCafe(card, variantId, priceInfo, now) {
  const variantSize = normalizeText(priceInfo?.size || '');
  const gtin = cleanEan(priceInfo?.gtin || '');

  const weightG =
    parseWeightGramsFromSizeLabel(variantSize) ||
    parseWeightGramsFromSizeLabel(card.packSizeLabel) ||
    null;

  const intensity =
    parseIntensity(priceInfo?.athenaIntensity) || parseIntensity(card.intensityLabel) || null;

  const officialPhoto =
    toAbsoluteUrl(priceInfo?.athenaImageProduct) ||
    card.imageUrl ||
    normalizeText(card.jsonLdImages?.[0] || '');

  const roastLevel = inferRoastLevel(card.roastLabel);
  const species = inferSpeciesFromBlend(card.blendLabel);

  const format = inferFormatFromCard(card);
  const sizeLabelForName =
    format === 'capsules' && /^\d+$/.test(variantSize) ? `${variantSize} cápsulas` : variantSize;
  const nombre = mergeVariantName(card.productName || '', sizeLabelForName);

  const base = {
    fuente: 'lavazza',
    fuentePais: 'ES',
    fuenteUrl: card.productUrl || CATEGORY_URL,
    urlProducto: card.productUrl || CATEGORY_URL,

    nombre,
    name: nombre,
    marca: 'Lavazza',
    roaster: 'Lavazza',

    ean: gtin,
    normalizedEan: gtin,

    lavazzaVariantId: String(variantId || '').trim(),
    lavazzaBaseCode: card.baseCode || '',
    lavazzaCollection: card.collection || '',

    descripcion: card.descripcion || '',
    description: card.description || '',

    category: 'supermarket',
    coffeeCategory: 'daily',

    formato: format,
    format,

    cantidad: Number.isFinite(weightG) ? weightG : null,
    precio: null,

    intensidad: Number.isFinite(intensity) ? Math.round(intensity) : null,

    notas: card.aromaticNotesLabel || '',
    notes: card.aromaticNotesLabel || '',

    preparacion: card.preparationLabel || '',
    roastLevel,
    tueste: roastLevel,
    species,
    blend: species === 'blend',

    certificaciones: '',
    isBio: false,
    decaf: inferDecafFromText(nombre) || inferDecafFromText(card.productName) || false,

    // campos usados por la app para listados / orden
    fecha: now,
    puntuacion: 0,
    votos: 0,

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

  return {
    id: buildCafeDocId(String(variantId || ''), gtin, nombre),
    ...base,
    sca: buildScaPayload(base),
  };
}

async function main() {
  const categoryHtml = await fetchText(CATEGORY_URL);
  const cards = extractProductCardsFromCategory(categoryHtml);
  await enrichCardsWithJsonLd(cards);
  const uniqueVariantIds = [
    ...new Set(
      cards
        .flatMap((c) => c.variants)
        .map((v) => String(v).trim())
        .filter(Boolean)
    ),
  ];

  const variantIds = Number.isFinite(LIMIT) ? uniqueVariantIds.slice(0, LIMIT) : uniqueVariantIds;

  console.log(`[LAVAZZA] Category: ${CATEGORY_URL}`);
  console.log(`[LAVAZZA] Products discovered: ${cards.length}`);
  console.log(
    `[LAVAZZA] Variants discovered: ${uniqueVariantIds.length} (processing ${variantIds.length}) dry=${DRY_RUN}`
  );

  const pricesById = await fetchAthenaPricesByIds(variantIds);

  const now = new Date().toISOString();
  const cafes = [];

  for (const variantId of variantIds) {
    const card = cards.find((c) => c.variants.includes(String(variantId)));
    if (!card) continue;
    const priceInfo = pricesById.get(String(variantId)) || null;
    cafes.push(mapCardVariantToCafe(card, variantId, priceInfo, now));
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[LAVAZZA] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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
    if (written % 25 === 0) {
      console.log(`[LAVAZZA] Progreso: ${written}/${cafes.length} (dry=${DRY_RUN})`);
    }
  }

  console.log(`[LAVAZZA] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((err) => {
  console.error('[LAVAZZA] Error:', err?.stack || err);
  process.exit(1);
});
