import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function markCafesAsLegacy() {
  const snapshot = await db.collection('cafes').get();

  if (snapshot.empty) {
    console.log('No hay cafés en la colección cafes.');
    return;
  }

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
      console.log(`Batch aplicado: ${total} cafés marcados como legacy`);
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    await batch.commit();
    console.log(`Batch final aplicado: ${total} cafés marcados como legacy`);
  }

  console.log(`Proceso terminado. Total: ${total}`);
}

markCafesAsLegacy().catch((error) => {
  console.error('Error marcando cafés como legacy:', error);
});
