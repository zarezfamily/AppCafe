const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  const all = await db.collection('cafes').get();

  // Search for any doc with "delta" in marca OR nombre/name
  console.log("=== Entries with 'delta' in marca or name ===");
  all.forEach((d) => {
    const data = d.data();
    const m = data.marca || '';
    const n = data.nombre || data.name || '';
    if (/delta/i.test(m) || /delta/i.test(n)) {
      console.log(`  ${d.id} | marca="${m}" | name="${n}"`);
    }
  });

  // Check Orus doc IDs
  console.log('\n=== Orus entries ===');
  all.forEach((d) => {
    if (/orus/i.test(d.id)) {
      const data = d.data();
      console.log(`  ${d.id} | marca="${data.marca}" | name="${data.nombre || data.name}"`);
    }
  });

  // Check #427 doc (serra_12594500305056)
  console.log('\n=== serra_12594500305056 (#427) ===');
  const d427 = await db.collection('cafes').doc('serra_12594500305056').get();
  if (d427.exists) {
    const dd = d427.data();
    console.log('  marca:', dd.marca, '| name:', dd.nombre || dd.name);
  }

  process.exit(0);
})();
