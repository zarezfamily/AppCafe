const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const https = require('https');
const http = require('http');
const sharp = require('sharp');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

// Map cafe doc IDs to bonka.es image slugs
const cafes = [
  { id: 'bonka_grano-colombia', slug: 'grano_premium_colombia_frontal' },
  { id: 'bonka_grano-natural', slug: 'grano_natural_frontal' },
  { id: 'bonka_grano-arabica', slug: 'grano_premium_arabica_frontal' },
  { id: 'bonka_premium-colombia', slug: 'molido_premium_colombia_frontal' },
  { id: 'bonka_molido-descafeinado-250gr', slug: 'molido_descafeinado_250gr_frontal' },
  { id: 'bonka_molido-descafeinado-400gr', slug: 'molido_descafeinado_400gr_frontal' },
  { id: 'bonka_premium-ecologico', slug: 'molido_premium_ecologico_frontal' },
  { id: 'bonka_premium-natural', slug: 'molido_premium_natural_frontal' },
  { id: 'bonka_molido-extrafuerte-250gr', slug: 'molido_extrafuerte_250gr_frontal' },
  { id: 'bonka_molido-mezcla-250gr', slug: 'molido_mezcla_250gr_frontal' },
  { id: 'bonka_molido-mezcla-500gr', slug: 'molido_mezcla_500gr_frontal' },
  { id: 'bonka_molido-natural-250gr', slug: 'molido_natural_250gr_frontal' },
  { id: 'bonka_molido-natural-500gr', slug: 'molido_natural_500gr_frontal' },
  { id: '0gbaTRLkg5agxlSfqKM7', slug: 'molido_natural_250gr_frontal' }, // Bonka Natural - use natural 250gr image
];

const BASE = 'https://www.bonka.es/themes/custom/bonka/img/_productos/';

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    mod
      .get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'image/png,image/webp,image/*,*/*',
            'Accept-Language': 'es-ES,es;q=0.9',
            Referer: 'https://www.bonka.es/cafe',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return fetch(res.headers.location).then(resolve).catch(reject);
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () =>
            resolve({ status: res.statusCode, body: Buffer.concat(chunks), headers: res.headers })
          );
        }
      )
      .on('error', reject);
  });
}

async function processAndUpload(buf, docId) {
  const meta = await sharp(buf).metadata();
  console.log('  Source:', meta.width + 'x' + meta.height, buf.length, 'bytes');

  if (meta.width < 300) {
    console.log('  SKIP: too small');
    return false;
  }

  const maxDim = Math.max(meta.width, meta.height);
  const pad = Math.round(maxDim * 0.08);
  const processed = await sharp(buf)
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 255, g: 255, b: 255 },
    })
    .resize(800, 800, { fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();

  const file = bucket.file('cafe-photos-nobg/' + docId + '.png');
  await file.save(processed, { metadata: { contentType: 'image/png' } });
  await file.makePublic();

  const publicUrl =
    'https://storage.googleapis.com/miappdecafe.firebasestorage.app/cafe-photos-nobg/' +
    docId +
    '.png';
  await db.collection('cafes').doc(docId).update({
    imageUrl: publicUrl,
    imagenUrl: publicUrl,
    foto: publicUrl,
    officialPhoto: publicUrl,
    bestPhoto: publicUrl,
    'photos.selected': publicUrl,
    'photos.bgRemoved': true,
  });

  console.log('  OK:', docId, processed.length, 'bytes');
  return true;
}

(async () => {
  let ok = 0,
    fail = 0;

  for (const cafe of cafes) {
    console.log(cafe.id + ':');

    // Try multiple URL patterns
    const urlVariants = [
      BASE + cafe.slug + '.png',
      BASE + cafe.slug + '.png?v12',
      BASE + cafe.slug + '.webp',
    ];

    let success = false;
    for (const url of urlVariants) {
      try {
        console.log('  Trying:', url);
        const res = await fetch(url);
        if (res.status === 200 && res.body.length > 5000) {
          success = await processAndUpload(res.body, cafe.id);
          if (success) break;
        } else {
          console.log('  ->', res.status, res.body.length, 'bytes');
        }
      } catch (e) {
        console.log('  -> ERROR:', e.message);
      }
    }

    if (success) ok++;
    else {
      fail++;
      console.log('  FAILED');
    }
  }

  console.log('\n=== DONE ===');
  console.log('OK:', ok, 'Failed:', fail);
  process.exit(0);
})();
