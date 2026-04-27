const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').where('marca', '==', 'Right Side Coffee').get();
  console.log('Total Right Side docs:', snap.size);

  const batch = db.batch();
  let count = 0;

  snap.docs.forEach((d) => {
    const data = d.data();
    const url = data.officialPhoto || data.bestPhoto || data.foto || data.imageUrl;
    if (!url) return;

    // Add Shopify CDN resize param if not already present
    const resizedUrl = url.includes('?') ? url : url + '?width=600';
    if (resizedUrl === url) {
      console.log(`⏭️ ${d.id} already has params`);
      return;
    }

    console.log(`✅ ${d.id}`);
    console.log(`   ${url.split('/').pop()} → +?width=600`);

    const ref = db.collection('cafes').doc(d.id);
    batch.update(ref, {
      'photos.selected': resizedUrl,
      bestPhoto: resizedUrl,
      officialPhoto: resizedUrl,
      imageUrl: resizedUrl,
      foto: resizedUrl,
    });
    count++;
  });

  if (count > 0) {
    await batch.commit();
    console.log(`\n🎉 Updated ${count} Right Side docs with resized URLs (?width=600)`);
  } else {
    console.log('No docs needed updating');
  }
  process.exit(0);
})();
