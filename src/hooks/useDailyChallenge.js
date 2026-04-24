import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getCafePhoto } from '../core/utils';

const STORE_KEY = 'etiove_daily_challenge';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Deterministic daily index from date string → number */
function dateHash(dateStr) {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = (h * 31 + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function computeStreak(completions) {
  if (!completions?.length) return 0;
  const sorted = [...new Set(completions)].sort().reverse();
  const today = todayStr();
  const yesterday = yesterdayStr();

  // Streak must include today or yesterday (still valid)
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (prev - curr) / (1000 * 60 * 60 * 24);
    if (Math.round(diff) === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function defaultState() {
  return {
    completions: [],
    bestStreak: 0,
  };
}

/**
 * Picks the "Cata del día": a deterministic daily coffee from the pool.
 * Prefers cafes with good photos and decent ratings.
 */
function pickDailyCoffee(allCafes, dateStr) {
  if (!allCafes?.length) return null;

  // Filter to cafes with photos and some quality signal
  const pool = allCafes.filter((c) => {
    const photo = getCafePhoto(c);
    const hasPhoto = photo && !photo.includes('placeholder') && !photo.includes('fallback');
    const hasRating = Number(c?.puntuacion || 0) > 0;
    return hasPhoto && hasRating && c?.nombre;
  });

  const candidates = pool.length >= 10 ? pool : allCafes.filter((c) => c?.nombre);
  if (!candidates.length) return null;

  const hash = dateHash(dateStr);
  return candidates[hash % candidates.length];
}

export const STREAK_BADGES = [
  { days: 3, id: 'racha_3', icon: '🔥', title: 'Racha de fuego', desc: '3 días seguidos catando' },
  {
    days: 7,
    id: 'racha_7',
    icon: '📅',
    title: 'Catador semanal',
    desc: '7 días de racha ininterrumpida',
  },
  {
    days: 30,
    id: 'racha_30',
    icon: '💎',
    title: 'Catador PRO',
    desc: '30 días seguidos — eres una leyenda',
  },
];

export default function useDailyChallenge({ allCafes }) {
  const [state, setState] = useState(defaultState);
  const [loaded, setLoaded] = useState(false);

  // Load from SecureStore
  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setState({ ...defaultState(), ...JSON.parse(raw) });
          } catch {}
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const persist = useCallback((next) => {
    SecureStore.setItemAsync(STORE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const today = todayStr();

  const dailyCoffee = useMemo(() => pickDailyCoffee(allCafes, today), [allCafes, today]);

  const completedToday = state.completions.includes(today);
  const streak = useMemo(() => computeStreak(state.completions), [state.completions]);
  const bestStreak = Math.max(streak, state.bestStreak || 0);

  // Badges earned
  const earnedBadges = useMemo(
    () => STREAK_BADGES.filter((b) => bestStreak >= b.days),
    [bestStreak]
  );

  // Next badge to earn
  const nextBadge = useMemo(
    () => STREAK_BADGES.find((b) => bestStreak < b.days) || null,
    [bestStreak]
  );

  const completeDailyChallenge = useCallback(() => {
    if (completedToday) return null; // already done

    setState((prev) => {
      const completions = [...(prev.completions || []), today];
      const newStreak = computeStreak(completions);
      const newBest = Math.max(newStreak, prev.bestStreak || 0);

      const next = { ...prev, completions, bestStreak: newBest };
      persist(next);

      // Check for newly earned badge
      const prevBest = Math.max(computeStreak(prev.completions), prev.bestStreak || 0);
      const newBadge = STREAK_BADGES.find((b) => newBest >= b.days && prevBest < b.days);
      return next;
    });

    // Return the badge if one was just earned (caller can show toast)
    const newStreak = computeStreak([...state.completions, today]);
    const newBest = Math.max(newStreak, bestStreak);
    const prevBest = bestStreak;
    return STREAK_BADGES.find((b) => newBest >= b.days && prevBest < b.days) || null;
  }, [completedToday, today, state.completions, bestStreak, persist]);

  return {
    loaded,
    dailyCoffee,
    completedToday,
    streak,
    bestStreak,
    earnedBadges,
    nextBadge,
    completeDailyChallenge,
  };
}
