import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAuthToken } from '../services/firebaseCore';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'];
const RECOGNIZE_URL = 'https://europe-west1-miappdecafe.cloudfunctions.net/recognizeCoffee';

async function recognizePhoto(base64) {
  const token = await getAuthToken();
  const res = await fetch(RECOGNIZE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ imageBase64: base64 }),
  });
  if (!res.ok) throw new Error(`HTTP_${res.status}`);
  return res.json();
}

export default function ScannerScreen({
  onScanned,
  onRecognized,
  onSkip,
  onBack,
  premiumAccent = '#c8a97c',
}) {
  const cameraRef = useRef(null);
  const barcodeLockRef = useRef(false);

  const [mode, setMode] = useState('photo');
  const [barcodeActive, setBarcodeActive] = useState(true);
  const [state, setState] = useState('idle'); // idle | capturing | recognizing | results | error
  const [candidates, setCandidates] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleBarcodeScanned = useCallback(
    ({ data }) => {
      if (!barcodeActive || barcodeLockRef.current) return;
      barcodeLockRef.current = true;
      setBarcodeActive(false);
      onScanned?.({ ean: data });
    },
    [barcodeActive, onScanned]
  );

  const handleCapture = useCallback(async () => {
    if (state !== 'idle' || !cameraRef.current) return;
    setState('capturing');
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: true,
        skipProcessing: true,
      });
      setState('recognizing');
      const result = await recognizePhoto(photo.base64);

      if (!result.isCoffee || !result.candidates?.length) {
        setErrorMsg(
          'No he podido identificar ningún café. Prueba con otra foto o busca manualmente.'
        );
        setState('error');
        return;
      }

      setCandidates(result.candidates);
      setState('results');
    } catch {
      setErrorMsg('Error al procesar la imagen. Vuelve a intentarlo.');
      setState('error');
    }
  }, [state]);

  const handleReset = () => {
    setState('idle');
    setCandidates([]);
    setErrorMsg('');
    barcodeLockRef.current = false;
    setBarcodeActive(true);
  };

  const isPhotoMode = mode === 'photo';

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
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
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
          <View style={isPhotoMode ? styles.viewfinderPhoto : styles.viewfinderBarcode}>
            <View style={[styles.corner, styles.tl, { borderColor: premiumAccent }]} />
            <View style={[styles.corner, styles.tr, { borderColor: premiumAccent }]} />
            <View style={[styles.corner, styles.bl, { borderColor: premiumAccent }]} />
            <View style={[styles.corner, styles.br, { borderColor: premiumAccent }]} />
          </View>
        )}

        {/* States */}
        {state === 'capturing' || state === 'recognizing' ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="large" color={premiumAccent} />
            <Text style={styles.stateText}>
              {state === 'capturing' ? 'Capturando...' : 'Identificando café...'}
            </Text>
          </View>
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

        {state === 'results' && (
          <View style={styles.resultsSheet}>
            <Text style={styles.resultsTitle}>¿Es este tu café?</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {candidates.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.candidateRow}
                  onPress={() => onRecognized?.(c)}
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
          <View style={styles.bottomBar}>
            <Text style={styles.hint}>
              {isPhotoMode
                ? 'Encuadra la parte frontal de la bolsa'
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
  modeBtn: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 16 },
  modeBtnActive: { backgroundColor: '#fff' },
  modeBtnText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)' },
  modeBtnTextActive: { color: '#111' },

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
