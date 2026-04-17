const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const cafes = require('../data/cafes.js');

async function upload() {
  console.log(`🚀 Subiendo ${cafes.length} cafés a Firestore...`);
  const now = new Date().toISOString();
  let count = 0;

  const batchSize = 400;
  for (let i = 0; i < cafes.length; i += batchSize) {
    const batch = db.batch();
    cafes.slice(i, i + batchSize).forEach((cafe) => {
      const ref = db.collection('cafes').doc();
      batch.set(ref, {
        uid: 'seed',
        fecha: now,
        foto: null,
        fuente: 'seed',
        fuentePais: 'ES',
        barcode: null,
        uniqueScans: cafe.votos ?? 0,
        popularityKey: String(cafe.votos ?? 0),
        ...cafe,
      });
      count++;
    });
    await batch.commit();
    console.log(`  Subidos ${Math.min(i + batchSize, cafes.length)}/${cafes.length}...`);
  }

  console.log(`✅ ${count} cafés subidos a Firestore.`);
  process.exit(0);
}

upload().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
