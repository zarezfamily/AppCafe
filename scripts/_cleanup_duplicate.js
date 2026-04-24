const admin = require('firebase-admin');
const sa = require('../serviceAccountKey.json');
if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
(async () => {
  // The pending case was created with docId = EAN
  const doc = await db.collection('cafes').doc('8422675000604').get();
  if (doc.exists) {
    const data = doc.data();
    console.log('Found pending:', data.nombre || '(empty)', 'status:', data.status);
    await db.collection('cafes').doc('8422675000604').delete();
    console.log('Deleted duplicate pending doc 8422675000604');
  } else {
    console.log('No pending doc with ID 8422675000604');
  }

  // Verify original still exists
  const novell = await db.collection('cafes').doc('7OCDtxmVAcnaQkA0GohV').get();
  console.log('Novell exists:', novell.exists, 'ean:', novell.data()?.ean);

  const total = await db.collection('cafes').get();
  console.log('Total cafes:', total.size);
  process.exit(0);
})();
