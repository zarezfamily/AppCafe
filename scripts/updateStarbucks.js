/**
 * updateStarbucks.js
 *
 * Busca los cafés Starbucks en Firestore, actualiza EAN y sube foto oficial
 * desde Open Food Facts a Firebase Storage.
 *
 * Uso: node scripts/updateStarbucks.js [--dry-run]
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const DRY_RUN = process.argv.includes('--dry-run');

const projectId = serviceAccount.project_id;
const bucketCandidates = [`${projectId}.firebasestorage.app`, `${projectId}.appspot.com`];

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
let bucket = null;

// EANs verificados para los 200g Starbucks europeos (Nestlé prefix 7613036)
const STARBUCKS_DATA = [
  {
    nombre: 'Starbucks Blonde Espresso Roast',
    ean: '7613036932073',
    fallbackPhoto: 'https://m.media-amazon.com/images/I/71QKQ9mwV7L._AC_SL1500_.jpg',
  },
  {
    nombre: 'Starbucks Espresso Roast',
    ean: '7613036932189',
    fallbackPhoto: 'https://m.media-amazon.com/images/I/71h4B6vQ0HL._AC_SL1500_.jpg',
  },
  {
    nombre: 'Starbucks House Blend',
    ean: '7613036932110',
    fallbackPhoto: 'https://m.media-amazon.com/images/I/71X6F9fT2EL._AC_SL1500_.jpg',
  },
  {
    nombre: 'Starbucks Colombia',
    ean: '7613036963039',
    fallbackPhoto: 'https://m.media-amazon.com/images/I/71YbR1P1uUL._AC_SL1500_.jpg',
  },
  {
    nombre: 'Starbucks Caffè Verona',
    ean: '7613036932097',
    fallbackPhoto: 'https://m.media-amazon.com/images/I/71vFk7z6f0L._AC_SL1500_.jpg',
  },
  {
    nombre: 'Starbucks Pike Place Roast',
    ean: '7613036932227',
    fallbackPhoto: 'https://m.media-amazon.com/images/I/71y2Q1NfUuL._AC_SL1500_.jpg',
  },
  {
    nombre: 'Starbucks Decaf Espresso Roast',
    ean: '7613036984454',
    fallbackPhoto: 'https://m.media-amazon.com/images/I/71zq9kF0D0L._AC_SL1500_.jpg',
  },
  {
    nombre: 'Starbucks Italian Roast',
    ean: '7613036932265',
    fallbackPhoto: 'https://m.media-amazon.com/images/I/71ZcS6L+1QL._AC_SL1500_.jpg',
  },
  {
    nombre: 'Starbucks Breakfast Blend',
    ean: '7613036932241',
    fallbackPhoto: 'https://m.media-amazon.com/images/I/71C6X8Yl7uL._AC_SL1500_.jpg',
  },
  {
    nombre: 'Starbucks Sumatra',
    ean: '7613036932203',
    fallbackPhoto: 'https://m.media-amazon.com/images/I/71t9v0nF1JL._AC_SL1500_.jpg',
  },
];

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function isStorageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('.firebasestorage.app') ||
    url.includes('.appspot.com/o/')
  );
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function detectExtension(contentType, imageUrl) {
  if (contentType) {
    if (contentType.includes('png')) return 'png';
    if (contentType.includes('webp')) return 'webp';
    if (contentType.includes('gif')) return 'gif';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return 'jpg';
  }
  try {
    const pathname = new URL(imageUrl).pathname.toLowerCase();
    if (pathname.endsWith('.png')) return 'png';
    if (pathname.endsWith('.webp')) return 'webp';
    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'jpg';
  } catch (_) {}
  return 'jpg';
}

async function getWorkingBucket() {
  if (bucket) return bucket;
  const storage = admin.storage();
  for (const candidate of bucketCandidates) {
    try {
      const b = storage.bucket(candidate);
      const [exists] = await b.exists();
      if (exists) {
        bucket = b;
        console.log(`🪣  Bucket: ${candidate}`);
        return bucket;
      }
    } catch (_) {}
  }
  throw new Error(`Bucket no encontrado. Candidatos: ${bucketCandidates.join(', ')}`);
}

async function downloadImage(imageUrl) {
  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 ETIOVE/1.0',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} — ${imageUrl}`);
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error(`No es imagen (${contentType}) — ${imageUrl}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length) throw new Error(`Imagen vacía — ${imageUrl}`);
  return { buffer, contentType };
}

async function uploadToStorage(cafeId, imageUrl) {
  const activeBucket = await getWorkingBucket();
  const { buffer, contentType } = await downloadImage(imageUrl);
  const ext = detectExtension(contentType, imageUrl);
  const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 10);
  const destination = `cafes/${cafeId}/${hash}.${ext}`;
  const file = activeBucket.file(destination);

  await file.save(buffer, {
    metadata: { contentType, cacheControl: 'public,max-age=31536000' },
    resumable: false,
  });

  const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: '2491-01-01' });
  return { storageUrl: signedUrl, storagePath: destination };
}

async function fetchOpenFoodFacts(ean) {
  const url = `https://world.openfoodfacts.org/api/v0/product/${ean}.json`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'ETIOVE/1.0' } });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 1) return null;
    const p = json.product;
    return {
      imageUrl: p.image_front_url || p.image_url || null,
      productName: p.product_name || null,
    };
  } catch (_) {
    return null;
  }
}

// ─────────────────────────────────────────
// Normaliza para comparar nombres
// ─────────────────────────────────────────

function normalizeNombre(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────

async function run() {
  console.log(`\n🚀 Actualización Starbucks — EAN + foto${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  const snapshot = await db.collection('cafes').where('marca', '==', 'Starbucks').get();
  const docs = snapshot.docs.filter((d) => !d.data().legacy);
  console.log(`📋 Cafés Starbucks en Firestore: ${docs.length}\n`);

  let actualizados = 0;
  let sinEan = 0;
  let errores = 0;

  for (const entry of STARBUCKS_DATA) {
    const normalizedEntry = normalizeNombre(entry.nombre);

    // Busca el doc en Firestore por nombre normalizado
    const docSnap = docs.find((d) => normalizeNombre(d.data().nombre) === normalizedEntry);

    if (!docSnap) {
      console.log(`⬜ No encontrado en Firestore — ${entry.nombre}`);
      sinEan++;
      continue;
    }

    const data = docSnap.data();
    const nombre = data.nombre || entry.nombre;
    const cafeId = slugify(`starbucks-${entry.nombre}`);

    console.log(`\n🔄 Procesando: ${nombre}`);
    console.log(`   EAN: ${entry.ean}`);

    // Consulta Open Food Facts para foto
    const off = await fetchOpenFoodFacts(entry.ean);
    const offImageUrl = off?.imageUrl || null;
    console.log(`   OFF imagen: ${offImageUrl ? offImageUrl.slice(0, 80) : 'no encontrada'}`);

    // Decide la mejor URL de foto
    const currentPhoto = data.bestPhoto || data.officialPhoto || data.foto || null;
    let finalStorageUrl = isStorageUrl(currentPhoto) ? currentPhoto : null;

    // Si ya tiene Storage URL la dejamos, si no subimos la mejor disponible
    if (!finalStorageUrl) {
      const photoToUpload =
        offImageUrl || data.foto || data.officialPhoto || entry.fallbackPhoto || null;

      if (photoToUpload) {
        try {
          console.log(`   ⬆️  Subiendo foto a Storage...`);
          const result = await uploadToStorage(cafeId, photoToUpload);
          finalStorageUrl = result.storageUrl;
          console.log(`   ✅ Storage: ${result.storageUrl.slice(0, 80)}...`);
        } catch (err) {
          console.error(`   ❌ Error subiendo foto: ${err.message}`);
          errores++;
        }
      } else {
        console.log(`   ⚠️  Sin foto disponible`);
      }
    } else {
      console.log(`   ✅ Ya tiene foto en Storage`);

      // Aún así intenta actualizar con mejor foto de OFF si hay
      if (offImageUrl && !isStorageUrl(offImageUrl)) {
        try {
          console.log(`   🔄 Actualizando con foto OFF más oficial...`);
          const result = await uploadToStorage(cafeId + '-off', offImageUrl);
          finalStorageUrl = result.storageUrl;
          console.log(`   ✅ Nueva foto OFF: ${result.storageUrl.slice(0, 80)}...`);
        } catch (err) {
          console.warn(`   ⚠️  No se pudo actualizar foto OFF: ${err.message}`);
        }
      }
    }

    const updatePayload = {
      ean: entry.ean,
      barcode: entry.ean,
      updatedAt: new Date().toISOString(),
    };

    if (finalStorageUrl) {
      updatePayload.foto = finalStorageUrl;
      updatePayload.officialPhoto = finalStorageUrl;
      updatePayload.bestPhoto = finalStorageUrl;
      updatePayload.fotoEnStorage = true;
    }

    if (!DRY_RUN) {
      await docSnap.ref.update(updatePayload);
    }

    console.log(`   ✅ Actualizado — EAN: ${entry.ean}${finalStorageUrl ? ' + foto' : ''}`);
    actualizados++;
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Resumen${DRY_RUN ? ' (DRY RUN)' : ''}
   ✅ Actualizados: ${actualizados}
   ⬜ No en Firestore: ${sinEan}
   ❌ Errores foto: ${errores}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

run().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
