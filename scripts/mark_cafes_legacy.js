const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function markCafesAsLegacy() {
  const snapshot = await db.collection('cafes').get();

  let batch = db.batch();
  let count = 0;
  let total = 0;

  for (const doc of snapshot.docs) {
    batch.update(doc.ref, {
      legacy: true,
      updatedAt: new Date().toISOString(),
    });

    count += 1;
    total += 1;

    if (count === 400) {
      await batch.commit();
      console.log(`Batch aplicado: ${total}`);
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
  }

  console.log(`✔ Todos los cafés marcados como legacy (${total})`);
}

markCafesAsLegacy().catch((error) => {
  console.error('Error marcando cafés como legacy:', error);
  process.exit(1);
});
