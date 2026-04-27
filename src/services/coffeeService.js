/**
 * coffeeService.js
 * ────────────────────────────────────────────────────────────────
 * Unified café domain service. Combines CRUD operations (via Firestore)
 * with domain logic (sanitization, inference, SCA scoring, approval).
 *
 * Re-exports everything from the existing cafeService for backward
 * compatibility, and adds Firestore-backed operations that screens
 * currently call directly from firestoreService.
 */

// ── Re-export all domain logic from cafeService (pure functions) ───
export {
  buildApprovalPayload,
  buildCompletionStatus,
  buildScaPayload,
  canBeApproved,
  computeAutomaticSca,
  computeDataCompleteness,
  ensureCafeDefaults,
  isCafeIncomplete,
  normalizeEan,
  sanitizeCafePayload,
} from './cafeService';

// ── Re-export CRUD wrappers that already exist in cafeService ──────
export {
  approveCafe,
  createOrGetPendingCafeFromScan,
  findAnyCafeByEan,
  findCafeByEan,
  findLegacyCafeByEan,
  getCafeById,
  rejectCafe,
  resolveScan,
  saveCafeDraft,
} from './cafeService';

// ── Additional Firestore-backed café operations ────────────────────
import { ensureCafeDefaults as _ensureDefaults } from './cafeService';
import {
  getUserCafes as _getUserCafes,
  addDocument,
  deleteDocument,
  getCollection,
  getDocument,
  queryCollection,
  setDocument,
  updateDocument,
} from './firestoreService';

const CAFES_COLLECTION = 'cafes';
const CATAS_COLLECTION = 'catas';

/** Fetch all cafés belonging to a user. */
export async function getUserCafes(uid) {
  return _getUserCafes(uid);
}

/** Fetch the top-rated cafés (ordered by score, limited). */
export async function getTopCafes(limit = 1500) {
  return getCollection(CAFES_COLLECTION, 'puntuacion', limit);
}

/** Fetch all cafés (ordered by date, limited). */
export async function getAllCafes(limit = 1500) {
  return getCollection(CAFES_COLLECTION, 'fecha', limit);
}

/** Fetch a single café by docId. */
export async function getCafe(cafeId) {
  return getDocument(CAFES_COLLECTION, cafeId);
}

/** Create a new café document with auto-generated ID. Applies visibility defaults. */
export async function addCafe(data) {
  return addDocument(CAFES_COLLECTION, _ensureDefaults(data));
}

/** Create or overwrite a café document with a specific ID. Applies visibility defaults. */
export async function setCafe(cafeId, data) {
  return setDocument(CAFES_COLLECTION, cafeId, _ensureDefaults(data));
}

/** Partial update of a café document. */
export async function updateCafe(cafeId, data) {
  return updateDocument(CAFES_COLLECTION, cafeId, data);
}

/** Delete a café document. */
export async function deleteCafe(cafeId) {
  return deleteDocument(CAFES_COLLECTION, cafeId);
}

/** Query cafés by a field value. */
export async function queryCafes(field, value) {
  return queryCollection(CAFES_COLLECTION, field, value);
}

// ── Cata (tasting) operations ──────────────────────────────────────

/** Add a new tasting/cata. */
export async function addCata(data) {
  return addDocument(CATAS_COLLECTION, data);
}

/** Update a tasting/cata. */
export async function updateCata(cataId, data) {
  return updateDocument(CATAS_COLLECTION, cataId, data);
}

/** Delete a tasting/cata. */
export async function deleteCata(cataId) {
  return deleteDocument(CATAS_COLLECTION, cataId);
}

/** Fetch recent public catas. */
export async function getRecentCatas(limit = 200) {
  return getCollection(CATAS_COLLECTION, 'fechaHora', limit);
}
