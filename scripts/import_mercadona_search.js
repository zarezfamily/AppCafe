/*
  Importa resultados de búsqueda de Mercadona (tienda.mercadona.es) a Firestore.

  Fuente técnica:
    Mercadona usa Algolia para el buscador. El script consulta el índice público
    (search-only) y mapea hits a la colección `cafes`.

  Uso:
    DRY_RUN=true node --env-file=.env scripts/import_mercadona_search.js
    node --env-file=.env scripts/import_mercadona_search.js

  Opcionales:
    QUERY=cafe
    LIMIT=120
    HITS_PER_PAGE=50
    CENTER_CODE=vlc1
    LANG=es
    OUTPUT_JSON=scripts/cafe-import-mercadona-cafe-real.json

  Nota:
    - No hay SCA oficial en Mercadona: se guarda un SCA estimado.
    - Escritura con `firebase-admin` usando `scripts/serviceAccountKey.json`.
*/

const fs = require('fs');
const path = require('path');

const fetch = require('node-fetch');
const admin = require('firebase-admin');

const QUERY = String(process.env.QUERY || 'cafe').trim();
const LIMIT = Number.parseInt(process.env.LIMIT || '', 10);
const HITS_PER_PAGE = Math.max(1, Number.parseInt(process.env.HITS_PER_PAGE || '50', 10) || 50);
const CENTER_CODE = String(process.env.CENTER_CODE || 'vlc1').trim();
const SEARCH_LANG = String(process.env.SEARCH_LANG || 'es').trim();
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

const OUTPUT_JSON =
  process.env.OUTPUT_JSON ||
  path.resolve(process.cwd(), `scripts/cafe-import-mercadona-${QUERY}-real.json`);

const CAFES_COLLECTION = 'cafes';

// Algolia params observed in Mercadona web app (public search-only key).
const ALGOLIA_APP_ID = '7UZJKL1DJ0';
const ALGOLIA_API_KEY = '9d8f2e39e90df472b4f2e559a116fe17';

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

function parsePrice(priceInstructions) {
  const raw = priceInstructions?.unit_price || priceInstructions?.bulk_price || null;
  if (raw === null || raw === undefined) return null;
  const n = Number(String(raw).replace(',', '.'));
  return Number.isFinite(n) ? Number(n.toFixed(2)) : null;
}

function inferFormatFromName(name) {
  const t = normalizeText(name).toLowerCase();
  if (t.includes('cápsul') || t.includes('capsul')) return 'capsules';
  if (t.includes('molido')) return 'ground';
  if (t.includes('grano') || t.includes('en grano')) return 'beans';
  return 'ground';
}

function inferDecaf(name) {
  return normalizeText(name).toLowerCase().includes('descafe');
}

function inferWeightGrams(priceInstructions) {
  const unitSize = Number(priceInstructions?.unit_size || 0);
  const fmt = String(priceInstructions?.size_format || '').toLowerCase();

  if (!Number.isFinite(unitSize) || unitSize <= 0) return null;
  if (fmt === 'kg') return Math.round(unitSize * 1000);
  if (fmt === 'g') return Math.round(unitSize);
  if (fmt === 'l') return null;
  return null;
}

// === SCA (estimado, mismo algoritmo base) ===

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

async function algoliaQuery(indexName, query, page) {
  const url = `https://${ALGOLIA_APP_ID.toLowerCase()}-dsn.algolia.net/1/indexes/${encodeURIComponent(
    indexName
  )}/query`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Algolia-Application-Id': ALGOLIA_APP_ID,
      'X-Algolia-API-Key': ALGOLIA_API_KEY,
    },
    body: JSON.stringify({
      query,
      hitsPerPage: HITS_PER_PAGE,
      page,
    }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`Algolia HTTP_${res.status}: ${JSON.stringify(json).slice(0, 200)}`);
  }
  return json;
}

function mapHitToCafe(hit) {
  const now = new Date().toISOString();
  const displayName = normalizeText(hit?.display_name || '');
  const brand = normalizeText(hit?.brand || '');
  const thumbnail = normalizeText(hit?.thumbnail || '');
  const shareUrl = normalizeText(hit?.share_url || '');

  const format = inferFormatFromName(displayName);
  const price = parsePrice(hit?.price_instructions);
  const weightG = inferWeightGrams(hit?.price_instructions);
  const decaf = inferDecaf(displayName);

  const base = {
    fuente: 'mercadona',
    fuentePais: 'ES',
    fuenteUrl: shareUrl,
    urlProducto: shareUrl,

    nombre: displayName,
    name: displayName,
    marca: brand || 'Mercadona',
    roaster: brand || 'Mercadona',

    mercadonaId: String(hit?.objectID || hit?.id || '').trim(),

    category: 'supermarket',
    coffeeCategory: 'daily',

    formato: format,
    format,

    cantidad: weightG,

    precio: Number.isFinite(price) ? price : null,

    // campos usados por la app para listados / orden
    fecha: now,
    puntuacion: 0,
    votos: 0,

    officialPhoto: thumbnail,
    bestPhoto: thumbnail,
    imageUrl: thumbnail,
    foto: thumbnail,

    decaf,

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
    id: base.mercadonaId ? `mercadona_${base.mercadonaId}` : `mercadona_${slugify(displayName)}`,
    ...base,
    sca: buildScaPayload(base),
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
  const indexName = `products_prod_${CENTER_CODE}_${SEARCH_LANG}`;
  console.log(
    `[MERCADONA] index=${indexName} query="${QUERY}" hitsPerPage=${HITS_PER_PAGE} limit=${Number.isFinite(LIMIT) ? LIMIT : '∞'} dry=${DRY_RUN}`
  );

  const cafes = [];
  let page = 0;
  let nbPages = 1;

  while (page < nbPages) {
    const resp = await algoliaQuery(indexName, QUERY, page);
    nbPages = Number(resp?.nbPages || nbPages);
    const hits = Array.isArray(resp?.hits) ? resp.hits : [];

    for (const hit of hits) {
      cafes.push(mapHitToCafe(hit));
      if (Number.isFinite(LIMIT) && cafes.length >= LIMIT) break;
    }

    if (Number.isFinite(LIMIT) && cafes.length >= LIMIT) break;
    page += 1;
    if (hits.length === 0) break;
    if (page > 200) break;
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(cafes, null, 2), 'utf8');
  console.log(`[MERCADONA] Export JSON: ${OUTPUT_JSON} (${cafes.length} items)`);

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
    if (written % 50 === 0) {
      console.log(`[MERCADONA] Progreso: ${written}/${cafes.length} (dry=${DRY_RUN})`);
    }
  }

  console.log(`[MERCADONA] Done: ${written}/${cafes.length} (dry=${DRY_RUN})`);
}

main().catch((err) => {
  console.error('❌', err?.message || err);
  process.exit(1);
});
