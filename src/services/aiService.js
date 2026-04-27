/**
 * aiService.js
 * ────────────────────────────────────────────────────────────────
 * AI / intelligence layer. Personalized recommendations,
 * comparisons, hero selections, and scan-based upgrades.
 *
 * Consolidates:
 *  - domain/coffee/personalizedCoffee.js  (getPersonalizedCoffeeFeed)
 *  - domain/coffee/compareCoffee.js       (getComparableCafes)
 *  - domain/coffee/heroCoffee.js          (getHeroCafe)
 *  - domain/coffee/scanUpgrade.js         (getUpgradeForScannedCafe)
 *  - services/cafeService.js              (computeAutomaticSca — SCA estimation)
 */

// ── Personalized feed (affinity-based) ─────────────────────────────
export { getPersonalizedCoffeeFeed } from '../domain/coffee/personalizedCoffee';

// ── Similar / comparable cafés ─────────────────────────────────────
export { getComparableCafes } from '../domain/coffee/compareCoffee';

// ── Hero café (editorial spotlight) ────────────────────────────────
export { getHeroCafe } from '../domain/coffee/heroCoffee';

// ── Scan-based upgrade recommendation ──────────────────────────────
export { getUpgradeForScannedCafe } from '../domain/coffee/scanUpgrade';

// ── Automatic SCA score estimation ─────────────────────────────────
export { computeAutomaticSca } from './cafeService';
