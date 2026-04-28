/**
 * Fix missing photos for supermarket brands using soysuper.com
 * Usage: node scripts/_fix_photos_soysuper.js "Consum"
 */
const admin = require('firebase-admin');
const https = require('https');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const BRAND = process.argv[2] || 'Consum';

function fetch(url, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const req = https
      .get(
        url,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          timeout: timeoutMs,
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            return fetch(res.headers.location, timeoutMs).then(resolve).catch(reject);
          }
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve(data));
        }
      )
      .on('error', reject)
      .on('timeout', () => {
        req.destroy();
        reject(new Error('timeout'));
      });
  });
}

function extractImage(html, productName) {
  // soysuper uses pattern: https://a{0-2}.soysuper.com/{hash}.{w}.{h}.0.min.wmark.{hash2}.jpg
  // We want the larger version without watermark - replace dimensions with 750.750 and remove .wmark
  const re = /https:\/\/a\d\.soysuper\.com\/[a-f0-9]+\.\d+\.\d+\.\d+\.min\.wmark\.[a-f0-9]+\.jpg/g;
  const matches = html.match(re) || [];
  // Return the first unique image, scaled up and without watermark
  if (matches.length > 0) {
    return matches[0].replace(/\.\d+\.\d+\.0\.min/, '.750.750.0.min').replace('.wmark.', '.');
  }
  return '';
}

async function searchProduct(nombre, marca) {
  // Include brand in search if product name doesn't already contain it
  const searchTerm = nombre.toLowerCase().includes(marca.toLowerCase())
    ? nombre
    : `${marca} ${nombre}`;
  const q = encodeURIComponent(searchTerm);
  const url = `https://soysuper.com/search?q=${q}`;
  try {
    const html = await fetch(url);
    return extractImage(html, nombre);
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

  let fixed = 0;
  for (let i = 0; i < noPhoto.length; i++) {
    const c = noPhoto[i];
    const imgUrl = await searchProduct(c.nombre, BRAND);
    if (imgUrl) {
      await c.ref.update({ officialPhoto: imgUrl });
      console.log(`  FIXED: ${c.nombre}`);
      fixed++;
    } else {
      console.log(`  NO IMG: ${c.nombre}`);
    }
    if ((i + 1) % 5 === 0) console.log(`  Progress: ${i + 1}/${noPhoto.length}`);
  }

  console.log(`\nDone. Fixed: ${fixed}/${noPhoto.length}`);
  process.exit(0);
})();
