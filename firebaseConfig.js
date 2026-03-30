// Configuración para API REST de Firestore
// Usa Firebase Auth token (Bearer) para autenticar peticiones a Firestore

export const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
export const FIREBASE_API_KEY    = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
  console.warn('[Firebase] Faltan variables de entorno EXPO_PUBLIC_FIREBASE_PROJECT_ID y EXPO_PUBLIC_FIREBASE_API_KEY');
}

// URL regional Madrid
const BASE_URL = `https://europe-west1-firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/default/documents`;

// ─── TOKEN GLOBAL ─────────────────────────────────────────────────────────────

let _authToken = null;

export const setAuthToken  = (token) => {
  _authToken = token;
  console.log('[Firebase] Token establecido:', token ? token.substring(0, 30) + '...' : 'NULL');
};
export const clearAuthToken = () => { _authToken = null; };
export const getAuthToken   = () => _authToken;

const authHeaders = () => {
  const headers = { 'Content-Type': 'application/json' };
  if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;
  return headers;
};

const buildUrl = (path, useKey = false) => {
  const base = `${BASE_URL}/${path}`;
  return useKey ? `${base}${path.includes('?') ? '&' : '?'}key=${FIREBASE_API_KEY}` : base;
};

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
  const pageSize = limitN ? limitN * 3 : 100;
  // Siempre añadimos la API key como fallback además del Bearer token
  const url = `${BASE_URL}/${colName}?key=${FIREBASE_API_KEY}&pageSize=${pageSize}`;
  console.log('[Firestore] GET', colName, '| token:', _authToken ? 'SI' : 'NO');
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 404) return [];
  if (!res.ok) {
    const txt = await res.text();
    console.log('[Firestore] Error:', res.status, txt.substring(0, 200));
    throw new Error(`getCollection(${colName}) → ${res.status}`);
  }
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
  const url = `${BASE_URL}/${colName}/${docId}?key=${FIREBASE_API_KEY}`;
  const res  = await fetch(url, { headers: authHeaders() });
  if (!res.ok) return null;
  return docToObject(await res.json());
};

export const addDocument = async (colName, data) => {
  const url = `${BASE_URL}/${colName}?key=${FIREBASE_API_KEY}`;
  const res  = await fetch(url, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(toFields(data)),
  });
  if (!res.ok) throw new Error(`addDocument(${colName}) → ${res.status}`);
  return docToObject(await res.json());
};

export const setDocument = async (colName, docId, data) => {
  const url = `${BASE_URL}/${colName}/${docId}?key=${FIREBASE_API_KEY}`;
  const res  = await fetch(url, {
    method:  'PATCH',
    headers: authHeaders(),
    body:    JSON.stringify(toFields(data)),
  });
  return res.ok;
};

export const updateDocument = async (colName, docId, data) => {
  const fields = Object.keys(data).join(',');
  const url = `${BASE_URL}/${colName}/${docId}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=${fields}`;
  const res  = await fetch(url, {
    method:  'PATCH',
    headers: authHeaders(),
    body:    JSON.stringify(toFields(data)),
  });
  return res.ok;
};

export const deleteDocument = async (colName, docId) => {
  const url = `${BASE_URL}/${colName}/${docId}?key=${FIREBASE_API_KEY}`;
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
  setAuthToken(json.idToken);
  return { uid: json.localId, email: json.email, token: json.idToken };
};

export const loginUser = async (email, password) => {
  const res  = await fetch(`${AUTH_URL}:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Email o contraseña incorrectos');
  setAuthToken(json.idToken);
  return { uid: json.localId, email: json.email, token: json.idToken };
};

export const resetPassword = async (email) => {
  const res  = await fetch(`${AUTH_URL}:sendOobCode?key=${FIREBASE_API_KEY}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
  });
  return res.ok;
};