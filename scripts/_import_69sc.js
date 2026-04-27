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
const SRC = path.join(require('os').homedir(), 'Downloads', '69specialtycoffee');
const PREFIX = 'cafe-photos-nobg';

const cafes = [
  {
    file: 'Café Especialidad Colombia - 500g.webp',
    docId: '69sc_especialidad_colombia_500g',
    doc: {
      nombre: 'Café Especialidad Colombia 500g',
      formato: 'beans',
      peso: '500g',
      pais: 'Colombia',
      origen: 'Colombia',
      tipo: 'natural',
    },
  },
  {
    file: 'Café Especialidad Colombia - 1Kg.webp',
    docId: '69sc_especialidad_colombia_1kg',
    doc: {
      nombre: 'Café Especialidad Colombia 1kg',
      formato: 'beans',
      peso: '1kg',
      pais: 'Colombia',
      origen: 'Colombia',
      tipo: 'natural',
    },
  },
  {
    file: 'Café DESCAFEINADO Especialidad Colombia - 500g.webp',
    docId: '69sc_descafeinado_especialidad_colombia_500g',
    doc: {
      nombre: 'Café Descafeinado Especialidad Colombia 500g',
      formato: 'beans',
      peso: '500g',
      pais: 'Colombia',
      origen: 'Colombia',
      tipo: 'descafeinado',
      decaf: true,
    },
  },
  {
    file: 'Café ECOLÓGICO Especialidad Colombia - 500g.webp',
    docId: '69sc_ecologico_especialidad_colombia_500g',
    doc: {
      nombre: 'Café Ecológico Especialidad Colombia 500g',
      formato: 'beans',
      peso: '500g',
      pais: 'Colombia',
      origen: 'Colombia',
      tipo: 'natural',
      isBio: true,
      notas: 'Ecológico',
    },
  },
  {
    file: 'Café ECOLÓGICO Especialidad Colombia - 1kg.webp',
    docId: '69sc_ecologico_especialidad_colombia_1kg',
    doc: {
      nombre: 'Café Ecológico Especialidad Colombia 1kg',
      formato: 'beans',
      peso: '1kg',
      pais: 'Colombia',
      origen: 'Colombia',
      tipo: 'natural',
      isBio: true,
      notas: 'Ecológico',
    },
  },
  {
    file: 'Café Especialidad Guatemala - 1Kg.webp',
    docId: '69sc_especialidad_guatemala_1kg',
    doc: {
      nombre: 'Café Especialidad Guatemala 1kg',
      formato: 'beans',
      peso: '1kg',
      pais: 'Guatemala',
      origen: 'Guatemala',
      tipo: 'natural',
    },
  },
  {
    file: 'Café Especialidad India - 1Kg.webp',
    docId: '69sc_especialidad_india_1kg',
    doc: {
      nombre: 'Café Especialidad India 1kg',
      formato: 'beans',
      peso: '1kg',
      pais: 'India',
      origen: 'India',
      tipo: 'natural',
    },
  },
];

const base = {
  marca: '69 Specialty Coffee',
  pais: 'España',
  origen: '',
  variedad: '',
  formato: 'beans',
  tipo: 'natural',
  peso: '',
  tueste: '',
  notas: '',
  coffeeCategory: 'specialty',
  category: 'specialty',
  fuente: '69 Specialty Coffee',
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
  console.log('=== Import 69 Specialty Coffee ===\n');

  // Phase 1: Delete existing
  const snap = await db.collection('cafes').where('marca', '==', '69 Specialty Coffee').get();
  console.log(`  Phase 1: Found ${snap.size} existing docs`);
  for (const doc of snap.docs) {
    await doc.ref.delete();
    try {
      await bucket.file(`${PREFIX}/${doc.id}.png`).delete();
    } catch {}
  }
  console.log(`  Deleted ${snap.size} docs\n`);

  // Phase 2: Create new
  console.log(`  Phase 2: Creating ${cafes.length} new cafés...`);
  const dirFiles = fs.readdirSync(SRC);
  let created = 0;

  for (const c of cafes) {
    try {
      const match = dirFiles.find((f) => f.normalize('NFD') === c.file.normalize('NFD'));
      if (!match) {
        console.log(`  SKIP (not found): ${c.file}`);
        continue;
      }

      const img = await processImage(path.join(SRC, match));
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

  console.log(`\n=== Done ===`);
  console.log(`  Deleted: ${snap.size} old`);
  console.log(`  Created: ${created} new`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
