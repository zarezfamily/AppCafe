/**
 * migratePhotosToStorage.js
 *
 * Lee todos los cafés de Firestore, detecta los que tienen fotos en URLs externas
 * (no alojadas en Firebase Storage), las descarga y las sube a nuestro Storage.
 * Actualiza foto, officialPhoto, bestPhoto y añade fotoEnStorage: true.
 *
 * Uso: node scripts/migratePhotosToStorage.js [--dry-run]
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

function getBestPhotoUrl(doc) {
  return String(
    doc.foto || doc.officialPhoto || doc.bestPhoto || doc.image || doc.imageUrl || ''
  ).trim();
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

function buildCafeId(doc) {
  const brand = String(doc.roaster || doc.marca || 'roaster').trim();
  const nombre = String(doc.nombre || doc.name || 'cafe').trim();
  return slugify(`${brand}-${nombre}`);
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
    if (pathname.endsWith('.gif')) return 'gif';
    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'jpg';
  } catch (_) {}
  return 'jpg';
}

async function downloadImage(imageUrl) {
  const response = await fetch(imageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 ETIOVE/1.0',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} — ${imageUrl}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error(`No es imagen (${contentType}) — ${imageUrl}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (!buffer.length) throw new Error(`Imagen vacía — ${imageUrl}`);

  return { buffer, contentType };
}

async function resolveImageFromProductPage(pageUrl) {
  const response = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 ETIOVE/1.0',
      Accept: 'text/html,application/xhtml+xml,*/*;q=0.8',
    },
  });

  if (!response.ok) throw new Error(`HTTP ${response.status} — ${pageUrl}`);

  const html = await response.text();
  const candidates = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["'][^>]*>/i,
  ];

  for (const regex of candidates) {
    const match = html.match(regex);
    if (match?.[1]) return new URL(match[1], pageUrl).toString();
  }

  throw new Error(`Sin imagen en la ficha — ${pageUrl}`);
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

async function uploadToStorage(doc, imageUrl) {
  const activeBucket = await getWorkingBucket();
  const { buffer, contentType } = await downloadImage(imageUrl);
  const ext = detectExtension(contentType, imageUrl);
  const cafeId = buildCafeId(doc);
  const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 10);
  const destination = `cafes/${cafeId}/${hash}.${ext}`;
  const file = activeBucket.file(destination);

  await file.save(buffer, {
    metadata: { contentType, cacheControl: 'public,max-age=31536000' },
    resumable: false,
  });

  const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: '2491-01-01' });

  return { storageUrl: signedUrl, storagePath: destination, bucket: activeBucket.name };
}

// ─────────────────────────────────────────
// Main
// ─────────────────────────────────────────

async function migrate() {
  console.log(`\n🚀 Migración de fotos a Firebase Storage${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  const snapshot = await db.collection('cafes').get();
  const docs = snapshot.docs.filter((d) => !d.data().legacy);

  console.log(`📋 Total cafés activos: ${docs.length}\n`);

  let yaEnStorage = 0;
  let migrados = 0;
  let sinFoto = 0;
  let errores = 0;

  for (const docSnap of docs) {
    const data = docSnap.data();
    const nombre = data.nombre || data.name || docSnap.id;
    const photoUrl = getBestPhotoUrl(data);

    if (!photoUrl) {
      console.log(`⬜ Sin foto          — ${nombre}`);
      sinFoto++;
      continue;
    }

    if (isStorageUrl(photoUrl)) {
      console.log(`✅ Ya en Storage     — ${nombre}`);
      yaEnStorage++;

      // Sincroniza bestPhoto si apunta a URL externa (stale) y foto/officialPhoto ya son Storage
      const storageUrl = [data.foto, data.officialPhoto].find(isStorageUrl) || photoUrl;
      const needsSync =
        !data.fotoEnStorage ||
        (data.bestPhoto && !isStorageUrl(data.bestPhoto)) ||
        (data.foto && !isStorageUrl(data.foto)) ||
        (data.officialPhoto && !isStorageUrl(data.officialPhoto));

      if (needsSync && !DRY_RUN) {
        await docSnap.ref.update({
          foto: storageUrl,
          officialPhoto: storageUrl,
          bestPhoto: storageUrl,
          fotoEnStorage: true,
          updatedAt: new Date().toISOString(),
        });
        console.log(`   🔧 bestPhoto/foto sincronizados con Storage`);
      }
      continue;
    }

    // Tiene foto externa — hay que migrarla
    const productPageUrl = data.fuenteUrl || data.urlProducto || null;
    console.log(`⬆️  Migrando          — ${nombre}`);
    console.log(`   URL origen: ${photoUrl.slice(0, 80)}...`);

    let storageMeta = null;

    try {
      storageMeta = await uploadToStorage(data, photoUrl);
    } catch (err) {
      console.warn(`   ⚠️  Descarga directa fallida: ${err.message}`);

      if (productPageUrl) {
        try {
          console.log(`   🔎 Buscando en ficha: ${productPageUrl.slice(0, 70)}...`);
          const resolvedUrl = await resolveImageFromProductPage(productPageUrl);
          storageMeta = await uploadToStorage(data, resolvedUrl);
          console.log(`   🟢 Resuelta desde ficha`);
        } catch (fallbackErr) {
          console.error(`   ❌ También falló desde ficha: ${fallbackErr.message}`);
        }
      }
    }

    if (!storageMeta) {
      console.error(`   ❌ No se pudo migrar la foto de ${nombre}`);
      errores++;
      continue;
    }

    if (!DRY_RUN) {
      await docSnap.ref.update({
        foto: storageMeta.storageUrl,
        officialPhoto: storageMeta.storageUrl,
        bestPhoto: storageMeta.storageUrl,
        fotoOriginalExterna: photoUrl,
        fotoEnStorage: true,
        fotoStoragePath: storageMeta.storagePath,
        fotoStorageBucket: storageMeta.bucket,
        updatedAt: new Date().toISOString(),
      });
    }

    console.log(`   ✅ Migrado → ${storageMeta.storageUrl.slice(0, 80)}...`);
    migrados++;
  }

  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Resumen${DRY_RUN ? ' (DRY RUN — no se escribió nada)' : ''}
   ✅ Ya en Storage:   ${yaEnStorage}
   ⬆️  Migrados ahora: ${migrados}
   ⬜ Sin foto:        ${sinFoto}
   ❌ Errores:         ${errores}
   📋 Total:           ${docs.length}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

migrate().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
