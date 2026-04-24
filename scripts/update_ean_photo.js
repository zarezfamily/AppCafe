const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const NEW_PHOTO =
  'https://cdn.shopify.com/s/files/1/0916/0369/7989/files/ae6a5997110dea9b38c9699d15535e7a.jpg?v=1774869783';

async function main() {
  const snap = await db.collection('cafes').where('ean', '==', '8422675000604').get();
  if (snap.empty) {
    console.log('No docs found with EAN 8422675000604');
    return;
  }
  for (const doc of snap.docs) {
    const d = doc.data();
    console.log(`Found: [${doc.id}] ${d.nombre || d.name} (${d.marca || d.roaster})`);
    console.log(`  Current foto: ${d.foto || '(none)'}`);
    console.log(`  Current imageUrl: ${d.imageUrl || '(none)'}`);
    console.log(`  Current bestPhoto: ${d.bestPhoto || '(none)'}`);

    await doc.ref.update({
      foto: NEW_PHOTO,
      imageUrl: NEW_PHOTO,
      bestPhoto: NEW_PHOTO,
      officialPhoto: NEW_PHOTO,
      image: NEW_PHOTO,
      'photos.selected': NEW_PHOTO,
      'photos.official': [NEW_PHOTO],
      'photos.source': 'official',
    });
    console.log(`  ✅ Updated to: ${NEW_PHOTO}`);
  }
}

main().catch(console.error);
