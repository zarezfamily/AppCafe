/*
  Importa un fichero JSON concreto a Firestore usando REST API.

  Uso:
    node --env-file=.env scripts/import_json_to_firestore.js scripts/cafe-import-eci-real-2026-04-21.json

  Requiere:
    EXPO_PUBLIC_FIREBASE_PROJECT_ID
    EXPO_PUBLIC_FIREBASE_API_KEY
    FIREBASE_AUTH_TOKEN

  Opcionales:
    DRY_RUN=true
*/

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const inputArg = process.argv[2];

if (!inputArg) {
  console.error('Uso: node --env-file=.env scripts/import_json_to_firestore.js <ruta-json>');
  process.exit(1);
}

const INPUT_JSON_PATH = path.resolve(process.cwd(), inputArg);
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const FIREBASE_AUTH_TOKEN = process.env.FIREBASE_AUTH_TOKEN || process.env.TOKEN || '';
const DRY_RUN = String(process.env.DRY_RUN || '').toLowerCase() === 'true';

if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
  console.error('Faltan FIREBASE_PROJECT_ID y/o FIREBASE_API_KEY en variables de entorno.');
  process.exit(1);
}

if (!DRY_RUN && !FIREBASE_AUTH_TOKEN) {
  console.error('Falta FIREBASE_AUTH_TOKEN para escribir en Firestore.');
  process.exit(1);
}

if (!fs.existsSync(INPUT_JSON_PATH)) {
  console.error(`No existe el fichero JSON: ${INPUT_JSON_PATH}`);
  process.exit(1);
}

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

function normalizeText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function cleanEan(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/\D/g, '');
  return cleaned.length >= 8 ? cleaned : null;
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function truncateSlug(value, max = 120) {
  return value.length > max ? value.slice(0, max).replace(/-+$/g, '') : value;
}

function buildReadableFallbackId(cafe) {
  const roasterOrBrand = slugify(cafe.roaster || cafe.marca || '');
  const nombre = slugify(cafe.nombre || '');
  const tipoProducto = slugify(cafe.tipoProducto || '');
  const formato = slugify(cafe.formato || '');
  const pais = slugify(cafe.pais || '');

  const parts = [
    roasterOrBrand,
    nombre || tipoProducto,
    !nombre && tipoProducto ? null : tipoProducto,
    formato,
    pais,
  ].filter(Boolean);

  const readable = truncateSlug(parts.join('-'));
  if (readable && readable.length >= 8) return readable;
  return null;
}

function buildHashedFallbackId(cafe) {
  const fuenteUrl = normalizeText(cafe.fuenteUrl || cafe.urlProducto || '');
  const nombre = normalizeText(cafe.nombre || '');
  const roaster = normalizeText(cafe.roaster || cafe.marca || '');
  const formato = normalizeText(cafe.formato || '');
  const tipoProducto = normalizeText(cafe.tipoProducto || '');
  const base = fuenteUrl || [nombre, roaster, formato, tipoProducto].filter(Boolean).join('|');
  const hash = crypto.createHash('sha1').update(base).digest('hex').slice(0, 20);
  return `fallback_${hash}`;
}

function buildDocId(cafe) {
  const ean = cleanEan(cafe.ean || cafe.barcode);
  if (ean) return `ean_${ean}`;
  return buildReadableFallbackId(cafe) || buildHashedFallbackId(cafe);
}

function buildSearchText(cafe) {
  const parts = [
    cafe.nombre,
    cafe.roaster,
    cafe.marca,
    cafe.pais,
    cafe.origen,
    cafe.region,
    cafe.finca,
    cafe.productor,
    cafe.variedad,
    cafe.proceso,
    cafe.tueste,
    cafe.tipoProducto,
    cafe.sistemaCapsula,
    cafe.formato,
    cafe.notas,
    cafe.searchText,
  ];

  return parts
    .filter(Boolean)
    .map((x) => normalizeText(x))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { integerValue: String(val) };
    return { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((item) => toFirestoreValue(item)) } };
  }
  if (typeof val === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(val)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function toFields(obj) {
  const fields = {};
  for (const [key, value] of Object.entries(obj)) fields[key] = toFirestoreValue(value);
  return { fields };
}

function sanitizeCafe(cafe, sourceFile) {
  const ean = cleanEan(cafe.ean || cafe.barcode);
  const barcode = cleanEan(cafe.barcode || cafe.ean);
  const dedupeKey = buildDocId(cafe);
  const nowIso = new Date().toISOString();

  return {
    ...cafe,
    ean,
    barcode,
    eanVerificado: Boolean(cafe.eanVerificado && ean),
    searchText: buildSearchText(cafe),
    normalizedNombre: normalizeText(cafe.nombre),
    normalizedRoaster: normalizeText(cafe.roaster || cafe.marca),
    normalizedMarca: normalizeText(cafe.marca),
    updatedAt: nowIso,
    importMeta: {
      importedAt: nowIso,
      sourceFile,
      sourceType: cafe.fuente || null,
      sourceUrl: cafe.fuenteUrl || cafe.urlProducto || null,
      dedupeKey,
      dedupeMode: ean ? 'ean' : 'fallback_readable',
    },
  };
}

async function firestoreGetDocument(docId) {
  const url = `${BASE_URL}/cafes/${encodeURIComponent(docId)}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    headers: FIREBASE_AUTH_TOKEN
      ? {
          Authorization: `Bearer ${FIREBASE_AUTH_TOKEN}`,
        }
      : undefined,
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`GET ${docId} -> ${res.status}: ${txt.slice(0, 200)}`);
  }

  return res.json();
}

async function firestorePatchDocument(docId, data, createIfMissing) {
  const urlBase = `${BASE_URL}/cafes/${encodeURIComponent(docId)}?key=${FIREBASE_API_KEY}`;
  const url = createIfMissing ? urlBase : `${urlBase}&currentDocument.exists=true`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FIREBASE_AUTH_TOKEN}`,
    },
    body: JSON.stringify(toFields(data)),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PATCH ${docId} -> ${res.status}: ${txt.slice(0, 200)}`);
  }
}

async function run() {
  const raw = fs.readFileSync(INPUT_JSON_PATH, 'utf8');
  const cafes = JSON.parse(raw);

  if (!Array.isArray(cafes)) {
    throw new Error('El JSON de entrada debe contener un array.');
  }

  console.log(`\nArchivo: ${INPUT_JSON_PATH}`);
  console.log(`Lote detectado: ${cafes.length} cafés\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < cafes.length; i++) {
    const cafe = cafes[i];

    try {
      if (!cafe || !cafe.nombre) {
        console.warn(`[${i}] Café inválido: falta nombre. Saltado.`);
        skipped += 1;
        continue;
      }

      const docId = buildDocId(cafe);
      const sourceFile = path.relative(process.cwd(), INPUT_JSON_PATH).replace(/\\/g, '/');
      const data = sanitizeCafe(cafe, sourceFile);

      if (DRY_RUN) {
        console.log(`[DRY] ${cafe.nombre} -> ${docId}`);
        continue;
      }

      const existing = await firestoreGetDocument(docId);

      if (existing) {
        await firestorePatchDocument(docId, data, false);
        console.log(`Actualizado: ${cafe.nombre} -> ${docId}`);
        updated += 1;
      } else {
        await firestorePatchDocument(
          docId,
          {
            ...data,
            createdAt: new Date().toISOString(),
          },
          true
        );
        console.log(`Creado: ${cafe.nombre} -> ${docId}`);
        created += 1;
      }
    } catch (error) {
      console.error(`Error con "${cafe?.nombre || 'sin nombre'}": ${error.message}`);
      errors += 1;
    }
  }

  console.log('\n==============================');
  console.log('Importación completada');
  console.log('==============================');
  console.log(`Creados:      ${created}`);
  console.log(`Actualizados: ${updated}`);
  console.log(`Saltados:     ${skipped}`);
  console.log(`Errores:      ${errors}`);
  console.log('==============================\n');
}

run().catch((error) => {
  console.error('Error fatal en importación:', error.message || error);
  process.exit(1);
});
