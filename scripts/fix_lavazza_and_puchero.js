/**
 * fix_lavazza_and_puchero.js
 * 1. Fix Lavazza Qualità Oro (AF2gqonWWfxf4Ez7PkIy) — use kaffekapslen 1200x1200 image
 * 2. Fix all Puchero Coffee docs — use somospuchero.com product images
 *
 * Usage: node scripts/fix_lavazza_and_puchero.js
 */

const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

const LAVAZZA_ORO_PHOTO =
  'https://kaffekapslen.media/media/catalog/product/cache/74c1057f7991b4edb2bc7bdaa94de933/cb/cb-lavazza-1000g-qualita-oro-v2-1201.webp';
const PUCHERO_PHOTO =
  'https://somospuchero.com/wp-content/uploads/2024/03/Paq250g-Espresso-Peru-300x300.jpg';

async function updatePhoto(docId, newUrl, label) {
  const ref = db.collection('cafes').doc(docId);
  const doc = await ref.get();
  if (!doc.exists) {
    console.log(`  SKIP ${docId} — not found`);
    return;
  }
  await ref.update({
    foto: newUrl,
    imageUrl: newUrl,
    bestPhoto: newUrl,
    officialPhoto: newUrl,
    image: newUrl,
    'photos.selected': newUrl,
    'photos.official': [newUrl],
    'photos.source': 'official',
  });
  console.log(`  ✅ [${docId}] ${label}`);
}

async function main() {
  console.log('=== Fixing Lavazza Qualità Oro ===');
  await updatePhoto(
    'AF2gqonWWfxf4Ez7PkIy',
    LAVAZZA_ORO_PHOTO,
    'Lavazza Qualità Oro → kaffekapslen 1200x1200'
  );

  console.log('\n=== Fixing Puchero Coffee ===');
  const snap = await db.collection('cafes').get();
  let count = 0;
  for (const doc of snap.docs) {
    const d = doc.data();
    const r = (d.roaster || d.marca || '').toLowerCase();
    if (r.includes('puchero')) {
      await updatePhoto(doc.id, PUCHERO_PHOTO, d.nombre);
      count++;
    }
  }
  console.log(`\nDone: Lavazza Oro + ${count} Puchero docs updated.`);
  process.exit(0);
}

main().catch(console.error);
