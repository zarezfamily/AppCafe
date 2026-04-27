const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  // Search for all variations of that EAN
  const queries = ['842267500604', '8422675000604', '08422675000604'];
  const snap = await db.collection('cafes').get();

  snap.forEach((d) => {
    const data = d.data();
    const ean = String(data.ean || '');
    const normalizedEan = String(data.normalizedEan || '');

    if (
      queries.some(
        (q) => ean.includes(q) || normalizedEan.includes(q) || ean === q || normalizedEan === q
      )
    ) {
      console.log('=== FOUND ===');
      console.log('id:', d.id);
      console.log('nombre:', data.nombre);
      console.log('marca:', data.marca);
      console.log('ean:', data.ean);
      console.log('normalizedEan:', data.normalizedEan);
      console.log('status:', data.status);
      console.log('');
    }
  });

  // Also check the doc we know about
  const doc = await db.collection('cafes').doc('7OCDtxmVAcnaQkA0GohV').get();
  if (doc.exists) {
    const d = doc.data();
    console.log('=== Doc 7OCDtxmVAcnaQkA0GohV ===');
    console.log('nombre:', d.nombre);
    console.log('ean:', d.ean);
    console.log('normalizedEan:', d.normalizedEan);
  }

  process.exit(0);
})();
