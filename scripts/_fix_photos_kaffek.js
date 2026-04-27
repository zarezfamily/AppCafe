#!/usr/bin/env node
/**
 * _fix_photos_kaffek.js – Fix photos for Belmio, Café René, Dolce Vita
 * Discovers images from kaffek.es product pages with proper User-Agent
 */

const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

function httpGet(url, wantBuf = false) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      },
    };
    const get = (o) =>
      https
        .get(o, (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            const loc = res.headers.location.startsWith('http')
              ? res.headers.location
              : `https://${parsed.hostname}${res.headers.location}`;
            const p2 = new URL(loc);
            return get({
              hostname: p2.hostname,
              path: p2.pathname + p2.search,
              headers: o.headers,
            });
          }
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const buf = Buffer.concat(chunks);
            resolve({ data: wantBuf ? buf : buf.toString(), status: res.statusCode });
          });
          res.on('error', reject);
        })
        .on('error', reject);
    get(opts);
  });
}

async function discoverImageUrl(productUrl) {
  try {
    const { data: html, status } = await httpGet(productUrl);
    if (status !== 200) return null;
    // Match any kaffekapslen CDN product image ending in -1201.webp
    const m = html.match(
      /https:\/\/kaffekapslen\.media\/media\/catalog\/product\/cache\/[^"'\s]+?-1201\.webp/
    );
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

async function uploadPhoto(docId, imgUrl) {
  const { data: buf, status } = await httpGet(imgUrl, true);
  if (buf.length < 1000) {
    console.log(`  SKIP: too small (${buf.length}b, status:${status})`);
    return null;
  }
  const out = await sharp(buf)
    .resize(800, 800, {
      fit: 'contain',
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(out, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

function photoFields(url) {
  return {
    fotoUrl: url,
    foto: url,
    imageUrl: url,
    officialPhoto: url,
    bestPhoto: url,
    imagenUrl: url,
    photos: { selected: url, original: url, bgRemoved: url },
  };
}

(async () => {
  // Get all docs from our 3 new brands that have fuenteUrl but no photo
  const snap = await db.collection('cafes').where('fuente', '==', 'KaffeK').get();

  const targets = [];
  snap.forEach((doc) => {
    const d = doc.data();
    if (['Belmio', 'Café René', 'Dolce Vita'].includes(d.marca) && !d.fotoUrl && d.fuenteUrl) {
      targets.push({ id: doc.id, url: d.fuenteUrl, marca: d.marca });
    }
  });

  console.log(`Found ${targets.length} products without photos\n`);
  let fixed = 0,
    errors = 0;

  for (const t of targets) {
    console.log(`${t.id} (${t.marca})`);
    try {
      const imgUrl = await discoverImageUrl(t.url);
      if (!imgUrl) {
        console.log('  No image found on page');
        errors++;
        continue;
      }
      console.log(`  Image: ...${imgUrl.slice(-45)}`);
      const photoUrl = await uploadPhoto(t.id, imgUrl);
      if (photoUrl) {
        await db.collection('cafes').doc(t.id).update(photoFields(photoUrl));
        fixed++;
        console.log('  OK');
      } else {
        errors++;
      }
    } catch (e) {
      console.log(`  ERROR: ${e.message}`);
      errors++;
    }
  }

  console.log(`\n=== DONE: ${fixed} fixed, ${errors} errors ===`);
  process.exit(0);
})();
