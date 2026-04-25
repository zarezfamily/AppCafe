// Fix bad photos - uses verified Amazon/OpenFoodFacts URLs
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');
const http = require('http');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

const FIXES = [
  {
    id: 'uLCcJb3oUGtdbxGmtoQf',
    nombre: 'Saimaza Gran Selección',
    sourceUrl: 'https://m.media-amazon.com/images/I/61V0-70dtoL._AC_SL1500_.jpg',
  },
  {
    id: 'k32C1FfcqVaauDvzAqQU',
    nombre: 'Nespresso Ristretto',
    sourceUrl:
      'https://images.openfoodfacts.org/images/products/763/042/872/0643/front_es.3.400.jpg',
  },
  {
    id: 'daddy_long_legs_kenya_250g',
    nombre: 'Daddy Long Legs Kenya AA',
    sourceUrl:
      'https://www.daddylonglegs.ie/cdn/shop/products/Kenya_AA_PNG.png?v=1678900000&width=800',
    fallbacks: [
      'https://www.daddylonglegs.ie/cdn/shop/files/Kenya_AA.png?width=800',
      'https://www.daddylonglegs.ie/cdn/shop/products/KenyaAA.png?width=800',
    ],
  },
  {
    id: 'daddy_long_legs_house_blend_250g',
    nombre: 'Daddy Long Legs House Blend',
    sourceUrl:
      'https://www.daddylonglegs.ie/cdn/shop/products/House_Blend_PNG.png?v=1678900000&width=800',
    fallbacks: [
      'https://www.daddylonglegs.ie/cdn/shop/files/House_Blend.png?width=800',
      'https://www.daddylonglegs.ie/cdn/shop/products/HouseBlend.png?width=800',
    ],
  },
  {
    id: 'starbucks-starbucks-colombia',
    nombre: 'Starbucks Colombia Medium Roast',
    sourceUrl: 'https://m.media-amazon.com/images/I/71pAByTnxvL._AC_SL1500_.jpg',
    fallbacks: [
      'https://m.media-amazon.com/images/I/81GlKR+qFGL._AC_SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71TzNPQcZ9L._AC_SL1500_.jpg',
    ],
  },
  {
    id: 'lacolombe_lyon',
    nombre: 'Lyon (La Colombe)',
    sourceUrl: 'https://www.lacolombe.com/cdn/shop/products/Lyon_12oz_WB_Front_1400x.png',
    fallbacks: [
      'https://www.lacolombe.com/cdn/shop/files/Lyon_12oz_WB_Front_1400x.png',
      'https://www.lacolombe.com/cdn/shop/products/Lyon_French_Roast_WB_12oz_Front.png',
    ],
  },
  {
    id: 'lacolombe_bowery-blend',
    nombre: 'Bowery Blend (La Colombe)',
    sourceUrl: 'https://www.lacolombe.com/cdn/shop/products/BoweryBlend_12oz_WB_Front_1400x.png',
    fallbacks: [
      'https://www.lacolombe.com/cdn/shop/files/BoweryBlend_12oz_WB_Front_1400x.png',
      'https://www.lacolombe.com/cdn/shop/products/Bowery_Blend_WB_12oz_Front.png',
    ],
  },
];

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(
      url,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        },
        timeout: 15000,
      },
      (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return downloadImage(res.headers.location).then(resolve).catch(reject);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function tryDownload(urls) {
  for (const url of urls) {
    try {
      const buf = await downloadImage(url);
      if (buf.length > 5000) return { buf, url };
    } catch (_e) {
      /* try next */
    }
  }
  return null;
}

async function processAndUpload(docId, imageBuffer) {
  const processed = await sharp(imageBuffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();

  const storagePath = `cafe-photos-nobg/${docId}.png`;
  const file = bucket.file(storagePath);
  await file.save(processed, {
    metadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000' },
    public: true,
  });

  return `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
}

async function updateFirestore(docId, photoUrl, originalUrl) {
  await db.collection('cafes').doc(docId).update({
    'photos.selected': photoUrl,
    'photos.bgRemoved': false,
    'photos.original': originalUrl,
    bestPhoto: photoUrl,
    officialPhoto: photoUrl,
    imageUrl: originalUrl,
    imagenUrl: photoUrl,
    foto: photoUrl,
    updatedAt: new Date().toISOString(),
  });
}

(async () => {
  let ok = 0,
    fail = 0;

  for (const fix of FIXES) {
    const urls = [fix.sourceUrl, ...(fix.fallbacks || [])];
    console.log(`\n→ ${fix.nombre} [${fix.id}]`);

    const result = await tryDownload(urls);
    if (!result) {
      console.log(`  ✗ All URLs failed`);
      fail++;
      continue;
    }

    console.log(`  Downloaded ${result.buf.length} bytes from ${result.url}`);
    try {
      const photoUrl = await processAndUpload(fix.id, result.buf);
      await updateFirestore(fix.id, photoUrl, result.url);
      console.log(`  ✓ Updated: ${photoUrl}`);
      ok++;
    } catch (err) {
      console.log(`  ✗ Upload/update error: ${err.message}`);
      fail++;
    }
  }

  console.log(`\n=== Done: ${ok} fixed, ${fail} failed ===`);
  process.exit(0);
})();
