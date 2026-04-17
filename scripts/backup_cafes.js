const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const serviceAccount = require('../serviceAccountKey.json.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://miappdecafe-default-rtdb.europe-west1.firebasedatabase.app',
});

const db = admin.database();

async function backup() {
  console.log("📦 Descargando colección 'cafes'...");
  const snapshot = await db.ref('cafes').once('value');
  const data = snapshot.val();

  if (!data) {
    console.log("⚠️  La colección 'cafes' está vacía o no existe.");
    process.exit(0);
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(__dirname, `../data/backup_cafes_${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');

  const count = Object.keys(data).length;
  console.log(`✅ Backup completado: ${count} cafés guardados en`);
  console.log(`   ${filename}`);
  process.exit(0);
}

backup().catch((err) => {
  console.error('❌ Error durante el backup:', err);
  process.exit(1);
});
