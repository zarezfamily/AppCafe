require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Solo imprime los cafés que tienen campos vacíos, sin intentar generarlos
async function fillAllFields() {
  const snapshot = await db.collection('cafes').get();
  let totalMissing = 0;
  const FIELDS = [
    'nombre',
    'pais',
    'roaster',
    'formato',
    'descripcion',
    'notas',
    'precio',
    'ean',
    'foto',
    'origen',
    'proceso',
    'especie',
    'certificaciones',
    'sistemaCapsula',
    'marca',
    'tipoProducto',
    'intensidad',
    'cantidad',
    'tueste',
    'category',
    'coffeeCategory',
    'currency',
    'sku',
    'bestPhoto',
    'officialPhoto',
    'imageUrl',
    'urlProducto',
  ];
  for (const doc of snapshot.docs) {
    const cafe = doc.data();
    let missing = [];
    for (const field of FIELDS) {
      if (!cafe[field] || cafe[field] === '' || cafe[field] === null || cafe[field] === undefined) {
        missing.push(field);
      }
    }
    if (missing.length > 0) {
      console.log(`Faltan campos en: ${cafe.nombre} -> ${missing.join(', ')}`);
      totalMissing++;
    }
  }
  console.log(`Cafés con campos vacíos: ${totalMissing}`);
  process.exit(0);
}

fillAllFields().catch((e) => {
  console.error(e);
  process.exit(1);
});
