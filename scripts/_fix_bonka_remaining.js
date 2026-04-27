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

async function getHiResImage(asin) {
  const res = await fetch(`https://www.amazon.es/dp/${asin}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    redirect: 'follow',
    timeout: 15000,
  });
  if (!res.ok) return null;
  const html = await res.text();
  const hiRes = [
    ...html.matchAll(/"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g),
  ];
  return hiRes[0]?.[1] || null;
}

async function processAndUpload(imgUrl, docId, storageName) {
  const res = await fetch(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 15000 });
  const buf = Buffer.from(await res.arrayBuffer());
  const processed = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();

  const storagePath = `cafe-photos-nobg/${storageName}.png`;
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
  return processed.length;
}

(async () => {
  // 1. bonka-cafe-en-grano-natural-intensidad-9 -> use B08GGQGQXR (Bonka Grano Natural 500g)
  console.log('1. Fixing bonka-cafe-en-grano-natural-intensidad-9...');
  const img1 = await getHiResImage('B08GGQGQXR');
  if (img1) {
    const sz = await processAndUpload(
      img1,
      'bonka-cafe-en-grano-natural-intensidad-9',
      'bonka-cafe-en-grano-natural-intensidad-9'
    );
    console.log(`   OK: ${(sz / 1024).toFixed(0)}KB`);
  } else {
    console.log('   No image found');
  }

  await new Promise((r) => setTimeout(r, 1500));

  // 2. 0gbaTRLkg5agxlSfqKM7 -> also Bonka Natural, use same image
  console.log('2. Fixing 0gbaTRLkg5agxlSfqKM7 (Bonka Natural)...');
  if (img1) {
    const sz = await processAndUpload(img1, '0gbaTRLkg5agxlSfqKM7', '0gbaTRLkg5agxlSfqKM7');
    console.log(`   OK: ${(sz / 1024).toFixed(0)}KB`);
  }

  await new Promise((r) => setTimeout(r, 1500));

  // 3. bonka_molido-descafeinado-400gr -> The 400g descafeinado is same packaging as 250g but bigger
  // Use Bonka Descafeinado image from B00XACPGPO or search for 400g specifically
  console.log('3. Fixing bonka_molido-descafeinado-400gr...');
  const img3 = await getHiResImage('B00XACPGPO'); // Descafeinado 250g - same design
  if (img3) {
    const sz = await processAndUpload(
      img3,
      'bonka_molido-descafeinado-400gr',
      'bonka_molido-descafeinado-400gr'
    );
    console.log(`   OK: ${(sz / 1024).toFixed(0)}KB`);
  } else {
    console.log('   No image found');
  }

  console.log('\nDone!');
  process.exit(0);
})();
