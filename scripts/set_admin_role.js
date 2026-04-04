// Uso: EXPO_PUBLIC_FIREBASE_PROJECT_ID=... EXPO_PUBLIC_FIREBASE_API_KEY=... node scripts/set_admin_role.js ivancabeza@gmail.com

const fetch = require('node-fetch');

const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
const BASE_URL = `https://europe-west1-firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
  console.error('Faltan variables de entorno EXPO_PUBLIC_FIREBASE_PROJECT_ID y/o EXPO_PUBLIC_FIREBASE_API_KEY');
  process.exit(1);
}

const email = process.argv[2];
if (!email) {
  console.error('Debes indicar el email del usuario. Ejemplo: node scripts/set_admin_role.js ivancabeza@gmail.com');
  process.exit(1);
}

async function getUserByEmail(email) {
  const url = BASE_URL + ':runQuery?key=' + FIREBASE_API_KEY;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'user_profiles' }],
      where: {
        fieldFilter: {
          field: { fieldPath: 'email' },
          op: 'EQUAL',
          value: { stringValue: email },
        },
      },
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  const user = json.filter(r => r.document)[0];
  if (!user) return null;
  const id = user.document.name.split('/').pop();
  return id;
}

async function setAdminRole(uid) {
  const url = `${BASE_URL}/user_profiles/${uid}?key=${FIREBASE_API_KEY}`;
  const body = {
    fields: {
      role: { stringValue: 'admin' },
    },
  };
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res.ok) {
    console.log('Rol de administrador asignado correctamente.');
  } else {
    console.error('Error al asignar rol:', await res.text());
  }
}

(async () => {
  const uid = await getUserByEmail(email);
  if (!uid) {
    console.error('Usuario no encontrado con ese email.');
    process.exit(1);
  }
  await setAdminRole(uid);
})();
