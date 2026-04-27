/**
 * Update Cafés Climent catalog (2026-04-27)
 * Source: cafescliment.com/tienda-2/
 * Existing: 2 Mercadona products (mercadona_11740, mercadona_11745)
 * New: 15 products from web
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

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
    const proto = url.startsWith('https') ? https : http;
    proto
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

async function uploadPhoto(docId, imageUrl) {
  const buf = await fetchBuf(imageUrl);
  if (buf.length < 500) {
    console.log('  SKIP photo (too small):', docId);
    return null;
  }
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

const now = new Date().toISOString();
const BASE = 'https://www.cafescliment.com';

const PRODUCTS = [
  // === GRANO ===
  {
    id: 'climent_natural_grano_1kg',
    nombre: 'Natural en Grano',
    tipo: 'grano',
    formato: 'beans',
    format: 'beans',
    cantidad: 1000,
    tamano: '1kg',
    precio: 20.0,
    decaf: false,
    photo: `${BASE}/wp-content/uploads/2025/04/Cafe_grano_normal_frontal.jpg`,
    url: `${BASE}/producto/cafe-natural-en-grano-1-kg/`,
    desc: 'Café en grano natural 1kg. Mezcla arábica y africanos. Tueste artesanal por separado. Notas afrutadas, florales y suaves.',
  },
  {
    id: 'climent_natural_grano_500g',
    nombre: 'Natural en Grano',
    tipo: 'grano',
    formato: 'beans',
    format: 'beans',
    cantidad: 500,
    tamano: '500g',
    precio: 11.0,
    decaf: false,
    photo: `${BASE}/wp-content/uploads/2025/04/Cafe_grano_500_frontal.jpg`,
    url: `${BASE}/producto/cafe-natural-en-grano-500-gr/`,
    desc: 'Café en grano natural 500g. Tueste diario, aroma intenso y sabor equilibrado.',
  },
  {
    id: 'climent_natural_grano_250g',
    nombre: 'Natural en Grano',
    tipo: 'grano',
    formato: 'beans',
    format: 'beans',
    cantidad: 250,
    tamano: '250g',
    precio: 3.8,
    decaf: false,
    photo: null,
    url: `${BASE}/producto/cafe-natural-grano-250-gr/`,
    desc: 'Café en grano natural 250g. Mezcla arábica y africanos, tueste artesanal.',
  },
  {
    id: 'climent_suprema_grano_1kg',
    nombre: 'Calidad Suprema en Grano',
    tipo: 'grano',
    formato: 'beans',
    format: 'beans',
    cantidad: 1000,
    tamano: '1kg',
    precio: 22.0,
    decaf: false,
    photo: `${BASE}/wp-content/uploads/2025/04/Cafe_grano_suprema_frontal.jpg`,
    url: `${BASE}/producto/cafe-natural-en-grano-calidad-suprema-1-kg/`,
    desc: 'Café en grano 100% arábica Calidad Suprema 1kg. Granos premium, tostados con calma y oficio.',
  },
  {
    id: 'climent_descafeinado_grano_1kg',
    nombre: 'Descafeinado en Grano',
    tipo: 'grano',
    formato: 'beans',
    format: 'beans',
    cantidad: 1000,
    tamano: '1kg',
    precio: 22.0,
    decaf: true,
    photo: `${BASE}/wp-content/uploads/2025/04/Cafe_grano_descafeinado_frontal.jpg`,
    url: `${BASE}/producto/cafe-descafeinado-grano-1-kg/`,
    desc: 'Café en grano descafeinado 1kg. Tueste natural artesanal. Sin disolventes agresivos.',
  },
  {
    id: 'climent_descafeinado_grano_250g',
    nombre: 'Descafeinado en Grano',
    tipo: 'grano',
    formato: 'beans',
    format: 'beans',
    cantidad: 250,
    tamano: '250g',
    precio: 4.1,
    decaf: true,
    photo: `${BASE}/wp-content/uploads/2024/10/cafe-descafeinado-climent-personalizado-1.jpg`,
    url: `${BASE}/producto/cafe-descafeinado-grano-250-gr/`,
    desc: 'Café en grano descafeinado 250g. Perfil suave, equilibrado y con cuerpo medio.',
  },
  // === MOLIDO ===
  {
    id: 'climent_mezcla_molido_250g',
    nombre: 'Mezcla Molido',
    tipo: 'molido',
    formato: 'ground',
    format: 'ground',
    cantidad: 250,
    tamano: '250g',
    precio: 3.9,
    decaf: false,
    photo: null,
    url: `${BASE}/producto/cafe-mezcla-molido-250g/`,
    desc: 'Café molido mezcla (natural + torrefacto) 250g. Sabor intenso valenciano tradicional.',
  },
  {
    id: 'climent_natural_molido_expreso_250g',
    nombre: 'Natural Molido Expreso',
    tipo: 'molido',
    formato: 'ground',
    format: 'ground',
    cantidad: 250,
    tamano: '250g',
    precio: 3.5,
    decaf: false,
    photo: null,
    url: `${BASE}/producto/cafe-natural-molido-250-gr-expreso/`,
    desc: 'Café molido natural molienda espresso 250g. Tueste artesanal.',
  },
  // === SOLUBLE ===
  {
    id: 'climent_descafeinado_soluble_100u',
    nombre: 'Descafeinado Soluble',
    tipo: 'soluble',
    formato: 'instant',
    format: 'instant',
    cantidad: 100,
    tamano: '100 sobres',
    precio: 12.1,
    decaf: true,
    photo: null,
    url: `${BASE}/producto/cafe-descafeinado-soluble-100u/`,
    desc: 'Café soluble descafeinado 100 sobres individuales.',
  },
  // === CÁPSULAS NESPRESSO ===
  {
    id: 'climent_natural_nespresso_10',
    nombre: 'Natural Cápsulas Nespresso',
    tipo: 'capsulas',
    formato: 'capsules',
    format: 'capsules',
    cantidad: 10,
    tamano: '10 cápsulas',
    precio: 3.8,
    decaf: false,
    photo: null,
    url: `${BASE}/producto/capsulas-cafe-climent-natural-compatibles-nespresso-10-uds/`,
    desc: 'Cápsulas compatibles Nespresso Natural 10 uds.',
  },
  {
    id: 'climent_intenso_nespresso_10',
    nombre: 'Intenso Cápsulas Nespresso',
    tipo: 'capsulas',
    formato: 'capsules',
    format: 'capsules',
    cantidad: 10,
    tamano: '10 cápsulas',
    precio: 4.0,
    decaf: false,
    photo: null,
    url: `${BASE}/producto/capsulas-cafe-climent-intenso-compatibles-nespresso-10-uds/`,
    desc: 'Cápsulas compatibles Nespresso Intenso 10 uds.',
  },
  {
    id: 'climent_descafeinado_nespresso_10',
    nombre: 'Descafeinado Cápsulas Nespresso',
    tipo: 'capsulas',
    formato: 'capsules',
    format: 'capsules',
    cantidad: 10,
    tamano: '10 cápsulas',
    precio: 4.0,
    decaf: true,
    photo: null,
    url: `${BASE}/producto/capsulas-cafe-climent-descafeinado-compatibles-nespresso-10-uds/`,
    desc: 'Cápsulas compatibles Nespresso Descafeinado 10 uds.',
  },
  // === CÁPSULAS DOLCE GUSTO ===
  {
    id: 'climent_intenso_dolcegusto_10',
    nombre: 'Intenso Cápsulas Dolce Gusto',
    tipo: 'capsulas',
    formato: 'capsules',
    format: 'capsules',
    cantidad: 10,
    tamano: '10 cápsulas',
    precio: 3.8,
    decaf: false,
    photo: null,
    url: `${BASE}/producto/capsulas-cafe-intenso-climent-compatibles-dolce-gusto-10-uds/`,
    desc: 'Cápsulas compatibles Dolce Gusto Intenso 10 uds.',
  },
  {
    id: 'climent_descafeinado_dolcegusto_10',
    nombre: 'Descafeinado Cápsulas Dolce Gusto',
    tipo: 'capsulas',
    formato: 'capsules',
    format: 'capsules',
    cantidad: 10,
    tamano: '10 cápsulas',
    precio: 4.0,
    decaf: true,
    photo: null,
    url: `${BASE}/producto/capsulas-cafe-climent-descafeinado-compatibles-dolce-gusto-10-uds/`,
    desc: 'Cápsulas compatibles Dolce Gusto Descafeinado 10 uds.',
  },
  {
    id: 'climent_cafe_con_leche_dolcegusto_10',
    nombre: 'Café con Leche Cápsulas Dolce Gusto',
    tipo: 'capsulas',
    formato: 'capsules',
    format: 'capsules',
    cantidad: 10,
    tamano: '10 cápsulas',
    precio: 4.0,
    decaf: false,
    photo: null,
    url: `${BASE}/producto/capsulas-cafe-con-leche-climent-compatibles-dolce-gusto-10-uds/`,
    desc: 'Cápsulas compatibles Dolce Gusto Café con Leche 10 uds.',
  },
];

// Try to get photo from product page
function fetchText(url) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    proto
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const loc = res.headers.location.startsWith('http')
            ? res.headers.location
            : new URL(res.headers.location, url).href;
          return fetchText(loc).then(resolve, reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString()));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

async function getProductPhoto(pageUrl) {
  try {
    const html = await fetchText(pageUrl);
    // Look for cafescliment.com/wp-content/uploads image
    const m = html.match(
      /src="(https:\/\/www\.cafescliment\.com\/wp-content\/uploads\/[^"]+\.(jpg|png|webp))"/i
    );
    if (m) return m[1];
    const og = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
    if (og) return og[1];
    return null;
  } catch {
    return null;
  }
}

(async () => {
  let added = 0;

  // Update existing Mercadona products with extra info
  console.log('=== Updating existing Mercadona Climent products ===');
  for (const [id, updates] of [
    [
      'mercadona_11740',
      {
        tamano: '250g',
        cantidad: 250,
        fuente: 'mercadona',
        fuenteUrl: 'https://www.cafescliment.com/producto/cafe-natural-molido-250-gr/',
        updatedAt: now,
      },
    ],
    [
      'mercadona_11745',
      {
        tamano: '250g',
        cantidad: 250,
        fuente: 'mercadona',
        fuenteUrl: 'https://www.cafescliment.com/producto/cafe-descafeinado-natural-molido-250-gr/',
        updatedAt: now,
      },
    ],
  ]) {
    const doc = await db.collection('cafes').doc(id).get();
    if (doc.exists) {
      await db.collection('cafes').doc(id).update(updates);
      console.log(`UPDATED: ${id}`);
    }
  }

  // Add new products
  console.log('\n=== Adding new products ===');
  for (const p of PRODUCTS) {
    const existing = await db.collection('cafes').doc(p.id).get();
    if (existing.exists) {
      console.log(`SKIP (exists): ${p.id}`);
      continue;
    }

    // Get photo
    let photoUrl = null;
    if (p.photo) {
      console.log(`  Downloading photo for ${p.id}...`);
      try {
        photoUrl = await uploadPhoto(p.id, p.photo);
        console.log(`  Photo uploaded: ${p.id}`);
      } catch (e) {
        console.log(`  Photo ERR ${p.id}: ${e.message}`);
      }
    } else {
      // Try to scrape photo from product page
      console.log(`  Scraping photo for ${p.id}...`);
      const scraped = await getProductPhoto(p.url);
      if (scraped) {
        try {
          photoUrl = await uploadPhoto(p.id, scraped);
          console.log(`  Scraped photo uploaded: ${p.id}`);
        } catch (e) {
          console.log(`  Scrape photo ERR: ${e.message}`);
        }
      } else {
        console.log(`  No photo found for ${p.id}`);
      }
    }

    const doc = {
      nombre: p.nombre,
      name: `Climent ${p.nombre} ${p.tamano}`,
      marca: 'Climent',
      roaster: 'J. Climent Molina S.A.',
      category: 'retail',
      coffeeCategory: 'daily',
      tipo: p.tipo,
      formato: p.formato,
      format: p.format,
      cantidad: p.cantidad,
      tamano: p.tamano,
      precio: p.precio,
      decaf: p.decaf,
      origen: 'Valencia',
      fuente: 'cafescliment',
      fuentePais: 'ES',
      fuenteUrl: p.url,
      urlProducto: p.url,
      descripcion: p.desc,
      fecha: now,
      puntuacion: 0,
      votos: 0,
      status: 'approved',
      reviewStatus: 'approved',
      appVisible: true,
      scannerVisible: true,
      provisional: false,
      adminReviewedAt: now,
      updatedAt: now,
      approvedAt: now,
      createdAt: now,
    };

    if (photoUrl) {
      doc.fotoUrl = photoUrl;
      doc.foto = photoUrl;
      doc.imageUrl = photoUrl;
      doc.officialPhoto = photoUrl;
      doc.bestPhoto = photoUrl;
      doc.imagenUrl = photoUrl;
      doc.photos = { selected: photoUrl, original: photoUrl, bgRemoved: photoUrl };
    }

    await db.collection('cafes').doc(p.id).set(doc);
    console.log(
      `ADDED: ${p.id} - Climent ${p.nombre} ${p.tamano} - ${p.precio}€${p.decaf ? ' (DECAF)' : ''}`
    );
    added++;
  }

  console.log(`\n=== DONE: ${added} added, 2 updated ===`);
  process.exit(0);
})();
