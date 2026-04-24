const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const ean = '8422675000604';

  // 1) Try by doc ID
  const byId = await db.collection('cafes').doc(ean).get();
  console.log('1) Doc ID =', ean, '→', byId.exists ? 'EXISTS' : 'NOT FOUND');

  // 2) Query by normalizedEan
  const byNorm = await db.collection('cafes').where('normalizedEan', '==', ean).get();
  console.log('2) normalizedEan ==', ean, '→', byNorm.size, 'results');
  byNorm.forEach((d) => console.log('   ', d.id, d.data().nombre));

  // 3) Query by ean
  const byEan = await db.collection('cafes').where('ean', '==', ean).get();
  console.log('3) ean ==', ean, '→', byEan.size, 'results');
  byEan.forEach((d) => console.log('   ', d.id, d.data().nombre));

  // 4) Check the known doc
  const novell = await db.collection('cafes').doc('7OCDtxmVAcnaQkA0GohV').get();
  if (novell.exists) {
    const d = novell.data();
    console.log('\n4) Doc 7OCDtxmVAcnaQkA0GohV:');
    console.log('   ean:', JSON.stringify(d.ean));
    console.log('   normalizedEan:', JSON.stringify(d.normalizedEan));
    console.log('   ean type:', typeof d.ean);
    console.log('   normalizedEan type:', typeof d.normalizedEan);
  }

  // 5) Check if a NEW pending doc was created with that EAN
  const allSnap = await db.collection('cafes').get();
  let found = 0;
  allSnap.forEach((d) => {
    const data = d.data();
    if (
      String(data.ean || '') === ean ||
      String(data.normalizedEan || '') === ean ||
      d.id === ean
    ) {
      found++;
      console.log('\n5) Match:', d.id);
      console.log('   nombre:', data.nombre);
      console.log('   status:', data.status);
      console.log('   ean:', JSON.stringify(data.ean), typeof data.ean);
      console.log(
        '   normalizedEan:',
        JSON.stringify(data.normalizedEan),
        typeof data.normalizedEan
      );
    }
  });
  console.log('\nTotal matches:', found);

  process.exit(0);
})();
