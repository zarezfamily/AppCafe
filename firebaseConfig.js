// Configuración para API REST de Firestore
// Usa Firebase Auth token (Bearer) para autenticar peticiones a Firestore

import { Platform } from 'react-native';

const appConfig = require('./app.json');

export const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
export const FIREBASE_API_KEY    = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
export const FIREBASE_STORAGE_BUCKET = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || (FIREBASE_PROJECT_ID ? `${FIREBASE_PROJECT_ID}.appspot.com` : null);
const IOS_BUNDLE_ID              = appConfig?.expo?.ios?.bundleIdentifier || null;
const ANDROID_PACKAGE            = appConfig?.expo?.android?.package || null;

if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
  console.warn('[Firebase] Faltan variables de entorno EXPO_PUBLIC_FIREBASE_PROJECT_ID y EXPO_PUBLIC_FIREBASE_API_KEY');
}

// URL regional Madrid
const BASE_URL = `https://europe-west1-firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// ─── TOKEN GLOBAL ─────────────────────────────────────────────────────────────

let _authToken = null;

const clientHeaders = () => {
  const headers = {};

  if (Platform.OS === 'ios' && IOS_BUNDLE_ID) {
    headers['X-Ios-Bundle-Identifier'] = IOS_BUNDLE_ID;
  }

  if (Platform.OS === 'android' && ANDROID_PACKAGE) {
    headers['X-Android-Package'] = ANDROID_PACKAGE;
  }

  return headers;
};

export const setAuthToken  = (token) => {
  _authToken = token;
  console.log('[Firebase] Token completo:', token || 'NULL');
};
export const clearAuthToken = () => { _authToken = null; };
export const getAuthToken   = () => _authToken;

const authHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
    ...clientHeaders(),
  };
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

const mapAuthError = (errorMessage, fallbackMessage) => {
  const rawMessage = String(errorMessage || '');

  if (rawMessage.includes('REQUEST_BLOCKED') || rawMessage.includes('IOS CLIENT APPLICATION')) {
    return 'La API key de Firebase esta bloqueando las peticiones de esta app iOS. Revisa las restricciones de la clave en Google Cloud o usa una clave sin restriccion por app para Firebase Auth.';
  }

  if (rawMessage === 'INVALID_LOGIN_CREDENTIALS' || rawMessage === 'EMAIL_NOT_FOUND' || rawMessage === 'INVALID_PASSWORD') {
    return 'Email o contraseña incorrectos';
  }

  if (rawMessage === 'EMAIL_EXISTS') {
    return 'Ese email ya esta registrado';
  }

  if (rawMessage === 'WEAK_PASSWORD : Password should be at least 6 characters') {
    return 'La contraseña debe tener al menos 6 caracteres';
  }

  return rawMessage || fallbackMessage;
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
  const params = new URLSearchParams({ key: FIREBASE_API_KEY });
  Object.keys(data).forEach((field) => params.append('updateMask.fieldPaths', field));
  const url = `${BASE_URL}/${colName}/${docId}?${params.toString()}`;
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

export const uploadImageToStorage = async (uri, folder = 'uploads') => {
  if (!uri) throw new Error('URI de imagen no válida');
  if (!FIREBASE_STORAGE_BUCKET) throw new Error('Falta EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET');

  const imgRes = await fetch(uri);
  if (!imgRes.ok) throw new Error('No se pudo leer la imagen local');
  const blob = await imgRes.blob();

  const safeFolder = String(folder || 'uploads').replace(/[^a-zA-Z0-9_\-/]/g, '');
  const fileName = `${safeFolder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o?uploadType=media&name=${encodeURIComponent(fileName)}&key=${FIREBASE_API_KEY}`;

  const headers = {
    'Content-Type': 'image/jpeg',
    ...clientHeaders(),
  };
  if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`;

  const upRes = await fetch(uploadUrl, {
    method: 'POST',
    headers,
    body: blob,
  });

  const upJson = await upRes.json().catch(() => ({}));
  if (!upRes.ok) {
    throw new Error(upJson?.error?.message || 'No se pudo subir imagen a Firebase Storage');
  }

  const objectName = upJson.name || fileName;
  const encodedName = encodeURIComponent(objectName);
  const token = upJson.downloadTokens || upJson.metadata?.downloadTokens || '';
  return token
    ? `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodedName}?alt=media&token=${token}`
    : `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodedName}?alt=media`;
};

// ─── AUTENTICACIÓN ────────────────────────────────────────────────────────────

const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts`;

export const registerUser = async (email, password) => {
  const res  = await fetch(`${AUTH_URL}:signUp?key=${FIREBASE_API_KEY}`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(mapAuthError(json.error?.message, 'Error al registrar'));
  setAuthToken(json.idToken);
  return { uid: json.localId, email: json.email, token: json.idToken };
};

export const loginUser = async (email, password) => {
  const res  = await fetch(`${AUTH_URL}:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(mapAuthError(json.error?.message, 'Email o contraseña incorrectos'));
  setAuthToken(json.idToken);
  return { uid: json.localId, email: json.email, token: json.idToken };
};

export const resetPassword = async (email) => {
  const res  = await fetch(`${AUTH_URL}:sendOobCode?key=${FIREBASE_API_KEY}`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
  });
  return res.ok;
};