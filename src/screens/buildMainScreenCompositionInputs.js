import { FORUM_CATEGORIES } from '../constants/forumCategories';
import { LEVELS, getAchievementDefs, getLevelFromXp } from '../core/gamification';
import {
  APP_VERSION,
  GOOGLE_PLACES_KEY,
  KEY_FAVS,
  KEY_OFFERS_CACHE,
  KEY_PREFS,
  KEY_VOTES,
  OFFERS_CACHE_TTL_MS,
  PREMIUM_ACCENT,
  PREMIUM_ACCENT_DEEP,
  THEME,
} from './mainScreenConfig';
import buildMainScreenTabPropGroups from './buildMainScreenTabPropGroups';

export function buildMainScreenDomainInput({
  user,
  screenUi,
  gamification,
  services,
}) {
  const {
    addDocument,
    deleteDocument,
    getCollection,
    getDocument,
    getUserCafes,
    queryCollection,
    setDocument,
    uploadImageToStorage,
  } = services;

  return {
    user,
    perfil: screenUi.perfil,
    favs: screenUi.favs,
    setFavs: screenUi.setFavs,
    setCafeDetalle: screenUi.setCafeDetalle,
    registrarEventoGamificacion: gamification.registrarEventoGamificacion,
    busquedaMis: screenUi.busquedaMis,
    busquedaTop: screenUi.busquedaTop,
    googlePlacesKey: GOOGLE_PLACES_KEY,
    offersCacheTtlMs: OFFERS_CACHE_TTL_MS,
    keyFavs: KEY_FAVS,
    keyOffersCache: KEY_OFFERS_CACHE,
    getUserCafes,
    getCollection,
    deleteDocument,
    addDocument,
    queryCollection,
    uploadImageToStorage,
    getDocument,
    setDocument,
    setBuscandoOfertaId: screenUi.setBuscandoOfertaId,
    setErrorOfertas: screenUi.setErrorOfertas,
    ofertasPorCafe: screenUi.ofertasPorCafe,
    setOfertasPorCafe: screenUi.setOfertasPorCafe,
    setOpenOfferCafeId: screenUi.setOpenOfferCafeId,
    setActiveTab: screenUi.setActiveTab,
    showDialog: screenUi.showDialog,
  };
}

export function buildMainScreenForumInput({
  user,
  screenUi,
  profileSummary,
  domain,
  services,
}) {
  const {
    addDocument,
    deleteDocument,
    getCollection,
    updateDocument,
    uploadImageToStorage,
  } = services;

  return {
    user,
    voteWeight: profileSummary.voteWeight,
    forumThreadScrollRef: screenUi.forumThreadScrollRef,
    forumReplyInputRef: screenUi.forumReplyInputRef,
    forumAuthorName: profileSummary.forumAuthorName,
    currentLevel: profileSummary.currentLevel,
    premium: domain.premium,
    getCollection,
    addDocument,
    updateDocument,
    deleteDocument,
    uploadImageToStorage,
    showDialog: screenUi.showDialog,
  };
}

export function buildMainScreenBootstrapInput({
  user,
  screenUi,
  domain,
  forum,
  services,
  notifications,
  bootstrapKeys,
}) {
  const { getDocument, setDocument } = services;
  const { registerForPushNotificationsAsync, scheduleEtioveNotification } = notifications;

  return {
    user,
    perfil: screenUi.perfil,
    favs: screenUi.favs,
    allCafes: domain.allCafes,
    forumThreads: forum.forumThreads,
    setFavs: screenUi.setFavs,
    setVotes: screenUi.setVotes,
    setPerfil: screenUi.setPerfil,
    setOfertasPorCafe: screenUi.setOfertasPorCafe,
    setDocument,
    getDocument,
    scheduleEtioveNotification,
    registerForPushNotificationsAsync,
    setActiveTab: screenUi.setActiveTab,
    communityNotificationBootRef: screenUi.communityNotificationBootRef,
    forumNotificationBootRef: screenUi.forumNotificationBootRef,
    favoriteNotificationBootRef: screenUi.favoriteNotificationBootRef,
    appVersion: APP_VERSION,
    keys: bootstrapKeys,
    offersCacheTtlMs: OFFERS_CACHE_TTL_MS,
    showDialog: screenUi.showDialog,
  };
}

export function buildMainScreenTabPropsInput({
  styles,
  components,
  screenUi,
  domain,
  forum,
  bootstrap,
  gamification,
  profileSummary,
  onLogout,
}) {
  return buildMainScreenTabPropGroups({
    styles,
    theme: THEME,
    premiumAccent: PREMIUM_ACCENT,
    premiumAccentDeep: PREMIUM_ACCENT_DEEP,
    components,
    keys: {
      keyFavs: KEY_FAVS,
      keyPrefs: KEY_PREFS,
      keyVotes: KEY_VOTES,
    },
    ui: screenUi,
    domain,
    forum,
    bootstrap,
    gamification,
    profileSummary,
    profileTools: {
      getUserLevel: getLevelFromXp,
      getAchievementDefs,
      levels: LEVELS,
    },
    onLogout,
    appVersion: APP_VERSION,
    forumCategories: FORUM_CATEGORIES,
  });
}
