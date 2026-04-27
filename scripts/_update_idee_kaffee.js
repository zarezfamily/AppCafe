/**
 * Update Idee Kaffee catalog (2026-04-27)
 * Sources: cafedujour.es, idee-kaffee.com, gourvita.com, darbovensklep.pl
 * Existing: 1 product (idee-kaffee_idee - 500g molido)
 * New: 7 beans + 2 ground + 1 update = 9 new + 1 updated
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
    const proto = url.startsWith('https') ? https : require('http');
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

// Photo URLs from cafedujour.es and official site
const PHOTOS = {
  crema_1kg:
    'https://cafedujour.es/media/catalog/product/cache/66ff6701000170c81cb5f5121ef5c488/i/d/idee-cafe-crema-kaffeebohnen-100.webp',
  decaf_1kg:
    'https://cafedujour.es/media/catalog/product/cache/66ff6701000170c81cb5f5121ef5c488/i/d/ideedecafelegant1000.webp',
  espresso_1kg:
    'https://cafedujour.es/media/catalog/product/cache/66ff6701000170c81cb5f5121ef5c488/i/d/ideeespintense1000neu.webp',
  crema_500g:
    'https://www.gourvita.com/media/catalog/product/cache/8b103c8fa46b22621fc27b39c72cbb6b/i/d/idee_kaffee_500g_bohne_1_1.jpg',
  decaf_500g:
    'https://www.idee-kaffee.com/idee-kaffee.com/media/media/new%20packshots%20and%20colours%2010_2024/IDEEKAFFEEEntkoffeiniertMotivi500gVB2024FrontalUnsereIdee.png',
};

const NEW_PRODUCTS = [
  // Beans 1kg (from cafedujour.es with EANs)
  {
    id: 'ean_4006581071732',
    nombre: 'Caffè Crema Aromatic',
    tipo: 'grano',
    formato: 'beans',
    format: 'beans',
    cantidad: 1000,
    tamano: '1kg',
    precio: 17.71,
    decaf: false,
    photo: PHOTOS.crema_1kg,
    descripcion:
      'Café en grano con un perfil equilibrado y sabor pleno. Notas de frutos secos tostados. Mezcla Arábica/Robusta con tratamiento al vapor Darboven.',
    urlProducto: 'https://cafedujour.es/idee-kaffee-caffe-crema-aromatic-koffiebonen-1-kilo',
  },
  {
    id: 'ean_4006581071756',
    nombre: 'Elegant Descafeinado',
    tipo: 'grano',
    formato: 'beans',
    format: 'beans',
    cantidad: 1000,
    tamano: '1kg',
    precio: 19.06,
    decaf: true,
    photo: PHOTOS.decaf_1kg,
    descripcion:
      'Café en grano descafeinado. Perfil de sabor pleno y refinado con suave dulzor del Arábica y cuerpo del Robusta. Tratamiento al vapor Darboven.',
    urlProducto: 'https://cafedujour.es/idee-kaffee-elegant-decaffeinated-koffiebonen-1-kilo',
  },
  {
    id: 'idee_kaffee_espresso_intense_1kg',
    nombre: 'Espresso Intense',
    tipo: 'grano',
    formato: 'beans',
    format: 'beans',
    cantidad: 1000,
    tamano: '1kg',
    precio: 17.87,
    decaf: false,
    photo: PHOTOS.espresso_1kg,
    descripcion:
      'Café en grano espresso intenso. Aroma profundo con notas de chocolate negro. Tueste oscuro. Mezcla Arábica/Robusta con tratamiento al vapor Darboven.',
    urlProducto: 'https://cafedujour.es/idee-kaffee-espresso-intense-koffiebonen-1-kilo',
  },
  // Beans 500g (from gourvita.com)
  {
    id: 'idee_kaffee_caffe_crema_500g',
    nombre: 'Anregend Aromatisch Caffè Crema',
    tipo: 'grano',
    formato: 'beans',
    format: 'beans',
    cantidad: 500,
    tamano: '500g',
    precio: 9.69,
    decaf: false,
    photo: PHOTOS.crema_500g,
    descripcion:
      'Café en grano Caffè Crema 500g. Sabor equilibrado con notas de frutos secos. Tueste clásico. Mezcla Arábica/Robusta.',
    urlProducto: 'https://www.gourvita.com/idee-kaffee-anregend-aromatisch-500g-bohnen.html',
  },
  {
    id: 'idee_kaffee_descafeinado_500g',
    nombre: 'Elegant Entkoffeiniert',
    tipo: 'grano',
    formato: 'beans',
    format: 'beans',
    cantidad: 500,
    tamano: '500g',
    precio: 9.69,
    decaf: true,
    photo: PHOTOS.decaf_500g,
    descripcion:
      'Café en grano descafeinado 500g. Tueste clásico, armonioso y suave. Mezcla Arábica/Robusta con tratamiento al vapor.',
    urlProducto: 'https://www.gourvita.com/idee-kaffee-elegant-entkoffeiniert-500g-bohnen.html',
  },
  // Ground 250g
  {
    id: 'idee_kaffee_classic_250g',
    nombre: 'Classic',
    tipo: 'molido',
    formato: 'ground',
    format: 'ground',
    cantidad: 250,
    tamano: '250g',
    precio: 6.49,
    decaf: false,
    photo: null, // use same family image
    descripcion:
      'Café molido Classic 250g. Mezcla Arábica/Robusta con tratamiento al vapor Darboven. Sabor suave y aromático.',
    urlProducto: 'https://www.idee-kaffee.com/de-de/produkte/filterkaffee-aromatisch',
  },
  // Ground 500g descafeinado
  {
    id: 'idee_kaffee_classic_descafeinado_500g',
    nombre: 'Classic Descafeinado',
    tipo: 'molido',
    formato: 'ground',
    format: 'ground',
    cantidad: 500,
    tamano: '500g',
    precio: 9.2,
    decaf: true,
    photo: null,
    descripcion:
      'Café molido descafeinado Classic 500g. Mezcla Arábica/Robusta con tratamiento al vapor Darboven. Sin cafeína.',
    urlProducto: 'https://www.idee-kaffee.com/de-de/produkte/filterkaffee-entkoffeiniert',
  },
  // Gold Express instant 200g
  {
    id: 'idee_kaffee_gold_express_200g',
    nombre: 'Gold Express',
    tipo: 'soluble',
    formato: 'instant',
    format: 'instant',
    cantidad: 200,
    tamano: '200g',
    precio: 10.5,
    decaf: false,
    photo: null,
    descripcion:
      'Café soluble liofilizado Gold Express 200g. Aroma a nuez, sabor delicado y suave.',
    urlProducto: 'https://www.idee-kaffee.com/de-de/produkte/loeslicher-kaffee-aromatisch',
  },
  // Gold Express instant descafeinado 200g
  {
    id: 'idee_kaffee_gold_express_descaf_200g',
    nombre: 'Gold Express Descafeinado',
    tipo: 'soluble',
    formato: 'instant',
    format: 'instant',
    cantidad: 200,
    tamano: '200g',
    precio: 12.0,
    decaf: true,
    photo: null,
    descripcion:
      'Café soluble liofilizado descafeinado Gold Express 200g. Sin cafeína, sabor suave.',
    urlProducto: 'https://www.idee-kaffee.com/pl-pl/produkty/gold-express-bezkofeinowa',
  },
];

(async () => {
  let added = 0;
  let updated = 0;

  // 1. Update existing product
  console.log('=== Updating existing product ===');
  const existingRef = db.collection('cafes').doc('idee-kaffee_idee');
  const existingDoc = await existingRef.get();
  if (existingDoc.exists) {
    await existingRef.update({
      nombre: 'Classic',
      name: 'Idee Kaffee Classic 500g',
      tipo: 'molido',
      formato: 'ground',
      format: 'ground',
      cantidad: 500,
      tamano: '500g',
      coffeeCategory: 'daily',
      category: 'retail',
      fuente: 'idee-kaffee',
      fuentePais: 'DE',
      fuenteUrl: 'https://www.idee-kaffee.com/de-de/produkte/filterkaffee-aromatisch',
      urlProducto: 'https://www.idee-kaffee.com/de-de/produkte/filterkaffee-aromatisch',
      descripcion:
        'Café molido Classic 500g. La marca más antigua de J.J. Darboven. Mezcla Arábica/Robusta con tratamiento al vapor.',
      updatedAt: now,
    });
    console.log('UPDATED: idee-kaffee_idee → Idee Kaffee Classic 500g Molido');
    updated++;
  }

  // 2. Add new products
  console.log('\n=== Adding new products ===');
  for (const p of NEW_PRODUCTS) {
    const existing = await db.collection('cafes').doc(p.id).get();
    if (existing.exists) {
      console.log(`SKIP (exists): ${p.id}`);
      continue;
    }

    let photoUrl = null;
    if (p.photo) {
      console.log(`  Fetching photo for ${p.id}...`);
      try {
        photoUrl = await uploadPhoto(p.id, p.photo);
        console.log(`  Photo uploaded: ${p.id}`);
      } catch (e) {
        console.log(`  Photo ERR ${p.id}: ${e.message}`);
      }
    }

    const doc = {
      nombre: p.nombre,
      name: `Idee Kaffee ${p.nombre} ${p.tamano}`,
      marca: 'Idee Kaffee',
      roaster: 'J.J. Darboven',
      category: 'retail',
      coffeeCategory: 'daily',
      tipo: p.tipo,
      formato: p.formato,
      format: p.format,
      cantidad: p.cantidad,
      tamano: p.tamano,
      precio: p.precio,
      decaf: p.decaf,
      origen: 'Alemania',
      fuente: 'idee-kaffee',
      fuentePais: 'DE',
      fuenteUrl: p.urlProducto,
      urlProducto: p.urlProducto,
      descripcion: p.descripcion,
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
      `ADDED: ${p.id} - Idee Kaffee ${p.nombre} ${p.tamano} - ${p.precio}€ ${p.decaf ? '(DECAF)' : ''}`
    );
    added++;
  }

  console.log(`\n=== DONE: ${added} added, ${updated} updated ===`);
  process.exit(0);
})();
