require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

const PHOTO_FIELDS = ['foto', 'bestPhoto', 'officialPhoto', 'imageUrl'];
const SCRIPTS_DIR = path.join(__dirname);

async function main() {
  // 1. Cargar todas las fotos de los JSON de importación
  const photoMap = {}; // id -> { foto, bestPhoto, officialPhoto, imageUrl }

  const jsonFiles = fs
    .readdirSync(SCRIPTS_DIR)
    .filter((f) => f.startsWith('cafe-import-') && f.endsWith('.json'));

  console.log(`Leyendo ${jsonFiles.length} archivos de importación...`);

  for (const file of jsonFiles) {
    try {
      const cafes = JSON.parse(fs.readFileSync(path.join(SCRIPTS_DIR, file), 'utf8'));
      const arr = Array.isArray(cafes) ? cafes : Object.values(cafes);
      let count = 0;
      for (const cafe of arr) {
        if (!cafe.id) continue;
        const photos = {};
        for (const field of PHOTO_FIELDS) {
          const val = cafe[field];
          if (val && typeof val === 'string' && val.startsWith('http')) {
            photos[field] = val;
          }
        }
        if (Object.keys(photos).length > 0) {
          photoMap[cafe.id] = photos;
          count++;
        }
      }
      if (count > 0) {
        console.log(`  ${file}: ${count} cafés con fotos`);
      }
    } catch (e) {
      console.error(`  Error leyendo ${file}: ${e.message}`);
    }
  }

  const totalWithPhotos = Object.keys(photoMap).length;
  console.log(`\nTotal cafés con fotos en importaciones: ${totalWithPhotos}`);

  // 2. Leer todos los documentos de Firestore
  console.log('\nLeyendo cafés de Firestore...');
  const snapshot = await db.collection('cafes').get();
  console.log(`Total documentos en Firestore: ${snapshot.size}`);

  // 3. Restaurar fotos donde faltan
  let restored = 0;
  let skipped = 0;
  let noSource = 0;
  const restoredDetails = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const docId = doc.id;

    // Check if any photo field is missing/empty
    const missingFields = PHOTO_FIELDS.filter((f) => {
      const val = data[f];
      return !val || typeof val !== 'string' || !val.startsWith('http');
    });

    if (missingFields.length === 0) {
      skipped++;
      continue;
    }

    // Do we have import data for this doc?
    const source = photoMap[docId];
    if (!source) {
      noSource++;
      continue;
    }

    // Build the update - only restore fields that are currently empty
    const updates = {};
    for (const field of missingFields) {
      if (source[field]) {
        updates[field] = source[field];
      }
    }

    // If we don't have the specific field, try to use any available photo
    if (Object.keys(updates).length === 0) {
      const anyPhoto = Object.values(source)[0];
      if (anyPhoto) {
        for (const field of missingFields) {
          updates[field] = anyPhoto;
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
      restored++;
      restoredDetails.push({
        nombre: data.nombre || docId,
        marca: data.marca || '',
        fields: Object.keys(updates),
      });
      if (restored <= 40) {
        console.log(
          `  ✅ ${data.nombre || docId} (${data.marca || ''}) - restaurados: ${Object.keys(updates).join(', ')}`
        );
      }
    }
  }

  console.log(`\n--- RESUMEN ---`);
  console.log(`Documentos ya con fotos: ${skipped}`);
  console.log(`Sin foto y sin fuente de importación: ${noSource}`);
  console.log(`Fotos restauradas: ${restored}`);

  // Show brands restored
  const brands = {};
  for (const d of restoredDetails) {
    brands[d.marca] = (brands[d.marca] || 0) + 1;
  }
  if (Object.keys(brands).length > 0) {
    console.log('\nPor marca:');
    for (const [brand, count] of Object.entries(brands).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${brand || '(sin marca)'}: ${count}`);
    }
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
