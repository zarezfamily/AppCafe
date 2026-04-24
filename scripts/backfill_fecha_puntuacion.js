// Backfill missing fecha + puntuacion on cafés that lack them.
// These fields are required for the app's orderBy queries.
// Usage: node --env-file=.env scripts/backfill_fecha_puntuacion.js

const FIREBASE_PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
let FIREBASE_AUTH_TOKEN = '';

const BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

async function autoLogin() {
  const email = `etiove.backfill.${Date.now()}@example.com`;
  const password = `E${Date.now()}aA123456`;
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ios-Bundle-Identifier': 'com.zarezfamily.etiove',
      },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const json = await res.json();
  if (!json.idToken) throw new Error(`Auth failed: ${JSON.stringify(json.error)}`);
  FIREBASE_AUTH_TOKEN = json.idToken;
  console.log('Auth OK');
}

async function queryAll() {
  const url = `${BASE}:runQuery?key=${FIREBASE_API_KEY}`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'cafes' }],
      select: {
        fields: [
          { fieldPath: 'nombre' },
          { fieldPath: 'fecha' },
          { fieldPath: 'puntuacion' },
          { fieldPath: 'votos' },
          { fieldPath: 'createdAt' },
          { fieldPath: 'updatedAt' },
          { fieldPath: 'importMeta' },
        ],
      },
      limit: 2000,
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.filter((r) => r.document);
}

async function patchDoc(docId, fields) {
  const masks = Object.keys(fields)
    .map((k) => `updateMask.fieldPaths=${k}`)
    .join('&');
  const url = `${BASE}/cafes/${docId}?${masks}&key=${FIREBASE_API_KEY}`;

  const firestoreFields = {};
  for (const [k, v] of Object.entries(fields)) {
    if (typeof v === 'string') firestoreFields[k] = { stringValue: v };
    else if (typeof v === 'number') {
      firestoreFields[k] = Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    }
  }

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${FIREBASE_AUTH_TOKEN}`,
    },
    body: JSON.stringify({ fields: firestoreFields }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`PATCH ${docId} failed: ${res.status} ${txt.substring(0, 200)}`);
  }
}

(async () => {
  await autoLogin();

  console.log('\nFetching all cafés...');
  const docs = await queryAll();
  console.log(`Found ${docs.length} documents\n`);

  const toFix = [];

  for (const r of docs) {
    const f = r.document.fields || {};
    const docId = r.document.name.split('/').pop();
    const nombre = f.nombre?.stringValue || docId;
    const hasFecha = f.fecha?.stringValue;
    const hasPuntuacion =
      f.puntuacion?.integerValue !== undefined || f.puntuacion?.doubleValue !== undefined;

    if (!hasFecha || !hasPuntuacion) {
      const patch = {};
      if (!hasFecha) {
        patch.fecha =
          f.createdAt?.stringValue || f.updatedAt?.stringValue || new Date().toISOString();
      }
      if (!hasPuntuacion) {
        patch.puntuacion = 0;
        patch.votos = 0;
      }
      toFix.push({ docId, nombre, patch });
    }
  }

  console.log(`Documents missing fecha or puntuacion: ${toFix.length}\n`);

  if (toFix.length === 0) {
    console.log('Nothing to fix!');
    return;
  }

  // Show what we'll fix
  for (const { docId, nombre, patch } of toFix) {
    console.log(`  ${nombre} (${docId}) → ${Object.keys(patch).join(', ')}`);
  }

  console.log(`\nPatching ${toFix.length} documents...`);

  let ok = 0;
  let fail = 0;
  for (const { docId, nombre, patch } of toFix) {
    try {
      await patchDoc(docId, patch);
      ok++;
    } catch (err) {
      console.error(`  ✗ ${nombre}: ${err.message}`);
      fail++;
    }
  }

  console.log(`\nDone: ${ok} fixed, ${fail} errors`);
})();
