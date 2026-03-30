// Configuración para API REST de Firestore
// Usa Firebase Auth token (Bearer) en lugar de API key para autenticar peticiones

export const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
export const FIREBASE_API_KEY    = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
  console.warn(
    '[Firebase] Faltan variables de entorno. Crea un archivo .env con:\n' +
    'EXPO_PUBLIC_FIREBASE_PROJECT_ID=...\n' +
    'EXPO_PUBLIC_FIREBASE_API_KEY=...'
  );
}

// URL regional Madrid — sin (default), con default
const BASE_URL = `https://europe-southwest1-firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/default/documents`;

// ─── TOKEN GLOBAL ─────────────────────────────────────────────────────────────
// Se establece tras el login y se usa en todas las peticiones

let _authToken = null;

export const setAuthToken = (token) => { _authToken = token; };
export const clearAuthToken = () => { _authToken = null; };

const authHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  if (_authToken) {
    headers['Authorization'] = `Bearer ${_authToken}`;
  }
  return headers;
};

// Para peticiones de solo lectura públicas usamos API key como fallback
const readUrl = (path) =>
  _authToken
    ? `${BASE_URL}/${path}`
    : `${BASE_URL}/${path}?key=${FIREBASE_API_KEY}`;

const writeUrl = (path) => `${BASE_URL}/${path}`;

// ─── UTILIDADES ────────────────────────────────────────────────────────────────

const toFirestoreValue = (val) => {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string')           return { stringValue: val };
  if (typeof val === 'number')           return { integerValue: String(val) };
  if (typeof val === 'boolean')          return { booleanValue: val };
  return { stringValue: String(val) };
};

const fromFirestoreValue = (val) => {
  if ('stringValue'  in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue'  in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue'    in val) return null;
  return null;
};

export const docToObject = (doc) => {
  if (!doc?.fields) return {};
  const obj = {};
  for (const [key, val] of Object.entries(doc.fields)) {
    obj[key] = fromFirestoreValue(val);
  }
  obj.id = doc.name?.split('/').pop();
  return obj;
};

const toFields = (obj) => {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    fields[key] = toFirestoreValue(val);
  }
  return { fields };
};

// ─── API ───────────────────────────────────────────────────────────────────────

export const getCollection = async (colName, orderByField = null, limitN = null) => {
  const url = readUrl(`${colName}?pageSize=${limitN ? limitN * 3 : 100}`);
  const res  = await fetch(url, { headers: authHeaders() });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`getCollection(${colName}) → ${res.status}`);
  const json = await res.json();
  if (!json.documents) return [];
  let docs = json.documents.map(docToObject);
  if (orderByField) {
    docs = docs.sort((a, b) =>
      a[orderByField] < b[orderByField] ? 1 :
      a[orderByField] > b[orderByField] ? -1 : 0
    );
  }
  if (limitN) docs = docs.slice(0, limitN);
  return docs;
};

export const getUserCafes = async (uid) => {
  try {
    const todos = await getCollection('cafes', 'fecha');
    return todos.filter(c => c.uid === uid);
  } catch {
    return [];
  }
};

export const getDocument = async (colName, docId) => {
  const url = readUrl(`${colName}/${docId}`);
  const res  = await fetch(url, { headers: authHeaders() });
  if (!res.ok) return null;
  return docToObject(await res.json());
};

export const addDocument = async (colName, data) => {
  const url = `${writeUrl(colName)}?key=${FIREBASE_API_KEY}`;
  const res  = await fetch(url, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(toFields(data)),
  });
  if (!res.ok) throw new Error(`addDocument(${colName}) → ${res.status}`);
  return docToObject(await res.json());
};

export const setDocument = async (colName, docId, data) => {
  const url = `${writeUrl(`${colName}/${docId}`)}?key=${FIREBASE_API_KEY}`;
  const res  = await fetch(url, {
    method:  'PATCH',
    headers: authHeaders(),
    body:    JSON.stringify(toFields(data)),
  });
  return res.ok;
};

export const updateDocument = async (colName, docId, data) => {
  const fields = Object.keys(data).join(',');
  const url = `${writeUrl(`${colName}/${docId}`)}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=${fields}`;
  const res  = await fetch(url, {
    method:  'PATCH',
    headers: authHeaders(),
    body:    JSON.stringify(toFields(data)),
  });
  return res.ok;
};

export const deleteDocument = async (colName, docId) => {
  const url = `${writeUrl(`${colName}/${docId}`)}?key=${FIREBASE_API_KEY}`;
  const res  = await fetch(url, { method: 'DELETE', headers: authHeaders() });
  return res.ok;
};

// ─── AUTENTICACIÓN ────────────────────────────────────────────────────────────

const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts`;

export const registerUser = async (email, password) => {
  const res  = await fetch(`${AUTH_URL}:signUp?key=${FIREBASE_API_KEY}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Error al registrar');
  const user = { uid: json.localId, email: json.email, token: json.idToken };
  setAuthToken(json.idToken);
  return user;
};

export const loginUser = async (email, password) => {
  const res  = await fetch(`${AUTH_URL}:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Email o contraseña incorrectos');
  const user = { uid: json.localId, email: json.email, token: json.idToken };
  setAuthToken(json.idToken);
  return user;
};

export const resetPassword = async (email) => {
  const res  = await fetch(`${AUTH_URL}:sendOobCode?key=${FIREBASE_API_KEY}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
  });
  return res.ok;
};
