#!/usr/bin/env node
/**
 * Import Cafés Valiente — Full catalog from cafentoshop.com
 * 6 products: 4 molido + 2 monodosis ESE
 * Photos from local ~/Downloads/cafe valiente/
 * Replaces existing "Cafés Valiente" docs
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const fs = require('fs');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

async function processAndUploadLocal(docId, localFile) {
  const buf = fs.readFileSync(localFile);
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

const DL = '/Users/homme.maktub/Downloads/cafe valiente';

const products = [
  // ============ MOLIDO ============
  {
    id: 'valiente_molido_natural',
    nombre: 'Café Molido Natural 250g',
    formato: 'ground',
    peso: '250g',
    precio: 3.9,
    localImg: `${DL}/Café molido Valiente natural - 250g.jpg`,
    notas: 'Café molido natural Valiente',
  },

  {
    id: 'valiente_molido_arabica',
    nombre: 'Café 100% Arábica Molido 250g',
    formato: 'ground',
    peso: '250g',
    precio: 5.04,
    variedad: '100% Arábica',
    localImg: `${DL}/Café Valiente 100% arábica molido - 250g.jpg`,
    notas: 'Café molido 100% Arábica Valiente',
  },

  {
    id: 'valiente_molido_colombia',
    nombre: 'Café Colombia 100% Arábica Molido 250g',
    formato: 'ground',
    peso: '250g',
    precio: 5.67,
    variedad: '100% Arábica',
    origen: 'Colombia',
    localImg: `${DL}/Café Valiente colombia 100% Arábica molido - 250g 5,67 € Añadir al carrito Café Valiente descafeinado molido - 250g Café Valiente descafeinado molido .jpg`,
    notas: 'Café molido Colombia 100% Arábica Valiente',
  },

  {
    id: 'valiente_molido_descafeinado',
    nombre: 'Café Descafeinado Molido 250g',
    formato: 'ground',
    peso: '250g',
    precio: 5.59,
    decaf: true,
    localImg: `${DL}/Café Valiente descafeinado molido - 250g.jpg`,
    notas: 'Café molido descafeinado Valiente',
  },

  // ============ MONODOSIS ESE ============
  {
    id: 'valiente_monodosis_natural',
    nombre: 'Monodosis Café Natural 14 uds',
    formato: 'ese_pod',
    peso: '14 monodosis',
    precio: 4.59,
    localImg: `${DL}/Monodosis café natural Valiente - 14 unidades.jpg`,
    notas: 'Monodosis ESE café natural Valiente',
  },

  {
    id: 'valiente_monodosis_descafeinado',
    nombre: 'Monodosis Café Descafeinado 14 uds',
    formato: 'ese_pod',
    peso: '14 monodosis',
    precio: 4.73,
    decaf: true,
    localImg: `${DL}/Monodosis café descafeinado Valiente - 14 unidades.jpg`,
    notas: 'Monodosis ESE café descafeinado Valiente',
  },
];

const baseData = {
  marca: 'Cafés Valiente',
  pais: 'España',
  origen: '',
  variedad: 'Blend',
  tueste: 'natural',
  tipo: 'natural',
  coffeeCategory: 'commercial',
  category: 'commercial',
  fuente: 'cafentoshop.com',
  fuentePais: 'ES',
  isBio: false,
  decaf: false,
  notas: '',
  fecha: new Date().toISOString(),
  puntuacion: 0,
  votos: 0,
  status: 'approved',
  reviewStatus: 'approved',
  appVisible: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

async function main() {
  const DRY = process.argv.includes('--dry-run');
  console.log(
    `=== Cafés Valiente Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  if (DRY) {
    products.forEach((p, i) =>
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${p.id} ← ${p.nombre} [${p.formato}] ${p.precio}€`
      )
    );
    return;
  }

  // Delete existing Valiente docs
  let delCount = 0;
  for (const marca of ['Cafés Valiente', 'Cafes Valiente', 'Café Valiente']) {
    const snap = await db.collection('cafes').where('marca', '==', marca).get();
    for (const d of snap.docs) {
      await d.ref.delete();
      try {
        await bucket.file(`${PREFIX}/${d.id}.png`).delete();
      } catch {}
      delCount++;
    }
  }
  if (delCount > 0) console.log(`  Deleted ${delCount} old docs\n`);

  let ok = 0,
    noImg = 0;
  for (const p of products) {
    try {
      let photoUrl = '';
      if (p.localImg && fs.existsSync(p.localImg)) {
        try {
          photoUrl = await processAndUploadLocal(p.id, p.localImg);
        } catch (e) {
          console.log(`\n  WARN img ${p.id}: ${e.message}`);
          noImg++;
        }
      } else {
        console.log(`\n  WARN: file not found for ${p.id}`);
        noImg++;
      }

      const photoFields = photoUrl
        ? {
            fotoUrl: photoUrl,
            foto: photoUrl,
            imageUrl: photoUrl,
            officialPhoto: photoUrl,
            bestPhoto: photoUrl,
            imagenUrl: photoUrl,
            photos: { selected: photoUrl, original: photoUrl, bgRemoved: photoUrl },
          }
        : {};

      const doc = {
        ...baseData,
        nombre: p.nombre,
        formato: p.formato,
        peso: p.peso,
        precio: p.precio,
        ...(p.origen ? { origen: p.origen } : {}),
        ...(p.variedad ? { variedad: p.variedad } : {}),
        ...(p.notas ? { notas: p.notas } : {}),
        ...(p.decaf ? { decaf: true, tipo: 'descafeinado' } : {}),
        ...photoFields,
      };
      await db.collection('cafes').doc(p.id).set(doc);
      ok++;
      process.stdout.write(`\r  Created ${ok}/${products.length}`);
    } catch (e) {
      console.log(`\n  ERROR ${p.id}: ${e.message}`);
    }
  }
  console.log(`\n\n=== Done: created ${ok} new (${noImg} without photo) ===`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
