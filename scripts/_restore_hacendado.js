#!/usr/bin/env node
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
          return fetchBuf(res.headers.location).then(resolve, reject);
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function uploadPhoto(docId, imgUrl) {
  const buf = await fetchBuf(imgUrl);
  const out = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(out, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

(async () => {
  const now = new Date().toISOString();

  // 1. mercadona_11715 - Cafe molido Colombia Hacendado
  const img1 =
    'https://prod-mercadona.imgix.net/images/d218be078fc9e16de47cfebaba8426e4.jpg?fit=crop&h=1600&w=1600';
  const photo1 = await uploadPhoto('mercadona_11715', img1);
  await db
    .collection('cafes')
    .doc('mercadona_11715')
    .set({
      fuente: 'mercadona',
      fuentePais: 'ES',
      fuenteUrl: 'https://tienda.mercadona.es/product/11715/cafe-molido-colombia-hacendado-paquete',
      urlProducto:
        'https://tienda.mercadona.es/product/11715/cafe-molido-colombia-hacendado-paquete',
      nombre: 'Café molido Colombia Hacendado',
      name: 'Café molido Colombia Hacendado',
      marca: 'Hacendado',
      roaster: 'Hacendado',
      mercadonaId: '11715',
      ean: '8402001031113',
      barcode: '8402001031113',
      normalizedEan: '8402001031113',
      category: 'supermarket',
      coffeeCategory: 'daily',
      formato: 'ground',
      format: 'ground',
      cantidad: 250,
      precio: 3.7,
      fecha: '2026-04-23T22:42:22.102Z',
      puntuacion: 0,
      votos: 0,
      decaf: false,
      status: 'approved',
      reviewStatus: 'approved',
      provisional: false,
      appVisible: true,
      scannerVisible: true,
      adminReviewedAt: '2026-04-23T22:42:22.102Z',
      approvedAt: '2026-04-23T22:42:22.102Z',
      createdAt: '2026-04-23T22:42:22.102Z',
      updatedAt: now,
      origin: 'Colombia',
      origen: 'Colombia',
      pais: 'España',
      tipo: 'natural',
      tueste: 'natural',
      variedad: 'Arábica',
      peso: '250g',
      pesoGramos: 250,
      descripcion: 'Café molido Colombia Hacendado',
      legalName: 'Café molido de tueste natural',
      normalizedNombre: 'cafe molido colombia hacendado',
      normalizedRoaster: 'hacendado',
      normalizedMarca: 'hacendado',
      notas: 'Colombia con cuerpo medio. Notas de caramelo, nuez y cítricos suaves.',
      fotoUrl: photo1,
      foto: photo1,
      imageUrl: photo1,
      officialPhoto: photo1,
      bestPhoto: photo1,
      imagenUrl: photo1,
      photos: { original: img1, bgRemoved: photo1, selected: photo1 },
      sca: { score: 69.5, type: 'estimated', confidence: 0.38, lastCalculatedAt: now },
    });
  console.log('OK: mercadona_11715 restored');

  // 2. mercadona_19924 - Cafe en grano fuerte Hacendado
  const img2 =
    'https://prod-mercadona.imgix.net/images/49a653aeb94c0855229ac8e7209b82a7.jpg?fit=crop&h=1600&w=1600';
  const photo2 = await uploadPhoto('mercadona_19924', img2);
  await db
    .collection('cafes')
    .doc('mercadona_19924')
    .set({
      fuente: 'mercadona',
      fuentePais: 'ES',
      fuenteUrl: 'https://tienda.mercadona.es/product/19924/cafe-grano-fuerte-hacendado-paquete',
      urlProducto: 'https://tienda.mercadona.es/product/19924/cafe-grano-fuerte-hacendado-paquete',
      nombre: 'Café en grano fuerte Hacendado',
      name: 'Café en grano fuerte Hacendado',
      marca: 'Hacendado',
      roaster: 'Hacendado',
      mercadonaId: '19924',
      ean: '8402001043239',
      barcode: '8402001043239',
      normalizedEan: '8402001043239',
      category: 'supermarket',
      coffeeCategory: 'daily',
      formato: 'beans',
      format: 'beans',
      cantidad: 500,
      precio: 6,
      fecha: '2026-04-23T22:42:22.102Z',
      puntuacion: 0,
      votos: 0,
      decaf: false,
      status: 'approved',
      reviewStatus: 'approved',
      provisional: false,
      appVisible: true,
      scannerVisible: true,
      adminReviewedAt: '2026-04-23T22:42:22.102Z',
      approvedAt: '2026-04-23T22:42:22.102Z',
      createdAt: '2026-04-23T22:42:22.102Z',
      updatedAt: now,
      pais: 'España',
      tipo: 'natural',
      tueste: 'oscuro',
      peso: '500g',
      pesoGramos: 500,
      descripcion: 'Café en grano fuerte Hacendado',
      legalName: 'Café en grano de tueste natural',
      normalizedNombre: 'cafe en grano fuerte hacendado',
      normalizedRoaster: 'hacendado',
      normalizedMarca: 'hacendado',
      fotoUrl: photo2,
      foto: photo2,
      imageUrl: photo2,
      officialPhoto: photo2,
      bestPhoto: photo2,
      imagenUrl: photo2,
      photos: { original: img2, bgRemoved: photo2, selected: photo2 },
      sca: { score: 72, type: 'estimated', confidence: 0.34, lastCalculatedAt: now },
    });
  console.log('OK: mercadona_19924 restored');
  process.exit(0);
})();
