import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { queryCollection, updateDocument } from '../services/firestoreService';

const FILTERS = {
  ALL: 'all',
  INCOMPLETE: 'incomplete',
  READY: 'ready',
  WITH_IMAGE: 'with_image',
  WITHOUT_IMAGE: 'without_image',
};

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function isCafeIncomplete(cafe) {
  if (!cafe) return true;
  return !(
    String(cafe.ean || '').trim() &&
    String(cafe.nombre || cafe.name || '').trim() &&
    String(cafe.marca || cafe.roaster || '').trim() &&
    String(cafe.foto || cafe.imageUrl || '').trim()
  );
}

function canBeApproved(cafe) {
  return !isCafeIncomplete(cafe);
}

function matchesSearch(cafe, term) {
  if (!term) return true;
  const q = normalizeText(term);
  const haystack = [
    cafe.nombre,
    cafe.name,
    cafe.ean,
    cafe.marca,
    cafe.roaster,
    cafe.origen,
    cafe.origin,
  ]
    .map(normalizeText)
    .join(' ');
  return haystack.includes(q);
}

function getCafePriority(cafe) {
  const incomplete = isCafeIncomplete(cafe);
  const hasImage = Boolean(String(cafe.foto || cafe.imageUrl || '').trim());
  const ready = canBeApproved(cafe);
  if (incomplete && !hasImage) return 1;
  if (incomplete && hasImage) return 2;
  if (ready) return 3;
  return 4;
}

function sortCafes(items) {
  return [...items].sort((a, b) => {
    const pa = getCafePriority(a);
    const pb = getCafePriority(b);
    if (pa !== pb) return pa - pb;
    const aU = String(a.updatedAt || '');
    const bU = String(b.updatedAt || '');
    return bU.localeCompare(aU);
  });
}

function getStatusBadge(cafe) {
  const status = String(cafe.reviewStatus || cafe.status || '');
  if (status === 'approved') return { label: 'Aprobado', kind: 'success' };
  if (status === 'rejected') return { label: 'Rechazado', kind: 'danger' };
  if (canBeApproved(cafe)) return { label: 'Listo para aprobar', kind: 'successSoft' };
  return { label: 'Incompleto', kind: 'warning' };
}

function FilterChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoPill({ label, value }) {
  return (
    <View style={styles.infoPill}>
      <Text style={styles.infoPillLabel}>{label}</Text>
      <Text style={styles.infoPillValue}>{value}</Text>
    </View>
  );
}

function Badge({ label, kind }) {
  return (
    <View
      style={[
        styles.badge,
        kind === 'warning' && styles.badgeWarning,
        kind === 'success' && styles.badgeSuccess,
        kind === 'danger' && styles.badgeDanger,
        kind === 'successSoft' && styles.badgeSuccessSoft,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          kind === 'warning' && styles.badgeTextWarning,
          kind === 'success' && styles.badgeTextSuccess,
          kind === 'danger' && styles.badgeTextDanger,
          kind === 'successSoft' && styles.badgeTextSuccessSoft,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function FieldRow({ label, value }) {
  return (
    <Text style={styles.cardLine}>
      <Text style={styles.cardLineLabel}>{label}: </Text>
      {value || '-'}
    </Text>
  );
}

function PendingCafeCard({ item, onApprove, onReject, busy }) {
  const allowApprove = canBeApproved(item);
  const incomplete = isCafeIncomplete(item);
  const nombre = item.nombre || item.name || 'Sin nombre';
  const marca = item.marca || item.roaster || '';
  const origen = item.origen || item.origin || '';
  const foto = item.foto || item.imageUrl || '';
  const badge = getStatusBadge(item);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {nombre}
          </Text>
          <View style={styles.badgeRow}>
            <Badge label={badge.label} kind={badge.kind} />
            {item.aiStatus === 'auto_approved' ? (
              <Badge label="Auto-IA" kind="successSoft" />
            ) : null}
            {!foto ? <Badge label="Sin imagen" kind="danger" /> : null}
          </View>
        </View>
        <View style={styles.thumbnailWrap}>
          {foto ? (
            <Image source={{ uri: foto }} style={styles.thumbnail} />
          ) : (
            <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
              <Text style={styles.thumbnailPlaceholderText}>No img</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.cardBody}>
        <FieldRow label="EAN" value={item.ean} />
        <FieldRow label="Marca" value={marca} />
        <FieldRow label="Origen" value={origen} />
        {!!item.aiConfidenceScore && (
          <FieldRow label="Confianza IA" value={`${Math.round(item.aiConfidenceScore * 100)}%`} />
        )}
      </View>

      {incomplete ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>Faltan datos para aprobar.</Text>
          <Text style={styles.warningSubtext}>Revisa nombre, marca e imagen.</Text>
        </View>
      ) : (
        <View style={styles.readyBox}>
          <Text style={styles.readyText}>Lista para validación.</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.actionBtn,
            styles.approveBtn,
            (!allowApprove || busy) && styles.actionBtnDisabled,
          ]}
          onPress={() => onApprove(item)}
          disabled={!allowApprove || busy}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnText}>Aprobar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn, busy && styles.actionBtnDisabled]}
          onPress={() => onReject(item)}
          disabled={busy}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnTextDark}>Rechazar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AdminPanelScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [pendingCafes, setPendingCafes] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState(FILTERS.ALL);

  const loadCafes = useCallback(async () => {
    try {
      const rows = await queryCollection('cafes', 'reviewStatus', 'pending');
      setPendingCafes(rows || []);
    } catch (error) {
      console.error('Error cargando pendientes:', error);
      Alert.alert('Error', 'No se pudieron cargar los cafés pendientes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCafes();
  }, [loadCafes]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCafes();
  }, [loadCafes]);

  const handleApprove = useCallback(async (item) => {
    try {
      setBusyId(item.id);
      await updateDocument('cafes', item.id, {
        reviewStatus: 'approved',
        appVisible: true,
        scannerVisible: true,
        updatedAt: new Date().toISOString(),
      });
      setPendingCafes((prev) => prev.filter((c) => c.id !== item.id));
      Alert.alert('OK', 'Café aprobado');
    } catch (error) {
      Alert.alert('Error', error?.message || 'No se pudo aprobar');
    } finally {
      setBusyId(null);
    }
  }, []);

  const handleReject = useCallback(async (item) => {
    try {
      setBusyId(item.id);
      await updateDocument('cafes', item.id, {
        reviewStatus: 'rejected',
        appVisible: false,
        scannerVisible: false,
        updatedAt: new Date().toISOString(),
      });
      setPendingCafes((prev) => prev.filter((c) => c.id !== item.id));
      Alert.alert('OK', 'Café rechazado');
    } catch (error) {
      Alert.alert('Error', error?.message || 'No se pudo rechazar');
    } finally {
      setBusyId(null);
    }
  }, []);

  const stats = useMemo(() => {
    const total = pendingCafes.length;
    const incomplete = pendingCafes.filter(isCafeIncomplete).length;
    const ready = pendingCafes.filter(canBeApproved).length;
    const withImage = pendingCafes.filter((c) =>
      Boolean(String(c.foto || c.imageUrl || '').trim())
    ).length;
    return { total, incomplete, ready, withImage };
  }, [pendingCafes]);

  const filteredCafes = useMemo(() => {
    let rows = pendingCafes.filter((cafe) => matchesSearch(cafe, searchText));
    switch (activeFilter) {
      case FILTERS.INCOMPLETE:
        rows = rows.filter(isCafeIncomplete);
        break;
      case FILTERS.READY:
        rows = rows.filter(canBeApproved);
        break;
      case FILTERS.WITH_IMAGE:
        rows = rows.filter((c) => Boolean(String(c.foto || c.imageUrl || '').trim()));
        break;
      case FILTERS.WITHOUT_IMAGE:
        rows = rows.filter((c) => !String(c.foto || c.imageUrl || '').trim());
        break;
      default:
        break;
    }
    return sortCafes(rows);
  }, [pendingCafes, searchText, activeFilter]);

  const renderItem = ({ item }) => (
    <PendingCafeCard
      item={item}
      onApprove={handleApprove}
      onReject={handleReject}
      busy={busyId === item.id}
    />
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Cargando panel…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin · Validación de cafés</Text>
      <Text style={styles.subtitle}>Gestiona cafés pendientes y valida más rápido.</Text>

      <View style={styles.searchBox}>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Buscar por nombre, EAN o marca"
          style={styles.searchInput}
          autoCapitalize="none"
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        <FilterChip
          label="Todos"
          active={activeFilter === FILTERS.ALL}
          onPress={() => setActiveFilter(FILTERS.ALL)}
        />
        <FilterChip
          label="Incompletos"
          active={activeFilter === FILTERS.INCOMPLETE}
          onPress={() => setActiveFilter(FILTERS.INCOMPLETE)}
        />
        <FilterChip
          label="Listos"
          active={activeFilter === FILTERS.READY}
          onPress={() => setActiveFilter(FILTERS.READY)}
        />
        <FilterChip
          label="Con imagen"
          active={activeFilter === FILTERS.WITH_IMAGE}
          onPress={() => setActiveFilter(FILTERS.WITH_IMAGE)}
        />
        <FilterChip
          label="Sin imagen"
          active={activeFilter === FILTERS.WITHOUT_IMAGE}
          onPress={() => setActiveFilter(FILTERS.WITHOUT_IMAGE)}
        />
      </ScrollView>

      <View style={styles.statsRow}>
        <InfoPill label="Pendientes" value={stats.total} />
        <InfoPill label="Incompletos" value={stats.incomplete} />
        <InfoPill label="Listos" value={stats.ready} />
        <InfoPill label="Con imagen" value={stats.withImage} />
      </View>

      <Text style={styles.resultsText}>
        Mostrando {filteredCafes.length} resultado{filteredCafes.length === 1 ? '' : 's'}
      </Text>

      <FlatList
        data={filteredCafes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          filteredCafes.length === 0 ? styles.emptyContainer : styles.listContainer
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No hay resultados</Text>
            <Text style={styles.emptyText}>Prueba a cambiar el filtro o la búsqueda.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', paddingHorizontal: 16, paddingTop: 16 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FAFAFA',
  },
  loadingText: { marginTop: 10, fontSize: 14, color: '#555' },
  title: { fontSize: 24, fontWeight: '800', color: '#111' },
  subtitle: { marginTop: 6, marginBottom: 14, color: '#666', fontSize: 14 },
  searchBox: { marginBottom: 12 },
  searchInput: {
    height: 46,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111',
  },
  filtersRow: { paddingBottom: 8, gap: 8 },
  filterChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: '#111827' },
  filterChipText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  filterChipTextActive: { color: '#FFF' },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, marginBottom: 10 },
  infoPill: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 96,
  },
  infoPillLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  infoPillValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  resultsText: { fontSize: 13, color: '#6B7280', marginBottom: 10 },
  listContainer: { paddingBottom: 30 },
  emptyContainer: { flexGrow: 1, justifyContent: 'center', paddingBottom: 50 },
  emptyState: { alignItems: 'center', paddingHorizontal: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 6 },
  emptyText: { textAlign: 'center', color: '#666', fontSize: 14 },
  card: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 6,
    marginBottom: 6,
  },
  badgeWarning: { backgroundColor: '#FEF3C7' },
  badgeSuccess: { backgroundColor: '#DCFCE7' },
  badgeDanger: { backgroundColor: '#FEE2E2' },
  badgeSuccessSoft: { backgroundColor: '#E0F2FE' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextWarning: { color: '#92400E' },
  badgeTextSuccess: { color: '#166534' },
  badgeTextDanger: { color: '#991B1B' },
  badgeTextSuccessSoft: { color: '#075985' },
  thumbnailWrap: { width: 82, height: 82 },
  thumbnail: { width: 82, height: 82, borderRadius: 14, backgroundColor: '#EEE' },
  thumbnailPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbnailPlaceholderText: { color: '#888', fontWeight: '700', fontSize: 12 },
  cardBody: { marginTop: 12 },
  cardLine: { fontSize: 14, color: '#374151', marginBottom: 5 },
  cardLineLabel: { fontWeight: '700', color: '#111827' },
  warningBox: { marginTop: 12, backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12 },
  warningText: { color: '#9A3412', fontWeight: '700', marginBottom: 4 },
  warningSubtext: { color: '#C2410C', fontSize: 13 },
  readyBox: { marginTop: 12, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12 },
  readyText: { color: '#166534', fontWeight: '700' },
  actions: { flexDirection: 'row', marginTop: 14, gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  approveBtn: { backgroundColor: '#166534' },
  rejectBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  actionBtnTextDark: { color: '#991B1B', fontWeight: '700', fontSize: 14 },
});
