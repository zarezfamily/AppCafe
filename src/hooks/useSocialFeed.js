/**
 * useSocialFeed
 *
 * Self-contained hook. Fetches the recent public cata feed and derives:
 *  - recentCatas          last N public catas (anonymised display)
 *  - weeklyHotCafes       top cafes by tasting count this week
 *  - tastingCountByCafeId Map<cafeId, count> (last 30 days)
 *  - loadingSocial        loading flag
 *
 * Data is cached in-module so multiple mounts in the same session don't
 * re-fetch (TTL: 5 minutes).
 */
import { useEffect, useRef, useState } from 'react';
import {
  computeTastingCountMap,
  computeWeeklyHotCafes,
  fetchRecentPublicCatas,
} from '../core/socialService';
import { getCollection } from '../services/firestoreService';

const CACHE_TTL_MS = 5 * 60 * 1000;

// Module-level cache (shared across hook instances in the same session)
let _cache = null;
let _cacheTs = 0;

function isCacheValid() {
  return _cache !== null && Date.now() - _cacheTs < CACHE_TTL_MS;
}

export default function useSocialFeed({ allCafes = [] } = {}) {
  const [recentCatas, setRecentCatas] = useState(() => _cache?.catas || []);
  const [loadingSocial, setLoadingSocial] = useState(!isCacheValid());
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (isCacheValid()) {
      setRecentCatas(_cache.catas);
      setLoadingSocial(false);
      return;
    }

    let cancelled = false;
    setLoadingSocial(true);

    fetchRecentPublicCatas(getCollection, 100)
      .then((catas) => {
        if (cancelled || !mounted.current) return;
        _cache = { catas };
        _cacheTs = Date.now();
        setRecentCatas(catas);
      })
      .catch(() => {
        // Social feed is non-critical; fail silently
      })
      .finally(() => {
        if (!cancelled && mounted.current) setLoadingSocial(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Derived data – recomputed when catas or allCafes changes
  const weeklyHotCafes = recentCatas.length > 0 ? computeWeeklyHotCafes(recentCatas, allCafes) : [];

  const tastingCountByCafeId = computeTastingCountMap(recentCatas);

  return {
    recentCatas,
    weeklyHotCafes,
    tastingCountByCafeId,
    loadingSocial,
  };
}
