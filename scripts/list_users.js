// Lista todos los usuarios y sus emails en la colección user_profiles
const fetch = require('node-fetch');

const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE_URL = `https://europe-west1-firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
  console.error(
    'Faltan variables de entorno EXPO_PUBLIC_FIREBASE_PROJECT_ID y/o EXPO_PUBLIC_FIREBASE_API_KEY'
  );
  process.exit(1);
}

async function listUsers() {
  const url = `${BASE_URL}/user_profiles?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.documents) {
    console.log('No hay usuarios en la base de datos.');
    return;
  }
  json.documents.forEach((doc) => {
    const id = doc.name.split('/').pop();
    const email = doc.fields.email ? doc.fields.email.stringValue : '(sin email)';
    console.log(`ID: ${id} | Email: ${email}`);
  });
}

listUsers();
