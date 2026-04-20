import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function backupCafes() {
  const snapshot = await db.collection('cafes').get();

  const cafes = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  fs.writeFileSync('./cafes-backup.json', JSON.stringify(cafes, null, 2), 'utf8');

  console.log(`Backup completado: ${cafes.length} cafés exportados a cafes-backup.json`);
}

backupCafes().catch((error) => {
  console.error('Error haciendo backup:', error);
});
