// Script para importar cafés comerciales a Firestore con los campos estándar
const admin = require('firebase-admin');
const cafes = require('../data/cafes_import_comerciales.json');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function importCafes() {
  for (const cafe of cafes) {
    const doc = {
      nombre: cafe.nombre,
      pais: cafe.pais,
      roaster: cafe.roaster,
      formato: cafe.formato,
      image: cafe.imagen,
      descripcion: cafe.descripcion,
      precio: cafe.precio,
      // Campos estándar extra
      region: '',
      finca: '',
      productor: '',
      altura: null,
      variedad: '',
      proceso: '',
      secado: '',
      tueste: '',
      fechaTueste: null,
      notas: '',
      acidez: '',
      cuerpo: '',
      regusto: '',
      puntuacion: null,
      sca: null,
      votos: 0,
      certificaciones: null,
      preparacion: '',
      appVisible: true,
      reviewStatus: 'approved',
      source: 'import_comercial_2026',
    };
    await db.collection('cafes').add(doc);
    console.log(`Importado: ${cafe.nombre}`);
  }
  console.log('Importación finalizada.');
  process.exit(0);
}

importCafes().catch((e) => {
  console.error(e);
  process.exit(1);
});
