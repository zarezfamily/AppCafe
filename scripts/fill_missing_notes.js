require('dotenv').config();
// Script para listar cafés sin notas de cata
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fillNotes() {
  const snapshot = await db.collection('cafes').where('notas', 'in', ['', null]).get();
  let count = 0;
  for (const doc of snapshot.docs) {
    const cafe = doc.data();
    console.log(`Falta nota en: ${cafe.nombre}`);
    count++;
  }
  console.log(`Cafés sin notas: ${count}`);
  process.exit(0);
}

fillNotes().catch((e) => {
  console.error(e);
  process.exit(1);
});
