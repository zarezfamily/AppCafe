import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { useCallback, useRef, useState } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const BARCODE_TYPES = ['ean13', 'ean8', 'upc_a', 'upc_e'];

export default function ScannerScreen({ onScanned, onSkip, onBack, premiumAccent = '#c8a97c' }) {
  const [active, setActive] = useState(true);
  const lockRef = useRef(false);

  const handleBarcodeScanned = useCallback(
    ({ data }) => {
      if (!active || lockRef.current) return;
      lockRef.current = true;
      setActive(false);
      onScanned?.({ ean: data });
    },
    [active, onScanned]
  );

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: BARCODE_TYPES }}
        onBarcodeScanned={active ? handleBarcodeScanned : undefined}
      />

      <View style={styles.overlay}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.label}>Escanear café</Text>
          <TouchableOpacity style={styles.iconBtn} onPress={onSkip}>
            <Text style={[styles.skipText, { color: premiumAccent }]}>Omitir</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.viewfinderWrap}>
          <View style={[styles.corner, styles.tl, { borderColor: premiumAccent }]} />
          <View style={[styles.corner, styles.tr, { borderColor: premiumAccent }]} />
          <View style={[styles.corner, styles.bl, { borderColor: premiumAccent }]} />
          <View style={[styles.corner, styles.br, { borderColor: premiumAccent }]} />
        </View>

        <View style={styles.hintWrap}>
          <Text style={styles.hint}>Apunta al código de barras del paquete</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const CORNER = 28;
const BORDER = 3;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  iconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  viewfinderWrap: {
    width: 260,
    height: 160,
    alignSelf: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
  },
  tl: {
    top: 0,
    left: 0,
    borderTopWidth: BORDER,
    borderLeftWidth: BORDER,
    borderTopLeftRadius: 4,
  },
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
  hintWrap: {
    paddingBottom: 48,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingTop: 20,
  },
  hint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '500',
  },
});
