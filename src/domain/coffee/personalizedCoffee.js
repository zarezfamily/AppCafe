function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeCategory(cafe) {
  if (cafe?.category === 'supermarket') return 'daily';
  const category = cafe?.coffeeCategory;
  if (category === 'daily') return 'daily';
  if (category === 'commercial') return 'daily';
  return 'specialty';
}

function getPhoto(cafe) {
  return (
    cafe?.bestPhoto || cafe?.officialPhoto || cafe?.foto || cafe?.image || cafe?.imageUrl || ''
  );
}

function isApprovedCafe(cafe) {
  return (
    cafe?.status === 'approved' || cafe?.reviewStatus === 'approved' || cafe?.appVisible === true
  );
}

function getSignals(cafe) {
  return {
    category: normalizeCategory(cafe),
    origin: normalizeText(cafe?.pais || cafe?.origen || cafe?.origin).toLowerCase(),
    process: normalizeText(cafe?.proceso || cafe?.process).toLowerCase(),
    roaster: normalizeText(cafe?.roaster || cafe?.marca).toLowerCase(),
    variety: normalizeText(cafe?.variedad || cafe?.variety).toLowerCase(),
  };
}

function getScaScore(cafe) {
  if (cafe?.sca && typeof cafe.sca === 'object') {
    const score = Number(cafe.sca.score || 0);
    return Number.isFinite(score) ? score : 0;
  }

  const legacy = Number(cafe?.sca || 0);
  return Number.isFinite(legacy) ? legacy : 0;
}

function buildReason(candidate, favorite) {
  const candidateSignals = getSignals(candidate);
  const favoriteSignals = getSignals(favorite);

  if (candidateSignals.process && candidateSignals.process === favoriteSignals.process) {
    return `Mas como tu favorito de proceso ${candidateSignals.process}`;
  }

  if (candidateSignals.origin && candidateSignals.origin === favoriteSignals.origin) {
    return `Perfil cercano a tu favorito de ${candidateSignals.origin}`;
  }

  if (candidateSignals.category === favoriteSignals.category) {
    return candidateSignals.category === 'daily'
      ? 'Encaja con tu cafe diario favorito'
      : 'Encaja con tu perfil de especialidad';
  }

  return 'Seleccionado por afinidad contigo';
}

function computeAffinity(candidate, favorite) {
  const candidateSignals = getSignals(candidate);
  const favoriteSignals = getSignals(favorite);

  let score = 0;

  if (candidateSignals.category === favoriteSignals.category) score += 4;
  if (candidateSignals.origin && candidateSignals.origin === favoriteSignals.origin) score += 3;
  if (candidateSignals.process && candidateSignals.process === favoriteSignals.process) score += 2;
  if (candidateSignals.roaster && candidateSignals.roaster === favoriteSignals.roaster) score += 2;
  if (candidateSignals.variety && candidateSignals.variety === favoriteSignals.variety)
    score += 1.5;

  score += Number(candidate?.rankingScore || 0) * 0.03;
  score += Number(candidate?.trendingScore || 0) * 0.03;
  score += Number(candidate?.valueScore || 0) * 0.15;
  score += Number(candidate?.puntuacion || 0) * 1.2;

  return score;
}

function computeDailyUpgradeScore(candidate, favorite) {
  const candidateSignals = getSignals(candidate);
  const favoriteSignals = getSignals(favorite);

  let score = 0;

  if (candidateSignals.category !== 'specialty') return 0;

  score += Number(candidate?.rankingScore || 0) * 0.04;
  score += Number(candidate?.trendingScore || 0) * 0.04;
  score += Number(candidate?.valueScore || 0) * 0.18;
  score += Number(candidate?.puntuacion || 0) * 1.3;
  score += Math.max(0, getScaScore(candidate) - 78) * 0.4;

  if (candidateSignals.origin && candidateSignals.origin === favoriteSignals.origin) score += 4;
  if (candidateSignals.process && candidateSignals.process === favoriteSignals.process) score += 3;
  if (candidateSignals.roaster && candidateSignals.roaster === favoriteSignals.roaster)
    score += 1.5;

  const favoritePrice = Number(favorite?.precio || 0);
  const candidatePrice = Number(candidate?.precio || 0);

  if (favoritePrice > 0 && candidatePrice > 0) {
    const delta = candidatePrice - favoritePrice;
    if (delta <= 2.5) score += 4;
    else if (delta <= 5) score += 2;
    else if (delta > 10) score -= 2;
  }

  return score;
}

function buildDailyUpgradeReason(candidate, favorite) {
  const candidateSignals = getSignals(candidate);
  const favoriteSignals = getSignals(favorite);
  const favoritePrice = Number(favorite?.precio || 0);
  const candidatePrice = Number(candidate?.precio || 0);

  if (favoritePrice > 0 && candidatePrice > 0) {
    const delta = candidatePrice - favoritePrice;
    if (delta > 0 && delta <= 3) {
      return `Un salto serio por apenas +${delta.toFixed(2)} € frente a tu cafe diario`;
    }
  }

  if (candidateSignals.origin && candidateSignals.origin === favoriteSignals.origin) {
    return `Sube de nivel manteniendo el origen que ya te funciona`;
  }

  if (candidateSignals.process && candidateSignals.process === favoriteSignals.process) {
    return `Una mejora natural si te gusta ese mismo tipo de proceso`;
  }

  return 'Una alternativa mas afinada para mejorar tu cafe diario';
}

export function getPersonalizedCoffeeFeed(cafes = [], favs = []) {
  const favSet = new Set((favs || []).filter(Boolean));

  const valid = (cafes || [])
    .filter(Boolean)
    .filter((cafe) => isApprovedCafe(cafe))
    .filter((cafe) => normalizeText(getPhoto(cafe)).length > 0)
    .filter((cafe) => normalizeText(cafe?.nombre).length > 0)
    .filter((cafe) => normalizeText(cafe?.roaster || cafe?.marca).length > 0)
    .filter((cafe) => Number(cafe?.puntuacion || 0) >= 3.5);

  const favoriteCafes = valid.filter((cafe) => favSet.has(cafe.id));
  const favoriteDailyCafes = favoriteCafes.filter((cafe) => normalizeCategory(cafe) === 'daily');

  if (!favoriteCafes.length) {
    const fallbackItems = [...valid]
      .sort((a, b) => Number(b?.trendingScore || 0) - Number(a?.trendingScore || 0))
      .slice(0, 8)
      .map((item) => ({
        ...item,
        recommendationReason: 'Descubrimiento para empezar a personalizar',
      }));

    return {
      title: 'Para ti',
      subtitle: 'Empieza a guardar favoritos y ETIOVE irá afinando estas recomendaciones.',
      items: fallbackItems,
    };
  }

  const recommended = valid
    .filter((cafe) => !favSet.has(cafe.id))
    .map((candidate) => {
      const scoredMatches = favoriteCafes.map((favorite) => ({
        favorite,
        affinity: computeAffinity(candidate, favorite),
      }));

      scoredMatches.sort((a, b) => b.affinity - a.affinity);
      const best = scoredMatches[0];

      return {
        ...candidate,
        personalizedScore: Number((best?.affinity || 0).toFixed(3)),
        recommendationReason: best ? buildReason(candidate, best.favorite) : 'Seleccionado para ti',
      };
    })
    .filter((item) => item.personalizedScore > 0)
    .sort((a, b) => b.personalizedScore - a.personalizedScore)
    .slice(0, 8);

  const favoriteCategories = favoriteCafes.map((cafe) => normalizeCategory(cafe));
  const prefersDaily = favoriteCategories.filter((category) => category === 'daily').length;
  const prefersSpecialty = favoriteCategories.filter((category) => category === 'specialty').length;

  const subtitle =
    prefersSpecialty >= prefersDaily
      ? 'Una seleccion afinada segun tus favoritos de especialidad, con afinidad real de perfil.'
      : 'Recomendaciones pensadas para mejorar tu cafe diario sin perder el norte de lo que ya te gusta.';

  const dailyUpgradeItems = favoriteDailyCafes.length
    ? valid
        .filter((cafe) => !favSet.has(cafe.id))
        .map((candidate) => {
          const scoredMatches = favoriteDailyCafes.map((favorite) => ({
            favorite,
            affinity: computeDailyUpgradeScore(candidate, favorite),
          }));

          scoredMatches.sort((a, b) => b.affinity - a.affinity);
          const best = scoredMatches[0];

          return {
            ...candidate,
            dailyUpgradeScore: Number((best?.affinity || 0).toFixed(3)),
            recommendationReason: best
              ? buildDailyUpgradeReason(candidate, best.favorite)
              : 'Una mejora clara para tu cafe diario',
          };
        })
        .filter((item) => item.dailyUpgradeScore > 0)
        .sort((a, b) => b.dailyUpgradeScore - a.dailyUpgradeScore)
        .slice(0, 8)
    : [];

  return {
    title: 'Para ti',
    subtitle,
    items: recommended,
    dailyUpgrade:
      dailyUpgradeItems.length > 0
        ? {
            title: 'Mejora tu cafe diario',
            subtitle:
              'Alternativas mas finas para subir calidad sin desconectarte de lo que ya tomas.',
            items: dailyUpgradeItems,
          }
        : null,
  };
}
