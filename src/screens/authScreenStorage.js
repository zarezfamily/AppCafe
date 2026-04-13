import * as SecureStore from 'expo-secure-store';

export const AUTH_SCREEN_STORAGE_KEYS = {
  email: 'etiove_email',
  password: 'etiove_password',
  remember: 'etiove_remember',
  hasAccount: 'etiove_has_account',
};

export const loadStoredAuthState = async () => {
  const rememberEnabled = (await SecureStore.getItemAsync(AUTH_SCREEN_STORAGE_KEYS.remember)) === 'true';
  const hasAccount = (await SecureStore.getItemAsync(AUTH_SCREEN_STORAGE_KEYS.hasAccount)) === 'true';

  if (!rememberEnabled) {
    return {
      rememberEnabled,
      hasAccount,
      email: '',
      password: '',
    };
  }

  const email = await SecureStore.getItemAsync(AUTH_SCREEN_STORAGE_KEYS.email);
  const password = await SecureStore.getItemAsync(AUTH_SCREEN_STORAGE_KEYS.password);

  return {
    rememberEnabled,
    hasAccount,
    email: email || '',
    password: password || '',
  };
};

export const saveRememberedCredentials = async (email, password) => {
  await SecureStore.setItemAsync(AUTH_SCREEN_STORAGE_KEYS.email, email);
  await SecureStore.setItemAsync(AUTH_SCREEN_STORAGE_KEYS.password, password);
  await SecureStore.setItemAsync(AUTH_SCREEN_STORAGE_KEYS.remember, 'true');
};

export const clearRememberedCredentials = async () => {
  await SecureStore.deleteItemAsync(AUTH_SCREEN_STORAGE_KEYS.email);
  await SecureStore.deleteItemAsync(AUTH_SCREEN_STORAGE_KEYS.password);
  await SecureStore.setItemAsync(AUTH_SCREEN_STORAGE_KEYS.remember, 'false');
};

export const markStoredAccount = async () => {
  await SecureStore.setItemAsync(AUTH_SCREEN_STORAGE_KEYS.hasAccount, 'true');
};

export const loadRememberedCredentials = async () => {
  const email = await SecureStore.getItemAsync(AUTH_SCREEN_STORAGE_KEYS.email);
  const password = await SecureStore.getItemAsync(AUTH_SCREEN_STORAGE_KEYS.password);

  return {
    email: email || '',
    password: password || '',
  };
};
