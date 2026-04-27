#!/usr/bin/env node
/**
 * Import/Update Cafés El Magnífico from cafeselmagnifico.com
 * 17 products: 12 single origins + 3 blends + 2 capsules Nespresso
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
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
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

const B = 'https://cafeselmagnifico.com/producto';

const products = [
  // === SINGLE ORIGINS ===
  {
    id: 'magnifico_colombia_casa_negra',
    nombre: 'Colombia Casa Negra',
    page: `${B}/colombia-casa-negra/`,
    origen: 'Colombia',
    variedad: 'Caturra y Castillo',
    proceso: 'Lavado',
    altitud: '1.350 - 1.400 msnm',
    region: 'Quindio',
    finca: 'Casa Negra',
    productor: 'Jairo Arcila',
    notas: 'Dulce, nuez moscada y caramelo',
  },

  {
    id: 'magnifico_colombia_fernando_chazoi',
    nombre: 'Colombia Fernando Chazoi',
    page: `${B}/colombia-fernando-chazoi/`,
    origen: 'Colombia',
    variedad: 'Castillo',
    proceso: 'Honey',
    altitud: '2.100 msnm',
    region: 'Nariño',
    productor: 'Fernando Chazoi',
    notas: 'Chocolate, avellanas y banana',
  },

  {
    id: 'magnifico_costa_rica_brumas_zurqui',
    nombre: 'Costa Rica Brumas del Zurquí',
    page: `${B}/costa-rica-brumas-del-zurqui/`,
    origen: 'Costa Rica',
    variedad: 'Catuaí',
    proceso: 'Honey',
    altitud: '1.400 - 1.500 msnm',
    region: 'Valle Oeste, Heredia',
    finca: 'El Centro',
    productor: 'Juan Ramón Alvarado y Natalia Montero',
    notas: 'Dulce, té negro y vainilla',
  },

  {
    id: 'magnifico_el_salvador_los_pirineos',
    nombre: 'El Salvador Los Pirineos',
    page: `${B}/el-salvador-los-pirineos/`,
    origen: 'El Salvador',
    variedad: 'Pacamara',
    proceso: 'Natural',
    altitud: '1.600 msnm',
    region: 'Tecapa – Chinameca',
    finca: 'Los Pirineos',
    productor: 'Diego Baraona',
    notas: 'Afrutado, dulce de leche y moras',
  },

  {
    id: 'magnifico_el_salvador_miramar',
    nombre: 'El Salvador Miramar',
    page: `${B}/el-salvador-miramar/`,
    origen: 'El Salvador',
    variedad: 'Bourbon',
    proceso: 'Honey',
    altitud: '1.650 - 1.700 msnm',
    region: 'Tecapa, Chinameca',
    finca: 'Miramar',
    productor: 'Fernando Felipe Alfaro Castañeda',
    notas: 'Dulce, dátil, castaña y membrillo. 5º puesto COE 2025',
  },

  {
    id: 'magnifico_etiopia_shale',
    nombre: 'Etiopía Shale',
    page: `${B}/etiopia-shale/`,
    origen: 'Etiopía',
    variedad: 'Variedades endémicas',
    proceso: 'Lavado',
    altitud: '2.300 - 2.350 msnm',
    region: 'Yirgacheffe',
    notas: 'Afrutado, vainilla y jazmín',
  },

  {
    id: 'magnifico_etiopia_bensa',
    nombre: 'Etiopía Bensa',
    page: `${B}/etiopia-bensa/`,
    origen: 'Etiopía',
    variedad: 'Walecho y Michicho',
    proceso: 'Lavado',
    altitud: '1.800 - 2.100 msnm',
    region: 'Bensa (Sidama)',
    notas: 'Frutos secos, praline y azahar',
  },

  {
    id: 'magnifico_honduras_terrerito',
    nombre: 'Honduras El Terrerito',
    page: `${B}/honduras-terrerito/`,
    origen: 'Honduras',
    variedad: 'Parainema y Obatá',
    proceso: 'Honey',
    altitud: '1.250 - 1.350 msnm',
    region: 'Copán',
    finca: 'El Terrerito',
    productor: 'Adelmo López',
    notas: 'Afrutado, azúcar moreno y granada',
  },

  {
    id: 'magnifico_mexico_ordonez_mazariegos',
    nombre: 'México Ordóñez Mazariegos',
    page: `${B}/mexico-ordonez-mazariegos/`,
    origen: 'México',
    variedad: 'Catuaí, San Ramon y Villa Sarchí',
    proceso: 'Lavado',
    altitud: '1.456 - 1.600 msnm',
    region: 'Chiapas',
    productor: 'Rony Ordóñez Mazariegos',
    notas: 'Dulce, chocolate con leche y vainilla',
  },

  {
    id: 'magnifico_panama_carmen_estate',
    nombre: 'Panamá Carmen Estate',
    page: `${B}/panama-carmen-state/`,
    origen: 'Panamá',
    variedad: 'Caturra',
    proceso: 'Natural',
    altitud: '1.800 msnm',
    region: 'Chiquirí',
    finca: 'Carmen Estate',
    productor: 'Carlos Aguilera',
    notas: 'Dulce, caramelo y mandarina',
  },

  // === DESCAFEINADO ===
  {
    id: 'magnifico_descafeinado_colombia',
    nombre: 'Descafeinado Colombia',
    page: `${B}/31818/`,
    origen: 'Colombia',
    variedad: 'Caturra, Castillo y Colombia',
    proceso: 'Sugar Cane (descafeinado)',
    altitud: '1.600 - 1.900 msnm',
    region: 'Huila',
    decaf: true,
    notas: 'Dulce, especias dulces y chocolate negro',
  },

  // === BLENDS ===
  {
    id: 'magnifico_blend_superautomatica',
    nombre: 'Superautomática',
    page: `${B}/blend-superautomaticas/`,
    isBlend: true,
    notas: 'Blend para superautomáticas. Dulce, chocolate, frutos secos',
  },

  {
    id: 'magnifico_blend_grunyi',
    nombre: 'Grunyí',
    page: `${B}/grunyi/`,
    isBlend: true,
    notas: 'Blend Grunyí. Afrutado, panela y especias dulces',
  },

  {
    id: 'magnifico_blend_virtuoso',
    nombre: 'Virtuoso',
    page: `${B}/cafe-virtuoso/`,
    isBlend: true,
    notas: 'Blend Virtuoso. Chocolate, dulce y frutos secos',
  },

  {
    id: 'magnifico_blend_argenteria',
    nombre: 'Argentería',
    page: `${B}/argenteria/`,
    isBlend: true,
    notas:
      'Blend Argentería. Frutos secos, chocolate y especias. Tueste medio/oscuro. Espresso e italiana',
  },

  // === CÁPSULAS NESPRESSO ===
  {
    id: 'magnifico_caps_descafeinado_colombia',
    nombre: 'Cápsulas Descafeinado Colombia',
    page: `${B}/capsulas-descafeinado-colombia/`,
    fmt: 'capsules',
    decaf: true,
    origen: 'Colombia',
    notas: 'Compatible Nespresso. 20 cápsulas. Descafeinado Colombia',
  },

  {
    id: 'magnifico_caps_blend_virtuoso',
    nombre: 'Cápsulas Blend Virtuoso',
    page: `${B}/capsulas-blend-virtuoso/`,
    fmt: 'capsules',
    notas: 'Compatible Nespresso. 20 cápsulas compostables. Blend Virtuoso',
  },
];

const baseData = {
  marca: 'Cafés El Magnífico',
  pais: 'España',
  origen: '',
  variedad: '',
  tueste: 'medio',
  tipo: 'natural',
  coffeeCategory: 'specialty',
  category: 'specialty',
  fuente: 'cafeselmagnifico.com',
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
    `=== Cafés El Magnífico Import ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  if (DRY) {
    products.forEach((p, i) =>
      console.log(
        `  ${(i + 1).toString().padStart(2)}. ${p.id} ← ${p.nombre} [${p.fmt || 'grano'}]`
      )
    );
    return;
  }

  // Delete all existing
  const snap = await db.collection('cafes').where('marca', '==', 'Cafés El Magnífico').get();
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
        ...(p.variedad ? { variedad: p.variedad } : {}),
        ...(p.proceso ? { proceso: p.proceso } : {}),
        ...(p.altitud ? { altitud: p.altitud } : {}),
        ...(p.region ? { region: p.region } : {}),
        ...(p.finca ? { finca: p.finca } : {}),
        ...(p.productor ? { productor: p.productor } : {}),
        ...(p.notas ? { notas: p.notas } : {}),
        ...(p.decaf ? { decaf: true, tipo: 'descafeinado' } : {}),
        ...(p.isBlend ? { coffeeCategory: 'blend', category: 'blend' } : {}),
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
