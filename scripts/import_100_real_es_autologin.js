const fs = require('fs');
const path = require('path');

const readEnv = () => {
  const envPath = path.join(process.cwd(), '.env');
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const clean = lines.filter((line) => line.trim().startsWith('#') === false);
  return Object.fromEntries(
    clean.map((line) => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx), line.slice(idx + 1)];
    })
  );
};

const signupTechUser = async (apiKey, bundleId) => {
  const email = `etiove.import.${Date.now()}@example.com`;
  const password = `E${Date.now()}aA123456`;

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Ios-Bundle-Identifier': bundleId,
    },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const json = await res.json();
  if (!res.ok || !json.idToken) {
    throw new Error(`No se pudo obtener token de Firebase Auth: ${json?.error?.message || res.status}`);
  }

  return { token: json.idToken, email };
};

(async () => {
  try {
    const env = readEnv();
    const appJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8'));

    const projectId = env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = env.EXPO_PUBLIC_FIREBASE_API_KEY;
    const bundleId = appJson?.expo?.ios?.bundleIdentifier || 'com.zarezfamily.etiove';

    if (!projectId || !apiKey) {
      throw new Error('Faltan EXPO_PUBLIC_FIREBASE_PROJECT_ID o EXPO_PUBLIC_FIREBASE_API_KEY en .env');
    }

    const auth = await signupTechUser(apiKey, bundleId);
    console.log(`Token tecnico generado con usuario: ${auth.email}`);

    process.env.FIREBASE_PROJECT_ID = projectId;
    process.env.FIREBASE_API_KEY = apiKey;
    process.env.FIREBASE_AUTH_TOKEN = auth.token;
    process.env.IMPORT_LIMIT = '100';

    require('./import_top_es_real.js');
  } catch (err) {
    console.error(err.message || String(err));
    process.exit(1);
  }
})();
