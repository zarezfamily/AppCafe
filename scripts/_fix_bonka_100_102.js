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

const cafes = [
  {
    docId: 'bonka_premium-natural',
    asin: 'B01ITW9R86', // Bonka Café Tostado Molido Natural 250g (individual)
    name: '#100 Bonka Molido Espresso Natural 250gr',
  },
  {
    docId: 'bonka_molido-mezcla-250gr',
    asin: 'B01ITWA56O', // BONKA cafe mezcla molido especial 250g (individual)
    name: '#102 Bonka Molido Mezcla 250gr',
  },
];

async function getHiRes(asin) {
  const res = await fetch(`https://www.amazon.es/dp/${asin}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept-Language': 'es-ES,es;q=0.9',
    },
    redirect: 'follow',
  });
  const html = await res.text();
  const matches = [
    ...html.matchAll(/"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/g),
  ];
  return matches[0]?.[1] || null;
}

(async () => {
  for (const cafe of cafes) {
    console.log(`\n--- ${cafe.name} (${cafe.asin}) ---`);
    const imgUrl = await getHiRes(cafe.asin);
    if (!imgUrl) {
      console.log('  No hiRes found, skipping');
      continue;
    }
    console.log('  Image:', imgUrl);

    const imgRes = await fetch(imgUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const srcMeta = await sharp(buf).metadata();
    console.log(
      '  Source:',
      srcMeta.width + 'x' + srcMeta.height,
      (buf.length / 1024).toFixed(0) + 'KB'
    );

    const processed = await sharp(buf)
      .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .flatten({ background: { r: 255, g: 255, b: 255 } })
      .png()
      .toBuffer();
    console.log('  Processed:', (processed.length / 1024).toFixed(0) + 'KB 800x800');

    const storagePath = `cafe-photos-nobg/${cafe.docId}.png`;
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
    await db.collection('cafes').doc(cafe.docId).update({
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
    console.log('  DONE!');
  }
  console.log('\nAll Bonka photos updated!');
  process.exit(0);
})();
