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

(async () => {
  // 1) Fix Daddy Long Legs: copy bestPhoto to all photo fields
  const daddyIds = ['daddy_long_legs_house_blend_250g', 'daddy_long_legs_kenya_250g'];
  for (const id of daddyIds) {
    const doc = await db.collection('cafes').doc(id).get();
    const data = doc.data();
    const url = data.bestPhoto;
    if (url && url !== data.imagenUrl) {
      await db.collection('cafes').doc(id).update({
        imagenUrl: url,
        officialPhoto: url,
        foto: url,
        'photos.selected': url,
        'photos.bgRemoved': true,
      });
      console.log(`Fixed Daddy Long Legs: ${data.nombre} → ${url}`);
    } else {
      console.log(`Daddy Long Legs OK: ${data.nombre}`);
    }
  }

  // 2) Delete Satan's Coffee Corner (fictional entries)
  const satanIds = [
    'satan_coffee_corner_colombia_grano_250g',
    'satan_coffee_corner_ethiopia_grano_250g',
  ];
  for (const id of satanIds) {
    const doc = await db.collection('cafes').doc(id).get();
    if (doc.exists) {
      await db.collection('cafes').doc(id).delete();
      console.log(`Deleted: ${doc.data().nombre}`);
    }
  }

  // 3) Add 2 real cafes to stay at 1000
  const replacements = [
    {
      id: 'oquendo_mezcla_grano_1kg',
      nombre: 'Oquendo Mezcla Café en Grano 1kg',
      marca: 'Oquendo',
      roaster: 'Cafés Oquendo',
      tipo: 'grano',
      formato: 'grano',
      peso: '1kg',
      pesoGramos: 1000,
      pais: 'España',
      origen: 'Blend',
      variedad: 'Arábica y Robusta',
      tueste: 'medio',
      ean: '8410091082311',
      descripcion:
        'Café en grano mezcla de Oquendo. Torrefactora asturiana desde 1957. Mezcla equilibrada de arábica y robusta.',
      imageUrl: 'https://m.media-amazon.com/images/I/71UOAWuAEFL._AC_SL1500_.jpg',
    },
    {
      id: 'delta_platinum_grano_1kg',
      nombre: 'Delta Cafés Platinum Café en Grano 1kg',
      marca: 'Delta',
      roaster: 'Delta Cafés',
      tipo: 'grano',
      formato: 'grano',
      peso: '1kg',
      pesoGramos: 1000,
      pais: 'Portugal',
      origen: 'Blend',
      variedad: 'Arábica y Robusta',
      tueste: 'oscuro',
      ean: '5601059009010',
      descripcion:
        'Café en grano Platinum de Delta Cafés. Intensidad 12. Marca líder portuguesa con blend premium de arábica y robusta.',
      imageUrl: 'https://m.media-amazon.com/images/I/61AURvhydLL._AC_SL1500_.jpg',
    },
  ];

  const snap = await db.collection('cafes').get();
  const existingEans = new Set();
  snap.forEach((d) => {
    const e = d.data().ean;
    if (e) existingEans.add(e);
  });

  let added = 0;
  for (const cafe of replacements) {
    if (existingEans.has(cafe.ean)) {
      console.log(`SKIP ean: ${cafe.ean} (${cafe.nombre})`);
      continue;
    }
    console.log(`Adding: ${cafe.nombre}...`);
    try {
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
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
    }
  }

  const total = await db.collection('cafes').get();
  console.log(`\nAdded: ${added} | Deleted: 2 | Total: ${total.size}`);
  process.exit(0);
})();
