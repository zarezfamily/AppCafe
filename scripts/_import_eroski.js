#!/usr/bin/env node
/**
 * Import/Update Eroski Basic & Eroski cafés
 * Sources: supermercado.eroski.es + capraboacasa.com
 * Also: update existing Eroski docs, delete Caprabo docs
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return fetchBuf(
              res.headers.location.startsWith('http')
                ? res.headers.location
                : new URL(res.headers.location, url).href
            ).then(resolve, reject);
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }
      )
      .on('error', reject);
  });
}

async function processAndUpload(docId, imgUrl) {
  const buf = await fetchBuf(imgUrl);
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

// Image URL pattern: https://supermercado.eroski.es//images/{eroId}.jpg
const IMG = 'https://supermercado.eroski.es//images';

const products = [
  // ============ EROSKI BASIC — MOLIDO ============
  {
    id: 'eroski_basic_molido_natural_250g',
    marca: 'Eroski Basic',
    nombre: 'Café molido natural 250g',
    peso: '250g',
    precio: 2.6,
    formato: 'ground',
    img: `${IMG}/8484214.jpg`,
  },
  {
    id: 'eroski_basic_molido_mezcla_250g',
    marca: 'Eroski Basic',
    nombre: 'Café molido mezcla 250g',
    peso: '250g',
    precio: 2.7,
    formato: 'ground',
    tipo: 'mezcla',
    img: `${IMG}/8484230.jpg`,
  },
  {
    id: 'eroski_basic_molido_descaf_250g',
    marca: 'Eroski Basic',
    nombre: 'Café molido descafeinado 250g',
    peso: '250g',
    precio: 2.7,
    formato: 'ground',
    decaf: true,
    img: `${IMG}/26697789.jpg`,
  },

  // ============ EROSKI BASIC — GRANO ============
  {
    id: 'eroski_basic_grano_natural_1kg',
    marca: 'Eroski Basic',
    nombre: 'Café en grano natural 1kg',
    peso: '1kg',
    precio: 11.0,
    formato: 'beans',
    img: `${IMG}/26607432.jpg`,
  },
  {
    id: 'eroski_basic_grano_natural_500g',
    marca: 'Eroski Basic',
    nombre: 'Café en grano natural 500g',
    peso: '500g',
    precio: 5.85,
    formato: 'beans',
    img: `${IMG}/8484263.jpg`,
  },
  {
    id: 'eroski_basic_grano_mezcla_500g',
    marca: 'Eroski Basic',
    nombre: 'Café en grano mezcla 500g',
    peso: '500g',
    precio: 5.15,
    formato: 'beans',
    tipo: 'mezcla',
    img: `${IMG}/8484289.jpg`,
  },
  {
    id: 'eroski_basic_grano_descaf_1kg',
    marca: 'Eroski Basic',
    nombre: 'Café en grano descafeinado 1kg',
    peso: '1kg',
    precio: 12.5,
    formato: 'beans',
    decaf: true,
    img: `${IMG}/26607457.jpg`,
  },
  {
    id: 'eroski_basic_grano_fuerte_1kg',
    marca: 'Eroski Basic',
    nombre: 'Café en grano natural fuerte 1kg',
    peso: '1kg',
    precio: 11.5,
    formato: 'beans',
    img: `${IMG}/26607440.jpg`,
  },

  // ============ EROSKI — CÁPSULAS ============
  {
    id: 'eroski_capsulas_espresso_nesp_10',
    marca: 'Eroski',
    nombre: 'Cápsulas espresso compatible Nespresso 10 uds',
    peso: '10 cápsulas',
    precio: 1.89,
    formato: 'capsules',
  },
  {
    id: 'eroski_capsulas_intenso_nesp_10',
    marca: 'Eroski',
    nombre: 'Cápsulas intenso compatible Nespresso 10 uds',
    peso: '10 cápsulas',
    precio: 1.89,
    formato: 'capsules',
  },
  {
    id: 'eroski_capsulas_descaf_nesp_10',
    marca: 'Eroski',
    nombre: 'Cápsulas descafeinado compatible Nespresso 10 uds',
    peso: '10 cápsulas',
    precio: 1.89,
    formato: 'capsules',
    decaf: true,
  },

  // ============ EROSKI — SOLUBLE ============
  {
    id: 'eroski_soluble_clasico_200g',
    marca: 'Eroski',
    nombre: 'Café soluble clásico 200g',
    peso: '200g',
    precio: 4.29,
    formato: 'instant',
    img: `${IMG}/19739796.jpg`,
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
    `=== Eroski Basic + Eroski Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  if (DRY) {
    products.forEach((p, i) =>
      console.log(
        `  ${(i + 1).toString().padStart(2)}. [${p.marca}] ${p.id} — ${p.nombre} [${p.formato}] ${p.precio}€ ${p.img ? '📷' : 'NO-PHOTO'}`
      )
    );
    console.log('\n  Will also DELETE all Caprabo docs');
    return;
  }

  // ── Step 1: Delete old Caprabo docs ──
  console.log('Step 1: Deleting Caprabo docs...');
  let delCount = 0;
  for (const marca of ['Caprabo', 'caprabo']) {
    const snap = await db.collection('cafes').where('marca', '==', marca).get();
    for (const d of snap.docs) {
      await d.ref.delete();
      try {
        await bucket.file(`${PREFIX}/${d.id}.png`).delete();
      } catch {}
      delCount++;
    }
  }
  console.log(`  Deleted ${delCount} Caprabo docs\n`);

  // ── Step 2: Create/Update Eroski Basic + Eroski ──
  console.log('Step 2: Creating/Updating Eroski products...');
  let ok = 0,
    noImg = 0,
    updated = 0;
  for (const p of products) {
    try {
      // Check if doc already exists (for the 3 existing Eroski docs)
      const existing = await db.collection('cafes').doc(p.id).get();
      const isUpdate = existing.exists;

      let photoUrl = '';
      if (p.img) {
        try {
          photoUrl = await processAndUpload(p.id, p.img);
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
        ...(p.tipo ? { tipo: p.tipo } : {}),
        ...(p.decaf ? { decaf: true, tipo: 'descafeinado' } : {}),
        ...photoFields,
      };

      if (isUpdate) {
        // Preserve existing createdAt; only update fields
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
  console.log(`  Caprabo deleted: ${delCount}`);
  console.log(`  Created: ${ok - updated} new | Updated: ${updated}`);
  console.log(`  Without photo: ${noImg}`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
