import {
  FIREBASE_API_KEY,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  clientHeaders,
  getAuthToken,
} from './firebaseCore';

export const uploadImageToStorage = async (uri, folder = 'uploads') => {
  if (!uri) throw new Error('URI de imagen no válida');
  if (!FIREBASE_STORAGE_BUCKET) throw new Error('Falta EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET');

  const imgRes = await fetch(uri);
  if (!imgRes.ok) throw new Error('No se pudo leer la imagen local');
  const blob = await imgRes.blob();

  const safeFolder = String(folder || 'uploads').replace(/[^a-zA-Z0-9_\-/]/g, '');
  const fileName = `${safeFolder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
  const bucketCandidates = Array.from(new Set([
    FIREBASE_STORAGE_BUCKET,
    FIREBASE_PROJECT_ID ? `${FIREBASE_PROJECT_ID}.appspot.com` : null,
    FIREBASE_PROJECT_ID ? `${FIREBASE_PROJECT_ID}.firebasestorage.app` : null,
  ].filter(Boolean)));

  const headers = {
    'Content-Type': 'image/jpeg',
    ...clientHeaders(),
  };
  const authToken = getAuthToken();
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  let lastError = null;

  for (const bucketName of bucketCandidates) {
    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o?uploadType=media&name=${encodeURIComponent(fileName)}&key=${FIREBASE_API_KEY}`;
    const upRes = await fetch(uploadUrl, {
      method: 'POST',
      headers,
      body: blob,
    });
    const upJson = await upRes.json().catch(() => ({}));

    if (upRes.ok) {
      const objectName = upJson.name || fileName;
      const encodedName = encodeURIComponent(objectName);
      const token = upJson.downloadTokens || upJson.metadata?.downloadTokens || '';
      return token
        ? `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedName}?alt=media&token=${token}`
        : `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedName}?alt=media`;
    }

    lastError = upJson?.error?.message || `No se pudo subir imagen a Firebase Storage (${upRes.status})`;
    if (upRes.status !== 404) {
      break;
    }
  }

  throw new Error(lastError || 'No se pudo subir imagen a Firebase Storage');
};
