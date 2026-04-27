#!/usr/bin/env node
/** Fix 5 La Estrella photos that failed with wrong Amazon URLs */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

function fetchBuf(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod
      .get(
        url,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const loc = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, url).href;
            return fetchBuf(loc).then(resolve, reject);
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
          res.on('error', reject);
        }
      )
      .on('error', reject);
  });
}

async function processAndUpload(docId, imgUrl) {
  const buf = await fetchBuf(imgUrl);
  console.log('  Downloaded', buf.length, 'bytes for', docId);
  const processed = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(processed, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

const fixes = [
  {
    id: 'laestrella_molido_natural',
    imgUrl: 'https://m.media-amazon.com/images/I/71w21uG3J%2BL._AC_SY879_.jpg',
  },
  {
    id: 'laestrella_molido_descafeinado_mezcla',
    imgUrl: 'https://m.media-amazon.com/images/I/71nnBTkR8vL._AC_SY879_.jpg',
  },
  {
    id: 'laestrella_grano_natural',
    imgUrl: 'https://m.media-amazon.com/images/I/81eVtAHhizL._AC_SL1500_.jpg',
  },
  {
    id: 'laestrella_grano_torrefacto',
    imgUrl: 'https://m.media-amazon.com/images/I/815lrrz3YlL._AC_SL1500_.jpg',
  },
  {
    id: 'laestrella_grano_premium',
    imgUrl: 'https://m.media-amazon.com/images/I/71cxRJ4wLwL._AC_SY879_.jpg',
  },
];

(async () => {
  for (const f of fixes) {
    try {
      const photoUrl = await processAndUpload(f.id, f.imgUrl);
      await db.collection('cafes').doc(f.id).update({
        officialPhoto: photoUrl,
        bestPhoto: photoUrl,
        imageUrl: photoUrl,
        foto: photoUrl,
        fotoUrl: photoUrl,
        imagenUrl: photoUrl,
        'photos.selected': photoUrl,
        'photos.original': f.imgUrl,
        'photos.bgRemoved': photoUrl,
      });
      console.log('  OK:', f.id);
    } catch (e) {
      console.error('  FAIL:', f.id, e.message);
    }
  }
  console.log('Done!');
  process.exit(0);
})();
