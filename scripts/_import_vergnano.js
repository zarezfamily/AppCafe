#!/usr/bin/env node
/**
 * Import Caffè Vergnano 1882 — Data from caffevergnano.es + amazon.es + cafedujour.es
 * 29 products: beans, ground, Nespresso, A Modo Mio, Dolce Gusto, ESE pods
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
          if (res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }
      )
      .on('error', reject);
  });
}

async function tryFetch(urls) {
  for (const url of urls) {
    try {
      return await fetchBuf(url);
    } catch {}
  }
  throw new Error(`All URLs failed: ${urls.join(', ')}`);
}

async function processAndUpload(docId, imgUrls) {
  const urls = Array.isArray(imgUrls) ? imgUrls : [imgUrls];
  const buf = await tryFetch(urls);
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

// Image base paths from caffevergnano.es
const V5 = 'https://www.caffevergnano.es/wp-content/uploads/2022/05';
const V11 = 'https://www.caffevergnano.es/wp-content/uploads/2023/11';

const products = [
  // ============ BEANS ============
  {
    id: 'vergnano_arabica_100_grano_250g',
    nombre: '100% Arabica Granos 250g',
    peso: '250g',
    precio: 8.49,
    formato: 'beans',
    variedad: '100% Arábica',
    notas: 'Suave, Aromático',
    intensidad: '3/5',
    img: [`${V5}/arabica-grani-2-500x500.jpg`, `${V11}/arabica-grani-2-500x500.jpg`],
  },

  {
    id: 'vergnano_granaroma_grano_500g',
    nombre: 'Granaroma Granos 500g',
    peso: '500g',
    precio: 10.49,
    formato: 'beans',
    notas: 'Chocolate, Intenso',
    intensidad: '4/5',
    img: [`${V5}/granaroma-1-500x500.jpg`, `${V11}/granaroma-1-500x500.jpg`],
  },

  {
    id: 'vergnano_espresso_grano_1kg',
    nombre: 'Espresso Granos 1kg',
    peso: '1kg',
    precio: 18.8,
    formato: 'beans',
    notas: 'Fruta, Cacao',
    img: [`${V11}/grani-espresso-500x500.webp`, `${V5}/grani-espresso-500x500.webp`],
  },

  {
    id: 'vergnano_anticabottega_grano_1kg',
    nombre: 'Antica Bottega Granos 1kg',
    peso: '1kg',
    precio: 19.21,
    formato: 'beans',
    notas: 'Fruta, Chocolate',
    img: [`${V11}/anticabottega-grani-500x500.webp`, `${V5}/anticabottega-grani-500x500.webp`],
  },

  {
    id: 'vergnano_granaroma_grano_1kg',
    nombre: 'Granaroma Granos 1kg',
    peso: '1kg',
    precio: 17.04,
    formato: 'beans',
    notas: 'Chocolate, Intenso',
    img: [`${V5}/granaroma-1-500x500.jpg`, `${V11}/granaroma-1-500x500.jpg`],
  },

  // ============ GROUND — LATA ============
  {
    id: 'vergnano_arabica_espresso_lata_250g',
    nombre: '100% Arabica Espresso Lata 250g',
    peso: '250g',
    precio: 8.24,
    formato: 'ground',
    variedad: '100% Arábica',
    notas: 'Vainilla, Chocolate, Canela',
    img: [`${V5}/latta-arabica-500x500.jpg`, `${V11}/latta-arabica-500x500.jpg`],
  },

  {
    id: 'vergnano_arabica_moka_lata_250g',
    nombre: '100% Arabica Moka Lata 250g',
    peso: '250g',
    precio: 6.89,
    formato: 'ground',
    variedad: '100% Arábica',
    notas: 'Suave, Equilibrado',
    img: [`${V5}/latta-arabica-500x500.jpg`, `${V11}/latta-arabica-500x500.jpg`],
  },

  {
    id: 'vergnano_decaffeinato_lata_250g',
    nombre: 'Decaffeinato Lata 250g',
    peso: '250g',
    precio: 8.47,
    formato: 'ground',
    notas: 'Frutos secos, Cacao, Caramelo',
    decaf: true,
    img: [`${V5}/latta-dec-500x500.jpg`, `${V11}/latta-dec-500x500.jpg`],
  },

  {
    id: 'vergnano_turco_lata_250g',
    nombre: 'Café Turco Lata 250g',
    peso: '250g',
    precio: 7.49,
    formato: 'ground',
    notas: 'Rico, Fenólico',
    img: [`${V11}/turkish-500x500.webp`, `${V5}/turkish-500x500.webp`],
  },

  // ============ GROUND — BRICK ============
  {
    id: 'vergnano_granaroma_molido_500g',
    nombre: 'Granaroma Molido 500g',
    peso: '500g',
    precio: 9.9,
    formato: 'ground',
    notas: 'Cacao, Frutos secos, Clavo',
    img: [`${V5}/granaroma-500x500.jpg`, `${V11}/granaroma-500x500.jpg`],
  },

  {
    id: 'vergnano_anticabottega_molido_250g',
    nombre: 'Antica Bottega Molido 250g',
    peso: '250g',
    precio: 7.49,
    formato: 'ground',
    notas: 'Amaretto, Pastelería, Chocolate',
    img: [`${V5}/anticabottega-500x500.jpg`, `${V11}/anticabottega-500x500.jpg`],
  },

  {
    id: 'vergnano_espresso_casa_molido_250g',
    nombre: 'Espresso Casa Molido 250g',
    peso: '250g',
    precio: 5.49,
    formato: 'ground',
    notas: 'Clavo, Madera resinosa',
    img: [`${V5}/espresso-casa-500x500.jpg`, `${V11}/espresso-casa-500x500.jpg`],
  },

  // ============ NESPRESSO CAPSULES — 50 ============
  {
    id: 'vergnano_cremoso_nespresso_50',
    nombre: 'Cremoso Cápsulas Nespresso 50uds',
    peso: '50 cápsulas',
    precio: 16.49,
    formato: 'capsules',
    notas: 'Fruta tropical',
    intensidad: '6/10',
    img: [`${V5}/capsule-espresso-50-500x500.jpg`, `${V11}/capsule-espresso-50-500x500.jpg`],
  },

  {
    id: 'vergnano_oro_nespresso_50',
    nombre: 'Oro Cápsulas Nespresso 50uds',
    peso: '50 cápsulas',
    precio: 16.49,
    formato: 'capsules',
    notas: 'Bergamota, Floral',
    intensidad: '4/10',
    img: [`${V5}/capsule-oro-50-500x500.jpg`, `${V11}/capsule-oro-50-500x500.jpg`],
  },

  {
    id: 'vergnano_napoli_nespresso_50',
    nombre: 'Napoli Cápsulas Nespresso 50uds',
    peso: '50 cápsulas',
    precio: 16.49,
    formato: 'capsules',
    notas: 'Tueste profundo',
    intensidad: '10/10',
    img: [`${V11}/napoli10-500x500.webp`, `${V5}/napoli10-500x500.webp`],
  },

  {
    id: 'vergnano_intenso_nespresso_50',
    nombre: 'Intenso Cápsulas Nespresso 50uds',
    peso: '50 cápsulas',
    precio: 16.49,
    formato: 'capsules',
    notas: 'Madera resinosa, Cacao',
    intensidad: '8/10',
    img: [`${V5}/capsule-intenso-50-1-500x500.jpg`, `${V11}/capsule-intenso-50-1-500x500.jpg`],
  },

  {
    id: 'vergnano_descafeinato_nespresso_50',
    nombre: 'Descafeinato Cápsulas Nespresso 50uds',
    peso: '50 cápsulas',
    precio: 16.49,
    formato: 'capsules',
    notas: 'Cítrico, Fruta amarilla',
    intensidad: '5/10',
    decaf: true,
    img: [`${V5}/capsule-dec-50-500x500.jpg`, `${V11}/capsule-dec-50-500x500.jpg`],
  },

  {
    id: 'vergnano_napoli_nespresso_10',
    nombre: 'Napoli Cápsulas Nespresso 10uds',
    peso: '10 cápsulas',
    precio: 4.49,
    formato: 'capsules',
    notas: 'Tueste profundo',
    intensidad: '10/10',
    img: [`${V11}/napoli10-500x500.webp`, `${V5}/napoli10-500x500.webp`],
  },

  // ============ A MODO MIO CAPSULES — 16 ============
  {
    id: 'vergnano_napoli_amm_16',
    nombre: 'Napoli Cápsulas A Modo Mio 16uds',
    peso: '16 cápsulas',
    precio: 5.99,
    formato: 'capsules',
    notas: 'Tueste profundo, Intenso',
    img: [`${V11}/napoli-amm-500x500.webp`, `${V5}/napoli-amm-500x500.webp`],
  },

  {
    id: 'vergnano_decaffeinato_amm_16',
    nombre: 'Decaffeinato Cápsulas A Modo Mio 16uds',
    peso: '16 cápsulas',
    precio: 5.99,
    formato: 'capsules',
    decaf: true,
    img: [`${V11}/decaf-amm-500x500.webp`, `${V5}/decaf-amm-500x500.webp`],
  },

  {
    id: 'vergnano_cremoso_amm_16',
    nombre: 'Cremoso Cápsulas A Modo Mio 16uds',
    peso: '16 cápsulas',
    precio: 5.99,
    formato: 'capsules',
    notas: 'Cremoso, Suave',
    img: [`${V11}/cremoso-amm-500x500.webp`, `${V5}/cremoso-amm-500x500.webp`],
  },

  {
    id: 'vergnano_oro_amm_16',
    nombre: 'Oro Cápsulas A Modo Mio 16uds',
    peso: '16 cápsulas',
    precio: 5.99,
    formato: 'capsules',
    notas: 'Bergamota, Floral',
    img: [`${V11}/oro-capsule-500x500.webp`, `${V5}/oro-capsule-500x500.webp`],
  },

  // ============ DOLCE GUSTO CAPSULES — 12 ============
  {
    id: 'vergnano_descafeinato_dg_12',
    nombre: 'Descafeinato Cápsulas Dolce Gusto 12uds',
    peso: '12 cápsulas',
    precio: 4.99,
    formato: 'capsules',
    decaf: true,
    img: [`${V5}/dec-dg-500x500.jpg`, `${V11}/dec-dg-500x500.jpg`],
  },

  {
    id: 'vergnano_intenso_dg_12',
    nombre: 'Intenso Cápsulas Dolce Gusto 12uds',
    peso: '12 cápsulas',
    precio: 4.99,
    formato: 'capsules',
    notas: 'Intenso',
    img: [`${V5}/intenso-dg-500x500.jpg`, `${V11}/intenso-dg-500x500.jpg`],
  },

  {
    id: 'vergnano_cremoso_dg_12',
    nombre: 'Cremoso Cápsulas Dolce Gusto 12uds',
    peso: '12 cápsulas',
    precio: 4.99,
    formato: 'capsules',
    notas: 'Cremoso, Suave',
    img: [`${V5}/cremoso-cdg-500x500.jpg`, `${V11}/cremoso-cdg-500x500.jpg`],
  },

  {
    id: 'vergnano_napoli_dg_12',
    nombre: 'Napoli Cápsulas Dolce Gusto 12uds',
    peso: '12 cápsulas',
    precio: 4.99,
    formato: 'capsules',
    notas: 'Tueste profundo, Intenso',
    img: [`${V5}/napoli-dg-500x500.jpg`, `${V11}/napoli-dg-500x500.jpg`],
  },

  // ============ ESE PODS — 150 ============
  {
    id: 'vergnano_decaffeinato_ese_150',
    nombre: 'Decaffeinato Monodosis ESE 150uds',
    peso: '150 monodosis',
    precio: 34.99,
    formato: 'capsules',
    decaf: true,
    img: [`${V11}/cialde-dec-500x500.webp`, `${V5}/cialde-dec-500x500.webp`],
  },

  {
    id: 'vergnano_espresso_ese_150',
    nombre: 'Espresso Monodosis ESE 150uds',
    peso: '150 monodosis',
    precio: 34.99,
    formato: 'capsules',
    img: [`${V11}/cialde-espresso-500x500.webp`, `${V5}/cialde-espresso-500x500.webp`],
  },

  {
    id: 'vergnano_oro_ese_150',
    nombre: 'Oro Monodosis ESE 150uds',
    peso: '150 monodosis',
    precio: 34.99,
    formato: 'capsules',
    notas: 'Bergamota, Floral',
    img: [`${V11}/cialde-oro-500x500.webp`, `${V5}/cialde-oro-500x500.webp`],
  },
];

const baseData = {
  marca: 'Caffè Vergnano',
  pais: 'Italia',
  origen: '',
  variedad: 'Blend',
  tueste: 'natural',
  tipo: 'natural',
  coffeeCategory: 'premium',
  category: 'premium',
  fuente: 'caffevergnano.es',
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
    `=== Caffè Vergnano Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  if (DRY) {
    products.forEach((p, i) =>
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${p.id} ← ${p.nombre} [${p.formato}] ${p.precio}€`
      )
    );
    console.log(`\n  Total: ${products.length} products`);
    return;
  }

  // Delete existing Vergnano docs
  let delCount = 0;
  for (const marca of ['Caffè Vergnano', 'Caffe Vergnano', 'Vergnano', 'Caffè Vergnano 1882']) {
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
        ...(p.intensidad ? { intensidad: p.intensidad } : {}),
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
