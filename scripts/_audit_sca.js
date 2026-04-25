const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').get();
  let total = 0,
    noSca = 0,
    hasSca = 0,
    official = 0,
    estimated = 0;
  const missing = [];
  snap.forEach((d) => {
    total++;
    const data = d.data();
    if (data.sca && typeof data.sca === 'object' && data.sca.score != null) {
      hasSca++;
      if (data.sca.type === 'official') official++;
      else estimated++;
    } else {
      noSca++;
      if (missing.length < 10) missing.push({ id: d.id, nombre: data.nombre, marca: data.marca });
    }
  });
  console.log('=== SCA Audit ===');
  console.log('Total:', total);
  console.log('Con SCA:', hasSca, `(${official} official, ${estimated} estimated)`);
  console.log('Sin SCA:', noSca);
  console.log('\nEjemplos sin SCA:');
  missing.forEach((m) => console.log(`  - ${m.nombre} (${m.marca}) [${m.id}]`));
  process.exit(0);
})();
