#!/usr/bin/env node
/**
 * Import Café Jurado from official website cafejurado.com
 * Grano + Molido + Cápsulas Nespresso + Dolce Gusto + Espresso Point + Ecológico
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

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchUrl(res.headers.location).then(resolve, reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks) }));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function getProductImage(pageUrl) {
  try {
    const { body } = await fetchUrl(pageUrl);
    const html = body.toString();
    const m = html.match(/https:\/\/cafejurado\.com\/\d+-large_default\/[^"'\s]+\.(jpg|png|webp)/i);
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

async function downloadAndProcess(url) {
  const { body, status } = await fetchUrl(url);
  if (status !== 200) throw new Error(`HTTP ${status}`);
  return sharp(body)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
}

async function upload(docId, buf) {
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(buf, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

const products = [
  // === GRANO ===
  {
    id: 'jurado_grano_excellence_arabica_1kg',
    nombre: 'Café en grano Excellence 100% Arábica 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: 'https://cafejurado.com/cafe/10-cafe-en-grano-100-arabica-8410894000390.html',
    notas: 'Excellence 100% Arábica',
    variedad: '100% Arábica',
  },
  {
    id: 'jurado_grano_cream_seleccion_1kg',
    nombre: 'Café en grano Cream Selección 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: 'https://cafejurado.com/cafe/11-cafe-en-grano-tueste-seleccion-8410894002042.html',
    notas: 'Cream Selección',
  },
  {
    id: 'jurado_grano_cream_especial_1kg',
    nombre: 'Café en grano Cream Especial 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: 'https://cafejurado.com/cafe/12-cafe-en-grano-cream-especial-8410894003056.html',
    notas: 'Cream Especial',
  },
  {
    id: 'jurado_grano_seleccion_250g',
    nombre: 'Café en grano Selección 250g',
    fmt: 'beans',
    peso: '250g',
    page: 'https://cafejurado.com/cafe/13-cafe-en-grano-tueste-seleccion-8410894000024.html',
    notas: 'Selección tueste natural',
  },
  {
    id: 'jurado_grano_excellence_intenso_1kg',
    nombre: 'Café en grano Excellence Intenso 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: 'https://cafejurado.com/cafe/14-cafe-en-grano-espresso-jurado-mas-8410894001885.html',
    notas: 'Excellence Intenso',
  },
  {
    id: 'jurado_grano_cream_descafeinado_1kg',
    nombre: 'Café en grano Cream Descafeinado 1kg',
    fmt: 'beans',
    peso: '1kg',
    page: 'https://cafejurado.com/cafe/225-cafe-en-grano-descafeinado-1kg-100-arabica-tueste-natural-8410894000475.html',
    notas: 'Cream Descafeinado',
    decaf: true,
    tipo: 'descafeinado',
  },

  // === MOLIDO ===
  {
    id: 'jurado_molido_arabica_250g',
    nombre: 'Café molido 100% Arábica 250g',
    fmt: 'ground',
    peso: '250g',
    page: 'https://cafejurado.com/cafe/16-cafe-molido-100-arabica-8410894000369.html',
    notas: '100% Arábica tueste natural',
    variedad: '100% Arábica',
  },
  {
    id: 'jurado_molido_descafeinado_250g',
    nombre: 'Café molido Descafeinado 250g',
    fmt: 'ground',
    peso: '250g',
    page: 'https://cafejurado.com/cafe/17-cafe-molido-descafeinado-8410894000659.html',
    notas: 'Descafeinado tueste natural',
    decaf: true,
    tipo: 'descafeinado',
  },
  {
    id: 'jurado_molido_seleccion_250g',
    nombre: 'Café molido Selección 250g',
    fmt: 'ground',
    peso: '250g',
    page: 'https://cafejurado.com/cafe/18-cafe-molido-tueste-seleccion-8410894000109.html',
    notas: 'Selección tueste natural',
  },
  {
    id: 'jurado_molido_espresso_casa_250g',
    nombre: 'Café molido Espresso Casa 250g',
    fmt: 'ground',
    peso: '250g',
    page: 'https://cafejurado.com/cafe/20-cafe-molido-espresso-casa-8410894001182.html',
    notas: 'Espresso Casa, molienda para cafetera express',
  },
  {
    id: 'jurado_molido_arabica_brasil_250g',
    nombre: 'Café molido 100% Arábica Origen Brasil 250g',
    fmt: 'ground',
    peso: '250g',
    page: 'https://cafejurado.com/cafe/41-cafe-molido-100-arabica-brasil-8410894002868.html',
    notas: 'Origen Brasil',
    origen: 'Brasil',
    variedad: '100% Arábica',
  },
  {
    id: 'jurado_molido_arabica_uganda_250g',
    nombre: 'Café molido 100% Arábica Origen Uganda 250g',
    fmt: 'ground',
    peso: '250g',
    page: 'https://cafejurado.com/cafe/42-cafe-molido-100-arabica-uganda-8410894002882.html',
    notas: 'Origen Uganda',
    origen: 'Uganda',
    variedad: '100% Arábica',
  },
  {
    id: 'jurado_molido_arabica_colombia_250g',
    nombre: 'Café molido 100% Arábica Origen Colombia 250g',
    fmt: 'ground',
    peso: '250g',
    page: 'https://cafejurado.com/cafe/43-cafe-molido-100-arabica-colombia-8410894002875.html',
    notas: 'Origen Colombia',
    origen: 'Colombia',
    variedad: '100% Arábica',
  },
  {
    id: 'jurado_molido_mezcla_250g',
    nombre: 'Café molido Mezcla 250g',
    fmt: 'ground',
    peso: '250g',
    page: 'https://cafejurado.com/cafe/44-cafe-molido-mezcla-8410894000116.html',
    notas: 'Mezcla',
    tipo: 'mezcla',
  },

  // === CÁPSULAS NESPRESSO ALUMINIO ===
  {
    id: 'jurado_caps_nesp_delisse',
    nombre: 'Cápsulas Nespresso Delisse Aluminio 20u',
    fmt: 'capsules',
    peso: '100g',
    page: 'https://cafejurado.com/inicio/259-capsulas-de-cafe-compatibles-delisse-aluminio-8410894002660.html',
    notas: 'Compatible Nespresso. Aluminio. Delisse',
  },
  {
    id: 'jurado_caps_nesp_descafeinado',
    nombre: 'Cápsulas Nespresso Descafeinado Aluminio 20u',
    fmt: 'capsules',
    peso: '100g',
    page: 'https://cafejurado.com/inicio/261-capsulas-de-cafe-compatibles-descafeinado-aluminio-8410894002677.html',
    notas: 'Compatible Nespresso. Aluminio. Descafeinado',
    decaf: true,
    tipo: 'descafeinado',
  },
  {
    id: 'jurado_caps_nesp_extracream',
    nombre: 'Cápsulas Nespresso Extracream Aluminio 20u',
    fmt: 'capsules',
    peso: '100g',
    page: 'https://cafejurado.com/inicio/262-capsulas-de-cafe-compatibles-extracream-aluminio-8410894002646.html',
    notas: 'Compatible Nespresso. Aluminio. Extracream',
  },
  {
    id: 'jurado_caps_nesp_stimola',
    nombre: 'Cápsulas Nespresso Stimola Aluminio 20u',
    fmt: 'capsules',
    peso: '100g',
    page: 'https://cafejurado.com/inicio/263-capsulas-de-cafe-compatibles-stimola-aluminio-8410894002653.html',
    notas: 'Compatible Nespresso. Aluminio. Stimola',
  },
  {
    id: 'jurado_caps_nesp_ristretto',
    nombre: 'Cápsulas Nespresso Ristretto Aluminio 20u',
    fmt: 'capsules',
    peso: '100g',
    page: 'https://cafejurado.com/inicio/264-capsulas-de-cafe-compatibles-ristretto-aluminio-8410894002646.html',
    notas: 'Compatible Nespresso. Aluminio. Ristretto',
  },

  // === CÁPSULAS DOLCE GUSTO ===
  {
    id: 'jurado_caps_dg_extra_intenso',
    nombre: 'Cápsulas Dolce Gusto Extra Intenso',
    fmt: 'capsules',
    peso: '',
    page: 'https://cafejurado.com/inicio/247-capsulas-de-cafe-compatibles-dolce-gusto-extra-intenso-8410894006033.html',
    notas: 'Compatible Dolce Gusto. Extra Intenso',
  },
  {
    id: 'jurado_caps_dg_intenso',
    nombre: 'Cápsulas Dolce Gusto Intenso',
    fmt: 'capsules',
    peso: '112g',
    page: 'https://cafejurado.com/inicio/248-capsulas-de-cafe-compatibles-dolce-gusto-intenso-8410894006040.html',
    notas: 'Compatible Dolce Gusto. Intenso',
  },
  {
    id: 'jurado_caps_dg_cortado',
    nombre: 'Cápsulas Dolce Gusto Cortado',
    fmt: 'capsules',
    peso: '',
    page: 'https://cafejurado.com/inicio/250-capsulas-de-cafe-compatibles-dolce-gusto-cortado-8410894006064.html',
    notas: 'Compatible Dolce Gusto. Cortado',
  },
  {
    id: 'jurado_caps_dg_cafe_con_leche',
    nombre: 'Cápsulas Dolce Gusto Café con Leche',
    fmt: 'capsules',
    peso: '160g',
    page: 'https://cafejurado.com/inicio/252-capsulas-de-cafe-con-leche-compatibles-dolce-gusto-8410894006088.html',
    notas: 'Compatible Dolce Gusto. Café con Leche',
  },

  // === CÁPSULAS ESPRESSO POINT ===
  {
    id: 'jurado_caps_ep_descafeinado',
    nombre: 'Cápsulas Espresso Point Descafeinado 100u',
    fmt: 'capsules',
    peso: '700g',
    page: 'https://cafejurado.com/inicio/240-capsulas-espresso-point-descafeinado.html',
    notas: 'Compatible Espresso Point. Descafeinado',
    decaf: true,
    tipo: 'descafeinado',
  },

  // === ECOLÓGICO ===
  {
    id: 'jurado_molido_ecologico_250g',
    nombre: 'Café molido Ecológico 100% Arábica 250g',
    fmt: 'ground',
    peso: '250g',
    page: 'https://cafejurado.com/inicio/19-cafe-molido-ecologico-estuche-ecologico-8410894001823.html',
    notas: 'Ecológico, 100% Arábica, tueste natural',
    isBio: true,
    variedad: '100% Arábica',
  },
];

const base = {
  marca: 'Jurado',
  pais: 'España',
  origen: '',
  variedad: '',
  tueste: 'natural',
  tipo: 'natural',
  coffeeCategory: 'premium',
  category: 'specialty',
  fuente: 'cafejurado.com',
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
    `=== Import Café Jurado ${DRY ? '[DRY RUN]' : ''} === (${products.length} products)\n`
  );

  if (DRY) {
    products.forEach((p, i) =>
      console.log(`  ${(i + 1).toString().padStart(2)}. ${p.id} → ${p.nombre}`)
    );
    return;
  }

  // Delete existing
  const snap = await db.collection('cafes').where('marca', '==', 'Jurado').get();
  console.log(`  Deleting ${snap.size} existing Jurado docs...`);
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
      const imgUrl = p.page ? await getProductImage(p.page) : null;
      if (imgUrl) {
        try {
          const buf = await downloadAndProcess(imgUrl);
          photoUrl = await upload(p.id, buf);
        } catch (e) {
          console.log(`  WARN img ${p.id}: ${e.message}`);
          noImg++;
        }
      } else {
        noImg++;
      }

      const doc = {
        ...base,
        nombre: p.nombre,
        formato: p.fmt,
        peso: p.peso || '',
        ...(p.notas ? { notas: p.notas } : {}),
        ...(p.decaf ? { decaf: true } : {}),
        ...(p.tipo ? { tipo: p.tipo } : {}),
        ...(p.variedad ? { variedad: p.variedad } : {}),
        ...(p.origen ? { origen: p.origen } : {}),
        ...(p.isBio ? { isBio: true } : {}),
        ...(photoUrl
          ? {
              fotoUrl: photoUrl,
              foto: photoUrl,
              imageUrl: photoUrl,
              officialPhoto: photoUrl,
              bestPhoto: photoUrl,
              imagenUrl: photoUrl,
              photos: { selected: photoUrl, original: photoUrl, bgRemoved: photoUrl },
            }
          : {}),
      };
      await db.collection('cafes').doc(p.id).set(doc);
      ok++;
      process.stdout.write(`\r  Created ${ok}/${products.length}`);
    } catch (e) {
      console.log(`\n  ERROR ${p.id}: ${e.message}`);
    }
  }
  console.log(`\n\n=== Done: deleted ${snap.size}, created ${ok} (${noImg} without photo) ===`);
}

main().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
