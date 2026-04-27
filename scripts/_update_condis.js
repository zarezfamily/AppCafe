#!/usr/bin/env node
/**
 * _update_condis.js
 * Imports coffee products from compraonline.condis.es (April 2026).
 *
 * - 5 new L'Or products (brand new to DB)
 * - 5 new Condis Nespresso 20-cap capsules
 * - 3 Bonka molido price updates + photos
 * - Photos from cdn.condis.es
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
const CDN = 'https://cdn.condis.es/es/products/';

// ─── Products ───────────────────────────────────────────────────

const PRODUCTS = [
  // ── L'Or – Cápsulas Nespresso 50 uds ──
  {
    id: 'lor_espresso_colombia_50',
    nombre: "Cápsulas L'Or Espresso Colombia 50 Unidades",
    marca: "L'Or",
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '50 cápsulas',
    tamano: '50 cápsulas',
    capsulas: 50,
    precio: 14.99,
    precioAnterior: 17.99,
    sistema: 'Nespresso',
    compatibilidad: 'Nespresso',
    origen: 'Colombia',
    intensidad: 8,
    descafeinado: false,
    imgCode: '107307',
  },
  {
    id: 'lor_espresso_ristretto_50',
    nombre: "Cápsulas L'Or Espresso Ristretto 50 Unidades",
    marca: "L'Or",
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '50 cápsulas',
    tamano: '50 cápsulas',
    capsulas: 50,
    precio: 14.99,
    precioAnterior: 17.99,
    sistema: 'Nespresso',
    compatibilidad: 'Nespresso',
    intensidad: 11,
    descafeinado: false,
    imgCode: '107304',
  },
  {
    id: 'lor_espresso_onyx_50',
    nombre: "Cápsulas L'Or Espresso Onyx 50 Unidades",
    marca: "L'Or",
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '50 cápsulas',
    tamano: '50 cápsulas',
    capsulas: 50,
    precio: 14.99,
    precioAnterior: 17.99,
    sistema: 'Nespresso',
    compatibilidad: 'Nespresso',
    intensidad: 12,
    descafeinado: false,
    imgCode: '107306',
  },
  // ── L'Or – Grano ──
  {
    id: 'lor_grano_forza_500',
    nombre: "Café en Grano L'Or Forza 500 g",
    marca: "L'Or",
    tipo: 'grano',
    tipoProducto: 'grano',
    formato: '500 g',
    tamano: '500 g',
    peso: 500,
    precio: 15.95,
    intensidad: 9,
    descafeinado: false,
    imgCode: '105215',
  },
  {
    id: 'lor_grano_colombia_500',
    nombre: "Café en Grano L'Or Colombia 500 g",
    marca: "L'Or",
    tipo: 'grano',
    tipoProducto: 'grano',
    formato: '500 g',
    tamano: '500 g',
    peso: 500,
    precio: 15.95,
    origen: 'Colombia',
    intensidad: 8,
    descafeinado: false,
    imgCode: '107241',
  },

  // ── Condis – Cápsulas Nespresso 20 uds ──
  {
    id: 'condis_nesp_ristretto_20',
    nombre: 'Cápsulas Nespresso Condis Ristretto 20 Unidades',
    marca: 'Condis',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '20 cápsulas',
    tamano: '20 cápsulas',
    capsulas: 20,
    precio: 3.9,
    sistema: 'Nespresso',
    compatibilidad: 'Nespresso',
    intensidad: 10,
    descafeinado: false,
    imgCode: '105293',
  },
  {
    id: 'condis_nesp_intenso_20',
    nombre: 'Cápsulas Nespresso Condis Intenso 20 Unidades',
    marca: 'Condis',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '20 cápsulas',
    tamano: '20 cápsulas',
    capsulas: 20,
    precio: 3.9,
    sistema: 'Nespresso',
    compatibilidad: 'Nespresso',
    intensidad: 8,
    descafeinado: false,
    imgCode: '105295',
  },
  {
    id: 'condis_nesp_extra_intenso_20',
    nombre: 'Cápsulas Nespresso Condis Extra Intenso 20 Unidades',
    marca: 'Condis',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '20 cápsulas',
    tamano: '20 cápsulas',
    capsulas: 20,
    precio: 3.9,
    sistema: 'Nespresso',
    compatibilidad: 'Nespresso',
    intensidad: 11,
    descafeinado: false,
    imgCode: '105292',
  },
  {
    id: 'condis_nesp_descaf_fuerte_20',
    nombre: 'Cápsulas Nespresso Condis Descafeinado Fuerte 20 Unidades',
    marca: 'Condis',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '20 cápsulas',
    tamano: '20 cápsulas',
    capsulas: 20,
    precio: 3.9,
    sistema: 'Nespresso',
    compatibilidad: 'Nespresso',
    descafeinado: true,
    imgCode: '105294',
  },
  {
    id: 'condis_nesp_colombia_20',
    nombre: 'Cápsulas Nespresso Condis Colombia 20 Unidades',
    marca: 'Condis',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '20 cápsulas',
    tamano: '20 cápsulas',
    capsulas: 20,
    precio: 3.9,
    sistema: 'Nespresso',
    compatibilidad: 'Nespresso',
    origen: 'Colombia',
    intensidad: 7,
    descafeinado: false,
    imgCode: '105291',
  },

  // ── Bonka – Molido (UPDATE existing) ──
  {
    existingId: 'bonka_molido-natural-250gr',
    nombre: 'Café Molido Bonka Natural 250 g',
    marca: 'Bonka',
    tipo: 'molido',
    precio: 3.55,
    precioAnterior: 3.95,
    imgCode: '105046',
  },
  {
    existingId: 'bonka_molido-mezcla-250gr',
    nombre: 'Café Molido Bonka Mezcla 250 g',
    marca: 'Bonka',
    tipo: 'molido',
    precio: 3.55,
    precioAnterior: 3.95,
    imgCode: '105050',
  },
  {
    existingId: 'bonka_molido-descafeinado-250gr',
    nombre: 'Café Molido Bonka Descafeinado 250 g',
    marca: 'Bonka',
    tipo: 'molido',
    precio: 4.25,
    precioAnterior: 4.75,
    descafeinado: true,
    imgCode: '105043',
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
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        })
        .on('error', reject);
    get(url);
  });
}

async function uploadPhoto(docId, imgCode) {
  const url = `${CDN}${imgCode}.jpg`;
  const buf = await fetchBuf(url);
  if (buf.length < 1000) {
    console.log(`  SKIP photo too small: ${docId} (${buf.length} bytes)`);
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
    console.log(`  ${p.nombre} | ${p.precio}€`);

    const data = {
      precio: p.precio,
      updatedAt: new Date().toISOString(),
    };

    if (!isUpdate) {
      // Full data for new products
      data.nombre = p.nombre;
      data.marca = p.marca;
      data.roaster = p.marca;
      data.tipo = p.tipo;
      data.tipoProducto = p.tipoProducto;
      data.formato = p.formato;
      data.tamano = p.tamano;
      data.fuente = 'Condis';
      data.fuentePais = 'ES';
      data.fuenteUrl =
        'https://compraonline.condis.es/mundo-placer_caf%C3%A9-t%C3%A9-e-infusiones/c/c02__cat00070004/es_ES';
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
      if (p.precioAnterior) data.precioAnterior = p.precioAnterior;
    } else {
      // Minimal update for existing
      if (p.precioAnterior) data.precioAnterior = p.precioAnterior;
    }

    // Upload photo
    if (p.imgCode) {
      try {
        // Check if photo already exists
        const sp = `${PREFIX}/${docId}.png`;
        const [exists] = await bucket.file(sp).exists();
        if (exists) {
          console.log(`  Photo already exists, skipping`);
        } else {
          console.log(`  Uploading photo (${p.imgCode})...`);
          const photoUrl = await uploadPhoto(docId, p.imgCode);
          if (photoUrl) {
            Object.assign(data, photoFields(photoUrl));
            photoCount++;
            console.log(`  Photo OK: ${photoUrl}`);
          }
        }
      } catch (e) {
        console.log(`  Photo ERROR: ${e.message}`);
        errors++;
      }
    }

    // Write to Firestore
    try {
      if (isUpdate) {
        await db.collection('cafes').doc(docId).update(data);
        updated++;
        console.log(`  UPDATED: ${docId}`);
      } else {
        await db.collection('cafes').doc(docId).set(data);
        created++;
        console.log(`  CREATED: ${docId}`);
      }
    } catch (e) {
      console.log(`  DB ERROR: ${e.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(
    `Done! Created: ${created}, Updated: ${updated}, Photos: ${photoCount}, Errors: ${errors}`
  );
  console.log('='.repeat(60));
  process.exit(0);
})();
