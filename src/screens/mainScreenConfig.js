export const APP_VERSION = '2.1.0';
export const GOOGLE_PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY || '';
export const PREMIUM_ACCENT = '#8f5e3b';
export const PREMIUM_ACCENT_DEEP = '#5d4030';
export const PREMIUM_SURFACE_SOFT = '#f6ede3';
export const PREMIUM_SURFACE_TINT = '#fbf5ee';
export const PREMIUM_BORDER_SOFT = '#e4d3c2';

export const THEME = {
  brand: {
    accent: PREMIUM_ACCENT,
    accentDeep: PREMIUM_ACCENT_DEEP,
    primary: '#2f1d14',
    primaryBorder: '#4f3425',
    primaryBorderStrong: '#5a3c2a',
    onPrimary: '#fff9f1',
    soft: PREMIUM_SURFACE_SOFT,
    tint: PREMIUM_SURFACE_TINT,
    borderSoft: PREMIUM_BORDER_SOFT,
  },
  status: {
    success: '#5f8f61',
    successSoft: '#eaf3ea',
    danger: '#a44f45',
    favorite: '#d0a646',
  },
  text: {
    primary: '#111',
    secondary: '#888',
    muted: '#aaa',
    tertiary: '#555',
    inverse: '#fff',
  },
  surface: {
    base: '#fff',
    subtle: '#f9f9f9',
    soft: '#f5f5f5',
    softAlt: '#f8f7f4',
  },
  border: {
    soft: '#eee',
    subtle: '#f0f0f0',
    muted: '#ddd4cb',
  },
  icon: {
    inactive: '#888',
    muted: '#aaa',
    faint: '#ccc',
  },
};

export const KEY_EMAIL = 'etiove_email';
export const KEY_PASSWORD = 'etiove_password';
export const KEY_REMEMBER = 'etiove_remember';
export const KEY_FAVS = 'etiove_favorites';
export const KEY_PREFS = 'etiove_preferences';
export const KEY_PROFILE = 'etiove_profile';
export const KEY_VOTES = 'etiove_votes';
export const KEY_OFFERS_CACHE = 'etiove_offers_cache';
export const KEY_GAMIFICATION = 'etiove_gamification';
export const KEY_HAS_ACCOUNT = 'etiove_has_account';
export const KEY_ONBOARDING_DONE = 'etiove_onboarding_done';
export const KEY_INTERACTION_FEEDBACK = 'etiove_interaction_feedback';
export const KEY_INTERACTION_FEEDBACK_SETTINGS = 'etiove_interaction_feedback_settings';
export const KEY_NOTIFY_COMMUNITY_SNAPSHOT = 'etiove_notify_community_snapshot';
export const KEY_NOTIFY_FORUM_SNAPSHOT = 'etiove_notify_forum_snapshot';
export const KEY_NOTIFY_FAVORITES_SNAPSHOT = 'etiove_notify_favorites_snapshot';
export const OFFERS_CACHE_TTL_MS = 1000 * 60 * 60 * 8;
