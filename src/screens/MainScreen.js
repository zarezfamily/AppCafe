// ─────────────────────────────────────────────────────────────────────────────
//  App.js — Etiove ☕  v2.1
// ─────────────────────────────────────────────────────────────────────────────

import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_800ExtraBold,
} from '@expo-google-fonts/playfair-display';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import Constants from 'expo-constants';
import { useFonts } from 'expo-font';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, Dimensions,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar, StyleSheet,
  Switch,
  Text, TextInput, TouchableOpacity,
  View,
} from 'react-native';

import {
  addDocument,
  clearAuthToken,
  deleteDocument,
  getCollection,
  getDocument,
  getUserCafes,
  loginUser,
  queryCollection,
  registerUser,
  resetPassword,
  restoreAuthTokenFromSecureStore,
  setDocument,
  updateDocument,
  uploadImageToStorage
} from '../../firebaseConfig';
import AppDialogModal from '../components/AppDialogModal';
import { CardHorizontal, CardVertical } from '../components/Cards';
import PackshotImage from '../components/PackshotImage';
import OnboardingModal from '../components/OnboardingModal';
import SearchInput from '../components/SearchInput';
import Stars from '../components/Stars';
import { useAuth } from '../context/AuthContext';
import { FORUM_CATEGORIES } from '../constants/forumCategories';
import {
  LEVELS,
  getAchievementDefs,
  getLevelFromXp,
} from '../core/gamification';
import { registerForPushNotificationsAsync, scheduleEtioveNotification } from '../core/notifications';
import { getFlagForPais } from '../core/paises';
import { FREE_LIMITS } from '../core/premium';
import { formatRelativeTime } from '../core/utils';
import useCoffeeData from '../hooks/useCoffeeData';
import useForumState from '../hooks/useForumState';
import useGamification from '../hooks/useGamification';
import useNoteBook from '../hooks/useNoteBook';
import usePremium from '../hooks/usePremium';
import CafeDetailScreen from './CafeDetailScreen';
import DiarioCatasSection from './DiarioCatasSection';
import FormScreen from './FormScreen';
import MainScreenBody from './MainScreenBody';
import PremiumBadge from './PremiumBadge';
import ProfileScreen from './ProfileScreen';
import QuizSection from './QuizSection';
import ScannerScreen from './ScannerScreen';
import {
  buildBottomBarProps,
  buildCommunityTabProps,
  buildInicioTabProps,
  buildMasTabProps,
  buildMisCafesTabProps,
  buildOfertasTabProps,
  buildTopCafesTabProps,
  buildUltimosAnadidosTabProps,
} from './mainScreenTabProps';
import { createMainScreenForumHandlers } from './mainScreenForumHandlers';
import { createMainScreenNotebookHandlers } from './mainScreenNotebookHandlers';
import { createMainScreenOfferHandlers } from './mainScreenOfferHandlers';
import useMainScreenBootstrap from './useMainScreenBootstrap';
import useMainScreenPremium from './useMainScreenPremium';
import { useProfileRealtimeSync } from '../api/profileSync';
import linking from '../navigation/linking';

const { width: W, height: H } = Dimensions.get('window');
const APP_VERSION = '2.1.0';
const GOOGLE_PLACES_KEY = process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY || '';
const PREMIUM_ACCENT = '#8f5e3b';
const PREMIUM_ACCENT_DEEP = '#5d4030';
const PREMIUM_SURFACE_SOFT = '#f6ede3';
const PREMIUM_SURFACE_TINT = '#fbf5ee';
const PREMIUM_BORDER_SOFT = '#e4d3c2';
const THEME = {
  brand: {
    accent: PREMIUM_ACCENT,
    accentDeep: PREMIUM_ACCENT_DEEP,
    primary: '#2f1d14',
    primaryBorder: '#4f3425',
    primaryBorderStrong: '#5a3c2a',
    onPrimary: '#fff9f1',
    soft: PREMIUM_SURFACE_SOFT,
    tint: PREMIUM_SURFACE_TINT,
    borderSoft: PREMIUM_BORDER_SOFT,
  },
  status: {
    success: '#5f8f61',
    successSoft: '#eaf3ea',
    danger: '#a44f45',
    favorite: '#d0a646',
  },
  text: {
    primary: '#111',
    secondary: '#888',
    muted: '#aaa',
    tertiary: '#555',
    inverse: '#fff',
  },
  surface: {
    base: '#fff',
    subtle: '#f9f9f9',
    soft: '#f5f5f5',
    softAlt: '#f8f7f4',
  },
  border: {
    soft: '#eee',
    subtle: '#f0f0f0',
    muted: '#ddd4cb',
  },
  icon: {
    inactive: '#888',
    muted: '#aaa',
    faint: '#ccc',
  },
};

const KEY_EMAIL    = 'etiove_email';
const KEY_PASSWORD = 'etiove_password';
const KEY_REMEMBER = 'etiove_remember';
const KEY_FAVS     = 'etiove_favorites';
const KEY_PREFS    = 'etiove_preferences';
const KEY_PROFILE  = 'etiove_profile';
const KEY_VOTES    = 'etiove_votes'; // cafés ya votados por el usuario
const KEY_OFFERS_CACHE = 'etiove_offers_cache';
const KEY_GAMIFICATION = 'etiove_gamification';
const KEY_HAS_ACCOUNT = 'etiove_has_account';
const KEY_ONBOARDING_DONE = 'etiove_onboarding_done';
const KEY_INTERACTION_FEEDBACK = 'etiove_interaction_feedback';
const KEY_INTERACTION_FEEDBACK_SETTINGS = 'etiove_interaction_feedback_settings';
const KEY_NOTIFY_COMMUNITY_SNAPSHOT = 'etiove_notify_community_snapshot';
const KEY_NOTIFY_FORUM_SNAPSHOT = 'etiove_notify_forum_snapshot';
const KEY_NOTIFY_FAVORITES_SNAPSHOT = 'etiove_notify_favorites_snapshot';
const OFFERS_CACHE_TTL_MS = 1000 * 60 * 60 * 8;

// ─── PERFIL ───────────────────────────────────────────────────────────────────
// ─── WELCOME ──────────────────────────────────────────────────────────────────
export default function MainScreen({ onLogout }) {
  const { user }                  = useAuth();
  const [activeTab, setActiveTab] = useState('Inicio');
  const [scanning, setScanning]   = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [busqueda, setBusqueda]   = useState('');
  const [busquedaTop, setBusquedaTop] = useState('');
  const [busquedaMis, setBusquedaMis] = useState('');
  const [cafeDetalle, setCafeDetalle] = useState(null);
  const [favs, setFavs]           = useState([]);
  const [votes, setVotes]         = useState([]);
  const [perfil, setPerfil]       = useState({ pais: 'España' });
  const [ofertasPorCafe, setOfertasPorCafe] = useState({});
  const [buscandoOfertaId, setBuscandoOfertaId] = useState(null);
  const [openOfferCafeId, setOpenOfferCafeId] = useState(null);
  const [errorOfertas, setErrorOfertas] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ title: '', description: '', actions: [] });
  const forumThreadScrollRef = useRef(null);
  const forumReplyInputRef = useRef(null);
  const communityNotificationBootRef = useRef(false);
  const forumNotificationBootRef = useRef(false);
  const favoriteNotificationBootRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const brandCardAnim = useRef(new Animated.Value(0)).current;
  const brandProgressAnim = useRef(new Animated.Value(0)).current;
    // --- NUEVO: función para refrescar perfil desde SecureStore ---
    const refrescarPerfil = async () => {
      try {
        const v = await SecureStore.getItemAsync(KEY_PROFILE);
        if (v) setPerfil(JSON.parse(v));
      } catch {}
    };
  const {
    gamification,
    registrarEventoGamificacion,
    achievementToast,
    closeAchievementToast,
    achievementToastOpacity,
    achievementToastTranslateY,
  } = useGamification({ storageKey: KEY_GAMIFICATION });

  const showDialog = (title, description, actions = [{ label: 'Cerrar' }]) => {
    setDialogConfig({ title, description, actions });
    setDialogVisible(true);
  };

  const {
    misCafes,
    topCafes,
    allCafes,
    cargando,
    cafeteriasInicio,
    cargandoCafInicio,
    errorCafInicio,
    cargarDatos,
    cargarCafeteriasInicio,
    toggleFav,
    eliminarCafe,
    filtrar,
    favCafes,
    cafesFiltrados,
    topFiltrados,
    topCafesVista,
    ultimosGlobal,
    ultimos100,
    top100,
    cafesParaOfertas,
  } = useCoffeeData({
    user,
    perfil,
    favs,
    setFavs,
    setCafeDetalle,
    registrarEventoGamificacion,
    busquedaMis,
    busquedaTop,
    googlePlacesKey: GOOGLE_PLACES_KEY,
    offersCacheTtlMs: OFFERS_CACHE_TTL_MS,
    keyFavs: KEY_FAVS,
    getUserCafes,
    getCollection,
    deleteDocument,
    openDialog: showDialog,
  });

  const {
    forumCategory,
    setForumCategory,
    forumThread,
    setForumThread,
    forumSort,
    setForumSort,
    forumThreads,
    setForumThreads,
    forumReplies,
    setForumReplies,
    forumLoading,
    setForumLoading,
    forumError,
    setForumError,
    forumCreateOpen,
    setForumCreateOpen,
    forumSaving,
    setForumSaving,
    forumTitle,
    setForumTitle,
    forumBody,
    setForumBody,
    forumAccessLevel,
    setForumAccessLevel,
    forumPhoto,
    setForumPhoto,
    forumEditOpen,
    setForumEditOpen,
    forumEditing,
    setForumEditing,
    forumEditTarget,
    setForumEditTarget,
    forumEditCollection,
    setForumEditCollection,
    forumEditTitle,
    setForumEditTitle,
    forumEditBody,
    setForumEditBody,
    forumReplyText,
    setForumReplyText,
    forumReplyTo,
    setForumReplyTo,
    forumSendingReply,
    setForumSendingReply,
    forumThreadsByCategory,
    forumRepliesByThread,
    forumTopReplies,
  } = useForumState();

  const notebook = useNoteBook();
  const premium = usePremium({ user, getDocument, setDocument });
  const {
    purchasesReady,
    purchasingPlan,
    restoringPurchases,
    handlePremiumPurchase,
    handleRestorePurchases,
  } = useMainScreenPremium({
    user,
    premium,
    showDialog,
  });

  const {
    newsletterState,
    newsletterLoading,
    newsletterSaving,
    interactionFeedbackSettings,
    showOnboarding,
    notificationsReady,
    completeOnboarding,
    startQuizFromOnboarding,
    guardarFeedbackInteracciones,
    guardarModoFeedbackInteracciones,
    guardarNewsletter,
  } = useMainScreenBootstrap({
    user,
    perfil,
    favs,
    allCafes,
    forumThreads,
    setFavs,
    setVotes,
    setPerfil,
    setOfertasPorCafe,
    setDocument,
    getDocument,
    scheduleEtioveNotification,
    registerForPushNotificationsAsync,
    setActiveTab,
    communityNotificationBootRef,
    forumNotificationBootRef,
    favoriteNotificationBootRef,
    appVersion: APP_VERSION,
    keys: {
      favs: KEY_FAVS,
      votes: KEY_VOTES,
      profile: KEY_PROFILE,
      offersCache: KEY_OFFERS_CACHE,
      onboardingDone: KEY_ONBOARDING_DONE,
      feedbackEnabled: KEY_INTERACTION_FEEDBACK,
      feedbackSettings: KEY_INTERACTION_FEEDBACK_SETTINGS,
      notifyCommunitySnapshot: KEY_NOTIFY_COMMUNITY_SNAPSHOT,
      notifyForumSnapshot: KEY_NOTIFY_FORUM_SNAPSHOT,
      notifyFavoritesSnapshot: KEY_NOTIFY_FAVORITES_SNAPSHOT,
    },
    offersCacheTtlMs: OFFERS_CACHE_TTL_MS,
    showDialog,
  });

  const { abrirOfertasCafe, abrirOfertaWeb } = createMainScreenOfferHandlers({
    ofertasPorCafe,
    setBuscandoOfertaId,
    setErrorOfertas,
    setOfertasPorCafe,
    setOpenOfferCafeId,
    setActiveTab,
    offersCacheTtlMs: OFFERS_CACHE_TTL_MS,
    keyOffersCache: KEY_OFFERS_CACHE,
  });

  const currentLevel = getLevelFromXp(gamification.xp);
  const nextLevel = LEVELS.find(l => l.minXp > gamification.xp) || null;
  const xpInLevel = nextLevel ? Math.max(0, gamification.xp - currentLevel.minXp) : gamification.xp;
  const xpRange = nextLevel ? Math.max(1, nextLevel.minXp - currentLevel.minXp) : Math.max(1, gamification.xp);
  const levelProgress = Math.min(1, xpInLevel / xpRange);
  const achievementDefs = getAchievementDefs();
  const unlockedAchievements = achievementDefs.filter(a => gamification.achievementIds.includes(a.id));
  const pendingAchievements = achievementDefs.filter(a => !gamification.achievementIds.includes(a.id));
  const achievementTotal = achievementDefs.length;
  const unlockedCount = unlockedAchievements.length;
  const achievementProgress = achievementTotal > 0 ? unlockedCount / achievementTotal : 0;
  const memberStatus = unlockedCount >= achievementTotal
    ? { icon: '👑', label: 'LEYENDA ETIOVE' }
    : unlockedCount >= Math.max(1, Math.ceil(achievementTotal * 0.75))
      ? { icon: '🏆', label: 'MAESTRO DE ORIGEN' }
      : unlockedCount >= Math.max(1, Math.ceil(achievementTotal * 0.4))
        ? { icon: '⭐', label: 'EXPLORADOR DE FINCA' }
        : { icon: '🌱', label: 'APRENDIZ DE TUESTE' };
  const brandCardTranslateY = brandCardAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const brandCardScale = brandCardAnim.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] });
  const brandProgressWidth = brandProgressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  const profileAlias = (perfil.alias || perfil.nombre || user?.email?.split('@')[0] || 'Catador').trim();
  const profileName = `${perfil.nombre || ''} ${perfil.apellidos || ''}`.trim() || user?.email || 'Miembro Etiove';
  const profileInitial = (profileAlias || '?')[0].toUpperCase();
  const newsletterEmail = (perfil.email || user?.email || '').trim();
  const newsletterHasEmail = !!newsletterEmail;
  const forumAuthorName = (perfil.alias || perfil.nombre || user?.email?.split('@')[0] || 'Catador').trim();
  const voteWeight = currentLevel.name === 'Maestro' ? 2 : 1;
  const achievementCsv = (gamification.achievementIds || []).join(',');
  const countriesRatedCsv = (gamification.countriesRated || []).join(',');
  const specialOriginsCsv = (gamification.specialOriginsTasted || []).join(',');

  useEffect(() => {
    if (!user?.uid) return;

    const payload = {
      uid: user.uid,
      displayName: profileAlias,
      achievementCsv,
      achievementCount: unlockedCount,
      countriesRatedCsv,
      specialOriginsCsv,
      xp: gamification.xp,
      updatedAt: new Date().toISOString(),
    };

    const remoteAvatar = String(perfil?.foto || '').startsWith('http') ? String(perfil.foto).trim() : '';
    if (remoteAvatar) payload.avatarUrl = remoteAvatar;

    setDocument('user_profiles', user.uid, payload).catch(() => {});
  }, [achievementCsv, countriesRatedCsv, gamification.xp, perfil?.foto, profileAlias, specialOriginsCsv, unlockedCount, user?.uid]);

  const abrirNuevaCata = (cafeExistente = null) => {
    if (!cafeExistente && !premium.isPremium && notebook.catas.length >= FREE_LIMITS.diarioCatasMax) {
      premium.requirePremium('diario_limit');
      return;
    }
    notebook.irAbrirModal(cafeExistente);
  };

  const flag = getFlagForPais(perfil.pais || 'España');

  const {
    cargarForo,
    hasUserVotedForoItem,
    hasUserReportedForoItem,
    isForumOwner,
    seleccionarFotoForo,
    crearHiloForo,
    votarEnForo,
    reportarForo,
    enviarRespuestaForo,
    prepararRespuestaForo,
    abrirEditorForo,
    guardarEdicionForo,
    abrirMenuAutorForo,
  } = createMainScreenForumHandlers({
    user,
    voteWeight,
    forumReplies,
    forumThread,
    setForumThread,
    setForumThreads,
    setForumReplies,
    setForumLoading,
    setForumError,
    setForumReplyText,
    setForumReplyTo,
    setForumEditCollection,
    setForumEditTarget,
    setForumEditTitle,
    setForumEditBody,
    setForumEditOpen,
    setForumEditing,
    setForumSendingReply,
    forumThreadScrollRef,
    forumReplyInputRef,
    forumAuthorName,
    currentLevel,
    premium,
    forumReplyText,
    forumReplyTo,
    forumEditBody,
    forumEditTitle,
    forumEditCollection,
    forumEditTarget,
    forumPhoto,
    forumTitle,
    forumBody,
    forumAccessLevel,
    setForumSaving,
    setForumCreateOpen,
    setForumTitle,
    setForumBody,
    setForumAccessLevel,
    setForumPhoto,
    getCollection,
    addDocument,
    updateDocument,
    deleteDocument,
    uploadImageToStorage,
    showDialog,
  });

  const { cargarCatas, guardarCata, eliminarCata } = createMainScreenNotebookHandlers({
    user,
    notebook,
    addDocument,
    deleteDocument,
    queryCollection,
    uploadImageToStorage,
    showDialog,
  });

  useEffect(() => {
    Animated.timing(brandCardAnim, {
      toValue: 1,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [brandCardAnim]);

  useEffect(() => {
    Animated.timing(brandProgressAnim, {
      toValue: levelProgress,
      duration: 700,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [brandProgressAnim, levelProgress]);

  // Restaurar el token de autenticación y cargar catas cuando el usuario esté listo
  useEffect(() => {
    if (!user?.uid) return;
    restoreAuthTokenFromSecureStore()
      .then(() => {
        setTimeout(() => cargarCatas(), 120);
      })
      .catch(e => console.warn('[Auth Token] Error:', e));
  }, [user?.uid]);

  useEffect(() => {
    if (activeTab === 'Comunidad' && forumThreads.length === 0 && !forumLoading) {
      cargarForo();
    }
  }, [activeTab]);

  if (!permission?.granted) {
    return (
      <SafeAreaView style={s.permScreen}>
        <Ionicons name="cafe" size={72} color={PREMIUM_ACCENT} />
        <Text style={s.permTitle}>Etiove necesita la cámara</Text>
        <Text style={s.permSub}>Para escanear paquetes de café</Text>
        <TouchableOpacity style={s.redBtn} onPress={requestPermission}><Text style={s.redBtnText}>Activar cámara</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (scanning) {
    return (
      <ScannerScreen
        onScanned={() => { setScanning(false); setShowForm(true); }}
        onSkip={() => { setScanning(false); setShowForm(true); }}
        onBack={() => setScanning(false)}
        premiumAccent={PREMIUM_ACCENT}
      />
    );
  }
  if (showForm) {
    return (
      <FormScreen
        s={s}
        premiumAccent={PREMIUM_ACCENT}
        onBack={() => setShowForm(false)}
        onSave={() => { setShowForm(false); setActiveTab('Mis Cafés'); cargarDatos(); }}
        onCafeAdded={(cafe) => registrarEventoGamificacion('add_cafe', { hasPhoto: !!cafe?.foto, hasReview: !!String(cafe?.notas || '').trim() })}
      />
    );
  }

  const communityTabProps = buildCommunityTabProps({
    s,
    theme: THEME,
    premiumAccent: PREMIUM_ACCENT,
    PremiumBadge,
    forumCategories: FORUM_CATEGORIES,
    forumCategory,
    setForumCategory,
    forumThread,
    setForumThread,
    forumCreateOpen,
    setForumCreateOpen,
    forumSort,
    setForumSort,
    forumLoading,
    forumThreadsByCategory,
    forumError,
    formatRelativeTime,
    forumThreadScrollRef,
    hasUserVotedForoItem,
    hasUserReportedForoItem,
    isForumOwner,
    abrirMenuAutorForo,
    votarEnForo,
    reportarForo,
    forumTopReplies,
    forumRepliesByThread,
    prepararRespuestaForo,
    setForumReplyTo,
    forumReplyTo,
    forumReplyInputRef,
    forumReplyText,
    setForumReplyText,
    enviarRespuestaForo,
    forumSendingReply,
    forumTitle,
    setForumTitle,
    forumBody,
    setForumBody,
    forumAccessLevel,
    setForumAccessLevel,
    forumPhoto,
    seleccionarFotoForo,
    crearHiloForo,
    forumSaving,
    forumEditOpen,
    setForumEditOpen,
    forumEditCollection,
    forumEditTarget,
    setForumEditTarget,
    forumEditBody,
    setForumEditBody,
    guardarEdicionForo,
    forumEditing,
    interactionFeedbackEnabled: interactionFeedbackSettings.enabled,
    interactionFeedbackMode: interactionFeedbackSettings.mode,
    gamification,
    getUserLevel: getLevelFromXp,
    getAchievementDefs,
    LEVELS,
  });

  const inicioTabProps = buildInicioTabProps({
    s,
    perfil,
    setShowProfile,
    brandCardAnim,
    brandCardTranslateY,
    brandCardScale,
    profileInitial,
    profileAlias,
    profileName,
    currentLevel,
    gamification,
    nextLevel,
    brandProgressWidth,
    busqueda,
    setBusqueda,
    SearchInput,
    allCafes,
    filtrar,
    CardVertical,
    setCafeDetalle,
    favs,
    toggleFav,
    ultimosGlobal,
    setActiveTab,
    cargando,
    premiumAccent: PREMIUM_ACCENT,
    CardHorizontal,
    topCafesVista,
    flag,
    cargandoCafInicio,
    errorCafInicio,
    cafeteriasInicio,
    cargarCafeteriasInicio,
    theme: THEME,
    cafesParaOfertas,
    abrirOfertasCafe,
    PackshotImage,
    abrirOfertaWeb,
    ofertasPorCafe,
    buscandoOfertaId,
    openOfferCafeId,
    errorOfertas,
  });

  const QuizSectionComponent = (props) => (
    <QuizSection
      {...props}
      theme={THEME}
      premiumAccent={PREMIUM_ACCENT}
      premiumAccentDeep={PREMIUM_ACCENT_DEEP}
      s={s}
      keyFavs={KEY_FAVS}
      keyPrefs={KEY_PREFS}
      keyVotes={KEY_VOTES}
    />
  );

  const misCafesTabProps = buildMisCafesTabProps({
    s,
    cargando,
    allCafes,
    registrarEventoGamificacion,
    QuizSection: QuizSectionComponent,
    favCafes,
    CardHorizontal,
    setCafeDetalle,
    favs,
    toggleFav,
    busquedaMis,
    setBusquedaMis,
    misCafes,
    SearchInput,
    cafesFiltrados,
    CardVertical,
    eliminarCafe,
    premiumAccent: PREMIUM_ACCENT,
    notebook,
    irAbrirModal: abrirNuevaCata,
    theme: THEME,
    DiarioCatasSection,
  });

  const ultimosAnadidosTabProps = buildUltimosAnadidosTabProps({
    s,
    setActiveTab,
    premiumAccent: PREMIUM_ACCENT,
    cargando,
    ultimos100,
    CardVertical,
    setCafeDetalle,
    favs,
    toggleFav,
  });

  const topCafesTabProps = buildTopCafesTabProps({
    s,
    setActiveTab,
    premiumAccent: PREMIUM_ACCENT,
    perfil,
    cargando,
    top100,
    CardVertical,
    setCafeDetalle,
    favs,
    toggleFav,
  });

  const ofertasTabProps = buildOfertasTabProps({
    s,
    setActiveTab,
    premiumAccent: PREMIUM_ACCENT,
    cafesParaOfertas,
    ofertasPorCafe,
    buscandoOfertaId,
    openOfferCafeId,
    abrirOfertasCafe,
    PackshotImage,
    abrirOfertaWeb,
    theme: THEME,
    premiumAccentDeep: PREMIUM_ACCENT_DEEP,
    errorOfertas,
  });

  const masTabProps = buildMasTabProps({
    s,
    perfil,
    profileInitial,
    profileAlias,
    profileName,
    memberStatus,
    unlockedCount,
    achievementTotal,
    pendingAchievements,
    achievementProgress,
    setShowProfile,
    setActiveTab,
    premiumAccentDeep: PREMIUM_ACCENT_DEEP,
    unlockedAchievements,
    newsletterState,
    guardarNewsletter,
    newsletterLoading,
    newsletterSaving,
    newsletterHasEmail,
    newsletterEmail,
    onLogout,
    appVersion: APP_VERSION,
    premiumAccent: PREMIUM_ACCENT,
    isPremium: premium.isPremium,
    premiumDaysLeft: premium.daysLeft,
    onOpenPaywall: () => premium.openPaywall('mas_tab'),
    iconFaint: THEME.icon.faint,
    interactionFeedbackEnabled: interactionFeedbackSettings.enabled,
    interactionFeedbackMode: interactionFeedbackSettings.mode,
    guardarFeedbackInteracciones,
    guardarModoFeedbackInteracciones,
  });

  const bottomBarProps = buildBottomBarProps({
    s,
    activeTab,
    setActiveTab,
    setScanning,
    favs,
    accentColor: PREMIUM_ACCENT,
    inactiveColor: THEME.icon.inactive,
  });

  return (
    <SafeAreaView style={s.screen}>
      <AppDialogModal
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        title={dialogConfig.title}
        description={dialogConfig.description}
        actions={dialogConfig.actions}
      />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <OnboardingModal
        visible={showOnboarding}
        onClose={completeOnboarding}
        onStartQuiz={startQuizFromOnboarding}
      />

      {!!achievementToast && (
        <TouchableOpacity activeOpacity={0.95} onPress={closeAchievementToast} style={s.achievementToastWrap}>
          <Animated.View
            style={[
              s.achievementToastCard,
              {
                opacity: achievementToastOpacity,
                transform: [{ translateY: achievementToastTranslateY }],
              },
            ]}
          >
            <View style={s.achievementToastRow}>
              <Text style={s.achievementToastEmoji}>{achievementToast.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.achievementToastKicker}>🏆 LOGRO DESBLOQUEADO</Text>
                <Text style={s.achievementToastTitle}>{achievementToast.title}</Text>
                <Text style={s.achievementToastDesc}>{achievementToast.desc}</Text>
              </View>
              <View style={s.achievementToastXpBadge}>
                <Text style={s.achievementToastXpText}>+{achievementToast.xpGained} XP</Text>
              </View>
            </View>
          </Animated.View>
        </TouchableOpacity>
      )}

      {cafeDetalle && (
        <CafeDetailScreen
          cafe={cafeDetalle}
          onClose={() => { setCafeDetalle(null); cargarDatos(); }}
          onDelete={cafeDetalle.uid === user.uid ? eliminarCafe : null}
          favs={favs}
          onToggleFav={toggleFav}
          votes={votes}
          setVotes={setVotes}
          onVote={(cafe) => registrarEventoGamificacion('vote', { cafe })}
          theme={THEME}
          premiumAccent={PREMIUM_ACCENT}
          s={s}
          keyVotes={KEY_VOTES}
        />
      )}
      {showProfile && (
        <ProfileScreen
          isPremium={premium.isPremium}
          premiumDaysLeft={premium.daysLeft}
          onClose={() => { setShowProfile(false); SecureStore.getItemAsync(KEY_PROFILE).then(v => v && setPerfil(JSON.parse(v))).catch(() => {}); }}
          onProfileSaved={refrescarPerfil}
        />
      )}

      <MainScreenBody
        activeTab={activeTab}
        communityTabProps={communityTabProps}
        inicioTabProps={inicioTabProps}
        misCafesTabProps={misCafesTabProps}
        ultimosAnadidosTabProps={ultimosAnadidosTabProps}
        topCafesTabProps={topCafesTabProps}
        ofertasTabProps={ofertasTabProps}
        masTabProps={masTabProps}
        bottomBarProps={bottomBarProps}
        forumThread={forumThread}
        notebook={notebook}
        guardarCata={guardarCata}
        eliminarCata={eliminarCata}
        allCafes={allCafes}
        theme={THEME}
        s={s}
        premiumAccent={PREMIUM_ACCENT}
        premium={premium}
        handleRestorePurchases={handleRestorePurchases}
        purchasingPlan={purchasingPlan}
        restoringPurchases={restoringPurchases}
        purchasesReady={purchasesReady}
        handlePremiumPurchase={handlePremiumPurchase}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen:           { flex: 1, backgroundColor: '#fff' },
  welcomeScreen:    { flex: 1, backgroundColor: '#f6efe7', alignItems: 'center', justifyContent: 'center', padding: 24 },
  welcomeAuraOne:   { position: 'absolute', top: 90, right: -20, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(119, 82, 57, 0.08)' },
  welcomeAuraTwo:   { position: 'absolute', bottom: 80, left: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(255, 248, 241, 0.76)' },
  welcomeCard:      { width: '100%', borderRadius: 30, backgroundColor: '#fffaf5', borderWidth: 1, borderColor: '#eadbce', paddingVertical: 34, paddingHorizontal: 22, alignItems: 'center', shadowColor: '#3a2416', shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  welcomeTypeBox:   { width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: 130, gap: 6 },
  welcomeLineTop:   { fontSize: 24, fontWeight: '900', letterSpacing: 3.2, color: '#5e4332', fontFamily: 'PlayfairDisplay_800ExtraBold' },
  welcomeLineBottom:{ fontSize: 44, fontWeight: '900', letterSpacing: 4.2, color: '#1c120d', fontFamily: 'PlayfairDisplay_800ExtraBold' },
  welcomeTitle:     { fontSize: 44, fontWeight: '900', letterSpacing: 4.2, color: '#1c120d', fontFamily: 'PlayfairDisplay_800ExtraBold' },
  welcomeSub:       { fontSize: 10, color: '#6f5444', fontWeight: '800', letterSpacing: 2.1, textAlign: 'center', marginTop: 2 },
  welcomeCaption:   { marginTop: 18, fontSize: 13, color: '#8a6d5b', fontWeight: '600', letterSpacing: 0.4, textAlign: 'center' },
  permScreen:       { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  permTitle:        { fontSize: 22, fontWeight: '700', color: '#111', textAlign: 'center' },
  permSub:          { fontSize: 15, color: THEME.text.secondary, textAlign: 'center' },
  authScroll:       { padding: 24, paddingTop: 36, paddingBottom: 40, flexGrow: 1, justifyContent: 'center', backgroundColor: '#f6efe7' },
  authShell:        { position: 'relative', gap: 22 },
  authAuraOne:      { position: 'absolute', top: -28, right: -18, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(119, 82, 57, 0.09)' },
  authAuraTwo:      { position: 'absolute', bottom: 90, left: -36, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255, 248, 241, 0.72)' },
  authBrandBlock:   { paddingTop: 8, paddingBottom: 2 },
  authTitle:        { fontSize: 30, fontWeight: '800', color: '#1f140f', marginBottom: 8, fontFamily: 'PlayfairDisplay_700Bold' },
  authSub:          { fontSize: 15, color: '#7e6b5f', marginBottom: 24, lineHeight: 22 },
  authKicker:       { fontSize: 11, fontWeight: '800', color: '#8d6d58', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 10 },
  authCard:         { backgroundColor: '#fffaf5', borderRadius: 28, padding: 22, borderWidth: 1, borderColor: '#eadbce', shadowColor: '#3a2416', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  authLinks:        { marginTop: 20, gap: 12, alignItems: 'center' },
  authLink:         { color: THEME.brand.accentDeep, fontSize: 14, fontWeight: '700' },
  authLinkMuted:    { color: '#8f837a', fontSize: 14, fontWeight: '600' },
  rememberRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  rememberText:     { fontSize: 14, color: THEME.text.tertiary },
  authRememberText: { color: '#5f534b' },
  faceIdBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, padding: 14, borderWidth: 1.5, borderColor: THEME.brand.accentDeep, borderRadius: 30, backgroundColor: '#f9f2ea' },
  faceIdText:       { color: THEME.brand.accentDeep, fontWeight: '700', fontSize: 15 },
  authLabel:        { color: '#836e61' },
  authInput:        { backgroundColor: '#f8f1ea', borderWidth: 1, borderColor: '#e8dacd', color: '#221610' },
  authPrimaryBtn:   { backgroundColor: THEME.brand.primary, borderRadius: 30, padding: 16, alignItems: 'center', marginTop: 8, shadowColor: THEME.brand.primary, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  authPrimaryBtnText:{ color: THEME.brand.onPrimary, fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  authSecondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, padding: 14, borderWidth: 1.2, borderColor: '#dcc8b7', borderRadius: 30, backgroundColor: '#f9f2ea' },
  authSecondaryBtnText:{ color: THEME.brand.accentDeep, fontWeight: '700', fontSize: 15 },
  topBar:           { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8, gap: 10 },
  homeBrandWrap:    { alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 2, paddingBottom: 2 },
  homeWordmark:     { fontSize: 42, fontWeight: '900', letterSpacing: 4.2, color: '#1c120d', textShadowColor: 'rgba(111, 84, 68, 0.08)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8, fontFamily: 'PlayfairDisplay_800ExtraBold' },
  homeLoverRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  homeLoverText:    { fontSize: 10, fontWeight: '800', color: '#6f5444', letterSpacing: 2.2 },
  homeMiniSealOuter:{ width: 24, height: 24, borderRadius: 12, borderWidth: 1, borderColor: '#c4a18a', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcf7f1' },
  homeMiniSealMiddle:{ width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(154, 121, 99, 0.4)', alignItems: 'center', justifyContent: 'center' },
  homeMiniSealInner:{ width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: '#8f6a53', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2e7dc' },
  homeMiniSealText: { fontSize: 8, fontWeight: '900', color: '#6f5444', letterSpacing: 0.5 },
  wordmarkWrap:     { alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 2, paddingTop: 4 },
  wordmarkCrest:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 3 },
  wordmarkMiniLabelWrap:{ minWidth: 78, alignItems: 'center' },
  wordmarkMiniLabel:{ fontSize: 9, fontWeight: '800', color: '#9a7963', letterSpacing: 2.2 },
  wordmarkSealOuter:{ width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#c4a18a', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcf7f1' },
  wordmarkSealMiddle:{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(154, 121, 99, 0.38)', alignItems: 'center', justifyContent: 'center' },
  wordmarkSeal:     { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#8f6a53', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2e7dc' },
  wordmarkSealText: { fontSize: 11, fontWeight: '900', color: '#6f5444', letterSpacing: 1.1 },
  wordmark:         { fontSize: 40, fontWeight: '900', letterSpacing: 4.2, color: '#1c120d', textShadowColor: 'rgba(111, 84, 68, 0.08)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8, fontFamily: 'PlayfairDisplay_800ExtraBold' },
  wordmarkSub:      { fontSize: 10, color: '#8a6b57', fontWeight: '800', letterSpacing: 3.2, marginTop: -2 },
  wordmarkTag:      { fontSize: 10, color: '#6f5444', fontWeight: '800', letterSpacing: 2.1, textAlign: 'center', marginTop: 2 },
  authWordmarkSub:  { marginBottom: 10 },
  authWordmarkTag:  { marginTop: 0 },
  locationPill:     { position: 'relative', overflow: 'hidden', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 10, minWidth: 210, backgroundColor: '#1f140f', borderWidth: 1, borderColor: '#4e3426', shadowColor: '#170d08', shadowOpacity: 0.24, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
  locationText:     { fontSize: 15, fontWeight: '800', color: '#f8ead9', letterSpacing: 0.2 },
  brandPillContent: { gap: 6 },
  brandEyebrow:     { fontSize: 9, fontWeight: '700', color: '#d6b89b', textTransform: 'uppercase', letterSpacing: 1.1 },
  brandRow:         { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  brandMemberRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  brandMemberIdentity: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  brandMemberAvatar:{ width: 40, height: 40, borderRadius: 20, borderWidth: 1.2, borderColor: 'rgba(255, 236, 220, 0.2)' },
  brandMemberAvatarFallback:{ width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255, 248, 241, 0.1)', borderWidth: 1.2, borderColor: 'rgba(255, 236, 220, 0.14)', alignItems: 'center', justifyContent: 'center' },
  brandMemberAvatarText:{ color: '#fff1e4', fontSize: 15, fontWeight: '800' },
  brandMemberCopy:  { flex: 1, gap: 2 },
  brandAlias:       { fontSize: 14, fontWeight: '800', color: '#fff4ea' },
  brandName:        { fontSize: 10, color: '#d2bead' },
  brandTitleWrap:   { flex: 1, gap: 3 },
  brandLevelBadge:  { backgroundColor: 'rgba(248, 225, 198, 0.12)', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(248, 225, 198, 0.18)' },
  brandLevelText:   { fontSize: 10, fontWeight: '800', color: '#fff4ea' },
  brandXpText:      { fontSize: 11, color: '#d4c1b1', fontWeight: '600' },
  brandMetaRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  brandMetaText:    { fontSize: 10, color: '#c9ab90' },
  brandProgressTrack:{ height: 6, borderRadius: 999, backgroundColor: 'rgba(255, 244, 234, 0.12)', overflow: 'hidden' },
  brandProgressFill:{ height: '100%', borderRadius: 999, backgroundColor: '#d18b4a' },
  brandStatsRow:    { flexDirection: 'row', gap: 6 },
  brandStatCard:    { flex: 1, backgroundColor: 'rgba(255, 248, 241, 0.06)', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 4, borderWidth: 1, borderColor: 'rgba(255, 234, 214, 0.08)', alignItems: 'center' },
  brandStatValue:   { fontSize: 13, fontWeight: '800', color: '#fff1e4' },
  brandStatLabel:   { fontSize: 9, color: '#cfb39a', marginTop: 1 },
  brandDecorOne:    { position: 'absolute', top: -30, right: -20, width: 94, height: 94, borderRadius: 47, backgroundColor: 'rgba(209, 139, 74, 0.13)' },
  brandDecorTwo:    { position: 'absolute', bottom: -48, left: -26, width: 98, height: 98, borderRadius: 49, backgroundColor: 'rgba(255, 244, 234, 0.06)' },
  brandTopRule:     { position: 'absolute', top: 0, left: 14, right: 14, height: 1, backgroundColor: 'rgba(255, 238, 220, 0.18)' },
  profileBtn:       { padding: 2 },
  profileAvatar:    { width: 36, height: 36, borderRadius: 18, backgroundColor: PREMIUM_ACCENT, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  profileAvatarText:{ color: THEME.text.inverse, fontWeight: '700', fontSize: 16 },
  searchWrap:       { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 10, backgroundColor: '#f5f5f5', borderRadius: 25, paddingHorizontal: 14, height: 44 },
  searchInput:      { flex: 1, fontSize: 15, color: '#222', marginLeft: 8 },
  sectionHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 20, marginBottom: 2 },
  sectionTitle:     { fontSize: 20, fontWeight: '700', color: '#111', fontFamily: 'PlayfairDisplay_700Bold' },
  sectionSub:       { fontSize: 13, color: THEME.text.secondary, paddingHorizontal: 16, marginBottom: 14 },
  pageTitle:        { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 12, fontFamily: 'PlayfairDisplay_700Bold' },
  empty:            { color: THEME.text.muted, textAlign: 'center', marginTop: 40, fontSize: 14 },
  packshotFrame:    { backgroundColor: '#ffffff', borderRadius: 18, borderWidth: 1, borderColor: '#f1ece4', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2, alignItems: 'center', justifyContent: 'center' },
  packshotInner:    { width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  packshotImage:    { width: '84%', height: '84%' },
  packshotHeroFrame:{ width: '68%', height: '72%', borderRadius: 28, padding: 14 },
  packshotHeroImage:{ width: '88%', height: '88%' },
  packshotCardFrame:{ width: 132, height: 172, marginTop: 14, borderRadius: 18, padding: 10 },
  packshotCardImage:{ width: '86%', height: '86%' },
  packshotListFrame:{ width: 68, height: 88, borderRadius: 14, padding: 8 },
  packshotListImage:{ width: '88%', height: '88%' },
  cardH:            { width: 160, marginRight: 4 },
  cardHImg:         { width: 160, height: 200, borderRadius: 10, backgroundColor: '#f8f7f4', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  cardHOrigin:      { fontSize: 12, color: THEME.text.secondary, marginBottom: 2 },
  cardHName:        { fontSize: 14, fontWeight: '700', color: '#111', lineHeight: 19 },
  cardHRating:      { fontSize: 13, fontWeight: '600', color: PREMIUM_ACCENT },
  cardHVotos:       { fontSize: 12, color: THEME.text.secondary },
  cardV:            { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: THEME.border.soft },
  cardVImg:         { width: 80, height: 100, borderRadius: 10, backgroundColor: '#f8f7f4', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
  cardVOrigin:      { fontSize: 12, color: THEME.text.secondary, marginBottom: 2 },
  cardVName:        { fontSize: 15, fontWeight: '700', color: THEME.text.primary, marginBottom: 5 },
  cardVNotas:       { fontSize: 12, color: THEME.text.muted, marginTop: 5, lineHeight: 17 },
  offerHint:        { fontSize: 12, color: '#666', marginTop: 8 },
  offerMetaRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  offerSourceBadge: { fontSize: 10, fontWeight: '800', color: '#fff', backgroundColor: '#111', borderRadius: 999, paddingHorizontal: 6, paddingVertical: 3 },
  badgeRed:         { position: 'absolute', top: 8, left: 8, backgroundColor: PREMIUM_ACCENT, borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText:        { color: '#fff', fontSize: 11, fontWeight: '700' },
  rankRow:          { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 0.5, borderBottomColor: THEME.border.soft },
  rankNum:          { fontSize: 22, fontWeight: '700', color: '#ccc', width: 28 },
  rankName:         { fontSize: 15, fontWeight: '600', color: '#111' },
  rankVotos:        { fontSize: 12, color: THEME.text.secondary, marginTop: 2 },
  redBtn:           { backgroundColor: THEME.brand.primary, borderRadius: 30, padding: 16, alignItems: 'center', marginTop: 8, borderWidth: 1, borderColor: THEME.brand.primaryBorder, shadowColor: THEME.brand.primary, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  redBtnText:       { color: THEME.brand.onPrimary, fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  bottomBar:        { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: THEME.surface.base, borderTopWidth: 0.5, borderTopColor: THEME.border.soft, flexDirection: 'row', alignItems: 'center', paddingBottom: 20, paddingTop: 10 },
  tabBtn:           { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel:         { fontSize: 10, color: THEME.text.secondary },
  tabBadge:         { position: 'absolute', top: -4, right: -8, width: 16, height: 16, borderRadius: 8, backgroundColor: THEME.brand.accent, alignItems: 'center', justifyContent: 'center' },
  tabBadgeText:     { color: THEME.text.inverse, fontSize: 9, fontWeight: '700' },
  camBtn:           { width: 60, height: 60, borderRadius: 30, backgroundColor: THEME.brand.primary, borderWidth: 1.5, borderColor: THEME.brand.primaryBorderStrong, alignItems: 'center', justifyContent: 'center', marginTop: -20, shadowColor: THEME.brand.primary, shadowOpacity: 0.34, shadowRadius: 10, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  formScroll:       { padding: 20, paddingTop: 52, paddingBottom: 50 },
  backRow:          { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20 },
  backText:         { color: '#d4a574', fontSize: 15 },
  formTitle:        { fontSize: 26, fontWeight: '700', color: '#111', marginBottom: 20 },
  fotoEmpty:        { backgroundColor: '#f5f5f5', borderRadius: 14, height: 140, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  fotoEmptyText:    { color: THEME.text.muted, fontSize: 14 },
  fotoFull:         { width: '100%', height: 200, borderRadius: 14, marginBottom: 8 },
  retake:           { color: PREMIUM_ACCENT_DEEP, fontSize: 13, textAlign: 'right', marginBottom: 20 },
  label:            { fontSize: 12, fontWeight: '600', color: THEME.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  input:            { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, fontSize: 15, color: '#111', marginBottom: 18 },
  forumCatCard:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#faf8f5', borderRadius: 14, borderWidth: 1, borderColor: '#d4a574', padding: 14 },
  forumCatEmoji:    { fontSize: 22 },
  forumCatTitle:    { fontSize: 15, fontWeight: '800', color: '#1f140f' },
  forumCatDesc:     { fontSize: 12, color: '#8b7355', marginTop: 2 },
  forumHeaderRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  forumNewBtn:      { backgroundColor: THEME.brand.primary, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  forumNewBtnText:  { color: THEME.brand.onPrimary, fontWeight: '700', fontSize: 12 },
  forumSortRow:     { flexDirection: 'row', gap: 8, marginTop: 8 },
  forumSortChip:    { borderRadius: 999, borderWidth: 1, borderColor: '#e0d0c1', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#fff' },
  forumSortChipActive:{ backgroundColor: '#2f1d14', borderColor: '#2f1d14' },
  forumSortText:    { fontSize: 12, color: THEME.brand.accentDeep, fontWeight: '700' },
  forumSortTextActive:{ color: '#fff' },
  forumThreadCard:  { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#ece2d8', padding: 12 },
  forumThreadTitle: { fontSize: 15, fontWeight: '800', color: THEME.text.primary, marginBottom: 4 },
  forumThreadBody:  { fontSize: 13, color: '#4a3f36', lineHeight: 20 },
  forumMetaRow:     { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  forumAuthorRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  forumAvatar:      { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e9ddcf' },
  forumAvatarText:  { fontSize: 12, fontWeight: '800', color: THEME.brand.accentDeep },
  forumAuthorName:  { fontSize: 12, fontWeight: '700', color: THEME.text.primary },
  forumAuthorLevel: { fontSize: 10, color: THEME.brand.accentDeep, fontWeight: '700' },
  forumMetaText:    { fontSize: 11, color: THEME.text.secondary },
  forumCountersRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  forumCounter:     { fontSize: 12, color: THEME.text.tertiary, fontWeight: '600' },
  forumMainPost:    { marginTop: 4, backgroundColor: PREMIUM_SURFACE_SOFT, borderRadius: 14, borderWidth: 1, borderColor: PREMIUM_BORDER_SOFT, padding: 14 },
  forumMainPostHead:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  forumMainPostImage:{ marginTop: 8, width: '100%', height: 160, borderRadius: 10 },
  forumReplyCard:   { marginBottom: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#efe6dc', padding: 10 },
  forumChildReplyCard:{ marginTop: 8, marginLeft: 14, backgroundColor: '#faf6f1', borderRadius: 10, borderWidth: 1, borderColor: '#f0e6db', padding: 9 },
  forumActionBtn:   { backgroundColor: '#f7efe6', borderWidth: 1, borderColor: '#e6d5c4', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  forumActionText:  { fontSize: 12, color: THEME.brand.accentDeep, fontWeight: '700' },
  forumActionBtnDisabled:{ backgroundColor: '#f3f0eb', borderColor: '#e3ddd6' },
  forumActionTextDisabled:{ color: '#a39a90' },
  forumMetaActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  forumDotsBtn:     { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7efe6', borderWidth: 1, borderColor: '#e6d5c4' },
  forumComposerWrap:{ borderTopWidth: 1, borderTopColor: '#e8ddd2', backgroundColor: '#fff', paddingHorizontal: 12, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 34 : 86 },
  forumReplyingTag: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f5ece2', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 8 },
  forumReplyingText:{ fontSize: 12, color: THEME.brand.accentDeep, fontWeight: '600' },
  forumComposerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  forumComposerInput:{ flex: 1, minHeight: 42, maxHeight: 110, backgroundColor: '#f5f0e9', borderRadius: 12, borderWidth: 1, borderColor: '#e3d8cc', paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#2a1d14' },
  forumSendBtn:     { width: 42, height: 42, borderRadius: 21, backgroundColor: THEME.brand.primary, alignItems: 'center', justifyContent: 'center' },
  forumModalOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  forumModalCard:   { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, borderWidth: 1, borderColor: '#ebdfd3' },
  forumCountText:   { fontSize: 12, color: THEME.text.secondary, textAlign: 'right', marginTop: -8, marginBottom: 10 },
});
