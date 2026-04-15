// Actualiza el email de un usuario en la colección user_profiles por UID
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

const uid = process.argv[2];
const email = process.argv[3];
if (!uid || !email) {
  console.error('Uso: node scripts/update_user_email.js <uid> <email>');
  process.exit(1);
}

async function updateEmail(uid, email) {
  const url = `${BASE_URL}/user_profiles/${uid}?key=${FIREBASE_API_KEY}`;
  const body = {
    fields: {
      email: { stringValue: email },
    },
  };
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    console.log('Email actualizado correctamente.');
  } else {
    console.error('Error al actualizar email:', await res.text());
  }
}

updateEmail(uid, email);
