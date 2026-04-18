import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { useRef } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ScannerScreen({ onScanned, onSkip, onBack, premiumAccent }) {
  const scannedRef = useRef(false);

  const handleScan = (event) => {
    if (scannedRef.current) return;

    const raw = event?.data || '';
    const normalized = String(raw).replace(/\D/g, '');

    if (normalized.length < 8) return;

    scannedRef.current = true;

    onScanned?.({
      raw,
      ean: normalized,
      type: event?.type,
    });

    setTimeout(() => {
      scannedRef.current = false;
    }, 2000);
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <CameraView onBarcodeScanned={handleScan} style={StyleSheet.absoluteFillObject} />
      <View style={styles.overlay}>
        <View style={styles.top} />
        <View style={styles.middle}>
          <View style={styles.side} />
          <View style={styles.window}>
            <View style={[styles.corner, styles.tl, { borderColor: premiumAccent }]} />
            <View style={[styles.corner, styles.tr, { borderColor: premiumAccent }]} />
            <View style={[styles.corner, styles.bl, { borderColor: premiumAccent }]} />
            <View style={[styles.corner, styles.br, { borderColor: premiumAccent }]} />
            <View style={[styles.scanLine, { backgroundColor: premiumAccent }]} />
          </View>
          <View style={styles.side} />
        </View>
        <View style={styles.bottom}>
          <Text style={styles.hint}>Enfoca el paquete de café dentro del marco</Text>
          <TouchableOpacity style={styles.skipBtn} onPress={onSkip}>
            <Text style={styles.skipText}>Añadir sin escanear</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}>
        <Ionicons name="chevron-back" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const WINDOW_SIZE = 280;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1 },
  top: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  middle: { flexDirection: 'row', height: WINDOW_SIZE },
  side: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  window: { width: WINDOW_SIZE, height: WINDOW_SIZE },
  bottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    paddingTop: 24,
    gap: 20,
  },
  hint: { color: '#fff', fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
  corner: { position: 'absolute', width: 24, height: 24, borderWidth: 3 },
  tl: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  tr: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  bl: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  br: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  scanLine: { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, opacity: 0.8 },
  backBtn: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  skipText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
