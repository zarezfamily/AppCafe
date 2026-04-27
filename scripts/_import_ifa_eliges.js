#!/usr/bin/env node
/**
 * Import IFA Eliges + Eco Eliges coffee products from Gadis
 * Source: gadisline.com (April 2026)
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

const G = 'https://storage.gadisline.com/catalog';

const products = [
  // ══════ IFA ELIGES — Nespresso 20 uds — 3.75€ ══════
  {
    id: 'ifa_eliges_colombia_nesp_20',
    marca: 'IFA Eliges',
    nombre: 'Cápsulas Colombia compatible Nespresso 20 uds',
    peso: '20 cápsulas',
    precio: 3.75,
    formato: 'capsules',
    origen: 'Colombia',
    img: `${G}/5442267e-5aaf-4386-9127-ccf33c8f8c7e`,
  },
  {
    id: 'ifa_eliges_brasil_nesp_20',
    marca: 'IFA Eliges',
    nombre: 'Cápsulas Brasil compatible Nespresso 20 uds',
    peso: '20 cápsulas',
    precio: 3.75,
    formato: 'capsules',
    origen: 'Brasil',
    img: `${G}/690a5a7c-0010-4eb5-b6d8-14b582eefbed`,
  },
  {
    id: 'ifa_eliges_descaf_nesp_20',
    marca: 'IFA Eliges',
    nombre: 'Cápsulas descafeinado compatible Nespresso 20 uds',
    peso: '20 cápsulas',
    precio: 3.75,
    formato: 'capsules',
    decaf: true,
    img: `${G}/a9803712-82d1-4ee1-b3ae-55cb29d5d8fe`,
  },
  {
    id: 'ifa_eliges_intenso_nesp_20',
    marca: 'IFA Eliges',
    nombre: 'Cápsulas intenso compatible Nespresso 20 uds',
    peso: '20 cápsulas',
    precio: 3.75,
    formato: 'capsules',
    img: `${G}/513c0567-aab6-4c7b-bc45-39e53eac8d42`,
  },
  {
    id: 'ifa_eliges_ristretto_nesp_20',
    marca: 'IFA Eliges',
    nombre: 'Cápsulas ristretto compatible Nespresso 20 uds',
    peso: '20 cápsulas',
    precio: 3.75,
    formato: 'capsules',
    img: `${G}/81757c5c-efb7-4553-97e7-55f6576f5b82`,
  },
  {
    id: 'ifa_eliges_extra_intenso_nesp_20',
    marca: 'IFA Eliges',
    nombre: 'Cápsulas extra intenso (intensidad 11) compatible Nespresso 20 uds',
    peso: '20 cápsulas',
    precio: 3.75,
    formato: 'capsules',
    img: `${G}/f040d6dd-ab03-4134-be6f-3f7422280dcd`,
  },
  {
    id: 'ifa_eliges_suave_arabica_nesp_20',
    marca: 'IFA Eliges',
    nombre: 'Cápsulas suave 100% arábica (intensidad 6) compatible Nespresso 20 uds',
    peso: '20 cápsulas',
    precio: 3.75,
    formato: 'capsules',
    variedad: 'Arábica',
    img: `${G}/688ed56d-e30e-45c5-9d0c-65316653bcde`,
  },

  // ══════ IFA ELIGES — Dolce Gusto 16 uds — 3.40€ ══════
  {
    id: 'ifa_eliges_cleche_dg_16',
    marca: 'IFA Eliges',
    nombre: 'Cápsulas café con leche compatible Dolce Gusto 16 uds',
    peso: '16 cápsulas',
    precio: 3.4,
    formato: 'capsules',
    img: `${G}/238655ed-76c9-40f6-b3c3-b43f6173fe71`,
  },
  {
    id: 'ifa_eliges_cleche_descaf_dg_16',
    marca: 'IFA Eliges',
    nombre: 'Cápsulas café con leche descafeinado compatible Dolce Gusto 16 uds',
    peso: '16 cápsulas',
    precio: 3.4,
    formato: 'capsules',
    decaf: true,
    img: `${G}/d4d2c357-d6d7-4b17-95da-98134dcc4e0d`,
  },
  {
    id: 'ifa_eliges_espresso_intenso_dg_16',
    marca: 'IFA Eliges',
    nombre: 'Cápsulas espresso intenso compatible Dolce Gusto 16 uds',
    peso: '16 cápsulas',
    precio: 3.4,
    formato: 'capsules',
    img: `${G}/36aa9bf2-959f-42fe-9844-a2e886ff3a3b`,
  },
  {
    id: 'ifa_eliges_cortado_dg_16',
    marca: 'IFA Eliges',
    nombre: 'Cápsulas cortado compatible Dolce Gusto 16 uds',
    peso: '16 cápsulas',
    precio: 3.4,
    formato: 'capsules',
    img: `${G}/8a5db2b8-e011-4f9f-8938-bc02f4287818`,
  },
  {
    id: 'ifa_eliges_espresso_descaf_dg_16',
    marca: 'IFA Eliges',
    nombre: 'Cápsulas espresso descafeinado compatible Dolce Gusto 16 uds',
    peso: '16 cápsulas',
    precio: 3.4,
    formato: 'capsules',
    decaf: true,
    img: `${G}/b3b64a62-a348-4369-a489-f01a056a5203`,
  },
  {
    id: 'ifa_eliges_capuccino_dg_16',
    marca: 'IFA Eliges',
    nombre: 'Cápsulas capuccino compatible Dolce Gusto 16 uds',
    peso: '16 cápsulas',
    precio: 3.4,
    formato: 'capsules',
    img: `${G}/4ffcc507-a7c0-476a-93c3-735903a69e88`,
  },
  {
    id: 'ifa_eliges_cortado_descaf_dg_16',
    marca: 'IFA Eliges',
    nombre: 'Cápsulas cortado descafeinado compatible Dolce Gusto 16 uds',
    peso: '16 cápsulas',
    precio: 3.4,
    formato: 'capsules',
    decaf: true,
    img: `${G}/ace3be6f-f65e-4988-9af8-377b2588882e`,
  },

  // ══════ IFA ELIGES — Molido 250g ══════
  {
    id: 'ifa_eliges_molido_natural_250g',
    marca: 'IFA Eliges',
    nombre: 'Café molido natural 250g',
    peso: '250g',
    precio: 2.49,
    formato: 'ground',
    img: `${G}/fc43c7bf-abfe-445d-ac11-b4725f190e4d`,
  },
  {
    id: 'ifa_eliges_molido_mezcla_250g',
    marca: 'IFA Eliges',
    nombre: 'Café molido mezcla 250g',
    peso: '250g',
    precio: 2.65,
    formato: 'ground',
    tipo: 'mezcla',
    img: `${G}/ced98d05-2e4c-4e83-93ca-cf88ed130419`,
  },
  {
    id: 'ifa_eliges_molido_descaf_mezcla_250g',
    marca: 'IFA Eliges',
    nombre: 'Café molido descafeinado mezcla 250g',
    peso: '250g',
    precio: 2.95,
    formato: 'ground',
    decaf: true,
    tipo: 'mezcla',
    img: `${G}/b0a4304c-9c26-4592-8ab0-fd1365608912`,
  },
  {
    id: 'ifa_eliges_molido_descaf_natural_250g',
    marca: 'IFA Eliges',
    nombre: 'Café molido descafeinado natural 250g',
    peso: '250g',
    precio: 2.65,
    formato: 'ground',
    decaf: true,
    img: `${G}/5c55ada1-6071-4a08-893d-e9aebd0532ef`,
  },

  // ══════ IFA ELIGES — Grano 1kg ══════
  {
    id: 'ifa_eliges_grano_natural_1kg',
    marca: 'IFA Eliges',
    nombre: 'Café en grano natural 1kg',
    peso: '1kg',
    precio: 10.5,
    formato: 'beans',
    img: `${G}/534a299d-dce1-40b8-8f59-701d40eacc2b`,
  },
  {
    id: 'ifa_eliges_grano_mezcla_1kg',
    marca: 'IFA Eliges',
    nombre: 'Café en grano mezcla 1kg',
    peso: '1kg',
    precio: 10.5,
    formato: 'beans',
    tipo: 'mezcla',
    img: `${G}/83a2b479-fc0a-4bae-bd4c-92bb7af2aa05`,
  },

  // ══════ IFA ELIGES — Soluble ══════
  {
    id: 'ifa_eliges_soluble_natural_200g',
    marca: 'IFA Eliges',
    nombre: 'Café soluble natural 200g',
    peso: '200g',
    precio: 4.25,
    formato: 'instant',
    img: `${G}/4b775f8b-738c-485d-9908-9366d71d0f40`,
  },
  {
    id: 'ifa_eliges_soluble_descaf_200g',
    marca: 'IFA Eliges',
    nombre: 'Café soluble descafeinado 200g',
    peso: '200g',
    precio: 4.55,
    formato: 'instant',
    decaf: true,
    img: `${G}/5dca5eb1-4253-4fdf-b8a9-7b7bf98d5876`,
  },
  {
    id: 'ifa_eliges_soluble_cappuccino_250g',
    marca: 'IFA Eliges',
    nombre: 'Café soluble cappuccino natural 250g',
    peso: '250g',
    precio: 2.75,
    formato: 'instant',
    img: `${G}/8aac332d-8590-433c-a845-965691530a15`,
  },

  // ══════ ECO ELIGES — Molido ecológico ══════
  {
    id: 'eco_eliges_molido_natural_250g',
    marca: 'Eco Eliges',
    nombre: 'Café molido natural ecológico 250g',
    peso: '250g',
    precio: 4.46,
    formato: 'ground',
    isBio: true,
    img: `${G}/81c6d640-cde6-453a-913f-184a33eb53d3`,
  },
];

function baseData(marca) {
  return {
    marca,
    pais: 'España',
    origen: '',
    variedad: 'Blend',
    tueste: 'natural',
    tipo: 'natural',
    coffeeCategory: 'supermarket',
    category: 'supermarket',
    fuente: 'gadisline.com',
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
  console.log(
    `=== IFA Eliges + Eco Eliges Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  if (DRY) {
    products.forEach((p, i) => {
      console.log(
        `  ${(i + 1).toString().padStart(2)}. [${p.marca}] ${p.id} — ${p.nombre} ${p.precio}€`
      );
    });
    console.log(`\n  Total: ${products.length} products`);
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
        ...baseData(p.marca),
        nombre: p.nombre,
        peso: p.peso,
        precio: p.precio,
        formato: p.formato,
        ...(p.origen ? { origen: p.origen } : {}),
        ...(p.variedad ? { variedad: p.variedad } : {}),
        ...(p.decaf ? { decaf: true, tipo: 'descafeinado' } : {}),
        ...(p.tipo && !p.decaf ? { tipo: p.tipo } : {}),
        ...(p.isBio ? { isBio: true } : {}),
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
