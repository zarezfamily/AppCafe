import * as FileSystem from 'expo-file-system';

const CACHE_DIR = `${FileSystem.documentDirectory || ''}etiove-cache`;

const ensureCacheDir = async () => {
  if (!CACHE_DIR) return false;
  const info = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
  return true;
};

const getCollectionCachePath = (uid) => `${CACHE_DIR}/collection-${uid}.json`;

export const loadCollectionOfflineCache = async (uid) => {
  if (!uid) return null;
  try {
    await ensureCacheDir();
    const path = getCollectionCachePath(uid);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(path);
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const saveCollectionOfflineCache = async (uid, payload) => {
  if (!uid || !payload) return;
  try {
    await ensureCacheDir();
    const path = getCollectionCachePath(uid);
    await FileSystem.writeAsStringAsync(path, JSON.stringify({
      ...payload,
      updatedAt: payload.updatedAt || Date.now(),
    }));
  } catch {}
};