import { BASE_URL, FIREBASE_API_KEY, authHeaders } from './firebaseCore';
import { docToObject, toFields, toFirestoreValue } from './firestoreMappers';
import { refreshIdToken } from './authService';

const normalizeFirestoreError = (error, operation) => {
  const message = String(error?.message || error || '');
  if (
    error instanceof TypeError ||
    message.includes('Network request failed') ||
    message.includes('Load failed') ||
    message.includes('fetch')
  ) {
    return new Error(`${operation} -> NETWORK_UNAVAILABLE`);
  }
  return error instanceof Error ? error : new Error(`${operation} -> UNKNOWN_ERROR`);
};

const firestoreFetch = async (url, options, operation) => {
  try {
    let res = await fetch(url, options);

    if (res.status === 401 || res.status === 403) {
      const newToken = await refreshIdToken();
      if (newToken) {
        const retryOptions = {
          ...options,
          headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
        };
        res = await fetch(url, retryOptions);
      }
    }

    return res;
  } catch (error) {
    console.log('[Firestore] Network error:', operation, String(error?.message || error));
    throw normalizeFirestoreError(error, operation);
  }
};

export const queryCollection = async (colName, field, value, orderByField = null) => {
  const url = `${BASE_URL}:runQuery?key=${FIREBASE_API_KEY}`;
  const body = {
    structuredQuery: {
      from: [{ collectionId: colName }],
      where: {
        fieldFilter: {
          field: { fieldPath: field },
          op: 'EQUAL',
          value: toFirestoreValue(value),
        },
      },
    },
  };

  if (orderByField) {
    body.structuredQuery.orderBy = [
      { field: { fieldPath: orderByField }, direction: 'DESCENDING' },
    ];
  }

  const res = await firestoreFetch(
    url,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    },
    `queryCollection(${colName})`
  );

  if (!res.ok) {
    const txt = await res.text();
    console.log('[Firestore] Error:', res.status, txt.substring(0, 200));
    throw new Error(`queryCollection(${colName}) -> ${res.status}`);
  }

  const json = await res.json();
  return json.filter((r) => r.document).map((r) => docToObject(r.document));
};

export const getCollection = async (colName, orderByField = null, limitN = null) => {
  const pageSize = limitN ? limitN * 3 : 100;
  const url = `${BASE_URL}/${colName}?key=${FIREBASE_API_KEY}&pageSize=${pageSize}`;
  const res = await firestoreFetch(url, { headers: authHeaders() }, `getCollection(${colName})`);

  if (res.status === 404) return [];
  if (!res.ok) {
    const txt = await res.text();
    console.log('[Firestore] Error:', res.status, txt.substring(0, 200));
    throw new Error(`getCollection(${colName}) -> ${res.status}`);
  }

  const json = await res.json();
  if (!json.documents) return [];

  let docs = json.documents.map(docToObject);
  if (orderByField) {
    docs = docs.sort((a, b) =>
      a[orderByField] < b[orderByField] ? 1 : a[orderByField] > b[orderByField] ? -1 : 0
    );
  }
  if (limitN) {
    docs = docs.slice(0, limitN);
  }
  return docs;
};

export const getUserCafes = async (uid) => {
  try {
    const todos = await getCollection('cafes', 'fecha');
    return todos.filter((c) => c.uid === uid);
  } catch {
    return [];
  }
};

export const getDocument = async (colName, docId) => {
  const url = `${BASE_URL}/${colName}/${docId}?key=${FIREBASE_API_KEY}`;
  const res = await firestoreFetch(
    url,
    { headers: authHeaders() },
    `getDocument(${colName}/${docId})`
  );

  if (!res.ok) return null;
  return docToObject(await res.json());
};

export const addDocument = async (colName, data) => {
  const url = `${BASE_URL}/${colName}?key=${FIREBASE_API_KEY}`;
  const res = await firestoreFetch(
    url,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(toFields(data)),
    },
    `addDocument(${colName})`
  );

  if (!res.ok) {
    throw new Error(`addDocument(${colName}) -> ${res.status}`);
  }

  return docToObject(await res.json());
};

export const setDocument = async (colName, docId, data) => {
  const url = `${BASE_URL}/${colName}/${docId}?key=${FIREBASE_API_KEY}`;
  const res = await firestoreFetch(
    url,
    {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(toFields(data)),
    },
    `setDocument(${colName}/${docId})`
  );
  return res.ok;
};

export const updateDocument = async (colName, docId, data) => {
  const params = new URLSearchParams({ key: FIREBASE_API_KEY });
  Object.keys(data).forEach((field) => params.append('updateMask.fieldPaths', field));
  const url = `${BASE_URL}/${colName}/${docId}?${params.toString()}`;
  const res = await firestoreFetch(
    url,
    {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(toFields(data)),
    },
    `updateDocument(${colName}/${docId})`
  );
  return res.ok;
};

export const deleteDocument = async (colName, docId) => {
  const url = `${BASE_URL}/${colName}/${docId}?key=${FIREBASE_API_KEY}`;
  const res = await firestoreFetch(
    url,
    {
      method: 'DELETE',
      headers: authHeaders(),
    },
    `deleteDocument(${colName}/${docId})`
  );
  return res.ok;
};
