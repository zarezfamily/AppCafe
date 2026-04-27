const admin = require('firebase-admin');
const sharp = require('sharp');
const _https = require('https');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

function download(url) {
  return fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    },
  }).then(async (r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  });
}

async function uploadImage(buffer, docId) {
  const resized = await sharp(buffer)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
  const path = `cafe-photos-nobg/${docId}.png`;
  const file = bucket.file(path);
  await file.save(resized, { metadata: { contentType: 'image/png' }, public: true });
  return `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${path}`;
}

const NEW_CAFES = [
  {
    id: 'saimaza_tueste_natural_grano_1kg',
    nombre: 'Saimaza Tueste Natural Café en Grano 1kg',
    marca: 'Saimaza',
    roaster: 'Saimaza',
    tipo: 'grano',
    formato: 'grano',
    peso: '1kg',
    pesoGramos: 1000,
    pais: 'España',
    origen: 'Blend',
    variedad: 'Arábica y Robusta',
    tueste: 'medio',
    ean: '8711000538029',
    descripcion:
      'Café en grano tueste natural de Saimaza. Mezcla equilibrada de arábica y robusta. Envase de 1kg.',
    imageUrl: 'https://m.media-amazon.com/images/I/51tcHXRnRAS._AC_SL1500_.jpg',
  },
  {
    id: 'vergnano_espresso_grano_1kg',
    nombre: 'Caffè Vergnano 1882 Espresso Grano 1kg',
    marca: 'Caffè Vergnano',
    roaster: 'Caffè Vergnano 1882',
    tipo: 'grano',
    formato: 'grano',
    peso: '1kg',
    pesoGramos: 1000,
    pais: 'Italia',
    origen: 'Blend',
    variedad: 'Arábica y Robusta',
    tueste: 'medio',
    ean: '8001140025003',
    descripcion:
      'Café en grano Espresso de Caffè Vergnano 1882. Histórica torrefactora italiana fundada en 1882. Blend clásico 1kg.',
    imageUrl: 'https://m.media-amazon.com/images/I/616rYZgmgLL._AC_SL1500_.jpg',
  },
  {
    id: 'julius_meinl_wiener_grano_1kg',
    nombre: 'Julius Meinl Wiener Espresso Grano 1kg',
    marca: 'Julius Meinl',
    roaster: 'Julius Meinl',
    tipo: 'grano',
    formato: 'grano',
    peso: '1kg',
    pesoGramos: 1000,
    pais: 'Austria',
    origen: 'Blend',
    variedad: 'Arábica y Robusta',
    tueste: 'medio',
    ean: '9000403947149',
    descripcion:
      'Café en grano Wiener Espresso de Julius Meinl. Tradición vienesa desde 1862. Blend equilibrado 1kg.',
    imageUrl: 'https://m.media-amazon.com/images/I/71VrdmrejSL._AC_SL1500_.jpg',
  },
  {
    id: 'cafe_saula_gran_espresso_premium_grano_500g',
    nombre: 'Café Saula Gran Espresso Premium Grano 500g',
    marca: 'Café Saula',
    roaster: 'Café Saula',
    tipo: 'grano',
    formato: 'grano',
    peso: '500g',
    pesoGramos: 500,
    pais: 'España',
    origen: 'Blend',
    variedad: '100% Arábica',
    tueste: 'medio',
    ean: '8410895100201',
    descripcion:
      'Café en grano Gran Espresso Premium de Café Saula. 100% Arábica de tueste artesanal catalán. Envase de 500g.',
    imageUrl: 'https://m.media-amazon.com/images/I/510pO0M6a0L._AC_SL1500_.jpg',
  },
  {
    id: 'mocay_etiqueta_oro_grano_1kg',
    nombre: 'Mocay Etiqueta Oro Café en Grano 1kg',
    marca: 'Mocay',
    roaster: 'Mocay Caffè',
    tipo: 'grano',
    formato: 'grano',
    peso: '1kg',
    pesoGramos: 1000,
    pais: 'España',
    origen: 'Blend',
    variedad: 'Arábica y Robusta',
    tueste: 'medio',
    ean: '8437009375013',
    descripcion:
      'Café en grano Etiqueta Oro de Mocay. Blend premium para hostelería. Mezcla de arábica y robusta 1kg.',
    imageUrl: 'https://m.media-amazon.com/images/I/71jGaXdcg6L._AC_SL1500_.jpg',
  },
  {
    id: 'supracafe_descafeinado_grano_1kg',
    nombre: 'Supracafé Descafeinado Natural Grano 1kg',
    marca: 'Supracafé',
    roaster: 'Supracafé',
    tipo: 'grano',
    formato: 'grano',
    peso: '1kg',
    pesoGramos: 1000,
    pais: 'España',
    origen: 'Colombia',
    variedad: 'Arábica',
    tueste: 'medio',
    ean: '8437005065017',
    descripcion:
      'Café descafeinado por proceso natural de agua de Supracafé. 100% Arábica colombiano. Grano entero 1kg.',
    imageUrl: 'https://m.media-amazon.com/images/I/61W4XXlLiRL._AC_SL1500_.jpg',
  },
  {
    id: 'lavazza_qualita_oro_grano_250g',
    nombre: 'Lavazza Qualità Oro Grano 250g',
    marca: 'Lavazza',
    roaster: 'Lavazza',
    tipo: 'grano',
    formato: 'grano',
    peso: '250g',
    pesoGramos: 250,
    pais: 'Italia',
    origen: 'Blend',
    variedad: '100% Arábica',
    tueste: 'medio',
    ean: '8000070020542',
    descripcion:
      'Café en grano Qualità Oro de Lavazza. 100% Arábica con notas florales y de fruta. Envase de 250g.',
    imageUrl: 'https://m.media-amazon.com/images/I/61yniaS9bLL._AC_SL1500_.jpg',
  },
  {
    id: 'illy_intenso_grano_250g',
    nombre: 'illy Intenso Café en Grano 250g',
    marca: 'illy',
    roaster: 'illycaffè',
    tipo: 'grano',
    formato: 'grano',
    peso: '250g',
    pesoGramos: 250,
    pais: 'Italia',
    origen: 'Blend',
    variedad: '100% Arábica',
    tueste: 'oscuro',
    ean: '8003753918198',
    descripcion:
      'Café en grano Intenso de illy. 100% Arábica con tueste oscuro, notas de cacao y tostado. Lata de 250g.',
    imageUrl: 'https://m.media-amazon.com/images/I/61i1Zv8rupL._AC_SL1500_.jpg',
  },
  {
    id: 'segafredo_intermezzo_grano_1kg',
    nombre: 'Segafredo Zanetti Intermezzo Grano 1kg',
    marca: 'Segafredo',
    roaster: 'Segafredo Zanetti',
    tipo: 'grano',
    formato: 'grano',
    peso: '1kg',
    pesoGramos: 1000,
    pais: 'Italia',
    origen: 'Blend',
    variedad: 'Arábica y Robusta',
    tueste: 'medio',
    ean: '8003410212652',
    descripcion:
      'Café en grano Intermezzo de Segafredo Zanetti. Mezcla cremosa de arábica y robusta. Paquete de 1kg.',
    imageUrl: 'https://m.media-amazon.com/images/I/61efCysEiXL._AC_SL1500_.jpg',
  },
  {
    id: 'kimbo_espresso_napoletano_grano_1kg',
    nombre: 'Kimbo Espresso Napoletano Grano 1kg',
    marca: 'Kimbo',
    roaster: 'Kimbo',
    tipo: 'grano',
    formato: 'grano',
    peso: '1kg',
    pesoGramos: 1000,
    pais: 'Italia',
    origen: 'Blend',
    variedad: 'Arábica y Robusta',
    tueste: 'medio',
    ean: '8002200101015',
    descripcion:
      'Café en grano Espresso Napoletano de Kimbo. Tradición napolitana, mezcla cremosa. Paquete de 1kg.',
    imageUrl: 'https://m.media-amazon.com/images/I/714Y+pXN-fL._AC_SL1500_.jpg',
  },
  {
    id: 'pellini_top_arabica_grano_1kg',
    nombre: 'Pellini Top 100% Arabica Grano 1kg',
    marca: 'Pellini',
    roaster: 'Pellini',
    tipo: 'grano',
    formato: 'grano',
    peso: '1kg',
    pesoGramos: 1000,
    pais: 'Italia',
    origen: 'Blend',
    variedad: '100% Arábica',
    tueste: 'medio',
    ean: '8001685020118',
    descripcion:
      'Café en grano Top 100% Arábica de Pellini. Aroma intenso y envolvente, tueste delicado. Paquete de 1kg.',
    imageUrl: 'https://m.media-amazon.com/images/I/41EOUO0sadL._AC_SL1500_.jpg',
  },
];

(async () => {
  // Check which already exist
  const existing = new Set();
  const snap = await db.collection('cafes').get();
  snap.forEach((d) => existing.add(d.id));

  // Also check EANs
  const existingEans = new Set();
  snap.forEach((d) => {
    const ean = d.data().ean;
    if (ean) existingEans.add(ean);
  });

  let added = 0;
  for (const cafe of NEW_CAFES) {
    if (existing.has(cafe.id)) {
      console.log(`SKIP: ${cafe.id} already exists`);
      continue;
    }
    if (existingEans.has(cafe.ean)) {
      console.log(`SKIP: EAN ${cafe.ean} already in DB (${cafe.nombre})`);
      continue;
    }

    console.log(`Adding: ${cafe.nombre}...`);
    try {
      // Download and upload image
      const imgBuf = await download(cafe.imageUrl);
      console.log(`  Downloaded ${(imgBuf.length / 1024).toFixed(0)} KB`);
      const publicUrl = await uploadImage(imgBuf, cafe.id);
      console.log(`  Uploaded: ${publicUrl.substring(0, 80)}...`);

      const { id, imageUrl, ...data } = cafe;
      const now = new Date().toISOString();
      await db
        .collection('cafes')
        .doc(id)
        .set({
          ...data,
          imagenUrl: publicUrl,
          bestPhoto: publicUrl,
          officialPhoto: publicUrl,
          foto: publicUrl,
          photos: { selected: publicUrl, original: imageUrl, bgRemoved: false },
          status: 'approved',
          estado: 'approved',
          source: 'manual_curated',
          createdAt: now,
          updatedAt: now,
        });
      console.log(`  Saved to Firestore`);
      added++;
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  }

  const total = await db.collection('cafes').get();
  console.log(`\nAdded: ${added} | Total cafes: ${total.size}`);
  process.exit(0);
})();
