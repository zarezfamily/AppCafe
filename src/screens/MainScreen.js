// ─────────────────────────────────────────────────────────────────────────────
//  App.js — Etiove ☕  v2.1
// ─────────────────────────────────────────────────────────────────────────────

import { SafeAreaView } from 'react-native';

import { CardHorizontal, CardVertical } from '../components/Cards';
import PackshotImage from '../components/PackshotImage';
import SearchInput from '../components/SearchInput';
import { restoreAuthTokenFromSecureStore } from '../services/authService';
import {
  addDocument,
  deleteDocument,
  getCollection,
  getDocument,
  getUserCafes,
  queryCollection,
  setDocument,
  updateDocument,
} from '../services/firestoreService';
import { uploadImageToStorage } from '../services/storageService';
import DiarioCatasSection from './DiarioCatasSection';
import MainScreenBody from './MainScreenBody';
import PremiumBadge from './PremiumBadge';
import { KEY_VOTES, PREMIUM_ACCENT, PREMIUM_ACCENT_DEEP, THEME } from './mainScreenConfig';
import createMainScreenStyles from './mainScreenStyles';
import { MainScreenOverlayLayer, renderMainScreenTransientView } from './mainScreenTransientViews';
import useMainScreenComposition from './useMainScreenComposition';

const s = createMainScreenStyles(THEME, PREMIUM_ACCENT, PREMIUM_ACCENT_DEEP);

export default function MainScreen({ onLogout }) {
  const { user, ui, domain, forum, bootstrap, gamification, tabProps } = useMainScreenComposition({
    onLogout,
    services: {
      addDocument,
      deleteDocument,
      getCollection,
      getDocument,
      getUserCafes,
      queryCollection,
      restoreAuthTokenFromSecureStore,
      setDocument,
      updateDocument,
      uploadImageToStorage,
    },
    ui: {
      CardHorizontal,
      CardVertical,
      DiarioCatasSection,
      PackshotImage,
      PremiumBadge,
      SearchInput,
      styles: s,
    },
  });

  const transientView = renderMainScreenTransientView({
    permission: ui.permission,
    requestPermission: ui.requestPermission,
    scanning: ui.scanning,
    onScannerDone: ui.closeScannerAndOpenForm,
    onScannerBack: () => ui.setScanning(false),
    showForm: ui.showForm,
    onFormBack: () => ui.setShowForm(false),
    onFormSave: () => ui.closeFormAndRefreshData(domain.cargarDatos),
    onCafeAdded: (cafe) =>
      gamification.registrarEventoGamificacion('add_cafe', {
        hasPhoto: !!cafe?.foto,
        hasReview: !!String(cafe?.notas || '').trim(),
      }),
    s,
    premiumAccent: PREMIUM_ACCENT,
    allCafes: domain.allCafes,
    setCafeDetalle: ui.setCafeDetalle,
    setScanning: ui.setScanning,
    showDialog: ui.showDialog,
  });

  if (transientView) {
    return transientView;
  }

  return (
    <SafeAreaView style={s.screen}>
      <MainScreenOverlayLayer
        dialogVisible={ui.dialogVisible}
        closeDialog={ui.closeDialog}
        dialogConfig={ui.dialogConfig}
        showOnboarding={bootstrap.showOnboarding}
        completeOnboarding={bootstrap.completeOnboarding}
        startQuizFromOnboarding={bootstrap.startQuizFromOnboarding}
        achievementToast={gamification.achievementToast}
        closeAchievementToast={gamification.closeAchievementToast}
        achievementToastOpacity={gamification.achievementToastOpacity}
        achievementToastTranslateY={gamification.achievementToastTranslateY}
        s={s}
        cafeDetalle={ui.cafeDetalle}
        userId={user?.uid}
        closeCafeDetail={ui.closeCafeDetail}
        cargarDatos={domain.cargarDatos}
        eliminarCafe={domain.eliminarCafe}
        favs={ui.favs}
        toggleFav={domain.toggleFav}
        votes={ui.votes}
        setVotes={ui.setVotes}
        onVote={(cafe) => gamification.registrarEventoGamificacion('vote', { cafe })}
        theme={THEME}
        premiumAccent={PREMIUM_ACCENT}
        keyVotes={KEY_VOTES}
        showProfile={ui.showProfile}
        premium={domain.premium}
        closeProfile={ui.closeProfile}
        refrescarPerfil={ui.refrescarPerfil}
      />

      <MainScreenBody
        activeTab={ui.activeTab}
        communityTabProps={tabProps.communityTabProps}
        inicioTabProps={tabProps.inicioTabProps}
        misCafesTabProps={tabProps.misCafesTabProps}
        ultimosAnadidosTabProps={tabProps.ultimosAnadidosTabProps}
        topCafesTabProps={tabProps.topCafesTabProps}
        ofertasTabProps={tabProps.ofertasTabProps}
        masTabProps={tabProps.masTabProps}
        bottomBarProps={tabProps.bottomBarProps}
        forumThread={forum.forumThread}
        notebook={domain.notebook}
        guardarCata={domain.guardarCata}
        eliminarCata={domain.eliminarCata}
        allCafes={domain.allCafes}
        theme={THEME}
        s={s}
        premiumAccent={PREMIUM_ACCENT}
        premium={domain.premium}
        handleRestorePurchases={domain.handleRestorePurchases}
        purchasingPlan={domain.purchasingPlan}
        restoringPurchases={domain.restoringPurchases}
        purchasesReady={domain.purchasesReady}
        handlePremiumPurchase={domain.handlePremiumPurchase}
      />
    </SafeAreaView>
  );
}
