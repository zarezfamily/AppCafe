const admin = require('firebase-admin');
const fs = require('fs');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').get();
  const cafes = [];
  snap.forEach((d) => cafes.push({ id: d.id, ...d.data() }));

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const path = `data/golden_1000_cafes_${ts}.json`;
  fs.writeFileSync(path, JSON.stringify(cafes, null, 2));

  // Stats
  const brands = {};
  cafes.forEach((c) => {
    const m = c.marca || 'Sin marca';
    brands[m] = (brands[m] || 0) + 1;
  });
  const withPhoto = cafes.filter(
    (c) => c.imagenUrl || c.bestPhoto || c.officialPhoto || c.foto
  ).length;

  console.log(`\n🏆 GOLDEN BACKUP CREATED`);
  console.log(`📦 File: ${path}`);
  console.log(`☕ Total cafes: ${cafes.length}`);
  console.log(`📸 With photo: ${withPhoto}`);
  console.log(`🏷️  Brands: ${Object.keys(brands).length}`);
  console.log(`💾 Size: ${(fs.statSync(path).size / 1024 / 1024).toFixed(1)} MB`);
  process.exit(0);
})();
