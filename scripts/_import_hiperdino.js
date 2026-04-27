#!/usr/bin/env node
/**
 * Import HiperDino (marca blanca Canarias) coffee products
 * Source: hiperdino.es — 11 coffee products (soluble, molido, grano)
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

// HiperDino images: use larger size (replace 200x200 with 600x600)
const CDN = 'https://cdn.hiperdino.es/catalog/product/600x600';

const products = [
  // ══════ Soluble ══════
  {
    id: 'hiperdino_soluble_descaf_200',
    nombre: 'HiperDino Café Soluble Descafeinado 200 g',
    peso: '200 g',
    precio: 4.25,
    formato: 'soluble',
    decaf: true,
    img: `${CDN}/000000000000610049_1.jpg`,
  },
  {
    id: 'hiperdino_soluble_natural_200',
    nombre: 'HiperDino Café Soluble Natural 200 g',
    peso: '200 g',
    precio: 3.71,
    formato: 'soluble',
    img: `${CDN}/000000000000599993_1.jpg`,
  },
  {
    id: 'hiperdino_soluble_descaf_100',
    nombre: 'HiperDino Café Soluble Descafeinado 100 g',
    peso: '100 g',
    precio: 2.84,
    formato: 'soluble',
    decaf: true,
    img: '',
  },
  {
    id: 'hiperdino_soluble_natural_100',
    nombre: 'HiperDino Café Soluble Natural 100 g',
    peso: '100 g',
    precio: 2.75,
    formato: 'soluble',
    img: '',
  },
  {
    id: 'hiperdino_soluble_descaf_sticks',
    nombre: 'HiperDino Café Soluble Descafeinado 10 x 20 g',
    peso: '10 x 20 g',
    precio: 1.19,
    formato: 'soluble',
    decaf: true,
    img: '',
  },

  // ══════ Molido ══════
  {
    id: 'hiperdino_molido_descaf_250',
    nombre: 'HiperDino Café Molido Descafeinado Natural 250 g',
    peso: '250 g',
    precio: 3.1,
    formato: 'ground',
    decaf: true,
    img: '',
  },
  {
    id: 'hiperdino_molido_natural_250',
    nombre: 'HiperDino Café Molido Natural 250 g',
    peso: '250 g',
    precio: 2.47,
    formato: 'ground',
    img: '',
  },
  {
    id: 'hiperdino_molido_mezcla_250',
    nombre: 'HiperDino Café Molido Mezcla 250 g',
    peso: '250 g',
    precio: 2.51,
    formato: 'ground',
    tipo: 'mezcla',
    img: '',
  },
  {
    id: 'hiperdino_molido_mezcla_500',
    nombre: 'HiperDino Café Molido Mezcla Almohadilla 500 g',
    peso: '500 g',
    precio: 4.9,
    formato: 'ground',
    tipo: 'mezcla',
    img: '',
  },
  {
    id: 'hiperdino_molido_natural_500',
    nombre: 'HiperDino Café Molido Natural Almohadilla 500 g',
    peso: '500 g',
    precio: 4.89,
    formato: 'ground',
    img: '',
  },

  // ══════ Grano ══════
  {
    id: 'hiperdino_grano_natural_1kg',
    nombre: 'HiperDino Café Natural en Grano 1 kg',
    peso: '1 kg',
    precio: 10.87,
    formato: 'beans',
    img: '',
  },
];

function baseData() {
  return {
    marca: 'HiperDino',
    pais: 'España',
    origen: '',
    variedad: 'Blend',
    tueste: 'natural',
    tipo: 'natural',
    coffeeCategory: 'commercial',
    category: 'commercial',
    fuente: 'hiperdino.es',
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
  console.log(`=== HiperDino Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`);

  if (DRY) {
    products.forEach((p, i) => {
      const hasImg = p.img ? '📷' : '  ';
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${hasImg} ${p.id} — ${p.nombre} ${p.precio}€`
      );
    });
    console.log(
      `\n  Total: ${products.length} new (${products.filter((p) => p.img).length} with photo)`
    );
    return;
  }

  let created = 0,
    noImg = 0;
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    try {
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
        ...baseData(),
        nombre: p.nombre,
        peso: p.peso,
        precio: p.precio,
        formato: p.formato,
        ...(p.decaf ? { decaf: true } : {}),
        ...(p.tipo ? { tipo: p.tipo, tueste: p.tipo === 'mezcla' ? 'mezcla' : 'natural' } : {}),
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
