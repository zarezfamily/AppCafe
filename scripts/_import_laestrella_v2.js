#!/usr/bin/env node
/**
 * Import/Update La Estrella – 8 unique products
 * Data from Amazon.es + existing import JSON
 * Photos from Amazon product images (cafeslaestrella.com has SSL issues)
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

// 8 unique La Estrella products
const products = [
  // MOLIDO
  {
    id: 'laestrella_molido_mezcla_intensa',
    nombre: 'LA ESTRELLA MOLIDO MEZCLA INTENSA',
    descripcion:
      'Café mezcla 50/50 natural y torrefacto. Sabor fuerte e intenso con buena relación calidad-precio.',
    formato: 'ground',
    tipoProducto: 'cafe molido',
    cantidad: 250,
    tueste: 'medium-dark',
    notas: 'mezcla, intenso',
    decaf: false,
    ean: '8410121100633',
    imgUrl: 'https://m.media-amazon.com/images/I/71q1kYxLFDL._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.es/dp/B00709HL8S',
  },

  {
    id: 'laestrella_molido_natural',
    nombre: 'LA ESTRELLA MOLIDO NATURAL',
    descripcion: 'Café molido 100% tueste natural. Aroma equilibrado y sabor suave.',
    formato: 'ground',
    tipoProducto: 'cafe molido',
    cantidad: 250,
    tueste: 'medium',
    notas: 'natural, equilibrado',
    decaf: false,
    imgUrl: 'https://m.media-amazon.com/images/I/71sCQ42VQ+L._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.es/dp/B00709HKDY',
  },

  {
    id: 'laestrella_molido_descafeinado_mezcla',
    nombre: 'LA ESTRELLA MOLIDO DESCAFEINADO MEZCLA',
    descripcion:
      'Café molido descafeinado mezcla 50/50. Desde 1887, café que se transmite de generación en generación.',
    formato: 'ground',
    tipoProducto: 'cafe molido',
    cantidad: 250,
    tueste: 'medium',
    notas: 'mezcla, descafeinado',
    decaf: true,
    imgUrl: 'https://m.media-amazon.com/images/I/71Mk12QcJ0L._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.es/dp/B008GTCI84',
  },

  // GRANO
  {
    id: 'laestrella_grano_natural',
    nombre: 'LA ESTRELLA GRANO NATURAL',
    descripcion: 'Café en grano 100% tueste natural. Ideal para moler en casa.',
    formato: 'beans',
    tipoProducto: 'cafe en grano',
    cantidad: 500,
    tueste: 'medium',
    notas: 'natural, grano',
    decaf: false,
    imgUrl: 'https://m.media-amazon.com/images/I/71nF+O7qp2L._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.es/dp/B07W8MY9B4',
  },

  {
    id: 'laestrella_grano_torrefacto',
    nombre: 'LA ESTRELLA GRANO TORREFACTO',
    descripcion: 'Café en grano torrefacto. Sabor intenso y con cuerpo.',
    formato: 'beans',
    tipoProducto: 'cafe en grano',
    cantidad: 500,
    tueste: 'dark',
    notas: 'torrefacto, intenso',
    decaf: false,
    imgUrl: 'https://m.media-amazon.com/images/I/71sNDCCq0VL._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.es/dp/B07W6G6DTP',
  },

  {
    id: 'laestrella_grano_premium',
    nombre: 'LA ESTRELLA GRANO PREMIUM',
    descripcion:
      'Café en grano premium tueste natural. Selección especial de granos de alta calidad.',
    formato: 'beans',
    tipoProducto: 'cafe en grano',
    cantidad: 500,
    tueste: 'medium',
    notas: 'premium, natural',
    decaf: false,
    category: 'specialty',
    coffeeCategory: 'specialty',
    isSpecialty: true,
    imgUrl: 'https://m.media-amazon.com/images/I/71o2Gqb0kQL._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.es/dp/B0BGY4F6YP',
  },

  // SOLUBLE
  {
    id: 'laestrella_soluble_natural',
    nombre: 'LA ESTRELLA SOLUBLE NATURAL',
    descripcion:
      'Café soluble natural. Ideal para el desayuno, fácil y rápido de preparar. Se puede servir solo o con leche.',
    formato: 'instant',
    tipoProducto: 'cafe soluble',
    cantidad: 200,
    tueste: 'medium',
    notas: 'soluble, natural',
    decaf: false,
    imgUrl: 'https://m.media-amazon.com/images/I/61D6l3BWe1L._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.es/dp/B00XABHK04',
  },

  {
    id: 'laestrella_soluble_descafeinado',
    nombre: 'LA ESTRELLA SOLUBLE DESCAFEINADO',
    descripcion:
      'Café soluble descafeinado. Ideal para el desayuno, fácil y rápido de preparar. Se puede servir solo o con leche.',
    formato: 'instant',
    tipoProducto: 'cafe soluble',
    cantidad: 200,
    tueste: 'medium',
    notas: 'soluble, descafeinado',
    decaf: true,
    imgUrl: 'https://m.media-amazon.com/images/I/61pL3m86itL._AC_SL1500_.jpg',
    amazonUrl: 'https://www.amazon.es/dp/B00XABHLSK',
  },
];

// Old doc IDs to delete
const OLD_IDS = [
  'laestrella_https-www-cafeslaestrella-com-productos-molido-descafeinado-mezcla-html',
  'laestrella_https-www-cafeslaestrella-com-productos-molido-mezcla-intensa-html',
  'laestrella_https-www-cafeslaestrella-com-productos-molido-natural-html',
  'laestrella_https-www-cafeslaestrella-com-productos-grano-natural-html',
  'laestrella_https-www-cafeslaestrella-com-productos-grano-torrefacto-html',
  'laestrella_https-www-cafeslaestrella-com-productos-cafe-premium-grano-tueste-natural-html',
];

async function main() {
  const now = new Date().toISOString();

  // 1) Delete old docs
  console.log('\n=== Deleting old La Estrella docs ===');
  for (const oldId of OLD_IDS) {
    const ref = db.collection('cafes').doc(oldId);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.delete();
      console.log(`  ✗ Deleted ${oldId}`);
      // also delete old photo
      try {
        await bucket.file(`${PREFIX}/${oldId}.png`).delete();
      } catch {}
    } else {
      console.log(`  - Not found: ${oldId}`);
    }
  }

  // 2) Create new docs
  console.log('\n=== Creating new La Estrella docs ===');
  let ok = 0,
    fail = 0;

  for (const p of products) {
    try {
      // Process photo
      let photoUrl = '';
      try {
        photoUrl = await processAndUpload(p.id, p.imgUrl);
        console.log(`  📷 Photo OK: ${p.id}`);
      } catch (e) {
        console.warn(`  ⚠️  Photo FAIL ${p.id}: ${e.message}`);
      }

      const doc = {
        fuente: 'laestrella',
        fuentePais: 'ES',
        fuenteUrl: p.amazonUrl || 'https://www.cafeslaestrella.com/productos',
        urlProducto: p.amazonUrl || '',
        nombre: p.nombre,
        name: p.nombre,
        marca: 'Cafes La Estrella',
        roaster: 'Cafes La Estrella',
        ean: p.ean || '',
        normalizedEan: p.ean || '',
        sku: p.id.replace('laestrella_', 'la-estrella-').replace(/_/g, '-'),
        mpn: '',
        descripcion: p.descripcion || '',
        description: p.descripcion || '',
        category: p.category || 'daily',
        coffeeCategory: p.coffeeCategory || 'daily',
        isSpecialty: p.isSpecialty || false,
        legacy: false,
        formato: p.formato,
        format: p.formato,
        sistemaCapsula: '',
        tipoProducto: p.tipoProducto,
        cantidad: p.cantidad,
        intensidad: null,
        tueste: p.tueste || 'medium',
        roastLevel: p.tueste || 'medium',
        pais: '',
        origen: '',
        proceso: '',
        notas: p.notas || '',
        notes: p.notas || '',
        decaf: p.decaf || false,
        precio: null,
        currency: 'EUR',
        certificaciones: '',
        isBio: false,
        inStock: true,
        fecha: now,
        puntuacion: 0,
        votos: 0,
        officialPhoto: photoUrl || p.imgUrl,
        bestPhoto: photoUrl || p.imgUrl,
        imageUrl: photoUrl || p.imgUrl,
        foto: photoUrl || p.imgUrl,
        fotoUrl: photoUrl || p.imgUrl,
        status: 'approved',
        reviewStatus: 'approved',
        provisional: false,
        appVisible: true,
        scannerVisible: true,
        adminReviewedAt: now,
        updatedAt: now,
        approvedAt: now,
        createdAt: now,
        importMeta: { importedAt: now, sourceType: 'laestrella', sourceTitle: p.nombre },
      };

      if (photoUrl) {
        doc.photos = { selected: photoUrl, original: p.imgUrl, bgRemoved: photoUrl };
        doc.imagenUrl = photoUrl;
      }

      await db.collection('cafes').doc(p.id).set(doc, { merge: true });
      console.log(`  ✓ ${p.id} → ${p.nombre}`);
      ok++;
    } catch (e) {
      console.error(`  ✗ FAIL ${p.id}: ${e.message}`);
      fail++;
    }
  }

  console.log(`\n=== Done: ${ok} created, ${fail} failed ===`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
