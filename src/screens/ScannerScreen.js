import { Ionicons } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { useState } from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { PREMIUM_ACCENT, W } from '../constants/theme';

export default function ScannerScreen({ onScanned, onSkip, onBack }) {
  const [scanned, setScanned] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />
      <CameraView
        onBarcodeScanned={(r) => { if (!scanned) { setScanned(true); onScanned(r); } }}
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'qr', 'code128'] }}
      />
      <View style={styles.overlay}>
        <View style={styles.top} />
        <View style={styles.middle}>
          <View style={styles.side} />
          <View style={styles.window}>
            <View style={[styles.corner, styles.tl]} /><View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} /><View style={[styles.corner, styles.br]} />
            <View style={styles.scanLine} />
          </View>
          <View style={styles.side} />
        </View>
        <View style={styles.bottom}>
          <Text style={styles.hint}>Coloca la etiqueta del café dentro del marco</Text>
          <View style={styles.tabs}>
            <TouchableOpacity style={styles.tabActive}><Text style={styles.tabTextActive}>Etiqueta del café</Text></TouchableOpacity>
            <TouchableOpacity style={styles.tabInactive} onPress={onSkip}><Text style={styles.tabTextInactive}>Añadir manual</Text></TouchableOpacity>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.backBtn} onPress={onBack}><Ionicons name="close" size={28} color="#fff" /></TouchableOpacity>
      <TouchableOpacity style={styles.galleryBtn} onPress={onSkip}><Ionicons name="images-outline" size={26} color="#fff" /></TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay:         { flex: 1 },
  top:             { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  middle:          { flexDirection: 'row', height: W * 0.72 },
  side:            { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  window:          { width: W * 0.72, height: W * 0.72 },
  bottom:          { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: 24, gap: 20 },
  hint:            { color: '#fff', fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
  tabs:            { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 25, padding: 4 },
  tabActive:       { backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 20, paddingVertical: 10 },
  tabInactive:     { paddingHorizontal: 20, paddingVertical: 10 },
  tabTextActive:   { color: '#111', fontWeight: '700', fontSize: 14 },
  tabTextInactive: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  corner:          { position: 'absolute', width: 24, height: 24, borderColor: PREMIUM_ACCENT, borderWidth: 3 },
  tl:              { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  tr:              { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  bl:              { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  br:              { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  scanLine:        { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: PREMIUM_ACCENT, opacity: 0.8 },
  backBtn:         { position: 'absolute', top: 52, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  galleryBtn:      { position: 'absolute', bottom: 60, left: 40, width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
});
