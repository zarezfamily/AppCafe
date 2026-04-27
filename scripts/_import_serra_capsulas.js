#!/usr/bin/env node
/**
 * Import Cafès Serra — Capsule products from cafesserra.com/es/collections/cafe-encapsulat
 * 5 products: 2 Nespresso-compatible + 3 ESE monodosis
 * Adds to existing 6 Serra grain docs (does NOT delete those)
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
    const mod = url.startsWith('https') ? https : require('http');
    mod
      .get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const loc = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, url).href;
            return fetchBuf(loc).then(resolve, reject);
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

const CDN = 'https://cafesserra.com/cdn/shop/files';

const products = [
  // ============ CÁPSULAS NESPRESSO-COMPATIBLE (compostables, 22u) ============
  {
    id: 'serra_capsula_ecologica',
    nombre: 'Cápsula Ecológica Compostable Canigó 22 uds',
    formato: 'nespresso_compatible',
    peso: '22 cápsulas',
    precio: 7.3,
    variedad: '100% Arábica',
    isBio: true,
    img: `${CDN}/CAFES-SERRA-Capsula-Ecologica.png?v=1714406268&width=1000`,
    notas:
      'Cápsulas compostables con cafés ecológicos 100% Arábica de cooperativas solidarias. Filosofía Km 0. Envase y cápsulas compostables',
  },

  {
    id: 'serra_capsula_descafeinado_eco',
    nombre: 'Cápsula Descafeinado Ecológica Compostable 22 uds',
    formato: 'nespresso_compatible',
    peso: '22 cápsulas',
    precio: 7.3,
    variedad: '100% Arábica',
    isBio: true,
    decaf: true,
    img: `${CDN}/CAFES-SERRA-Capsula-Ecologica-Decaf.png?v=1714406279&width=1000`,
    notas:
      'Cápsulas compostables descafeinadas con cafés ecológicos 100% Arábica de cooperativas solidarias. Filosofía Km 0',
  },

  // ============ MONODOSIS ESE (cialda) ============
  {
    id: 'serra_monodosis_homenaje',
    nombre: 'Monodosis Homenaje 25 uds',
    formato: 'ese_pod',
    peso: '25 monodosis',
    precio: 9.4,
    variedad: '100% Arábica',
    img: `${CDN}/CAFES-SERRA-Cialda-Homenatge.jpg?v=1716794231&width=1000`,
    notas:
      'Combinación de cuatro cafés Arábica de América Central y Brasil. Nota de cata: gustoso, dulce, persistente. Crema consistente, aromático, cítricos',
  },

  {
    id: 'serra_monodosis_ecologicum_descaf',
    nombre: 'Monodosis Ecologicum Descafeinado 25 uds',
    formato: 'ese_pod',
    peso: '25 monodosis',
    precio: 12.7,
    isBio: true,
    decaf: true,
    img: `${CDN}/CAFES-SERRA-Cialda-Ecologicum-Decaf.jpg?v=1714405342&width=1000`,
    notas:
      'Descafeinados ecológicos de máxima calidad. Certificado Café Mundi: parte de beneficios destinados a acciones sociales en países productores',
  },

  {
    id: 'serra_monodosis_tranquilo',
    nombre: 'Monodosis Tranquilo 50 uds',
    formato: 'ese_pod',
    peso: '50 monodosis',
    precio: 18.15,
    decaf: true,
    img: `${CDN}/CAFES-SERRA-Cialda-Tranquil.jpg?v=1714405356&width=1000`,
    notas:
      'Descafeinado por métodos de agua. Nota de cata: suave, sin amargor ni astringencia. Chocolate y frutos secos (nueces)',
  },
];

const baseData = {
  marca: 'Cafès Serra',
  pais: 'España',
  origen: '',
  variedad: 'Blend',
  tueste: 'natural',
  tipo: 'natural',
  coffeeCategory: 'commercial',
  category: 'commercial',
  fuente: 'cafesserra.com',
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
    `=== Cafès Serra Capsules Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  if (DRY) {
    products.forEach((p, i) =>
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${p.id} ← ${p.nombre} [${p.formato}] ${p.precio}€`
      )
    );
    return;
  }

  // Delete only capsule docs if re-running (not the 6 existing grain docs)
  const capsuleIds = products.map((p) => p.id);
  for (const id of capsuleIds) {
    const doc = await db.collection('cafes').doc(id).get();
    if (doc.exists) {
      await doc.ref.delete();
      try {
        await bucket.file(`${PREFIX}/${id}.png`).delete();
      } catch {}
      console.log(`  Deleted old: ${id}`);
    }
  }

  let ok = 0,
    noImg = 0;
  for (const p of products) {
    try {
      let photoUrl = '';
      if (p.img) {
        try {
          photoUrl = await processAndUpload(p.id, p.img);
        } catch (e) {
          console.log(`\n  WARN img ${p.id}: ${e.message}`);
          noImg++;
        }
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
        ...(p.variedad ? { variedad: p.variedad } : {}),
        ...(p.notas ? { notas: p.notas } : {}),
        ...(p.decaf ? { decaf: true, tipo: 'descafeinado' } : {}),
        ...(p.isBio ? { isBio: true } : {}),
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
