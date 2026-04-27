const admin = require('firebase-admin');
const sharp = require('sharp');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const bucket = admin.storage().bucket();
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').where('marca', '==', 'Bonka').get();
  console.log('Checking dimensions of', snap.size, 'Bonka images...\n');

  const results = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    const photo =
      d.photos?.selected ||
      d.bestPhoto ||
      d.officialPhoto ||
      d.imageUrl ||
      d.imagenUrl ||
      d.foto ||
      '';
    if (!photo.includes('miappdecafe.firebasestorage.app')) continue;

    const filePath = photo.split('miappdecafe.firebasestorage.app/')[1]?.split('?')[0];
    if (!filePath) continue;

    try {
      const [buf] = await bucket.file(filePath).download();
      const meta = await sharp(buf).metadata();
      results.push({
        id: doc.id,
        nombre: (d.nombre || '').substring(0, 45),
        width: meta.width,
        height: meta.height,
        size: buf.length,
        filePath,
      });
    } catch (e) {
      results.push({
        id: doc.id,
        nombre: (d.nombre || '').substring(0, 45),
        width: 0,
        height: 0,
        size: 0,
        error: e.message,
        filePath,
      });
    }
  }

  results.sort((a, b) => a.width * a.height - b.width * b.height);

  console.log('ID'.padEnd(42) + 'WxH'.padEnd(12) + 'Size'.padEnd(10) + 'Name');
  console.log('-'.repeat(110));
  for (const r of results) {
    const dim = r.error ? 'ERROR' : `${r.width}x${r.height}`;
    const sz = r.error ? r.error : `${(r.size / 1024).toFixed(0)}KB`;
    const flag = r.width < 400 || r.height < 400 ? ' ⚠️ SMALL' : '';
    console.log(`${r.id.padEnd(42)} ${dim.padEnd(12)} ${sz.padEnd(10)} ${r.nombre}${flag}`);
  }

  const small = results.filter((r) => r.width > 0 && (r.width < 400 || r.height < 400));
  console.log(`\n${small.length} images below 400px (likely blurry)`);

  process.exit(0);
})();
