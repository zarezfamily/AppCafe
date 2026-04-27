const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

(async () => {
  // Search by EAN
  for (const ean of ['7613033174667', '7613032396350']) {
    let q = await db.collection('cafes').where('ean', '==', ean).get();
    if (q.empty) q = await db.collection('cafes').where('codigoBarras', '==', ean).get();
    if (q.empty) {
      console.log(`EAN ${ean}: NOT FOUND`);
    } else {
      q.forEach((d) =>
        console.log(
          `EAN ${ean}: docId=${d.id}, name=${d.data().nombre || d.data().name}, marca=${d.data().marca}`
        )
      );
    }
  }

  // Search for Dolce Gusto products
  console.log('\n--- Dolce Gusto products ---');
  const dgSnap = await db.collection('cafes').where('marca', '==', 'Dolce Gusto').get();
  dgSnap.forEach((d) => {
    const data = d.data();
    console.log(
      `  ${d.id}: ${data.nombre || data.name} | ean=${data.ean || data.codigoBarras || 'N/A'}`
    );
  });

  // Search for Orus products
  console.log('\n--- Cafes Orus products ---');
  const orusSnap = await db.collection('cafes').where('marca', '==', 'Cafes Orus').get();
  orusSnap.forEach((d) => {
    const data = d.data();
    console.log(`  ${d.id}: ${data.nombre || data.name}`);
  });

  // Search for Pont products
  console.log('\n--- Cafes Pont products ---');
  const pontSnap = await db.collection('cafes').where('marca', '==', 'Cafès Pont').get();
  pontSnap.forEach((d) => {
    const data = d.data();
    console.log(`  ${d.id}: ${data.nombre || data.name}`);
  });

  process.exit(0);
})();
