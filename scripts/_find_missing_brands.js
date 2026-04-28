const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').get();
  const brands = new Set();
  snap.forEach((d) => brands.add((d.data().marca || '').toLowerCase()));

  const check = [
    'delta',
    'saimaza',
    'santa cristina',
    'toscaf',
    'tupinamba',
    'cafento',
    'supracafe',
    'franck',
    'cafes bou',
    'home barista',
    'cornella',
    'simon levelt',
    'dabov',
    'father coffee',
    'nine streets',
    'manhattan',
    'coffeeness',
    'cafes el abuela',
    'ideal',
    'montecelio',
    'torrefacto',
    'el aguila',
    'spar',
    'catunambú',
    'flor de jamaica',
    'orbea',
    'santino',
    'cafes caracas',
    'roast club',
    'nomad',
    'thecoffee',
    'cafes templo',
    'aromas',
    'sanchez',
    'cafes siboney',
  ];

  console.log(`Total: ${snap.size} cafes, ${brands.size} brands\n`);
  const missing = [];
  const have = [];
  for (const m of check) {
    const has = [...brands].some((b) => b.includes(m));
    if (has) have.push(m);
    else missing.push(m);
  }
  console.log('MISSING brands:');
  missing.forEach((m) => console.log('  -', m));
  console.log('\nAlready have:');
  have.forEach((m) => console.log('  +', m));
  process.exit(0);
})();
