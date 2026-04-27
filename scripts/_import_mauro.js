#!/usr/bin/env node
/**
 * Import Caffè Mauro — Combined from cerinicoffee.com + cafedujour.es
 * Only products with photos included
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

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
    const mod = url.startsWith('https') ? https : http;
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

const CER = 'https://cdn.shopify.com/s/files/1/0336/2940/5322';
const CDJ = 'https://cafedujour.es/media/catalog/product/cache/66ff6701000170c81cb5f5121ef5c488';

const products = [
  // ============ BEANS — 1 KG ============
  {
    id: 'mauro_maestoso_grano_1kg',
    nombre: 'Maestoso Grano 1kg',
    peso: '1kg',
    precio: 19.21,
    formato: 'beans',
    notas: 'Especiado, Tabaco',
    img: `${CDJ}/c/a/caffe-mauro-maestoso.webp`,
  },
  {
    id: 'mauro_premium_grano_1kg',
    nombre: 'Premium Grano 1kg',
    peso: '1kg',
    precio: 22.99,
    formato: 'beans',
    img: `${CER}/products/AWE-grani-1000-5050.jpg?v=1681049774`,
  },
  {
    id: 'mauro_special_bar_grano_1kg',
    nombre: 'Special Bar Grano 1kg',
    peso: '1kg',
    precio: 21.24,
    formato: 'beans',
    notas: 'Especiado',
    img: `${CER}/products/AWE-grani-1000-2080.jpg?v=1681049706`,
  },
  {
    id: 'mauro_de_luxe_grano_1kg',
    nombre: 'De Luxe Grano 1kg',
    peso: '1kg',
    precio: 24.88,
    formato: 'beans',
    notas: 'Floral, Chocolateado, Frutado',
    img: `${CER}/products/AWE-grani-1000-7030.jpg?v=1681049680`,
  },
  {
    id: 'mauro_centopercento_grano_1kg',
    nombre: 'Centopercento 100% Arabica Grano 1kg',
    peso: '1kg',
    precio: 24.75,
    formato: 'beans',
    variedad: '100% Arábica',
    notas: 'Floral, Frutado',
    img: `${CER}/products/AWE-grani-1000-100x100.jpg?v=1681049607`,
  },

  // ============ BEANS — 500G ============
  {
    id: 'mauro_premium_grano_500g',
    nombre: 'Premium Grano 500g',
    peso: '500g',
    precio: 12.99,
    formato: 'beans',
    img: `${CER}/products/AWE-grani-500-5050.jpg?v=1681049774`,
  },
  {
    id: 'mauro_decaffeinato_grano_500g',
    nombre: 'Decaffeinato Grano 500g',
    peso: '500g',
    precio: 14.99,
    formato: 'beans',
    decaf: true,
    img: `${CER}/products/AWE-grani-500-2575.jpg?v=1681049913`,
  },

  // ============ GROUND — 250G ============
  {
    id: 'mauro_classico_molido_250g',
    nombre: 'Classico Intenso e Cremoso Molido 250g',
    peso: '250g',
    precio: 5.99,
    formato: 'ground',
    img: `${CER}/files/mauro-classico-intenso-e-cremoso-ground-coffee-250g-coffee-mauro-981776.webp?v=1732293507`,
  },
  {
    id: 'mauro_decaf_ricco_aromatico_molido_250g',
    nombre: 'Decaf Ricco e Aromatico Molido 250g',
    peso: '250g',
    precio: 5.99,
    formato: 'ground',
    decaf: true,
    img: `${CER}/files/CAM004DecafGround250g.jpg?v=1771015400`,
  },
  {
    id: 'mauro_decaffeinato_molido_250g',
    nombre: 'Decaffeinato Molido 250g',
    peso: '250g',
    precio: 5.99,
    formato: 'ground',
    decaf: true,
    img: `${CER}/products/AWE-maci-250-2575.jpg?v=1681049505`,
  },

  // ============ CAPSULES NESPRESSO — 10 UDS ============
  {
    id: 'mauro_classico_nespresso_10',
    nombre: 'Classico Cápsulas Nespresso 10uds',
    peso: '10 cápsulas',
    precio: 4.99,
    formato: 'capsules',
    img: `${CER}/files/CAM022ClassicoCapsules10ct.jpg?v=1772213911`,
  },
  {
    id: 'mauro_arabica_nespresso_10',
    nombre: '100% Arabica Cápsulas Nespresso 10uds',
    peso: '10 cápsulas',
    precio: 4.99,
    formato: 'capsules',
    variedad: '100% Arábica',
    img: `${CER}/files/nespresso-caffe-mauro-Arabica-10_1200x1200_873c6e41-a80c-474d-8cb1-fd01b915589b.jpg?v=1772213877`,
  },
];

const baseData = {
  marca: 'Caffè Mauro',
  pais: 'Italia',
  origen: '',
  variedad: 'Blend',
  tueste: 'natural',
  tipo: 'natural',
  coffeeCategory: 'premium',
  category: 'premium',
  fuente: 'cerinicoffee.com, cafedujour.es',
  fuentePais: 'US, ES',
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
    `=== Caffè Mauro Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  if (DRY) {
    products.forEach((p, i) =>
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${p.id} ← ${p.nombre} [${p.formato}] ${p.precio}€`
      )
    );
    return;
  }

  // Delete existing Mauro docs
  let delCount = 0;
  for (const marca of ['Caffè Mauro', 'Caffe Mauro', 'Mauro', 'mauro']) {
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
        peso: p.peso,
        precio: p.precio,
        formato: p.formato,
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
