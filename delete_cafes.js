// delete_cafes.js — Borra todos los documentos de la colección "cafes"
const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '';
const FIREBASE_API_KEY =
  process.env.FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '';
const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function deleteAll() {
  if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
    console.log('\n⚠️  Faltan FIREBASE_PROJECT_ID y/o FIREBASE_API_KEY.\n');
    console.log(
      'Ejemplo: FIREBASE_PROJECT_ID=miappdecafe FIREBASE_API_KEY=AIza... node delete_cafes.js\n'
    );
    return;
  }
  console.log('\n🗑️  Borrando colección cafes...\n');
  let total = 0;
  let pageToken = null;

  while (true) {
    let url = `${BASE_URL}/cafes?key=${FIREBASE_API_KEY}&pageSize=20`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    const res = await fetch(url);
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
