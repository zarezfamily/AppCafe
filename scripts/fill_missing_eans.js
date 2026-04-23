require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Solo imprime los cafés que no tienen EAN, sin intentar generarlos
async function fillEANs() {
  const snapshot = await db.collection('cafes').get();
  let count = 0;
  for (const doc of snapshot.docs) {
    const cafe = doc.data();
    if (!cafe.ean || cafe.ean === '' || cafe.ean === null || cafe.ean === undefined) {
      console.log(`Falta EAN en: ${cafe.nombre}`);
      count++;
    }
  }
  console.log(`Cafés sin EAN: ${count}`);
  process.exit(0);
}

fillEANs().catch((e) => {
  console.error(e);
  process.exit(1);
});
