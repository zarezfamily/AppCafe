require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const sa = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const PHOTO_FIELDS = ['foto', 'bestPhoto', 'officialPhoto', 'imageUrl'];

// Step 1: Build a name-matching index from ALL import JSON files
function loadImportPhotos() {
  const scriptsDir = __dirname;
  const jsonFiles = fs
    .readdirSync(scriptsDir)
    .filter((f) => f.startsWith('cafe-import-') && f.endsWith('.json'));

  // Map: normalized name+brand -> photo URL
  const byName = {};
  // Map: doc id -> photo URL
  const byId = {};

  for (const file of jsonFiles) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(scriptsDir, file), 'utf8'));
      const cafes = Array.isArray(raw) ? raw : Object.values(raw);
      for (const c of cafes) {
        const photo = c.foto || c.officialPhoto || c.bestPhoto || c.imageUrl || '';
        if (!photo || typeof photo !== 'string' || !photo.startsWith('http')) continue;

        if (c.id) byId[c.id] = photo;

        // Index by normalized name + brand
        const name = (c.nombre || c.name || '').toLowerCase().trim();
        const brand = (c.marca || c.roaster || '').toLowerCase().trim();
        if (name) {
          const key = `${name}|||${brand}`;
          byName[key] = photo;
          // Also index by just name
          if (!byName[name]) byName[name] = photo;
        }
      }
    } catch (e) {
      /* skip */
    }
  }

  return { byId, byName };
}

async function main() {
  const { byId, byName } = loadImportPhotos();
  console.log(
    `Fotos indexadas: ${Object.keys(byId).length} por ID, ${Object.keys(byName).length} por nombre`
  );

  const snapshot = await db.collection('cafes').get();
  console.log(`Total docs Firestore: ${snapshot.size}`);

  let updated = 0;
  let noMatch = 0;
  const noMatchList = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip docs that already have a photo
    const currentPhoto = data.foto;
    if (currentPhoto && typeof currentPhoto === 'string' && currentPhoto.startsWith('http'))
      continue;

    // Try to find a photo match
    let photo = null;

    // 1. Match by document ID
    if (byId[doc.id]) {
      photo = byId[doc.id];
    }

    // 2. Match by normalized name + brand
    if (!photo) {
      const name = (data.nombre || '').toLowerCase().trim();
      const brand = (data.marca || '').toLowerCase().trim();
      if (name) {
        const key = `${name}|||${brand}`;
        photo = byName[key] || byName[name];
      }
    }

    // 3. Try fuzzy: strip special chars from name
    if (!photo) {
      const name = (data.nombre || '')
        .toLowerCase()
        .replace(/[®™©]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (name && byName[name]) {
        photo = byName[name];
      }
    }

    if (photo) {
      const updates = {};
      for (const field of PHOTO_FIELDS) {
        const val = data[field];
        if (!val || typeof val !== 'string' || !val.startsWith('http')) {
          updates[field] = photo;
        }
      }
      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates);
        updated++;
        if (updated <= 40) {
          console.log(
            `  ✅ ${data.nombre || doc.id} (${data.marca || ''}) -> ${photo.substring(0, 80)}...`
          );
        }
      }
    } else {
      noMatch++;
      noMatchList.push({ id: doc.id, nombre: data.nombre || '', marca: data.marca || '' });
    }
  }

  console.log(`\n--- RESUMEN ---`);
  console.log(`Fotos añadidas: ${updated}`);
  console.log(`Sin coincidencia: ${noMatch}`);

  // Group no-match by brand
  const byBrand = {};
  for (const c of noMatchList) {
    const b = c.marca || '(sin marca)';
    if (!byBrand[b]) byBrand[b] = [];
    byBrand[b].push(c.nombre);
  }
  console.log('\nCafés sin foto (por marca):');
  for (const [brand, names] of Object.entries(byBrand).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${brand}: ${names.length}`);
    if (names.length <= 5) names.forEach((n) => console.log(`    - ${n}`));
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
