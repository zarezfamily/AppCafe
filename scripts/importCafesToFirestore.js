const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

// =========================
// CONFIG
// =========================
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const CAFES_JSON_PATH = path.join(__dirname, 'cafes.json');
const COLLECTION_NAME = 'cafes';

// =========================
// INIT FIREBASE
// =========================
if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
  throw new Error(`No existe serviceAccountKey.json en: ${SERVICE_ACCOUNT_PATH}`);
}

const serviceAccount = require(SERVICE_ACCOUNT_PATH);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// =========================
// HELPERS
// =========================
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

  if (readable && readable.length >= 8) {
    return readable;
  }

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

  if (ean) {
    return `ean_${ean}`;
  }

  const readableFallbackId = buildReadableFallbackId(cafe);
  if (readableFallbackId) {
    return readableFallbackId;
  }

  return buildHashedFallbackId(cafe);
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

function sanitizeCafe(cafe) {
  const ean = cleanEan(cafe.ean || cafe.barcode);
  const barcode = cleanEan(cafe.barcode || cafe.ean);
  const dedupeKey = buildDocId(cafe);
  const now = admin.firestore.FieldValue.serverTimestamp();

  return {
    ...cafe,

    ean,
    barcode,
    eanVerificado: Boolean(cafe.eanVerificado && ean),

    searchText: buildSearchText(cafe),

    normalizedNombre: normalizeText(cafe.nombre),
    normalizedRoaster: normalizeText(cafe.roaster),
    normalizedMarca: normalizeText(cafe.marca),

    importMeta: {
      importedAt: now,
      sourceFile: 'scripts/cafes.json',
      sourceType: cafe.fuente || null,
      sourceUrl: cafe.fuenteUrl || cafe.urlProducto || null,
      dedupeKey,
      dedupeMode: ean ? 'ean' : 'fallback_readable',
    },

    updatedAt: now,
  };
}

async function findExistingDoc(cafe, preferredDocId) {
  const ean = cleanEan(cafe.ean || cafe.barcode);

  if (ean) {
    const byEanSnap = await db.collection(COLLECTION_NAME).where('ean', '==', ean).limit(1).get();

    if (!byEanSnap.empty) {
      return byEanSnap.docs[0];
    }

    const byBarcodeSnap = await db
      .collection(COLLECTION_NAME)
      .where('barcode', '==', ean)
      .limit(1)
      .get();

    if (!byBarcodeSnap.empty) {
      return byBarcodeSnap.docs[0];
    }
  }

  const sourceUrl = cafe.fuenteUrl || cafe.urlProducto || null;
  if (sourceUrl) {
    const byFuenteUrlSnap = await db
      .collection(COLLECTION_NAME)
      .where('fuenteUrl', '==', sourceUrl)
      .limit(1)
      .get();

    if (!byFuenteUrlSnap.empty) {
      return byFuenteUrlSnap.docs[0];
    }

    const byUrlProductoSnap = await db
      .collection(COLLECTION_NAME)
      .where('urlProducto', '==', sourceUrl)
      .limit(1)
      .get();

    if (!byUrlProductoSnap.empty) {
      return byUrlProductoSnap.docs[0];
    }
  }

  const normalizedNombre = normalizeText(cafe.nombre);
  const normalizedRoaster = normalizeText(cafe.roaster || cafe.marca);
  const formato = cafe.formato || null;
  const tipoProducto = cafe.tipoProducto || null;

  if (normalizedNombre && normalizedRoaster) {
    const byNormalizedSnap = await db
      .collection(COLLECTION_NAME)
      .where('normalizedNombre', '==', normalizedNombre)
      .where('normalizedRoaster', '==', normalizedRoaster)
      .limit(10)
      .get();

    if (!byNormalizedSnap.empty) {
      const exactDoc =
        byNormalizedSnap.docs.find((doc) => {
          const data = doc.data() || {};
          return (data.formato || null) === formato && (data.tipoProducto || null) === tipoProducto;
        }) || byNormalizedSnap.docs[0];

      return exactDoc;
    }
  }

  const directDoc = await db.collection(COLLECTION_NAME).doc(preferredDocId).get();
  if (directDoc.exists) {
    return directDoc;
  }

  return null;
}

async function checkDuplicatesInsideJson(cafes) {
  const seen = new Map();

  for (const cafe of cafes) {
    const key = buildDocId(cafe);
    if (seen.has(key)) {
      console.warn(
        `⚠️ Duplicado dentro de cafes.json: "${cafe.nombre}" y "${seen.get(key)}" -> ${key}`
      );
    } else {
      seen.set(key, cafe.nombre || '(sin nombre)');
    }
  }
}

// =========================
// IMPORT
// =========================
async function run() {
  if (!fs.existsSync(CAFES_JSON_PATH)) {
    throw new Error(`No existe cafes.json en: ${CAFES_JSON_PATH}`);
  }

  const raw = fs.readFileSync(CAFES_JSON_PATH, 'utf8');
  const cafes = JSON.parse(raw);

  if (!Array.isArray(cafes)) {
    throw new Error('cafes.json debe contener un array JSON');
  }

  console.log(`\n☕ Cafés leídos: ${cafes.length}\n`);

  await checkDuplicatesInsideJson(cafes);

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < cafes.length; i++) {
    const cafe = cafes[i];

    try {
      if (!cafe || !cafe.nombre) {
        console.warn(`⚠️ [${i}] Café inválido: falta nombre. Saltado.`);
        skipped++;
        continue;
      }

      const preferredDocId = buildDocId(cafe);
      const existingDoc = await findExistingDoc(cafe, preferredDocId);
      const data = sanitizeCafe(cafe);

      if (existingDoc) {
        await db
          .collection(COLLECTION_NAME)
          .doc(existingDoc.id)
          .set(
            {
              ...data,
              createdAt:
                existingDoc.get('createdAt') || admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );

        console.log(`🔁 Actualizado: ${cafe.nombre} -> ${existingDoc.id}`);
        updated++;
      } else {
        await db
          .collection(COLLECTION_NAME)
          .doc(preferredDocId)
          .set({
            ...data,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        console.log(`✅ Creado: ${cafe.nombre} -> ${preferredDocId}`);
        created++;
      }
    } catch (error) {
      console.error(`❌ Error con "${cafe?.nombre || 'sin nombre'}":`, error.message);
      errors++;
    }
  }

  console.log('\n==============================');
  console.log('Importación completada');
  console.log('==============================');
  console.log(`✅ Creados:      ${created}`);
  console.log(`🔁 Actualizados: ${updated}`);
  console.log(`⏭️ Saltados:    ${skipped}`);
  console.log(`❌ Errores:      ${errors}`);
  console.log('==============================\n');
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error fatal en importación:', error);
    process.exit(1);
  });
