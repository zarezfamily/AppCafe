#!/usr/bin/env node
/**
 * _import_costa.js – April 2026
 * Imports/updates Costa Coffee products from kaffek.es
 * 24 coffee products: 6 Nespresso, 3 Dolce Gusto, 3 Tassimo,
 *   4 beans, 2 ground, 6 Costa Podio capsules
 * Excludes: machines, bundles, chocolate caliente
 */

const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';
const IMG_BASE =
  'https://kaffekapslen.media/media/catalog/product/cache/999c06501d91fbafc897cca169a07457/';

// ─── Products ───────────────────────────────────────────────────

const PRODUCTS = [
  // ── Nespresso (6) ──
  {
    id: 'costa_nesp_lively_blend_10',
    nombre: 'Costa Lively Blend 10 cápsulas para Nespresso',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '10 cápsulas',
    tamano: '10 cápsulas',
    capsulas: 10,
    precio: 2.39,
    sistema: 'Nespresso',
    compatibilidad: 'Nespresso',
    intensidad: 10,
    descafeinado: false,
    imgFile: 'nespresso-costa-10-lively-blend-ristretto-1201.webp',
    url: 'https://kaffek.es/lively-blend-costa-nespresso-10.html',
  },
  {
    id: 'costa_nesp_espresso_signature_10',
    nombre: 'Costa Espresso Signature Blend 10 cápsulas para Nespresso',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '10 cápsulas',
    tamano: '10 cápsulas',
    capsulas: 10,
    precio: 2.45,
    sistema: 'Nespresso',
    compatibilidad: 'Nespresso',
    intensidad: 8,
    descafeinado: false,
    imgFile: 'nespresso-costa-10-signature-blend-espresso-1201.webp',
    url: 'https://kaffek.es/espresso-signature-blend-costa-nespresso-10.html',
  },
  {
    id: 'costa_nesp_lungo_signature_10',
    nombre: 'Costa Lungo Signature Blend 10 cápsulas para Nespresso',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '10 cápsulas',
    tamano: '10 cápsulas',
    capsulas: 10,
    precio: 2.55,
    sistema: 'Nespresso',
    compatibilidad: 'Nespresso',
    intensidad: 7,
    descafeinado: false,
    imgFile: 'nespresso-costa-10-signature-blend-lungo-1201.webp',
    url: 'https://kaffek.es/lungo-signature-blend-costa-nespresso-10.html',
  },
  {
    id: 'costa_nesp_bright_latin_10',
    nombre: 'Costa Bright Latin Blend 10 cápsulas para Nespresso',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '10 cápsulas',
    tamano: '10 cápsulas',
    capsulas: 10,
    precio: 2.59,
    sistema: 'Nespresso',
    compatibilidad: 'Nespresso',
    intensidad: 5,
    descafeinado: false,
    origen: 'América del Sur',
    imgFile: 'nespresso-costa-10-bright-latin-blend-1201.webp',
    url: 'https://kaffek.es/bright-latin-blend-costa-nespresso-10.html',
  },
  {
    id: 'costa_nesp_colombiano_10',
    nombre: 'Costa Intenso Colombiano Single Origin 10 cápsulas para Nespresso',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '10 cápsulas',
    tamano: '10 cápsulas',
    capsulas: 10,
    precio: 2.59,
    sistema: 'Nespresso',
    compatibilidad: 'Nespresso',
    intensidad: 5,
    descafeinado: false,
    origen: 'Colombia',
    imgFile: 'nespresso-costa-10-bold-colombian-1201.webp',
    url: 'https://kaffek.es/intenso-colombiano-single-origin-origin-costa-nespresso-10.html',
  },
  {
    id: 'costa_nesp_lungo_warming_10',
    nombre: 'Costa Lungo Warming Blend 10 cápsulas para Nespresso',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '10 cápsulas',
    tamano: '10 cápsulas',
    capsulas: 10,
    precio: 2.99,
    sistema: 'Nespresso',
    compatibilidad: 'Nespresso',
    intensidad: 9,
    descafeinado: false,
    imgFile: 'nespresso-costa-10-warming-blend-lungo-1201.webp',
    url: 'https://kaffek.es/lungo-warming-blend-costa-nespresso-10.html',
  },

  // ── Dolce Gusto (3) ──
  {
    id: 'costa_dg_cappuccino_10',
    nombre: 'Costa Cappuccino 10 cápsulas para Dolce Gusto',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '10 cápsulas',
    tamano: '10 cápsulas',
    capsulas: 10,
    precio: 4.59,
    sistema: 'Dolce Gusto',
    compatibilidad: 'Dolce Gusto',
    descafeinado: false,
    imgFile: 'dolce-gusto-costa-10-cappuccino-1201.webp',
    url: 'https://kaffek.es/cappuccino-costa-coffee-dolce-gusto.html',
  },
  {
    id: 'costa_dg_caramel_latte_10',
    nombre: 'Costa Café Latte con Caramelo 10 cápsulas para Dolce Gusto',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '10 cápsulas',
    tamano: '10 cápsulas',
    capsulas: 10,
    precio: 4.79,
    sistema: 'Dolce Gusto',
    compatibilidad: 'Dolce Gusto',
    descafeinado: false,
    imgFile: 'dolce-gusto-costa-10-caramel-latte-1201.webp',
    url: 'https://kaffek.es/latte-caramelo-costa-coffee-dolce-gusto.html',
  },
  {
    id: 'costa_dg_latte_10',
    nombre: 'Costa Latte 10 cápsulas para Dolce Gusto',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '10 cápsulas',
    tamano: '10 cápsulas',
    capsulas: 10,
    precio: 4.99,
    sistema: 'Dolce Gusto',
    compatibilidad: 'Dolce Gusto',
    descafeinado: false,
    imgFile: 'dolce-gusto-costa-10-latte-1201.webp',
    url: 'https://kaffek.es/latte-costa-coffee-dolce-gusto.html',
  },

  // ── Tassimo (3) ──
  {
    id: 'costa_tassimo_cappuccino_12',
    nombre: 'Costa Cappuccino 6+6 cápsulas para Tassimo',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '12 cápsulas (6 tazas)',
    tamano: '12 cápsulas',
    capsulas: 12,
    precio: 3.99,
    sistema: 'Tassimo',
    compatibilidad: 'Tassimo',
    intensidad: 3,
    descafeinado: false,
    imgFile: 'tassimo-costa-12-cappuccino-1201.webp',
    url: 'https://kaffek.es/cappuccino-costa-tassimo-12.html',
  },
  {
    id: 'costa_tassimo_latte_12',
    nombre: 'Costa Latte 6+6 cápsulas para Tassimo',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '12 cápsulas (6 tazas)',
    tamano: '12 cápsulas',
    capsulas: 12,
    precio: 3.99,
    sistema: 'Tassimo',
    compatibilidad: 'Tassimo',
    intensidad: 4,
    descafeinado: false,
    imgFile: 'tassimo-costa-12-latte-1201.webp',
    url: 'https://kaffek.es/latte-costa-tassimo.html',
  },
  {
    id: 'costa_tassimo_americano_12',
    nombre: 'Costa Americano 12 cápsulas para Tassimo',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '12 cápsulas',
    tamano: '12 cápsulas',
    capsulas: 12,
    precio: 3.99,
    sistema: 'Tassimo',
    compatibilidad: 'Tassimo',
    intensidad: 5,
    descafeinado: false,
    imgFile: 'tassimo-costa-12-americano-1201.webp',
    url: 'https://kaffek.es/americano-costa-tassimo-12.html',
  },

  // ── Café en grano (4) ──
  {
    id: 'costa_grano_intense_amazonian_200',
    nombre: 'Costa Intense Amazonian Blend 200 g granos de café',
    tipo: 'grano',
    tipoProducto: 'grano',
    formato: '200 g',
    tamano: '200 g',
    peso: 200,
    precio: 4.69,
    intensidad: 5,
    descafeinado: false,
    imgFile: 'cb-costa-200g-intense-amazonian-blend-no5-1201.webp',
    url: 'https://kaffek.es/intense-amazonian-blend-costa-coffee-granos-de-cafe-200.html',
  },
  {
    id: 'costa_grano_signature_blend_200',
    nombre: 'Costa Signature Blend 200 g granos de café',
    tipo: 'grano',
    tipoProducto: 'grano',
    formato: '200 g',
    tamano: '200 g',
    peso: 200,
    precio: 4.89,
    intensidad: 3,
    descafeinado: false,
    imgFile: 'cb-costa-200g-intense-signature-blend-no3-1201.webp',
    url: 'https://kaffek.es/signature-blend-costa-coffee-granos-de-cafe-200.html',
  },
  {
    existingId: 'costa_signature_blend_400g',
    nombre: 'Costa Signature Blend 400 g granos de café',
    precio: 9.19,
    intensidad: 3,
    imgFile: 'cb-costa-400g-signature-blend-no3-1201.webp',
    url: 'https://kaffek.es/signature-blend-costa-coffee-granos-de-cafe-400.html',
  },
  {
    existingId: 'costa_intense_amazonian_1kg',
    nombre: 'Costa Intense Amazonian Blend 1000 g granos de café',
    precio: 19.59,
    intensidad: 5,
    imgFile: 'cb-costa-1000g-intense-amazonian-blend-no5-1201.webp',
    url: 'https://kaffek.es/intense-amazonian-blend-costa-coffee-granos-de-cafe-1000.html',
  },

  // ── Café molido (2) ──
  {
    id: 'costa_molido_intense_amazonian_200',
    nombre: 'Costa Intense Amazonian Blend 200 g café molido',
    tipo: 'molido',
    tipoProducto: 'molido',
    formato: '200 g',
    tamano: '200 g',
    peso: 200,
    precio: 4.99,
    intensidad: 5,
    descafeinado: false,
    imgFile: 'gc-costa-200g-intense-amazonian-blend-no5-1201.webp',
    url: 'https://kaffek.es/intense-amazonian-blend-costa-coffee-cafe-molido-200.html',
  },
  {
    id: 'costa_molido_signature_blend_200',
    nombre: 'Costa Signature Blend 200 g café molido',
    tipo: 'molido',
    tipoProducto: 'molido',
    formato: '200 g',
    tamano: '200 g',
    peso: 200,
    precio: 4.99,
    intensidad: 3,
    descafeinado: false,
    imgFile: 'gc-costa-200g-signature-blend-no3-1201.webp',
    url: 'https://kaffek.es/signature-blend-costa-coffee-cafe-molido-200.html',
  },

  // ── Costa Podio (6 coffee) ──
  {
    id: 'costa_podio_mocha_italia_medio_ss',
    nombre: 'Costa Mocha Italia Tueste Medio (Taza pequeña) 48 cápsulas para Costa Podio',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '48 cápsulas',
    tamano: '48 cápsulas',
    capsulas: 48,
    precio: 23.0,
    sistema: 'Costa Podio',
    compatibilidad: 'Costa Podio',
    intensidad: 7,
    descafeinado: false,
    imgFile: 'podio-costa-48-mocha-italia-medium-roast-ss-v2-1201.webp',
    url: 'https://kaffek.es/mocha-italia-tueste-medio-taza-pequena-costa-podio.html',
  },
  {
    id: 'costa_podio_caffe_crema',
    nombre: 'Costa Caffè Crema Blend 48 cápsulas para Costa Podio',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '48 cápsulas',
    tamano: '48 cápsulas',
    capsulas: 48,
    precio: 23.0,
    sistema: 'Costa Podio',
    compatibilidad: 'Costa Podio',
    intensidad: 7,
    descafeinado: false,
    imgFile: 'podio-costa-48-caffe-crema-blend-1201.webp',
    url: 'https://kaffek.es/caffe-crema-blend-costa-podio.html',
  },
  {
    id: 'costa_podio_decaf',
    nombre: 'Costa Decaf Blend 48 cápsulas para Costa Podio',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '48 cápsulas',
    tamano: '48 cápsulas',
    capsulas: 48,
    precio: 23.0,
    sistema: 'Costa Podio',
    compatibilidad: 'Costa Podio',
    descafeinado: true,
    imgFile: 'podio-costa-48-decaf-blend-1201.webp',
    url: 'https://kaffek.es/decaf-blend-costa-podio.html',
  },
  {
    id: 'costa_podio_mocha_italia_oscuro',
    nombre: 'Costa Mocha Italia Tueste Oscuro 48 cápsulas para Costa Podio',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '48 cápsulas',
    tamano: '48 cápsulas',
    capsulas: 48,
    precio: 23.0,
    sistema: 'Costa Podio',
    compatibilidad: 'Costa Podio',
    descafeinado: false,
    imgFile: 'podio-costa-48-mocha-italia-dark-roast-1201.webp',
    url: 'https://kaffek.es/mocha-italia-tueste-oscuro-costa-podio.html',
  },
  {
    id: 'costa_podio_mocha_italia_medio_ls',
    nombre: 'Costa Mocha Italia Tueste Medio (Taza grande) 48 cápsulas para Costa Podio',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '48 cápsulas',
    tamano: '48 cápsulas',
    capsulas: 48,
    precio: 23.0,
    sistema: 'Costa Podio',
    compatibilidad: 'Costa Podio',
    intensidad: 7,
    descafeinado: false,
    imgFile: 'podio-costa-48-mocha-italia-medium-roast-ls-v2-1201.webp',
    url: 'https://kaffek.es/mocha-italia-tueste-medio-taza-grande-costa-podio.html',
  },
  {
    id: 'costa_podio_colombian',
    nombre: 'Costa Colombian Character Roast 48 cápsulas para Costa Podio',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '48 cápsulas',
    tamano: '48 cápsulas',
    capsulas: 48,
    precio: 23.0,
    sistema: 'Costa Podio',
    compatibilidad: 'Costa Podio',
    origen: 'Colombia',
    descafeinado: false,
    imgFile: 'podio-costa-48-colombian-character-roast-1201.webp',
    url: 'https://kaffek.es/colombian-character-roast-costa-podio.html',
  },
];

// ─── Old EAN products to update ─────────────────────────────────
const EAN_UPDATES = [
  {
    existingId: 'ean_5039303004151',
    precio: 4.89,
    nombre: 'Costa Signature Blend 200 g granos de café',
  },
  {
    existingId: 'ean_5039303005608',
    precio: 4.69,
    nombre: 'Costa Intense Amazonian Blend 200 g granos de café',
  },
];

// ─── Helpers ────────────────────────────────────────────────────

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    const get = (u) =>
      https
        .get(u, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
            return get(res.headers.location);
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve({ buf: Buffer.concat(chunks), status: res.statusCode }));
          res.on('error', reject);
        })
        .on('error', reject);
    get(url);
  });
}

async function uploadPhoto(docId, imgFile) {
  const c1 = imgFile[0].toLowerCase(),
    c2 = imgFile[1].toLowerCase();
  const url = `${IMG_BASE}${c1}/${c2}/${imgFile}`;
  const { buf, status } = await fetchBuf(url);
  if (buf.length < 1000) {
    console.log(`  SKIP photo: ${imgFile} (${buf.length}b, status:${status})`);
    return null;
  }
  const out = await sharp(buf)
    .resize(800, 800, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(out, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

function photoFields(url) {
  return {
    fotoUrl: url,
    foto: url,
    imageUrl: url,
    officialPhoto: url,
    bestPhoto: url,
    imagenUrl: url,
    photos: { selected: url, original: url, bgRemoved: url },
  };
}

// ─── Main ───────────────────────────────────────────────────────

(async () => {
  let created = 0,
    updated = 0,
    photoCount = 0,
    errors = 0;

  for (const p of PRODUCTS) {
    const isUpdate = !!p.existingId;
    const docId = p.existingId || p.id;
    const action = isUpdate ? 'UPDATE' : 'CREATE';
    console.log(`\n${action}: ${docId}`);

    const data = {
      precio: p.precio,
      updatedAt: new Date().toISOString(),
    };

    if (!isUpdate) {
      data.nombre = p.nombre;
      data.marca = 'Costa';
      data.roaster = 'Costa';
      data.tipo = p.tipo;
      data.tipoProducto = p.tipoProducto;
      data.formato = p.formato;
      data.tamano = p.tamano;
      data.fuente = 'KaffeK';
      data.fuentePais = 'ES';
      data.fuenteUrl = p.url;
      data.fecha = new Date().toISOString();
      data.puntuacion = 0;
      data.votos = 0;
      data.status = 'approved';
      data.reviewStatus = 'approved';
      data.appVisible = true;
      if (p.capsulas) data.capsulas = p.capsulas;
      if (p.peso) data.peso = p.peso;
      if (p.sistema) data.sistema = p.sistema;
      if (p.compatibilidad) data.compatibilidad = p.compatibilidad;
      if (p.origen) data.origen = p.origen;
      if (p.intensidad) data.intensidad = p.intensidad;
      if (p.descafeinado) data.descafeinado = true;
    } else {
      if (p.nombre) data.nombre = p.nombre;
      if (p.intensidad) data.intensidad = p.intensidad;
      data.fuenteUrl = p.url;
    }

    // Upload photo
    if (p.imgFile) {
      try {
        const photoUrl = await uploadPhoto(docId, p.imgFile);
        if (photoUrl) {
          Object.assign(data, photoFields(photoUrl));
          photoCount++;
          console.log(`  Photo OK`);
        }
      } catch (e) {
        console.log(`  Photo ERROR: ${e.message}`);
        errors++;
      }
    }

    try {
      if (isUpdate) {
        await db.collection('cafes').doc(docId).update(data);
        updated++;
        console.log(`  Updated: ${p.precio}€`);
      } else {
        await db.collection('cafes').doc(docId).set(data);
        created++;
        console.log(`  Created: ${p.nombre} → ${p.precio}€`);
      }
    } catch (e) {
      console.log(`  DB ERROR: ${e.message}`);
      errors++;
    }
  }

  // Update old EAN products prices
  console.log('\n--- Updating EAN products ---');
  for (const e of EAN_UPDATES) {
    try {
      await db.collection('cafes').doc(e.existingId).update({
        precio: e.precio,
        nombre: e.nombre,
        updatedAt: new Date().toISOString(),
      });
      updated++;
      console.log(`Updated ${e.existingId} → ${e.precio}€`);
    } catch (err) {
      console.log(`ERR ${e.existingId}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Created: ${created}, Updated: ${updated}, Photos: ${photoCount}, Errors: ${errors}`);
  console.log('='.repeat(60));
  process.exit(0);
})();
