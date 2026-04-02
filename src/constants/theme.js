import { Dimensions } from 'react-native';

export const { width: W, height: H } = Dimensions.get('window');
export const APP_VERSION = '2.1.0';
export const GOOGLE_PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY || '';

export const PREMIUM_ACCENT       = '#8f5e3b';
export const PREMIUM_ACCENT_DEEP  = '#5d4030';
export const PREMIUM_SURFACE_SOFT = '#f6ede3';
export const PREMIUM_SURFACE_TINT = '#fbf5ee';
export const PREMIUM_BORDER_SOFT  = '#e4d3c2';

export const THEME = {
  brand: {
    accent:             PREMIUM_ACCENT,
    accentDeep:         PREMIUM_ACCENT_DEEP,
    primary:            '#2f1d14',
    primaryBorder:      '#4f3425',
    primaryBorderStrong:'#5a3c2a',
    onPrimary:          '#fff9f1',
    soft:               PREMIUM_SURFACE_SOFT,
    tint:               PREMIUM_SURFACE_TINT,
    borderSoft:         PREMIUM_BORDER_SOFT,
  },
  status: {
    success:     '#5f8f61',
    successSoft: '#eaf3ea',
    danger:      '#a44f45',
    favorite:    '#d0a646',
  },
  text: {
    primary:   '#111',
    secondary: '#888',
    muted:     '#aaa',
    tertiary:  '#555',
    inverse:   '#fff',
  },
  surface: {
    base:    '#fff',
    subtle:  '#f9f9f9',
    soft:    '#f5f5f5',
    softAlt: '#f8f7f4',
  },
  border: {
    soft:   '#eee',
    subtle: '#f0f0f0',
    muted:  '#ddd4cb',
  },
  icon: {
    inactive: '#888',
    muted:    '#aaa',
    faint:    '#ccc',
  },
};
