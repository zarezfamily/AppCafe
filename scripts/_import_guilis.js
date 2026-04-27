#!/usr/bin/env node
/**
 * Import/Update Cafés Guilis from cafesguilis.com
 * Grain, ground, and capsule products
 * Site has anti-bot cookie challenge: dhd2=daad685a219cb8c82178fcbb4be14b38
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

const COOKIE = 'dhd2=daad685a219cb8c82178fcbb4be14b38';

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    const opts = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Cookie: COOKIE,
      },
    };
    https
      .get(url, opts, (res) => {
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
      })
      .on('error', reject);
  });
}

async function getOgImage(pageUrl) {
  try {
    const html = (await fetchBuf(pageUrl)).toString();
    const m = html.match(/property="og:image"\s*content="([^"]+)"/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
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

const B = 'https://cafesguilis.com/producto';

const products = [
  // === GRANO ===
  {
    id: 'guilis_colombia_supremo_fairtrade_1kg',
    nombre: 'Colombia Supremo Fair Trade Grano 1kg',
    page: `${B}/cafe-de-colombia-supremo-fair-trade-en-grano-100-arabica-tueste-natural-1-kg/`,
    fmt: 'grano',
    peso: '1kg',
    origen: 'Colombia',
    variedad: '100% Arábica',
    notas: 'Colombia Supremo. Fair Trade. Tueste natural',
  },

  {
    id: 'guilis_black_blend_grano_1kg',
    nombre: 'Black Blend Natural Grano 1kg',
    page: `${B}/cafe-black-blend-natural-cafes-guilis/`,
    fmt: 'grano',
    peso: '1kg',
    notas: 'Black Blend. Tueste natural. Intenso',
  },

  {
    id: 'guilis_finca_colombia_grano_1kg',
    nombre: 'Finca Colombia Natural Grano 1kg',
    page: `${B}/cafe-de-finca-colombia-natural-arabica/`,
    fmt: 'grano',
    peso: '1kg',
    origen: 'Colombia',
    variedad: '100% Arábica',
    notas: 'Café de finca. Colombia. Natural. 100% Arábica',
  },

  {
    id: 'guilis_finca_mocatan_colombia_grano_1kg',
    nombre: 'Finca Mocatán 100% Colombia Natural Grano 1kg',
    page: `${B}/cafe-de-finca-100-colombia-mocatan-natural-guilis/`,
    fmt: 'grano',
    peso: '1kg',
    origen: 'Colombia',
    notas: 'Café de finca Mocatán. 100% Colombia. Tueste natural',
  },

  {
    id: 'guilis_blend_caribe_grano_1kg',
    nombre: 'Blend Natural Caribe Grano 1kg',
    page: `${B}/cafe-blend-natural-caribe-cafes-guilis/`,
    fmt: 'grano',
    peso: '1kg',
    notas: 'Blend Caribe. Tueste natural',
  },

  {
    id: 'guilis_eco_beans_rainforest_grano_1kg',
    nombre: 'Blend Orgánico Eco Beans Rainforest Alliance Grano 1kg',
    page: `${B}/cafe-blend-organico-natural-eco-beans-cafes-utz-rainforest-alliance-guilis/`,
    fmt: 'grano',
    peso: '1kg',
    isBio: true,
    notas: 'Blend orgánico. Eco Beans. Rainforest Alliance. Tueste natural',
  },

  {
    id: 'guilis_organico_arabica_lata_250g_grano',
    nombre: 'Blend Orgánico Arábica Natural Lata 250g Grano',
    page: `${B}/cafe-blend-organico-arabica-natural-lata-250-gr-cafes-guilis/`,
    fmt: 'grano',
    peso: '250g',
    isBio: true,
    variedad: '100% Arábica',
    notas: 'Blend orgánico. Arábica. Lata 250g. Tueste natural',
  },

  {
    id: 'guilis_eco_descafeinado_grano_500g',
    nombre: 'Ecológico Descafeinado Grano 500g',
    page: `${B}/cafe-ecologico-descafeinado-500-gr-cafes-guilis/`,
    fmt: 'grano',
    peso: '500g',
    isBio: true,
    decaf: true,
    variedad: '100% Arábica',
    notas: 'Ecológico. Descafeinado. 100% Arábica. Tueste natural',
  },

  {
    id: 'guilis_finca_icatu_brasil_grano_1kg',
    nombre: 'Finca Icatu Brasil Natural Grano 1kg',
    page: `${B}/cafe-natural-de-finca-brasil-icatu-cafes-guilis/`,
    fmt: 'grano',
    peso: '1kg',
    origen: 'Brasil',
    variedad: 'Icatu',
    notas: 'Café de finca. Brasil Icatu. Tueste natural',
  },

  {
    id: 'guilis_grano_de_oro_grano_1kg',
    nombre: 'Blend Natural Grano de Oro 1kg',
    page: `${B}/cafe-blend-natural-intenso-grano-de-oro-cafes-guilis/`,
    fmt: 'grano',
    peso: '1kg',
    notas: 'Blend Grano de Oro. Tueste natural. Intenso',
  },

  {
    id: 'guilis_descafeinado_espresso_grano_1kg',
    nombre: 'Descafeinado Natural Espresso Grano 1kg',
    page: `${B}/cafe-descafeinado-natural-espresso-arabica-cafes-guilis/`,
    fmt: 'grano',
    peso: '1kg',
    decaf: true,
    variedad: '100% Arábica',
    notas: 'Descafeinado. Espresso. 100% Arábica. Tueste natural',
  },

  {
    id: 'guilis_pack_4_latas_grano',
    nombre: 'Pack 4 Latas Varios Orígenes Grano 4x250g',
    page: `${B}/cafe-en-grano-natural-varios-origenes-de-tueste-natural-pack-4-latas-250-gr/`,
    fmt: 'grano',
    peso: '4x250g',
    notas: 'Pack 4 latas. Varios orígenes. Tueste natural',
  },

  // === MOLIDO (solo los que no existen en grano) ===
  {
    id: 'guilis_black_blend_molido_1kg',
    nombre: 'Black Blend Natural Molido 1kg',
    page: `${B}/cafe-black-blend-natural-1-kg-molido/`,
    fmt: 'molido',
    peso: '1kg',
    notas: 'Black Blend. Tueste natural. Intenso',
  },

  {
    id: 'guilis_finca_mocatan_colombia_molido_1kg',
    nombre: 'Finca Mocatán 100% Colombia Natural Molido 1kg',
    page: `${B}/cafe-de-finca-mocatan-100-colombia-natural-1-kg-molido/`,
    fmt: 'molido',
    peso: '1kg',
    origen: 'Colombia',
    notas: 'Café de finca Mocatán. 100% Colombia. Tueste natural',
  },

  {
    id: 'guilis_blend_caribe_molido_1kg',
    nombre: 'Blend Natural Caribe Molido 1kg',
    page: `${B}/cafe-blend-natural-caribe-1-kg-molido/`,
    fmt: 'molido',
    peso: '1kg',
    notas: 'Blend Caribe. Tueste natural',
  },

  {
    id: 'guilis_eco_beans_rainforest_molido_1kg',
    nombre: 'Blend Orgánico Eco Beans Rainforest Alliance Molido 1kg',
    page: `${B}/cafe-blend-organico-natural-eco-beans-rainforest-alliance-1-kg-molido/`,
    fmt: 'molido',
    peso: '1kg',
    isBio: true,
    notas: 'Blend orgánico. Eco Beans. Rainforest Alliance. Tueste natural',
  },

  {
    id: 'guilis_eco_beans_molido_1kg',
    nombre: 'Ecológico Natural Eco Beans Molido 1kg',
    page: `${B}/cafe-ecologico-natural-molido-eco-beans-cafes-guilis/`,
    fmt: 'molido',
    peso: '1kg',
    isBio: true,
    notas: 'Ecológico. Eco Beans. Tueste natural',
  },

  {
    id: 'guilis_organico_arabica_lata_250g_molido',
    nombre: 'Blend Orgánico Arábica Natural Lata 250g Molido',
    page: `${B}/cafe-blend-organico-arabica-natural-lata-250-gr-molido/`,
    fmt: 'molido',
    peso: '250g',
    isBio: true,
    variedad: '100% Arábica',
    notas: 'Blend orgánico. Arábica. Lata 250g. Tueste natural',
  },

  {
    id: 'guilis_finca_icatu_brasil_molido_1kg',
    nombre: 'Finca Icatu Brasil Natural Molido 1kg',
    page: `${B}/cafe-natural-de-finca-icatu-brasil-1-kg-molido/`,
    fmt: 'molido',
    peso: '1kg',
    origen: 'Brasil',
    variedad: 'Icatu',
    notas: 'Café de finca. Brasil Icatu. Tueste natural',
  },

  {
    id: 'guilis_grano_de_oro_molido_1kg',
    nombre: 'Blend Natural Grano de Oro Molido 1kg',
    page: `${B}/cafe-blend-natural-grano-de-oro-1-kg-molido/`,
    fmt: 'molido',
    peso: '1kg',
    notas: 'Blend Grano de Oro. Tueste natural. Intenso',
  },

  {
    id: 'guilis_descafeinado_espresso_molido_1kg',
    nombre: 'Descafeinado Natural Espresso Molido 1kg',
    page: `${B}/cafe-descafeinado-natural-espresso-100-arabica-1-kg-molido/`,
    fmt: 'molido',
    peso: '1kg',
    decaf: true,
    variedad: '100% Arábica',
    notas: 'Descafeinado. Espresso. 100% Arábica. Tueste natural',
  },

  {
    id: 'guilis_finca_blend_arabica_lata_250g_molido',
    nombre: 'Finca Blend Arábica Natural Lata 250g Molido',
    page: `${B}/cafe-de-finca-blend-arabica-natural-lata-250-gr-molido/`,
    fmt: 'molido',
    peso: '250g',
    variedad: '100% Arábica',
    notas: 'Blend Arábica. De finca. Lata 250g. Tueste natural',
  },

  {
    id: 'guilis_pack_4_latas_molido',
    nombre: 'Pack 4 Latas Varios Orígenes Molido 4x250g',
    page: `${B}/cafe-molido-natural-varios-origenes-de-tueste-natural-pack-4-latas-250-gr/`,
    fmt: 'molido',
    peso: '4x250g',
    notas: 'Pack 4 latas. Varios orígenes. Tueste natural',
  },

  // === CÁPSULAS NESPRESSO ===
  {
    id: 'guilis_caps_nespresso_descafeinado_70',
    nombre: 'Cápsulas Nespresso Descafeinado Natural al Agua 70uds',
    page: `${B}/capsulas-de-aluminio-compatibles-con-nespresso-cafe-descafeinado-intenso/`,
    fmt: 'capsules',
    peso: '70 cápsulas',
    decaf: true,
    variedad: '100% Arábica',
    notas: 'Compatible Nespresso. Aluminio. Descafeinado al agua. Espresso intenso. 70 cápsulas',
  },

  {
    id: 'guilis_caps_nespresso_intenso_180',
    nombre: 'Cápsulas Nespresso Aluminio Café Intenso 180uds',
    page: `${B}/capsulas-compostables-compatibles-nespresso-cafe-intenso-180-uds-cafes-guilis/`,
    fmt: 'capsules',
    peso: '180 cápsulas',
    notas: 'Compatible Nespresso. Aluminio. Café intenso. 180 cápsulas',
  },

  {
    id: 'guilis_caps_nespresso_organico_compostable_120',
    nombre: 'Cápsulas Nespresso Compostables Café Orgánico 120uds',
    page: `${B}/capsulas-compostables-compatible-nespresso-cafe-organico-120-uds/`,
    fmt: 'capsules',
    peso: '120 cápsulas',
    isBio: true,
    notas: 'Compatible Nespresso. Compostables. Café orgánico. 120 cápsulas',
  },

  {
    id: 'guilis_caps_nespresso_organico_finca_180',
    nombre: 'Cápsulas Nespresso Aluminio Café Orgánico de Finca 180uds',
    page: `${B}/capsulas-compostable-compatible-nespresso-cafe-organico-de-finca-120-uds-cafes-guilis/`,
    fmt: 'capsules',
    peso: '180 cápsulas',
    isBio: true,
    notas:
      'Compatible Nespresso. Aluminio. Café orgánico de finca. Rainforest Alliance. 180 cápsulas',
  },

  // === CÁPSULAS NESPRESSO PRO ===
  {
    id: 'guilis_caps_nespresso_pro_natural_50',
    nombre: 'Cápsulas Nespresso PRO Tueste Natural 50uds',
    page: `${B}/capsulas-para-nespresso-pro-cafe-molido-de-tueste-natural-50-uds-biodegradables-y-de-alta-calidad/`,
    fmt: 'capsules',
    peso: '50 cápsulas',
    notas: 'Compatible Nespresso PRO. Tueste natural. 50 cápsulas',
  },

  {
    id: 'guilis_caps_nespresso_pro_descafeinado_50',
    nombre: 'Cápsulas Nespresso PRO Descafeinado 50uds',
    page: `${B}/capsulas-nespresso-pro-biodegradables-cafe-molido-descafeinado-50-uds-tueste-natural-de-alta-calidad/`,
    fmt: 'capsules',
    peso: '50 cápsulas',
    decaf: true,
    notas: 'Compatible Nespresso PRO. Descafeinado. Tueste natural. 50 cápsulas',
  },

  // === CÁPSULAS DOLCE GUSTO ===
  {
    id: 'guilis_caps_dolce_arabica_leche',
    nombre: 'Cápsulas Dolce Gusto Café Arábica con Leche',
    page: `${B}/capsulas-compatible-dolce-gusto-cafe-con-leche-arabica-cafes-guilis/`,
    fmt: 'capsules',
    peso: '64 cápsulas',
    variedad: '100% Arábica',
    notas: 'Compatible Dolce Gusto. Café arábica con leche. 64 cápsulas',
  },

  {
    id: 'guilis_caps_dolce_blend_intenso',
    nombre: 'Cápsulas Dolce Gusto Café Blend Intenso',
    page: `${B}/capsulas-compatibles-dolce-gusto-cafe-blend-intenso/`,
    fmt: 'capsules',
    peso: '64 cápsulas',
    notas: 'Compatible Dolce Gusto. Blend intenso. 64 cápsulas',
  },

  // === CÁPSULAS LAVAZZA BLUE ===
  {
    id: 'guilis_caps_blue_descafeinado_96',
    nombre: 'Cápsulas Blue Descafeinado 100% Arábica 96uds',
    page: `${B}/capsulas-compatibles-de-cafe-blue-descafeinado-100-arabica-96-uds-cafes-guilis/`,
    fmt: 'capsules',
    peso: '96 cápsulas',
    decaf: true,
    variedad: '100% Arábica',
    notas: 'Compatible Lavazza Blue. Descafeinado. 100% Arábica. 96 cápsulas',
  },

  {
    id: 'guilis_caps_blue_black_blend_96',
    nombre: 'Cápsulas Blue Black Blend 100% Arábica 96uds',
    page: `${B}/capsulas-cafe-compatible-blue-black-blend-arabica-96-uds-cafes-guilis/`,
    fmt: 'capsules',
    peso: '96 cápsulas',
    variedad: '100% Arábica',
    notas: 'Compatible Lavazza Blue. Black Blend. 100% Arábica. 96 cápsulas',
  },
];

const baseData = {
  marca: 'Cafés Guilis',
  pais: 'España',
  origen: '',
  variedad: '',
  tueste: 'natural',
  tipo: 'natural',
  coffeeCategory: 'commercial',
  category: 'commercial',
  fuente: 'cafesguilis.com',
  fuentePais: 'ES',
  isBio: false,
  decaf: false,
  notas: '',
  peso: '',
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
    `=== Cafés Guilis Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  if (DRY) {
    products.forEach((p, i) =>
      console.log(`  ${(i + 1).toString().padStart(2)}. ${p.id} ← ${p.nombre} [${p.fmt}]`)
    );
    return;
  }

  // Delete existing
  const snap = await db.collection('cafes').where('marca', '==', 'Cafés Guilis').get();
  console.log(`  Deleting ${snap.size} existing docs...`);
  for (const d of snap.docs) {
    await d.ref.delete();
    try {
      await bucket.file(`${PREFIX}/${d.id}.png`).delete();
    } catch {}
  }

  let ok = 0,
    noImg = 0;
  for (const p of products) {
    try {
      let photoUrl = '';
      const imgUrl = await getOgImage(p.page);
      if (imgUrl) {
        try {
          photoUrl = await processAndUpload(p.id, imgUrl);
        } catch (e) {
          console.log(`\n  WARN img ${p.id}: ${e.message}`);
          noImg++;
        }
      } else {
        noImg++;
        console.log(`\n  WARN no og:image for ${p.id}`);
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
        formato: p.fmt,
        ...(p.origen ? { origen: p.origen } : {}),
        ...(p.peso ? { peso: p.peso } : {}),
        ...(p.variedad ? { variedad: p.variedad } : {}),
        ...(p.notas ? { notas: p.notas } : {}),
        ...(p.decaf ? { decaf: true, tipo: 'descafeinado' } : {}),
        ...(p.isBio ? { isBio: true } : {}),
        ...photoFields,
      };
      await db.collection('cafes').doc(p.id).set(doc);
      ok++;
      process.stdout.write(`\r  Created ${ok}/${products.length}`);
    } catch (e) {
      console.log(`\n  ERROR ${p.id}: ${e.message}`);
    }
  }
  console.log(`\n\n=== Done: deleted ${snap.size} old, created ${ok} (${noImg} without photo) ===`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
