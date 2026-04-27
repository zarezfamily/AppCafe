#!/usr/bin/env node
/**
 * _import_spar.js – April 2026
 * Imports/updates Spar products from spar.es catalog:
 *   - 10 new capsule/ground products
 *   - Photos for ALL products (existing + new) from spar.es wp-content
 *
 * Existing 9 Spar products have NO photos – this fixes that too.
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

// ═══════════════════════════════════════════════════════════════
// NEW PRODUCTS – Nespresso Compatible capsules (4)
// ═══════════════════════════════════════════════════════════════
const NEW_NCC = [
  {
    id: 'spar_eco_descaf_ncc_10',
    nombre: 'Café Ecológico Spar Natural Descafeinado Cápsulas Biodegradables 10 uds',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    sistema: 'Nespresso',
    capsulas: 10,
    descafeinado: true,
    ecologico: true,
    url: 'https://spar.es/productos-spar/alimentacion-seca/cafes-molidos-en-capsulas-y-cereales-solubles/cafe-ecologico-spar-natural-descafeinado-capsulas-biodegradables-10-uds/',
  },
  {
    id: 'spar_eco_intenso_ncc_10',
    nombre: 'Café Ecológico Spar Natural Intenso Cápsulas Biodegradables 10 uds',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    sistema: 'Nespresso',
    capsulas: 10,
    ecologico: true,
    url: 'https://spar.es/productos-spar/alimentacion-seca/cafes-molidos-en-capsulas-y-cereales-solubles/cafe-ecologico-spar-natural-intenso-capsulas-biodegradables-10-uds/',
  },
  {
    id: 'spar_capsulas_extra_intenso_nesp_10',
    nombre: 'Cápsulas Espresso Café Extra Intenso Spar 10 uds',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    sistema: 'Nespresso',
    capsulas: 10,
    url: 'https://spar.es/productos-spar/alimentacion-seca/cafes-molidos-en-capsulas-y-cereales-solubles/capsulas-cafe-extra-intenso-spar-10-uds/',
  },
  {
    id: 'spar_capsulas_suave_nesp_10',
    nombre: 'Cápsulas Espresso Café Suave Natural Spar 10 uds',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    sistema: 'Nespresso',
    capsulas: 10,
    url: 'https://spar.es/productos-spar/alimentacion-seca/cafes-molidos-en-capsulas-y-cereales-solubles/capsulas-cafe-suave-natural-10-uds/',
  },
];

// ═══════════════════════════════════════════════════════════════
// NEW PRODUCTS – Dolce Gusto capsules (6)
// ═══════════════════════════════════════════════════════════════
const NEW_DG = [
  {
    id: 'spar_dg_cafe_con_leche_16',
    nombre: 'Cápsulas Café con Leche Spar compatibles Dolce Gusto 16 uds',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    sistema: 'Dolce Gusto',
    capsulas: 16,
    url: 'https://spar.es/productos-spar/alimentacion-seca/cafes-molidos-en-capsulas-y-cereales-solubles/capsulas-cafe-con-leche-spar-compatibles-dolce-gusto-16-und/',
  },
  {
    id: 'spar_dg_cortado_descaf_16',
    nombre: 'Cápsulas Café Cortado Descafeinado Spar compatibles Dolce Gusto 16 uds',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    sistema: 'Dolce Gusto',
    capsulas: 16,
    descafeinado: true,
    url: 'https://spar.es/productos-spar/alimentacion-seca/cafes-molidos-en-capsulas-y-cereales-solubles/capsulas-cafe-cortado-descafeinado-spar-compatibles-dolce-gusto-16-und/',
  },
  {
    id: 'spar_dg_cortado_16',
    nombre: 'Cápsulas Café Cortado Spar compatibles Dolce Gusto 16 uds',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    sistema: 'Dolce Gusto',
    capsulas: 16,
    url: 'https://spar.es/productos-spar/alimentacion-seca/cafes-molidos-en-capsulas-y-cereales-solubles/capsulas-cafe-cortado-spar-compatibles-dolce-gusto-16-und/',
  },
  {
    id: 'spar_dg_descafeinado_16',
    nombre: 'Cápsulas Café Descafeinado Spar compatibles Dolce Gusto 16 uds',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    sistema: 'Dolce Gusto',
    capsulas: 16,
    descafeinado: true,
    url: 'https://spar.es/productos-spar/alimentacion-seca/cafes-molidos-en-capsulas-y-cereales-solubles/capsulas-cafe-descafeinado-spar-compatibles-dolce-gusto-16-und/',
  },
  {
    id: 'spar_dg_espresso_16',
    nombre: 'Cápsulas Café Espresso Spar compatibles Dolce Gusto 16 uds',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    sistema: 'Dolce Gusto',
    capsulas: 16,
    url: 'https://spar.es/productos-spar/alimentacion-seca/cafes-molidos-en-capsulas-y-cereales-solubles/cafe-espresso-spar-capsulas-compatibles-dolce-gusto-16-und/',
  },
  {
    id: 'spar_dg_extra_intenso_16',
    nombre: 'Cápsulas Café Extra Intenso Spar compatibles Dolce Gusto 16 uds',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    sistema: 'Dolce Gusto',
    capsulas: 16,
    url: 'https://spar.es/productos-spar/alimentacion-seca/cafes-molidos-en-capsulas-y-cereales-solubles/capsulas-cafe-extra-intenso-spar-compatibles-dolce-gusto-16-und/',
  },
];

// ═══════════════════════════════════════════════════════════════
// EXISTING PRODUCTS – need photo update (have URL for image discovery)
// ═══════════════════════════════════════════════════════════════
const EXISTING_UPDATE = [
  {
    id: 'spar_capsulas_descaf_nesp_10',
    url: 'https://spar.es/productos-spar/alimentacion-seca/cafes-molidos-en-capsulas-y-cereales-solubles/capsulas-cafe-descafeinado-spar-10-uds/',
  },
  {
    id: 'spar_capsulas_intenso_nesp_10',
    url: 'https://spar.es/productos-spar/alimentacion-seca/cafes-molidos-en-capsulas-y-cereales-solubles/capsulas-cafe-intenso-spar-10-uds/',
  },
  {
    id: 'spar_molido_descaf_250',
    url: 'https://spar.es/productos-spar/alimentacion-seca/cafes-molidos-en-capsulas-y-cereales-solubles/cafe-molido-descafeinado-spar-250-g/',
  },
  {
    id: 'spar_molido_mezcla_250',
    url: 'https://spar.es/productos-spar/alimentacion-seca/cafes-molidos-en-capsulas-y-cereales-solubles/cafe-molido-mezcla-spar-250-g/',
  },
  {
    id: 'spar_molido_natural_250',
    url: 'https://spar.es/productos-spar/alimentacion-seca/cafes-molidos-en-capsulas-y-cereales-solubles/cafe-molido-natural-spar-250-g/',
  },
];

const ALL_NEW = [...NEW_NCC, ...NEW_DG];

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════
function httpGet(url, wantBuf = false) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,image/webp,image/jpeg,*/*;q=0.8',
      },
    };
    const get = (o) =>
      https
        .get(o, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const loc = res.headers.location.startsWith('http')
              ? res.headers.location
              : `https://${parsed.hostname}${res.headers.location}`;
            const p2 = new URL(loc);
            return get({
              hostname: p2.hostname,
              path: p2.pathname + p2.search,
              headers: o.headers,
            });
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const buf = Buffer.concat(chunks);
            resolve({ data: wantBuf ? buf : buf.toString(), status: res.statusCode });
          });
          res.on('error', reject);
        })
        .on('error', reject);
    get(opts);
  });
}

async function discoverSparImageUrl(productUrl) {
  try {
    const { data: html, status } = await httpGet(productUrl);
    if (status !== 200) return null;
    // Spar images in social share links: facebook/pinterest/vk
    const m = html.match(/https:\/\/spar\.es\/wp-content\/uploads\/[^"'\s&?]+\.jpg/);
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

async function uploadPhoto(docId, imgUrl) {
  const { data: buf } = await httpGet(imgUrl, true);
  if (buf.length < 1000) return null;
  const out = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
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

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════
(async () => {
  console.log('\n=== SPAR Import: Create new + fix photos ===\n');
  let created = 0,
    updated = 0,
    photos = 0,
    errors = 0;

  // PART 1: Create new products
  console.log('--- PART 1: New products ---');
  for (const p of ALL_NEW) {
    const existing = await db.collection('cafes').doc(p.id).get();
    if (existing.exists) {
      console.log(`SKIP: ${p.id} (already exists)`);
      continue;
    }

    console.log(`CREATE: ${p.id}`);
    let imgUrl = null;
    try {
      imgUrl = await discoverSparImageUrl(p.url);
      if (imgUrl) console.log(`  Img: ${imgUrl.split('/').pop()}`);
      else console.log('  No image found');
    } catch (e) {
      console.log(`  Img err: ${e.message}`);
    }

    const data = {
      nombre: p.nombre,
      marca: 'Spar',
      roaster: 'Spar',
      tipo: p.tipo,
      tipoProducto: p.tipoProducto,
      formato: p.capsulas ? `${p.capsulas} cápsulas` : p.formato || '',
      tamano: p.capsulas ? `${p.capsulas} cápsulas` : p.formato || '',
      fuente: 'spar.es',
      fuentePais: 'ES',
      fuenteUrl: p.url,
      fecha: new Date().toISOString(),
      puntuacion: 0,
      votos: 0,
      status: 'approved',
      reviewStatus: 'approved',
      appVisible: true,
      updatedAt: new Date().toISOString(),
    };
    if (p.sistema) {
      data.sistema = p.sistema;
      data.compatibilidad = p.sistema;
    }
    if (p.capsulas) data.capsulas = p.capsulas;
    if (p.descafeinado) data.descafeinado = true;
    if (p.ecologico) data.ecologico = true;

    if (imgUrl) {
      try {
        const photoUrl = await uploadPhoto(p.id, imgUrl);
        if (photoUrl) {
          Object.assign(data, photoFields(photoUrl));
          photos++;
          console.log('  Photo OK');
        }
      } catch (e) {
        console.log(`  Photo ERR: ${e.message}`);
        errors++;
      }
    }

    try {
      await db.collection('cafes').doc(p.id).set(data);
      created++;
      console.log(`  ${p.nombre}`);
    } catch (e) {
      console.log(`  DB ERR: ${e.message}`);
      errors++;
    }
  }

  // PART 2: Fix photos on existing products
  console.log('\n--- PART 2: Fix photos on existing products ---');
  for (const p of EXISTING_UPDATE) {
    console.log(`UPDATE: ${p.id}`);
    let imgUrl = null;
    try {
      imgUrl = await discoverSparImageUrl(p.url);
      if (imgUrl) console.log(`  Img: ${imgUrl.split('/').pop()}`);
      else {
        console.log('  No image found');
        continue;
      }
    } catch (e) {
      console.log(`  Img err: ${e.message}`);
      continue;
    }

    try {
      const photoUrl = await uploadPhoto(p.id, imgUrl);
      if (photoUrl) {
        await db
          .collection('cafes')
          .doc(p.id)
          .update({
            ...photoFields(photoUrl),
            fuenteUrl: p.url,
            fuente: 'spar.es',
            updatedAt: new Date().toISOString(),
          });
        photos++;
        updated++;
        console.log('  Photo OK');
      }
    } catch (e) {
      console.log(`  Photo ERR: ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(
    `Created: ${created} | Updated photos: ${updated} | Photos: ${photos} | Errors: ${errors}`
  );
  process.exit(0);
})();
