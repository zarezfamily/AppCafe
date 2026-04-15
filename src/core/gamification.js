export const XP_RULES = {
  vote: 8,
  photo: 15,
  review: 14,
  addCafe: 18,
  favorite: 3,
};

export const LEVELS = [
  { name: 'Novato', icon: '🌱', minXp: 0 },
  { name: 'Aficionado', icon: '☕', minXp: 220 },
  { name: 'Catador', icon: '🎯', minXp: 700 },
  { name: 'Experto', icon: '⭐', minXp: 1700 },
  { name: 'Maestro', icon: '👑', minXp: 3400 },
];

export const defaultGamification = () => ({
  xp: 0,
  votesCount: 0,
  photosCount: 0,
  reviewsCount: 0,
  cafesAddedCount: 0,
  favoritesMarkedCount: 0,
  countriesRated: [],
  specialOriginsTasted: [],
  achievementIds: [],
  updatedAt: Date.now(),
});

export const getLevelFromXp = (xp) => {
  let current = LEVELS[0];
  LEVELS.forEach((lvl) => {
    if (xp >= lvl.minXp) current = lvl;
  });
  return current;
};

export const computeXp = (state) =>
  state.votesCount * XP_RULES.vote +
  state.photosCount * XP_RULES.photo +
  state.reviewsCount * XP_RULES.review +
  state.cafesAddedCount * XP_RULES.addCafe +
  state.favoritesMarkedCount * XP_RULES.favorite;

export const computeAchievements = (state) => {
  const lvl = getLevelFromXp(state.xp);
  const out = [];
  if (state.votesCount >= 3) out.push('primera_cata');
  if (state.photosCount >= 12) out.push('fotografo');
  if (state.countriesRated.length >= 8) out.push('viajero');
  if (state.votesCount >= 30) out.push('adicto');
  if (lvl.name === 'Maestro') out.push('maestro_catador');
  if (state.favoritesMarkedCount >= 25) out.push('coleccionista');
  if (state.reviewsCount >= 12) out.push('critico');
  if (state.specialOriginsTasted.length >= 1) out.push('origen_unico');
  return out;
};

export const normalizeGamification = (state) => {
  const next = {
    ...defaultGamification(),
    ...state,
    countriesRated: Array.from(new Set((state.countriesRated || []).filter(Boolean))),
    specialOriginsTasted: Array.from(new Set((state.specialOriginsTasted || []).filter(Boolean))),
  };
  next.xp = computeXp(next);
  next.achievementIds = computeAchievements(next);
  next.updatedAt = Date.now();
  return next;
};

export const getAchievementDefs = () => [
  { id: 'primera_cata', icon: '🥇', title: 'Ritual de inicio', desc: 'Valora 3 cafes' },
  { id: 'fotografo', icon: '📸', title: 'Ojo barista', desc: 'Sube 12 fotos de tus cafes' },
  {
    id: 'viajero',
    icon: '🌍',
    title: 'Ruta de origen',
    desc: 'Prueba cafes de 8 paises distintos',
  },
  { id: 'adicto', icon: '🔥', title: 'Tueste constante', desc: 'Valora 30 cafes' },
  { id: 'maestro_catador', icon: '👑', title: 'Paladar Etiove', desc: 'Alcanza nivel Maestro' },
  { id: 'coleccionista', icon: '❤️', title: 'Bodega signature', desc: 'Marca 25 favoritos' },
  { id: 'critico', icon: '✍️', title: 'Cuaderno de cata', desc: 'Escribe 12 resenas' },
  {
    id: 'origen_unico',
    icon: '🌱',
    title: 'Lote de autor',
    desc: 'Prueba Geisha, Bourbon Pointu o Yemen',
  },
];
