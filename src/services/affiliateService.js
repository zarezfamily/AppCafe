/**
 * affiliateService.js
 * ────────────────────────────────────────────────────────────────
 * Affiliate link management: Amazon Associates tag injection,
 * link tracking, and buy-link resolution for cafés.
 *
 * buyLinks schema on each café document:
 *   buyLinks: [
 *     { store: 'Amazon', url: 'https://...', tag?: 'etiove-21' },
 *     { store: 'Tostador', url: 'https://...' },
 *   ]
 */

import { Linking } from 'react-native';

// ── Amazon Associates config ───────────────────────────────────────
const AMAZON_ASSOCIATE_TAG = 'etiove-21';

const AMAZON_DOMAINS = [
  'amazon.es',
  'amazon.com',
  'amazon.co.uk',
  'amazon.de',
  'amazon.fr',
  'amazon.it',
  'amzn.to',
  'amzn.eu',
];

/**
 * True if the URL points to any Amazon domain.
 */
export function isAmazonUrl(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return AMAZON_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

/**
 * Inject the Amazon Associates tag into an Amazon URL.
 * If the URL already has a tag, it is replaced.
 */
export function injectAmazonTag(rawUrl, tag = AMAZON_ASSOCIATE_TAG) {
  if (!rawUrl || !isAmazonUrl(rawUrl)) return rawUrl;

  try {
    const url = new URL(rawUrl);
    url.searchParams.set('tag', tag);
    return url.toString();
  } catch {
    // Fallback: append as query string
    const sep = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${sep}tag=${encodeURIComponent(tag)}`;
  }
}

/**
 * Given a café's buyLinks array, return the "best" link to open.
 * Priority: Amazon (monetized) > Tostador > first available.
 */
export function resolveBestBuyLink(buyLinks = []) {
  if (!Array.isArray(buyLinks) || buyLinks.length === 0) return null;

  const valid = buyLinks.filter(
    (l) => l && typeof l.url === 'string' && /^https?:\/\//.test(l.url)
  );
  if (valid.length === 0) return null;

  // Prefer Amazon (affiliate revenue)
  const amazon = valid.find((l) => isAmazonUrl(l.url));
  if (amazon) {
    return {
      ...amazon,
      url: injectAmazonTag(amazon.url),
      isAffiliate: true,
    };
  }

  // Fallback to first link
  return { ...valid[0], isAffiliate: false };
}

/**
 * Return all buy links for a café, with Amazon links tagged.
 */
export function getTaggedBuyLinks(buyLinks = []) {
  if (!Array.isArray(buyLinks)) return [];

  return buyLinks
    .filter((l) => l && typeof l.url === 'string' && /^https?:\/\//.test(l.url))
    .map((link) => ({
      ...link,
      url: isAmazonUrl(link.url) ? injectAmazonTag(link.url) : link.url,
      isAffiliate: isAmazonUrl(link.url),
    }));
}

/**
 * Open a buy link in the device browser.
 * Injects affiliate tag for Amazon links automatically.
 */
export async function openBuyLink(link) {
  if (!link?.url) return false;

  const finalUrl = isAmazonUrl(link.url) ? injectAmazonTag(link.url) : link.url;

  const canOpen = await Linking.canOpenURL(finalUrl);
  if (!canOpen) return false;

  await Linking.openURL(finalUrl);
  return true;
}

/**
 * Get the store icon name (Ionicons) for a known store.
 */
export function getStoreIcon(storeName) {
  const name = String(storeName || '').toLowerCase();
  if (name.includes('amazon')) return 'logo-amazon';
  if (name.includes('tostador') || name.includes('roaster')) return 'cafe-outline';
  if (name.includes('corte') || name.includes('eci')) return 'storefront-outline';
  if (name.includes('carrefour')) return 'cart-outline';
  if (name.includes('mercadona')) return 'cart-outline';
  return 'bag-handle-outline';
}

/**
 * Get a display label for the buy button.
 */
export function getBuyButtonLabel(buyLinks = []) {
  const resolved = resolveBestBuyLink(buyLinks);
  if (!resolved) return null;

  if (resolved.isAffiliate) {
    return { text: 'Comprar en Amazon', icon: 'logo-amazon', accent: '#FF9900' };
  }

  return {
    text: `Comprar en ${resolved.store || 'tienda'}`,
    icon: getStoreIcon(resolved.store),
    accent: '#8b6d57',
  };
}
