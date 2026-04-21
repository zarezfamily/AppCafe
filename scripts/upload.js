const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const inputFile = process.argv[2] || 'cafes.json';
const cafesPath = path.join(__dirname, inputFile);
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

const projectId = serviceAccount.project_id;
const bucketCandidates = [`${projectId}.firebasestorage.app`, `${projectId}.appspot.com`];

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
let bucket = null;

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function normalizeBrandName(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  const brandMap = {
    lavazza: 'Lavazza',
    illy: 'Illy',
    marcilla: 'Marcilla',
    starbucks: 'Starbucks',
    nescafe: 'Nescafé',
    nescafé: 'Nescafé',
    delta: 'Delta',
    'delta cafes': 'Delta',
    'delta cafés': 'Delta',
    saula: 'Saula',
    'cafe de finca': 'CAFE DE FINCA',
    'café de finca': 'CAFE DE FINCA',
    hacendado: 'Hacendado',
    aldi: 'ALDI',
    lor: "L'OR",
    "l'or": "L'OR",
    nomad: 'Nomad Coffee',
    'nomad coffee': 'Nomad Coffee',
    ineffable: 'Ineffable Coffee',
    'ineffable coffee': 'Ineffable Coffee',
    hola: 'Hola Coffee',
    'hola coffee': 'Hola Coffee',
    syra: 'Syra Coffee',
    'syra coffee': 'Syra Coffee',
    incapto: 'Incapto',
    puchero: 'Puchero Coffee Roasters',
    'puchero coffee roasters': 'Puchero Coffee Roasters',
    'hidden coffee roasters': 'Hidden Coffee Roasters',
    'right side coffee': 'Right Side Coffee',
    'the fix coffee': 'The Fix Coffee',
    'cafes el magnifico': 'Cafés El Magnífico',
    'cafés el magnífico': 'Cafés El Magnífico',
  };

  return brandMap[normalized] || raw;
}

function buildCafeId(cafe) {
  const normalizedBrand = normalizeBrandName(cafe.roaster || cafe.marca || 'roaster');
  return slugify(`${normalizedBrand}-${cafe.nombre || 'cafe'}`);
}

function isSameCafe(a, b) {
  return buildCafeId(a) === buildCafeId(b);
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
    throw new Error(`No se pudo descargar la imagen (${response.status}) ${imageUrl}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';

  if (!contentType.toLowerCase().startsWith('image/')) {
    throw new Error(`La URL no devuelve una imagen válida (${contentType}) ${imageUrl}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!buffer.length) {
    throw new Error(`La imagen descargada está vacía: ${imageUrl}`);
  }

  return { buffer, contentType };
}

async function resolveImageFromProductPage(pageUrl) {
  const response = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 ETIOVE/1.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`No se pudo abrir la ficha del producto (${response.status}) ${pageUrl}`);
  }

  const html = await response.text();

  const candidates = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["'][^>]*>/i,
  ];

  for (const regex of candidates) {
    const match = html.match(regex);
    if (match?.[1]) {
      return new URL(match[1], pageUrl).toString();
    }
  }

  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (imgMatch?.[1]) {
    return new URL(imgMatch[1], pageUrl).toString();
  }

  throw new Error(`No se encontró imagen en la ficha del producto: ${pageUrl}`);
}

async function getWorkingBucket() {
  if (bucket) return bucket;

  const storage = admin.storage();

  for (const candidate of bucketCandidates) {
    try {
      const testBucket = storage.bucket(candidate);
      const [exists] = await testBucket.exists();
      if (exists) {
        bucket = testBucket;
        console.log(`🪣 Bucket detectado: ${candidate}`);
        return bucket;
      }
    } catch (_) {
      // seguimos probando otros candidatos
    }
  }

  throw new Error(
    `No existe un bucket accesible para este proyecto. Candidatos probados: ${bucketCandidates.join(', ')}`
  );
}

async function uploadImageToStorage(cafe, imageUrl) {
  const activeBucket = await getWorkingBucket();
  const { buffer, contentType } = await downloadImage(imageUrl);
  const extension = detectExtension(contentType, imageUrl);
  const cafeId = buildCafeId(cafe);
  const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 10);
  const destination = `cafes/${cafeId}/${hash}.${extension}`;
  const file = activeBucket.file(destination);

  await file.save(buffer, {
    metadata: {
      contentType,
      cacheControl: 'public,max-age=31536000',
    },
    resumable: false,
  });

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: '2491-01-01',
  });

  return {
    storagePath: destination,
    storageUrl: signedUrl,
    storageBucket: activeBucket.name,
  };
}

async function markDuplicateDocsAsLegacy(cafe, keepDocId) {
  const snapshot = await db.collection('cafes').where('nombre', '==', cafe.nombre).get();

  const duplicates = snapshot.docs.filter((doc) => {
    if (doc.id === keepDocId) return false;
    const data = doc.data() || {};
    return isSameCafe(data, cafe);
  });

  if (!duplicates.length) return;

  const batch = db.batch();
  for (const doc of duplicates) {
    batch.set(
      doc.ref,
      {
        legacy: true,
        updatedAt: new Date().toISOString(),
        duplicateOf: keepDocId,
      },
      { merge: true }
    );
  }

  await batch.commit();
  console.log(`🧹 Duplicados marcados como legacy para ${cafe.nombre}: ${duplicates.length}`);
}

async function upsertCafe(cafe) {
  const cafeId = buildCafeId(cafe);
  const docRef = db.collection('cafes').doc(cafeId);
  const normalizedMarca = normalizeBrandName(cafe.marca);
  const normalizedRoaster = normalizeBrandName(cafe.roaster || cafe.marca);

  let fotoFinal = cafe.foto || null;
  let storageMeta = null;

  const productPageUrl = cafe.fuenteUrl || cafe.urlProducto || null;

  if (typeof cafe.foto === 'string' && /^https?:\/\//i.test(cafe.foto)) {
    try {
      console.log(`🖼️  Descargando foto de ${cafe.nombre}...`);
      storageMeta = await uploadImageToStorage(cafe, cafe.foto);
      fotoFinal = storageMeta.storageUrl;
    } catch (error) {
      console.warn(`⚠️ Foto directa no descargada para ${cafe.nombre}: ${error.message}`);

      if (productPageUrl) {
        try {
          console.log(`🔎 Buscando imagen real en ficha de producto para ${cafe.nombre}...`);
          const resolvedImageUrl = await resolveImageFromProductPage(productPageUrl);
          storageMeta = await uploadImageToStorage(cafe, resolvedImageUrl);
          fotoFinal = storageMeta.storageUrl;
          console.log(`🟢 Imagen resuelta desde ficha para ${cafe.nombre}`);
        } catch (fallbackError) {
          console.warn(
            `⚠️ Tampoco se pudo resolver foto desde ficha para ${cafe.nombre}: ${fallbackError.message}`
          );
          fotoFinal = null;
          storageMeta = null;
        }
      } else {
        fotoFinal = null;
        storageMeta = null;
      }
    }
  } else if (productPageUrl) {
    try {
      console.log(`🔎 Buscando imagen real en ficha de producto para ${cafe.nombre}...`);
      const resolvedImageUrl = await resolveImageFromProductPage(productPageUrl);
      storageMeta = await uploadImageToStorage(cafe, resolvedImageUrl);
      fotoFinal = storageMeta.storageUrl;
      console.log(`🟢 Imagen resuelta desde ficha para ${cafe.nombre}`);
    } catch (error) {
      console.warn(`⚠️ No se pudo resolver foto desde ficha para ${cafe.nombre}: ${error.message}`);
      fotoFinal = null;
      storageMeta = null;
    }
  }

  const payload = {
    ...cafe,
    marca: normalizedMarca || cafe.marca || null,
    roaster: normalizedRoaster || cafe.roaster || cafe.marca || null,
    uid: cafe.uid || cafeId,
    foto: fotoFinal,
    officialPhoto: fotoFinal,
    fotoOriginal: cafe.foto || null,
    fotoFuenteUrl: productPageUrl,
    fotoStoragePath: storageMeta?.storagePath || null,
    fotoStorageBucket: storageMeta?.storageBucket || null,
    fotoVerificada: Boolean(fotoFinal),
    fotoPendiente: !fotoFinal,
    fotoError: fotoFinal
      ? null
      : typeof cafe.foto === 'string' || productPageUrl
        ? 'download_failed_or_invalid_url'
        : null,
    legacy: cafe.legacy === true,
    normalizedMarca,
    normalizedRoaster,
    updatedAt: new Date().toISOString(),
  };

  const existing = await docRef.get();
  if (!existing.exists) {
    payload.createdAt = new Date().toISOString();
  }

  await docRef.set(payload, { merge: true });
  await markDuplicateDocsAsLegacy(cafe, cafeId);
  console.log(
    `✅ ${cafe.nombre}${payload.legacy ? ' (legacy)' : ''}${payload.fotoVerificada ? '' : ' [sin foto]'}`
  );
}

async function uploadCafes() {
  const activeBucket = await getWorkingBucket();
  console.log(
    `🔥 Subiendo cafés reales a Firestore y Firebase Storage (${activeBucket.name})...\n`
  );

  let ok = 0;
  let failed = 0;

  for (const cafe of cafes) {
    try {
      await upsertCafe(cafe);
      ok += 1;
    } catch (error) {
      failed += 1;
      console.error(`❌ Error procesando ${cafe.nombre}: ${error.message}`);
    }
  }

  console.log(`\n🚀 Seed completado: ${ok} cafés OK, ${failed} con error`);
}

uploadCafes().catch((error) => {
  console.error('❌ Error subiendo cafés:', error);
  process.exit(1);
});
