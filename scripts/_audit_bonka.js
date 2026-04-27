const admin = require('firebase-admin');
const fetch = require('node-fetch');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();
const bucket = admin.storage().bucket();

(async () => {
  const snap = await db.collection('cafes').where('marca', '==', 'Bonka').get();
  console.log('Bonka cafes:', snap.size);

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

    let size = '?';
    let dims = '?';

    // Check if photo is in our Storage
    const isStorage = photo.includes('miappdecafe.firebasestorage.app');
    if (isStorage) {
      try {
        const filePath = photo.split('miappdecafe.firebasestorage.app/')[1]?.split('?')[0];
        if (filePath) {
          const [meta] = await bucket.file(filePath).getMetadata();
          size = meta.size;
        }
      } catch (e) {
        size = 'NOT_FOUND';
      }
    } else {
      // External URL - check content-length
      try {
        const res = await fetch(photo, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0' },
          timeout: 5000,
        });
        size = res.headers.get('content-length') || res.status;
      } catch (e) {
        size = 'ERR:' + e.code;
      }
    }

    results.push({
      id: doc.id,
      nombre: (d.nombre || '').substring(0, 50),
      photo: photo.substring(0, 100),
      isStorage,
      size,
      source: d.source || '',
    });
  }

  // Sort and display
  results.sort((a, b) => a.id.localeCompare(b.id));
  console.log('\n--- BONKA PHOTOS ---');
  for (const r of results) {
    const loc = r.isStorage ? 'STORAGE' : 'EXTERNAL';
    console.log(`${r.id}`);
    console.log(`  ${r.nombre}`);
    console.log(`  ${loc} | size: ${r.size} | src: ${r.source}`);
    console.log(`  ${r.photo}`);
    console.log();
  }

  // Summary
  const storage = results.filter((r) => r.isStorage);
  const external = results.filter((r) => !r.isStorage);
  const noPhoto = results.filter((r) => !r.photo);
  console.log(
    `Summary: ${storage.length} Storage, ${external.length} external, ${noPhoto.length} no photo`
  );

  // Check for small images (likely blurry)
  const small = results.filter((r) => r.isStorage && Number(r.size) < 50000);
  console.log(`Small Storage images (<50KB, likely blurry): ${small.length}`);
  small.forEach((r) => console.log(`  ${r.id}: ${r.size}B`));

  process.exit(0);
})();
