require('dotenv').config();
const admin = require('firebase-admin');
const fs = require('fs');
const sa = require('../serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();

async function main() {
  const backup = JSON.parse(fs.readFileSync('cafes-backup.json', 'utf8'));
  const arr = Array.isArray(backup) ? backup : Object.values(backup);

  console.log(`Documentos en backup: ${arr.length}`);

  // Check which ones are missing from Firestore
  const snapshot = await db.collection('cafes').get();
  const existingIds = new Set(snapshot.docs.map((d) => d.id));
  console.log(`Documentos actuales en Firestore: ${existingIds.size}`);

  const missing = arr.filter((c) => c.id && !existingIds.has(c.id));
  console.log(`Documentos a restaurar: ${missing.length}\n`);

  let restored = 0;
  for (const cafe of missing) {
    const docId = cafe.id;
    const data = { ...cafe };
    delete data.id; // id goes as doc reference, not field

    await db.collection('cafes').doc(docId).set(data);
    restored++;
    if (restored <= 20) {
      console.log(`  ✅ ${cafe.nombre || docId} (${cafe.marca || cafe.roaster || ''})`);
    }
  }

  if (restored > 20) {
    console.log(`  ... y ${restored - 20} más`);
  }

  console.log(`\n✅ ${restored} cafés restaurados.`);
  console.log(`Total en Firestore ahora: ${existingIds.size + restored}`);

  process.exit(0);
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
