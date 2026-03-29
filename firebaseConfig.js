// Configuración para API REST de Firestore (sin SDK de Firebase)
// El SDK oficial tiene incompatibilidades con el bundler de Expo en ciertas versiones.
// La API REST es 100% compatible y no requiere ningún paquete adicional.

export const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
export const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;

// ─── UTILIDADES ────────────────────────────────────────────────────────────────

// Convierte un valor JS al formato de Firestore REST
const toFirestoreValue = (val) => {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'string')  return { stringValue: val };
  if (typeof val === 'number')  return { integerValue: String(val) };
  if (typeof val === 'boolean') return { booleanValue: val };
  return { stringValue: String(val) };
};

// Convierte un campo de Firestore REST a valor JS
const fromFirestoreValue = (val) => {
  if ('stringValue'  in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue'  in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue'    in val) return null;
  return null;
};

// Convierte un documento Firestore REST a objeto JS plano
export const docToObject = (doc) => {
  if (!doc.fields) return {};
  const obj = {};
  for (const [key, val] of Object.entries(doc.fields)) {
    obj[key] = fromFirestoreValue(val);
  }
  // Extrae el ID del nombre del documento: "projects/.../documents/col/ID"
  obj.id = doc.name.split('/').pop();
  return obj;
};

// Convierte un objeto JS a campos Firestore REST
const toFields = (obj) => {
  const fields = {};
  for (const [key, val] of Object.entries(obj)) {
    fields[key] = toFirestoreValue(val);
  }
  return { fields };
};

// ─── API ───────────────────────────────────────────────────────────────────────

// GET una colección con orderBy
export const getCollection = async (colName, orderByField = null, limitN = null) => {
  let url = `${BASE_URL}/${colName}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json.documents) return [];
  let docs = json.documents.map(docToObject);
  if (orderByField) {
    docs = docs.sort((a, b) => {
      if (a[orderByField] < b[orderByField]) return 1;
      if (a[orderByField] > b[orderByField]) return -1;
      return 0;
    });
  }
  if (limitN) docs = docs.slice(0, limitN);
  return docs;
};

// GET un documento por ID
export const getDocument = async (colName, docId) => {
  const url = `${BASE_URL}/${colName}/${docId}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  return docToObject(json);
};

// POST — añadir documento con ID automático
export const addDocument = async (colName, data) => {
  const url = `${BASE_URL}/${colName}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toFields(data)),
  });
  const json = await res.json();
  return docToObject(json);
};

// PATCH — crear o sobreescribir documento con ID fijo
export const setDocument = async (colName, docId, data) => {
  const url = `${BASE_URL}/${colName}/${docId}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toFields(data)),
  });
  return res.ok;
};

// PATCH — actualizar campos concretos de un documento
export const updateDocument = async (colName, docId, data) => {
  const fields = Object.keys(data).join(',');
  const url = `${BASE_URL}/${colName}/${docId}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=${fields}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toFields(data)),
  });
  return res.ok;
};

// DELETE — eliminar documento
export const deleteDocument = async (colName, docId) => {
  const url = `${BASE_URL}/${colName}/${docId}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, { method: 'DELETE' });
  return res.ok;
};
