// delete_cafes.js — Borra todos los documentos de la colección "cafes"
const FIREBASE_PROJECT_ID = "miappdecafe";
const FIREBASE_API_KEY    = "AIzaSyA1BcU0iRk3HyFtV92CLrnalHFKLaOWH24";
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function deleteAll() {
  console.log('\n🗑️  Borrando colección cafes...\n');
  let total = 0;
  let pageToken = null;

  while (true) {
    let url = `${BASE_URL}/cafes?key=${FIREBASE_API_KEY}&pageSize=20`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    const res  = await fetch(url);
    const json = await res.json();
    if (!json.documents || json.documents.length === 0) break;

    for (const doc of json.documents) {
      const docUrl = `https://firestore.googleapis.com/v1/${doc.name}?key=${FIREBASE_API_KEY}`;
      await fetch(docUrl, { method: 'DELETE' });
      total++;
      process.stdout.write(`\r🗑️  Borrados: ${total}`);
      await sleep(80);
    }
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }
  console.log(`\n✅ Listo. ${total} documentos eliminados.\n`);
}

deleteAll();
