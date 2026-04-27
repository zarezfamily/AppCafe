const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').get();
  const toFix = [];

  snap.forEach((d) => {
    const data = d.data();
    const ean = String(data.ean || '').trim();
    const normalizedEan = String(data.normalizedEan || '').trim();

    // Has ean but missing normalizedEan
    if (ean && ean.length >= 8 && !normalizedEan) {
      toFix.push({ id: d.id, ean });
    }
  });

  console.log(`Cafes with ean but no normalizedEan: ${toFix.length}`);

  if (toFix.length === 0) {
    process.exit(0);
  }

  const batchSize = 500;
  for (let i = 0; i < toFix.length; i += batchSize) {
    const batch = db.batch();
    const chunk = toFix.slice(i, i + batchSize);
    for (const cafe of chunk) {
      batch.update(db.collection('cafes').doc(cafe.id), { normalizedEan: cafe.ean });
    }
    await batch.commit();
    console.log(`Batch ${Math.floor(i / batchSize) + 1}: ${chunk.length} docs`);
  }

  // Verify
  const doc = await db.collection('cafes').doc('7OCDtxmVAcnaQkA0GohV').get();
  console.log('\nNovell normalizedEan:', doc.data().normalizedEan);

  console.log(`\nFixed: ${toFix.length}`);
  process.exit(0);
})();
