#!/usr/bin/env node
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const SRC = path.join(require('os').homedir(), 'Downloads', 'Barissimo');
const PREFIX = 'cafe-photos-nobg';

const cafes = [
  {
    file: 'Café en grano Dark Roast BARISSIMO® - ALDI.png',
    docId: 'barissimo_cafe_grano_dark_roast',
    doc: {
      nombre: 'Café en grano Dark Roast',
      formato: 'beans',
      tipo: 'natural',
      tueste: 'oscuro',
      peso: '',
      notas: 'Tueste oscuro',
    },
  },
  {
    file: 'Café en grano Medium Roast BARISSIMO® - ALDI.png',
    docId: 'barissimo_cafe_grano_medium_roast',
    doc: {
      nombre: 'Café en grano Medium Roast',
      formato: 'beans',
      tipo: 'natural',
      tueste: 'medio',
      peso: '',
      notas: 'Tueste medio',
    },
  },
  {
    file: 'Barissimo Barista Espresso 1Kg, 14,99 €.jpg',
    docId: 'barissimo_barista_espresso_1kg',
    doc: {
      nombre: 'Barista Espresso 1kg',
      formato: 'beans',
      tipo: 'natural',
      tueste: '',
      peso: '1kg',
      notas: '',
    },
  },
  {
    file: 'Barissimo Café Cremoso 1Kg, 14,99 €.jpg',
    docId: 'barissimo_cafe_cremoso_1kg',
    doc: {
      nombre: 'Café Cremoso 1kg',
      formato: 'beans',
      tipo: 'natural',
      tueste: '',
      peso: '1kg',
      notas: '',
    },
  },
  {
    file: 'Barissimo Caffè Crema & Aroma Roasted Coffee Beans - 1000 g – Taste Matters Company Limited.webp',
    docId: 'barissimo_caffe_crema_aroma_1kg',
    doc: {
      nombre: 'Caffè Crema & Aroma en grano 1kg',
      formato: 'beans',
      tipo: 'natural',
      tueste: '',
      peso: '1kg',
      notas: '',
    },
  },
  {
    file: 'BARISSIMO Bio Fairtrade koffiebonen caffè crema Biologische koffiebonen caffe crème van Barissimo .jpeg',
    docId: 'barissimo_bio_fairtrade_caffe_crema_grano',
    doc: {
      nombre: 'Bio Fairtrade Caffè Crema en grano',
      formato: 'beans',
      tipo: 'natural',
      tueste: '',
      peso: '',
      notas: 'Fairtrade, Bio',
      isBio: true,
    },
  },
  {
    file: 'BARISSIMO Fairtrade-BIO Espresso en grains | ALDI-now.jpg',
    docId: 'barissimo_bio_fairtrade_espresso_grano',
    doc: {
      nombre: 'Bio Fairtrade Espresso en grano',
      formato: 'beans',
      tipo: 'natural',
      tueste: '',
      peso: '',
      notas: 'Fairtrade, Bio',
      isBio: true,
    },
  },
  {
    file: 'ROKSH Szemes kávék BARISSIMO Barista Espresso szemes kávé, 1 kg.png',
    docId: 'barissimo_barista_espresso_szemes_1kg',
    doc: {
      nombre: 'Barista Espresso en grano 1kg',
      formato: 'beans',
      tipo: 'natural',
      tueste: '',
      peso: '1kg',
      notas: '',
    },
  },
];

const base = {
  marca: 'Barissimo',
  pais: 'España',
  origen: '',
  variedad: '',
  coffeeCategory: 'daily',
  category: 'supermarket',
  fuente: 'ALDI',
  fuentePais: 'ES',
  isBio: false,
  decaf: false,
  fecha: new Date().toISOString(),
  puntuacion: 0,
  votos: 0,
  status: 'approved',
  reviewStatus: 'approved',
  appVisible: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function processImage(filePath) {
  const buf = fs.readFileSync(filePath);
  return sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
}

async function main() {
  // Check which already exist to skip
  const existing = new Set();
  for (const c of cafes) {
    const doc = await db.collection('cafes').doc(c.docId).get();
    if (doc.exists) existing.add(c.docId);
  }

  const toCreate = cafes.filter((c) => !existing.has(c.docId));
  console.log(
    `Barissimo: ${cafes.length} total, ${existing.size} already exist, ${toCreate.length} to add\n`
  );

  let created = 0;
  for (const c of toCreate) {
    try {
      // NFD-normalize filename for macOS
      const dirFiles = fs.readdirSync(SRC);
      const match = dirFiles.find((f) => f.normalize('NFD') === c.file.normalize('NFD'));
      if (!match) {
        console.log(`  SKIP (file not found): ${c.file}`);
        continue;
      }

      const filePath = path.join(SRC, match);
      const img = await processImage(filePath);

      const storagePath = `${PREFIX}/${c.docId}.png`;
      const file = bucket.file(storagePath);
      try {
        await file.delete();
      } catch {}
      await file.save(img, {
        resumable: false,
        contentType: 'image/png',
        metadata: { cacheControl: 'public, max-age=60' },
      });
      await file.makePublic();
      const url = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

      const merged = { ...base, ...c.doc };
      const fullDoc = {
        ...merged,
        fotoUrl: url,
        foto: url,
        imageUrl: url,
        officialPhoto: url,
        bestPhoto: url,
        imagenUrl: url,
        photos: { selected: url, original: url, bgRemoved: url },
      };
      await db.collection('cafes').doc(c.docId).set(fullDoc);
      created++;
      console.log(`  Created: ${c.docId}`);
    } catch (err) {
      console.log(`  ERROR ${c.docId}: ${err.message}`);
    }
  }
  console.log(`\nDone: ${created} new Barissimo cafés added`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
