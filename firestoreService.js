import { BASE_URL, FIREBASE_API_KEY, authHeaders } from './firebaseCore';
import { docToObject, toFields, toFirestoreValue } from './firestoreMappers';

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
    body.structuredQuery.orderBy = [{ field: { fieldPath: orderByField }, direction: 'DESCENDING' }];
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });

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
  const res = await fetch(url, { headers: authHeaders() });

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
    docs = docs.sort((a, b) => (
      a[orderByField] < b[orderByField] ? 1 :
      a[orderByField] > b[orderByField] ? -1 : 0
    ));
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
  const res = await fetch(url, { headers: authHeaders() });

  if (!res.ok) return null;
  return docToObject(await res.json());
};

export const addDocument = async (colName, data) => {
  const url = `${BASE_URL}/${colName}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(toFields(data)),
  });

  if (!res.ok) {
    throw new Error(`addDocument(${colName}) -> ${res.status}`);
  }

  return docToObject(await res.json());
};

export const setDocument = async (colName, docId, data) => {
  const url = `${BASE_URL}/${colName}/${docId}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(toFields(data)),
  });
  return res.ok;
};

export const updateDocument = async (colName, docId, data) => {
  const params = new URLSearchParams({ key: FIREBASE_API_KEY });
  Object.keys(data).forEach((field) => params.append('updateMask.fieldPaths', field));
  const url = `${BASE_URL}/${colName}/${docId}?${params.toString()}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(toFields(data)),
  });
  return res.ok;
};

export const deleteDocument = async (colName, docId) => {
  const url = `${BASE_URL}/${colName}/${docId}?key=${FIREBASE_API_KEY}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return res.ok;
};
