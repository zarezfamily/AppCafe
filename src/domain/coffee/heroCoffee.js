function normalizeText(value) {
  return String(value || '').trim();
}

function getScaScore(cafe) {
  if (cafe?.sca && typeof cafe.sca === 'object') {
    const score = Number(cafe.sca.score || 0);
    return Number.isFinite(score) ? score : 0;
  }

  const legacyScore = Number(cafe?.sca || 0);
  return Number.isFinite(legacyScore) ? legacyScore : 0;
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

function hasBioTag(cafe) {
  if (cafe?.isBio === true) return true;
  if (cafe?.isBio === false) return false;

  const text = [cafe?.certificaciones, cafe?.notas, cafe?.nombre, cafe?.marca, cafe?.roaster]
    .map((value) => normalizeText(value).toLowerCase())
    .join(' ');

  return (
    text.includes('bio') ||
    text.includes('ecologico') ||
    text.includes('ecológico') ||
    text.includes('organico') ||
    text.includes('orgánico') ||
    text.includes('organic')
  );
}

function computeHeroScore(cafe) {
  return (
    Number(cafe?.trendingScore || 0) * 0.4 +
    Number(cafe?.rankingScore || 0) * 0.3 +
    getScaScore(cafe) * 0.2 +
    Number(cafe?.valueScore || 0) * 0.1
  );
}

function isDailyCafe(cafe) {
  return cafe?.coffeeCategory === 'daily' || cafe?.category === 'supermarket';
}

function buildEditorialPool(variantKey, cafe) {
  const roaster = normalizeText(cafe?.roaster || cafe?.marca || 'este tostador');
  const name = normalizeText(cafe?.nombre || 'este cafe');
  const origin = normalizeText(cafe?.pais || cafe?.origen || cafe?.origin || '');
  const process = normalizeText(cafe?.proceso || cafe?.process || '');
  const price = Number(cafe?.precio || 0);
  const hasPrice = Number.isFinite(price) && price > 0;
  const daily = isDailyCafe(cafe);

  const shared = [
    `Una eleccion curada para abrir Inicio con algo que de verdad merece un sitio destacado.`,
    `${name} entra en portada porque ahora mismo combina señal de comunidad, calidad y traccion real.`,
  ];

  const byVariant = {
    trending: [
      `${roaster} esta cogiendo vuelo en la comunidad y este cafe es el mejor resumen del momento.`,
      `Si quieres empezar por lo que mas interes esta generando ahora, esta es una muy buena puerta de entrada.`,
      ...shared,
    ],
    top: [
      `Este perfil se ha ganado la portada a base de valoraciones altas y buena consistencia en la comunidad.`,
      `${name} destaca por rendimiento global y una recepcion especialmente fuerte entre los usuarios.`,
      ...shared,
    ],
    value: [
      hasPrice
        ? `Por ${price.toFixed(2)} €, es de las opciones mas serias si buscas apretar calidad sin disparar presupuesto.`
        : `Ahora mismo es una de las opciones mas interesantes si miras calidad-precio con criterio real.`,
      daily
        ? `Perfecto para quien quiere subir el nivel de su cafe diario sin pegar un salto radical de coste.`
        : `Una forma inteligente de entrar en cafes mejores sin irte a un perfil de nicho o a un precio extremo.`,
      ...shared,
    ],
    bio: [
      `Seleccionado porque suma interes de comunidad y una lectura mas limpia para quien prioriza cafes bio.`,
      `Si te importa el origen cuidado y una compra con narrativa mas afinada, esta variante tiene sentido.`,
      ...shared,
    ],
    sca: [
      origin
        ? `La ficha de ${origin} tiene suficientes señales para destacar por estructura y potencial en taza.`
        : `Destaca por señales de calidad mas claras que la media y una lectura SCA especialmente competitiva.`,
      process
        ? `Entre proceso, origen y comportamiento en comunidad, se siente como una eleccion muy bien sustentada.`
        : `No esta aqui solo por nota: tambien hay contexto de producto para justificar la portada.`,
      ...shared,
    ],
  };

  return byVariant[variantKey] || shared;
}

function getVariantCandidates(cafes) {
  const specialty = cafes.filter((cafe) => cafe?.coffeeCategory === 'specialty');
  const withSca = cafes.filter((cafe) => getScaScore(cafe) >= 80);
  const withValue = cafes.filter((cafe) => Number(cafe?.valueScore || 0) > 0);
  const bio = cafes.filter((cafe) => hasBioTag(cafe));

  return [
    {
      key: 'trending',
      title: 'Cafe del momento',
      kicker: 'Lo esta petando',
      badge: '🔥 Cafe del momento',
      ctaSecondary: 'Ver tendencia',
      sort: (items) =>
        [...items].sort((a, b) => Number(b?.trendingScore || 0) - Number(a?.trendingScore || 0)),
      items: cafes,
    },
    {
      key: 'top',
      title: 'Top comunidad',
      kicker: 'Mejor valorado ahora',
      badge: '🏆 Top comunidad',
      ctaSecondary: 'Ir a ranking',
      sort: (items) =>
        [...items].sort((a, b) => Number(b?.rankingScore || 0) - Number(a?.rankingScore || 0)),
      items: cafes,
    },
    {
      key: 'value',
      title: 'Calidad-precio',
      kicker: 'Compra inteligente',
      badge: '💸 Mejor calidad-precio',
      ctaSecondary: 'Ver ranking',
      sort: (items) =>
        [...items].sort((a, b) => Number(b?.valueScore || 0) - Number(a?.valueScore || 0)),
      items: withValue,
    },
    {
      key: 'bio',
      title: 'Seleccion bio',
      kicker: 'Curado por perfil',
      badge: '🌱 Seleccion bio',
      ctaSecondary: 'Ver bio',
      sort: (items) =>
        [...items].sort((a, b) => Number(b?.bioScore || 0) - Number(a?.bioScore || 0)),
      items: bio,
    },
    {
      key: 'sca',
      title: 'Alta puntuacion SCA',
      kicker: 'Ficha con señales claras',
      badge: '☕ Alta puntuacion SCA',
      ctaSecondary: 'Ver specialty',
      sort: (items) => [...items].sort((a, b) => getScaScore(b) - getScaScore(a)),
      items: withSca.length ? withSca : specialty,
    },
  ].filter((variant) => variant.items.length > 0);
}

function buildSeed(input) {
  return normalizeText(input)
    .split('')
    .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);
}

export function getHeroCafe(cafes = [], options = {}) {
  const dateKey = options.dateKey || new Date().toISOString().slice(0, 10);
  const userSeedKey = options.userSeedKey || '';

  const valid = cafes
    .filter(Boolean)
    .filter((cafe) => isApprovedCafe(cafe))
    .filter((cafe) => normalizeText(getPhoto(cafe)).length > 0)
    .filter((cafe) => normalizeText(cafe?.nombre).length > 0)
    .filter((cafe) => normalizeText(cafe?.roaster || cafe?.marca).length > 0)
    .filter((cafe) => Number(cafe?.puntuacion || 0) > 3.5)
    .filter((cafe) => Number(cafe?.votos || 0) > 5)
    .map((cafe) => ({
      ...cafe,
      heroScore: Number(computeHeroScore(cafe).toFixed(3)),
    }))
    .sort((a, b) => b.heroScore - a.heroScore);

  if (!valid.length) return null;

  const variants = getVariantCandidates(valid);
  const variantSeed = buildSeed(`${dateKey}|${userSeedKey}`);
  const variant = variants[variantSeed % variants.length];

  const ranked = variant.sort(variant.items);
  const rotationPool = ranked.slice(0, Math.min(5, ranked.length));
  const cafe = rotationPool[variantSeed % rotationPool.length] || ranked[0] || valid[0];
  const editorialPool = buildEditorialPool(variant.key, cafe);
  const editorial = editorialPool[variantSeed % editorialPool.length] || editorialPool[0] || '';

  return {
    cafe,
    variant: {
      key: variant.key,
      title: variant.title,
      kicker: variant.kicker,
      badge: variant.badge,
      ctaSecondary: variant.ctaSecondary,
      editorial,
    },
    rotationPoolSize: rotationPool.length,
    dateKey,
    userSeedKey,
  };
}
