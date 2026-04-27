#!/usr/bin/env node
/**
 * Import 25 NEW Oquendo products (Molido, Soluble, Cápsulas Nespresso, Cápsulas Dolce Gusto)
 * + Clean up 2 old duplicate grano docs
 * Existing 11 grano docs are already up to date with correct prices.
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
            const loc = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, url).href;
            return fetchBuf(loc).then(resolve, reject);
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

const OQ = 'https://www.cafesoquendo.com/wp-content/uploads';

const products = [
  // === MOLIDO (12 productos) ===
  {
    id: 'oquendo_molido_bio_arabica_250',
    nombre: 'Café 100% Arábica BIO molido 250 g',
    formato: 'ground',
    peso: '250g',
    precio: 6.05,
    img: `${OQ}/2019/10/aaff-cafe-molido-bio-natural-5.png`,
    notas: 'Café molido 100% Arábica ecológico',
    isBio: true,
    variedad: '100% Arábica',
  },

  {
    id: 'oquendo_molido_bio_descaf_250',
    nombre: 'Café Descafeinado al Agua 100% Arábica BIO molido 250 g',
    formato: 'ground',
    peso: '250g',
    precio: 6.65,
    img: `${OQ}/2019/10/aaff-cafe-molido-bio-descaf.png`,
    notas: 'Café molido descafeinado al agua 100% Arábica ecológico',
    isBio: true,
    decaf: true,
    variedad: '100% Arábica',
  },

  {
    id: 'oquendo_molido_arabica_400',
    nombre: 'Café 100% Arábica molido 400 g',
    formato: 'ground',
    peso: '400g',
    precio: 8.95,
    img: `${OQ}/2024/08/cofibox-arabica.png`,
    notas: 'Café molido élite 100% Arábica',
    variedad: '100% Arábica',
  },

  {
    id: 'oquendo_molido_natural_400',
    nombre: 'Café Natural molido 400 g',
    formato: 'ground',
    peso: '400g',
    precio: 8.0,
    img: `${OQ}/2019/10/cofibox-natural.png`,
    notas: 'Café molido élite natural',
  },

  {
    id: 'oquendo_molido_mezcla_400',
    nombre: 'Café Mezcla 70-30 molido 400 g',
    formato: 'ground',
    peso: '400g',
    precio: 8.0,
    img: `${OQ}/2019/10/cofibox-mezcla-2.png`,
    notas: 'Café molido élite mezcla (70% Natural, 30% Torrefacto)',
    tueste: 'mezcla',
  },

  {
    id: 'oquendo_molido_descaf_400',
    nombre: 'Café Descafeinado molido 400 g',
    formato: 'ground',
    peso: '400g',
    precio: 8.65,
    img: `${OQ}/2019/10/cofibox-descafeinado.png`,
    notas: 'Café molido élite descafeinado',
    decaf: true,
  },

  {
    id: 'oquendo_molido_colombia_250',
    nombre: 'Colombia Huila molido 250 g',
    formato: 'ground',
    peso: '250g',
    precio: 6.05,
    img: `${OQ}/2019/10/Cafe-Molido-Grandes-Origenes.jpg`,
    notas: 'Café molido grandes orígenes Colombia Huila',
    origen: 'Colombia',
    region: 'Huila',
  },

  {
    id: 'oquendo_molido_brasil_250',
    nombre: 'Brasil Sara molido 250 g',
    formato: 'ground',
    peso: '250g',
    precio: 6.05,
    img: `${OQ}/2019/10/OQUENDO-CAFE-MOLIDO-BRASIL-640x584-1.png`,
    notas: 'Café molido grandes orígenes Brasil Sara',
    origen: 'Brasil',
  },

  {
    id: 'oquendo_molido_natural_250',
    nombre: 'Café Natural molido 250 g',
    formato: 'ground',
    peso: '250g',
    precio: 4.5,
    img: `${OQ}/2019/10/OQUENDO-MOLIDO250-Nat.png`,
    notas: 'Café molido natural',
  },

  {
    id: 'oquendo_molido_mezcla_250',
    nombre: 'Café Mezcla 70-30 molido 250 g',
    formato: 'ground',
    peso: '250g',
    precio: 4.5,
    img: `${OQ}/2019/10/OQUENDO-MOLIDO250-Mezcl_small.png`,
    notas: 'Café molido mezcla 70-30',
    tueste: 'mezcla',
  },

  {
    id: 'oquendo_molido_descaf_250',
    nombre: 'Café Descafeinado molido 250 g',
    formato: 'ground',
    peso: '250g',
    precio: 4.95,
    img: `${OQ}/2019/10/OQUENDO-MOLIDO250-Descaf_small.png`,
    notas: 'Café molido descafeinado',
    decaf: true,
  },

  {
    id: 'oquendo_molido_pota_250',
    nombre: 'Café de Pota molido 250 g',
    formato: 'ground',
    peso: '250g',
    precio: 4.35,
    img: `${OQ}/list/oquendo-list-71-molido-pota_250.png`,
    notas: 'Café molido especial para pota o puchero',
  },

  // === SOLUBLE (1 producto) ===
  {
    id: 'oquendo_soluble_descaf',
    nombre: 'Café Descafeinado Instantáneo 100 sobres',
    formato: 'soluble',
    peso: '100 sobres',
    precio: 27.4,
    img: `${OQ}/2020/05/descafeinado-soluble.png`,
    notas: 'Café soluble descafeinado en sobres individuales',
    decaf: true,
  },

  // === CÁPSULAS NESPRESSO (3 productos) ===
  {
    id: 'oquendo_caps_barista_gran_reserva',
    nombre: 'Barista Gran Reserva cápsulas Nespresso 10 uds',
    formato: 'capsules',
    peso: '10 cápsulas',
    precio: 4.55,
    img: `${OQ}/2019/10/Barista-Gran-Reserva-1.png`,
    notas: 'Cápsulas de aluminio compatibles Nespresso. Gran Reserva',
    compatibleCon: 'Nespresso',
  },

  {
    id: 'oquendo_caps_barista_excelsor',
    nombre: 'Barista Excelsor cápsulas Nespresso 10 uds',
    formato: 'capsules',
    peso: '10 cápsulas',
    precio: 4.4,
    img: `${OQ}/2019/10/Barista-Excelsor.png`,
    notas: 'Cápsulas de aluminio compatibles Nespresso. Excelsor',
    compatibleCon: 'Nespresso',
  },

  {
    id: 'oquendo_caps_barista_descaf',
    nombre: 'Barista Descafeinado al Agua cápsulas Nespresso 10 uds',
    formato: 'capsules',
    peso: '10 cápsulas',
    precio: 4.75,
    img: `${OQ}/2019/10/Barista-Descafeinado.png`,
    notas: 'Cápsulas de aluminio compatibles Nespresso. Descafeinado al agua',
    compatibleCon: 'Nespresso',
    decaf: true,
  },

  // === CÁPSULAS DOLCE GUSTO (9 productos) ===
  {
    id: 'oquendo_dg_cappuccino_avellana',
    nombre: 'Cappuccino Avellana cápsulas Dolce Gusto 12 uds',
    formato: 'capsules',
    peso: '12 cápsulas',
    precio: 5.3,
    img: `${OQ}/2022/06/OQUENDO-DG_CappAvellana.png`,
    notas: 'Cápsulas compatibles Dolce Gusto. Cappuccino sabor avellana',
    compatibleCon: 'Dolce Gusto',
  },

  {
    id: 'oquendo_dg_cappuccino_irish',
    nombre: 'Cappuccino Irish cápsulas Dolce Gusto 12 uds',
    formato: 'capsules',
    peso: '12 cápsulas',
    precio: 5.3,
    img: `${OQ}/2022/06/OQUENDO-DG_CappIrish.png`,
    notas: 'Cápsulas compatibles Dolce Gusto. Cappuccino sabor Irish',
    compatibleCon: 'Dolce Gusto',
  },

  {
    id: 'oquendo_dg_cappuccino',
    nombre: 'Cappuccino cápsulas Dolce Gusto 12 uds',
    formato: 'capsules',
    peso: '12 cápsulas',
    precio: 5.3,
    img: `${OQ}/2019/10/OQUENDO-DG_Capp_Small.png`,
    notas: 'Cápsulas compatibles Dolce Gusto. Cappuccino',
    compatibleCon: 'Dolce Gusto',
  },

  {
    id: 'oquendo_dg_cafe_con_leche',
    nombre: 'Café Con Leche cápsulas Dolce Gusto 16 uds',
    formato: 'capsules',
    peso: '16 cápsulas',
    precio: 5.3,
    img: `${OQ}/2019/10/OQUENDO-MEPIACHI_CafeLeche.png`,
    notas: 'Cápsulas compatibles Dolce Gusto. Café con leche',
    compatibleCon: 'Dolce Gusto',
  },

  {
    id: 'oquendo_dg_cafe_leche_descaf',
    nombre: 'Café Con Leche Descafeinado cápsulas Dolce Gusto 16 uds',
    formato: 'capsules',
    peso: '16 cápsulas',
    precio: 5.3,
    img: `${OQ}/2020/07/OQUENDO-MEPIACHI_CafeLecheDescaf-584.png`,
    notas: 'Cápsulas compatibles Dolce Gusto. Café con leche descafeinado',
    compatibleCon: 'Dolce Gusto',
    decaf: true,
  },

  {
    id: 'oquendo_dg_cortado',
    nombre: 'Café Cortado cápsulas Dolce Gusto 16 uds',
    formato: 'capsules',
    peso: '16 cápsulas',
    precio: 5.3,
    img: `${OQ}/2019/10/OQUENDO-MEPIACHI_Cortado.png`,
    notas: 'Cápsulas compatibles Dolce Gusto. Café cortado',
    compatibleCon: 'Dolce Gusto',
  },

  {
    id: 'oquendo_dg_espresso_intenso',
    nombre: 'Espresso Intenso cápsulas Dolce Gusto 16 uds',
    formato: 'capsules',
    peso: '16 cápsulas',
    precio: 5.2,
    img: `${OQ}/2019/10/OQUENDO-MEPIACHI_Espresso.png`,
    notas: 'Cápsulas compatibles Dolce Gusto. Espresso intenso',
    compatibleCon: 'Dolce Gusto',
  },

  {
    id: 'oquendo_dg_lungo_espresso',
    nombre: 'Lungo Espresso cápsulas Dolce Gusto 16 uds',
    formato: 'capsules',
    peso: '16 cápsulas',
    precio: 5.2,
    img: `${OQ}/2019/10/OQUENDO-MEPIACHI_Lungo.png`,
    notas: 'Cápsulas compatibles Dolce Gusto. Lungo espresso',
    compatibleCon: 'Dolce Gusto',
  },

  {
    id: 'oquendo_dg_espresso_descaf',
    nombre: 'Espresso Descafeinado cápsulas Dolce Gusto 16 uds',
    formato: 'capsules',
    peso: '16 cápsulas',
    precio: 5.2,
    img: `${OQ}/2019/10/OQUENDO-MEPIACHI_EspressoDescaf-584.png`,
    notas: 'Cápsulas compatibles Dolce Gusto. Espresso descafeinado',
    compatibleCon: 'Dolce Gusto',
    decaf: true,
  },
];

// Old duplicate docs to delete
const OLD_DUPES = ['3U68wP8ALa2mYBa8ZMtR', 'oquendo_mezcla_grano_1kg'];

const baseData = {
  marca: 'Cafés Oquendo',
  pais: 'España',
  origen: '',
  variedad: 'Blend',
  tueste: 'natural',
  tipo: 'natural',
  coffeeCategory: 'commercial',
  category: 'commercial',
  fuente: 'cafesoquendo.com',
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
    `=== Oquendo NEW Products Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} new + delete ${OLD_DUPES.length} dupes)\n`
  );

  if (DRY) {
    console.log('NEW products:');
    products.forEach((p, i) =>
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${p.id} ← ${p.nombre} [${p.formato}] ${p.precio}€`
      )
    );
    console.log(`\nDuplicates to delete: ${OLD_DUPES.join(', ')}`);
    return;
  }

  // Delete old duplicates
  for (const id of OLD_DUPES) {
    try {
      await db.collection('cafes').doc(id).delete();
      try {
        await bucket.file(`${PREFIX}/${id}.png`).delete();
      } catch {}
      console.log(`  Deleted old dupe: ${id}`);
    } catch (e) {
      console.log(`  WARN deleting ${id}: ${e.message}`);
    }
  }

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
        formato: p.formato,
        peso: p.peso,
        precio: p.precio,
        ...(p.origen ? { origen: p.origen } : {}),
        ...(p.region ? { region: p.region } : {}),
        ...(p.variedad ? { variedad: p.variedad } : {}),
        ...(p.notas ? { notas: p.notas } : {}),
        ...(p.decaf ? { decaf: true, tipo: 'descafeinado' } : {}),
        ...(p.isBio ? { isBio: true } : {}),
        ...(p.tueste ? { tueste: p.tueste } : {}),
        ...(p.compatibleCon ? { compatibleCon: p.compatibleCon } : {}),
        ...photoFields,
      };
      await db.collection('cafes').doc(p.id).set(doc);
      ok++;
      process.stdout.write(`\r  Created ${ok}/${products.length}`);
    } catch (e) {
      console.log(`\n  ERROR ${p.id}: ${e.message}`);
    }
  }
  console.log(
    `\n\n=== Done: ${ok} new products created, ${OLD_DUPES.length} dupes deleted (${noImg} without photo) ===`
  );
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
