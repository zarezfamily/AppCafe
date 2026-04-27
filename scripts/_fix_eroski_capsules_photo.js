#!/usr/bin/env node
/** Quick fix: add photos to 3 Eroski capsule docs */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');
const https = require('https');

if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();
const PREFIX = 'cafe-photos-nobg';

function fetchBuf(url) {
  return new Promise((ok, ko) => {
    https
      .get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (r) => {
        if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location)
          return fetchBuf(
            r.headers.location.startsWith('http')
              ? r.headers.location
              : new URL(r.headers.location, url).href
          ).then(ok, ko);
        const c = [];
        r.on('data', (d) => c.push(d));
        r.on('end', () => ok(Buffer.concat(c)));
        r.on('error', ko);
      })
      .on('error', ko);
  });
}

async function upload(docId, imgUrl) {
  const buf = await fetchBuf(imgUrl);
  const proc = await sharp(buf)
    .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .png({ quality: 90 })
    .toBuffer();
  const sp = `${PREFIX}/${docId}.png`;
  const f = bucket.file(sp);
  try {
    await f.delete();
  } catch {}
  await f.save(proc, {
    resumable: false,
    contentType: 'image/png',
    metadata: { cacheControl: 'public, max-age=60' },
  });
  await f.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${sp}`;
}

async function main() {
  const imgUrl = 'https://supermercado.eroski.es//images/25458191.jpg';
  const ids = [
    'eroski_capsulas_espresso_nesp_10',
    'eroski_capsulas_intenso_nesp_10',
    'eroski_capsulas_descaf_nesp_10',
  ];
  for (const id of ids) {
    const url = await upload(id, imgUrl);
    await db
      .collection('cafes')
      .doc(id)
      .update({
        fotoUrl: url,
        foto: url,
        imageUrl: url,
        officialPhoto: url,
        bestPhoto: url,
        imagenUrl: url,
        photos: { selected: url, original: url, bgRemoved: url },
        updatedAt: new Date().toISOString(),
      });
    console.log('OK', id);
  }
  console.log('Done - 3 capsules now have photos');
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
