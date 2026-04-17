const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('../serviceAccountKey.json.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function backup() {
  console.log("📦 Descargando colección 'cafes' de Firestore...");
  const snapshot = await db.collection('cafes').get();

  if (snapshot.empty) {
    console.log("⚠️  La colección 'cafes' está vacía.");
    process.exit(0);
  }

  const data = {};
  snapshot.forEach((doc) => {
    data[doc.id] = doc.data();
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(__dirname, `../data/backup_firestore_cafes_${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');

  console.log(`✅ Backup completado: ${snapshot.size} cafés guardados en`);
  console.log(`   ${filename}`);
  process.exit(0);
}

backup().catch((err) => {
  console.error('❌ Error durante el backup:', err);
  process.exit(1);
});
