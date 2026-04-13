import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  H,
  PREMIUM_ACCENT,
  THEME,
} from '../constants/theme';
import CafeteriaCard from './cafeterias/CafeteriaCard';
import CafeteriaDetailModal from './cafeterias/CafeteriaDetailModal';
import useCafeteriasScreen, { RADIOS_DISPONIBLES } from './cafeterias/useCafeteriasScreen';

export default function CafeteriasScreen() {
  const {
    abrirMaps,
    cafeterias,
    cafeteriasVisibles,
    cargarCafeterias,
    cargando,
    error,
    radioKm,
    seleccionada,
    setRadioKm,
    setSeleccionada,
    soloAbiertas,
    setSoloAbiertas,
  } = useCafeteriasScreen();

  if (cargando) {
    return (
      <View style={styles.loadBox}>
        <Text style={styles.loadEmoji}>☕</Text>
        <ActivityIndicator color={PREMIUM_ACCENT} size="large" />
        <Text style={styles.loadTitle}>Buscando cafeterías</Text>
        <Text style={styles.loadSub}>Localizando las mejores cerca de ti...</Text>
      </View>
    );
  }

  if (error && cafeterias.length === 0) {
    return (
      <View style={styles.errorBox}>
        <Text style={{ fontSize: 48 }}>📍</Text>
        <Text style={styles.errorTitle}>Ups...</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => cargarCafeterias()}>
          <Text style={styles.primaryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CafeteriaDetailModal
        cafeteria={seleccionada}
        styles={styles}
        onClose={() => setSeleccionada(null)}
        abrirMaps={abrirMaps}
      />

      <View style={styles.headerBox}>
        <View>
          <Text style={styles.pageTitle}>Cafeterías ☕</Text>
          <Text style={styles.headerMeta}>
            {cafeteriasVisibles.length} cerca de ti · radio {radioKm} km · ordenadas por distancia
          </Text>
        </View>

        <TouchableOpacity onPress={() => cargarCafeterias(radioKm)} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={18} color={THEME.brand.accentDeep} />
        </TouchableOpacity>
      </View>

      <View style={styles.radiusRow}>
        {RADIOS_DISPONIBLES.map((km) => {
          const activo = radioKm === km;
          return (
            <TouchableOpacity
              key={String(km)}
              onPress={() => setRadioKm(km)}
              activeOpacity={0.85}
              style={[styles.radiusChip, activo && styles.radiusChipActive]}
            >
              <Text style={[styles.radiusChipText, activo && styles.radiusChipTextActive]}>Hasta {km} km</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          onPress={() => setSoloAbiertas((prev) => !prev)}
          activeOpacity={0.85}
          style={[styles.radiusChip, soloAbiertas && styles.radiusChipActive]}
        >
          <Text style={[styles.radiusChipText, soloAbiertas && styles.radiusChipTextActive]}>Solo abiertas</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={cafeteriasVisibles}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No hay cafeterías abiertas en este radio</Text>
            <Text style={styles.emptySub}>Prueba ampliar el radio o desactivar el filtro.</Text>
          </View>
        )}
        renderItem={({ item, index }) => (
          <CafeteriaCard item={item} index={index} styles={styles} onPress={setSeleccionada} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  loadBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 60 },
  loadEmoji: { fontSize: 48 },
  loadTitle: { fontSize: 20, fontWeight: '700', color: '#111' },
  loadSub: { fontSize: 14, color: THEME.text.secondary, textAlign: 'center' },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  errorTitle: { fontSize: 22, fontWeight: '700', color: '#111' },
  errorText: { fontSize: 15, color: THEME.text.secondary, textAlign: 'center', lineHeight: 22 },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 12 },
  headerMeta: { fontSize: 13, color: THEME.text.secondary },
  headerBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.brand.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  radiusChip: {
    borderWidth: 1,
    borderColor: THEME.brand.borderSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  radiusChipActive: { backgroundColor: THEME.brand.accentDeep, borderColor: THEME.brand.accentDeep },
  radiusChipText: { fontSize: 12, fontWeight: '700', color: THEME.text.secondary },
  radiusChipTextActive: { color: '#fff' },
  emptyBox: {
    marginHorizontal: 16,
    marginTop: 18,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: THEME.brand.borderSoft,
    borderRadius: 14,
    padding: 14,
  },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: '#1f140f' },
  emptySub: { fontSize: 12, color: THEME.text.secondary, marginTop: 4 },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardImgWrap: { position: 'relative', height: 140 },
  cardImg: { width: '100%', height: '100%' },
  cardNum: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardNumText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cardEstado: { position: 'absolute', top: 10, right: 10, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  cardEstadoText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  cardInfo: { padding: 12, gap: 4 },
  cardNombre: { fontSize: 17, fontWeight: '800', color: '#111' },
  cardTipo: { fontSize: 12, color: PREMIUM_ACCENT, fontWeight: '600', marginBottom: 2 },
  cardRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardRatingNum: { fontSize: 13, fontWeight: '700', color: '#333', marginLeft: 4 },
  cardReseñas: { fontSize: 12, color: THEME.text.muted },
  cardTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  cardTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  cardTagText: { fontSize: 11, color: '#555' },
  cardEspec: { fontSize: 12, color: THEME.text.secondary, marginTop: 4, fontStyle: 'italic' },
  detailScreen: { flex: 1, backgroundColor: '#fff' },
  detHero: { height: H * 0.38, position: 'relative' },
  detHeroGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, backgroundColor: 'rgba(0,0,0,0.55)' },
  detPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a0a00',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detPlaceholderEmoji: { fontSize: 72, opacity: 0.4 },
  cardPlaceholder: { width: '100%', height: '100%', backgroundColor: '#1a0a00', alignItems: 'center', justifyContent: 'center', padding: 12 },
  cardPlaceholderEmoji: { fontSize: 32, opacity: 0.5, marginBottom: 6 },
  cardPlaceholderNombre: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 18 },
  detBack: {
    position: 'absolute',
    top: 52,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detNavBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.brand.accentDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEstado: { position: 'absolute', top: 52, left: 70, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  badgeEstadoText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  detOverlay: { position: 'absolute', bottom: 16, left: 16, right: 16 },
  detNombre: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 2 },
  detTipo: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginBottom: 6 },
  detRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detRatingNum: { fontSize: 15, fontWeight: '700', color: THEME.status.favorite, marginLeft: 4 },
  detReseñas: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  detBody: { padding: 20 },
  detInfoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20, backgroundColor: '#f9f9f9', borderRadius: 14, padding: 14 },
  detInfoItem: { alignItems: 'center', gap: 4, minWidth: 56 },
  detInfoLabel: { fontSize: 11, color: '#555', fontWeight: '600' },
  seccion: { marginBottom: 20 },
  secTitulo: { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 8 },
  secTexto: { fontSize: 14, color: '#555', lineHeight: 22 },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  contactText: { fontSize: 14, color: THEME.brand.accentDeep, fontWeight: '500' },
  primaryButton: {
    backgroundColor: THEME.brand.primary,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.brand.primaryBorder,
    shadowColor: THEME.brand.primary,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  primaryButtonText: {
    color: THEME.brand.onPrimary,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
