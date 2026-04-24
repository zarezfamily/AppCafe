#!/usr/bin/env node
const admin = require('firebase-admin');
const https = require('https');
const sharp = require('sharp');
const sa = require('../serviceAccountKey.json');
if (admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
}
const db = admin.firestore();
const bucket = admin.storage().bucket();

async function run() {
  const { removeBackground } = await import('@imgly/background-removal-node');
  const url =
    'https://www.marcilla.com/siteassets/products/grain/marcilla-grano-gran-aroma-natural.png';
  const id = 'QKUAnsYTsKnyaTFmmo16';

  console.log('Downloading...');
  const buf = await new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'EtioveApp/1.0' } }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
  console.log('Downloaded', (buf.length / 1024).toFixed(0), 'KB');

  let imgBuf = await sharp(buf).png().toBuffer();
  console.log('Removing background...');
  const blob = await removeBackground(new Blob([imgBuf], { type: 'image/png' }), {
    output: { format: 'image/png' },
  });
  imgBuf = Buffer.from(await blob.arrayBuffer());
  console.log('BG removed', (imgBuf.length / 1024).toFixed(0), 'KB');

  const meta = await sharp(imgBuf).metadata();
  if (meta.width > 800 || meta.height > 800) {
    imgBuf = await sharp(imgBuf).resize(800, 800, { fit: 'inside' }).png().toBuffer();
  }

  const storagePath = 'cafe-photos-nobg/' + id + '.png';
  const file = bucket.file(storagePath);
  await file.save(Buffer.from(imgBuf), {
    metadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000' },
    public: true,
  });
  const publicUrl = 'https://storage.googleapis.com/' + bucket.name + '/' + storagePath;
  console.log('Uploaded:', publicUrl);

  await db.collection('cafes').doc(id).update({
    imagenUrl: publicUrl,
    'photos.selected': publicUrl,
    'photos.original': url,
    'photos.bgRemoved': true,
    bestPhoto: publicUrl,
  });
  console.log('Firestore updated. Done!');
  process.exit(0);
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
