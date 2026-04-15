import React from 'react';
import { Animated, SafeAreaView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppDialogModal from '../components/AppDialogModal';
import OnboardingModal from '../components/OnboardingModal';
import CafeDetailScreen from './CafeDetailScreen';
import FormScreen from './FormScreen';
import ProfileScreen from './ProfileScreen';
import ScannerScreen from './ScannerScreen';

export function renderMainScreenTransientView({
  permission,
  requestPermission,
  scanning,
  onScannerDone,
  onScannerBack,
  showForm,
  onFormBack,
  onFormSave,
  onCafeAdded,
  s,
  premiumAccent,
}) {
  if (scanning && !permission?.granted) {
    return (
      <SafeAreaView style={s.permScreen}>
        <Ionicons name="cafe" size={72} color={premiumAccent} />
        <Text style={s.permTitle}>Etiove necesita la cámara</Text>
        <Text style={s.permSub}>Para escanear paquetes de café</Text>
        <TouchableOpacity style={s.redBtn} onPress={requestPermission}>
          <Text style={s.redBtnText}>Activar cámara</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (scanning) {
    return (
      <ScannerScreen
        onScanned={onScannerDone}
        onSkip={onScannerDone}
        onBack={onScannerBack}
        premiumAccent={premiumAccent}
      />
    );
  }

  if (showForm) {
    return (
      <FormScreen
        s={s}
        premiumAccent={premiumAccent}
        onBack={onFormBack}
        onSave={onFormSave}
        onCafeAdded={onCafeAdded}
      />
    );
  }

  return null;
}

export function MainScreenOverlayLayer({
  dialogVisible,
  closeDialog,
  dialogConfig,
  showOnboarding,
  completeOnboarding,
  startQuizFromOnboarding,
  achievementToast,
  closeAchievementToast,
  achievementToastOpacity,
  achievementToastTranslateY,
  s,
  cafeDetalle,
  userId,
  closeCafeDetail,
  cargarDatos,
  eliminarCafe,
  favs,
  toggleFav,
  votes,
  setVotes,
  onVote,
  theme,
  premiumAccent,
  keyVotes,
  showProfile,
  premium,
  closeProfile,
  refrescarPerfil,
}) {
  return (
    <>
      <AppDialogModal
        visible={!!dialogVisible}
        onClose={closeDialog}
        title={dialogConfig.title}
        description={dialogConfig.description}
        actions={dialogConfig.actions}
      />

      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <OnboardingModal
        visible={!!showOnboarding}
        onClose={completeOnboarding}
        onStartQuiz={startQuizFromOnboarding}
      />

      {!!achievementToast && (
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={closeAchievementToast}
          style={s.achievementToastWrap}
        >
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
          onClose={() => closeCafeDetail(cargarDatos)}
          onDelete={cafeDetalle.uid === userId ? eliminarCafe : null}
          favs={favs}
          onToggleFav={toggleFav}
          votes={votes}
          setVotes={setVotes}
          onVote={onVote}
          theme={theme}
          premiumAccent={premiumAccent}
          s={s}
          keyVotes={keyVotes}
        />
      )}

      {!!showProfile && (
        <ProfileScreen
          isPremium={premium.isPremium}
          premiumDaysLeft={premium.daysLeft}
          onClose={closeProfile}
          onProfileSaved={refrescarPerfil}
        />
      )}
    </>
  );
}
