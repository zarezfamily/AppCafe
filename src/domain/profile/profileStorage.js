import * as SecureStore from 'expo-secure-store';
import { KEY_PROFILE } from '../../constants/storageKeys';

export const loadStoredProfile = async () => {
  const raw = await SecureStore.getItemAsync(KEY_PROFILE);
  if (!raw) return null;
  return JSON.parse(raw);
};

export const saveStoredProfile = async (profile) => {
  await SecureStore.setItemAsync(KEY_PROFILE, JSON.stringify(profile));
};
