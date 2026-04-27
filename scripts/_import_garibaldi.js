#!/usr/bin/env node
/**
 * Update Garibaldi — kaffek.es (April 2026)
 * Updates 3 existing bean docs (price + new photos) + adds 10 new products
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

const K = 'https://kaffekapslen.media/media/catalog/product/cache/999c06501d91fbafc897cca169a07457';

const products = [
  // ══════ UPDATE existing beans (EAN IDs) ══════
  {
    id: 'ean_8003012003337',
    marca: 'Garibaldi',
    nombre: 'Garibaldi Intenso Grano 1kg',
    peso: '1kg',
    precio: 14.29,
    formato: 'beans',
    variedad: 'Arábica/Robusta',
    notas: 'Chocolate, Tabaco',
    img: `${K}/c/b/cb-garibaldi-1000g-intenso-1201.webp`,
  },
  {
    id: 'ean_8003012003351',
    marca: 'Garibaldi',
    nombre: 'Garibaldi Espresso Bar Grano 1kg',
    peso: '1kg',
    precio: 13.89,
    formato: 'beans',
    variedad: 'Robusta',
    notas: 'Tostadas, Galletas secas',
    img: `${K}/c/b/cb-garibaldi-1000g-espresso-bar-1201.webp`,
  },
  {
    id: 'ean_8003012008066',
    marca: 'Garibaldi',
    nombre: 'Garibaldi Gusto Dolce Grano 1kg',
    peso: '1kg',
    precio: 15.99,
    formato: 'beans',
    variedad: 'Arábica/Robusta',
    notas: 'Chocolate amargo, Naranja, Especias',
    img: `${K}/c/b/cb-garibaldi-1000g-gusto-dolce-1201.webp`,
  },

  // ══════ NEW — E.S.E. monodosis 50 uds ══════
  {
    id: 'garibaldi_dolce_aroma_ese_50',
    marca: 'Garibaldi',
    nombre: 'Dolce Aroma 50 monodosis E.S.E.',
    peso: '50 monodosis',
    precio: 7.39,
    formato: 'capsules',
    notas: 'Chocolate, Frutos secos',
    img: `${K}/e/s/ese-garibaldi-50-dolce-aroma-1201.webp`,
  },
  {
    id: 'garibaldi_intenso_ese_50',
    marca: 'Garibaldi',
    nombre: 'Intenso 50 monodosis E.S.E.',
    peso: '50 monodosis',
    precio: 7.59,
    formato: 'capsules',
    notas: 'Frutos secos tostados',
    img: `${K}/e/s/ese-garibaldi-50-intenso-1201.webp`,
  },

  // ══════ NEW — Lavazza A Modo Mio 16 uds ══════
  {
    id: 'garibaldi_dolce_aroma_lmm_16',
    marca: 'Garibaldi',
    nombre: 'Dolce Aroma 16 cápsulas Lavazza A Modo Mio',
    peso: '16 cápsulas',
    precio: 3.69,
    formato: 'capsules',
    notas: 'Frutos secos',
    img: `${K}/l/m/lmm-garibaldi-16-dolce-aroma-1201.webp`,
  },

  // ══════ NEW — Nespresso 10 uds ══════
  {
    id: 'garibaldi_lungo_nesp_10',
    marca: 'Garibaldi',
    nombre: 'Lungo 10 cápsulas Nespresso',
    peso: '10 cápsulas',
    precio: 1.85,
    formato: 'capsules',
    img: `${K}/n/e/nespresso-garibaldi-10-lungo-1201.webp`,
  },
  {
    id: 'garibaldi_gusto_dolce_nesp_10',
    marca: 'Garibaldi',
    nombre: 'Gusto Dolce 10 cápsulas Nespresso',
    peso: '10 cápsulas',
    precio: 2.09,
    formato: 'capsules',
    notas: 'Almendra, Frutos secos',
    img: `${K}/n/e/nespresso-garibaldi-10-gusto-dolce-1201.webp`,
  },
  {
    id: 'garibaldi_selezione_1860_nesp_10',
    marca: 'Garibaldi',
    nombre: 'Selezione 1860 10 cápsulas Nespresso',
    peso: '10 cápsulas',
    precio: 1.89,
    formato: 'capsules',
    variedad: 'Arábica',
    notas: 'Chocolate con leche, Naranja confitada',
    img: `${K}/n/e/nespresso-garibaldi-10-selezione-1860-1201.webp`,
  },
  {
    id: 'garibaldi_gran_cru_nesp_10',
    marca: 'Garibaldi',
    nombre: 'Gran Cru 10 cápsulas Nespresso',
    peso: '10 cápsulas',
    precio: 1.89,
    formato: 'capsules',
    variedad: 'Arábica',
    origen: 'Etiopía',
    notas: 'Frutos rojos, Cítricos, Cacao',
    img: `${K}/n/e/nespresso-garibaldi-10-gran-cru-1201.webp`,
  },
  {
    id: 'garibaldi_aroma_nesp_10',
    marca: 'Garibaldi',
    nombre: 'Aroma 10 cápsulas Nespresso',
    peso: '10 cápsulas',
    precio: 1.89,
    formato: 'capsules',
    notas: 'Frutos secos',
    img: `${K}/n/e/nespresso-garibaldi-10-aroma-1201.webp`,
  },
  {
    id: 'garibaldi_gusto_oro_nesp_10',
    marca: 'Garibaldi',
    nombre: 'Gusto Oro 10 cápsulas Nespresso',
    peso: '10 cápsulas',
    precio: 1.89,
    formato: 'capsules',
    notas: 'Almendras tostadas, Miel, Afrutado',
    img: `${K}/n/e/nespresso-garibaldi-10-gusto-oro-1201.webp`,
  },
  {
    id: 'garibaldi_intenso_nesp_10',
    marca: 'Garibaldi',
    nombre: 'Intenso 10 cápsulas Nespresso',
    peso: '10 cápsulas',
    precio: 1.89,
    formato: 'capsules',
    notas: 'Caramelo, Dulce',
    img: `${K}/n/e/nespresso-garibaldi-10-intenso-1201.webp`,
  },
];

function baseData() {
  return {
    marca: 'Garibaldi',
    pais: 'Italia',
    origen: '',
    variedad: 'Blend',
    tueste: 'natural',
    tipo: 'natural',
    coffeeCategory: 'specialty',
    category: 'specialty',
    fuente: 'kaffek.es',
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
  console.log(`=== Garibaldi Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`);

  if (DRY) {
    products.forEach((p, i) => {
      const tag = p.id.startsWith('ean_') ? 'UPD' : 'NEW';
      console.log(
        `  ${(i + 1).toString().padStart(2)}. [${tag}] ${p.id} — ${p.nombre} ${p.precio}€`
      );
    });
    console.log(`\n  Total: ${products.length} (3 updates + 10 new)`);
    return;
  }

  let created = 0,
    updated = 0,
    noImg = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    try {
      const existing = await db.collection('cafes').doc(p.id).get();
      const isUpdate = existing.exists;

      let photoUrl = '';
      try {
        photoUrl = await processAndUpload(p.id, p.img);
      } catch (e) {
        console.log(`\n  WARN img ${p.id}: ${e.message}`);
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
        ...baseData(),
        nombre: p.nombre,
        peso: p.peso,
        precio: p.precio,
        formato: p.formato,
        ...(p.origen ? { origen: p.origen } : {}),
        ...(p.variedad ? { variedad: p.variedad } : {}),
        ...(p.notas ? { notas: p.notas } : {}),
        ...photoFields,
      };

      if (isUpdate) {
        const { createdAt, ...upd } = doc;
        upd.updatedAt = new Date().toISOString();
        await db.collection('cafes').doc(p.id).update(upd);
        updated++;
      } else {
        await db.collection('cafes').doc(p.id).set(doc);
        created++;
      }
      process.stdout.write(`\r  Processed ${i + 1}/${products.length}`);
    } catch (e) {
      console.log(`\n  ERR ${p.id}: ${e.message}`);
    }
  }

  console.log(`\n\n=== Done ===`);
  console.log(`  Created: ${created} new | Updated: ${updated}`);
  console.log(`  Without photo: ${noImg}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
