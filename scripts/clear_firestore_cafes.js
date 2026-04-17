const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function clearCafes() {
  console.log("🗑️  Vaciando colección 'cafes' de Firestore...");
  const snapshot = await db.collection('cafes').get();

  if (snapshot.empty) {
    console.log('⚠️  La colección ya está vacía.');
    process.exit(0);
  }

  const batchSize = 400;
  const docs = snapshot.docs;
  let deleted = 0;

  for (let i = 0; i < docs.length; i += batchSize) {
    const batch = db.batch();
    docs.slice(i, i + batchSize).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += Math.min(batchSize, docs.length - i);
    console.log(`  Eliminados ${deleted}/${docs.length}...`);
  }

  console.log(`✅ Colección 'cafes' vaciada (${deleted} documentos eliminados).`);
  process.exit(0);
}

clearCafes().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
