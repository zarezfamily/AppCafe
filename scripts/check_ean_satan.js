const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length)
  admin.initializeApp({
    credential: admin.credential.cert(sa),
    storageBucket: 'miappdecafe.firebasestorage.app',
  });
const db = admin.firestore();

(async () => {
  const ean = '8422675000604';
  for (const field of ['ean', 'barcode', 'codigoBarras', 'EAN']) {
    const snap = await db.collection('cafes').where(field, '==', ean).get();
    console.log(field + ' = ' + ean + ': ' + snap.size + ' results');
    snap.forEach((d) => console.log('  docId: ' + d.id + ' | nombre: ' + d.data().nombre));
  }
  const allSnap = await db.collection('cafes').get();
  let count = 0;
  allSnap.forEach((d) => {
    const data = d.data();
    if ((data.nombre && data.nombre.toLowerCase().includes('satan')) || d.id.includes('satan')) {
      count++;
      console.log(
        'SATAN: ' +
          d.id +
          ' => ' +
          data.nombre +
          ', ean=' +
          data.ean +
          ', img=' +
          (data.imagenUrl || 'NONE').substring(0, 60)
      );
    }
  });
  console.log('Total Satan docs: ' + count);
  process.exit(0);
})();
