export const CLEAN_COFFEE_IMAGE =
  'https://images.openfoodfacts.org/images/products/761/303/656/9927/front_en.44.400.jpg';

export const normalize = (str) =>
  (str || '')
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
