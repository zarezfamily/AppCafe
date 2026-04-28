#!/usr/bin/env node
/**
 * _import_milka_pelican_nespressopro.js – April 2026
 * NEW brands + expanded Nespresso Pro lineup:
 *   - Milka (1 Senseo cacao pad) – brand new
 *   - Pelican Rouge (1 NPC) – brand new
 *   - Nespresso (21 NPC) – expand from 1 to 22
 * Total: 23 products
 */

const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (admin.apps.length === 0)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

const ALL = [
  // ═══ Milka – Senseo (1) ═══
  {
    id: 'milka_senseo_cacao_8',
    nombre: 'Milka Cacao 8 monodosis para Senseo',
    marca: 'Milka',
    sistema: 'Senseo',
    capsulas: 8,
    precio: 2.85,
    sabor: 'Chocolate',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/milka-senseo.html',
  },

  // ═══ Pelican Rouge – Nespresso Pro (1) ═══
  {
    id: 'pelicanrouge_npc_lungo_nobile_50',
    nombre: 'Pelican Rouge Lungo Nobile 50 cápsulas para Nespresso Pro',
    marca: 'Pelican Rouge',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 15.39,
    sabor: 'Chocolate con leche',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/lungo-nobile-pelican-rouge-nes-pro.html',
  },

  // ═══ Nespresso – Nespresso Pro (21) ═══
  {
    id: 'nespresso_npc_espresso_brazil_50',
    nombre: 'Nespresso Espresso Brazil Origin 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 27.19,
    origen: 'Brasil',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/espresso-brazil-origin-nes-pro.html',
  },
  {
    id: 'nespresso_npc_intenso_50',
    nombre: 'Nespresso Intenso 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 26.49,
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/intenso-nes-pro.html',
  },
  {
    id: 'nespresso_npc_ristretto_50',
    nombre: 'Nespresso Ristretto 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 27.19,
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/ristretto-nes-pro.html',
  },
  {
    id: 'nespresso_npc_bianco_delicato_50',
    nombre: 'Nespresso Bianco Delicato 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 29.69,
    sabor: 'Leche',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/bianco-delicato-nes-pro.html',
  },
  {
    id: 'nespresso_npc_finezzo_50',
    nombre: 'Nespresso Finezzo 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 27.09,
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/finezzo-nes-pro.html',
  },
  {
    id: 'nespresso_npc_ristretto_intenso_50',
    nombre: 'Nespresso Ristretto Intenso 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 25.09,
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/ristretto-intenso-nes-pro.html',
  },
  {
    id: 'nespresso_npc_bianco_intenso_50',
    nombre: 'Nespresso Bianco Intenso 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 26.69,
    sabor: 'Leche',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/bianco-intenso-nes-pro.html',
  },
  {
    id: 'nespresso_npc_decaffeinato_50',
    nombre: 'Nespresso Decaffeinato 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 27.09,
    descafeinado: true,
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/descafeinado-espresso-nes-pro.html',
  },
  {
    id: 'nespresso_npc_forte_50',
    nombre: 'Nespresso Forte 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 26.49,
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/espresso-forte-nes-pro.html',
  },
  {
    id: 'nespresso_npc_caffe_nocciola_50',
    nombre: 'Nespresso Caffè Nocciola 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 30.19,
    sabor: 'Avellana',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/caffe-nocciola-nespresso-pro.html',
  },
  {
    id: 'nespresso_npc_lungo_guatemala_50',
    nombre: 'Nespresso Lungo Guatemala Origin 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 29.89,
    origen: 'Guatemala',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/lungo-guatemala-origin-nes-pro.html',
  },
  {
    id: 'nespresso_npc_indonesia_50',
    nombre: 'Nespresso Indonesia 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 32.59,
    origen: 'Indonesia',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/indonesia-nespresso-professional-nes-pro.html',
  },
  {
    id: 'nespresso_npc_ristretto_india_50',
    nombre: 'Nespresso Ristretto India Origin 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 25.89,
    origen: 'India',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/ristretto-india-origin-nes-pro.html',
  },
  {
    id: 'nespresso_npc_vainilla_50',
    nombre: 'Nespresso Café Vainilla 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 27.09,
    sabor: 'Vainilla',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/espresso-vainilla-nes-pro.html',
  },
  {
    id: 'nespresso_npc_colombia_organic_50',
    nombre: 'Nespresso Colombia Organic 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 30.89,
    origen: 'Colombia',
    organico: true,
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/colombia-organic-nespresso-pro.html',
  },
  {
    id: 'nespresso_npc_congo_organic_50',
    nombre: 'Nespresso Congo Organic 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 32.79,
    origen: 'Congo',
    organico: true,
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/congo-organic-nespresso-pro.html',
  },
  {
    id: 'nespresso_npc_leggero_50',
    nombre: 'Nespresso Leggero 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 26.09,
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/espresso-leggero-nes-pro.html',
  },
  {
    id: 'nespresso_npc_peru_organic_50',
    nombre: 'Nespresso Peru Organic 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 32.09,
    origen: 'Perú',
    organico: true,
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/peru-organic-nespresso-pro.html',
  },
  {
    id: 'nespresso_npc_amaretti_50',
    nombre: 'Nespresso Amaretti 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 30.29,
    sabor: 'Amaretti',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/amaretti-nespresso-nespresso-pro-50.html',
  },
  {
    id: 'nespresso_npc_caramelo_50',
    nombre: 'Nespresso Café Caramelo 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 30.19,
    sabor: 'Caramelo',
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/espresso-caramelo-nes-pro.html',
  },
  {
    id: 'nespresso_npc_forte_extra_50',
    nombre: 'Nespresso Forte Extra 50 cápsulas para Nespresso Pro',
    marca: 'Nespresso',
    sistema: 'Nespresso Pro',
    capsulas: 50,
    precio: 24.59,
    tipo: 'capsula',
    tipoProducto: 'capsulas',
    url: 'https://kaffek.es/forte-extra-nespresso-professional-nes-pro.html',
  },
];

function httpGet(url, wantBuf = false) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,image/webp,*/*;q=0.8',
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

async function discoverImageUrl(productUrl) {
  try {
    const { data: html, status } = await httpGet(productUrl);
    if (status !== 200) return null;
    // Try standard -1201.webp first
    let m = html.match(
      /https:\/\/kaffekapslen\.media\/media\/catalog\/product\/cache\/[^"'\s]+?-1201\.webp/
    );
    if (m) return m[0];
    // Fallback: -0001.jpg (Pelican Rouge style)
    m = html.match(
      /https:\/\/kaffekapslen\.media\/media\/catalog\/product\/cache\/[^"'\s]+?-0001\.jpg/
    );
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

(async () => {
  console.log(
    `\n=== Importing ${ALL.length} products (Milka + Pelican Rouge + Nespresso Pro) ===\n`
  );
  let created = 0,
    skipped = 0,
    photos = 0,
    errors = 0;

  for (const p of ALL) {
    const existing = await db.collection('cafes').doc(p.id).get();
    if (existing.exists) {
      console.log(`SKIP: ${p.id}`);
      skipped++;
      continue;
    }

    console.log(`CREATE: ${p.id}`);
    let imgUrl = null;
    try {
      imgUrl = await discoverImageUrl(p.url);
      if (imgUrl) console.log(`  Img: ...${imgUrl.slice(-50)}`);
      else console.log('  No image found');
    } catch (e) {
      console.log(`  Img err: ${e.message}`);
    }

    const data = {
      nombre: p.nombre,
      marca: p.marca,
      roaster: p.marca,
      tipo: p.tipo,
      tipoProducto: p.tipoProducto,
      formato: `${p.capsulas} cápsulas`,
      tamano: `${p.capsulas} cápsulas`,
      capsulas: p.capsulas,
      precio: p.precio,
      sistema: p.sistema,
      compatibilidad: p.sistema,
      fuente: 'KaffeK',
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
    if (p.sabor) data.sabor = p.sabor;
    if (p.origen) data.origen = p.origen;
    if (p.descafeinado) data.descafeinado = true;
    if (p.organico) data.organico = true;

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
      console.log(`  ${p.nombre} → ${p.precio}€`);
    } catch (e) {
      console.log(`  DB ERR: ${e.message}`);
      errors++;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Created: ${created} | Skipped: ${skipped} | Photos: ${photos} | Errors: ${errors}`);
  process.exit(0);
})();
