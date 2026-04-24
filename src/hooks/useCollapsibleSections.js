import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';

const STORE_KEY = 'etiove_collapsed_sections';

let cachedState = null;

async function loadState() {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function saveState(state) {
  try {
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(state));
  } catch {
    // silent
  }
}

export default function useCollapsibleSections(sectionKeys = []) {
  const [collapsed, setCollapsed] = useState(() => {
    const initial = {};
    sectionKeys.forEach((k) => {
      initial[k] = cachedState?.[k] ?? false;
    });
    return initial;
  });

  useEffect(() => {
    let mounted = true;
    loadState().then((saved) => {
      if (!mounted) return;
      cachedState = saved;
      setCollapsed((prev) => {
        const next = { ...prev };
        sectionKeys.forEach((k) => {
          if (saved[k] !== undefined) next[k] = saved[k];
        });
        return next;
      });
    });
    return () => {
      mounted = false;
    };
  }, []);

  const toggle = useCallback((key) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      cachedState = { ...cachedState, ...next };
      saveState(cachedState);
      return next;
    });
  }, []);

  const isCollapsed = useCallback((key) => !!collapsed[key], [collapsed]);

  return { collapsed, toggle, isCollapsed };
}
