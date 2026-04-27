#!/usr/bin/env node
/**
 * Import Eroski capsule products from local images in ~/Downloads/eroski/
 * Adds new Eroski + Eroski SeleQtia capsule docs with photos
 * Updates existing 10-capsule Eroski docs to keep them
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';
const IMG_DIR = path.join(require('os').homedir(), 'Downloads', 'eroski');

async function processAndUpload(docId, imgPath) {
  const buf = fs.readFileSync(imgPath);
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

// Pricing from supermercado.eroski.es (April 2026):
// Nespresso 50 uds Eroski = 9.39€ | Nespresso 20 uds Eroski = 3.79€
// Nespresso 20 uds SeleQtia = 5.30€
// Dolce Gusto 16 uds Eroski = 3.09€ | Dolce Gusto 26 uds Eroski = 5.09€

const products = [
  // ── EROSKI SELEQTIA — Nespresso 20 uds ──
  {
    id: 'eroski_seleqtia_colombia_nesp_20',
    marca: 'Eroski SeleQtia',
    nombre: 'Cápsulas Colombia compatible Nespresso 20 uds',
    peso: '20 cápsulas',
    precio: 5.3,
    formato: 'capsules',
    origen: 'Colombia',
    file: 'Café Colombia cápsulas comp. Nespresso SELEQTIA, caja 20 uds.jpg',
  },
  {
    id: 'eroski_seleqtia_kenya_nesp_20',
    marca: 'Eroski SeleQtia',
    nombre: 'Cápsulas Kenya compatible Nespresso 20 uds',
    peso: '20 cápsulas',
    precio: 5.3,
    formato: 'capsules',
    origen: 'Kenya',
    file: 'Café Kenya compatible Nespresso EROSKI SELEQTIA, caja 20 uds.jpg',
  },

  // ── EROSKI — Nespresso 50 uds ──
  {
    id: 'eroski_espresso_descaf_nesp_50',
    marca: 'Eroski',
    nombre: 'Cápsulas espresso descafeinado compatible Nespresso 50 uds',
    peso: '50 cápsulas',
    precio: 9.39,
    formato: 'capsules',
    decaf: true,
    file: 'Café espresso descafeinado comp. Nespresso EROSKI, caja 50 uds.jpg',
  },
  {
    id: 'eroski_espresso_extra_intenso_nesp_50',
    marca: 'Eroski',
    nombre: 'Cápsulas espresso extra intenso compatible Nespresso 50 uds',
    peso: '50 cápsulas',
    precio: 9.39,
    formato: 'capsules',
    file: 'Café espresso extra intenso comp. Nespresso EROSKI, caja 50 uds.jpg',
  },
  {
    id: 'eroski_espresso_lungo_nesp_50',
    marca: 'Eroski',
    nombre: 'Cápsulas espresso lungo compatible Nespresso 50 uds',
    peso: '50 cápsulas',
    precio: 9.39,
    formato: 'capsules',
    file: 'Café espresso lungo compatible Nespresso EROSKI, caja 50 uds.jpg',
  },
  {
    id: 'eroski_espresso_ristreto_nesp_50',
    marca: 'Eroski',
    nombre: 'Cápsulas espresso ristretto compatible Nespresso 50 uds',
    peso: '50 cápsulas',
    precio: 9.39,
    formato: 'capsules',
    file: 'Café espresso ristreto comp. Nespresso EROSKI, caja 50 uds.jpg',
  },

  // ── EROSKI — Nespresso 20 uds ──
  {
    id: 'eroski_ristreto_intenso_nesp_20',
    marca: 'Eroski',
    nombre: 'Cápsulas ristretto intenso compatible Nespresso 20 uds',
    peso: '20 cápsulas',
    precio: 3.79,
    formato: 'capsules',
    file: 'Café Ristreto intenso compatible Nespresso EROSKI, caja 20 uds.jpg',
  },
  {
    id: 'eroski_descaf_nesp_20',
    marca: 'Eroski',
    nombre: 'Cápsulas descafeinado compatible Nespresso 20 uds',
    peso: '20 cápsulas',
    precio: 3.79,
    formato: 'capsules',
    decaf: true,
    file: 'Café descafeinado compatible Nespresso EROSKI, caja 20 uds.jpg',
  },
  {
    id: 'eroski_extra_intenso_nesp_20',
    marca: 'Eroski',
    nombre: 'Cápsulas extra intenso compatible Nespresso 20 uds',
    peso: '20 cápsulas',
    precio: 3.79,
    formato: 'capsules',
    file: 'Café expresso extra intenso comp. Nespresso EROSKI, caja 20 uds.jpg',
  },
  {
    id: 'eroski_intenso_nesp_20',
    marca: 'Eroski',
    nombre: 'Cápsulas intenso compatible Nespresso 20 uds',
    peso: '20 cápsulas',
    precio: 3.79,
    formato: 'capsules',
    file: 'Café expresso intenso compatible Nespresso EROSKI, caja 20 uds.jpg',
  },

  // ── EROSKI — Dolce Gusto 16 uds ──
  {
    id: 'eroski_cleche_descaf_dg_16',
    marca: 'Eroski',
    nombre: 'Cápsulas con leche descafeinado compatible Dolce Gusto 16 uds',
    peso: '16 cápsulas',
    precio: 3.09,
    formato: 'capsules',
    decaf: true,
    file: 'Café c:leche descafeinado comp. Dolce Gusto EROSKI, caja 16 uds.jpg',
  },
  {
    id: 'eroski_capuccino_dg_16',
    marca: 'Eroski',
    nombre: 'Cápsulas capuccino compatible Dolce Gusto 16 uds',
    peso: '16 cápsulas',
    precio: 3.09,
    formato: 'capsules',
    file: 'Café capuccino comp. Dolce Gusto EROSKI, caja 16 uds.jpg',
  },
  {
    id: 'eroski_cleche_dg_16',
    marca: 'Eroski',
    nombre: 'Cápsulas con leche compatible Dolce Gusto 16 uds',
    peso: '16 cápsulas',
    precio: 3.09,
    formato: 'capsules',
    file: 'Café con leche comp. Dolce Gusto EROSKI, caja 16 uds.jpg',
  },
  {
    id: 'eroski_cortado_dg_16',
    marca: 'Eroski',
    nombre: 'Cápsulas cortado compatible Dolce Gusto 16 uds',
    peso: '16 cápsulas',
    precio: 3.09,
    formato: 'capsules',
    file: 'Café cortado compatible Dolce Gusto EROSKI, caja 16 uds.jpg',
  },
  {
    id: 'eroski_cortado_descaf_dg_16',
    marca: 'Eroski',
    nombre: 'Cápsulas cortado descafeinado compatible Dolce Gusto 16 uds',
    peso: '16 cápsulas',
    precio: 3.09,
    formato: 'capsules',
    decaf: true,
    file: 'Café cortado descafeinado comp. Dolce Gusto EROSKI, caja 16 uds.jpg',
  },
  {
    id: 'eroski_espresso_descaf_dg_16',
    marca: 'Eroski',
    nombre: 'Cápsulas espresso descafeinado compatible Dolce Gusto 16 uds',
    peso: '16 cápsulas',
    precio: 3.09,
    formato: 'capsules',
    decaf: true,
    file: 'Café espresso descaf. compatible Dolce Gusto EROSKI, caja 16 uds.jpg',
  },
  {
    id: 'eroski_intenso_dg_16',
    marca: 'Eroski',
    nombre: 'Cápsulas intenso compatible Dolce Gusto 16 uds',
    peso: '16 cápsulas',
    precio: 3.09,
    formato: 'capsules',
    file: 'Café expresso intenso compatible Dolce Gusto EROSKI, caja 16 uds.jpg',
  },
  {
    id: 'eroski_lungo_dg_16',
    marca: 'Eroski',
    nombre: 'Cápsulas lungo compatible Dolce Gusto 16 uds',
    peso: '16 cápsulas',
    precio: 3.09,
    formato: 'capsules',
    file: 'Café lungo compatible Dolce Gusto EROSKI, caja 16 uds.jpg',
  },

  // ── EROSKI — Dolce Gusto 26 uds ──
  {
    id: 'eroski_cleche_dg_26',
    marca: 'Eroski',
    nombre: 'Cápsulas con leche compatible Dolce Gusto 26 uds',
    peso: '26 cápsulas',
    precio: 5.09,
    formato: 'capsules',
    file: 'Café con leche compatible Dolce Gusto EROSKI, caja 26 uds.jpg',
  },
];

function baseData(marca) {
  return {
    marca,
    pais: 'España',
    origen: '',
    variedad: 'Blend',
    tueste: 'natural',
    tipo: 'natural',
    coffeeCategory: 'supermarket',
    category: 'supermarket',
    fuente: 'supermercado.eroski.es',
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
}

async function main() {
  const DRY = process.argv.includes('--dry-run');
  console.log(
    `=== Eroski Capsules Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  // Verify all images exist
  let missing = 0;
  for (const p of products) {
    const fp = path.join(IMG_DIR, p.file);
    if (!fs.existsSync(fp)) {
      console.log(`  MISSING: ${p.file}`);
      missing++;
    }
  }
  if (missing > 0) {
    console.log(`\n${missing} images missing!`);
    if (!DRY) process.exit(1);
  }

  if (DRY) {
    products.forEach((p, i) => {
      const fp = path.join(IMG_DIR, p.file);
      const exists = fs.existsSync(fp) ? '✓' : '✗';
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${exists} [${p.marca}] ${p.id} — ${p.nombre} ${p.precio}€`
      );
    });
    return;
  }

  let ok = 0,
    updated = 0,
    noImg = 0;
  for (const p of products) {
    try {
      const existing = await db.collection('cafes').doc(p.id).get();
      const isUpdate = existing.exists;

      let photoUrl = '';
      const fp = path.join(IMG_DIR, p.file);
      if (fs.existsSync(fp)) {
        try {
          photoUrl = await processAndUpload(p.id, fp);
        } catch (e) {
          console.log(`\n  WARN img ${p.id}: ${e.message}`);
          noImg++;
        }
      } else {
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
        ...baseData(p.marca),
        nombre: p.nombre,
        peso: p.peso,
        precio: p.precio,
        formato: p.formato,
        ...(p.origen ? { origen: p.origen } : {}),
        ...(p.decaf ? { decaf: true, tipo: 'descafeinado' } : {}),
        ...photoFields,
      };

      if (isUpdate) {
        const { createdAt, ...updateFields } = doc;
        updateFields.updatedAt = new Date().toISOString();
        await db.collection('cafes').doc(p.id).update(updateFields);
        updated++;
      } else {
        await db.collection('cafes').doc(p.id).set(doc);
      }

      ok++;
      process.stdout.write(`\r  Processed ${ok}/${products.length}`);
    } catch (e) {
      console.log(`\n  ERROR ${p.id}: ${e.message}`);
    }
  }

  console.log(`\n\n=== Done ===`);
  console.log(`  Created: ${ok - updated} new | Updated: ${updated}`);
  console.log(`  Without photo: ${noImg}`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
