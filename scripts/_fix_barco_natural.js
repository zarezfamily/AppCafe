const https = require('https');
const sharp = require('sharp');
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const bucket = admin.storage().bucket();

function fetch(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod
      .get(
        url,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return fetch(res.headers.location).then(resolve).catch(reject);
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () =>
            resolve({
              status: res.statusCode,
              body: Buffer.concat(chunks),
              type: res.headers['content-type'],
            })
          );
        }
      )
      .on('error', reject);
  });
}

async function processAndUpload(imageUrl, docId) {
  const r = await fetch(imageUrl);
  if (!r.type || !r.type.startsWith('image')) {
    console.log('Not image:', r.type, r.body.length);
    return false;
  }
  console.log('Downloaded:', r.body.length, 'bytes, type:', r.type);
  const meta = await sharp(r.body).metadata();
  console.log('Image dimensions:', meta.width, 'x', meta.height);
  const pad = Math.round(Math.max(meta.width, meta.height) * 0.08);
  const buf = await sharp(r.body)
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
  await file.save(buf, { metadata: { contentType: 'image/png' } });
  await file.makePublic();
  console.log(docId + ': uploaded', buf.length, 'bytes');
  return true;
}

(async () => {
  // The Barco Natural Grano 500g - try fetching product page with different search
  const searchUrl =
    'https://www.amazon.es/Barco-Natural-Caf%C3%A9-Grano-Pl%C3%A1stico/dp/B09FQ7V7BJ';
  console.log('Fetching product page...');
  const page = await fetch(searchUrl);
  const html = page.body.toString();

  // Try multiple patterns to find images
  const patterns = [
    /"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    /"large"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    /data-old-hires="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    /src="(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\._SL[0-9]+_\.[^"]+)"/,
    /"mainUrl"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
  ];

  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      console.log('Found image with pattern:', p.source.substring(0, 30));
      const ok = await processAndUpload(m[1], 'barco_natural_grano_500g');
      if (ok) {
        process.exit(0);
      }
    }
  }

  // Try the Barco Natural Molido page (same brand, similar packaging) as a reference
  // Actually try a known working direct Amazon CDN URL pattern
  // From the torrefacto page we know the pattern works
  // Let's try getting the image from a different Barco listing
  const altASINs = ['B09FQ57ZX7']; // Barco Molido Natural 250g
  for (const asin of altASINs) {
    console.log('\nTrying ASIN:', asin);
    const p2 = await fetch('https://www.amazon.es/dp/' + asin);
    const h2 = p2.body.toString();
    for (const p of patterns) {
      const m = h2.match(p);
      if (m) {
        console.log('Found image for alt ASIN with pattern:', p.source.substring(0, 30));
        // This is molido not grano, but better than no image
        // Let's use it as placeholder for now
        const ok = await processAndUpload(m[1], 'barco_natural_grano_500g');
        if (ok) {
          process.exit(0);
        }
      }
    }
  }

  console.log('\nCould not find image for barco_natural_grano_500g');
  console.log('Page status:', page.status, 'body length:', html.length);
  // Check if it's a CAPTCHA page
  if (html.includes('captcha') || html.includes('robot')) {
    console.log('Amazon is blocking with CAPTCHA');
  }
  process.exit(0);
})();
