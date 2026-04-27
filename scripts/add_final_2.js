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

const CAFES = [
  {
    id: 'marcilla_gran_aroma_natural_grano_1kg',
    nombre: 'Marcilla Gran Aroma Natural Café en Grano 1kg',
    marca: 'Marcilla',
    roaster: 'Marcilla',
    tipo: 'grano',
    formato: 'grano',
    peso: '1kg',
    pesoGramos: 1000,
    pais: 'España',
    origen: 'Blend',
    variedad: 'Arábica y Robusta',
    tueste: 'medio',
    ean: '8410091012110',
    descripcion:
      'Café en grano Gran Aroma Natural de Marcilla. Mezcla suave y aromática. Envase de 1kg.',
    imageUrl: 'https://m.media-amazon.com/images/I/810C0ip6JqL._AC_SL1500_.jpg',
  },
  {
    id: 'bonka_natural_hosteleria_grano_1kg',
    nombre: 'Bonka Café en Grano Tostado Natural 1kg',
    marca: 'Bonka',
    roaster: 'Nestlé Professional',
    tipo: 'grano',
    formato: 'grano',
    peso: '1kg',
    pesoGramos: 1000,
    pais: 'España',
    origen: 'Blend',
    variedad: 'Arábica y Robusta',
    tueste: 'medio',
    ean: '8410100082219',
    descripcion:
      'Café en grano tostado natural para hostelería de Bonka. Mezcla equilibrada de Nestlé Professional. 1kg.',
    imageUrl: 'https://m.media-amazon.com/images/I/719nuj8ANtL._AC_SL1500_.jpg',
  },
];

(async () => {
  const snap = await db.collection('cafes').get();
  const existingIds = new Set();
  const existingEans = new Set();
  snap.forEach((d) => {
    existingIds.add(d.id);
    const e = d.data().ean;
    if (e) existingEans.add(e);
  });

  let added = 0;
  for (const cafe of CAFES) {
    if (existingIds.has(cafe.id)) {
      console.log(`SKIP id: ${cafe.id}`);
      continue;
    }
    if (existingEans.has(cafe.ean)) {
      console.log(`SKIP ean: ${cafe.ean}`);
      continue;
    }

    console.log(`Adding: ${cafe.nombre}...`);
    const resp = await fetch(cafe.imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
    });
    if (!resp.ok) {
      console.log(`  ERROR: HTTP ${resp.status}`);
      continue;
    }
    const imgBuf = Buffer.from(await resp.arrayBuffer());
    console.log(`  Downloaded ${(imgBuf.length / 1024).toFixed(0)} KB`);
    const publicUrl = await uploadImage(imgBuf, cafe.id);

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
    console.log(`  OK`);
    added++;
  }

  const total = await db.collection('cafes').get();
  console.log(`Added: ${added} | Total: ${total.size}`);
  process.exit(0);
})();
