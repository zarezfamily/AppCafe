function normalizeText(value) {
  return String(value || '').trim();
}

function parseDateValue(value) {
  if (!value) return 0;
  const date = new Date(value);
  const time = date.getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getPublishedAt(item) {
  return item?.createdAt || item?.fecha || item?.approvedAt || '';
}

function isApprovedCafe(item) {
  return (
    item?.status === 'approved' || item?.reviewStatus === 'approved' || item?.appVisible === true
  );
}

function hasVisibleEssentials(item) {
  const hasName = normalizeText(item?.nombre || item?.name).length > 0;
  const hasBrand = normalizeText(item?.roaster || item?.marca || item?.brand).length > 0;
  const hasPhoto =
    normalizeText(
      item?.bestPhoto || item?.officialPhoto || item?.foto || item?.image || item?.imageUrl
    ).length > 0;
  return hasName && hasBrand && hasPhoto;
}

function getStableTrendingScore(item) {
  const trending = Number(item?.trendingScore || 0);
  const ranking = Number(item?.rankingScore || 0);
  const votes = Number(item?.votos || 0);
  const rating = Number(item?.puntuacion || 0);

  return trending * 0.55 + ranking * 0.25 + votes * 0.2 + rating * 0.8;
}

function getFreshnessBoost(item, nowTs) {
  const createdAt = parseDateValue(getPublishedAt(item));
  if (!createdAt) return 0;

  const ageDays = (nowTs - createdAt) / (1000 * 60 * 60 * 24);
  if (ageDays <= 3) return 4;
  if (ageDays <= 7) return 2.5;
  if (ageDays <= 14) return 1;
  return 0;
}

function buildReason(type, item) {
  const votes = Number(item?.votos || 0);
  const rating = Number(item?.puntuacion || 0);
  const trending = Number(item?.trendingScore || 0);
  const ranking = Number(item?.rankingScore || 0);

  if (type === 'weeklyTop') {
    return `Traccion alta esta semana, ${rating.toFixed(1)} de media y ${votes} votos reales.`;
  }

  if (type === 'risers') {
    return `Empuja fuerte ahora: trending ${trending.toFixed(1)} por encima de su base ${ranking.toFixed(1)}.`;
  }

  if (type === 'fallers') {
    return `Sigue bien valorado, pero hoy su traccion va por debajo del ritmo de otros cafes.`;
  }

  return `Recien llegado con senal real para entrar en radar rapido.`;
}

function buildMomentumText(type, item) {
  const trending = Number(item?.trendingScore || 0);
  const ranking = Number(item?.rankingScore || 0);
  const votes = Number(item?.votos || 0);

  if (type === 'weeklyTop') {
    return `Momentum ${trending.toFixed(1)} · ${votes} votos`;
  }

  if (type === 'risers') {
    return `Gap +${Math.max(trending - ranking, 0).toFixed(1)} vs ranking`;
  }

  if (type === 'fallers') {
    return `Gap ${Math.min(trending - ranking, 0).toFixed(1)} vs ranking`;
  }

  return `Entrada reciente · ${votes} votos`;
}

export function getLiveRankingBuckets(cafes = [], options = {}) {
  const nowTs = parseDateValue(options.now || new Date().toISOString()) || Date.now();
  const weekAgo = nowTs - 7 * 24 * 60 * 60 * 1000;
  const twoWeeksAgo = nowTs - 14 * 24 * 60 * 60 * 1000;

  const valid = (cafes || [])
    .filter(Boolean)
    .filter((item) => isApprovedCafe(item))
    .filter((item) => hasVisibleEssentials(item));

  const scored = valid.map((item) => {
    const ranking = Number(item?.rankingScore || 0);
    const trending = Number(item?.trendingScore || 0);
    const votes = Number(item?.votos || 0);
    const rating = Number(item?.puntuacion || 0);
    const createdAtTs = parseDateValue(getPublishedAt(item));
    const freshnessBoost = getFreshnessBoost(item, nowTs);
    const stableTrending = getStableTrendingScore(item);
    const movementGap = trending - ranking;

    return {
      ...item,
      _createdAtTs: createdAtTs,
      _stableTrending: stableTrending,
      _movementGap: movementGap,
      _weeklyTopScore: stableTrending + freshnessBoost,
      _riserScore: movementGap * 1.3 + trending * 0.55 + freshnessBoost,
      _fallerScore: ranking * 0.9 - trending * 0.65 + rating * 0.8 + votes * 0.12,
      _newScore: freshnessBoost * 2 + stableTrending * 0.6 + votes * 0.15,
    };
  });

  const weeklyTop = scored
    .filter((item) => item._createdAtTs >= weekAgo || item._stableTrending >= 6)
    .sort((a, b) => b._weeklyTopScore - a._weeklyTopScore)
    .slice(0, 8)
    .map((item) => ({
      ...item,
      rankingTag: 'Top semanal',
      rankingReason: buildReason('weeklyTop', item),
      rankingMomentum: buildMomentumText('weeklyTop', item),
    }));

  const risers = scored
    .filter((item) => item._movementGap > 0)
    .sort((a, b) => b._riserScore - a._riserScore)
    .slice(0, 8)
    .map((item) => ({
      ...item,
      rankingTag: 'Sube',
      rankingReason: buildReason('risers', item),
      rankingMomentum: buildMomentumText('risers', item),
    }));

  const fallers = scored
    .filter((item) => item._createdAtTs < weekAgo)
    .filter((item) => item._movementGap < 0)
    .sort((a, b) => b._fallerScore - a._fallerScore)
    .slice(0, 8)
    .map((item) => ({
      ...item,
      rankingTag: 'Baja',
      rankingReason: buildReason('fallers', item),
      rankingMomentum: buildMomentumText('fallers', item),
    }));

  const weeklyTopIds = new Set(weeklyTop.map((item) => item.id));

  const newcomersAll = scored
    .filter((item) => item._createdAtTs >= twoWeeksAgo)
    .sort((a, b) => b._createdAtTs - a._createdAtTs || b._newScore - a._newScore)
    .map((item) => ({
      ...item,
      rankingTag: 'Nuevo',
      rankingReason: buildReason('newcomers', item),
      rankingMomentum: buildMomentumText('newcomers', item),
    }));

  const newcomers = newcomersAll.filter((item) => !weeklyTopIds.has(item.id)).slice(0, 8);

  return {
    weeklyTop,
    risers,
    fallers,
    newcomers,
  };
}
