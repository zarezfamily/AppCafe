/**
 * Remove watermark from soysuper URLs in officialPhoto field
 * Replaces .wmark. with . in all soysuper URLs
 */
const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').get();
  let count = 0;
  let updated = 0;

  const batch = [];
  snap.forEach((d) => {
    const data = d.data();
    const url = data.officialPhoto || '';
    if (url.includes('.wmark.')) {
      batch.push({ ref: d.ref, oldUrl: url, newUrl: url.replace('.wmark.', '.') });
      count++;
    }
  });

  console.log(`Found ${count} docs with .wmark. in officialPhoto`);

  // Process in batches of 500 (Firestore limit)
  for (let i = 0; i < batch.length; i += 500) {
    const chunk = batch.slice(i, i + 500);
    const fb = db.batch();
    for (const item of chunk) {
      fb.update(item.ref, { officialPhoto: item.newUrl });
    }
    await fb.commit();
    updated += chunk.length;
    console.log(`  Updated ${updated}/${count}`);
  }

  console.log(`Done. Removed .wmark. from ${updated} URLs`);
  process.exit(0);
})();
