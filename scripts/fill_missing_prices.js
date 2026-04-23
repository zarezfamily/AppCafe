require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Solo imprime los cafés que no tienen precio, sin intentar generarlos
async function fillPrices() {
  const snapshot = await db.collection('cafes').get();
  let count = 0;
  for (const doc of snapshot.docs) {
    const cafe = doc.data();
    if (
      cafe.precio === null ||
      cafe.precio === undefined ||
      cafe.precio === '' ||
      cafe.precio === 0
    ) {
      console.log(`Falta precio en: ${cafe.nombre}`);
      count++;
    }
  }
  console.log(`Cafés sin precio: ${count}`);
  process.exit(0);
}

fillPrices().catch((e) => {
  console.error(e);
  process.exit(1);
});
