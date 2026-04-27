const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').get();
  const toFix = [];

  snap.forEach((d) => {
    const data = d.data();
    const imgUrl = data.imageUrl || '';
    const isPlaceholder = !imgUrl || imgUrl.includes('placeholder') || imgUrl.includes('generic');

    // Find a real photo from other fields
    const realPhoto = [
      data.bestPhoto,
      data.officialPhoto,
      data.imagenUrl,
      data.foto,
      data.photos?.selected,
    ].find(
      (u) =>
        u &&
        typeof u === 'string' &&
        u.startsWith('http') &&
        !u.includes('placeholder') &&
        !u.includes('generic')
    );

    if (isPlaceholder && realPhoto) {
      toFix.push({ id: d.id, nombre: data.nombre, realPhoto });
    }
  });

  console.log(`Found ${toFix.length} cafes with placeholder in imageUrl field\n`);

  if (toFix.length === 0) {
    process.exit(0);
  }

  const batchSize = 500;
  for (let i = 0; i < toFix.length; i += batchSize) {
    const batch = db.batch();
    const chunk = toFix.slice(i, i + batchSize);
    for (const cafe of chunk) {
      batch.update(db.collection('cafes').doc(cafe.id), { imageUrl: cafe.realPhoto });
    }
    await batch.commit();
    console.log(`Batch ${Math.floor(i / batchSize) + 1} committed (${chunk.length} docs)`);
  }

  console.log(`\nTotal fixed: ${toFix.length}`);
  process.exit(0);
})();
