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
  // Check current Natural image in Storage
  const file = bucket.file('cafe-photos-nobg/barco_natural_grano_500g.png');
  const [buf] = await file.download();
  const meta = await sharp(buf).metadata();
  console.log(
    'Current Natural image in Storage:',
    meta.width + 'x' + meta.height,
    meta.format,
    buf.length + 'B'
  );

  // The existing image might actually be fine - verify it's not the placeholder
  const placeholderRes = await fetch(
    'https://images.openfoodfacts.org/images/products/761/303/656/9927/front_en.44.400.jpg',
    { timeout: 5000 }
  );
  const placeholderBuf = Buffer.from(await placeholderRes.arrayBuffer());
  console.log('Placeholder size:', placeholderBuf.length + 'B');
  console.log('Image is DIFFERENT from placeholder:', buf.length !== placeholderBuf.length);

  // Since Barco Natural not on Amazon, check if original image was a wrong Amazon download
  // The _fix_all_photos.js script may have searched Amazon and gotten a wrong product.
  // Download the Torrefacto image (just updated with correct Amazon image) to compare
  const tFile = bucket.file('cafe-photos-nobg/barco_torrefacto_grano_500g.png');
  const [tBuf] = await tFile.download();
  const tMeta = await sharp(tBuf).metadata();
  console.log('\nTorrefacto (just fixed):', tMeta.width + 'x' + tMeta.height, tBuf.length + 'B');
  console.log('Natural (old/unfixed):', meta.width + 'x' + meta.height, buf.length + 'B');
  console.log('Same image:', buf.equals(tBuf));

  // The Natural image was uploaded by the original _fix_all_photos.js which searched Amazon
  // It's 689x1040, which is a tall product shot. But it could be a WRONG product from Amazon.
  // Since the user keeps seeing a "coffee cup", the image in storage IS the problem.
  // Let's replace it with a proper image.

  // Best bet: search for the brand website or a supermarket
  console.log('\nSearching for Barco Natural image on Eroski...');
  try {
    const res = await fetch(
      'https://supermercado.eroski.es/es/search/results/?q=barco+cafe+natural+grano+500g',
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 10000,
        redirect: 'follow',
      }
    );
    console.log('Eroski status:', res.status);
    const html = await res.text();

    // Find any product images
    const allImgs = [
      ...html.matchAll(/(?:src|data-src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi),
    ];
    const productImgs = allImgs.filter(
      (m) => m[1].includes('product') || m[1].includes('img_') || m[1].includes('media')
    );
    console.log('Product images found:', productImgs.length);
    if (productImgs.length) {
      console.log(
        'Samples:',
        productImgs
          .slice(0, 5)
          .map((m) => m[1])
          .join('\n  ')
      );
    }

    // Check if Barco appears
    const barcoCount = (html.match(/[Bb]arco/g) || []).length;
    console.log("'Barco' mentions:", barcoCount);
  } catch (e) {
    console.log('Eroski error:', e.message);
  }

  process.exit(0);
})();
