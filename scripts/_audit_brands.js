const admin = require('firebase-admin');
const fs = require('fs');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').get();
  const brands = {};
  const noPhoto = {};

  snap.forEach((d) => {
    const data = d.data();
    const m = data.marca || '(sin marca)';
    brands[m] = (brands[m] || 0) + 1;
    const photo = data.officialPhoto || data.photoURL || '';
    if (!photo) noPhoto[m] = (noPhoto[m] || 0) + 1;
  });

  const sorted = Object.entries(brands).sort((a, b) => a[1] - b[1]);

  // Write to file
  const lines = [];
  const log = (s) => {
    lines.push(s);
    console.log(s);
  };

  log(`Total: ${snap.size} cafés, ${sorted.length} marcas\n`);

  log('=== Marcas con <=10 cafés ===');
  sorted
    .filter(([, c]) => c <= 10)
    .forEach(([m, c]) => {
      const np = noPhoto[m] || 0;
      const pct = np > 0 ? ` [SIN FOTO: ${np}/${c}]` : ' ✓';
      log(`  ${String(c).padStart(3)} ${m}${pct}`);
    });

  log('\n=== Marcas con 11-25 cafés ===');
  sorted
    .filter(([, c]) => c >= 11 && c <= 25)
    .forEach(([m, c]) => {
      const np = noPhoto[m] || 0;
      const pct = np > 0 ? ` [SIN FOTO: ${np}/${c}]` : ' ✓';
      log(`  ${String(c).padStart(3)} ${m}${pct}`);
    });

  // Summary
  const totalNoPhoto = Object.values(noPhoto).reduce((a, b) => a + b, 0);
  log(`\n=== Resumen fotos ===`);
  log(`Cafés sin foto: ${totalNoPhoto}/${snap.size}`);
  log('Peores marcas (más sin foto):');
  Object.entries(noPhoto)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .forEach(([m, np]) => {
      log(`  ${String(np).padStart(3)} sin foto de ${brands[m]} - ${m}`);
    });

  fs.writeFileSync('audit_brands_output.txt', lines.join('\n'), 'utf8');
  console.log('\nGuardado en audit_brands_output.txt');

  process.exit(0);
})();
