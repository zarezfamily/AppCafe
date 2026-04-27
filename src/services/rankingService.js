/**
 * rankingService.js
 * ────────────────────────────────────────────────────────────────
 * Ranking, filtering, and social-feed operations.
 *
 * Consolidates:
 *  - domain/coffee/liveRankings.js  (getLiveRankingBuckets)
 *  - domain/coffee/coffeeFilters.js (filterCoffeeList, selectTopCoffeesForCountry)
 *  - core/socialService.js          (fetchRecentPublicCatas, computeWeeklyHotCafes, etc.)
 */

// ── Live Rankings ──────────────────────────────────────────────────
export { getLiveRankingBuckets } from '../domain/coffee/liveRankings';

// ── Filtering & Search ─────────────────────────────────────────────
export { filterCoffeeList, selectTopCoffeesForCountry } from '../domain/coffee/coffeeFilters';

// ── Social Feed ────────────────────────────────────────────────────
export {
  computeTastingCountMap,
  computeWeeklyHotCafes,
  fetchRecentPublicCatas,
} from '../core/socialService';
