require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixBadPrices() {
  console.log('Buscando cafés con precios incorrectos en Firestore...\n');

  const snapshot = await db.collection('cafes').get();
  console.log(`Total documentos: ${snapshot.size}`);

  let fixed = 0;
  let removed = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const precio = Number(data.precio);

    if (!Number.isFinite(precio) || precio <= 0) continue;

    if (precio > 100) {
      // Precio absurdamente alto -> quitar
      await doc.ref.update({ precio: null });
      console.log(`Eliminado precio ${precio}€ de: ${data.nombre} (${data.marca || ''})`);
      removed++;
    } else if (precio < 3) {
      // Precio demasiado bajo -> quitar
      await doc.ref.update({ precio: null });
      console.log(`Eliminado precio ${precio}€ de: ${data.nombre} (${data.marca || ''})`);
      removed++;
    }
  }

  console.log(`\n--- RESUMEN ---`);
  console.log(`Precios eliminados por ser > 100€ o < 3€: ${removed}`);
  process.exit(0);
}

fixBadPrices().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
