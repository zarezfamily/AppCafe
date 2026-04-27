import { getCafePhoto } from '../../core/utils';

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeCategory(cafe) {
  if (cafe?.category === 'supermarket') return 'daily';
  if (cafe?.isSpecialty === true) return 'specialty';

  const category = String(cafe?.coffeeCategory || '')
    .trim()
    .toLowerCase();
  if (category === 'daily' || category === 'commercial') return 'daily';
  return 'specialty';
}

const getPhoto = getCafePhoto;

function isApprovedCafe(cafe) {
  return (
    cafe?.status === 'approved' || cafe?.reviewStatus === 'approved' || cafe?.appVisible === true
  );
}

function getScaScore(cafe) {
  if (cafe?.sca && typeof cafe.sca === 'object') {
    const score = Number(cafe.sca.score || 0);
    return Number.isFinite(score) ? score : 0;
  }

  const legacy = Number(cafe?.sca || 0);
  return Number.isFinite(legacy) ? legacy : 0;
}

function getSignals(cafe) {
  return {
    category: normalizeCategory(cafe),
    origin: normalizeText(cafe?.pais || cafe?.origen || cafe?.origin).toLowerCase(),
    process: normalizeText(cafe?.proceso || cafe?.process).toLowerCase(),
    variety: normalizeText(cafe?.variedad || cafe?.variety).toLowerCase(),
    roaster: normalizeText(cafe?.roaster || cafe?.marca || cafe?.brand).toLowerCase(),
  };
}

function getPriceNumber(cafe) {
  const parsed = Number(cafe?.precio || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildRecommendationCopy(scannedCafe, candidate, priceDelta) {
  const scannedSignals = getSignals(scannedCafe);
  const candidateSignals = getSignals(candidate);

  if (priceDelta > 0 && priceDelta <= 3) {
    return `Este esta bien, pero este otro sube bastante el nivel por solo +${priceDelta.toFixed(2)} €`;
  }

  if (candidateSignals.origin && candidateSignals.origin === scannedSignals.origin) {
    return 'Mantiene un origen parecido, pero con mas trazabilidad y mejor taza.';
  }

  if (candidateSignals.process && candidateSignals.process === scannedSignals.process) {
    return 'Se mueve en un perfil parecido, pero mejor afinado y mas limpio en taza.';
  }

  if (scannedSignals.category === 'daily') {
    return 'Una evolucion muy natural si quieres salir del cafe diario sin pegar un salto raro.';
  }

  return 'Una alternativa mejor resuelta para subir calidad sin perder el estilo que ya te gusta.';
}

function buildReason(scannedCafe, candidate, priceDelta) {
  const scannedSignals = getSignals(scannedCafe);
  const candidateSignals = getSignals(candidate);

  if (priceDelta > 0 && priceDelta <= 3) {
    return `Sube de nivel por apenas +${priceDelta.toFixed(2)} €`;
  }

  if (candidateSignals.origin && candidateSignals.origin === scannedSignals.origin) {
    return 'Comparte origen con tu cafe actual';
  }

  if (candidateSignals.process && candidateSignals.process === scannedSignals.process) {
    return 'Mantiene un proceso parecido al que acabas de escanear';
  }

  if (candidateSignals.variety && candidateSignals.variety === scannedSignals.variety) {
    return 'Se parece en variedad, pero da un salto claro en calidad';
  }

  return 'Mejor equilibrio entre calidad, puntuacion y valor';
}

function scoreCandidate(scannedCafe, candidate) {
  const scannedSignals = getSignals(scannedCafe);
  const candidateSignals = getSignals(candidate);
  const candidatePrice = getPriceNumber(candidate);
  const scannedPrice = getPriceNumber(scannedCafe);
  const scaScore = getScaScore(candidate);

  let score = 0;

  score += Number(candidate?.rankingScore || 0) * 0.04;
  score += Number(candidate?.trendingScore || 0) * 0.035;
  score += Number(candidate?.valueScore || 0) * 0.18;
  score += Number(candidate?.bioScore || 0) * 0.03;
  score += Number(candidate?.puntuacion || 0) * 1.2;
  score += Math.max(0, scaScore - 80) * 0.45;

  if (candidateSignals.category === 'specialty') score += 6;
  if (candidateSignals.origin && candidateSignals.origin === scannedSignals.origin) score += 4;
  if (candidateSignals.process && candidateSignals.process === scannedSignals.process) score += 3;
  if (candidateSignals.variety && candidateSignals.variety === scannedSignals.variety) score += 2;
  if (candidateSignals.roaster && candidateSignals.roaster === scannedSignals.roaster) score += 1;

  if (scannedPrice > 0 && candidatePrice > 0) {
    const delta = candidatePrice - scannedPrice;
    if (delta <= 0) score += 4;
    else if (delta <= 2.5) score += 5;
    else if (delta <= 5) score += 2.5;
    else if (delta <= 8) score += 1;
    else score -= Math.min(delta - 8, 6);
  }

  if (normalizeCategory(scannedCafe) === 'specialty') {
    const scannedSca = getScaScore(scannedCafe);
    if (scaScore > 0 && scannedSca > 0) {
      score += Math.max(0, scaScore - scannedSca) * 0.4;
    }
  }

  return Number(score.toFixed(3));
}

export function getUpgradeForScannedCafe(scannedCafe, cafes = []) {
  if (!scannedCafe) return null;

  const scannedCategory = normalizeCategory(scannedCafe);
  const scannedPrice = getPriceNumber(scannedCafe);
  const scannedSca = getScaScore(scannedCafe);

  const candidates = (cafes || [])
    .filter(Boolean)
    .filter((cafe) => cafe.id !== scannedCafe.id)
    .filter((cafe) => isApprovedCafe(cafe))
    .filter((cafe) => normalizeCategory(cafe) === 'specialty')
    .filter((cafe) => normalizeText(getPhoto(cafe)).length > 0)
    .filter((cafe) => normalizeText(cafe?.nombre).length > 0)
    .filter((cafe) => normalizeText(cafe?.roaster || cafe?.marca || cafe?.brand).length > 0)
    .filter((cafe) => Number(cafe?.puntuacion || 0) >= 3.8)
    .map((candidate) => ({
      ...candidate,
      scanUpgradeScore: scoreCandidate(scannedCafe, candidate),
    }))
    .filter((candidate) => candidate.scanUpgradeScore > 0)
    .sort((a, b) => b.scanUpgradeScore - a.scanUpgradeScore);

  const best = candidates[0];
  if (!best) return null;

  const bestSca = getScaScore(best);
  if (
    scannedCategory === 'specialty' &&
    scannedSca > 0 &&
    bestSca > 0 &&
    bestSca <= scannedSca + 1
  ) {
    return null;
  }

  const bestPrice = getPriceNumber(best);
  const priceDelta =
    scannedPrice > 0 && bestPrice > 0 ? Number((bestPrice - scannedPrice).toFixed(2)) : null;

  return {
    cafe: best,
    badge: scannedCategory === 'daily' ? 'Mejora tu cafe actual' : 'Alternativa afinada',
    title:
      scannedCategory === 'daily'
        ? 'Prueba este salto natural a specialty'
        : 'Hay una alternativa que encaja aun mejor contigo',
    editorial: buildRecommendationCopy(scannedCafe, best, priceDelta || 0),
    reason: buildReason(scannedCafe, best, priceDelta || 0),
    priceDelta,
  };
}
