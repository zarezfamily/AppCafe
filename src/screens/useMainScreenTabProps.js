import { Alert } from 'react-native';

export function buildInicioTabProps({
  s,
  theme,
  premiumAccent,
  premiumAccentDeep,
  SearchInput,
  favorites,
  favoritesReady,
  gamification,
  feed,
  unread,
  isPremium,
  hasAccess,
  favoritesLimit,
  toggleFavorite,
  notifyFavorite,
  openCafeteria,
  openCafeDetail,
  openPaywall,
}) {
  return {
    s,
    theme,
    premiumAccent,
    premiumAccentDeep,
    SearchInput,

    favorites,
    favoritesReady,
    gamification,
    feed,
    unread,

    isPremium,
    hasAccess,
    favoritesLimit,

    onToggleFavorite: (cafe) => {
      if (!hasAccess && favorites.length >= favoritesLimit) {
        Alert.alert(
          'Límite alcanzado',
          'Has alcanzado el límite de favoritos. Hazte premium para guardar más.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Hazte Premium', onPress: openPaywall },
          ]
        );
        return;
      }

      toggleFavorite(cafe);
      notifyFavorite?.(cafe);
    },

    onOpenCafeteria: openCafeteria,
    onOpenCafeDetail: openCafeDetail,
  };
}

// ⚠️ IMPORTANTE:
// Aquí NO usamos premiumAccentDeep → por eso va con _ para evitar warning
export function buildDiscoveryTabProps({
  s,
  theme,
  premiumAccent,
  _premiumAccentDeep,
  SearchInput,
  feed,
  unread,
  openCafeDetail,
}) {
  return {
    s,
    theme,
    premiumAccent,
    SearchInput,

    feed,
    unread,

    onOpenCafeDetail: openCafeDetail,
  };
}

// Puedes ampliar aquí más tabs en el futuro
// export function buildCommunityTabProps(...) {}
// export function buildProfileTabProps(...) {}
