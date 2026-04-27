#!/usr/bin/env node
/**
 * Import Cafés Pont — Full catalog from cafespont.com
 * 10 products: 6 grano + 4 molido (individual units, not multi-packs)
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

const U = 'https://cafespont.com/wp-content/uploads';

const products = [
  // ============ GRANO ============
  {
    id: 'pont_grano_collection_n34',
    nombre: 'Collection N34 Café en Grano 250g',
    formato: 'beans',
    peso: '250g',
    precio: 5.45,
    img: `${U}/2023/12/Diseno-sin-titulo-55-1160x1160.png`,
    notas:
      'Blend Arábica y Robusta de Sudamérica y Asia. Carácter profundo, ideal solo o con leche. Máquina automática',
  },

  {
    id: 'pont_grano_collection_n52',
    nombre: 'Collection N52 Café en Grano 250g',
    formato: 'beans',
    peso: '250g',
    precio: 5.45,
    variedad: '100% Arábica',
    img: `${U}/2021/02/Collection_52front.jpg`,
    notas: 'Blend equilibrado de Arábicas de Centroamérica y Sudamérica',
  },

  {
    id: 'pont_grano_collection_n73_eco',
    nombre: 'Collection N73 ECO Café en Grano Ecológico 250g',
    formato: 'beans',
    peso: '250g',
    precio: 5.95,
    variedad: '100% Arábica',
    isBio: true,
    img: `${U}/2021/11/DSC3581_FRENTE-1160x1160.jpg`,
    notas: 'Blend 100% Arábica ecológico certificado CCPAE. Agricultura ecológica',
  },

  {
    id: 'pont_grano_natural',
    nombre: 'Café en Grano Natural 250g',
    formato: 'beans',
    peso: '250g',
    precio: 4.4,
    img: `${U}/2019/10/CAFE-EN-GRANO-NATURAL-ALIMENTACION-250G.jpg`,
    notas: 'Blend muy equilibrado, cuerpo intenso. Ideal para consumirlo solo',
  },

  {
    id: 'pont_grano_mezcla',
    nombre: 'Café en Grano Mezcla 250g',
    formato: 'beans',
    peso: '250g',
    precio: 4.4,
    tueste: 'mezcla',
    img: `${U}/2019/10/CAFE-EN-GRANO-MEZCLA-250G.jpg`,
    notas: 'Mezcla equilibrada de cafés con tueste tradicional',
  },

  {
    id: 'pont_grano_descafeinado',
    nombre: 'Café en Grano Descafeinado 250g',
    formato: 'beans',
    peso: '250g',
    precio: 5.0,
    decaf: true,
    img: `${U}/2019/10/CAFE-EN-GRANO-DESCAFEINADO-ALIMENTACION-250G.jpg`,
    notas: 'Selección de orígenes descafeinado. Todos los matices sin cafeína',
  },

  // ============ MOLIDO ============
  {
    id: 'pont_molido_arabica',
    nombre: '100% Arábica Molido 250g',
    formato: 'ground',
    peso: '250g',
    precio: 5.9,
    variedad: '100% Arábica',
    img: `${U}/2019/10/arabica-cafes-pont.png`,
    notas: 'Café Arábica 100% molido. Receta original y exclusiva',
  },

  {
    id: 'pont_molido_natural',
    nombre: 'Café Molido Natural 250g',
    formato: 'ground',
    peso: '250g',
    precio: 3.7,
    img: `${U}/2019/10/natural-cafes-pont.png`,
    notas: 'Selección y combinación de cafés Arábica y Robusta',
  },

  {
    id: 'pont_molido_mezcla',
    nombre: 'Café Molido Mezcla 250g',
    formato: 'ground',
    peso: '250g',
    precio: 3.7,
    tueste: 'mezcla',
    img: `${U}/2019/10/CAFE-MOLIDO-MEZCLA-ALIMENTACION-250G.jpg`,
    notas: 'Mezcla equilibrada de cafés con tueste tradicional',
  },

  {
    id: 'pont_molido_descafeinado',
    nombre: 'Café Molido Descafeinado 250g',
    formato: 'ground',
    peso: '250g',
    precio: 4.3,
    decaf: true,
    img: `${U}/2019/10/CAFE-MOLIDO-DESCAFEINADO-ALIMENTACION-250G.jpg`,
    notas: 'Combinación de cafés descafeinados con las mejores tecnologías y procesos',
  },
];

const baseData = {
  marca: 'Cafés Pont',
  pais: 'España',
  origen: '',
  variedad: 'Blend',
  tueste: 'natural',
  tipo: 'natural',
  coffeeCategory: 'commercial',
  category: 'commercial',
  fuente: 'cafespont.com',
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
    `=== Cafés Pont Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  if (DRY) {
    products.forEach((p, i) =>
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${p.id} ← ${p.nombre} [${p.formato}] ${p.precio}€`
      )
    );
    return;
  }

  // Delete any existing Pont docs
  let delCount = 0;
  for (const marca of ['Cafés Pont', 'Cafes Pont']) {
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
        ...(p.origen ? { origen: p.origen } : {}),
        ...(p.variedad ? { variedad: p.variedad } : {}),
        ...(p.notas ? { notas: p.notas } : {}),
        ...(p.decaf ? { decaf: true, tipo: 'descafeinado' } : {}),
        ...(p.isBio ? { isBio: true } : {}),
        ...(p.tueste ? { tueste: p.tueste } : {}),
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
