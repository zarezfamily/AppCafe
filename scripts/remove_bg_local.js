#!/usr/bin/env node
/**
 * remove_bg_local.js
 *
 * Elimina el fondo de fotos de cafés usando @imgly/background-removal-node.
 * 100% local, sin API, sin límites, GRATIS.
 *
 * Uso:
 *   node scripts/remove_bg_local.js                   # procesa data/ids_to_process.txt
 *   node scripts/remove_bg_local.js id1 id2 id3       # IDs específicos
 *   node scripts/remove_bg_local.js --pending          # procesa todos los que faltan
 */

require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const STORAGE_BUCKET =
  process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'miappdecafe.firebasestorage.app';

const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: STORAGE_BUCKET,
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();

/** Same priority chain as getCafePhoto() in src/core/utils.js */
function getCafePhoto(cafe) {
  if (!cafe) return null;
  const sel = cafe.photos?.selected;
  if (sel && typeof sel === 'string' && sel.length > 10) return sel;
  for (const url of [cafe.bestPhoto, cafe.officialPhoto, cafe.imageUrl, cafe.foto, cafe.image]) {
    if (typeof url === 'string' && url.startsWith('http') && url.length > 10) return url;
  }
  return null;
}

/** Download image as ArrayBuffer, convert to PNG if needed (avif/webp not supported) */
async function downloadImage(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} downloading ${url}`);
  const contentType = resp.headers.get('content-type') || 'image/png';
  let buffer = Buffer.from(await resp.arrayBuffer());

  // Convert unsupported formats to PNG using sharp
  const needsConvert =
    contentType.includes('avif') ||
    contentType.includes('webp') ||
    contentType.includes('heic') ||
    contentType.includes('heif') ||
    contentType.includes('tiff');

  if (needsConvert) {
    const sharp = require('sharp');
    buffer = await sharp(buffer).png().toBuffer();
    return { buffer, contentType: 'image/png' };
  }

  return { buffer, contentType };
}

/** Upload PNG buffer to Firebase Storage, return public URL */
async function uploadToStorage(buffer, cafeId) {
  const storagePath = `cafe-photos-nobg/${cafeId}.png`;
  const file = bucket.file(storagePath);

  await file.save(Buffer.from(buffer), {
    metadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000',
    },
    public: true,
  });

  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

/** Gather all pending cafe IDs from Firestore */
async function getPendingIds() {
  console.log('🔍 Buscando cafés pendientes en Firestore…');
  const snapshot = await db.collection('cafes').get();
  const pending = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.photos?.bgRemoved) return; // already done
    const photo = getCafePhoto(data);
    if (!photo) return; // no photo
    pending.push(doc.id);
  });
  return pending;
}

async function main() {
  // Dynamic import for ESM module
  const { removeBackground } = await import('@imgly/background-removal-node');

  // --- Collect IDs to process ---
  let ids = process.argv.slice(2).filter((a) => a !== '--pending');
  const pendingMode = process.argv.includes('--pending');

  if (pendingMode) {
    ids = await getPendingIds();
  } else if (ids.length === 0) {
    const idsFile = path.join(__dirname, '..', 'data', 'ids_to_process.txt');
    if (fs.existsSync(idsFile)) {
      ids = fs
        .readFileSync(idsFile, 'utf-8')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
    }
  }

  if (ids.length === 0) {
    console.error('❌ No hay IDs para procesar.');
    console.error('   Usa --pending, pasa IDs como argumentos, o crea data/ids_to_process.txt');
    process.exit(1);
  }

  console.log(`\n🎨 Procesando ${ids.length} cafés con background-removal local…`);
  console.log(`   (Primera ejecución descarga el modelo ~40MB, luego se cachea)\n`);

  let ok = 0;
  let skip = 0;
  let fail = 0;
  const results = [];

  for (let i = 0; i < ids.length; i++) {
    const cafeId = ids[i];
    const prefix = `[${i + 1}/${ids.length}]`;

    try {
      // 1. Fetch cafe doc
      const docRef = db.collection('cafes').doc(cafeId);
      const snap = await docRef.get();
      if (!snap.exists) {
        console.log(`${prefix} ⚠️  ${cafeId} — no existe en Firestore, saltando.`);
        fail++;
        continue;
      }

      const data = snap.data();

      // Skip already processed
      if (data.photos?.bgRemoved) {
        console.log(`${prefix} ⏭️  ${data.nombre || cafeId} — ya procesado.`);
        skip++;
        continue;
      }

      const originalPhoto = getCafePhoto(data);
      if (!originalPhoto) {
        console.log(`${prefix} ⚠️  ${cafeId} — sin foto, saltando.`);
        fail++;
        continue;
      }

      console.log(`${prefix} 🖼️  ${data.nombre || cafeId}`);

      // 2. Download original image (converts AVIF/WebP to PNG automatically)
      const { buffer: imageBuffer, contentType } = await downloadImage(originalPhoto);
      console.log(
        `       📥 Descargada (${(Buffer.byteLength(imageBuffer) / 1024).toFixed(0)} KB, ${contentType})`
      );

      // 3. Remove background locally
      const inputBlob = new Blob([imageBuffer], { type: contentType });
      const blob = await removeBackground(inputBlob, {
        output: { format: 'image/png' },
      });
      const pngBuffer = Buffer.from(await blob.arrayBuffer());
      console.log(`       ✅ Fondo eliminado (${(pngBuffer.length / 1024).toFixed(0)} KB)`);

      // 4. Upload to Firebase Storage
      const newUrl = await uploadToStorage(pngBuffer, cafeId);
      console.log(`       ✅ Subida: ${newUrl.substring(0, 80)}…`);

      // 5. Update Firestore
      await docRef.update({
        'photos.selected': newUrl,
        'photos.original': originalPhoto,
        'photos.bgRemoved': true,
        bestPhoto: newUrl,
      });
      console.log(`       ✅ Firestore actualizado.\n`);

      results.push({ id: cafeId, nombre: data.nombre, original: originalPhoto, newUrl });
      ok++;
    } catch (err) {
      console.error(`${prefix} ❌ ${cafeId}: ${err.message}\n`);
      fail++;
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(
    `✅ Procesados: ${ok}   ⏭️ Ya hechos: ${skip}   ❌ Fallidos: ${fail}   Total: ${ids.length}`
  );

  if (results.length > 0) {
    const logPath = path.join(
      __dirname,
      '..',
      'data',
      `bg_removal_local_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );
    fs.writeFileSync(logPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`📋 Log guardado: ${logPath}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('💥 Error fatal:', err);
  process.exit(1);
});
