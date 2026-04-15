// offlineCatas.js
// Maneja el guardado y sincronización offline de catas individuales
import * as FileSystem from 'expo-file-system';
import { scheduleEtioveNotification } from './notifications';

const CATAS_DIR = `${FileSystem.documentDirectory || ''}etiove-catas`;
const PENDING_FILE = `${CATAS_DIR}/pending-catas.json`;

async function ensureCatasDir() {
  const info = await FileSystem.getInfoAsync(CATAS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(CATAS_DIR, { intermediates: true });
  }
}

export async function saveCataOffline(cata) {
  await ensureCatasDir();
  let pendientes = [];
  try {
    const info = await FileSystem.getInfoAsync(PENDING_FILE);
    if (info.exists) {
      const raw = await FileSystem.readAsStringAsync(PENDING_FILE);
      pendientes = JSON.parse(raw);
    }
  } catch {}
  pendientes.push({ ...cata, _offline: true, _ts: Date.now() });
  await FileSystem.writeAsStringAsync(PENDING_FILE, JSON.stringify(pendientes));
}

export async function getPendingCatas() {
  await ensureCatasDir();
  try {
    const info = await FileSystem.getInfoAsync(PENDING_FILE);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(PENDING_FILE);
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function clearPendingCatas() {
  try {
    await FileSystem.deleteAsync(PENDING_FILE, { idempotent: true });
  } catch {}
}

// Sincroniza catas pendientes con la función que sube a Firebase
export async function syncPendingCatas(uploadFn) {
  const pendientes = await getPendingCatas();
  if (!pendientes.length) return 0;
  let subidas = 0;
  for (const cata of pendientes) {
    try {
      await uploadFn(cata);
      subidas++;
    } catch (_e) {
      // Si falla, dejamos la cata pendiente
      break;
    }
  }
  if (subidas > 0) {
    const restantes = pendientes.slice(subidas);
    if (restantes.length) {
      await FileSystem.writeAsStringAsync(PENDING_FILE, JSON.stringify(restantes));
    } else {
      await clearPendingCatas();
    }
    // Notificación push local
    await scheduleEtioveNotification({
      title: 'Catas sincronizadas',
      body: `${subidas} cata(s) pendientes se subieron correctamente.`,
    });
  }
  return subidas;
}