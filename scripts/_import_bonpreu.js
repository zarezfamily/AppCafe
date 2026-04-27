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
const SRC = path.join(require('os').homedir(), 'Downloads', 'bonpreu');
const PREFIX = 'cafe-photos-nobg';
const DRY_RUN = process.argv.includes('--dry-run');

function nfd(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
function slug(s) {
  return nfd(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .replace(/_+/g, '_');
}

// Skip files with repeated names (duplicated names in filename)
function isGoodFile(f) {
  const base = f.replace(/\.\w+$/, '');
  // If the filename is very long and has repeated content, skip it
  return base.length < 120;
}

const cafes = [
  {
    file: 'BONPREU Cafè de torrat natural en gra ecològic.webp',
    id: 'bonpreu_gra_torrat_natural_ecologic',
    doc: {
      nombre: 'Cafè en gra torrat natural ecològic',
      formato: 'beans',
      tipo: 'natural',
      isBio: true,
      notas: 'Ecològic',
    },
  },
  {
    file: 'BONPREU Cafè en gra torrat descafeïnat natural.webp',
    id: 'bonpreu_gra_torrat_descafeinat',
    doc: {
      nombre: 'Cafè en gra torrat descafeïnat natural',
      formato: 'beans',
      tipo: 'descafeinado',
      decaf: true,
    },
  },
  {
    file: 'BONPREU Cafè molt de torrat natural ecològic.webp',
    id: 'bonpreu_molt_torrat_natural_ecologic',
    doc: {
      nombre: 'Cafè molt torrat natural ecològic',
      formato: 'ground',
      tipo: 'natural',
      isBio: true,
      notas: 'Ecològic',
    },
  },
  {
    file: 'BONPREU Cafè molt descafeïnat de torrat natural.webp',
    id: 'bonpreu_molt_descafeinat_torrat_natural',
    doc: {
      nombre: 'Cafè molt descafeïnat torrat natural',
      formato: 'ground',
      tipo: 'descafeinado',
      decaf: true,
    },
  },
  {
    file: 'BONPREU Cafè molt exprés de torrat natural.webp',
    id: 'bonpreu_molt_expres_torrat_natural',
    doc: { nombre: 'Cafè molt exprés torrat natural', formato: 'ground', tipo: 'natural' },
  },
  {
    file: 'BONPREU Cafè molt mescla.webp',
    id: 'bonpreu_molt_mescla',
    doc: { nombre: 'Cafè molt mescla', formato: 'ground', tipo: 'mezcla' },
  },
  {
    file: 'BONPREU Cafè molt natural de torrat natural.webp',
    id: 'bonpreu_molt_natural_torrat_natural',
    doc: { nombre: 'Cafè molt natural torrat natural', formato: 'ground', tipo: 'natural' },
  },
  {
    file: 'BONPREU Cafè soluble descafeïnat.webp',
    id: 'bonpreu_soluble_descafeinat',
    doc: {
      nombre: 'Cafè soluble descafeïnat',
      formato: 'instant',
      tipo: 'descafeinado',
      decaf: true,
    },
  },
  {
    file: 'BONPREU Cafè soluble natural.webp',
    id: 'bonpreu_soluble_natural',
    doc: { nombre: 'Cafè soluble natural', formato: 'instant', tipo: 'natural' },
  },
  {
    file: 'BONPREU Cafè soluble.webp',
    id: 'bonpreu_soluble',
    doc: { nombre: 'Cafè soluble', formato: 'instant', tipo: 'natural' },
  },
  {
    file: 'BONPREU Càpsules cafè Esplosione intensitat 13.webp',
    id: 'bonpreu_capsules_esplosione_i13',
    doc: {
      nombre: 'Càpsules cafè Esplosione intensitat 13',
      formato: 'capsules',
      tipo: 'natural',
      notas: 'Compatible Nespresso. Intensidad 13',
    },
  },
  {
    file: 'BONPREU Càpsules de cafè Aràbiga Intensitat 6.webp',
    id: 'bonpreu_capsules_arabiga_i6',
    doc: {
      nombre: 'Càpsules cafè Aràbiga Intensitat 6',
      formato: 'capsules',
      tipo: 'natural',
      variedad: 'Arábica',
      notas: 'Compatible Nespresso. Intensidad 6',
    },
  },
  {
    file: 'BONPREU Càpsules de cafè Colòmbia intensitat 7.webp',
    id: 'bonpreu_capsules_colombia_i7',
    doc: {
      nombre: 'Càpsules cafè Colòmbia intensitat 7',
      formato: 'capsules',
      tipo: 'natural',
      origen: 'Colombia',
      pais: 'Colombia',
      notas: 'Compatible Nespresso. Intensidad 7',
    },
  },
  {
    file: 'BONPREU Càpsules de cafè Lungo Forte intensitat 10.webp',
    id: 'bonpreu_capsules_lungo_forte_i10',
    doc: {
      nombre: 'Càpsules cafè Lungo Forte intensitat 10',
      formato: 'capsules',
      tipo: 'natural',
      notas: 'Compatible Nespresso. Intensidad 10',
    },
  },
  {
    file: 'BONPREU Càpsules de cafè Ristretto Intensitat 9.webp',
    id: 'bonpreu_capsules_ristretto_i9',
    doc: {
      nombre: 'Càpsules cafè Ristretto Intensitat 9',
      formato: 'capsules',
      tipo: 'natural',
      notas: 'Compatible Nespresso. Intensidad 9',
    },
  },
  {
    file: 'BONPREU Càpsules de cafè Ristretto descafeïnat.webp',
    id: 'bonpreu_capsules_ristretto_descafeinat',
    doc: {
      nombre: 'Càpsules cafè Ristretto descafeïnat',
      formato: 'capsules',
      tipo: 'descafeinado',
      decaf: true,
      notas: 'Compatible Nespresso',
    },
  },
  {
    file: 'BONPREU Càpsules de cafè Vulcano Intensitat 12.webp',
    id: 'bonpreu_capsules_vulcano_i12',
    doc: {
      nombre: 'Càpsules cafè Vulcano Intensitat 12',
      formato: 'capsules',
      tipo: 'natural',
      notas: 'Compatible Nespresso. Intensidad 12',
    },
  },
  {
    file: 'BONPREU Càpsules de cafè amb llet.webp',
    id: 'bonpreu_capsules_amb_llet',
    doc: {
      nombre: 'Càpsules cafè amb llet',
      formato: 'capsules',
      tipo: 'natural',
      notas: 'Compatible Dolce Gusto',
    },
  },
  {
    file: 'BONPREU Càpsules de cafè descafeïnat.webp',
    id: 'bonpreu_capsules_descafeinat',
    doc: {
      nombre: 'Càpsules cafè descafeïnat',
      formato: 'capsules',
      tipo: 'descafeinado',
      decaf: true,
      notas: 'Compatible Dolce Gusto',
    },
  },
  {
    file: 'BONPREU Càpsules de cafè exprés intens.webp',
    id: 'bonpreu_capsules_expres_intens',
    doc: {
      nombre: 'Càpsules cafè exprés intens',
      formato: 'capsules',
      tipo: 'natural',
      notas: 'Compatible Dolce Gusto',
    },
  },
  {
    file: 'BONPREU Càpsules de tallat.webp',
    id: 'bonpreu_capsules_tallat',
    doc: {
      nombre: 'Càpsules de tallat',
      formato: 'capsules',
      tipo: 'natural',
      notas: 'Compatible Dolce Gusto',
    },
  },
];

const base = {
  marca: 'Bonpreu',
  pais: 'España',
  origen: '',
  variedad: '',
  peso: '',
  tueste: '',
  notas: '',
  coffeeCategory: 'daily',
  category: 'supermarket',
  fuente: 'Bonpreu',
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
  console.log(`=== Import Bonpreu ${DRY_RUN ? '[DRY RUN]' : ''} ===\n`);

  if (DRY_RUN) {
    cafes.forEach((c, i) =>
      console.log(`  ${i + 1}. ${c.id} -> ${c.doc.nombre} (${c.doc.formato})`)
    );
    console.log(`\n  Total: ${cafes.length}`);
    return;
  }

  // Phase 1: Delete existing
  const snap = await db.collection('cafes').where('marca', '==', 'Bonpreu').get();
  console.log(`  Phase 1: Found ${snap.size} existing Bonpreu docs`);
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
      const storagePath = `${PREFIX}/${c.id}.png`;
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
      await db.collection('cafes').doc(c.id).set(fullDoc);
      created++;
      console.log(`  Created: ${c.id}`);
    } catch (err) {
      console.log(`  ERROR ${c.id}: ${err.message}`);
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
