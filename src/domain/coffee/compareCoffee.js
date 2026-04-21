function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeCategory(cafe) {
  if (cafe?.category === 'supermarket') return 'daily';
  if (cafe?.category === 'bio') return 'specialty';
  if (cafe?.category === 'specialty') return 'specialty';
  if (cafe?.isSpecialty === true) return 'specialty';

  const category = String(cafe?.coffeeCategory || '')
    .trim()
    .toLowerCase();
  if (category === 'daily' || category === 'commercial') return 'daily';
  return 'specialty';
}

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

function getPriceNumber(cafe) {
  const parsed = Number(cafe?.precio || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getSignals(cafe) {
  return {
    category: normalizeCategory(cafe),
    origin: normalizeText(cafe?.pais || cafe?.origen || cafe?.origin).toLowerCase(),
    process: normalizeText(cafe?.proceso || cafe?.process).toLowerCase(),
    variety: normalizeText(cafe?.variedad || cafe?.variety).toLowerCase(),
    roast: normalizeText(cafe?.tueste || cafe?.roastLevel).toLowerCase(),
    roaster: normalizeText(cafe?.roaster || cafe?.marca || cafe?.brand).toLowerCase(),
  };
}

function buildReason(baseCafe, candidate) {
  const baseSignals = getSignals(baseCafe);
  const candidateSignals = getSignals(candidate);

  if (candidateSignals.origin && candidateSignals.origin === baseSignals.origin) {
    return 'Comparte origen con este cafe';
  }

  if (candidateSignals.process && candidateSignals.process === baseSignals.process) {
    return 'Mantiene un proceso parecido';
  }

  if (candidateSignals.variety && candidateSignals.variety === baseSignals.variety) {
    return 'Se parece en variedad';
  }

  if (baseSignals.category === 'daily' && candidateSignals.category === 'specialty') {
    return 'Un salto natural hacia specialty';
  }

  return 'Alternativa fuerte por calidad global';
}

function scoreCandidate(baseCafe, candidate) {
  const baseSignals = getSignals(baseCafe);
  const candidateSignals = getSignals(candidate);
  const basePrice = getPriceNumber(baseCafe);
  const candidatePrice = getPriceNumber(candidate);
  const baseSca = getScaScore(baseCafe);
  const candidateSca = getScaScore(candidate);

  let score = 0;

  score += Number(candidate?.rankingScore || 0) * 0.04;
  score += Number(candidate?.trendingScore || 0) * 0.03;
  score += Number(candidate?.valueScore || 0) * 0.18;
  score += Number(candidate?.bioScore || 0) * 0.03;
  score += Number(candidate?.puntuacion || 0) * 1.15;
  score += Math.max(0, candidateSca - 80) * 0.42;

  if (candidateSignals.category === baseSignals.category) score += 5;
  if (baseSignals.category === 'daily' && candidateSignals.category === 'specialty') score += 4;
  if (candidateSignals.origin && candidateSignals.origin === baseSignals.origin) score += 4;
  if (candidateSignals.process && candidateSignals.process === baseSignals.process) score += 3;
  if (candidateSignals.variety && candidateSignals.variety === baseSignals.variety) score += 2;
  if (candidateSignals.roast && candidateSignals.roast === baseSignals.roast) score += 1.5;
  if (candidateSignals.roaster && candidateSignals.roaster === baseSignals.roaster) score += 1;

  if (basePrice > 0 && candidatePrice > 0) {
    const delta = Math.abs(candidatePrice - basePrice);
    if (delta <= 2) score += 4;
    else if (delta <= 5) score += 2.5;
    else if (delta <= 8) score += 1;
  }

  if (baseSca > 0 && candidateSca > 0) {
    const deltaSca = candidateSca - baseSca;
    score += deltaSca >= 0 ? deltaSca * 0.35 : deltaSca * 0.15;
  }

  return Number(score.toFixed(3));
}

export function getComparableCafes(baseCafe, cafes = [], limit = 3) {
  if (!baseCafe) return [];

  return (cafes || [])
    .filter(Boolean)
    .filter((candidate) => candidate.id !== baseCafe.id)
    .filter((candidate) => isApprovedCafe(candidate))
    .filter((candidate) => normalizeText(candidate?.nombre || candidate?.name).length > 0)
    .filter(
      (candidate) =>
        normalizeText(candidate?.roaster || candidate?.marca || candidate?.brand).length > 0
    )
    .map((candidate) => ({
      ...candidate,
      comparisonScore: scoreCandidate(baseCafe, candidate),
      comparisonReason: buildReason(baseCafe, candidate),
    }))
    .filter((candidate) => candidate.comparisonScore > 0)
    .sort((a, b) => b.comparisonScore - a.comparisonScore)
    .slice(0, limit);
}
