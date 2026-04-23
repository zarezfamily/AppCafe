/**
 * socialService.js
 *
 * Pure functions for computing the lightweight social layer.
 *
 * NOTE: Reading diario_catas without a uid filter requires Firestore rules
 * that allow authenticated reads of public catas:
 *
 *   match /diario_catas/{docId} {
 *     allow read: if request.auth != null && resource.data.public == true;
 *   }
 *
 * Until rules are updated, the hook handles the error silently and returns [].
 */

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Fetch the latest public catas across all users.
 * Uses getCollection from firestoreService (ordered by fechaHora, limited).
 */
export async function fetchRecentPublicCatas(getCollection, limit = 80) {
  const catas = await getCollection('diario_catas', 'fechaHora', limit);
  // Filter only catas explicitly marked public (or all if field is absent for now)
  return (catas || []).filter((c) => c.public !== false && !!c.cafeNombre && !!c.fechaHora);
}

/**
 * Given a list of recent catas, compute the hot cafes for the current week.
 * Returns [{ cafeId, cafeNombre, count, avgPuntuacion, foto }]
 */
export function computeWeeklyHotCafes(catas, allCafes = []) {
  const cutoff = Date.now() - WEEK_MS;
  const recent = (catas || []).filter((c) => new Date(c.fechaHora).getTime() >= cutoff);

  const map = new Map();
  for (const c of recent) {
    const key = c.cafeId || c.cafeNombre?.toLowerCase().trim() || '';
    if (!key) continue;
    const entry = map.get(key) || {
      cafeId: c.cafeId || '',
      cafeNombre: c.cafeNombre,
      count: 0,
      totalPuntuacion: 0,
      ratedCount: 0,
    };
    entry.count += 1;
    if (c.puntuacion > 0) {
      entry.totalPuntuacion += Number(c.puntuacion);
      entry.ratedCount += 1;
    }
    map.set(key, entry);
  }

  // Build a lookup map of cafe objects by id and by normalized name
  const cafeById = new Map((allCafes || []).map((c) => [c.id, c]));

  return [...map.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((entry) => {
      const cafeObj = cafeById.get(entry.cafeId) || null;
      return {
        ...entry,
        avgPuntuacion:
          entry.ratedCount > 0
            ? Math.round((entry.totalPuntuacion / entry.ratedCount) * 10) / 10
            : 0,
        foto: cafeObj?.bestPhoto || cafeObj?.officialPhoto || cafeObj?.foto || null,
        cafe: cafeObj,
      };
    });
}

/**
 * Build a Map<cafeId, count> of total tastings per cafe.
 */
export function computeTastingCountMap(catas) {
  const cutoff = Date.now() - MONTH_MS;
  const map = new Map();
  for (const c of catas || []) {
    if (!c.cafeId) continue;
    if (new Date(c.fechaHora).getTime() < cutoff) continue;
    map.set(c.cafeId, (map.get(c.cafeId) || 0) + 1);
  }
  return map;
}
