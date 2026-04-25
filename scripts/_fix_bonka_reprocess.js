const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
const sharp = require('sharp');

if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

const IDS = [
  'bonka_grano-colombia',
  'bonka_grano-natural',
  'bonka_grano-arabica',
  'bonka_premium-colombia',
  'bonka_molido-descafeinado-250gr',
  'bonka_molido-descafeinado-400gr',
  'bonka_premium-ecologico',
  'bonka_premium-natural',
  'bonka_molido-extrafuerte-250gr',
  'bonka_molido-mezcla-250gr',
  'bonka_molido-mezcla-500gr',
  'bonka_molido-natural-250gr',
  'bonka_molido-natural-500gr',
  '0gbaTRLkg5agxlSfqKM7',
];

(async () => {
  let ok = 0;
  for (const id of IDS) {
    const file = bucket.file('cafe-photos-nobg/' + id + '.png');
    const [buf] = await file.download();
    const meta = await sharp(buf).metadata();
    console.log(id + ': ' + meta.width + 'x' + meta.height + ' ' + buf.length + 'B');

    // Re-process with standard pipeline: white bg, 8% padding, resize to 800x800
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
      .sharpen({ sigma: 0.8 }) // mild sharpening to compensate upscale
      .png()
      .toBuffer();

    const procMeta = await sharp(processed).metadata();
    console.log('  -> ' + procMeta.width + 'x' + procMeta.height + ' ' + processed.length + 'B');

    await file.save(processed, { metadata: { contentType: 'image/png' } });
    await file.makePublic();

    const publicUrl =
      'https://storage.googleapis.com/miappdecafe.firebasestorage.app/cafe-photos-nobg/' +
      id +
      '.png';
    await db.collection('cafes').doc(id).update({
      imageUrl: publicUrl,
      imagenUrl: publicUrl,
      foto: publicUrl,
      officialPhoto: publicUrl,
      bestPhoto: publicUrl,
      'photos.selected': publicUrl,
      'photos.bgRemoved': true,
    });

    ok++;
  }
  console.log('\nDone:', ok, 'images re-processed');
  process.exit(0);
})();
