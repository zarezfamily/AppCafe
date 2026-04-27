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
const db = admin.firestore();

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
          timeout: 10000,
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const loc = res.headers.location.startsWith('http')
              ? res.headers.location
              : new URL(res.headers.location, url).href;
            return fetch(loc).then(resolve).catch(reject);
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
      .on('error', reject)
      .on('timeout', () => reject(new Error('timeout')));
  });
}

async function processAndUpload(imageUrl, docId) {
  try {
    const r = await fetch(imageUrl);
    if (!r.type || !r.type.startsWith('image') || r.body.length < 5000) {
      console.log('  Skip: not valid image or too small:', r.type, r.body.length);
      return false;
    }
    const meta = await sharp(r.body).metadata();
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
    const url = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/cafe-photos-nobg/${docId}.png`;
    await db.collection('cafes').doc(docId).update({
      imageUrl: url,
      imagenUrl: url,
      foto: url,
      officialPhoto: url,
      bestPhoto: url,
      'photos.selected': url,
      'photos.bgRemoved': true,
    });
    console.log('  OK:', docId, buf.length, 'bytes');
    return true;
  } catch (e) {
    console.log('  Error:', e.message);
    return false;
  }
}

async function scrapeAmazonImage(asin) {
  try {
    const page = await fetch('https://www.amazon.es/dp/' + asin);
    const html = page.body.toString();
    const patterns = [
      /"hiRes"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
      /"large"\s*:\s*"(https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+)"/,
    ];
    for (const p of patterns) {
      const m = html.match(p);
      if (m) return m[1];
    }
  } catch (e) {}
  return null;
}

// Bio Organic is Lidl's own brand - these are sold in Lidl stores
// Try Amazon, and also try Lidl's CDN patterns
const cafes = [
  {
    id: 'lidl-cafe-en-grano-bio-organic-peru',
    search: 'bio organic peru cafe grano lidl',
    amazonTerms: 'Bio+Organic+Peru+cafe+grano+500g',
  },
  { id: 'lidl-cafe-en-grano-bio-organic-honduras', search: 'bio organic honduras cafe grano lidl' },
  { id: 'lidl-cafe-en-grano-bio-organic-mexico', search: 'bio organic mexico cafe grano lidl' },
  {
    id: 'lidl-cafe-en-grano-bio-organic-descafeinado',
    search: 'bio organic descafeinado cafe grano lidl',
  },
  { id: 'lidl-cafe-molido-bio-organic-colombia', search: 'bio organic colombia cafe molido lidl' },
  { id: 'lidl-cafe-molido-bio-organic-etiopia', search: 'bio organic etiopia cafe molido lidl' },
  { id: 'lidl-cafe-molido-bio-organic-blend', search: 'bio organic blend cafe molido lidl' },
  {
    id: 'lidl-cafe-molido-bio-organic-descafeinado',
    search: 'bio organic descafeinado cafe molido lidl',
  },
  { id: 'lidl-cafe-capsulas-bio-organic-espresso', search: 'bio organic espresso capsulas lidl' },
  { id: 'lidl-cafe-capsulas-bio-organic-lungo', search: 'bio organic lungo capsulas lidl' },
];

// Known Lidl image CDN patterns
const lidlCDN = [
  // Lidl uses sortiment.lidl.de or assets.lidl
  'https://assets.lidl.com/is/image/LIDL/',
];

(async () => {
  let ok = 0,
    fail = 0;

  // Try scraping Lidl.es search results for image URLs
  for (const c of cafes) {
    console.log(c.id + ':');

    // Strategy 1: Try Lidl.es product search
    try {
      const searchUrl = 'https://www.lidl.es/q/search?q=' + encodeURIComponent(c.search);
      const resp = await fetch(searchUrl);
      const html = resp.body.toString();
      // Look for product image URLs in the response
      const imgMatch = html.match(/https:\/\/[^"]*lidl[^"]*\.(?:jpg|jpeg|png|webp)/gi);
      if (imgMatch && imgMatch.length > 0) {
        // Find the most relevant image (largest, product-related)
        for (const imgUrl of imgMatch.slice(0, 3)) {
          if (
            imgUrl.includes('product') ||
            imgUrl.includes('sortiment') ||
            imgUrl.includes('LIDL')
          ) {
            console.log('  Found Lidl image:', imgUrl.substring(0, 80));
            if (await processAndUpload(imgUrl, c.id)) {
              ok++;
              continue;
            }
          }
        }
      }
    } catch (e) {
      /* ignore */
    }

    // Strategy 2: Try a direct Lidl sortiment URL pattern
    // Lidl uses: https://www.lidl.es/media/product/0/0/0/0/{EAN}/...
    // Without EAN we can't construct this. Skip.

    // Strategy 3: Try Amazon search for these products
    try {
      const amzUrl =
        'https://www.amazon.es/s?k=' +
        encodeURIComponent(
          'Bio Organic ' + c.id.replace('lidl-cafe-', '').replace(/-/g, ' ') + ' cafe lidl'
        );
      const resp = await fetch(amzUrl);
      const html = resp.body.toString();
      // Find first product ASIN
      const asinMatch = html.match(/\/dp\/(B[A-Z0-9]{9})/);
      if (asinMatch) {
        console.log('  Found Amazon ASIN:', asinMatch[1]);
        const imgUrl = await scrapeAmazonImage(asinMatch[1]);
        if (imgUrl) {
          console.log('  Found Amazon image');
          if (await processAndUpload(imgUrl, c.id)) {
            ok++;
            continue;
          }
        }
      }
    } catch (e) {
      /* ignore */
    }

    // Strategy 4: Try Google Shopping image
    try {
      const gUrl =
        'https://www.google.com/search?q=' +
        encodeURIComponent(c.search + ' foto producto') +
        '&tbm=isch';
      const resp = await fetch(gUrl);
      const html = resp.body.toString();
      // Find product images in Google results
      const imgMatches = html.match(/https:\/\/encrypted-tbn[^"]+/g);
      if (imgMatches && imgMatches.length > 0) {
        console.log('  Trying Google thumbnail...');
        if (await processAndUpload(imgMatches[0].replace(/&amp;/g, '&'), c.id)) {
          ok++;
          continue;
        }
      }
    } catch (e) {
      /* ignore */
    }

    fail++;
    console.log('  NO IMAGE FOUND');
  }

  console.log('\n=== DONE ===');
  console.log('OK:', ok, 'Failed:', fail);
  process.exit(0);
})();
