export function normalizeBarcode(code) {
  return String(code || '')
    .replace(/\s+/g, '')
    .trim();
}

export function isValidEAN13(code) {
  const value = normalizeBarcode(code);

  if (!/^\d{13}$/.test(value)) return false;

  const digits = value.split('').map(Number);
  const checkDigit = digits[12];

  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += digits[i] * (i % 2 === 0 ? 1 : 3);
  }

  const calculated = (10 - (sum % 10)) % 10;
  return calculated === checkDigit;
}

export function findCoffeeByBarcode(cafes, scannedCode) {
  const normalized = normalizeBarcode(scannedCode);
  if (!normalized) return null;

  return (
    (cafes || []).find((cafe) => normalizeBarcode(cafe?.ean) === normalized) ||
    (cafes || []).find((cafe) => normalizeBarcode(cafe?.sku) === normalized) ||
    null
  );
}

export function getBarcodeSearchResult({ cafes, scannedCode }) {
  const normalized = normalizeBarcode(scannedCode);

  if (!normalized) {
    return {
      ok: false,
      reason: 'empty',
      code: '',
      coffee: null,
    };
  }

  const coffee = findCoffeeByBarcode(cafes, normalized);

  if (coffee) {
    return {
      ok: true,
      reason: 'found',
      code: normalized,
      coffee,
    };
  }

  if (/^\d{13}$/.test(normalized) && !isValidEAN13(normalized)) {
    return {
      ok: false,
      reason: 'invalid_ean13',
      code: normalized,
      coffee: null,
    };
  }

  return {
    ok: false,
    reason: 'not_found',
    code: normalized,
    coffee: null,
  };
}
