/**
 * NetworkContext
 *
 * Exposes:
 *  - isOnline       → boolean, current connectivity state
 *  - justReconnected → boolean, true for one render cycle after going online
 *  - registerSyncHandler(fn) → register a callback that fires on every reconnect
 *  - unregisterSyncHandler(fn) → remove a previously registered callback
 *
 * Sync handlers are stored in a ref so they don't cause re-renders and always
 * capture the latest closure values.
 */
import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const NetworkContext = createContext(null);

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);

  // Handlers registered by feature modules (catas, favs, etc.)
  const syncHandlers = useRef(new Set());

  const registerSyncHandler = useCallback((fn) => {
    syncHandlers.current.add(fn);
  }, []);

  const unregisterSyncHandler = useCallback((fn) => {
    syncHandlers.current.delete(fn);
  }, []);

  useEffect(() => {
    let prevConnected = true; // assume online at start

    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = !!(state.isConnected && state.isInternetReachable !== false);

      setIsOnline(connected);

      if (connected && !prevConnected) {
        // Transition: offline → online
        setJustReconnected(true);

        // Fire all registered sync handlers
        syncHandlers.current.forEach((handler) => {
          try {
            handler();
          } catch {}
        });

        // Reset justReconnected after one tick
        setTimeout(() => setJustReconnected(false), 0);
      }

      prevConnected = connected;
    });

    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider
      value={{ isOnline, justReconnected, registerSyncHandler, unregisterSyncHandler }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) throw new Error('useNetwork debe usarse dentro de <NetworkProvider>.');
  return ctx;
}
