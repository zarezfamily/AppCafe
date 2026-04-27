const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').get();
  const toFix = [];

  snap.forEach((d) => {
    const data = d.data();
    const imgUrl = data.imagenUrl || '';
    const bp = data.bestPhoto || '';
    const isPlaceholder = !imgUrl || imgUrl.includes('placeholder') || imgUrl.includes('generic');
    const hasRealBest =
      bp && !bp.includes('placeholder') && !bp.includes('generic') && bp.startsWith('http');

    if (isPlaceholder && hasRealBest) {
      toFix.push({ id: d.id, nombre: data.nombre, bestPhoto: bp });
    }
  });

  console.log(`Found ${toFix.length} cafes with placeholder imagenUrl but real bestPhoto\n`);

  if (toFix.length === 0) {
    process.exit(0);
  }

  // Fix in batches of 500
  const batchSize = 500;
  for (let i = 0; i < toFix.length; i += batchSize) {
    const batch = db.batch();
    const chunk = toFix.slice(i, i + batchSize);
    for (const cafe of chunk) {
      const ref = db.collection('cafes').doc(cafe.id);
      batch.update(ref, {
        imagenUrl: cafe.bestPhoto,
        officialPhoto: cafe.bestPhoto,
        foto: cafe.bestPhoto,
        'photos.selected': cafe.bestPhoto,
      });
    }
    await batch.commit();
    console.log(`Batch ${Math.floor(i / batchSize) + 1} committed (${chunk.length} docs)`);
  }

  // Print what was fixed
  for (const cafe of toFix) {
    console.log(`  ✅ ${cafe.nombre}`);
  }

  console.log(`\nTotal fixed: ${toFix.length}`);
  process.exit(0);
})();
