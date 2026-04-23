/**
 * syncQueue.js
 *
 * Persistent queue for actions that fail while offline.
 * Actions are stored to FileSystem and replayed in order on reconnect.
 *
 * Supported action types:
 *   - 'add_tasting'      payload: { uid, ...cataFields }
 *   - 'toggle_favorite'  payload: { uid, cafeId, value: boolean }
 *   - 'add_cafe'         payload: { uid, ...cafeFields }
 *   - 'delete_cafe'      payload: { uid, cafeId }
 *   - 'pending_scan'     payload: { ean, source: 'barcode'|'photo', ts }
 *
 * Each entry: { id, type, payload, ts }
 */
import * as FileSystem from 'expo-file-system';

const QUEUE_DIR = `${FileSystem.documentDirectory || ''}etiove-sync`;
const QUEUE_FILE = `${QUEUE_DIR}/sync-queue.json`;

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(QUEUE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(QUEUE_DIR, { intermediates: true });
  }
}

export async function enqueueAction(type, payload) {
  try {
    await ensureDir();
    const current = await readQueue();
    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      payload,
      ts: Date.now(),
    };
    current.push(entry);
    await FileSystem.writeAsStringAsync(QUEUE_FILE, JSON.stringify(current));
  } catch {}
}

export async function readQueue() {
  try {
    await ensureDir();
    const info = await FileSystem.getInfoAsync(QUEUE_FILE);
    if (!info.exists) return [];
    const raw = await FileSystem.readAsStringAsync(QUEUE_FILE);
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

export async function removeQueueItems(ids) {
  try {
    const current = await readQueue();
    const idSet = new Set(ids);
    const remaining = current.filter((item) => !idSet.has(item.id));
    await FileSystem.writeAsStringAsync(QUEUE_FILE, JSON.stringify(remaining));
  } catch {}
}

export async function clearQueue() {
  try {
    await FileSystem.deleteAsync(QUEUE_FILE, { idempotent: true });
  } catch {}
}

/**
 * Process the queue with the provided handler map.
 *
 * handlers: { [type]: async (payload) => void }
 *
 * Processes actions in order. On first failure, stops and keeps remaining
 * actions for the next attempt (transient network errors won't lose data).
 *
 * Returns the number of successfully processed actions.
 */
export async function processSyncQueue(handlers) {
  const queue = await readQueue();
  if (!queue.length) return 0;

  const processedIds = [];

  for (const action of queue) {
    const handler = handlers[action.type];
    if (!handler) {
      // Unknown action type — discard it
      processedIds.push(action.id);
      continue;
    }
    try {
      await handler(action.payload);
      processedIds.push(action.id);
    } catch {
      // Stop on first failure to preserve order; we'll retry on next reconnect
      break;
    }
  }

  if (processedIds.length > 0) {
    await removeQueueItems(processedIds);
  }

  return processedIds.length;
}

/**
 * Returns count of pending actions grouped by type.
 * { total, add_tasting, toggle_favorite, pending_scan, add_cafe, delete_cafe }
 */
export async function getQueueStats() {
  const queue = await readQueue();
  const stats = { total: queue.length };
  for (const item of queue) {
    stats[item.type] = (stats[item.type] || 0) + 1;
  }
  return stats;
}
