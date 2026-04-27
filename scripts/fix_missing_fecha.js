require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixMissingFecha() {
  console.log('Buscando cafés sin campo "fecha" en Firestore...\n');

  const snapshot = await db.collection('cafes').get();
  console.log(`Total documentos en Firestore: ${snapshot.size}`);

  let sinFecha = 0;
  let conFecha = 0;
  let fixed = 0;
  const marcasSinFecha = {};

  for (const doc of snapshot.docs) {
    const data = doc.data();

    if (!data.fecha) {
      sinFecha++;
      const marca = data.marca || data.roaster || '(sin marca)';
      marcasSinFecha[marca] = (marcasSinFecha[marca] || 0) + 1;

      // Usar createdAt, updatedAt, o la fecha actual como fallback
      const fecha = data.createdAt || data.updatedAt || data.approvedAt || new Date().toISOString();

      await doc.ref.update({ fecha });
      fixed++;

      if (fixed <= 20) {
        console.log(`  Fijado: ${data.nombre || doc.id} (marca: ${marca}) -> fecha: ${fecha}`);
      }
    } else {
      conFecha++;
    }
  }

  console.log(`\n--- RESUMEN ---`);
  console.log(`Con fecha: ${conFecha}`);
  console.log(`Sin fecha (ahora fijados): ${sinFecha}`);
  console.log(`Total fijados: ${fixed}`);

  if (Object.keys(marcasSinFecha).length > 0) {
    console.log(`\nMarcas afectadas:`);
    for (const [marca, count] of Object.entries(marcasSinFecha).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${marca}: ${count} cafés`);
    }
  }

  if (sinFecha === 0) {
    console.log('\n✅ Todos los cafés ya tenían campo "fecha". No se necesitaron cambios.');
  } else {
    console.log(`\n✅ Se añadió "fecha" a ${fixed} cafés. Ahora deberían aparecer en el buscador.`);
  }

  process.exit(0);
}

fixMissingFecha().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
