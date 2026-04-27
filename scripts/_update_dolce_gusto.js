#!/usr/bin/env node
/**
 * _update_dolce_gusto.js
 * Imports NESCAFÉ Dolce Gusto capsule products from dolce-gusto.es (April 2026).
 *
 * - Updates existing Mercadona products (5) with proper data
 * - Adds new DG-own products (~22)
 * - Adds Starbucks by Dolce Gusto products (~9)
 * - Uploads photos from dolce-gusto.es CDN
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
const BASE = 'https://www.dolce-gusto.es';

// ─── Products from dolce-gusto.es/promocion-25-descuento-capsulas-web ───
// Excluding non-coffee items: Nesquik, Chococino, Marrakesh Style Tea, Iced Frappé, KitKat
const PRODUCTS = [
  // ── NESCAFÉ Dolce Gusto own brand ──
  {
    id: 'dg_espresso_intenso',
    existingId: 'mercadona_11931', // existing in DB
    nombre: 'Espresso Intenso',
    nombreCompleto: 'Espresso Intenso Dolce Gusto 16 Cápsulas',
    intensidad: 7,
    capsulas: 16,
    precio: 4.95,
    notas: 'Con cuerpo & Especiado',
    slug: 'espresso-intenso',
    img: 'bev0000015_16x_heroimage2026_1.png',
    descafeinado: false,
  },
  {
    id: 'dg_espresso_intenso_descaf',
    existingId: 'mercadona_11869',
    nombre: 'Espresso Intenso Descafeinado',
    nombreCompleto: 'Espresso Intenso Descafeinado Dolce Gusto 16 Cápsulas',
    intensidad: 7,
    capsulas: 16,
    precio: 4.95,
    notas: 'Profundo y afrutado',
    slug: 'espresso-intenso-descafeinado',
    img: 'bev0000016_16x_heroimage2026.png',
    descafeinado: true,
  },
  {
    id: 'dg_cafe_con_leche',
    existingId: 'mercadona_11801',
    nombre: 'Café con Leche',
    nombreCompleto: 'Café con Leche Dolce Gusto 16 Cápsulas',
    intensidad: 7,
    capsulas: 16,
    precio: 4.95,
    notas: 'Cremoso & equilibrado',
    slug: 'cafe-con-leche',
    img: 'bev0000060_16x_heroimage2026.png',
    descafeinado: false,
  },
  {
    id: 'dg_cortado',
    existingId: 'mercadona_11785',
    nombre: 'Café Cortado',
    nombreCompleto: 'Café Cortado Dolce Gusto 16 Cápsulas',
    intensidad: null,
    capsulas: 16,
    precio: 4.95,
    notas: 'Intenso & tostado',
    slug: 'cortado',
    img: 'bev0000064_16x_heroimage2026.png',
    descafeinado: false,
  },
  {
    id: 'dg_ristretto_napoli',
    existingId: 'mercadona_11918',
    nombre: 'Ristretto Barista',
    nombreCompleto: 'Café Ristretto Barista Dolce Gusto 16 Cápsulas',
    intensidad: 9,
    capsulas: 16,
    precio: 4.95,
    notas: 'Intenso & envolvente',
    slug: 'ristretto-barista',
    img: 'bev0000010-16_mhi2026.jpg',
    descafeinado: false,
  },
  // ── New DG products ──
  {
    id: 'dg_cafe_con_leche_intenso',
    nombre: 'Café con Leche Intenso',
    nombreCompleto: 'Café con Leche Intenso Dolce Gusto 16 Cápsulas',
    intensidad: 9,
    capsulas: 16,
    precio: 4.95,
    notas: 'Robusto & tostado',
    slug: 'cafe-con-leche-intenso',
    img: 'bev0000062_16x_heroimage2026.png',
    descafeinado: false,
  },
  {
    id: 'dg_lungo',
    nombre: 'Lungo',
    nombreCompleto: 'Lungo Dolce Gusto 16 Cápsulas',
    intensidad: 6,
    capsulas: 16,
    precio: 4.95,
    notas: 'Equilibrado y tostado',
    slug: 'lungo',
    img: 'bev0000022-16.png',
    descafeinado: false,
  },
  {
    id: 'dg_ristretto_ardenza',
    nombre: 'Ristretto Ardenza',
    nombreCompleto: 'Café Ristretto Ardenza Dolce Gusto 16 Cápsulas',
    intensidad: 11,
    capsulas: 16,
    precio: 4.95,
    notas: 'Especiado & notas a pimienta',
    slug: 'ristretto-ardenza',
    img: 'bev0000020_16x_heroimage2026.png',
    descafeinado: false,
  },
  {
    id: 'dg_espresso',
    nombre: 'Espresso',
    nombreCompleto: 'Café Espresso Dolce Gusto 16 Cápsulas',
    intensidad: 5,
    capsulas: 16,
    precio: 4.95,
    notas: 'Delicado & afrutado',
    slug: 'espresso',
    img: 'bev0000007_16x_hero_image.png',
    descafeinado: false,
  },
  {
    id: 'dg_latte_macchiato_caramel',
    nombre: 'Latte Macchiato Caramel',
    nombreCompleto: 'Café Latte Macchiato Caramel Dolce Gusto 16 Cápsulas',
    intensidad: null,
    capsulas: 16,
    precio: 4.95,
    notas: 'Suave & Cremoso',
    slug: 'caramel-latte-macchiato',
    img: 'bev0000056-16.png',
    descafeinado: false,
  },
  {
    id: 'dg_cafe_con_leche_descaf',
    nombre: 'Café con Leche Descafeinado',
    nombreCompleto: 'Café con Leche Descafeinado Dolce Gusto 16 Cápsulas',
    intensidad: 7,
    capsulas: 16,
    precio: 4.95,
    notas: 'Armonioso & equilibrado',
    slug: 'cafe-con-leche-descafeinado',
    img: 'bev0000061_16x_hero_image.png',
    descafeinado: true,
  },
  {
    id: 'dg_grande_intenso',
    nombre: 'Grande Intenso',
    nombreCompleto: 'Café Grande Intenso Dolce Gusto 16 Cápsulas',
    intensidad: 8,
    capsulas: 16,
    precio: 4.95,
    notas: 'Envolvente & lleno de sabor',
    slug: 'grande-intenso',
    img: '8445290448668_h_en_1702538884484_1.png',
    descafeinado: false,
  },
  {
    id: 'dg_cortado_descafeinado',
    nombre: 'Cortado Descafeinado',
    nombreCompleto: 'Café Cortado Descafeinado Dolce Gusto 16 Cápsulas',
    intensidad: 8,
    capsulas: 16,
    precio: 4.95,
    notas: 'Intenso & tostado',
    slug: 'cortado-descafeinado',
    img: 'bev0000065_16x_heroimage2026.png',
    descafeinado: true,
  },
  {
    id: 'dg_ristretto_bonka',
    nombre: 'Ristretto Bonka',
    nombreCompleto: 'Café Ristretto Bonka Dolce Gusto 16 Cápsulas',
    intensidad: 8,
    capsulas: 16,
    precio: 4.95,
    notas: 'Intenso con notas a madera',
    slug: 'ristretto-bonka',
    img: '7613287300164_H__g-1_q-1_c-16_m-0.png',
    descafeinado: false,
  },
  {
    id: 'dg_cafe_con_leche_delicato',
    nombre: 'Café con Leche Delicato',
    nombreCompleto: 'Café con Leche Delicato Dolce Gusto 16 Cápsulas',
    intensidad: 7,
    capsulas: 16,
    precio: 4.95,
    notas: 'Aterciopelado & Suave',
    slug: 'delicato',
    img: '7613037477481_H__g-1_q-1_c-16_m-0.png',
    descafeinado: false,
  },
  {
    id: 'dg_flat_white',
    nombre: 'Flat White',
    nombreCompleto: 'Flat White Café Dolce Gusto 16 Cápsulas',
    intensidad: null,
    capsulas: 16,
    precio: 4.95,
    notas: 'Aterciopelado & Suave',
    slug: 'flat-white',
    img: 'bev0000050_16x_hero_image.png',
    descafeinado: false,
  },
  {
    id: 'dg_espresso_doppio',
    nombre: 'Espresso Doppio',
    nombreCompleto: 'Café Espresso Doppio Dolce Gusto 16 Cápsulas',
    intensidad: 10,
    capsulas: 16,
    precio: 4.95,
    notas: 'Con cuerpo & intenso',
    slug: 'cafe-espresso-doppio',
    img: 'bev0000127_16x_heroimage2026.png',
    descafeinado: false,
  },
  {
    id: 'dg_mocha',
    nombre: 'Mocha',
    nombreCompleto: 'Café Mocha Dolce Gusto 16 Cápsulas',
    intensidad: null,
    capsulas: 16,
    precio: 4.95,
    notas: 'Cremoso & exquisito',
    slug: 'cafe-mocha',
    img: 'bev0000044-16.png',
    descafeinado: false,
  },
  {
    id: 'dg_cappuccino',
    nombre: 'Cappuccino',
    nombreCompleto: 'Café Cappuccino Dolce Gusto 16 Cápsulas',
    intensidad: null,
    capsulas: 16,
    precio: 4.95,
    notas: 'Equilibrado & suave',
    slug: 'cappuccino',
    img: 'bev0000052_16x_hero_image.png',
    descafeinado: false,
  },
  {
    id: 'dg_americano_descaf',
    nombre: 'Americano Descafeinado',
    nombreCompleto: 'Café Americano Descafeinado Dolce Gusto 16 Cápsulas',
    intensidad: 4,
    capsulas: 16,
    precio: 4.95,
    notas: 'Aromático & con matices',
    slug: 'americano-descafeinado',
    img: 'americano-descafeinado-single.png',
    descafeinado: true,
  },
  {
    id: 'dg_grande',
    nombre: 'Grande',
    nombreCompleto: 'Café Grande Dolce Gusto 16 Cápsulas',
    intensidad: 5,
    capsulas: 16,
    precio: 4.95,
    notas: 'Abundante & equilibrado',
    slug: 'cafe-grande',
    img: 'bev0000003_16x_heroimage2026.png',
    descafeinado: false,
  },
  {
    id: 'dg_cortado_ginseng',
    nombre: 'Cortado Ginseng',
    nombreCompleto: 'Café Cortado Ginseng Dolce Gusto 16 Cápsulas',
    intensidad: null,
    capsulas: 16,
    precio: 4.95,
    notas: 'Potente y redondo',
    slug: 'cortado-cafe-ginseng',
    img: 'cortado_ginseng_single.png',
    descafeinado: false,
  },
  {
    id: 'dg_lungo_descafeinado',
    nombre: 'Lungo Descafeinado',
    nombreCompleto: 'Café Lungo Descafeinado Dolce Gusto 16 Cápsulas',
    intensidad: 6,
    capsulas: 16,
    precio: 4.95,
    notas: 'Envolvente & lleno de sabor',
    slug: 'lungo-descafeinado',
    img: 'bev0000023-16_heroimage_2026.png',
    descafeinado: true,
  },
  {
    id: 'dg_latte_macchiato',
    nombre: 'Latte Macchiato',
    nombreCompleto: 'Café Latte Macchiato Dolce Gusto 16 Cápsulas',
    intensidad: null,
    capsulas: 16,
    precio: 4.95,
    notas: 'Delicioso & Cremoso',
    slug: 'latte-macchiato',
    img: 'bev0000055_16x_hero_image_1.png',
    descafeinado: false,
  },
  {
    id: 'dg_cappuccino_light',
    nombre: 'Cappuccino Light',
    nombreCompleto: 'Cappuccino Light Dolce Gusto 16 Cápsulas',
    intensidad: null,
    capsulas: 16,
    precio: 4.95,
    notas: 'Cremoso & tostado',
    slug: 'cappuccino-light',
    img: 'bev0000053_16x_heroimage2026.png',
    descafeinado: false,
  },
  {
    id: 'dg_americano',
    nombre: 'Americano',
    nombreCompleto: 'Café Americano Dolce Gusto 16 Cápsulas',
    intensidad: 4,
    capsulas: 16,
    precio: 4.95,
    notas: 'Suave, aromático y con matices',
    slug: 'americano',
    img: 'bev0000001_16x_heroimage2026.png',
    descafeinado: false,
  },

  // ── Starbucks by Dolce Gusto ──
  {
    id: 'dg_starbucks_espresso_roast',
    nombre: 'Starbucks Espresso Roast',
    nombreCompleto: 'Starbucks Espresso Roast by Dolce Gusto 12 Cápsulas',
    intensidad: 11,
    capsulas: 12,
    precio: 4.89,
    notas: 'Notas intensas y dulces',
    slug: 'starbucks-espresso-dark-roast',
    img: '7613036940498_H__g-1_q-1_c-12_m-0.png',
    descafeinado: false,
    submarca: 'Starbucks',
  },
  {
    id: 'dg_starbucks_caramel_macchiato',
    nombre: 'Starbucks Caramel Macchiato',
    nombreCompleto: 'Starbucks Caramel Macchiato by Dolce Gusto 12 Cápsulas',
    intensidad: null,
    capsulas: 12,
    precio: 4.89,
    notas: 'Sabor a caramelo',
    slug: 'capsulas-caramel-macchiato',
    img: '7613037275704_h__g-1_q-1_c-6_m-6_2.png',
    descafeinado: false,
    submarca: 'Starbucks',
  },
  {
    id: 'dg_starbucks_house_blend',
    nombre: 'Starbucks House Blend Grande',
    nombreCompleto: 'Starbucks House Blend Grande by Dolce Gusto 12 Cápsulas',
    intensidad: 8,
    capsulas: 12,
    precio: 4.89,
    notas: 'Intensas notas de caramelo',
    slug: 'starbucks-house-blend-medium-roast',
    img: '7613036989268_h__g-1_q-1_c-12_m-0_1.png',
    descafeinado: false,
    submarca: 'Starbucks',
  },
  {
    id: 'dg_starbucks_cappuccino',
    nombre: 'Starbucks Cappuccino',
    nombreCompleto: 'Starbucks Cappuccino by Dolce Gusto 12 Cápsulas',
    intensidad: null,
    capsulas: 12,
    precio: 4.89,
    notas: 'Equilibrado & cremoso',
    slug: 'starbucks-cappuccino',
    img: '7613036927017_h__1_g-1_q-1_c-6_m-6.png',
    descafeinado: false,
    submarca: 'Starbucks',
  },
  {
    id: 'dg_starbucks_latte_macchiato',
    nombre: 'Starbucks Latte Macchiato',
    nombreCompleto: 'Starbucks Latte Macchiato by Dolce Gusto 12 Cápsulas',
    intensidad: null,
    capsulas: 12,
    precio: 4.89,
    notas: 'Suave y cremoso',
    slug: 'starbucks-latte-macchiato',
    img: '7613036927031_h__g-1_q-1_c-6_m-6.png',
    descafeinado: false,
    submarca: 'Starbucks',
  },
  {
    id: 'dg_starbucks_caffe_latte',
    nombre: 'Starbucks Caffè Latte',
    nombreCompleto: 'Starbucks Caffè Latte by Dolce Gusto 12 Cápsulas',
    intensidad: null,
    capsulas: 12,
    precio: 4.89,
    notas: 'Intenso y lácteo',
    slug: 'starbucks-caffe-latte',
    img: '7613039853153_h__g-1_q-1_c-12_m-0_1.png',
    descafeinado: false,
    submarca: 'Starbucks',
  },
  {
    id: 'dg_starbucks_espresso_colombia',
    nombre: 'Starbucks Espresso Colombia',
    nombreCompleto: 'Starbucks Espresso Colombia by Dolce Gusto 12 Cápsulas',
    intensidad: 7,
    capsulas: 12,
    precio: 4.89,
    notas: 'Notas florales y a nueces',
    slug: 'starbucks-cafe-colombia',
    img: 'colombia-espresso_1.png',
    descafeinado: false,
    submarca: 'Starbucks',
  },
  {
    id: 'dg_starbucks_vanilla_macchiato',
    nombre: 'Starbucks Madagascar Vanilla Macchiato',
    nombreCompleto: 'Starbucks Madagascar Vanilla Macchiato by Dolce Gusto 12 Cápsulas',
    intensidad: null,
    capsulas: 12,
    precio: 4.89,
    notas: 'Aterciopelado y con intensas notas de vainilla',
    slug: 'starbucks-latte-macchiato-vanilla',
    img: 'bev0000126_heroimage_1.png',
    descafeinado: false,
    submarca: 'Starbucks',
  },
  {
    id: 'dg_starbucks_white_mocha',
    nombre: 'Starbucks White Mocha',
    nombreCompleto: 'Starbucks White Mocha by Dolce Gusto 12 Cápsulas',
    intensidad: null,
    capsulas: 12,
    precio: 4.89,
    notas: 'Indulgente e intenso',
    slug: 'starbucks-white-mocha',
    img: '8445290398222_H__g-1_q-1_c-6_m-6.png',
    descafeinado: false,
    submarca: 'Starbucks',
  },
];

const IMG_BASE =
  'https://www.dolce-gusto.es/media/catalog/product/cache/a7ed62b12c9d28aa0842b5a9bc7623a5/';

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    const get = (u) =>
      https
        .get(u, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
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

async function uploadPhoto(docId, imageUrl) {
  const buf = await fetchBuf(imageUrl);
  if (buf.length < 500) {
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

(async () => {
  let created = 0,
    updated = 0,
    photoCount = 0,
    errors = 0;

  for (const p of PRODUCTS) {
    const docId = p.existingId || p.id;
    const isUpdate = !!p.existingId;
    const action = isUpdate ? 'UPDATE' : 'CREATE';
    console.log(`\n${action}: ${docId}`);
    console.log(`  ${p.nombreCompleto} | ${p.capsulas} caps | ${p.precio}€`);

    const imgUrl = `${IMG_BASE}${p.img.startsWith('b') || p.img.startsWith('7') || p.img.startsWith('8') || p.img.startsWith('c') || p.img.startsWith('a') ? '' : ''}${p.img}`;

    const data = {
      nombre: p.nombreCompleto,
      marca: 'NESCAFÉ Dolce Gusto',
      roaster: p.submarca || 'NESCAFÉ Dolce Gusto',
      tipo: 'capsula',
      tipoProducto: 'capsulas',
      formato: `${p.capsulas} cápsulas`,
      tamano: `${p.capsulas} cápsulas`,
      capsulas: p.capsulas,
      precio: p.precio,
      sistema: 'Dolce Gusto',
      compatibilidad: 'Dolce Gusto',
      fuente: 'NESCAFÉ Dolce Gusto',
      fuentePais: 'ES',
      fuenteUrl: `${BASE}/promocion-25-descuento-capsulas-web/${p.slug}`,
      notas: p.notas,
      notasCata: p.notas,
      updatedAt: new Date().toISOString(),
    };

    if (p.intensidad) data.intensidad = p.intensidad;
    if (p.descafeinado) data.descafeinado = true;
    if (p.submarca) data.submarca = p.submarca;

    if (!isUpdate) {
      data.fecha = new Date().toISOString();
      data.puntuacion = 0;
      data.votos = 0;
      data.status = 'approved';
      data.reviewStatus = 'approved';
      data.appVisible = true;
    }

    // Upload photo
    try {
      console.log(`  Photo: ${p.img.substring(0, 50)}...`);
      const photoUrl = await uploadPhoto(docId, imgUrl);
      if (photoUrl) {
        Object.assign(data, photoFields(photoUrl));
        photoCount++;
        console.log(`  Photo OK`);
      }
    } catch (e) {
      console.log(`  Photo ERROR: ${e.message}`);
      errors++;
    }

    // Write to Firestore
    try {
      if (isUpdate) {
        await db.collection('cafes').doc(docId).update(data);
        updated++;
        console.log(`  UPDATED`);
      } else {
        await db.collection('cafes').doc(docId).set(data);
        created++;
        console.log(`  CREATED`);
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
