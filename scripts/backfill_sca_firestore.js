/*
  Backfill / recalcula el campo `sca` en todos los cafés de Firestore (REST API).

  Uso:
    npm run cafes:sca:dry
    npm run cafes:sca:backfill

  Requiere (en .env):
    EXPO_PUBLIC_FIREBASE_PROJECT_ID
    EXPO_PUBLIC_FIREBASE_API_KEY
    FIREBASE_AUTH_TOKEN

  Opcionales:
    DRY_RUN=true            -> no escribe (solo reporta)
    FORCE=true              -> recalcula aunque ya exista `sca`
    LIMIT=500               -> limita nº de docs procesados
    PAGE_SIZE=300           -> tamaño de página al listar docs
*/

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const FIREBASE_AUTH_TOKEN = process.env.FIREBASE_AUTH_TOKEN || process.env.TOKEN || '';

const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';
const FORCE = String(process.env.FORCE || '').toLowerCase() === 'true';
const LIMIT = Number.parseInt(process.env.LIMIT || '', 10);
const PAGE_SIZE = Math.max(1, Number.parseInt(process.env.PAGE_SIZE || '300', 10) || 300);

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const CAFES_COLLECTION = 'cafes';

const authHeaders = () => ({
  Authorization: `Bearer ${FIREBASE_AUTH_TOKEN}`,
  'Content-Type': 'application/json',
});

const toFirestoreValue = (val) => {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toFirestoreValue) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      fields[k] = toFirestoreValue(v);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
};

const fromFirestoreValue = (val) => {
  if (!val || typeof val !== 'object') return null;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) return (val.arrayValue?.values || []).map(fromFirestoreValue);
  if ('mapValue' in val) {
    const obj = {};
    for (const [k, v] of Object.entries(val.mapValue?.fields || {})) {
      obj[k] = fromFirestoreValue(v);
    }
    return obj;
  }
  return null;
};

const docToObject = (doc) => {
  if (!doc?.fields) return { id: doc?.name?.split('/').pop() || '' };
  const obj = {};
  for (const [key, val] of Object.entries(doc.fields)) {
    obj[key] = fromFirestoreValue(val);
  }
  obj.id = doc.name?.split('/').pop();
  return obj;
};

const toFields = (obj) => {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    fields[key] = toFirestoreValue(val);
  }
  return { fields };
};

function normalizeEan(raw) {
  return String(raw || '')
    .replace(/\D/g, '')
    .trim();
}

function normalizeText(value) {
  return String(value || '').trim();
}

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

const CATEGORY_VALUES = ['specialty', 'supermarket', 'bio'];
const FORMAT_VALUES = ['beans', 'ground', 'capsules'];
const ROAST_LEVEL_VALUES = ['light', 'medium', 'dark'];
const SPECIES_VALUES = ['arabica', 'robusta', 'blend'];

function sanitizeCafePayload(payload = {}) {
  const ean = normalizeEan(payload.ean || payload.normalizedEan);

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
    imageUrl,
    foto: imageUrl,
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

  return {
    ...sca,
    lastCalculatedAt: new Date().toISOString(),
  };
}

function hasValidSca(cafe) {
  if (!cafe || typeof cafe !== 'object') return false;
  if (!cafe.sca || typeof cafe.sca !== 'object') return false;
  if (cafe.sca.score === null || cafe.sca.score === undefined) return false;
  return true;
}

async function listCafes(pageToken = null) {
  const params = new URLSearchParams({
    key: FIREBASE_API_KEY,
    pageSize: String(PAGE_SIZE),
  });
  if (pageToken) params.set('pageToken', pageToken);

  const url = `${BASE_URL}/${CAFES_COLLECTION}?${params.toString()}`;
  const res = await fetch(url, { headers: authHeaders() });
  const txt = await res.text();

  if (!res.ok) {
    throw new Error(`listCafes -> ${res.status} ${txt.substring(0, 220)}`);
  }

  const json = txt ? JSON.parse(txt) : {};
  return {
    documents: json.documents || [],
    nextPageToken: json.nextPageToken || null,
  };
}

async function patchCafeSca(docId, scaPayload) {
  const params = new URLSearchParams({ key: FIREBASE_API_KEY });
  params.append('updateMask.fieldPaths', 'sca');

  const url = `${BASE_URL}/${CAFES_COLLECTION}/${encodeURIComponent(docId)}?${params.toString()}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(toFields({ sca: scaPayload })),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`patchCafeSca(${docId}) -> ${res.status} ${txt.substring(0, 220)}`);
  }
}

function findServiceAccountPath() {
  const candidates = [
    path.resolve(__dirname, 'serviceAccountKey.json'),
    path.resolve(process.cwd(), 'serviceAccountKey.json'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const HAS_SERVICE_ACCOUNT = Boolean(findServiceAccountPath());

if (!HAS_SERVICE_ACCOUNT && (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY)) {
  console.error(
    'Faltan FIREBASE_PROJECT_ID y/o FIREBASE_API_KEY (o EXPO_PUBLIC_*) en variables de entorno.'
  );
  process.exit(1);
}

async function makeAdminClient() {
  // Lazy-require para no cargar firebase-admin si no hace falta.
  const admin = require('firebase-admin');

  if (!admin.apps.length) {
    const serviceAccountPath = findServiceAccountPath();
    if (!serviceAccountPath) {
      throw new Error('No se encontró `serviceAccountKey.json` (ni en `scripts/` ni en la raíz).');
    }

    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }

  const db = admin.firestore();

  const listPage = async (cursor = null) => {
    let q = db
      .collection(CAFES_COLLECTION)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(PAGE_SIZE);
    if (cursor) q = q.startAfter(cursor);

    const snap = await q.get();
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const nextCursor = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
    return { docs, cursor: nextCursor };
  };

  const patchSca = async (docId, scaPayload) => {
    await db.collection(CAFES_COLLECTION).doc(docId).update({ sca: scaPayload });
  };

  return { mode: 'admin', listPage, patchSca };
}

function makeRestClient() {
  if (!FIREBASE_AUTH_TOKEN) {
    throw new Error('Falta `FIREBASE_AUTH_TOKEN` para usar el modo REST.');
  }

  const listPage = async (pageToken = null) => {
    const page = await listCafes(pageToken);
    return {
      docs: page.documents.map(docToObject),
      cursor: page.nextPageToken || null,
    };
  };

  const patchSca = async (docId, scaPayload) => patchCafeSca(docId, scaPayload);

  return { mode: 'rest', listPage, patchSca };
}

async function main() {
  const serviceAccountPath = findServiceAccountPath();
  const canUseAdmin = Boolean(serviceAccountPath);

  let client;
  if (canUseAdmin) {
    client = await makeAdminClient();
  } else {
    client = makeRestClient();
  }

  console.log(
    `[SCA] Modo: ${client.mode}${client.mode === 'admin' ? ` (${serviceAccountPath})` : ''}`
  );
  console.log(
    `[SCA] Iniciando backfill (dry=${DRY_RUN}, force=${FORCE}, pageSize=${PAGE_SIZE}, limit=${Number.isFinite(LIMIT) ? LIMIT : '∞'})`
  );

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  let cursor = null;
  while (true) {
    const page = await client.listPage(cursor);
    const cafes = page.docs;
    cursor = page.cursor;

    if (!cafes.length) break;

    for (const cafe of cafes) {
      if (Number.isFinite(LIMIT) && processed >= LIMIT) {
        console.log('[SCA] Limit alcanzado.');
        console.log({ processed, updated, skipped, failed });
        return;
      }

      processed += 1;

      const shouldUpdate = FORCE || !hasValidSca(cafe);

      if (!shouldUpdate) {
        skipped += 1;
        continue;
      }

      try {
        const scaPayload = buildScaPayload(cafe);
        if (!DRY_RUN) {
          await client.patchSca(cafe.id, scaPayload);
        }
        updated += 1;
      } catch (error) {
        failed += 1;
        console.log('[SCA] Error en doc:', cafe?.id || '(sin id)', String(error?.message || error));
      }

      if (processed % 100 === 0) {
        console.log('[SCA] Progreso:', { processed, updated, skipped, failed });
      }
    }

    if (!cursor) break;
  }

  console.log('[SCA] Finalizado:', { processed, updated, skipped, failed });
}

main().catch((err) => {
  console.error('❌ Error:', err?.message || err);
  process.exit(1);
});
