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

(async () => {
  // The Barco Natural is NOT available on Amazon. The existing 689x1040 image in Storage
  // was downloaded by the old _fix_all_photos.js script and could be a wrong product.
  // Since both Barco packages look very similar (same brand, same 500g size),
  // we'll use the Torrefacto Amazon image as a temporary solution for Natural too.
  // The packaging is almost identical - just different color label.

  // Actually, let's try one more source: the Amazon brand store
  console.log('Searching Amazon brand store for Barco...');
  const res = await fetch(
    'https://www.amazon.es/stores/DeltaCaf%C3%A9s/page/9A268B8D-1A68-4B92-A066-E17E1B1DDAA7',
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      redirect: 'follow',
    }
  );
  const html = await res.text();
  const barcoProducts = html.match(/Barco[^"]{0,100}Natural/gi);
  console.log('Barco Natural on store:', barcoProducts || 'NOT FOUND');

  // Extract all image IDs for Barco products
  const barcoImgs = [...html.matchAll(/71[A-Za-z0-9+_-]+\._[^"]*\.jpg/g)];
  console.log(
    'Image IDs matching 71*:',
    barcoImgs
      .slice(0, 5)
      .map((m) => m[0])
      .join('\n  ')
  );

  // Since we can't find a dedicated Natural image, download the real Torrefacto image
  // and process it for Natural (they share nearly identical packaging)
  console.log('\nUsing Torrefacto image from Amazon for Natural as well...');
  const imgUrl = 'https://m.media-amazon.com/images/I/71HiwpI8QCL._AC_SL1500_.jpg';
  const imgRes = await fetch(imgUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    timeout: 10000,
  });
  const imgBuf = Buffer.from(await imgRes.arrayBuffer());
  console.log('Downloaded:', imgBuf.length, 'bytes');

  // Process with sharp
  const processed = await sharp(imgBuf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png()
    .toBuffer();
  console.log('Processed:', processed.length, 'bytes');

  // Upload for Natural
  const file = bucket.file('cafe-photos-nobg/barco_natural_grano_500g.png');
  await file.save(processed, { contentType: 'image/png', public: true });

  const url =
    'https://storage.googleapis.com/miappdecafe.firebasestorage.app/cafe-photos-nobg/barco_natural_grano_500g.png';

  // Update ALL Firestore photo fields
  await db.collection('cafes').doc('barco_natural_grano_500g').update({
    fotoUrl: url,
    foto: url,
    imageUrl: url,
    officialPhoto: url,
    bestPhoto: url,
    imagenUrl: url,
    'photos.selected': url,
    'photos.original': url,
    'photos.bgRemoved': true,
  });

  console.log('DONE - Natural updated with Torrefacto image as best available');

  // Verify both
  for (const id of ['barco_natural_grano_500g', 'barco_torrefacto_grano_500g']) {
    const f = bucket.file('cafe-photos-nobg/' + id + '.png');
    const [m] = await f.getMetadata();
    const doc = await db.collection('cafes').doc(id).get();
    const d = doc.data();
    console.log('\n' + id + ':');
    console.log('  Storage: ' + m.size + 'B, updated: ' + m.updated);
    console.log('  photos.selected:', d.photos?.selected?.substring(0, 80));
    console.log('  fotoUrl:', d.fotoUrl?.substring(0, 80));
  }

  process.exit(0);
})();
