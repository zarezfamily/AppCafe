const admin = require('firebase-admin');
const sa = require('./serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const sharp = require('sharp');
const fetch = (...a) => import('node-fetch').then(({ default: f }) => f(...a));

async function main() {
  const doc = await db.collection('cafes').doc('alcampo_561733').get();
  const data = doc.data();
  console.log('marca:', data.marca);
  console.log('officialPhoto:', data.officialPhoto);

  // Reprocess from Alcampo image
  const imgUrl = data.officialPhoto || data.imageUrl;
  if (imgUrl) {
    try {
      const resp = await fetch(imgUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 15000,
      });
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        const processed = await sharp(buf)
          .resize(800, 800, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .png()
          .toBuffer();
        const path = 'cafe-photos-nobg/alcampo_561733.png';
        const file = bucket.file(path);
        try {
          await file.delete();
        } catch {}
        await file.save(processed, {
          contentType: 'image/png',
          metadata: { cacheControl: 'public, max-age=60' },
          public: true,
          resumable: false,
        });
        const publicUrl = `https://storage.googleapis.com/miappdecafe.firebasestorage.app/${path}`;
        await db.collection('cafes').doc('alcampo_561733').update({
          fotoUrl: publicUrl,
          foto: publicUrl,
          imageUrl: publicUrl,
          officialPhoto: publicUrl,
          bestPhoto: publicUrl,
          imagenUrl: publicUrl,
          'photos.selected': publicUrl,
          'photos.original': imgUrl,
          'photos.bgRemoved': publicUrl,
        });
        console.log('OK - photo updated');
      }
    } catch (e) {
      console.log('Error:', e.message);
    }
  }
  process.exit(0);
}
main();
