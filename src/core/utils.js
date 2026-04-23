export const CLEAN_COFFEE_IMAGE =
  'https://images.openfoodfacts.org/images/products/761/303/656/9927/front_en.44.400.jpg';

export const normalize = (str) =>
  String(str ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

export const csvToSet = (value) =>
  new Set(
    String(value || '')
      .split('|')
      .map((v) => v.trim())
      .filter(Boolean)
  );

export const setToCsv = (set) => Array.from(set).join('|');

export const formatRelativeTime = (value) => {
  if (!value) return 'ahora';
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const min = Math.floor(diff / 60000);
  const h = Math.floor(min / 60);
  const d = Math.floor(h / 24);
  if (min < 60) return `${Math.max(1, min)}m`;
  if (h < 24) return `${h}h`;
  if (d < 7) return `${d}d`;
  return `${Math.floor(d / 7)} sem`;
};

export const getCleanCoffeePhoto = (foto) => foto || CLEAN_COFFEE_IMAGE;

/**
 * Returns the best available photo URL for a café object.
 *
 * Single source of truth — use this everywhere instead of ad-hoc
 * fallback chains like `cafe.bestPhoto || cafe.officialPhoto || cafe.foto`.
 *
 * Priority:
 *   1. photos.selected  (explicit pick by pickBestPhoto)
 *   2. bestPhoto         (computed winner)
 *   3. officialPhoto     (brand / barcode lookup)
 *   4. imageUrl          (sanitized canonical)
 *   5. foto              (legacy user upload)
 *   6. image             (rare legacy alias)
 *   7. CLEAN_COFFEE_IMAGE fallback
 */
export function getCafePhoto(cafe) {
  if (!cafe) return CLEAN_COFFEE_IMAGE;

  const selected = cafe.photos?.selected;
  if (selected && typeof selected === 'string' && selected.length > 10) return selected;

  const candidates = [cafe.bestPhoto, cafe.officialPhoto, cafe.imageUrl, cafe.foto, cafe.image];

  for (const url of candidates) {
    if (typeof url === 'string' && url.startsWith('http') && url.length > 10) {
      return url;
    }
  }

  return CLEAN_COFFEE_IMAGE;
}

/**
 * Builds the canonical photos object for a café.
 *
 * photos: {
 *   official: string[],     // brand / barcode photos
 *   user: string[],         // user-uploaded photos
 *   selected: string,       // computed best photo URL
 *   source: 'official' | 'user' | 'fallback'
 * }
 */
export function buildPhotosObject({
  officialPhotos = [],
  userPhotos = [],
  isCoffeePackage = true,
  aiConfidence = 0,
}) {
  const validUrl = (u) => typeof u === 'string' && u.startsWith('http') && u.length > 10;

  const official = officialPhotos.filter(validUrl);
  const user = userPhotos.filter(validUrl);

  let selected = '';
  let source = 'fallback';

  // Official wins if: it's a real coffee package AND we have decent confidence
  if (official.length > 0 && isCoffeePackage && aiConfidence >= 0.6) {
    selected = official[0];
    source = 'official';
  } else if (user.length > 0) {
    selected = user[0];
    source = 'user';
  } else if (official.length > 0) {
    // Fallback to official even with low confidence — better than nothing
    selected = official[0];
    source = 'official';
  }

  return { official, user, selected, source };
}
