const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'serviceAccountKey.json');
const COLLECTION_NAME = 'cafes';
const DRY_RUN = true; // primero true, luego false

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

async function migrateOne(oldId, newId) {
  const oldRef = db.collection(COLLECTION_NAME).doc(oldId);
  const newRef = db.collection(COLLECTION_NAME).doc(newId);

  const [oldSnap, newSnap] = await Promise.all([oldRef.get(), newRef.get()]);

  if (!oldSnap.exists) {
    return { status: 'missing_source', oldId, newId };
  }

  if (newSnap.exists) {
    return { status: 'target_exists', oldId, newId };
  }

  const data = oldSnap.data() || {};

  if (DRY_RUN) {
    return { status: 'dry_run', oldId, newId, nombre: data.nombre || null };
  }

  const batch = db.batch();

  batch.set(newRef, {
    ...data,
    legacyId: data.legacyId || oldId,
    migratedFromId: oldId,
    migratedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  batch.delete(oldRef);

  await batch.commit();

  return { status: 'migrated', oldId, newId, nombre: data.nombre || null };
}

async function run() {
  console.log(`\n🚀 Iniciando migración selectiva en "${COLLECTION_NAME}"`);
  console.log(`🧪 DRY_RUN: ${DRY_RUN ? 'true' : 'false'}\n`);

  let migrated = 0;
  let simulated = 0;
  let missing = 0;
  let targetExists = 0;
  let errors = 0;

  for (const [oldId, newId] of Object.entries(ID_MAP)) {
    try {
      const result = await migrateOne(oldId, newId);

      if (result.status === 'dry_run') {
        console.log(`🧪 Simulación: ${oldId} -> ${newId} (${result.nombre || 'sin nombre'})`);
        simulated++;
      } else if (result.status === 'migrated') {
        console.log(`✅ Migrado: ${oldId} -> ${newId} (${result.nombre || 'sin nombre'})`);
        migrated++;
      } else if (result.status === 'missing_source') {
        console.log(`⏭️ No existe origen: ${oldId}`);
        missing++;
      } else if (result.status === 'target_exists') {
        console.log(`⚠️ Destino ya existe: ${oldId} -> ${newId}`);
        targetExists++;
      }
    } catch (error) {
      console.error(`❌ Error migrando ${oldId}: ${error.message}`);
      errors++;
    }
  }

  console.log('\n==============================');
  console.log('Migración selectiva completada');
  console.log('==============================');
  console.log(`✅ Migrados:          ${migrated}`);
  console.log(`🧪 Simulados:         ${simulated}`);
  console.log(`⏭️ Origen no existe:  ${missing}`);
  console.log(`⚠️ Destino existe:    ${targetExists}`);
  console.log(`❌ Errores:           ${errors}`);
  console.log('==============================\n');
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error fatal:', error);
    process.exit(1);
  });
