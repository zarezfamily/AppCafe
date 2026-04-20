const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// =========================
// CONFIG
// =========================
const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const COLLECTION_NAME = 'cafes';
const DRY_RUN = true; // ⚠️ primero true, luego false

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
// IDS A LIMPIAR
// =========================
const ID_MAP = {
  'hacendado-cafe-en-grano-colombia-cafe-en-grano-1kg-colombia': 'hacendado-cafe-en-grano-colombia',
  'hacendado-cafe-en-grano-fuerte-cafe-en-grano-1kg': 'hacendado-cafe-en-grano-fuerte',
  'hacendado-cafe-molido-colombia-cafe-molido-250g-colombia': 'hacendado-cafe-molido-colombia',
  'hacendado-cafe-molido-mezcla-fuerte-cafe-molido-250g': 'hacendado-cafe-molido-mezcla-fuerte',
  'hacendado-cafe-molido-natural-cafe-molido-250g': 'hacendado-cafe-molido-natural',
  'hacendado-capsulas-colombia-capsulas-colombia': 'hacendado-capsulas-colombia',
  'hacendado-capsulas-descafeinado-capsulas': 'hacendado-capsulas-descafeinado',
  'hacendado-capsulas-espresso-capsulas': 'hacendado-capsulas-espresso',
  'hacendado-capsulas-extra-fuerte-capsulas': 'hacendado-capsulas-extra-fuerte',
};

// =========================
// HELPERS
// =========================
function isEmptyValue(value) {
  return (
    value === null ||
    value === undefined ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

function mergePreferTarget(targetData, sourceData, oldId) {
  const merged = { ...targetData };
  const copiedFields = [];

  // Campos que NO queremos copiar nunca
  const blockedKeys = new Set([
    '__oldId',
    'migratedAt',
    'migratedFromId',
    'legacyId',
    'importMeta',
    'mergedAt',
    'mergedDeletedId',
    'mergedFromLegacyId',
  ]);

  for (const [key, sourceValue] of Object.entries(sourceData)) {
    if (blockedKeys.has(key)) continue;

    const targetValue = merged[key];

    if (isEmptyValue(targetValue) && !isEmptyValue(sourceValue)) {
      merged[key] = sourceValue;
      copiedFields.push(key);
    }
  }

  // Solo guardamos info mínima de trazabilidad
  merged.mergedDeletedId = oldId;
  merged.mergedAt = admin.firestore.FieldValue.serverTimestamp();

  return { merged, copiedFields };
}

// =========================
// MAIN
// =========================
async function run() {
  console.log(`\n🚀 Iniciando merge + delete en "${COLLECTION_NAME}"`);
  console.log(`🧪 DRY_RUN: ${DRY_RUN ? 'true' : 'false'}\n`);

  let processed = 0;
  let missing = 0;
  let errors = 0;

  for (const [longId, shortId] of Object.entries(ID_MAP)) {
    try {
      const longRef = db.collection(COLLECTION_NAME).doc(longId);
      const shortRef = db.collection(COLLECTION_NAME).doc(shortId);

      const [longSnap, shortSnap] = await Promise.all([longRef.get(), shortRef.get()]);

      if (!longSnap.exists || !shortSnap.exists) {
        console.log(`⏭️ Falta uno de los dos: ${longId} / ${shortId}`);
        missing++;
        continue;
      }

      const longData = longSnap.data();
      const shortData = shortSnap.data();

      const { merged, copiedFields } = mergePreferTarget(shortData, longData, longId);

      if (DRY_RUN) {
        console.log(
          `🧪 Simulación: ${longId} -> ${shortId} | campos copiados: ${
            copiedFields.length ? copiedFields.join(', ') : 'ninguno'
          }`
        );
        processed++;
        continue;
      }

      const batch = db.batch();

      batch.set(shortRef, merged, { merge: true });
      batch.delete(longRef);

      await batch.commit();

      console.log(
        `✅ Fusionado y borrado: ${longId} -> ${shortId} | campos copiados: ${
          copiedFields.length ? copiedFields.join(', ') : 'ninguno'
        }`
      );

      processed++;
    } catch (error) {
      console.error(`❌ Error con ${longId}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n==============================');
  console.log('Merge + delete completado');
  console.log('==============================');
  console.log(`✅ Procesados:        ${processed}`);
  console.log(`⏭️ Faltantes:         ${missing}`);
  console.log(`❌ Errores:           ${errors}`);
  console.log('==============================\n');
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
