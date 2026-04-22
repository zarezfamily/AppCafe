const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

const SERVICE_ACCOUNT_PATH = path.resolve(process.cwd(), 'serviceAccountKey.json');
const COLLECTION_NAME = 'cafes';

const ID_MAP = {
  'lavazza-cafe-en-grano-100-arabica-intensidad-5-10-qualita-oro-cafe-en-grano-500-g':
    'eci_lavazza_qualita_oro_500g',
  'el-corte-ingles-selection-cafe-en-grano-tueste-natural-100-arabica-colombia-cafe-en-grano-500-g-colombia':
    'eci_selection_colombia_500g',
  'bonka-cafe-en-grano-natural-intensidad-9-cafe-en-grano-500-g': 'eci_bonka_natural_500g',
  'l-or-espresso-cafe-en-grano-colombia-100-arabica-intensidad-8-cafe-en-grano-500-g-colombia':
    'eci_lor_colombia_500g',
  'lavazza-cafe-en-grano-natural-crema-e-gusto-classico-intensidad-7-10-cafe-en-grano-1-kg':
    'eci_lavazza_crema_gusto_1kg',
  'el-corte-ingles-selection-cafe-en-grano-tueste-natural-100-arabica-brasil-cafe-en-grano-500-g-brasil':
    'eci_selection_brasil_500g',
  'supracafe-cafe-en-grano-colombia-de-tueste-natural-cafe-en-grano-250-g-colombia':
    'eci_supracafe_colombia_250g',
  'l-or-espresso-cafe-en-grano-intensidad-9-forza-cafe-en-grano-500-g': 'eci_lor_forza_500g',
};

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

async function run() {
  console.log(`\n[ECI-CLEAN] Iniciando limpieza de IDs en "${COLLECTION_NAME}"\n`);

  let migrated = 0;
  let skipped = 0;

  for (const [oldId, newId] of Object.entries(ID_MAP)) {
    const oldRef = db.collection(COLLECTION_NAME).doc(oldId);
    const newRef = db.collection(COLLECTION_NAME).doc(newId);

    const [oldSnap, newSnap] = await Promise.all([oldRef.get(), newRef.get()]);

    if (!oldSnap.exists) {
      console.log(`[ECI-CLEAN] Skip missing: ${oldId}`);
      skipped += 1;
      continue;
    }

    if (newSnap.exists) {
      console.log(`[ECI-CLEAN] Skip target exists: ${oldId} -> ${newId}`);
      skipped += 1;
      continue;
    }

    const data = oldSnap.data() || {};
    const now = new Date().toISOString();

    const next = {
      ...data,
      legacyId: oldId,
      migratedFromId: oldId,
      cleanedIdAt: now,
      updatedAt: now,
    };

    const batch = db.batch();
    batch.set(newRef, next, { merge: true });
    batch.delete(oldRef);
    await batch.commit();

    console.log(`[ECI-CLEAN] Migrated: ${oldId} -> ${newId}`);
    migrated += 1;
  }

  console.log('\n==============================');
  console.log('[ECI-CLEAN] Limpieza completada');
  console.log('==============================');
  console.log(`Migrados: ${migrated}`);
  console.log(`Saltados: ${skipped}`);
  console.log('==============================\n');
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[ECI-CLEAN] Error fatal:', error);
    process.exit(1);
  });
