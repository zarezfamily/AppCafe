import * as SecureStore from 'expo-secure-store';

import {
  AUTH_URL,
  FIREBASE_API_KEY,
  authHeaders,
  clearAuthToken,
  getAuthToken,
  setAuthToken,
} from './firebaseCore';

const mapAuthError = (errorMessage, fallbackMessage) => {
  const rawMessage = String(errorMessage || '');

  if (rawMessage.includes('REQUEST_BLOCKED') || rawMessage.includes('IOS CLIENT APPLICATION')) {
    return 'La API key de Firebase esta bloqueando las peticiones de esta app iOS. Revisa las restricciones de la clave en Google Cloud o usa una clave sin restriccion por app para Firebase Auth.';
  }

  if (
    rawMessage === 'INVALID_LOGIN_CREDENTIALS' ||
    rawMessage === 'EMAIL_NOT_FOUND' ||
    rawMessage === 'INVALID_PASSWORD'
  ) {
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

export const saveAuthTokenToSecureStore = async (token) => {
  try {
    if (token) {
      await SecureStore.setItemAsync('authToken', token);
    } else {
      await SecureStore.deleteItemAsync('authToken');
    }
  } catch (e) {
    console.warn('[SecureStore] Error saving token:', e);
  }
};

export const restoreAuthTokenFromSecureStore = async () => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      setAuthToken(token);
      return token;
    }
  } catch (e) {
    console.warn('[SecureStore] Error restoring token:', e);
  }
  return null;
};

export const registerUser = async (email, password) => {
  const res = await fetch(`${AUTH_URL}:signUp?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const json = await res.json();

  if (!res.ok) {
    throw new Error(mapAuthError(json.error?.message, 'Error al registrar'));
  }

  setAuthToken(json.idToken);
  await saveAuthTokenToSecureStore(json.idToken);
  return { uid: json.localId, email: json.email, token: json.idToken };
};

export const loginUser = async (email, password) => {
  const res = await fetch(`${AUTH_URL}:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const json = await res.json();

  if (!res.ok) {
    throw new Error(mapAuthError(json.error?.message, 'Email o contraseña incorrectos'));
  }

  setAuthToken(json.idToken);
  await saveAuthTokenToSecureStore(json.idToken);
  return { uid: json.localId, email: json.email, token: json.idToken };
};

export const resetPassword = async (email) => {
  const res = await fetch(`${AUTH_URL}:sendOobCode?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ requestType: 'PASSWORD_RESET', email }),
  });
  return res.ok;
};

export const sendPhoneVerificationCode = async (phoneNumber, recaptchaToken) => {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, recaptchaToken }),
    }
  );
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error?.message || 'No se pudo enviar el SMS');
  }

  return json.sessionInfo;
};

export const verifyPhoneCode = async (sessionInfo, code) => {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionInfo, code }),
    }
  );
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json.error?.message || 'Código incorrecto');
  }

  return json;
};

export const sendEmailVerification = async (idToken) => {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestType: 'VERIFY_EMAIL', idToken }),
    }
  );
  return res.ok;
};

export {
  clearAuthToken,
  getAuthToken,
  setAuthToken,
};
