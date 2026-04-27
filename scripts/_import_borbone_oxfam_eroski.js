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
const PREFIX = 'cafe-photos-nobg';
const DL = path.join(require('os').homedir(), 'Downloads');

async function processImage(filePath) {
  const buf = fs.readFileSync(filePath);
  return sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
}

async function uploadPhoto(docId, imgBuffer) {
  const storagePath = `${PREFIX}/${docId}.png`;
  const file = bucket.file(storagePath);
  try {
    await file.delete();
  } catch {}
  await file.save(imgBuffer, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

async function importBrand(brandName, folder, cafes, baseOverrides = {}) {
  console.log(`\n=== ${brandName} ===`);
  const srcDir = path.join(DL, folder);
  const dirFiles = fs.readdirSync(srcDir);

  const base = {
    pais: 'España',
    origen: '',
    variedad: '',
    peso: '',
    tueste: '',
    notas: '',
    coffeeCategory: 'daily',
    category: 'supermarket',
    fuente: brandName,
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
    ...baseOverrides,
  };

  // Delete existing
  const snap = await db.collection('cafes').where('marca', '==', brandName).get();
  console.log(`  Deleting ${snap.size} existing docs...`);
  for (const doc of snap.docs) {
    await doc.ref.delete();
    try {
      await bucket.file(`${PREFIX}/${doc.id}.png`).delete();
    } catch {}
  }

  // Create new
  let created = 0;
  for (const c of cafes) {
    try {
      const match = dirFiles.find((f) => f.normalize('NFD') === c.file.normalize('NFD'));
      if (!match) {
        console.log(`  SKIP (not found): ${c.file}`);
        continue;
      }

      const img = await processImage(path.join(srcDir, match));
      const url = await uploadPhoto(c.id, img);

      const merged = { ...base, marca: brandName, ...c.doc };
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
      await db.collection('cafes').doc(c.id).set(fullDoc);
      created++;
      console.log(`  Created: ${c.id}`);
    } catch (err) {
      console.log(`  ERROR ${c.id}: ${err.message}`);
    }
  }
  console.log(`  Result: deleted ${snap.size}, created ${created}`);
}

async function main() {
  // ── BORBONE ──
  await importBrand(
    'Borbone',
    'Borbone',
    [
      {
        file: 'Café en grano crema superior BORBONE, paquete 500 g.jpg',
        id: 'borbone_grano_crema_superior_500g',
        doc: {
          nombre: 'Café en grano Crema Superior 500g',
          formato: 'beans',
          tipo: 'natural',
          peso: '500g',
        },
      },
      {
        file: 'Café grano 100% arábica BORBONE, paquete 1 kg.jpg',
        id: 'borbone_grano_100_arabica_1kg',
        doc: {
          nombre: 'Café en grano 100% Arábica 1kg',
          formato: 'beans',
          tipo: 'natural',
          peso: '1kg',
          variedad: '100% Arábica',
        },
      },
      {
        file: 'Café grano crema classica BORBONE, paquete 1 kg.jpg',
        id: 'borbone_grano_crema_classica_1kg',
        doc: {
          nombre: 'Café en grano Crema Classica 1kg',
          formato: 'beans',
          tipo: 'natural',
          peso: '1kg',
        },
      },
    ],
    {
      fuente: 'Borbone',
      category: 'specialty',
      coffeeCategory: 'premium',
      pais: 'Italia',
      fuentePais: 'IT',
    }
  );

  // ── OXFAM INTERMÓN ──
  await importBrand(
    'Oxfam Intermón',
    'OXFAM INTERMON',
    [
      {
        file: 'Café en grano bio natural OXFAM INTERMON, paquete 1 kg.jpg',
        id: 'oxfam_intermon_grano_bio_natural_1kg',
        doc: {
          nombre: 'Café en grano Bio natural 1kg',
          formato: 'beans',
          tipo: 'natural',
          peso: '1kg',
          isBio: true,
          notas: 'Bio, Comercio Justo',
        },
      },
      {
        file: 'Café en grano natural OXFAM INTERMON, paquete 1 kg.jpg',
        id: 'oxfam_intermon_grano_natural_1kg',
        doc: {
          nombre: 'Café en grano natural 1kg',
          formato: 'beans',
          tipo: 'natural',
          peso: '1kg',
          notas: 'Comercio Justo',
        },
      },
    ],
    { fuente: 'Oxfam Intermón', category: 'specialty', coffeeCategory: 'premium' }
  );

  // ── EROSKI BASIC ──
  await importBrand('Eroski', 'eroski basic', [
    {
      file: 'Café en grano mezcla EROSKI BASIC, paquete 500 g.jpg',
      id: 'eroski_basic_grano_mezcla_500g',
      doc: {
        nombre: 'Café en grano mezcla Eroski Basic 500g',
        formato: 'beans',
        tipo: 'mezcla',
        peso: '500g',
      },
    },
    {
      file: 'Café en grano natural EROSKI BASIC, paquete 500 g.jpg',
      id: 'eroski_basic_grano_natural_500g',
      doc: {
        nombre: 'Café en grano natural Eroski Basic 500g',
        formato: 'beans',
        tipo: 'natural',
        peso: '500g',
      },
    },
    {
      file: 'Café natural en grano EROSKI BASIC, paquete 1 kg.jpg',
      id: 'eroski_basic_grano_natural_1kg',
      doc: {
        nombre: 'Café en grano natural Eroski Basic 1kg',
        formato: 'beans',
        tipo: 'natural',
        peso: '1kg',
      },
    },
  ]);

  console.log('\n=== All done ===');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
