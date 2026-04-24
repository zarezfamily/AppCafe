const admin = require('firebase-admin');
const sharp = require('sharp');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

(async () => {
  // Tusell Tostadores - specialty from Barcelona
  const id = 'el_criollo_colombia_especialidad_grano_1kg';
  const imageUrl = 'https://m.media-amazon.com/images/I/81Gew0ym0NL._AC_SL1500_.jpg';

  console.log('Downloading image...');
  const resp = await fetch(imageUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
  });
  if (!resp.ok) {
    console.log('ERROR:', resp.status);
    process.exit(1);
  }
  const buf = Buffer.from(await resp.arrayBuffer());
  console.log(`Downloaded ${(buf.length / 1024).toFixed(0)} KB`);

  const resized = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
  const path = `cafe-photos-nobg/${id}.png`;
  await bucket.file(path).save(resized, { metadata: { contentType: 'image/png' }, public: true });
  const publicUrl = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${path}`;

  const now = new Date().toISOString();
  await db
    .collection('cafes')
    .doc(id)
    .set({
      nombre: 'Cafés El Criollo Colombia Especialidad Grano 1kg',
      marca: 'Cafés El Criollo',
      roaster: 'Cafés El Criollo',
      tipo: 'grano',
      formato: 'grano',
      peso: '1kg',
      pesoGramos: 1000,
      pais: 'España',
      origen: 'Colombia',
      variedad: '100% Arábica',
      tueste: 'medio',
      ean: '8437014540031',
      descripcion:
        'Café de especialidad de Colombia Finca Pico Cristóbal. 83,5 puntos SCA. 100% Arábica tueste artesanal. Pack 4x250g.',
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
  console.log('OK:', publicUrl);

  const total = await db.collection('cafes').get();
  console.log('Total:', total.size);
  process.exit(0);
})();
