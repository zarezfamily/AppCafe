/**
 * usePendingActions
 *
 * Unified hook that tracks ALL pending offline actions across both
 * the legacy offlineCatas system and the generic syncQueue.
 *
 * Returns:
 *   pendingCount   → total pending actions
 *   pendingByType  → { catas, favorites, scans, other }
 *   isSyncing      → true while sync is in progress
 *   refresh        → manually re-read pending counts
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNetwork } from '../context/NetworkContext';
import { getPendingCatas } from '../core/offlineCatas';
import { getQueueStats } from '../core/syncQueue';

const EMPTY = { catas: 0, favorites: 0, scans: 0, other: 0 };

export default function usePendingActions() {
  const { isOnline, justReconnected } = useNetwork();
  const [pendingByType, setPendingByType] = useState(EMPTY);
  const [isSyncing, setIsSyncing] = useState(false);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const [legacyCatas, queueStats] = await Promise.all([getPendingCatas(), getQueueStats()]);

      if (!mountedRef.current) return;

      const catas = (legacyCatas?.length || 0) + (queueStats.add_tasting || 0);
      const favorites = queueStats.toggle_favorite || 0;
      const scans = queueStats.pending_scan || 0;
      const other = (queueStats.add_cafe || 0) + (queueStats.delete_cafe || 0);

      setPendingByType({ catas, favorites, scans, other });
    } catch {
      // Keep previous values on error
    }
  }, []);

  // Refresh on mount and whenever connectivity changes
  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  // Refresh when going offline (new actions may queue) or coming back online
  useEffect(() => {
    refresh();
  }, [isOnline, refresh]);

  // Track syncing state on reconnect
  useEffect(() => {
    if (justReconnected) {
      setIsSyncing(true);
      // Poll briefly to update counts during sync
      const interval = setInterval(refresh, 2000);
      const timeout = setTimeout(() => {
        clearInterval(interval);
        setIsSyncing(false);
        refresh();
      }, 15000);
      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    }
  }, [justReconnected, refresh]);

  const pendingCount =
    pendingByType.catas + pendingByType.favorites + pendingByType.scans + pendingByType.other;

  return { pendingCount, pendingByType, isSyncing, refresh };
}
