import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetwork } from '../context/NetworkContext';
import { getAuthToken } from '../services/firebaseCore';

/* ─── Radar animation with rotating analysis messages ─── */

const SCAN_MESSAGES = [
  { icon: 'search-outline', text: 'Analizando imagen…' },
  { icon: 'earth-outline', text: 'Detectando origen…' },
  { icon: 'leaf-outline', text: 'Identificando variedad…' },
  { icon: 'flask-outline', text: 'Analizando proceso…' },
  { icon: 'musical-notes-outline', text: 'Detectando notas…' },
  { icon: 'ribbon-outline', text: 'Evaluando calidad…' },
  { icon: 'cafe-outline', text: 'Casi listo…' },
];

function ScanRadar({ color = '#c8a97c' }) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const msgFade = useRef(new Animated.Value(1)).current;
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    // Radar sweep rotation
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 2400,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Concentric pulse rings
    const pulseAnim = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 1800,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    pulseAnim(pulse1, 0).start();
    pulseAnim(pulse2, 900).start();
  }, [spin, pulse1, pulse2]);

  // Rotate messages
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(msgFade, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setMsgIdx((i) => (i + 1) % SCAN_MESSAGES.length);
        Animated.timing(msgFade, {
          toValue: 1,
          duration: 280,
          useNativeDriver: true,
        }).start();
      });
    }, 2200);
    return () => clearInterval(interval);
  }, [msgFade]);

  const rotation = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const makePulseStyle = (anim) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1.3] }) }],
  });

  const msg = SCAN_MESSAGES[msgIdx];

  return (
    <View style={radarStyles.wrap}>
      {/* Pulse rings */}
      <Animated.View style={[radarStyles.ring, { borderColor: color }, makePulseStyle(pulse1)]} />
      <Animated.View style={[radarStyles.ring, { borderColor: color }, makePulseStyle(pulse2)]} />

      {/* Radar sweep */}
      <Animated.View style={[radarStyles.sweepWrap, { transform: [{ rotate: rotation }] }]}>
        <View style={[radarStyles.sweep, { backgroundColor: color }]} />
      </Animated.View>

      {/* Center dot */}
      <View style={[radarStyles.dot, { backgroundColor: color }]} />

      {/* Message */}
      <Animated.View style={[radarStyles.msgRow, { opacity: msgFade }]}>
        <Ionicons name={msg.icon} size={18} color={color} />
        <Text style={[radarStyles.msgText, { color }]}>{msg.text}</Text>
      </Animated.View>
    </View>
  );
}

const RADAR_SIZE = 140;
const radarStyles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    width: RADAR_SIZE + 60,
    height: RADAR_SIZE + 80,
  },
  ring: {
    position: 'absolute',
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    borderRadius: RADAR_SIZE / 2,
    borderWidth: 2,
    top: 10,
  },
  sweepWrap: {
    position: 'absolute',
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    top: 10,
    alignItems: 'center',
  },
  sweep: {
    width: 2,
    height: RADAR_SIZE / 2,
    borderRadius: 1,
    opacity: 0.7,
  },
  dot: {
    position: 'absolute',
    top: 10 + RADAR_SIZE / 2 - 5,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  msgRow: {
    position: 'absolute',
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  msgText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

/* ─── Animated scan line for barcode viewfinder ─── */

function ScanLine({ color = '#c8a97c', height = 160 }) {
  const pos = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pos, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pos, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pos]);

  const translateY = pos.interpolate({
    inputRange: [0, 1],
    outputRange: [0, height - 4],
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 8,
        right: 8,
        top: 0,
        height: 3,
        borderRadius: 2,
        backgroundColor: color,
        opacity: 0.8,
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 8,
        transform: [{ translateY }],
      }}
    />
  );
}

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'];
const RECOGNIZE_URL = 'https://europe-west1-miappdecafe.cloudfunctions.net/recognizeCoffee';
const CONFIRM_URL = 'https://europe-west1-miappdecafe.cloudfunctions.net/confirmRecognition';

async function recognizePhoto(base64) {
  const token = getAuthToken();
  const res = await fetch(RECOGNIZE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ imageBase64: base64 }),
  });
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  return res.json();
}

async function confirmRecognition(extracted, cafeId) {
  if (!extracted?.roaster && !extracted?.nombre) return;
  const token = getAuthToken();
  fetch(CONFIRM_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      extractedRoaster: extracted.roaster || '',
      extractedNombre: extracted.nombre || '',
      confirmedCafeId: cafeId,
    }),
  }).catch(() => {});
}

/* ─── Mode chooser shown on scanner open ─── */

function ModeChooser({ premiumAccent, insets, onChoose, onBack, onSkip }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View
      style={[
        chooserStyles.root,
        { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, opacity: fadeAnim },
      ]}
    >
      <View style={chooserStyles.topRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={onSkip}>
          <Text style={[styles.skipText, { color: premiumAccent }]}>Omitir</Text>
        </TouchableOpacity>
      </View>

      <View style={chooserStyles.center}>
        <Ionicons name="cafe-outline" size={48} color={premiumAccent} />
        <Text style={chooserStyles.title}>¿Cómo quieres escanear?</Text>
        <Text style={chooserStyles.subtitle}>Elige una opción para identificar tu café</Text>

        <TouchableOpacity
          style={[chooserStyles.optionBtn, { borderColor: premiumAccent }]}
          onPress={() => onChoose('photo')}
          activeOpacity={0.85}
        >
          <View style={[chooserStyles.optionIcon, { backgroundColor: premiumAccent }]}>
            <Ionicons name="camera" size={28} color="#fff" />
          </View>
          <View style={chooserStyles.optionInfo}>
            <Text style={chooserStyles.optionTitle}>Foto del paquete</Text>
            <Text style={chooserStyles.optionDesc}>
              Saca una foto de la bolsa y la IA identifica el café
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#aaa" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[chooserStyles.optionBtn, { borderColor: premiumAccent }]}
          onPress={() => onChoose('barcode')}
          activeOpacity={0.85}
        >
          <View style={[chooserStyles.optionIcon, { backgroundColor: premiumAccent }]}>
            <Ionicons name="barcode" size={28} color="#fff" />
          </View>
          <View style={chooserStyles.optionInfo}>
            <Text style={chooserStyles.optionTitle}>Código de barras</Text>
            <Text style={chooserStyles.optionDesc}>
              Escanea el código EAN del envase para buscarlo
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#aaa" />
        </TouchableOpacity>
      </View>

      <Text style={chooserStyles.footer}>Puedes cambiar de modo en cualquier momento</Text>
    </Animated.View>
  );
}

const chooserStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b0b0b',
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginBottom: 8,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  optionIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  optionDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 3,
    lineHeight: 17,
  },
  footer: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.35)',
    textAlign: 'center',
  },
});

export default function ScannerScreen({
  onScanned,
  onRecognized,
  onSkip,
  onBack,
  premiumAccent = '#c8a97c',
}) {
  const cameraRef = useRef(null);
  const barcodeLockRef = useRef(false);
  const insets = useSafeAreaInsets();
  const { isOnline } = useNetwork();

  const [mode, setMode] = useState(null); // null = chooser, 'photo', 'barcode'
  const [barcodeActive, setBarcodeActive] = useState(true);
  const [state, setState] = useState('idle'); // idle | capturing | recognizing | results | error | offline
  const [candidates, setCandidates] = useState([]);
  const [lastExtracted, setLastExtracted] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const pendingBarcodeRef = useRef(null);

  const handleBarcodeScanned = useCallback(
    ({ data }) => {
      if (!barcodeActive || barcodeLockRef.current) return;
      barcodeLockRef.current = true;
      setBarcodeActive(false);
      pendingBarcodeRef.current = data;
      setState('recognizing');

      // Show radar for 1.2s so the user sees the magic
      setTimeout(() => {
        setState('idle');
        onScanned?.({ ean: pendingBarcodeRef.current });
        pendingBarcodeRef.current = null;
      }, 1200);
    },
    [barcodeActive, onScanned]
  );

  const handleCapture = useCallback(async () => {
    if (state !== 'idle' || !cameraRef.current) return;

    // Photo recognition requires network
    if (!isOnline) {
      setState('offline');
      return;
    }

    setState('capturing');
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
        skipProcessing: true,
      });
      setState('recognizing');
      const result = await recognizePhoto(photo.base64);
      console.log(
        '[Scanner] resultado:',
        JSON.stringify({
          confidence: result.confidence,
          extracted: result.extracted,
          scores: result.candidates?.map((c) => ({ nombre: c.nombre, score: c.score })),
        })
      );

      if (!result.isCoffee || !result.candidates?.length) {
        setErrorMsg(
          'No he podido identificar ningún café. Prueba con otra foto o busca manualmente.'
        );
        setState('error');
        return;
      }

      setLastExtracted(result.extracted || null);

      if (result.confidence === 'high') {
        confirmRecognition(result.extracted, result.candidates[0].id);
        onRecognized?.(result.candidates[0]);
        return;
      }

      setCandidates(result.candidates);
      setState('results');
    } catch (err) {
      console.error('[ScannerScreen] recognize error:', err?.message || err);
      setErrorMsg(`Error: ${err?.message || 'desconocido'}. Vuelve a intentarlo.`);
      setState('error');
    }
  }, [state, isOnline]);

  const handleReset = () => {
    setState('idle');
    setCandidates([]);
    setLastExtracted(null);
    setErrorMsg('');
    barcodeLockRef.current = false;
    setBarcodeActive(true);
  };

  const isPhotoMode = mode === 'photo';

  // Show mode chooser before activating camera
  if (mode === null) {
    return (
      <SafeAreaView style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0b0b0b" />
        <ModeChooser
          premiumAccent={premiumAccent}
          insets={insets}
          onChoose={(m) => {
            setMode(m);
            handleReset();
          }}
          onBack={onBack}
          onSkip={onSkip}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={isPhotoMode ? undefined : { barcodeTypes: BARCODE_TYPES }}
        onBarcodeScanned={!isPhotoMode && barcodeActive ? handleBarcodeScanned : undefined}
      />

      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => setMode(null)}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>

          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, isPhotoMode && styles.modeBtnActive]}
              onPress={() => {
                setMode('photo');
                handleReset();
              }}
            >
              <Ionicons
                name="camera"
                size={16}
                color={isPhotoMode ? '#111' : 'rgba(255,255,255,0.7)'}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.modeBtnText, isPhotoMode && styles.modeBtnTextActive]}>
                Foto
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, !isPhotoMode && styles.modeBtnActive]}
              onPress={() => {
                setMode('barcode');
                handleReset();
              }}
            >
              <Ionicons
                name="barcode"
                size={16}
                color={!isPhotoMode ? '#111' : 'rgba(255,255,255,0.7)'}
                style={{ marginRight: 5 }}
              />
              <Text style={[styles.modeBtnText, !isPhotoMode && styles.modeBtnTextActive]}>
                Código
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.iconBtn} onPress={onSkip}>
            <Text style={[styles.skipText, { color: premiumAccent }]}>Omitir</Text>
          </TouchableOpacity>
        </View>

        {/* Viewfinder */}
        {state === 'idle' && (
          <View style={{ alignItems: 'center' }}>
            <View style={isPhotoMode ? styles.viewfinderPhoto : styles.viewfinderBarcode}>
              <View style={[styles.corner, styles.tl, { borderColor: premiumAccent }]} />
              <View style={[styles.corner, styles.tr, { borderColor: premiumAccent }]} />
              <View style={[styles.corner, styles.bl, { borderColor: premiumAccent }]} />
              <View style={[styles.corner, styles.br, { borderColor: premiumAccent }]} />
              {!isPhotoMode && <ScanLine color={premiumAccent} height={160} />}
            </View>
            <Text style={styles.viewfinderHint}>
              {isPhotoMode
                ? 'Centra la bolsa o paquete de café en el recuadro'
                : 'Alinea el código de barras dentro del recuadro'}
            </Text>
            {isPhotoMode && (
              <TouchableOpacity
                style={styles.barcodeShortcut}
                onPress={() => {
                  setMode('barcode');
                  handleReset();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="barcode-outline" size={18} color="rgba(255,255,255,0.85)" />
                <Text style={styles.barcodeShortcutText}>¿Tiene código de barras? Toca aquí</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* States */}
        {state === 'capturing' || state === 'recognizing' ? (
          <ScanRadar color={premiumAccent} />
        ) : null}

        {state === 'error' && (
          <View style={styles.stateBox}>
            <Ionicons name="alert-circle-outline" size={48} color="#f87171" />
            <Text style={styles.stateText}>{errorMsg}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={handleReset}>
              <Text style={[styles.retryText, { color: premiumAccent }]}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'offline' && (
          <View style={styles.stateBox}>
            <Ionicons name="cloud-offline-outline" size={48} color="#c8a97c" />
            <Text style={styles.stateText}>
              Sin conexión{'\n'}La identificación por foto necesita internet
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => {
                setMode('barcode');
                handleReset();
              }}
            >
              <Text style={[styles.retryText, { color: premiumAccent }]}>
                Usar código de barras
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retryBtn} onPress={onSkip}>
              <Text style={[styles.retryText, { color: '#999' }]}>Buscar manualmente</Text>
            </TouchableOpacity>
          </View>
        )}

        {state === 'results' && (
          <View style={styles.resultsSheet}>
            <Text style={styles.resultsTitle}>¿Es este tu café?</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {candidates.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.candidateRow}
                  onPress={() => {
                    confirmRecognition(lastExtracted, c.id);
                    onRecognized?.(c);
                  }}
                  activeOpacity={0.8}
                >
                  {c.officialPhoto ? (
                    <Image source={{ uri: c.officialPhoto }} style={styles.candidateImg} />
                  ) : (
                    <View style={[styles.candidateImg, styles.candidateImgPlaceholder]}>
                      <Text style={{ fontSize: 22 }}>☕</Text>
                    </View>
                  )}
                  <View style={styles.candidateInfo}>
                    <Text style={styles.candidateName} numberOfLines={1}>
                      {c.nombre}
                    </Text>
                    <Text style={styles.candidateMeta} numberOfLines={1}>
                      {[c.roaster, c.pais].filter(Boolean).join(' · ')}
                    </Text>
                    {c.proceso ? <Text style={styles.candidateTag}>{c.proceso}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#aaa" />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.notMineBtn} onPress={handleReset}>
              <Text style={styles.notMineText}>No es ninguno · Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom bar */}
        {state === 'idle' && (
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 12) + 24 }]}>
            <Text style={styles.hint}>
              {isPhotoMode
                ? 'Encuadra la parte frontal de la bolsa'
                : !isOnline
                  ? 'Modo offline · escanea códigos de tu colección'
                  : 'Apunta al código de barras del paquete'}
            </Text>

            {isPhotoMode && (
              <TouchableOpacity
                style={[styles.captureBtn, { borderColor: premiumAccent }]}
                onPress={handleCapture}
                activeOpacity={0.85}
              >
                <View style={[styles.captureBtnInner, { backgroundColor: premiumAccent }]} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const CORNER = 28;
const BORDER = 3;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 14, fontWeight: '700' },

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 3,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  modeBtnActive: { backgroundColor: '#fff' },
  modeBtnText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  modeBtnTextActive: { color: '#111' },

  viewfinderHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 40,
  },
  barcodeShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  barcodeShortcutText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
  },

  viewfinderPhoto: {
    width: 240,
    height: 320,
    alignSelf: 'center',
    position: 'relative',
  },
  viewfinderBarcode: {
    width: 260,
    height: 160,
    alignSelf: 'center',
    position: 'relative',
  },
  corner: { position: 'absolute', width: CORNER, height: CORNER },
  tl: { top: 0, left: 0, borderTopWidth: BORDER, borderLeftWidth: BORDER, borderTopLeftRadius: 4 },
  tr: {
    top: 0,
    right: 0,
    borderTopWidth: BORDER,
    borderRightWidth: BORDER,
    borderTopRightRadius: 4,
  },
  bl: {
    bottom: 0,
    left: 0,
    borderBottomWidth: BORDER,
    borderLeftWidth: BORDER,
    borderBottomLeftRadius: 4,
  },
  br: {
    bottom: 0,
    right: 0,
    borderBottomWidth: BORDER,
    borderRightWidth: BORDER,
    borderBottomRightRadius: 4,
  },

  stateBox: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 32,
  },
  stateText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryBtn: { marginTop: 4 },
  retryText: { fontSize: 14, fontWeight: '700' },

  resultsSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    maxHeight: '55%',
  },
  resultsTitle: { fontSize: 17, fontWeight: '800', color: '#111', marginBottom: 14 },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  candidateImg: { width: 52, height: 52, borderRadius: 8 },
  candidateImgPlaceholder: {
    backgroundColor: '#f5f0ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  candidateInfo: { flex: 1 },
  candidateName: { fontSize: 15, fontWeight: '700', color: '#111' },
  candidateMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  candidateTag: {
    fontSize: 11,
    color: '#8f5e3b',
    fontWeight: '600',
    marginTop: 3,
  },
  notMineBtn: { paddingTop: 14, alignItems: 'center' },
  notMineText: { fontSize: 13, color: '#999', fontWeight: '600' },

  bottomBar: {
    paddingBottom: 48,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingTop: 20,
    gap: 20,
  },
  hint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '500',
  },
  captureBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureBtnInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
});
