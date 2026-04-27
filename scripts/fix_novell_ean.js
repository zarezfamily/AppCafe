const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const https = require('https');
const sharp = require('sharp');

const DOC_ID = '7OCDtxmVAcnaQkA0GohV';
const EAN = '8422675000604';
const IMAGE_URL =
  'https://cafesnovell.com/wp-content/uploads/2019/10/arabica-1200x1200-optimized.jpg';

function download(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return download(res.headers.location).then(resolve).catch(reject);
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

(async () => {
  // 1. Check for duplicates
  const allSnap = await db.collection('cafes').get();
  const dupes = [];
  allSnap.forEach((d) => {
    const data = d.data();
    const n = (data.nombre || '').toLowerCase();
    if (
      (n.includes('novell') && (n.includes('arab') || n.includes('natural'))) ||
      data.ean === EAN
    ) {
      dupes.push({
        id: d.id,
        nombre: data.nombre,
        ean: data.ean,
        img: (data.imagenUrl || 'NONE').substring(0, 80),
      });
    }
  });
  console.log('=== Existing Novell/EAN docs ===');
  dupes.forEach((d) => console.log(`  ${d.id} => ${d.nombre} | ean=${d.ean} | img=${d.img}`));

  // 2. Check pending doc
  const pendingDoc = await db.collection('cafes').doc(DOC_ID).get();
  if (pendingDoc.exists) {
    console.log('\n=== Pending doc data ===');
    console.log(JSON.stringify(pendingDoc.data(), null, 2));
  }

  // 3. Download and upload image
  console.log('\n=== Downloading image ===');
  const imgBuf = await download(IMAGE_URL);
  console.log('Downloaded:', imgBuf.length, 'bytes');

  const resized = await sharp(imgBuf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer();
  console.log('Resized:', resized.length, 'bytes');

  const storagePath = `cafe-photos-nobg/${DOC_ID}.png`;
  const file = bucket.file(storagePath);
  await file.save(resized, { metadata: { contentType: 'image/png' }, public: true });
  const publicUrl = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${storagePath}`;
  console.log('Uploaded to:', publicUrl);

  // 4. Update Firestore with full data
  const cafeData = {
    nombre: 'Café Natural Arábico en Grano Novell',
    roaster: 'Cafès Novell',
    marca: 'Novell',
    ean: EAN,
    barcode: EAN,
    pais: 'España',
    origen: 'Blend',
    tipo: 'grano',
    formato: 'grano',
    peso: '250g',
    pesoGramos: 250,
    tueste: 'medio',
    variedad: '100% Arábica',
    descripcion:
      'Blend 100% Arábica. Café natural en grano de Cafès Novell, marca orgánica premium con sede en Barcelona.',
    precio: 4.1,
    moneda: 'EUR',
    urlProducto: 'https://cafesnovell.com/producto/cafe-natural-arabico-en-grano/',
    imagenUrl: publicUrl,
    bestPhoto: publicUrl,
    officialPhoto: publicUrl,
    imageUrl: publicUrl,
    foto: publicUrl,
    photos: {
      selected: publicUrl,
      original: IMAGE_URL,
      bgRemoved: publicUrl,
    },
    status: 'approved',
    estado: 'approved',
    source: 'manual_fix',
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection('cafes').doc(DOC_ID).set(cafeData, { merge: true });
  console.log('\n=== Updated doc', DOC_ID, '===');
  console.log('nombre:', cafeData.nombre);
  console.log('ean:', cafeData.ean);
  console.log('imagenUrl:', cafeData.imagenUrl);

  // 5. Delete any duplicate Novell grano docs with same EAN (except our main one)
  for (const d of dupes) {
    if (d.id !== DOC_ID && d.ean === EAN) {
      console.log('\nDeleting duplicate:', d.id, '=>', d.nombre);
      await db.collection('cafes').doc(d.id).delete();
    }
  }

  console.log('\nDONE');
  process.exit(0);
})();
