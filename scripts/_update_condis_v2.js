#!/usr/bin/env node
/**
 * _update_condis_v2.js – April 2026
 * Updates all 14 Condis coffee products:
 *  - 5 existing Nespresso 20-cap → update photos from local images
 *  - 5 NEW Dolce Gusto 16-cap → create + photos
 *  - 3 existing Molido → update photos
 *  - 1 NEW Molido Descafeinado Mezcla → create + photo
 */

const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';
const IMG_DIR = path.join(require('os').homedir(), 'Downloads', 'condis');

// ─── Products ───────────────────────────────────────────────────

const PRODUCTS = [
  // ── Existing Nespresso 20 caps → photo update ──
  {
    existingId: 'condis_nesp_ristretto_20',
    precio: 3.9,
    imgFile: 'capsulas nespresso condis ristretto 20 unidades .webp',
  },
  {
    existingId: 'condis_nesp_intenso_20',
    precio: 3.9,
    imgFile: 'capsulas nespresso condis intenso 20 unidades.webp',
  },
  {
    existingId: 'condis_nesp_extra_intenso_20',
    precio: 3.9,
    imgFile: 'capsulas nespresso condis extra intenso 20.webp',
  },
  {
    existingId: 'condis_nesp_descaf_fuerte_20',
    precio: 3.9,
    imgFile: 'capsulas nespresso condis descafeinado fuerte 20 unidades.webp',
  },
  {
    existingId: 'condis_nesp_colombia_20',
    precio: 3.9,
    imgFile: 'capsulas nespresso condis colombia 20.webp',
  },

  // ── NEW Dolce Gusto 16 caps ──
  {
    id: 'condis_dg_extra_intenso_16',
    nombre: 'Cápsulas Dolce Gusto Condis Extra Intenso 16 Unidades',
    marca: 'Condis',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '16 cápsulas',
    tamano: '16 cápsulas',
    capsulas: 16,
    precio: 3.55,
    sistema: 'Dolce Gusto',
    compatibilidad: 'Dolce Gusto',
    intensidad: 11,
    descafeinado: false,
    imgFile: 'caps d.g. condis extra intenso 16 unidades.webp',
  },
  {
    id: 'condis_dg_descafeinado_16',
    nombre: 'Cápsulas Dolce Gusto Condis Descafeinado 16 Unidades',
    marca: 'Condis',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '16 cápsulas',
    tamano: '16 cápsulas',
    capsulas: 16,
    precio: 3.55,
    sistema: 'Dolce Gusto',
    compatibilidad: 'Dolce Gusto',
    descafeinado: true,
    imgFile: 'caps d.g. condis descafeinado 16 unidades .webp',
  },
  {
    id: 'condis_dg_cortado_16',
    nombre: 'Cápsulas Dolce Gusto Condis Cortado 16 Unidades',
    marca: 'Condis',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '16 cápsulas',
    tamano: '16 cápsulas',
    capsulas: 16,
    precio: 3.55,
    sistema: 'Dolce Gusto',
    compatibilidad: 'Dolce Gusto',
    descafeinado: false,
    imgFile: 'caps d.g. condis cortado 16 unidades.webp',
  },
  {
    id: 'condis_dg_intenso_16',
    nombre: 'Cápsulas Dolce Gusto Condis Café Intenso 16 Unidades',
    marca: 'Condis',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '16 cápsulas',
    tamano: '16 cápsulas',
    capsulas: 16,
    precio: 3.55,
    sistema: 'Dolce Gusto',
    compatibilidad: 'Dolce Gusto',
    intensidad: 8,
    descafeinado: false,
    imgFile: 'caps d.g. condis cafe intenso 16 unidades.webp',
  },
  {
    id: 'condis_dg_cafe_con_leche_16',
    nombre: 'Cápsulas Dolce Gusto Condis Café con Leche 16 Unidades',
    marca: 'Condis',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    formato: '16 cápsulas',
    tamano: '16 cápsulas',
    capsulas: 16,
    precio: 3.55,
    sistema: 'Dolce Gusto',
    compatibilidad: 'Dolce Gusto',
    descafeinado: false,
    imgFile: 'caps d.g. condis cafe con leche 16 unidades.webp',
  },

  // ── Existing Molido → photo update ──
  {
    existingId: 'condis_molido_natural_250',
    precio: 2.69,
    imgFile:
      'cafe molido condis natural 250 g 2,69 €10,76€:Kilo   Añadir al carrito  CAFE MOLIDO CONDIS MEZCLA 250 G cafe molido condis .webp',
  },
  {
    existingId: 'condis_molido_mezcla_250',
    precio: 2.69,
    imgFile: 'cafe molido condis mezcla 250 g .webp',
  },
  {
    existingId: 'condis_molido_descaf_250',
    precio: 3.09,
    imgFile: 'cafe molido condis descafeinado 250 g.webp',
  },

  // ── NEW Molido Descafeinado Mezcla ──
  {
    id: 'condis_molido_descaf_mezcla_250',
    nombre: 'Café Molido Condis Descafeinado Mezcla 250 g',
    marca: 'Condis',
    tipo: 'molido',
    tipoProducto: 'molido',
    formato: '250 g',
    tamano: '250 g',
    peso: 250,
    precio: 3.09,
    descafeinado: true,
    imgFile: 'cafe molido condis descafeinado mezcla 250 g.webp',
  },
];

// ─── Helpers ────────────────────────────────────────────────────

async function uploadPhoto(docId, imgFile) {
  const filePath = path.join(IMG_DIR, imgFile);
  if (!fs.existsSync(filePath)) {
    console.log(`  FILE NOT FOUND: ${imgFile}`);
    return null;
  }
  const buf = fs.readFileSync(filePath);
  if (buf.length < 500) {
    console.log(`  SKIP photo too small: ${buf.length} bytes`);
    return null;
  }
  const out = await sharp(buf)
    .trim()
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
      data.marca = p.marca;
      data.roaster = p.marca;
      data.tipo = p.tipo;
      data.tipoProducto = p.tipoProducto;
      data.formato = p.formato;
      data.tamano = p.tamano;
      data.fuente = 'Condis';
      data.fuentePais = 'ES';
      data.fuenteUrl = 'https://compraonline.condis.es';
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
    }

    // Upload photo from local file
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
        console.log(`  Updated: ${docId} → ${p.precio}€`);
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

  console.log('\n' + '='.repeat(60));
  console.log(`Created: ${created}, Updated: ${updated}, Photos: ${photoCount}, Errors: ${errors}`);
  console.log('='.repeat(60));
  process.exit(0);
})();
