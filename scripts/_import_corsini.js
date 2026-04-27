#!/usr/bin/env node
/**
 * Import Caffè Corsini — Full beans catalog from caffecorsini.com
 * 44 individual products (no packs/sets)
 * Images fetched from Shopify JSON API at runtime
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

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
    const mod = url.startsWith('https') ? https : require('http');
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

const S = 'https://cdn.shopify.com/s/files/1/0793/4971/1136/files';

const products = [
  // ============ BLENDS — 1 KG ============
  {
    id: 'corsini_espresso_1kg',
    nombre: 'Espresso Grano 1kg',
    peso: '1kg',
    precio: 17.99,
    img: `${S}/DCC115-shop.jpg`,
  },
  {
    id: 'corsini_super_cremoso_1kg',
    nombre: 'Super Cremoso Grano 1kg',
    peso: '1kg',
    precio: 17.7,
    img: `${S}/DCC048-shop.jpg`,
  },
  {
    id: 'corsini_gourmet_1kg',
    nombre: 'Gourmet Grano 1kg',
    peso: '1kg',
    precio: 18.99,
    img: `${S}/DCC050_shop_e9219d02-d849-4b7b-bcf4-9b31cb9306ca.jpg`,
  },
  {
    id: 'corsini_caracas_rosso_1kg',
    nombre: 'Caracas Rosso Grano 1kg',
    peso: '1kg',
    precio: 18.99,
    img: `${S}/DCC138-shop_e9a322ff-7d3d-4514-ac5e-cb2c50fff966.jpg`,
  },
  {
    id: 'corsini_superior_1kg',
    nombre: 'Superior Grano 1kg',
    peso: '1kg',
    precio: 19.99,
    img: `${S}/DCC071-shop.jpg`,
  },
  {
    id: 'corsini_nr_espresso_1kg',
    nombre: 'New Range Espresso Grano 1kg',
    peso: '1kg',
    precio: 18.47,
    img: `${S}/DCC605_shop.jpg`,
  },
  {
    id: 'corsini_nr_crema_1kg',
    nombre: 'New Range Crema Grano 1kg',
    peso: '1kg',
    precio: 28.99,
    img: `${S}/DCC606_shop_3.jpg`,
  },
  {
    id: 'corsini_nr_arabica_1kg',
    nombre: 'New Range 100% Arabica Grano 1kg',
    peso: '1kg',
    precio: 29.99,
    variedad: '100% Arábica',
    img: `${S}/DCC608_shop.jpg`,
  },

  // ============ PREMIUM — 1 KG ============
  {
    id: 'corsini_special_1kg',
    nombre: 'Special Grano 1kg',
    peso: '1kg',
    precio: 34.99,
    coffeeCategory: 'specialty',
    img: `${S}/BCC057_shop.jpg`,
  },
  {
    id: 'corsini_elite_1kg',
    nombre: 'Elite Grano 1kg',
    peso: '1kg',
    precio: 42.99,
    coffeeCategory: 'specialty',
    img: `${S}/BCC058_shop_d6e72489-2568-4986-b294-29d048789834.jpg`,
  },
  {
    id: 'corsini_estrella_caribe_1kg',
    nombre: 'Estrella del Caribe Grano 1kg',
    peso: '1kg',
    precio: 46.99,
    coffeeCategory: 'specialty',
    img: `${S}/DES056_shop.jpg`,
  },
  {
    id: 'corsini_riserva_bio_1kg',
    nombre: 'Riserva Silvano Corsini Bio Grano 1kg',
    peso: '1kg',
    precio: 50.99,
    isBio: true,
    coffeeCategory: 'specialty',
    img: `${S}/DAR248_shop.jpg`,
  },

  // ============ COMPAGNIA DELL'ARABICA — 100% ARÁBICA 1 KG ============
  {
    id: 'corsini_aromatico_cremoso_1kg',
    nombre: 'Aromatico e Cremoso 100% Arabica Grano 1kg',
    peso: '1kg',
    precio: 23.19,
    variedad: '100% Arábica',
    img: `${S}/DAR024_chicchi.jpg`,
  },

  // ============ BLENDS — 500G ============
  {
    id: 'corsini_classico_500g',
    nombre: 'Classico Grano 500g',
    peso: '500g',
    precio: 11.49,
    img: `${S}/DCC063-shop_1b239654-341f-4c61-a9b0-217f947d3afa.jpg`,
  },
  {
    id: 'corsini_qualita_oro_500g',
    nombre: 'Qualità Oro Grano 500g',
    peso: '500g',
    precio: 12.29,
    img: `${S}/DCC061_shop_b14271d5-2af4-4252-87cf-ce52a4f5dc6a.jpg`,
  },
  {
    id: 'corsini_nr_espresso_500g',
    nombre: 'New Range Espresso Grano 500g',
    peso: '500g',
    precio: 12.99,
    img: `${S}/DCC610_shop.jpg`,
  },
  {
    id: 'corsini_nr_aroma_500g',
    nombre: 'New Range Aroma Grano 500g',
    peso: '500g',
    precio: 13.99,
    img: `${S}/DCC616_shop.jpg`,
  },
  {
    id: 'corsini_nr_crema_500g',
    nombre: 'New Range Crema Grano 500g',
    peso: '500g',
    precio: 14.99,
    img: `${S}/DCC611_shop.jpg`,
  },
  {
    id: 'corsini_nr_arabica_500g',
    nombre: 'New Range 100% Arabica Grano 500g',
    peso: '500g',
    precio: 14.99,
    variedad: '100% Arábica',
    img: `${S}/DCC613_shop.jpg`,
  },
  {
    id: 'corsini_bio_rainforest_500g',
    nombre: 'Bio Rainforest Grano 500g',
    peso: '500g',
    precio: 15.99,
    isBio: true,
    img: `${S}/DCC614_shop_20_1.jpg`,
  },
  {
    id: 'corsini_nr_decaf_500g',
    nombre: 'New Range Decaffeinato Grano 500g',
    peso: '500g',
    precio: 16.99,
    decaf: true,
    img: `${S}/DCC612_shop_20_1.jpg`,
  },

  // ============ SINGLE ORIGINS — 500G (100% ARABICA) ============
  {
    id: 'corsini_ara_organic_brasil_500g',
    nombre: 'Ara Organic Brasil 100% Arabica Grano 500g',
    peso: '500g',
    precio: 17.09,
    variedad: '100% Arábica',
    isBio: true,
    origen: 'Brasil',
    img: `${S}/DAR075_shop_4498bc4d-1478-4ae9-a924-cc893954aae4.jpg`,
  },
  {
    id: 'corsini_brasil_santos_500g',
    nombre: 'Brasil Santos 100% Arabica Grano 500g',
    peso: '500g',
    precio: 19.99,
    variedad: '100% Arábica',
    origen: 'Brasil',
    img: `${S}/DBA013_shop.jpg`,
  },
  {
    id: 'corsini_colombia_medellin_500g',
    nombre: 'Colombia Medellin 100% Arabica Grano 500g',
    peso: '500g',
    precio: 19.89,
    variedad: '100% Arábica',
    origen: 'Colombia',
    img: `${S}/DCO011-shop_bc390893-4c77-428d-b702-0b20b11d73d3.jpg`,
  },
  {
    id: 'corsini_costa_rica_500g',
    nombre: 'Costa Rica 100% Arabica Grano 500g',
    peso: '500g',
    precio: 19.89,
    variedad: '100% Arábica',
    origen: 'Costa Rica',
    img: `${S}/DCA088_shop.jpg`,
  },
  {
    id: 'corsini_india_malabar_500g',
    nombre: 'India Monsooned Malabar 100% Arabica Grano 500g',
    peso: '500g',
    precio: 20.99,
    variedad: '100% Arábica',
    origen: 'India',
    img: `${S}/DAR016-shop_7aab097f-14e1-4602-a269-8643352c901d.jpg`,
  },
  {
    id: 'corsini_kenya_washed_500g',
    nombre: 'Kenya Washed 100% Arabica Grano 500g',
    peso: '500g',
    precio: 20.99,
    variedad: '100% Arábica',
    origen: 'Kenia',
    img: `${S}/DKE012_shop_chicchi.jpg`,
  },
  {
    id: 'corsini_el_salvador_500g',
    nombre: 'El Salvador 100% Arabica Grano 500g',
    peso: '500g',
    precio: 20.99,
    variedad: '100% Arábica',
    origen: 'El Salvador',
    img: `${S}/DEL016-shop_83c0a341-6fbc-42f6-8424-9002a32bdad4.jpg`,
  },
  {
    id: 'corsini_ethiopia_natural_500g',
    nombre: 'Ethiopia Natural 100% Arabica Grano 500g',
    peso: '500g',
    precio: 20.99,
    variedad: '100% Arábica',
    origen: 'Etiopía',
    img: `${S}/DAR222_shop_50b26c67-6961-47db-a5c9-b2fe603f0e96.jpg`,
  },
  {
    id: 'corsini_guatemala_500g',
    nombre: 'Guatemala 100% Arabica Grano 500g',
    peso: '500g',
    precio: 20.99,
    variedad: '100% Arábica',
    origen: 'Guatemala',
    img: `${S}/DGU019_shop_4822a76c-13df-4518-814e-69461741fd42.jpg`,
  },
  {
    id: 'corsini_decaf_arabica_500g',
    nombre: 'Decaffeinato 100% Arabica Grano 500g',
    peso: '500g',
    precio: 23.99,
    variedad: '100% Arábica',
    decaf: true,
    img: `${S}/DAR012_shop.jpg`,
  },

  // ============ 250G PRODUCTS ============
  {
    id: 'corsini_nr_arabica_250g',
    nombre: 'New Range 100% Arabica Grano 250g',
    peso: '250g',
    precio: 8.99,
    variedad: '100% Arábica',
    img: `${S}/DCC621_shop.jpg`,
  },
  {
    id: 'corsini_bio_rainforest_250g',
    nombre: 'Bio Rainforest Grano 250g',
    peso: '250g',
    precio: 8.99,
    isBio: true,
    img: `${S}/DCC622_shop.jpg`,
  },
  {
    id: 'corsini_costa_rica_250g',
    nombre: 'Costa Rica 100% Arabica Grano 250g',
    peso: '250g',
    precio: 9.99,
    variedad: '100% Arábica',
    origen: 'Costa Rica',
    img: `${S}/DCA048_shop.jpg`,
  },
  {
    id: 'corsini_colombia_medellin_250g',
    nombre: 'Colombia Medellin 100% Arabica Grano 250g',
    peso: '250g',
    precio: 9.99,
    variedad: '100% Arábica',
    origen: 'Colombia',
    img: `${S}/DCO041-shop.jpg`,
  },
  {
    id: 'corsini_brasil_santos_250g',
    nombre: 'Brasil Santos 100% Arabica Grano 250g',
    peso: '250g',
    precio: 10.19,
    variedad: '100% Arábica',
    origen: 'Brasil',
    img: `${S}/DBA043_shop_45998534-f352-4cd9-a63a-005b1c4609dd.jpg`,
  },
  {
    id: 'corsini_home_barista_250g',
    nombre: 'Home Barista Grano 250g',
    peso: '250g',
    precio: 10.99,
    img: `${S}/DCC604_shop.jpg`,
  },
  {
    id: 'corsini_guatemala_250g',
    nombre: 'Guatemala 100% Arabica Grano 250g',
    peso: '250g',
    precio: 10.99,
    variedad: '100% Arábica',
    origen: 'Guatemala',
    img: `${S}/DGU049_shop.jpg`,
  },
  {
    id: 'corsini_kenya_washed_250g',
    nombre: 'Kenya Washed 100% Arabica Grano 250g',
    peso: '250g',
    precio: 10.99,
    variedad: '100% Arábica',
    origen: 'Kenia',
    img: `${S}/DKE042_shop_9b45ac57-b3c7-464e-b906-e4e797fa86b7.jpg`,
  },
  {
    id: 'corsini_el_salvador_250g',
    nombre: 'El Salvador 100% Arabica Grano 250g',
    peso: '250g',
    precio: 10.99,
    variedad: '100% Arábica',
    origen: 'El Salvador',
    img: `${S}/DEL046_shop.jpg`,
  },
  {
    id: 'corsini_ethiopia_natural_250g',
    nombre: 'Ethiopia Natural 100% Arabica Grano 250g',
    peso: '250g',
    precio: 10.99,
    variedad: '100% Arábica',
    origen: 'Etiopía',
    img: `${S}/DAR216_shop_83410386-64d7-44b0-85b2-b32d3179f5fc.jpg`,
  },
  {
    id: 'corsini_india_malabar_250g',
    nombre: 'India Monsooned Malabar 100% Arabica Grano 250g',
    peso: '250g',
    precio: 11.19,
    variedad: '100% Arábica',
    origen: 'India',
    img: `${S}/DAR460-shop.jpg`,
  },
  {
    id: 'corsini_riserva_bio_250g',
    nombre: 'Riserva Silvano Corsini Bio Grano 250g',
    peso: '250g',
    precio: 12.99,
    isBio: true,
    img: `${S}/DAR068_shop.jpg`,
  },
  {
    id: 'corsini_jamaica_blue_mountain_250g',
    nombre: 'Jamaica Blue Mountain 100% Arabica Grano 250g',
    peso: '250g',
    precio: 39.99,
    variedad: '100% Arábica',
    origen: 'Jamaica',
    coffeeCategory: 'specialty',
    img: `${S}/DJA075_shop.jpg`,
  },
];

const baseData = {
  marca: 'Caffè Corsini',
  pais: 'Italia',
  origen: '',
  variedad: 'Blend',
  tueste: 'natural',
  tipo: 'natural',
  formato: 'beans',
  coffeeCategory: 'premium',
  category: 'premium',
  fuente: 'caffecorsini.com',
  fuentePais: 'IT',
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
    `=== Caffè Corsini Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  if (DRY) {
    products.forEach((p, i) =>
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${p.id} ← ${p.nombre} [${p.peso}] ${p.precio}€`
      )
    );
    return;
  }

  // Delete existing Corsini docs
  let delCount = 0;
  for (const marca of ['Caffè Corsini', 'Caffe Corsini', 'Caffé Corsini', 'Corsini']) {
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
        ...(p.origen ? { origen: p.origen } : {}),
        ...(p.variedad ? { variedad: p.variedad } : {}),
        ...(p.notas ? { notas: p.notas } : {}),
        ...(p.decaf ? { decaf: true, tipo: 'descafeinado' } : {}),
        ...(p.isBio ? { isBio: true } : {}),
        ...(p.coffeeCategory
          ? { coffeeCategory: p.coffeeCategory, category: p.coffeeCategory }
          : {}),
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
