export const PREMIUM_PLANS = {
  monthly: {
    id: 'etiove_premium_monthly',
    label: 'Mensual',
    price: '2,99€',
    priceCents: 299,
    period: 'mes',
    appleId: 'com.zarezfamily.etiove.premium.monthly',
    googleId: 'etiove_premium_monthly',
  },
  lifetime: {
    id: 'etiove_premium_lifetime',
    label: 'De por vida',
    price: '24,99€',
    priceCents: 2499,
    period: 'único',
    appleId: 'com.zarezfamily.etiove.premium.lifetime',
    googleId: 'etiove_premium_lifetime',
    savings: 'Equivale a 8 meses - ahorra un 74%',
  },
};

export const PREMIUM_FEATURES = [
  {
    icon: '📔',
    title: 'Diario de catas ilimitado',
    desc: 'Sin límite de entradas. La versión gratuita permite hasta 10.',
  },
  {
    icon: '📊',
    title: 'Estadísticas avanzadas',
    desc: 'Gráficos de orígenes, métodos, evolución de puntuaciones y más.',
  },
  {
    icon: '📄',
    title: 'Exportar diario en PDF',
    desc: 'Descarga todas tus catas en un documento elegante.',
  },
  {
    icon: '☕',
    title: 'Insignia Premium en el foro',
    desc: 'Tu nombre destaca con una insignia exclusiva en la comunidad.',
  },
  {
    icon: '📖',
    title: 'Contenido editorial exclusivo',
    desc: 'Guías de cata, entrevistas con productores y selección mensual.',
  },
  {
    icon: '🔒',
    title: 'Foro Premium privado',
    desc: 'Acceso a una categoría exclusiva solo para miembros Premium.',
  },
  {
    icon: '🚀',
    title: 'Acceso anticipado',
    desc: 'Prueba las nuevas funciones antes que nadie.',
  },
];

export const FREE_LIMITS = {
  diarioCatasMax: 10,
};

export function isPremiumActive(premiumData) {
  if (!premiumData) return false;
  if (premiumData.plan === 'lifetime') return true;
  if (premiumData.plan === 'monthly') {
    const expiresAt = premiumData.expiresAt;
    if (!expiresAt) return false;
    return new Date(expiresAt) > new Date();
  }
  return false;
}

export function premiumDaysLeft(premiumData) {
  if (!premiumData || premiumData.plan === 'lifetime') return null;
  if (!premiumData.expiresAt) return 0;
  const diff = new Date(premiumData.expiresAt) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
