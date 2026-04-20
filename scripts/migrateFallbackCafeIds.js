const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

// =========================
// CONFIG
// =========================
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const COLLECTION_NAME = 'cafes';
const DRY_RUN = false; // pon true para simular sin escribir nada

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

function buildPreferredDocId(cafe) {
  const ean = cleanEan(cafe.ean || cafe.barcode);

  if (ean) {
    return `ean_${ean}`;
  }

  return buildReadableFallbackId(cafe) || buildHashedFallbackId(cafe);
}

async function migrateOneDoc(doc) {
  const oldId = doc.id;
  const data = doc.data() || {};
  const newId = buildPreferredDocId(data);

  if (!oldId.startsWith('fallback_')) {
    return { status: 'skip_not_fallback', oldId, newId };
  }

  if (!newId || newId === oldId) {
    return { status: 'skip_same_id', oldId, newId };
  }

  const newRef = db.collection(COLLECTION_NAME).doc(newId);
  const newSnap = await newRef.get();

  if (newSnap.exists) {
    return { status: 'skip_target_exists', oldId, newId };
  }

  const batch = db.batch();

  const migratedData = {
    ...data,
    legacyId: oldId,
    migratedFromId: oldId,
    migratedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  batch.set(newRef, migratedData, { merge: true });
  batch.delete(doc.ref);

  if (DRY_RUN) {
    return { status: 'dry_run', oldId, newId };
  }

  await batch.commit();
  return { status: 'migrated', oldId, newId };
}

async function run() {
  console.log(`\n🚀 Iniciando migración de IDs fallback en colección "${COLLECTION_NAME}"`);
  console.log(`🧪 DRY_RUN: ${DRY_RUN ? 'true' : 'false'}\n`);

  const snap = await db.collection(COLLECTION_NAME).get();

  let migrated = 0;
  let skippedNotFallback = 0;
  let skippedSameId = 0;
  let skippedTargetExists = 0;
  let dryRunCount = 0;
  let errors = 0;

  for (const doc of snap.docs) {
    try {
      const result = await migrateOneDoc(doc);

      if (result.status === 'migrated') {
        console.log(`✅ Migrado: ${result.oldId} -> ${result.newId}`);
        migrated++;
      } else if (result.status === 'dry_run') {
        console.log(`🧪 Simulación: ${result.oldId} -> ${result.newId}`);
        dryRunCount++;
      } else if (result.status === 'skip_not_fallback') {
        skippedNotFallback++;
      } else if (result.status === 'skip_same_id') {
        console.log(`⏭️ Sin cambio: ${result.oldId}`);
        skippedSameId++;
      } else if (result.status === 'skip_target_exists') {
        console.log(`⚠️ Destino ya existe: ${result.oldId} -> ${result.newId}`);
        skippedTargetExists++;
      }
    } catch (error) {
      console.error(`❌ Error migrando ${doc.id}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n==============================');
  console.log('Migración completada');
  console.log('==============================');
  console.log(`✅ Migrados:            ${migrated}`);
  console.log(`🧪 Simulados:           ${dryRunCount}`);
  console.log(`⏭️ No fallback:         ${skippedNotFallback}`);
  console.log(`⏭️ Sin cambio:          ${skippedSameId}`);
  console.log(`⚠️ Destino ya existe:   ${skippedTargetExists}`);
  console.log(`❌ Errores:             ${errors}`);
  console.log('==============================\n');
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error fatal en migración:', error);
    process.exit(1);
  });
