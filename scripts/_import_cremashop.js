#!/usr/bin/env node
/**
 * Import cremashop cafes to Firestore with photos
 * Processes in batches to avoid memory issues
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const https = require('https');
const fs = require('fs');
const sharp = require('sharp');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

function downloadBuf(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadBuf(res.headers.location).then(resolve).catch(reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ buf: Buffer.concat(chunks), status: res.statusCode }));
      })
      .on('error', reject);
  });
}

function computeSCA(data) {
  let score = 72;
  if (data.especie === 'arabica') score += 4;
  else if (data.especie === 'blend') score += 2;
  if (data.tueste === 'light') score += 3;
  else if (data.tueste === 'medium') score += 2;
  else if (data.tueste === 'medium-dark') score += 1;
  if (data.pais && data.pais.length > 3) score += 2;
  if (data.formato === 'beans') score += 1;
  if (data.descripcion && data.descripcion.length > 50) score += 1;
  if (data.categoria === 'especialidad') score += 5;
  else if (data.categoria === 'premium') score += 3;
  return Math.min(score, 89);
}

(async () => {
  try {
    const importData = JSON.parse(fs.readFileSync('/tmp/cremashop_import.json'));
    console.log(`Total products to import: ${importData.length}`);

    // Check which ones already exist
    const existingIds = new Set();
    for (const d of importData) {
      const doc = await db.collection('cafes').doc(d.docId).get();
      if (doc.exists) existingIds.add(d.docId);
    }
    console.log(`Already exist in DB: ${existingIds.size}`);

    const toImport = importData.filter((d) => !existingIds.has(d.docId));
    console.log(`New to import: ${toImport.length}`);

    let imported = 0;
    let photoErrors = 0;
    let photoSuccess = 0;

    for (const cafe of toImport) {
      imported++;
      if (imported % 25 === 0) {
        console.log(
          `Progress: ${imported}/${toImport.length} (photos OK: ${photoSuccess}, photo errors: ${photoErrors})`
        );
      }

      // Download and process photo
      let officialPhoto = '';
      let bestPhoto = '';
      try {
        const { buf, status } = await downloadBuf(cafe.imageUrl);
        if (status === 200 && buf.length > 1000) {
          // Verify it's a valid image
          const metadata = await sharp(buf).metadata();
          if (metadata.width > 50) {
            const processed = await sharp(buf)
              .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
              .png()
              .toBuffer();

            const destPath = `cafe-photos-nobg/${cafe.docId}.png`;
            const file = bucket.file(destPath);
            await file.save(processed, { contentType: 'image/png' });
            await file.makePublic();
            officialPhoto = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${destPath}`;
            bestPhoto = officialPhoto;
            photoSuccess++;
          } else {
            photoErrors++;
          }
        } else {
          photoErrors++;
        }
      } catch (e) {
        photoErrors++;
      }

      // Build Firestore document
      const docData = {
        nombre: cafe.nombre,
        marca: cafe.marca,
        descripcion: cafe.descripcion,
        pais: cafe.pais,
        formato: cafe.formato,
        peso: cafe.peso,
        tueste: cafe.tueste,
        especie: cafe.especie,
        categoria: cafe.categoria,
        precio: cafe.precio,
        moneda: 'EUR',
        sca_score: computeSCA(cafe),
        source: 'cremashop',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (officialPhoto) {
        docData.officialPhoto = officialPhoto;
        docData.bestPhoto = bestPhoto;
        docData.photos = {
          official: [officialPhoto],
          user: [],
          selected: officialPhoto,
          source: 'official',
        };
      } else {
        // Store the cremashop URL as fallback
        docData.officialPhoto = cafe.imageUrl;
        docData.photos = {
          official: [cafe.imageUrl],
          user: [],
          selected: cafe.imageUrl,
          source: 'official',
        };
      }

      await db.collection('cafes').doc(cafe.docId).set(docData);

      // Small delay between uploads
      await new Promise((r) => setTimeout(r, 50));
    }

    console.log(`\n=== IMPORT COMPLETE ===`);
    console.log(`Total imported: ${imported}`);
    console.log(`Photos uploaded: ${photoSuccess}`);
    console.log(`Photo errors: ${photoErrors}`);

    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
})();
