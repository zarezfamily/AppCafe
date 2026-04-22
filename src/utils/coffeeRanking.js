/**
 * Reorders a pre-sorted list so no two consecutive items share the same brand.
 * Preserves relative ranking within each brand.
 */
export function spreadByBrand(items) {
  if (!items || items.length <= 1) return items;

  const getBrand = (item) =>
    String(item?.marca || item?.roaster || item?.brand || '')
      .trim()
      .toLowerCase();

  const brandMap = new Map();
  for (const item of items) {
    const brand = getBrand(item);
    if (!brandMap.has(brand)) brandMap.set(brand, []);
    brandMap.get(brand).push(item);
  }

  const queues = [...brandMap.values()].sort((a, b) => b.length - a.length);

  const result = [];
  while (result.length < items.length) {
    const lastBrand = result.length ? getBrand(result[result.length - 1]) : null;
    let placed = false;

    for (let i = 0; i < queues.length; i++) {
      if (queues[i].length === 0) continue;
      if (getBrand(queues[i][0]) !== lastBrand) {
        result.push(queues[i].shift());
        placed = true;
        queues.sort((a, b) => b.length - a.length);
        break;
      }
    }

    if (!placed) {
      for (let i = 0; i < queues.length; i++) {
        if (queues[i].length > 0) {
          result.push(queues[i].shift());
          queues.sort((a, b) => b.length - a.length);
          break;
        }
      }
    }
  }

  return result;
}

export function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function normalizeCategory(item) {
  const c = item?.coffeeCategory;
  if (c === 'daily') return 'daily';
  if (c === 'commercial') return 'commercial';
  return 'specialty';
}

export function isBioCoffee(item) {
  if (item?.isBio === true) return true;
  if (item?.isBio === false) return false;

  const text = [
    item?.certificaciones,
    item?.notas,
    item?.nombre,
    item?.marca,
    item?.roaster,
    item?.descripcion,
  ]
    .map(normalizeText)
    .join(' ');

  return (
    text.includes('bio') ||
    text.includes('ecológico') ||
    text.includes('ecologico') ||
    text.includes('orgánico') ||
    text.includes('organico') ||
    text.includes('organic')
  );
}

export function getRankingScore(item) {
  const puntuacion = Number(item?.puntuacion || 0);
  const votos = Number(item?.votos || 0);
  const isSpecialty = normalizeCategory(item) === 'specialty';
  const isBio = isBioCoffee(item);

  return puntuacion * 20 + Math.min(votos, 50) * 1.5 + (isSpecialty ? 6 : 0) + (isBio ? 3 : 0);
}

export function getTrendingScore(item) {
  const puntuacion = Number(item?.puntuacion || 0);
  const votos = Number(item?.votos || 0);

  return puntuacion * 10 + votos * 1.2;
}

export function getValueScore(item) {
  const puntuacion = Number(item?.puntuacion || 0);
  const votos = Number(item?.votos || 0);
  const precio = Number(item?.precio || 0);

  if (precio <= 0) return 0;

  return (puntuacion * 10 + Math.min(votos, 30)) / precio;
}

export function getBioScore(item) {
  if (!isBioCoffee(item)) return 0;

  const puntuacion = Number(item?.puntuacion || 0);
  const votos = Number(item?.votos || 0);

  return puntuacion * 20 + Math.min(votos, 40) * 1.2 + 8;
}

export function sortByRankingScore(items) {
  return [...(items || [])].sort((a, b) => getRankingScore(b) - getRankingScore(a));
}

export function sortByTrendingScore(items) {
  return [...(items || [])].sort((a, b) => getTrendingScore(b) - getTrendingScore(a));
}

export function sortByValueScore(items) {
  return [...(items || [])].sort((a, b) => getValueScore(b) - getValueScore(a));
}

export function sortByBioScore(items) {
  return [...(items || [])].sort((a, b) => getBioScore(b) - getBioScore(a));
}
