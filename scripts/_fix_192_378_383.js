const fetch = require('node-fetch');
const sharp = require('sharp');
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const bucket = admin.storage().bucket();
const db = admin.firestore();

// --- 1. Fix #192: brand → Dolce Gusto ---
async function fixBrand192() {
  const docId = 'jurado_dolcegusto_extra_intenso';
  console.log('\n=== #192: Cambiar brand a Dolce Gusto ===');
  const doc = await db.collection('cafes').doc(docId).get();
  console.log('  Antes:', doc.data().brand);
  await db.collection('cafes').doc(docId).update({ brand: 'Dolce Gusto' });
  console.log('  Ahora: Dolce Gusto ✓');
}

// --- 2. Fix #378-380: brand → INCAPTO ---
async function fixBrands378_380() {
  const docs = [
    { id: 'laestrella_https-www-cafeslaestrella-com-productos-grano-natural-html', num: 378 },
    {
      id: 'laestrella_https-www-cafeslaestrella-com-productos-cafe-premium-grano-tueste-natural-html',
      num: 379,
    },
    { id: 'laestrella_https-www-cafeslaestrella-com-productos-grano-torrefacto-html', num: 380 },
  ];
  console.log('\n=== #378-380: Cambiar brand a INCAPTO ===');
  for (const d of docs) {
    const snap = await db.collection('cafes').doc(d.id).get();
    console.log(`  #${d.num} antes: ${snap.data().brand}`);
    await db.collection('cafes').doc(d.id).update({ brand: 'INCAPTO' });
    console.log(`  #${d.num} ahora: INCAPTO ✓`);
  }
}

// --- 3. Fix #383: foto correcta de La Estrella Molido Natural ---
async function fixPhoto383() {
  const docId = 'laestrella_https-www-cafeslaestrella-com-productos-molido-natural-html';
  const asin = 'B00709HKDY';
  console.log(`\n=== #383: Corregir foto (ASIN ${asin}) ===`);

  const res = await fetch(`https://www.amazon.es/dp/${asin}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'es-ES,es;q=0.9',
    },
  });
  const html = await res.text();
  const matches = [
    ...html.matchAll(/"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g),
  ];
  const imgUrl = matches[0]?.[1];
  if (!imgUrl) {
    console.log('  No hiRes found!');
    return;
  }
  console.log('  Image:', imgUrl);

  const imgRes = await fetch(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const buf = Buffer.from(await imgRes.arrayBuffer());
  const meta = await sharp(buf).metadata();
  console.log('  Source:', meta.width + 'x' + meta.height, (buf.length / 1024).toFixed(0) + 'KB');

  const processed = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();
  console.log('  Processed:', (processed.length / 1024).toFixed(0) + 'KB 800x800');

  const storagePath = `cafe-photos-nobg/${docId}.png`;
  const file = bucket.file(storagePath);
  try {
    await file.delete();
  } catch (e) {}
  await file.save(processed, {
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
    public: true,
    resumable: false,
  });

  const publicUrl = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${storagePath}`;
  await db.collection('cafes').doc(docId).update({
    fotoUrl: publicUrl,
    foto: publicUrl,
    imageUrl: publicUrl,
    officialPhoto: publicUrl,
    bestPhoto: publicUrl,
    imagenUrl: publicUrl,
    'photos.selected': publicUrl,
    'photos.original': publicUrl,
    'photos.bgRemoved': true,
  });
  console.log('  Photo updated ✓');
}

(async () => {
  await fixBrand192();
  await fixBrands378_380();
  await fixPhoto383();
  console.log('\n¡Todo listo!');
  process.exit(0);
})();
