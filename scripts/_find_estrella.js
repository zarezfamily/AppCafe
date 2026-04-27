const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

(async () => {
  // Try different brand name variations
  for (const marca of [
    'La Estrella',
    'Cafes La Estrella',
    'Café La Estrella',
    'Cafés La Estrella',
    'la estrella',
  ]) {
    const snap = await db.collection('cafes').where('marca', '==', marca).get();
    if (!snap.empty) {
      console.log('Found brand:', marca, 'count:', snap.size);
      snap.forEach((d) => {
        const data = d.data();
        const photo =
          data.photos?.selected ||
          data.bestPhoto ||
          data.officialPhoto ||
          data.imageUrl ||
          data.imagenUrl ||
          data.foto ||
          '';
        console.log(d.id, '|', (data.nombre || '').substring(0, 80), '|', photo.substring(0, 120));
      });
      process.exit(0);
    }
  }
  // Fallback: search by doc ID prefix
  console.log("Searching by prefix 'estrella'...");
  const all = await db.collection('cafes').get();
  all.forEach((d) => {
    if (
      d.id.toLowerCase().includes('estrella') ||
      (d.data().marca || '').toLowerCase().includes('estrella')
    ) {
      const data = d.data();
      const photo =
        data.photos?.selected ||
        data.bestPhoto ||
        data.officialPhoto ||
        data.imageUrl ||
        data.imagenUrl ||
        data.foto ||
        '';
      console.log(
        d.id,
        '|',
        data.marca,
        '|',
        (data.nombre || '').substring(0, 80),
        '|',
        photo.substring(0, 120)
      );
    }
  });
  process.exit(0);
})();
