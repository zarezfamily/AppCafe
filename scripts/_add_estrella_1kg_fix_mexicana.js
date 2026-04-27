#!/usr/bin/env node
/** Add La Estrella Grano Natural 1Kg + Replace La Mexicana Colombia photo */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const fs = require('fs');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

async function processAndUpload(docId, localPath) {
  const buf = fs.readFileSync(localPath);
  console.log('  Read', buf.length, 'bytes from', localPath);
  const processed = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(processed, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

async function main() {
  const now = new Date().toISOString();

  // === 1) Add La Estrella Grano Natural 1Kg ===
  console.log('\n=== Adding La Estrella Grano Natural 1Kg ===');
  const estrella1kgId = 'laestrella_grano_natural_1kg';
  const estrella1kgPhoto =
    '/Users/homme.maktub/Downloads/estrella/Café La Estrella 1887 Natural en Grano 1Kg.webp';
  try {
    const photoUrl = await processAndUpload(estrella1kgId, estrella1kgPhoto);
    const doc = {
      fuente: 'laestrella',
      fuentePais: 'ES',
      fuenteUrl:
        'https://www.amazon.es/stores/CafésLaEstrella/page/3712BDB2-D923-42AB-83C5-EA2C110D5F00',
      urlProducto: '',
      nombre: 'LA ESTRELLA GRANO NATURAL 1KG',
      name: 'LA ESTRELLA GRANO NATURAL 1KG',
      marca: 'Cafes La Estrella',
      roaster: 'Cafes La Estrella',
      ean: '',
      normalizedEan: '',
      sku: 'la-estrella-grano-natural-1kg',
      mpn: '',
      descripcion:
        'Café en grano 100% tueste natural. Formato grande 1Kg. Ideal para moler en casa.',
      description:
        'Café en grano 100% tueste natural. Formato grande 1Kg. Ideal para moler en casa.',
      category: 'daily',
      coffeeCategory: 'daily',
      isSpecialty: false,
      legacy: false,
      formato: 'beans',
      format: 'beans',
      sistemaCapsula: '',
      tipoProducto: 'cafe en grano',
      cantidad: 1000,
      intensidad: null,
      tueste: 'medium',
      roastLevel: 'medium',
      pais: '',
      origen: '',
      proceso: '',
      notas: 'natural, grano, 1kg',
      notes: 'natural, grano, 1kg',
      decaf: false,
      precio: null,
      currency: 'EUR',
      certificaciones: '',
      isBio: false,
      inStock: true,
      fecha: now,
      puntuacion: 0,
      votos: 0,
      officialPhoto: photoUrl,
      bestPhoto: photoUrl,
      imageUrl: photoUrl,
      foto: photoUrl,
      fotoUrl: photoUrl,
      imagenUrl: photoUrl,
      photos: { selected: photoUrl, original: estrella1kgPhoto, bgRemoved: photoUrl },
      status: 'approved',
      reviewStatus: 'approved',
      provisional: false,
      appVisible: true,
      scannerVisible: true,
      adminReviewedAt: now,
      updatedAt: now,
      approvedAt: now,
      createdAt: now,
      importMeta: {
        importedAt: now,
        sourceType: 'laestrella',
        sourceTitle: 'LA ESTRELLA GRANO NATURAL 1KG',
      },
    };
    await db.collection('cafes').doc(estrella1kgId).set(doc, { merge: true });
    console.log('  ✓ Created:', estrella1kgId);
  } catch (e) {
    console.error('  ✗ FAIL:', e.message);
  }

  // === 2) Replace La Mexicana Colombia Nariño El Tambo photo ===
  console.log('\n=== Replacing La Mexicana Colombia Nariño El Tambo photo ===');
  const mexicanaPhoto =
    '/Users/homme.maktub/Downloads/Cafés La Mexicana Café Colombia Nariño El Tambo .jpg';
  // Find the doc
  const snap = await db.collection('cafes').where('marca', '==', 'Cafes La Mexicana').get();
  let mexicanaId = null;
  snap.forEach((d) => {
    const data = d.data();
    if (
      data.nombre &&
      (data.nombre.toLowerCase().includes('colombia') ||
        data.nombre.toLowerCase().includes('tambo'))
    ) {
      mexicanaId = d.id;
      console.log('  Found:', d.id, '→', data.nombre);
    }
  });
  if (!mexicanaId) {
    // Try alternate marca name
    const snap2 = await db.collection('cafes').where('fuente', '==', 'lamexicana').get();
    snap2.forEach((d) => {
      const data = d.data();
      if (
        data.nombre &&
        (data.nombre.toLowerCase().includes('colombia') ||
          data.nombre.toLowerCase().includes('tambo'))
      ) {
        mexicanaId = d.id;
        console.log('  Found (by fuente):', d.id, '→', data.nombre);
      }
    });
  }
  if (mexicanaId) {
    try {
      const photoUrl = await processAndUpload(mexicanaId, mexicanaPhoto);
      await db.collection('cafes').doc(mexicanaId).update({
        officialPhoto: photoUrl,
        bestPhoto: photoUrl,
        imageUrl: photoUrl,
        foto: photoUrl,
        fotoUrl: photoUrl,
        imagenUrl: photoUrl,
        'photos.selected': photoUrl,
        'photos.original': mexicanaPhoto,
        'photos.bgRemoved': photoUrl,
        updatedAt: now,
      });
      console.log('  ✓ Photo replaced:', mexicanaId);
    } catch (e) {
      console.error('  ✗ FAIL photo:', e.message);
    }
  } else {
    console.error('  ✗ Could not find La Mexicana Colombia Nariño doc');
  }

  console.log('\nDone!');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
