const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').get();
  const brands = {};
  const categories = {};
  snap.forEach((doc) => {
    const d = doc.data();
    const marca = (d.marca || 'Sin marca').trim();
    brands[marca] = (brands[marca] || 0) + 1;
    const cat = d.coffeeCategory || 'unknown';
    categories[cat] = (categories[cat] || 0) + 1;
  });

  console.log('Total:', snap.size);
  console.log('\n=== Por categoría ===');
  Object.entries(categories)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  console.log('\n=== Marcas (ordenadas por cantidad) ===');
  const sorted = Object.entries(brands).sort((a, b) => b[1] - a[1]);
  sorted.forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  console.log('\nTotal marcas:', sorted.length);
  process.exit(0);
})();
