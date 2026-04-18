import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  SafeAreaView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import AppDialogModal from '../components/AppDialogModal';
import OnboardingModal from '../components/OnboardingModal';
import CafeDetailScreen from './CafeDetailScreen';
import FormScreen from './FormScreen';
import ProfileScreen from './ProfileScreen';
import ScannerScreen from './ScannerScreen';

function normalizeEan(value) {
  return String(value || '')
    .replace(/\D/g, '')
    .trim();
}

function getCafeMatchMode(cafe) {
  const status = String(cafe?.reviewStatus || '').toLowerCase();
  if (status === 'pending') return 'pending';
  if (status === 'rejected') return 'rejected';
  return 'approved';
}

function getCafeMatchCopy(cafe) {
  const mode = getCafeMatchMode(cafe);

  if (mode === 'pending') {
    return {
      title: 'Ya está en revisión ⏳',
      description:
        'Este café ya fue detectado y está pendiente de validación. Puedes ver su ficha provisional.',
      primaryLabel: 'Ver ficha provisional',
      autoOpen: false,
    };
  }

  if (mode === 'rejected') {
    return {
      title: 'Ya existe, pero fue rechazado 🚫',
      description:
        'Este registro ya existe en Etiove pero fue rechazado o desactivado. Puedes abrir su ficha para revisarlo.',
      primaryLabel: 'Ver ficha',
      autoOpen: false,
    };
  }

  return {
    title: 'Ya lo tenemos ☕',
    description: 'Este café ya está en Etiove. Abrimos su ficha automáticamente.',
    primaryLabel: 'Ver ficha ahora',
    autoOpen: true,
  };
}

function ExistingCafeMatchScreen({ cafe, premiumAccent, onOpenNow, onClose }) {
  const [progress, setProgress] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.96)).current;
  const matchCopy = getCafeMatchCopy(cafe);

  useEffect(() => {
    if (!matchCopy.autoOpen) {
      setProgress(1);
      return undefined;
    }

    const start = Date.now();
    const duration = 900;

    const timer = setInterval(() => {
      const elapsed = Date.now() - start;
      const next = Math.min(elapsed / duration, 1);
      setProgress(next);
      if (next >= 1) clearInterval(timer);
    }, 16);

    return () => clearInterval(timer);
  }, [fadeAnim, scaleAnim, matchCopy.autoOpen]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b0b0b' }}>
      <StatusBar barStyle="light-content" backgroundColor="#0b0b0b" />

      <Animated.View
        style={{
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 28,
          paddingBottom: 32,
          justifyContent: 'space-between',
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <TouchableOpacity
          onPress={onClose}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: 'rgba(255,255,255,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="close" size={24} color="#fff" />
        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 44,
              backgroundColor: 'rgba(255,255,255,0.08)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <Ionicons name="checkmark" size={42} color={premiumAccent} />
          </View>

          <Text
            style={{
              color: '#fff',
              fontSize: 28,
              fontWeight: '800',
              textAlign: 'center',
              marginBottom: 10,
            }}
          >
            {matchCopy.title}
          </Text>

          <Text
            style={{
              color: '#b8b8b8',
              fontSize: 15,
              textAlign: 'center',
              lineHeight: 22,
              marginBottom: 26,
            }}
          >
            {matchCopy.description}
          </Text>

          {!!cafe?.foto && (
            <View
              style={{
                width: '100%',
                borderRadius: 22,
                overflow: 'hidden',
                marginBottom: 18,
                backgroundColor: '#161616',
              }}
            >
              <Image source={{ uri: cafe.foto }} style={{ width: '100%', height: 220 }} />
            </View>
          )}

          <View
            style={{
              width: '100%',
              borderRadius: 22,
              backgroundColor: '#151515',
              borderWidth: 1,
              borderColor: '#262626',
              padding: 18,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>
              {cafe?.nombre || cafe?.name || 'Café encontrado'}
            </Text>

            {!!(cafe?.marca || cafe?.brand) && (
              <Text style={{ color: '#c7c7c7', fontSize: 15, marginTop: 8 }}>
                {cafe?.marca || cafe?.brand}
              </Text>
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {!!cafe?.isSpecialty && (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: 'rgba(202,162,124,0.16)',
                    borderWidth: 1,
                    borderColor: 'rgba(202,162,124,0.32)',
                  }}
                >
                  <Text style={{ color: '#f4d7b8', fontSize: 12, fontWeight: '800' }}>
                    Specialty
                  </Text>
                </View>
              )}

              {!!cafe?.puntuacion && (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.10)',
                  }}
                >
                  <Text style={{ color: '#e7e7e7', fontSize: 12, fontWeight: '800' }}>
                    {Number(cafe.puntuacion).toFixed(1)} ★
                  </Text>
                </View>
              )}

              {!!cafe?.reviewStatus && (
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 999,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.10)',
                  }}
                >
                  <Text style={{ color: '#d0d0d0', fontSize: 12, fontWeight: '700' }}>
                    {String(cafe.reviewStatus).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            {!!(cafe?.origen || cafe?.origin) && (
              <Text style={{ color: '#8f8f8f', fontSize: 13, marginTop: 8 }}>
                {cafe?.origen || cafe?.origin}
              </Text>
            )}

            {!!cafe?.ean && (
              <Text style={{ color: '#737373', fontSize: 12, marginTop: 10 }}>EAN: {cafe.ean}</Text>
            )}
          </View>
        </View>

        <View>
          <View
            style={{
              height: 6,
              borderRadius: 999,
              backgroundColor: '#1f1f1f',
              overflow: 'hidden',
              marginBottom: 16,
            }}
          >
            <View
              style={{
                width: `${Math.round(progress * 100)}%`,
                height: '100%',
                backgroundColor: premiumAccent,
              }}
            />
          </View>

          <TouchableOpacity
            onPress={onOpenNow}
            style={{
              borderRadius: 16,
              backgroundColor: premiumAccent,
              paddingVertical: 16,
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <Text style={{ color: '#111', fontWeight: '800', fontSize: 15 }}>
              {matchCopy.primaryLabel}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onClose}
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: '#2a2a2a',
              paddingVertical: 15,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#d0d0d0', fontWeight: '700', fontSize: 14 }}>Cerrar</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

function ScannerMatchFlow({
  allCafes,
  onScannerDone,
  onScannerBack,
  premiumAccent,
  setCafeDetalle,
  setScanning,
  showDialog,
}) {
  const [matchedCafe, setMatchedCafe] = useState(null);

  useEffect(() => {
    if (!matchedCafe) return undefined;

    const matchCopy = getCafeMatchCopy(matchedCafe);
    if (!matchCopy.autoOpen) return undefined;

    const timer = setTimeout(() => {
      setScanning(false);
      setCafeDetalle?.(matchedCafe);
      setMatchedCafe(null);
    }, 900);

    return () => clearTimeout(timer);
  }, [matchedCafe, setCafeDetalle, setScanning]);

  if (matchedCafe) {
    return (
      <ExistingCafeMatchScreen
        cafe={matchedCafe}
        premiumAccent={premiumAccent}
        onOpenNow={() => {
          setScanning(false);
          setCafeDetalle?.(matchedCafe);
          setMatchedCafe(null);
        }}
        onClose={() => {
          setScanning(false);
          setMatchedCafe(null);
        }}
      />
    );
  }

  return (
    <ScannerScreen
      onScanned={(result) => {
        const ean = normalizeEan(result?.ean);

        if (!ean) {
          showDialog?.('Error', 'No se ha podido leer el código');
          return;
        }

        const existing = allCafes.find((c) => normalizeEan(c?.ean) === ean);

        if (existing) {
          setMatchedCafe(existing);
          return;
        }

        onScannerDone?.({
          ...result,
          ean,
          isNew: true,
          autoCreate: true,
        });
      }}
      onSkip={() => onScannerDone?.({ skip: true })}
      onBack={onScannerBack}
      premiumAccent={premiumAccent}
    />
  );
}

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
  allCafes = [],
  setCafeDetalle,
  setScanning,
  showDialog,
  scannedData,
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
      <ScannerMatchFlow
        allCafes={allCafes}
        onScannerDone={onScannerDone}
        onScannerBack={onScannerBack}
        premiumAccent={premiumAccent}
        setCafeDetalle={setCafeDetalle}
        setScanning={setScanning}
        showDialog={showDialog}
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
        scannedData={scannedData}
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
