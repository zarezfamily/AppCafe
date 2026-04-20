const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const cafesPath = path.join(__dirname, 'cafes.json');

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
const cafes = JSON.parse(fs.readFileSync(cafesPath, 'utf8'));

const projectId = serviceAccount.project_id;
const storageBucket = `${projectId}.appspot.com`;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket,
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function buildCafeId(cafe) {
  return slugify(`${cafe.roaster || 'roaster'}-${cafe.nombre || 'cafe'}`);
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
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (!buffer.length) {
    throw new Error(`La imagen descargada está vacía: ${imageUrl}`);
  }

  return { buffer, contentType };
}

async function uploadImageToStorage(cafe, imageUrl) {
  const { buffer, contentType } = await downloadImage(imageUrl);
  const extension = detectExtension(contentType, imageUrl);
  const cafeId = buildCafeId(cafe);
  const hash = crypto.createHash('md5').update(buffer).digest('hex').slice(0, 10);
  const destination = `cafes/${cafeId}/${hash}.${extension}`;
  const file = bucket.file(destination);

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
    storageBucket: bucket.name,
  };
}

async function upsertCafe(cafe) {
  const cafeId = buildCafeId(cafe);
  const docRef = db.collection('cafes').doc(cafeId);

  let fotoFinal = cafe.foto || null;
  let storageMeta = null;

  if (typeof cafe.foto === 'string' && /^https?:\/\//i.test(cafe.foto)) {
    console.log(`🖼️  Descargando foto de ${cafe.nombre}...`);
    storageMeta = await uploadImageToStorage(cafe, cafe.foto);
    fotoFinal = storageMeta.storageUrl;
  }

  const payload = {
    ...cafe,
    uid: cafe.uid || cafeId,
    foto: fotoFinal,
    fotoOriginal: cafe.foto || null,
    fotoStoragePath: storageMeta?.storagePath || null,
    fotoStorageBucket: storageMeta?.storageBucket || null,
    fotoVerificada: Boolean(fotoFinal),
    legacy: false,
    updatedAt: new Date().toISOString(),
  };

  const existing = await docRef.get();
  if (!existing.exists) {
    payload.createdAt = new Date().toISOString();
  }

  await docRef.set(payload, { merge: true });
  console.log(`✅ ${cafe.nombre}`);
}

async function uploadCafes() {
  console.log(`🔥 Subiendo cafés reales a Firestore y Firebase Storage (${bucket.name})...\n`);

  for (const cafe of cafes) {
    await upsertCafe(cafe);
  }

  console.log(`\n🚀 Seed completado: ${cafes.length} cafés procesados`);
}

uploadCafes().catch((error) => {
  console.error('❌ Error subiendo cafés:', error);
  process.exit(1);
});
