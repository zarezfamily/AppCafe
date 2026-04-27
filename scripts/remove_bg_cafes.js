#!/usr/bin/env node
/**
 * remove_bg_cafes.js
 *
 * Procesa las fotos de cafés seleccionados con remove.bg, sube el
 * resultado (PNG transparente) a Firebase Storage y actualiza Firestore.
 *
 * Uso:
 *   1. Genera la lista de IDs con  node scripts/audit_cafe_images.js
 *   2. Pega los IDs en  data/ids_to_process.txt  (uno por línea)
 *   3. Ejecuta:  node scripts/remove_bg_cafes.js
 *
 * O pasa IDs directamente:
 *   node scripts/remove_bg_cafes.js id1 id2 id3
 *
 * Env vars:
 *   REMOVEBG_API_KEY  –  tu clave de remove.bg (se lee de .env)
 */

require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Read API key from credentials.json (gitignored), fallback to env
let credentials = {};
try {
  credentials = require('../credentials.json');
} catch (_e) {
  /* no credentials file */
}
const REMOVEBG_API_KEY = credentials.REMOVEBG_API_KEY || process.env.REMOVEBG_API_KEY;
const STORAGE_BUCKET =
  process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || 'miappdecafe.firebasestorage.app';

if (!REMOVEBG_API_KEY) {
  console.error('❌ Falta REMOVEBG_API_KEY en .env');
  process.exit(1);
}

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

/** Call remove.bg API with an image URL (with retry on 429) */
async function removeBg(imageUrl, retries = 5) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const resp = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVEBG_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        image_url: imageUrl,
        size: 'regular',
        type: 'product',
        format: 'png',
        bg_color: '',
      }),
    });

    if (resp.status === 429) {
      const wait = Math.min(2000 * Math.pow(2, attempt), 60000);
      console.log(
        `       ⏳ Rate limited, esperando ${(wait / 1000).toFixed(0)}s (intento ${attempt + 1}/${retries + 1})…`
      );
      await sleep(wait);
      continue;
    }

    if (!resp.ok) {
      const errBody = await resp.text();
      throw new Error(`remove.bg ${resp.status}: ${errBody}`);
    }

    const json = await resp.json();
    if (!json.data?.result_b64) {
      throw new Error('remove.bg: no result_b64 in response');
    }
    return Buffer.from(json.data.result_b64, 'base64');
  }
  throw new Error('remove.bg: max retries exceeded (429)');
}

/** Upload PNG buffer to Firebase Storage, return public URL */
async function uploadToStorage(buffer, cafeId) {
  const storagePath = `cafe-photos-nobg/${cafeId}.png`;
  const file = bucket.file(storagePath);

  await file.save(buffer, {
    metadata: {
      contentType: 'image/png',
      cacheControl: 'public, max-age=31536000',
    },
    public: true,
  });

  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
  return publicUrl;
}

/** Pause between API calls to respect rate limits */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  // --- Collect IDs to process ---
  let ids = process.argv.slice(2).filter(Boolean);

  if (ids.length === 0) {
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
    console.error('   Pasa IDs como argumentos o crea data/ids_to_process.txt');
    process.exit(1);
  }

  console.log(`\n🎨 Procesando ${ids.length} cafés con remove.bg…\n`);

  let ok = 0;
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
        console.log(`${prefix} ⏭️  ${data.nombre || cafeId} — ya procesado, saltando.`);
        ok++;
        continue;
      }

      const originalPhoto = getCafePhoto(data);
      if (!originalPhoto) {
        console.log(`${prefix} ⚠️  ${cafeId} — sin foto, saltando.`);
        fail++;
        continue;
      }

      console.log(`${prefix} 🖼️  ${data.nombre || cafeId}`);
      console.log(`       Original: ${originalPhoto.substring(0, 80)}…`);

      // 2. Remove background
      const pngBuffer = await removeBg(originalPhoto);
      console.log(`       ✅ Background removido (${(pngBuffer.length / 1024).toFixed(0)} KB)`);

      // 3. Upload to Firebase Storage
      const newUrl = await uploadToStorage(pngBuffer, cafeId);
      console.log(`       ✅ Subida: ${newUrl.substring(0, 80)}…`);

      // 4. Update Firestore — set as the selected photo, keep original as backup
      await docRef.update({
        'photos.selected': newUrl,
        'photos.original': originalPhoto,
        'photos.bgRemoved': true,
        bestPhoto: newUrl,
      });
      console.log(`       ✅ Firestore actualizado.\n`);

      results.push({ id: cafeId, nombre: data.nombre, original: originalPhoto, newUrl });
      ok++;

      // Rate limit: respect remove.bg rate limits
      if (i < ids.length - 1) await sleep(3000);
    } catch (err) {
      console.error(`${prefix} ❌ ${cafeId}: ${err.message}\n`);
      fail++;
    }
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅ Procesados: ${ok}   ❌ Fallidos: ${fail}   Total: ${ids.length}`);

  if (results.length > 0) {
    const logPath = path.join(
      __dirname,
      '..',
      'data',
      `bg_removal_log_${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );
    fs.writeFileSync(logPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log(`📋 Log guardado: ${logPath}`);
  }
}

main().catch((err) => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
