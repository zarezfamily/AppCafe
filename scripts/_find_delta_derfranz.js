const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  // Find all Delta-related brands
  const all = await db.collection('cafes').get();
  const deltas = [];
  all.forEach((d) => {
    const m = d.data().marca || '';
    if (/delta/i.test(m))
      deltas.push({ id: d.id, marca: m, name: d.data().nombre || d.data().name });
  });
  console.log('Delta-related entries:', deltas.length);
  deltas.forEach((d) => console.log(`  ${d.id} | marca="${d.marca}" | name="${d.name}"`));

  // Also find Der-Franz
  const derfranz = [];
  all.forEach((d) => {
    const m = d.data().marca || '';
    if (/franz/i.test(m))
      derfranz.push({
        id: d.id,
        marca: m,
        name: d.data().nombre || d.data().name,
        foto: (d.data().fotoUrl || d.data().foto || d.data().imageUrl || 'none').substring(0, 80),
      });
  });
  console.log('\nDer-Franz entries:', derfranz.length);
  derfranz.forEach((d) =>
    console.log(`  ${d.id} | marca="${d.marca}" | name="${d.name}" | foto=${d.foto}`)
  );

  // Also find L'OR
  const lor = [];
  all.forEach((d) => {
    const m = d.data().marca || '';
    if (/l.or/i.test(m)) lor.push({ id: d.id, marca: m, name: d.data().nombre || d.data().name });
  });
  console.log("\nL'OR entries:", lor.length);
  lor.forEach((d) => console.log(`  ${d.id} | marca="${d.marca}" | name="${d.name}"`));

  process.exit(0);
})();
