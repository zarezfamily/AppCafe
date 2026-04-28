/**
 * Fix missing photos using Amazon.es product search
 * Usage: node scripts/_fix_photos_amazon.js "Brand Name"
 *
 * Amazon product images are high quality and watermark-free.
 * Pattern: https://m.media-amazon.com/images/I/{id}._AC_SL1500_.jpg
 */
const admin = require('firebase-admin');
const https = require('https');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const BRAND = process.argv[2];
if (!BRAND) {
  console.log('Usage: node scripts/_fix_photos_amazon.js "Brand"');
  process.exit(1);
}

function fetch(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
    };
    https
      .get(url, options, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetch(res.headers.location).then(resolve).catch(reject);
        }
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve(data));
      })
      .on('error', reject);
  });
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractAmazonImage(html) {
  // Amazon main product images pattern
  // Try high-res images first: media-amazon.com/images/I/...._AC_SL1500_.jpg
  const hiRes = /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_.-]+\._AC_SL1500_\.jpg/g;
  const matches = html.match(hiRes) || [];
  if (matches.length > 0) return matches[0];

  // Try medium res
  const medRes = /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_.-]+\._AC_SL1000_\.jpg/g;
  const med = html.match(medRes) || [];
  if (med.length > 0) return med[0];

  // Try any AC_ variant
  const anyAC = /https:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9+_.-]+\._AC_[^"'\s]+\.jpg/g;
  const any = html.match(anyAC) || [];
  if (any.length > 0) {
    // Get the largest: replace size with SL1500
    return any[0].replace(/_AC_[^.]+\./, '_AC_SL1500_.');
  }

  return '';
}

async function searchAmazon(productName) {
  const q = encodeURIComponent(productName + ' café');
  const url = `https://www.amazon.es/s?k=${q}&i=grocery`;
  try {
    const html = await fetch(url);
    return extractAmazonImage(html);
  } catch (e) {
    return '';
  }
}

(async () => {
  const snap = await db.collection('cafes').where('marca', '==', BRAND).get();
  const noPhoto = [];
  snap.forEach((d) => {
    const data = d.data();
    if (!(data.officialPhoto || data.photoURL)) {
      noPhoto.push({ id: d.id, nombre: data.nombre, ref: d.ref });
    }
  });

  console.log(`${BRAND}: ${snap.size} total, ${noPhoto.length} sin foto`);
  if (noPhoto.length === 0) {
    process.exit(0);
  }

  let fixed = 0;
  for (let i = 0; i < noPhoto.length; i++) {
    const c = noPhoto[i];
    const imgUrl = await searchAmazon(c.nombre);
    if (imgUrl) {
      await c.ref.update({ officialPhoto: imgUrl });
      console.log(`  FIXED: ${c.nombre}`);
      fixed++;
    } else {
      console.log(`  NO IMG: ${c.nombre}`);
    }
    if ((i + 1) % 5 === 0) console.log(`  Progress: ${i + 1}/${noPhoto.length}`);
    // Delay between requests to avoid throttling
    await delay(2000);
  }

  console.log(`\nDone. Fixed: ${fixed}/${noPhoto.length}`);
  process.exit(0);
})();
