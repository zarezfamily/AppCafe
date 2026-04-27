/**
 * Import new grain coffees from kaffek.es (2026-04-27)
 * 14 new products: 7 DeLonghi, 3 Kimbo, 1 Lavazza, 1 Zoégas, 2 Costa
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
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
          return fetchBuf(res.headers.location).then(resolve, reject);
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location)
          return fetchText(res.headers.location).then(resolve, reject);
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString()));
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

async function getProductImage(pageUrl) {
  try {
    const html = await fetchText(pageUrl);
    // Look for main product image in JSON-LD or og:image
    const ogMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/);
    if (ogMatch) return ogMatch[1];
    // Try data-gallery-role="main-image"
    const imgMatch = html.match(/src="(https:\/\/kaffekapslen\.media[^"]+)"/);
    if (imgMatch) return imgMatch[1];
    return null;
  } catch (e) {
    console.log('  Err fetching page:', e.message);
    return null;
  }
}

const now = new Date().toISOString();

const PRODUCTS = [
  // DeLonghi - 7 products (NEW BRAND)
  {
    id: 'delonghi_classico_espresso_1kg',
    nombre: 'Classico Espresso',
    marca: 'DeLonghi',
    precio: 22.09,
    tamano: '1kg',
    cantidad: 1000,
    url: 'https://kaffek.es/classico-espresso-1000-g-granos-de-cafe-delonghi.html',
  },
  {
    id: 'delonghi_caffe_crema_1kg',
    nombre: 'Caffé Crema',
    marca: 'DeLonghi',
    precio: 20.99,
    tamano: '1kg',
    cantidad: 1000,
    url: 'https://kaffek.es/caffe-crema-1000-g-granos-de-cafe-delonghi.html',
  },
  {
    id: 'delonghi_selezione_espresso_1kg',
    nombre: 'Selezione Espresso',
    marca: 'DeLonghi',
    precio: 19.99,
    tamano: '1kg',
    cantidad: 1000,
    url: 'https://kaffek.es/selezione-espresso-1000-g-granos-de-cafe-delonghi.html',
  },
  {
    id: 'delonghi_decaffeinato_espresso_250g',
    nombre: 'Decaffeinato Espresso',
    marca: 'DeLonghi',
    precio: 6.19,
    tamano: '250g',
    cantidad: 250,
    decaf: true,
    url: 'https://kaffek.es/decaffeinato-espresso-250-g-granos-de-cafe-delonghi.html',
  },
  {
    id: 'delonghi_caffe_crema_250g',
    nombre: 'Caffé Crema',
    marca: 'DeLonghi',
    precio: 4.99,
    tamano: '250g',
    cantidad: 250,
    url: 'https://kaffek.es/caffe-crema-250-g-granos-de-cafe-delonghi.html',
  },
  {
    id: 'delonghi_classico_espresso_250g',
    nombre: 'Classico Espresso',
    marca: 'DeLonghi',
    precio: 5.09,
    tamano: '250g',
    cantidad: 250,
    url: 'https://kaffek.es/classico-espresso-250-g-granos-de-cafe-delonghi.html',
  },
  {
    id: 'delonghi_selezione_espresso_250g',
    nombre: 'Selezione Espresso',
    marca: 'DeLonghi',
    precio: 5.09,
    tamano: '250g',
    cantidad: 250,
    url: 'https://kaffek.es/selezione-espresso-250-g-granos-de-cafe-delonghi.html',
  },
  // Kimbo - 3 new products
  {
    id: 'ean_8002200602079',
    nombre: 'Amalfi',
    marca: 'Kimbo',
    precio: 22.09,
    tamano: '1kg',
    cantidad: 1000,
    url: 'https://kaffek.es/amalfi-kimbo-1kg-granos-de-cafe.html',
  },
  {
    id: 'ean_8002200602086',
    nombre: 'Capri',
    marca: 'Kimbo',
    precio: 21.09,
    tamano: '1kg',
    cantidad: 1000,
    url: 'https://kaffek.es/capri-kimbo-1kg-granos-de-cafe.html',
  },
  {
    id: 'kimbo_descafeinado_500g',
    nombre: 'Descafeinado',
    marca: 'Kimbo',
    precio: 16.29,
    tamano: '500g',
    cantidad: 500,
    decaf: true,
    url: 'https://kaffek.es/descafeinado-kimbo-500g-granos-de-cafe.html',
  },
  // Lavazza - 1 new (Qualità Oro)
  {
    id: 'lavazza_qualita_oro_1kg',
    nombre: 'Qualità Oro',
    marca: 'Lavazza',
    precio: 28.69,
    tamano: '1kg',
    cantidad: 1000,
    url: 'https://kaffek.es/qualita-oro-1000-g-granos-de-cafe-lavazza.html',
  },
  // Zoégas - 1 new (Intenzo)
  {
    id: 'zoegas_intenzo_500g',
    nombre: 'Intenzo',
    marca: 'Zoégas',
    precio: 9.09,
    tamano: '500g',
    cantidad: 500,
    url: 'https://kaffek.es/intenzo-zoegas-granos-de-cafe-500g.html',
  },
  // Costa - 2 new sizes
  {
    id: 'costa_signature_blend_400g',
    nombre: 'Signature Blend',
    marca: 'Costa',
    precio: 9.19,
    tamano: '400g',
    cantidad: 400,
    url: 'https://kaffek.es/signature-blend-costa-coffee-granos-de-cafe-400.html',
  },
  {
    id: 'costa_intense_amazonian_1kg',
    nombre: 'Intense Amazonian Blend',
    marca: 'Costa',
    precio: 19.59,
    tamano: '1kg',
    cantidad: 1000,
    url: 'https://kaffek.es/intense-amazonian-blend-costa-coffee-granos-de-cafe-1000.html',
  },
];

(async () => {
  let added = 0;

  for (const p of PRODUCTS) {
    // Check if already exists
    const existing = await db.collection('cafes').doc(p.id).get();
    if (existing.exists) {
      console.log(`SKIP (exists): ${p.id}`);
      continue;
    }

    // Get product image from page
    console.log(`Fetching image for: ${p.id}...`);
    const imgUrl = await getProductImage(p.url);

    // Upload photo
    let photoUrl = null;
    if (imgUrl) {
      try {
        photoUrl = await uploadPhoto(p.id, imgUrl);
        console.log(`  Photo uploaded: ${p.id}`);
      } catch (e) {
        console.log(`  Photo ERR ${p.id}: ${e.message}`);
      }
    }

    const doc = {
      nombre: p.nombre,
      name: `${p.marca} ${p.nombre} ${p.tamano}`,
      marca: p.marca,
      roaster: p.marca,
      category: 'retail',
      coffeeCategory: 'daily',
      tipo: 'grano',
      formato: 'beans',
      format: 'beans',
      cantidad: p.cantidad,
      tamano: p.tamano,
      precio: p.precio,
      decaf: p.decaf || false,
      fuente: 'kaffek',
      fuentePais: 'ES',
      fuenteUrl: p.url,
      urlProducto: p.url,
      descripcion: `${p.marca} ${p.nombre} ${p.tamano} granos de café`,
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
    console.log(`ADDED: ${p.id} - ${p.marca} ${p.nombre} ${p.tamano} - ${p.precio}€`);
    added++;
  }

  console.log(`\n=== DONE: ${added} products added ===`);
  process.exit(0);
})();
