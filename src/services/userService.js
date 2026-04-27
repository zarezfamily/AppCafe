/**
 * userService.js
 * ────────────────────────────────────────────────────────────────
 * User-centric operations: authentication, profile management,
 * and user-scoped data (favorites, gamification).
 *
 * Consolidates:
 *  - services/authService.js                   (login, register, token management)
 *  - domain/profile/profilePersistence.js       (persistProfile)
 *  - domain/profile/profileValidation.js        (validation helpers)
 *  - domain/profile/profileStorage.js           (local secure storage)
 *  - services/storageService.js                 (image upload — for avatar)
 *  - core/gamification.js                       (XP, achievements)
 *  - core/premium.js                            (premium status)
 */

// ── Authentication ─────────────────────────────────────────────────
export {
  loginUser,
  registerUser,
  resetPassword,
  restoreAuthTokenFromSecureStore,
  saveAuthTokenToSecureStore,
  sendEmailVerification,
  sendPhoneVerificationCode,
  verifyPhoneCode,
} from './authService';

// ── Token management ───────────────────────────────────────────────
export { clearAuthToken, getAuthToken, setAuthToken } from './firebaseCore';

// ── Profile persistence (Firestore + image upload) ─────────────────
export { persistProfile } from '../domain/profile/profilePersistence';

// ── Profile validation ─────────────────────────────────────────────
export {
  buildProfileDraft,
  hasRequiredProfileFields,
  isValidProfileEmail,
} from '../domain/profile/profileValidation';

// ── Profile local storage ──────────────────────────────────────────
export { loadStoredProfile, saveStoredProfile } from '../domain/profile/profileStorage';

// ── Profile sync (real-time polling) ───────────────────────────────
import { getDocument, setDocument } from './firestoreService';

const PROFILES_COLLECTION = 'user_profiles';

/** Fetch a user profile by uid. */
export async function getUserProfile(uid) {
  return getDocument(PROFILES_COLLECTION, uid);
}

/** Update a user profile. */
export async function setUserProfile(uid, data) {
  return setDocument(PROFILES_COLLECTION, uid, data);
}

// ── Image upload (avatar) ──────────────────────────────────────────
export { uploadImageToStorage } from './storageService';
