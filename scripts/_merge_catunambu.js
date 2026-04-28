const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

(async () => {
  const snap = await db.collection('cafes').where('marca', '==', 'Catunambu').get();
  console.log('Docs con "Catunambu" (sin tilde):', snap.size);

  const snap2 = await db.collection('cafes').where('marca', '==', 'Catunambú').get();
  console.log('Docs con "Catunambú" (con tilde):', snap2.size);

  if (snap.size > 0) {
    const batch = db.batch();
    snap.forEach((d) => batch.update(d.ref, { marca: 'Catunambú' }));
    await batch.commit();
    console.log(`Renombrados ${snap.size} docs de "Catunambu" → "Catunambú"`);
    console.log(`Total Catunambú tras merge: ${snap.size + snap2.size}`);
  } else {
    console.log('Ya están unificados bajo "Catunambú"');
  }
  process.exit(0);
})();
