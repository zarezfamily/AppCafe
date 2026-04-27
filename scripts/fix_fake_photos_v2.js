require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const sa = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const PHOTO_FIELDS = ['foto', 'bestPhoto', 'officialPhoto', 'imageUrl'];
const SCRIPTS_DIR = __dirname;

// Trusted domains - photos from these are real
const TRUSTED_DOMAINS = [
  'cafesnovell.com',
  'prod-mercadona.imgix.net',
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
  'hola.coffee',
  'ineffablecoffee.com',
  'nomadcoffee.es',
  'cafeselmagnifico.com',
  'cafeslamexicana.es',
  'lamexicana.es',
  'incapto.com',
  'lavazza.com',
  'lavazza.es',
  'nespresso.com',
  'starbucks.com',
  'starbucksathome.com',
  'illy.com',
  'images.openfoodfacts.org',
  'world.openfoodfacts.org',
  'static.openfoodfacts.org',
  'amazon.com',
  'amazon.es',
  'media-amazon.com',
  'm.media-amazon.com',
  'images-na.ssl-images-amazon.com',
  'images-eu.ssl-images-amazon.com',
  'elcorteingles.es',
  'sgfm.elcorteingles.es',
  'lidl.es',
  'alcampo.es',
  'marcilla.com',
  'bonka.es',
  'cafefortaleza.com',
  'fortaleza.es',
  'saimaza.es',
  'delta-cafes.com',
  'cafesdromedario.com',
  'cafescandelas.com',
  'catunambu.com',
  'mogorttini.com',
  'kaffekapslen.es',
  'kaffekapslen.com',
  'kaffekapslen.media',
  'supracafe.com',
  'cafesplatino.com',
  'cafesdefinca.com',
  'cafesdefinca.es',
  'granell.es',
  'cafesgranell.com',
  'camuy.es',
  'cafebaque.com',
  'cafeslaestrella.com',
  'laestrellacoffee.com',
  'lacolombe.com',
  'delonghi.com',
  'wp-content',
  'cdn.shopify.com',
  'shopify.com',
  'cafesaula.com',
  'cafesorus.es',
  'sanjorge.cafe',
  'cafesorus.com',
  'globalassets.starbucks.com',
  'tupinamba.com',
  'oquendo.com',
  'cafesoquendo.com',
  'saula.com',
  'segafredo.com',
  'segafredo.es',
  'serra.coffee',
  'serracoffee.com',
  'onyxcoffeelab.com',
  'stumptowncoffee.com',
  'peetscoffee.com',
  'cafescamuy.com',
  'cafescamuy.es',
  'syra.coffee',
];

function isRealPhoto(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
  const lower = trimmed.toLowerCase();
  for (const domain of TRUSTED_DOMAINS) {
    if (lower.includes(domain)) return true;
  }
  return false;
}

function loadImportPhotos() {
  const jsonFiles = fs
    .readdirSync(SCRIPTS_DIR)
    .filter((f) => f.startsWith('cafe-import-') && f.endsWith('.json'));

  const byId = {};
  const byName = {};

  for (const file of jsonFiles) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(SCRIPTS_DIR, file), 'utf8'));
      const cafes = Array.isArray(raw) ? raw : Object.values(raw);
      for (const c of cafes) {
        const photo = c.foto || c.officialPhoto || c.bestPhoto || c.imageUrl || '';
        if (!photo || typeof photo !== 'string' || !photo.startsWith('http')) continue;

        if (c.id) byId[c.id] = photo;
        const name = (c.nombre || c.name || '').toLowerCase().trim();
        const brand = (c.marca || c.roaster || '').toLowerCase().trim();
        if (name) {
          byName[`${name}|||${brand}`] = photo;
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
    `Fotos reales indexadas: ${Object.keys(byId).length} por ID, ${Object.keys(byName).length} por nombre\n`
  );

  const snapshot = await db.collection('cafes').get();
  console.log(`Total docs Firestore: ${snapshot.size}\n`);

  let replaced = 0;
  let alreadyReal = 0;
  let noSource = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const currentFoto = data.foto;

    // Skip if already has a real photo from trusted domain
    if (isRealPhoto(currentFoto)) {
      alreadyReal++;
      continue;
    }

    // Find real photo from imports
    let realPhoto = null;

    // 1. By doc ID
    if (byId[doc.id]) realPhoto = byId[doc.id];

    // 2. By name + brand
    if (!realPhoto) {
      const name = (data.nombre || '').toLowerCase().trim();
      const brand = (data.marca || '').toLowerCase().trim();
      if (name) {
        realPhoto = byName[`${name}|||${brand}`] || byName[name];
      }
    }

    // 3. Strip special chars
    if (!realPhoto) {
      const name = (data.nombre || '')
        .toLowerCase()
        .replace(/[®™©]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (name) realPhoto = byName[name];
    }

    if (realPhoto) {
      const updates = {};
      for (const field of PHOTO_FIELDS) {
        if (!isRealPhoto(data[field])) {
          updates[field] = realPhoto;
        }
      }
      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates);
        replaced++;
        const oldUrl = (currentFoto || '').substring(0, 60);
        if (replaced <= 50) {
          console.log(`✅ ${data.nombre || doc.id} (${data.marca || ''})`);
          console.log(`   ANTES: ${oldUrl || '(vacío)'}...`);
          console.log(`   AHORA: ${realPhoto.substring(0, 60)}...`);
        }
      }
    } else {
      noSource++;
    }
  }

  console.log(`\n--- RESUMEN ---`);
  console.log(`Ya con foto real: ${alreadyReal}`);
  console.log(`Fotos falsas reemplazadas: ${replaced}`);
  console.log(`Sin fuente de importación: ${noSource}`);

  process.exit(0);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
