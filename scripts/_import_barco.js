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
const SRC = path.join(require('os').homedir(), 'Downloads', 'Barco');
const PREFIX = 'cafe-photos-nobg';

const cafes = [
  {
    file: 'Café Grano Torrefacto Barco® Especial 500g.png',
    docId: 'barco_grano_torrefacto_especial_500g',
    doc: {
      nombre: 'Café en grano torrefacto Especial 500g',
      formato: 'beans',
      tipo: 'mezcla',
      tueste: 'torrefacto',
      peso: '500g',
      decaf: false,
      notas: 'Torrefacto',
    },
  },
  {
    file: 'Café Grano Torrefacto Barco® Especial Decaf 500g.png',
    docId: 'barco_grano_torrefacto_especial_decaf_500g',
    doc: {
      nombre: 'Café en grano torrefacto Especial Descafeinado 500g',
      formato: 'beans',
      tipo: 'descafeinado',
      tueste: 'torrefacto',
      peso: '500g',
      decaf: true,
      notas: 'Torrefacto, Descafeinado',
    },
  },
  {
    file: 'Café Molido Barco® Decaf 250g.png',
    docId: 'barco_molido_descafeinado_250g',
    doc: {
      nombre: 'Café molido descafeinado 250g',
      formato: 'ground',
      tipo: 'descafeinado',
      tueste: '',
      peso: '250g',
      decaf: true,
      notas: '',
    },
  },
  {
    file: 'Café Molido Barco® Natural 250g.png',
    docId: 'barco_molido_natural_250g',
    doc: {
      nombre: 'Café molido natural 250g',
      formato: 'ground',
      tipo: 'natural',
      tueste: '',
      peso: '250g',
      decaf: false,
      notas: '',
    },
  },
  {
    file: 'Café Molido con Torrefacto Barco® Familiar 250g.png',
    docId: 'barco_molido_torrefacto_familiar_250g',
    doc: {
      nombre: 'Café molido con torrefacto Familiar 250g',
      formato: 'ground',
      tipo: 'mezcla',
      tueste: 'torrefacto',
      peso: '250g',
      decaf: false,
      notas: 'Mezcla con torrefacto',
    },
  },
];

const base = {
  marca: 'Barco',
  pais: 'España',
  origen: '',
  variedad: '',
  coffeeCategory: 'daily',
  category: 'supermarket',
  fuente: 'Barco',
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
  console.log('=== Import Barco ===\n');

  // Phase 1: Delete existing Barco
  const snap = await db.collection('cafes').where('marca', '==', 'Barco').get();
  console.log(`  Phase 1: Found ${snap.size} existing Barco docs`);
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
  console.log(`  Deleted: ${snap.size} old Barco cafés`);
  console.log(`  Created: ${created} new Barco cafés`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
