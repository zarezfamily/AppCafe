#!/usr/bin/env node
/**
 * Update Gevalia — kaffek.es (April 2026)
 * Updates 2 existing bean docs + adds 4 new capsule products
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
  // ══════ UPDATE existing beans ══════
  {
    id: 'ean_8711000587249',
    marca: 'Gevalia',
    nombre: 'Gevalia Crema Grano 900g',
    peso: '900g',
    precio: 17.59,
    formato: 'beans',
    variedad: 'Arábica',
    img: `${K}/c/b/cb-gevalia-900g-crema-medium-roast-1201.webp`,
  },
  {
    id: 'ean_8711000587270',
    marca: 'Gevalia',
    nombre: 'Gevalia Espresso Grano 900g',
    peso: '900g',
    precio: 17.59,
    formato: 'beans',
    variedad: 'Arábica',
    img: `${K}/c/b/cb-gevalia-900g-espresso-dark-roast-1201.webp`,
  },

  // ══════ NEW — Tassimo 16 uds ══════
  {
    id: 'gevalia_dark_tassimo_16',
    marca: 'Gevalia',
    nombre: 'Dark 16 cápsulas Tassimo',
    peso: '16 cápsulas',
    precio: 5.59,
    formato: 'capsules',
    variedad: 'Arábica',
    img: `${K}/t/a/tassimo-gevalia-16-dark-1201.webp`,
  },
  {
    id: 'gevalia_original_tassimo_16',
    marca: 'Gevalia',
    nombre: 'Original 16 cápsulas Tassimo',
    peso: '16 cápsulas',
    precio: 4.99,
    formato: 'capsules',
    variedad: 'Arábica',
    img: `${K}/t/a/tassimo-gevalia-16-original-1201.webp`,
  },

  // ══════ NEW — Nespresso 10 uds ══════
  {
    id: 'gevalia_espresso_10_nesp_10',
    marca: 'Gevalia',
    nombre: 'Espresso 10 Intenso 10 cápsulas Nespresso',
    peso: '10 cápsulas',
    precio: 2.69,
    formato: 'capsules',
    notas: 'Especiado, Afrutado',
    img: `${K}/n/e/nespresso-gevalia-10-espresso-10-1201.webp`,
  },
  {
    id: 'gevalia_lungo_classico_nesp_10',
    marca: 'Gevalia',
    nombre: 'Lungo 6 Classico 10 cápsulas Nespresso',
    peso: '10 cápsulas',
    precio: 2.69,
    formato: 'capsules',
    notas: 'Roble, Chocolate',
    img: `${K}/n/e/nespresso-gevalia-10-lungo-06-1201.webp`,
  },
];

function baseData() {
  return {
    marca: 'Gevalia',
    pais: 'Suecia',
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
  console.log(`=== Gevalia Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`);

  if (DRY) {
    products.forEach((p, i) => {
      const tag = p.id.startsWith('ean_') ? 'UPD' : 'NEW';
      console.log(
        `  ${(i + 1).toString().padStart(2)}. [${tag}] ${p.id} — ${p.nombre} ${p.precio}€`
      );
    });
    console.log(`\n  Total: ${products.length} (2 updates + 4 new)`);
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
