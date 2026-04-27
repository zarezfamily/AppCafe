require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// URLs legítimas conocidas de fotos de cafés
const TRUSTED_DOMAINS = [
  'cafesnovell.com',
  'prod-mercadona.imgix.net',
  'storage.googleapis.com',
  'firebasestorage.googleapis.com',
  'miappdecafe.firebasestorage.app',
  'hola.coffee',
  'ineffablecoffee.com',
  'nomadcoffee.es',
  'cafeselmagnifico.com',
  'cafeslamexicana.es',
  'incapto.com',
  'lavazza.com',
  'lavazza.es',
  'nespresso.com',
  'starbucks.com',
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
  'marcilla.es',
  'bonka.es',
  'fortaleza.es',
  'saimaza.es',
  'delta-cafes.com',
  'cafesdromedario.com',
  'cafescandelas.com',
  'catunambu.com',
  'mogorttini.com',
  'kaffekapslen.es',
  'kaffekapslen.com',
  'supracafe.com',
  'cafesplatino.com',
  'cafesdefinca.com',
  'granell.es',
  'cafesgranell.com',
  'camuy.es',
  'cafebaque.com',
  'laestrellacoffee.com',
  'lacolombe.com',
  'delonghi.com',
  'wp-content',
  'cdn.shopify.com',
  'shopify.com',
];

function isLikelyFakeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Quoted strings from GPT output
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) return true;

  // Not a URL at all
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return true;

  // Check if it belongs to a trusted domain
  const lower = trimmed.toLowerCase();
  for (const domain of TRUSTED_DOMAINS) {
    if (lower.includes(domain)) return false;
  }

  // Common GPT-invented patterns
  if (lower.includes('example.com')) return true;
  if (lower.includes('placeholder')) return true;
  if (lower.includes('lorem')) return true;
  if (lower.includes('dummyimage')) return true;
  if (lower.includes('via.placeholder')) return true;
  if (lower.includes('placehold.it')) return true;
  if (lower.includes('picsum.photos')) return true;
  if (lower.includes('unsplash.com')) return true;
  if (lower.includes('pexels.com')) return true;
  if (lower.includes('pixabay.com')) return true;

  // URLs that look like GPT hallucinations (very long random paths, odd patterns)
  // If domain is not trusted, mark as suspicious
  return true;
}

const PHOTO_FIELDS = ['foto', 'bestPhoto', 'officialPhoto', 'imageUrl'];

async function fixFakePhotos() {
  console.log('Buscando fotos falsas/inventadas en Firestore...\n');

  const snapshot = await db.collection('cafes').get();
  console.log(`Total documentos: ${snapshot.size}`);

  let totalFixed = 0;
  const fakesByField = { foto: 0, bestPhoto: 0, officialPhoto: 0, imageUrl: 0 };

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const updates = {};
    const fakes = [];

    for (const field of PHOTO_FIELDS) {
      const val = data[field];
      if (val && typeof val === 'string' && isLikelyFakeUrl(val)) {
        // Find a real photo from other fields
        const realPhoto = PHOTO_FIELDS.filter((f) => f !== field)
          .map((f) => data[f])
          .find((v) => v && typeof v === 'string' && !isLikelyFakeUrl(v));

        updates[field] = realPhoto || '';
        fakes.push({
          field,
          fake: val.substring(0, 80),
          replacement: realPhoto ? '(otra foto real)' : '(vacío)',
        });
        fakesByField[field]++;
      }
    }

    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
      totalFixed++;
      if (totalFixed <= 30) {
        console.log(`Fijado: ${data.nombre || doc.id} (${data.marca || ''})`);
        fakes.forEach((f) => console.log(`  ${f.field}: "${f.fake}..." -> ${f.replacement}`));
      }
    }
  }

  console.log(`\n--- RESUMEN ---`);
  console.log(`Cafés con fotos falsas corregidos: ${totalFixed}`);
  console.log(`Campos afectados:`);
  for (const [field, count] of Object.entries(fakesByField)) {
    if (count > 0) console.log(`  ${field}: ${count}`);
  }

  process.exit(0);
}

fixFakePhotos().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
