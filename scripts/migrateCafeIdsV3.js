const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const admin = require('firebase-admin');

// =========================
// CONFIG
// =========================
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const COLLECTION_NAME = 'cafes';
const DRY_RUN = true; // primero true, luego false

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

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function truncateSlug(value, max = 90) {
  return value.length > max ? value.slice(0, max).replace(/-+$/g, '') : value;
}

function cleanEan(value) {
  if (!value) return null;
  const cleaned = String(value).replace(/\D/g, '');
  return cleaned.length >= 8 ? cleaned : null;
}

function dedupeParts(parts) {
  const out = [];
  for (const part of parts) {
    if (!part) continue;
    if (out[out.length - 1] !== part) {
      out.push(part);
    }
  }
  return out;
}

function normalizeTipoProducto(tipoProducto) {
  const slug = slugify(tipoProducto);

  const map = {
    cafe_en_grano: 'cafe-en-grano',
    cafe_molido: 'cafe-molido',
    capsulas: 'capsulas',
    cafe: 'cafe',
  };

  return map[slug] || slug;
}

function normalizeNombreForId(nombre, tipoProducto) {
  let slug = slugify(nombre);

  if (!slug) return '';

  const tipo = normalizeTipoProducto(tipoProducto);

  const cleanupPatterns = [/^cafe-en-grano-/, /^cafe-molido-/, /^capsulas-/, /^cafe-/];

  for (const pattern of cleanupPatterns) {
    slug = slug.replace(pattern, '');
  }

  if (tipo === 'capsulas') {
    slug = slug.replace(/^espresso-/, 'espresso');
  }

  return slug.replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
}

function buildReadableFallbackId(cafe) {
  const roasterOrBrand = slugify(cafe.roaster || cafe.marca || '');
  const tipoProducto = normalizeTipoProducto(cafe.tipoProducto || '');
  const nombre = normalizeNombreForId(cafe.nombre || '', cafe.tipoProducto || '');
  const pais = slugify(cafe.pais || '');

  let parts = [];

  if (roasterOrBrand) parts.push(roasterOrBrand);
  if (tipoProducto) parts.push(tipoProducto);
  if (nombre) parts.push(nombre);

  const joinedWithoutCountry = dedupeParts(parts).join('-');

  const shouldAddCountry = pais && !joinedWithoutCountry.includes(pais) && !nombre.includes(pais);

  if (shouldAddCountry) {
    parts.push(pais);
  }

  parts = dedupeParts(parts);

  let readable = parts.join('-');

  readable = readable
    .replace(/capsulas-capsulas/g, 'capsulas')
    .replace(/cafe-en-grano-cafe-en-grano/g, 'cafe-en-grano')
    .replace(/cafe-molido-cafe-molido/g, 'cafe-molido')
    .replace(/cafe-cafe/g, 'cafe')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');

  readable = truncateSlug(readable);

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

// =========================
// MIGRATION
// =========================
async function migrateOneDoc(doc) {
  const oldId = doc.id;
  const data = doc.data() || {};
  const newId = buildPreferredDocId(data);

  if (!newId || newId === oldId) {
    return { status: 'skip_same_id', oldId, newId };
  }

  const targetRef = db.collection(COLLECTION_NAME).doc(newId);
  const targetSnap = await targetRef.get();

  if (targetSnap.exists) {
    return { status: 'skip_target_exists', oldId, newId };
  }

  const batch = db.batch();

  const migratedData = {
    ...data,
    legacyId: data.legacyId || oldId,
    migratedFromId: oldId,
    migratedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  batch.set(targetRef, migratedData, { merge: true });
  batch.delete(doc.ref);

  if (DRY_RUN) {
    return { status: 'dry_run', oldId, newId };
  }

  await batch.commit();
  return { status: 'migrated', oldId, newId };
}

async function run() {
  console.log(`\n🚀 Iniciando migración v3 de IDs en "${COLLECTION_NAME}"`);
  console.log(`🧪 DRY_RUN: ${DRY_RUN ? 'true' : 'false'}\n`);

  const snap = await db.collection(COLLECTION_NAME).get();

  let migrated = 0;
  let dryRunCount = 0;
  let skipped = 0;
  let targetExists = 0;
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
      } else if (result.status === 'skip_same_id') {
        skipped++;
      } else if (result.status === 'skip_target_exists') {
        console.log(`⚠️ Destino ya existe: ${result.oldId} -> ${result.newId}`);
        targetExists++;
      }
    } catch (error) {
      console.error(`❌ Error migrando ${doc.id}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n==============================');
  console.log('Migración v3 completada');
  console.log('==============================');
  console.log(`✅ Migrados:           ${migrated}`);
  console.log(`🧪 Simulados:          ${dryRunCount}`);
  console.log(`⏭️ Sin cambio:         ${skipped}`);
  console.log(`⚠️ Destino existente:  ${targetExists}`);
  console.log(`❌ Errores:            ${errors}`);
  console.log('==============================\n');
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error fatal en migración v3:', error);
    process.exit(1);
  });
