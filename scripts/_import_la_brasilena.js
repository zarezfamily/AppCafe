#!/usr/bin/env node
/**
 * Import/Update Cafés La Brasileña from cafeslabrasilena.es
 * 47 SKUs → 18 unique products (dedup sizes, each blend in 250g as reference)
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

const B = 'https://www.cafeslabrasilena.es/producto';

const products = [
  // === ORÍGENES ÚNICOS (grano/molido, disponible en 250g/500g/1kg) ===
  {
    id: 'brasilena_blend_arabicas',
    nombre: 'Blend Arábicas',
    page: `${B}/cafe-blend-arabicas-250g/`,
    notas: 'Blend 100% Arábica. Disponible en 250g, 500g, 1kg. Grano o molido',
  },

  {
    id: 'brasilena_costa_rica',
    nombre: 'Costa Rica',
    page: `${B}/cafe-costa-rica-250g/`,
    origen: 'Costa Rica',
    notas: 'Origen Costa Rica. Disponible en 250g, 500g, 1kg. Grano o molido',
  },

  {
    id: 'brasilena_colombia_narino_el_tambo',
    nombre: 'Colombia Nariño El Tambo',
    page: `${B}/cafe-colombia-narino-el-tambo-250g/`,
    origen: 'Colombia',
    region: 'Nariño',
    notas: 'Origen Colombia Nariño, El Tambo. Disponible en 250g, 500g, 1kg. Grano o molido',
  },

  {
    id: 'brasilena_kenya_aa',
    nombre: 'Kenya AA',
    page: `${B}/cafe-kenya-aa-250g/`,
    origen: 'Kenia',
    notas: 'Origen Kenya AA. Disponible en 250g, 500g, 1kg. Grano o molido',
  },

  {
    id: 'brasilena_etiopia_sidamo',
    nombre: 'Etiopía Sidamo',
    page: `${B}/cafe-etiopia-sidamo-250g/`,
    origen: 'Etiopía',
    region: 'Sidamo',
    notas: 'Origen Etiopía Sidamo. Disponible en 250g, 500g, 1kg. Grano o molido',
  },

  {
    id: 'brasilena_colombia_ecologico',
    nombre: 'Colombia Ecológico',
    page: `${B}/cafe-colombia-ecologico-250g/`,
    origen: 'Colombia',
    isBio: true,
    notas: 'Origen Colombia. Ecológico. Disponible en 250g, 500g, 1kg. Grano o molido',
  },

  {
    id: 'brasilena_certificado_fairtrade',
    nombre: 'Certificado Fairtrade',
    page: `${B}/cafe-certificado-fairtrade-250g/`,
    isBio: true,
    notas: 'Certificado Fairtrade. Comercio justo. Disponible en 250g, 500g, 1kg. Grano o molido',
  },

  // === EDICIONES LIMITADAS ===
  {
    id: 'brasilena_indonesia_java',
    nombre: 'Indonesia Java [Edición Limitada]',
    page: `${B}/cafe-indonesia-java-edicion-limitada-250g/`,
    origen: 'Indonesia',
    notas: 'Edición limitada. Indonesia Java. 250g. Grano o molido',
  },

  {
    id: 'brasilena_papua_nueva_guinea',
    nombre: 'Papua Nueva Guinea [Edición Limitada]',
    page: `${B}/cafe-papua-nueva-guinea-edicion-limitada-250g/`,
    origen: 'Papúa Nueva Guinea',
    notas: 'Edición limitada. Papua Nueva Guinea. 250g. Grano o molido',
  },

  {
    id: 'brasilena_tanzania',
    nombre: 'Tanzania [Edición Limitada]',
    page: `${B}/cafe-tanzania-edicion-limitada-250g/`,
    origen: 'Tanzania',
    notas: 'Edición limitada. Tanzania. Disponible en 250g, 500g, 1kg. Grano o molido',
  },

  // === DESCAFEINADOS ===
  {
    id: 'brasilena_blend_arabicas_descafeinado',
    nombre: 'Blend Arábicas Descafeinado',
    page: `${B}/cafe-blend-arabicas-descafeinado-250g/`,
    decaf: true,
    notas: 'Blend 100% Arábica. Descafeinado. Disponible en 250g, 500g, 1kg. Grano o molido',
  },

  {
    id: 'brasilena_descafeinado_swiss_water',
    nombre: 'Descafeinado Swiss Water',
    page: `${B}/cafe-descafeinado-swiss-water-250g/`,
    decaf: true,
    notas:
      'Descafeinado Swiss Water. Proceso al agua. Disponible en 250g, 500g, 1kg. Grano o molido',
  },

  // === CÁPSULAS NESPRESSO ===
  {
    id: 'brasilena_caps_blend_arabicas_5_alturas',
    nombre: 'Cápsulas Blend Arábicas 5 Alturas 10uds',
    page: `${B}/capsulas-cafe-blend-arabicas-5-alturas-compostables/`,
    fmt: 'capsules',
    notas: 'Compatible Nespresso. Compostables. Blend Arábicas 5 Alturas. 10 cápsulas',
  },

  {
    id: 'brasilena_caps_forza_100',
    nombre: 'Cápsulas Forza 100uds',
    page: `${B}/cafe-forza-caja-100-capsulas/`,
    fmt: 'capsules',
    notas: 'Compatible Nespresso. Forza. Caja 100 cápsulas',
  },

  {
    id: 'brasilena_caps_descafeinado_100',
    nombre: 'Cápsulas Descafeinado 100uds',
    page: `${B}/descafeinado-caja-100-capsulas/`,
    fmt: 'capsules',
    decaf: true,
    notas: 'Compatible Nespresso. Descafeinado. Caja 100 cápsulas',
  },

  {
    id: 'brasilena_caps_swiss_water_descafeinado',
    nombre: 'Cápsulas Swiss Water Descafeinado 10uds',
    page: `${B}/capsulas-swiss-water/`,
    fmt: 'capsules',
    decaf: true,
    notas: 'Compatible Nespresso. Compostables. Swiss Water Descafeinado. 10 cápsulas',
  },

  // === SOLUBLES ===
  {
    id: 'brasilena_soluble_natural',
    nombre: 'Soluble Natural 10uds',
    page: `${B}/cafe-soluble-natural-10-unds/`,
    fmt: 'soluble',
    notas: 'Café soluble natural. 10 sobres',
  },

  {
    id: 'brasilena_soluble_descafeinado',
    nombre: 'Soluble Natural Descafeinado 10uds',
    page: `${B}/cafe-soluble-natural-descafeinado-10-unds/`,
    fmt: 'soluble',
    decaf: true,
    notas: 'Café soluble natural descafeinado. 10 sobres',
  },
];

const baseData = {
  marca: 'Cafés La Brasileña',
  pais: 'España',
  origen: '',
  variedad: '100% Arábica',
  tueste: 'natural',
  tipo: 'natural',
  coffeeCategory: 'specialty',
  category: 'specialty',
  fuente: 'cafeslabrasilena.es',
  fuentePais: 'ES',
  isBio: false,
  decaf: false,
  notas: '',
  peso: '250g',
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
    `=== Cafés La Brasileña Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  if (DRY) {
    products.forEach((p, i) =>
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${p.id} ← ${p.nombre} [${p.fmt || 'grano'}]`
      )
    );
    return;
  }

  // Delete existing
  const snap = await db.collection('cafes').where('marca', '==', 'Cafés La Brasileña').get();
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

      const formato = p.fmt || 'grano';
      const doc = {
        ...baseData,
        nombre: p.nombre,
        formato,
        ...(p.origen ? { origen: p.origen } : {}),
        ...(p.region ? { region: p.region } : {}),
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
