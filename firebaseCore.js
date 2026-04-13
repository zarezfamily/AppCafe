import { Platform } from 'react-native';

const appConfig = require('./app.json');

export const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
export const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
export const FIREBASE_STORAGE_BUCKET = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || (
  FIREBASE_PROJECT_ID ? `${FIREBASE_PROJECT_ID}.appspot.com` : null
);
const IOS_BUNDLE_ID = appConfig?.expo?.ios?.bundleIdentifier || null;
const ANDROID_PACKAGE = appConfig?.expo?.android?.package || null;

if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
  console.warn('[Firebase] Faltan variables de entorno EXPO_PUBLIC_FIREBASE_PROJECT_ID y EXPO_PUBLIC_FIREBASE_API_KEY');
}

export const BASE_URL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`;
export const AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts';

let authToken = null;

export const clientHeaders = () => {
  const headers = {};

  if (Platform.OS === 'ios' && IOS_BUNDLE_ID) {
    headers['X-Ios-Bundle-Identifier'] = IOS_BUNDLE_ID;
  }

  if (Platform.OS === 'android' && ANDROID_PACKAGE) {
    headers['X-Android-Package'] = ANDROID_PACKAGE;
  }

  return headers;
};

export const setAuthToken = (token) => {
  authToken = token;
  console.log('[Firebase] Token completo:', token || 'NULL');
};

export const clearAuthToken = () => {
  authToken = null;
};

export const getAuthToken = () => authToken;

export const authHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
    ...clientHeaders(),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  return headers;
};
