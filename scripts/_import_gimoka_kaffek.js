#!/usr/bin/env node
/**
 * Import Gimoka from kaffek.es — products NOT already in catalog
 * 21 new coffee products (Nespresso, DG, Caffitaly, Lavazza AMM, Nesp Pro, Senseo, ESE)
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
  // ══════ Nespresso 10 caps ══════
  {
    id: 'gimoka_intenso_kf_nesp_10',
    nombre: 'Gimoka Espresso Intenso 10 cápsulas Nespresso',
    peso: '10 cápsulas',
    precio: 1.79,
    intensidad: '9/10',
    notas: 'Frutos secos, Acidez agradable',
    img: `${K}/n/e/nespresso-gimoka-10-espresso-intenso-1201.webp`,
  },
  {
    id: 'gimoka_cremoso_kf_nesp_10',
    nombre: 'Gimoka Espresso Cremoso 10 cápsulas Nespresso',
    peso: '10 cápsulas',
    precio: 1.95,
    intensidad: '7/10',
    notas: 'Dulce, Afrutado',
    img: `${K}/n/e/nespresso-gimoka-10-espresso-cremoso-1201.webp`,
  },
  {
    id: 'gimoka_lungo_kf_nesp_10',
    nombre: 'Gimoka Lungo 100% Arabica 10 cápsulas Nespresso',
    peso: '10 cápsulas',
    precio: 1.79,
    intensidad: '5/10',
    variedad: 'Arábica',
    notas: 'Afrutado',
    img: `${K}/n/e/nespresso-gimoka-10-lungo-1201.webp`,
  },
  {
    id: 'gimoka_decaf_kf_nesp_10',
    nombre: 'Gimoka Espresso Descafeinado 10 cápsulas Nespresso',
    peso: '10 cápsulas',
    precio: 1.99,
    intensidad: '3/10',
    decaf: true,
    notas: 'Afrutado, Dulce',
    img: `${K}/n/e/nespresso-gimoka-10-espresso-decaffeinato-1201.webp`,
  },

  // ══════ Dolce Gusto 16 caps ══════
  {
    id: 'gimoka_esp_intenso_kf_dg_16',
    nombre: 'Gimoka Espresso Intenso 16 cápsulas Dolce Gusto',
    peso: '16 cápsulas',
    precio: 3.89,
    intensidad: '9/10',
    notas: 'Amargo, Avellana',
    img: `${K}/d/o/dolce-gusto-gimoka-16-espresso-intenso-1201.webp`,
  },
  {
    id: 'gimoka_americano_kf_dg_16',
    nombre: 'Gimoka Americano 16 cápsulas Dolce Gusto',
    peso: '16 cápsulas',
    precio: 3.59,
    intensidad: '7/10',
    img: `${K}/d/o/dolce-gusto-gimoka-16-americano-1201.webp`,
  },

  // ══════ Caffitaly 10 caps ══════
  {
    id: 'gimoka_vellutato_caffitaly_10',
    nombre: 'Gimoka Vellutato 10 cápsulas Caffitaly',
    peso: '10 cápsulas',
    precio: 2.25,
    intensidad: '7/10',
    img: `${K}/c/a/caffitaly-gimoka-10-vellutato-1201.webp`,
  },
  {
    id: 'gimoka_intenso_caffitaly_10',
    nombre: 'Gimoka Intenso 10 cápsulas Caffitaly',
    peso: '10 cápsulas',
    precio: 1.95,
    intensidad: '9/10',
    img: `${K}/c/a/caffitaly-gimoka-10-intenso-1201.webp`,
  },
  {
    id: 'gimoka_cremoso_caffitaly_10',
    nombre: 'Gimoka Cremoso 10 cápsulas Caffitaly',
    peso: '10 cápsulas',
    precio: 1.95,
    intensidad: '7/10',
    img: `${K}/c/a/caffitaly-gimoka-10-cremoso-1201.webp`,
  },
  {
    id: 'gimoka_deciso_caffitaly_10',
    nombre: 'Gimoka Deciso 10 cápsulas Caffitaly',
    peso: '10 cápsulas',
    precio: 1.95,
    intensidad: '8/10',
    img: `${K}/c/a/caffitaly-gimoka-10-deciso-1201.webp`,
  },

  // ══════ Lavazza A Modo Mio 16 caps ══════
  {
    id: 'gimoka_vellutato_lmm_16',
    nombre: 'Gimoka Vellutato 16 cápsulas Lavazza A Modo Mio',
    peso: '16 cápsulas',
    precio: 3.69,
    intensidad: '7/10',
    img: `${K}/l/a/lavazza-a-modo-mio-gimoka-16-vellutato-1201.webp`,
  },
  {
    id: 'gimoka_intenso_lmm_16',
    nombre: 'Gimoka Intenso 16 cápsulas Lavazza A Modo Mio',
    peso: '16 cápsulas',
    precio: 3.69,
    intensidad: '9/10',
    img: `${K}/l/a/lavazza-a-modo-mio-gimoka-16-intenso-1201.webp`,
  },
  {
    id: 'gimoka_cremoso_lmm_16',
    nombre: 'Gimoka Cremoso 16 cápsulas Lavazza A Modo Mio',
    peso: '16 cápsulas',
    precio: 3.69,
    intensidad: '7/10',
    img: `${K}/l/a/lavazza-a-modo-mio-gimoka-16-cremoso-1201.webp`,
  },

  // ══════ Nespresso Pro 50 caps ══════
  {
    id: 'gimoka_cremoso_nespro_50',
    nombre: 'Gimoka Espresso Cremoso 50 cápsulas Nespresso Pro',
    peso: '50 cápsulas',
    precio: 14.59,
    intensidad: '7/10',
    img: `${K}/n/e/nespresso-pro-gimoka-50-espresso-cremoso-1201.webp`,
  },
  {
    id: 'gimoka_vellutato_nespro_50',
    nombre: 'Gimoka Espresso Vellutato 50 cápsulas Nespresso Pro',
    peso: '50 cápsulas',
    precio: 15.59,
    intensidad: '6/10',
    img: `${K}/n/e/nespresso-pro-gimoka-50-espresso-vellutato-1201.webp`,
  },
  {
    id: 'gimoka_intenso_nespro_50',
    nombre: 'Gimoka Espresso Intenso 50 cápsulas Nespresso Pro',
    peso: '50 cápsulas',
    precio: 12.79,
    intensidad: '9/10',
    img: `${K}/n/e/nespresso-pro-gimoka-50-espresso-intenso-1201.webp`,
  },

  // ══════ Senseo 36 monodosis ══════
  {
    id: 'gimoka_mild_senseo_36',
    nombre: 'Gimoka Mild 36 monodosis Senseo',
    peso: '36 monodosis',
    precio: 5.29,
    intensidad: '4/10',
    img: `${K}/s/e/senseo-gimoka-36-mild-1201.webp`,
  },
  {
    id: 'gimoka_strong_senseo_36',
    nombre: 'Gimoka Strong 36 monodosis Senseo',
    peso: '36 monodosis',
    precio: 5.79,
    intensidad: '8/10',
    img: `${K}/s/e/senseo-gimoka-36-strong-1201.webp`,
  },
  {
    id: 'gimoka_classic_senseo_36',
    nombre: 'Gimoka Classic 36 monodosis Senseo',
    peso: '36 monodosis',
    precio: 5.79,
    intensidad: '6/10',
    img: `${K}/s/e/senseo-gimoka-36-classic-1201.webp`,
  },
  {
    id: 'gimoka_decaf_senseo_36',
    nombre: 'Gimoka Decaf 36 monodosis Senseo',
    peso: '36 monodosis',
    precio: 6.89,
    intensidad: '5/10',
    decaf: true,
    img: `${K}/s/e/senseo-gimoka-36-decaf-1201.webp`,
  },

  // ══════ E.S.E. 18 monodosis ══════
  {
    id: 'gimoka_granbar_ese_18',
    nombre: 'Gimoka Gran Bar 18 monodosis E.S.E.',
    peso: '18 monodosis',
    precio: 2.99,
    intensidad: '7/10',
    img: `${K}/e/s/ese-gimoka-18-gran-bar-1201.webp`,
  },
];

function baseData() {
  return {
    marca: 'Gimoka',
    pais: 'Italia',
    origen: '',
    variedad: 'Blend',
    tueste: 'natural',
    tipo: 'natural',
    coffeeCategory: 'commercial',
    category: 'commercial',
    fuente: 'kaffek.es',
    fuentePais: 'ES',
    formato: 'capsules',
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
    `=== Gimoka kaffek.es Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  if (DRY) {
    products.forEach((p, i) => {
      console.log(`  ${(i + 1).toString().padStart(2)}. [NEW] ${p.id} — ${p.nombre} ${p.precio}€`);
    });
    console.log(`\n  Total: ${products.length} new`);
    return;
  }

  let created = 0,
    noImg = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    try {
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
        ...(p.variedad ? { variedad: p.variedad } : {}),
        ...(p.notas ? { notas: p.notas } : {}),
        ...(p.decaf ? { decaf: true } : {}),
        ...photoFields,
      };

      await db.collection('cafes').doc(p.id).set(doc);
      created++;
      process.stdout.write(`\r  Processed ${i + 1}/${products.length}`);
    } catch (e) {
      console.log(`\n  ERR ${p.id}: ${e.message}`);
    }
  }

  console.log(`\n\n=== Done ===`);
  console.log(`  Created: ${created} new`);
  console.log(`  Without photo: ${noImg}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
