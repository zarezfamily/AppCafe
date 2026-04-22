import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getAuthToken } from '../services/firebaseCore';
import { buildScaPayload } from '../services/cafeService';
import { getCollection, updateDocument } from '../services/firestoreService';
import { uploadImageToStorage } from '../services/storageService';

const FILTERS = {
  ALL: 'all',
  WITHOUT_IMAGE: 'without_image',
  WITHOUT_PRICE: 'without_price',
  WITHOUT_NOTAS: 'without_notas',
  WITHOUT_EAN: 'without_ean',
  INCOMPLETE: 'incomplete',
  READY: 'ready',
};

const ADMIN_ENRICH_URL =
  'https://europe-west1-miappdecafe.cloudfunctions.net/adminEnrichCoffeeDraft';

async function resizeForApp(uri) {
  const manipulated = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 800 } }], {
    compress: 0.88,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return manipulated.uri;
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function getUserPhoto(cafe) {
  return String(cafe?.foto || cafe?.imageUrl || '').trim();
}

function getBestPhoto(cafe) {
  return String(
    cafe?.bestPhoto || cafe?.officialPhoto || cafe?.foto || cafe?.imageUrl || ''
  ).trim();
}

function parsePrice(value) {
  const raw = String(value || '')
    .replace(',', '.')
    .trim();

  if (!raw) return null;

  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0) return null;

  return Number(num.toFixed(2));
}

function isPriceInputInvalid(value) {
  const raw = String(value || '').trim();
  if (!raw) return false;
  return parsePrice(raw) === null;
}

function isCafeIncomplete(cafe) {
  if (!cafe) return true;
  return !(
    String(cafe.ean || '').trim() &&
    String(cafe.nombre || cafe.name || '').trim() &&
    String(cafe.marca || cafe.roaster || '').trim() &&
    getBestPhoto(cafe)
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
    cafe.variedad,
    cafe.proceso,
    cafe.notas,
    cafe.finca,
    cafe.coffeeCategory,
    cafe.isBio ? 'bio' : '',
    cafe.certificaciones,
  ]
    .map(normalizeText)
    .join(' ');
  return haystack.includes(q);
}

function getCafePriority(cafe) {
  const incomplete = isCafeIncomplete(cafe);
  const hasImage = Boolean(getBestPhoto(cafe));
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

function getCategoryLabel(value) {
  return value === 'daily' ? 'Café diario' : 'Especialidad';
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
        kind === 'dark' && styles.badgeDark,
        kind === 'bio' && styles.badgeBio,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          kind === 'warning' && styles.badgeTextWarning,
          kind === 'success' && styles.badgeTextSuccess,
          kind === 'danger' && styles.badgeTextDanger,
          kind === 'successSoft' && styles.badgeTextSuccessSoft,
          kind === 'dark' && styles.badgeTextDark,
          kind === 'bio' && styles.badgeTextBio,
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

function ReviewCheckPill({ label, ok }) {
  return (
    <View style={[styles.reviewCheckPill, ok && styles.reviewCheckPillOk]}>
      <Text style={[styles.reviewCheckPillText, ok && styles.reviewCheckPillTextOk]}>
        {ok ? 'OK' : 'Falta'} · {label}
      </Text>
    </View>
  );
}

function PendingCafeCard({ item, onApprove, onReject, onEdit, busy }) {
  const allowApprove = canBeApproved(item);
  const incomplete = isCafeIncomplete(item);
  const nombre = item.nombre || item.name || 'Sin nombre';
  const marca = item.marca || item.roaster || '';
  const origen = item.origen || item.origin || '';
  const foto = getBestPhoto(item);
  const badge = getStatusBadge(item);
  const coffeeCategory = item.coffeeCategory || 'specialty';
  const missingName = !String(nombre || '').trim() || nombre === 'Sin nombre';
  const missingBrand = !String(marca || '').trim();
  const missingEan = !String(item.ean || item.barcode || '').trim();
  const missingPrice = !item.precio;
  const cardToneStyle = allowApprove
    ? styles.cardReady
    : !foto
      ? styles.cardUrgent
      : styles.cardNeedsWork;
  const priorityLabel = allowApprove ? 'Lista para publicar' : !foto ? 'Urgente' : 'En revision';
  const priorityStyle = allowApprove
    ? styles.priorityPillReady
    : !foto
      ? styles.priorityPillUrgent
      : styles.priorityPillReview;
  const priorityTextStyle = allowApprove
    ? styles.priorityPillTextReady
    : !foto
      ? styles.priorityPillTextUrgent
      : styles.priorityPillTextReview;

  return (
    <View style={[styles.card, cardToneStyle]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, paddingRight: 12 }}>
          <View style={styles.cardPriorityRow}>
            <View style={[styles.priorityPill, priorityStyle]}>
              <Text style={[styles.priorityPillText, priorityTextStyle]}>{priorityLabel}</Text>
            </View>
          </View>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {nombre}
          </Text>
          {!!marca && <Text style={styles.cardBrand}>{marca}</Text>}
          <View style={styles.badgeRow}>
            <Badge label={badge.label} kind={badge.kind} />
            <Badge label={getCategoryLabel(coffeeCategory)} kind="dark" />
            {item.isBio === true ? <Badge label="BIO" kind="bio" /> : null}
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

      <View style={styles.reviewChecksRow}>
        <ReviewCheckPill label="EAN" ok={!missingEan} />
        <ReviewCheckPill label="Nombre" ok={!missingName} />
        <ReviewCheckPill label="Marca" ok={!missingBrand} />
        <ReviewCheckPill label="Foto" ok={!!foto} />
        <ReviewCheckPill label="Precio" ok={!missingPrice} />
      </View>

      <View style={styles.cardBody}>
        <FieldRow label="EAN" value={item.ean} />
        <FieldRow label="Origen" value={origen} />
        <FieldRow label="Tipo" value={getCategoryLabel(coffeeCategory)} />
        <FieldRow label="BIO" value={item.isBio ? 'Sí' : 'No'} />
        {!!item.precio && <FieldRow label="Precio" value={`${item.precio} €`} />}
        {!!item.aiConfidenceScore && (
          <FieldRow label="Confianza IA" value={`${Math.round(item.aiConfidenceScore * 100)}%`} />
        )}
      </View>

      {incomplete ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>Faltan datos para aprobar.</Text>
          <Text style={styles.warningSubtext}>Revisa nombre, marca y foto final.</Text>
        </View>
      ) : (
        <View style={styles.readyBox}>
          <Text style={styles.readyText}>Lista para validación.</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.editBtn, busy && styles.actionBtnDisabled]}
          onPress={() => onEdit(item)}
          disabled={busy}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnText}>Editar ficha</Text>
        </TouchableOpacity>

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

function EditorField({ label, value, onChangeText, placeholder, multiline = false, keyboardType }) {
  return (
    <View style={styles.editorField}>
      <Text style={styles.editorLabel}>{label}</Text>
      <TextInput
        value={String(value ?? '')}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={[styles.editorInput, multiline && styles.editorInputMultiline]}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        keyboardType={keyboardType}
      />
    </View>
  );
}

function AdminSectionCard({ title, subtitle = '', children, tone = 'default' }) {
  return (
    <View
      style={[
        styles.adminSectionCard,
        tone === 'accent' && styles.adminSectionCardAccent,
        tone === 'success' && styles.adminSectionCardSuccess,
      ]}
    >
      <Text style={styles.adminSectionTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.adminSectionSubtitle}>{subtitle}</Text>}
      <View style={styles.adminSectionBody}>{children}</View>
    </View>
  );
}

function EditorStat({ label, value, tone = 'default' }) {
  return (
    <View style={[styles.editorStatCard, tone === 'success' && styles.editorStatCardSuccess]}>
      <Text style={styles.editorStatLabel}>{label}</Text>
      <Text style={[styles.editorStatValue, tone === 'success' && styles.editorStatValueSuccess]}>
        {value}
      </Text>
    </View>
  );
}

function CollapsibleAdminSection({ title, subtitle = '', open, onToggle, children }) {
  return (
    <View style={styles.collapsibleWrap}>
      <TouchableOpacity activeOpacity={0.88} onPress={onToggle} style={styles.collapsibleHeader}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.collapsibleTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.collapsibleSubtitle}>{subtitle}</Text>}
        </View>
        <View style={styles.collapsibleIconWrap}>
          <Text style={styles.collapsibleIcon}>{open ? '−' : '+'}</Text>
        </View>
      </TouchableOpacity>
      {open ? <View style={styles.collapsibleBody}>{children}</View> : null}
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

  const [editingCafe, setEditingCafe] = useState(null);
  const [editData, setEditData] = useState(null);
  const [uploadingOfficialPhoto, setUploadingOfficialPhoto] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [searchingProposal, setSearchingProposal] = useState(false);
  const [editorSections, setEditorSections] = useState({
    photos: true,
    classification: true,
    ai: false,
    details: true,
  });

  const loadCafes = useCallback(async () => {
    try {
      const rows = await getCollection('cafes', 'updatedAt', 1500);
      setPendingCafes((rows || []).filter((c) => !c.legacy));
    } catch (error) {
      console.error('Error cargando cafés:', error);
      Alert.alert('Error', 'No se pudieron cargar los cafés');
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

  const openEditor = useCallback((cafe) => {
    setEditingCafe(cafe);
    setProposal(null);
    setEditorSections({
      photos: true,
      classification: true,
      ai: false,
      details: true,
    });
    setEditData({
      ean: cafe.ean || cafe.barcode || '',
      nombre: cafe.nombre || cafe.name || '',
      marca: cafe.marca || cafe.roaster || '',
      origen: cafe.origen || cafe.origin || '',
      notas: cafe.notas || '',
      officialPhoto: cafe.officialPhoto || '',
      bestPhotoMode: cafe.photoSources?.selectedBy || (cafe.officialPhoto ? 'official' : 'user'),
      variedad: cafe.variedad || '',
      proceso: cafe.proceso || '',
      altura: cafe.altura !== undefined && cafe.altura !== null ? String(cafe.altura) : '',
      tueste: cafe.tueste || '',
      preparacion: cafe.preparacion || '',
      certificaciones: cafe.certificaciones || '',
      precio: cafe.precio !== undefined && cafe.precio !== null ? String(cafe.precio) : '',
      scaScoreOfficial:
        cafe?.sca && typeof cafe.sca === 'object'
          ? cafe.sca.score !== undefined && cafe.sca.score !== null
            ? String(cafe.sca.score)
            : ''
          : cafe.sca !== undefined && cafe.sca !== null
            ? String(cafe.sca)
            : '',
      formato: cafe.formato || '',
      finca: cafe.finca || '',
      adminNotes: cafe.adminNotes || '',
      coffeeCategory: cafe.coffeeCategory || 'specialty',
      isBio: cafe.isBio === true,
    });
  }, []);

  const closeEditor = useCallback(() => {
    setEditingCafe(null);
    setEditData(null);
    setProposal(null);
    setUploadingOfficialPhoto(false);
    setSearchingProposal(false);
  }, []);

  const handlePickOfficialPhoto = useCallback(() => {
    Alert.alert('Subir foto', 'Elige la fuente', [
      {
        text: 'Cámara',
        onPress: async () => {
          try {
            const perm = await ImagePicker.requestCameraPermissionsAsync();
            if (perm.status !== 'granted') {
              Alert.alert('Permiso denegado', 'Necesitas permitir acceso a la cámara.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 1,
            });
            if (result.canceled || !result.assets?.length) return;
            setUploadingOfficialPhoto(true);
            const resizedUri = await resizeForApp(result.assets[0].uri);
            const uploadedUrl = await uploadImageToStorage(resizedUri, 'cafes');
            setEditData((prev) => ({
              ...prev,
              officialPhoto: uploadedUrl,
              bestPhotoMode: 'official',
            }));
          } catch (error) {
            Alert.alert('Error', error?.message || 'No se pudo subir la foto');
          } finally {
            setUploadingOfficialPhoto(false);
          }
        },
      },
      {
        text: 'Galería',
        onPress: async () => {
          try {
            const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (perm.status !== 'granted') {
              Alert.alert('Permiso denegado', 'Necesitas permitir acceso a fotos.');
              return;
            }
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ['images'],
              allowsEditing: true,
              quality: 1,
            });
            if (result.canceled || !result.assets?.length) return;
            setUploadingOfficialPhoto(true);
            const resizedUri = await resizeForApp(result.assets[0].uri);
            const uploadedUrl = await uploadImageToStorage(resizedUri, 'cafes');
            setEditData((prev) => ({
              ...prev,
              officialPhoto: uploadedUrl,
              bestPhotoMode: 'official',
            }));
          } catch (error) {
            Alert.alert('Error', error?.message || 'No se pudo subir la foto');
          } finally {
            setUploadingOfficialPhoto(false);
          }
        },
      },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  }, []);

  const handleOpenOfficialPhoto = useCallback(async () => {
    const url = String(editData?.officialPhoto || '').trim();
    if (!url) {
      Alert.alert('Sin URL', 'Añade primero una foto oficial.');
      return;
    }

    const supported = await Linking.canOpenURL(url).catch(() => false);
    if (!supported) {
      Alert.alert('Error', 'No se pudo abrir la URL.');
      return;
    }

    Linking.openURL(url);
  }, [editData]);

  const handleCopyAiSuggestion = useCallback(() => {
    const ai = editingCafe?.aiSuggestion || null;
    const p = proposal || null;

    if (!ai && !p) {
      Alert.alert(
        'Sin sugerencia',
        'Este café no tiene sugerencia IA disponible. Usa "Buscar datos y foto" primero.'
      );
      return;
    }

    const source = ai || {
      nombre: p?.suggestedNombre,
      marca: p?.suggestedMarca,
      origen: p?.suggestedOrigen,
      notas: p?.suggestedNotas,
      officialPhoto: p?.suggestedOfficialPhoto,
      certificaciones: p?.suggestedCertificaciones,
      isBio: p?.isBio,
      isSpecialty: p?.isSpecialty,
    };

    setEditData((prev) => ({
      ...prev,
      nombre: prev.nombre || source.nombre || '',
      marca: prev.marca || source.marca || '',
      origen: prev.origen || source.origen || '',
      notas: prev.notas || source.notas || '',
      officialPhoto: prev.officialPhoto || source.officialPhoto || '',
      bestPhotoMode:
        prev.bestPhotoMode === 'official' || source.officialPhoto ? 'official' : prev.bestPhotoMode,
      coffeeCategory:
        prev.coffeeCategory ||
        (typeof source.isSpecialty === 'boolean'
          ? source.isSpecialty
            ? 'specialty'
            : 'daily'
          : 'specialty'),
      isBio:
        prev.isBio === true ||
        source.isBio === true ||
        String(source.certificaciones || '')
          .toLowerCase()
          .includes('bio'),
    }));
  }, [editingCafe, proposal]);

  const handleSearchProposal = useCallback(async () => {
    try {
      if (!editingCafe) return;

      const token = getAuthToken();
      if (!token) {
        Alert.alert('Sesión', 'No hay sesión activa.');
        return;
      }

      setSearchingProposal(true);
      setProposal(null);

      const res = await fetch(ADMIN_ENRICH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ean: editingCafe.ean || '',
          nombre: editData?.nombre || editingCafe.nombre || '',
          marca: editData?.marca || editingCafe.marca || '',
          foto: getUserPhoto(editingCafe),
        }),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'No se pudo generar propuesta');
      }

      setProposal(json.proposal || null);
    } catch (error) {
      Alert.alert('Error', error?.message || 'No se pudo buscar propuesta');
    } finally {
      setSearchingProposal(false);
    }
  }, [editData, editingCafe]);

  const handleApplyProposal = useCallback(() => {
    if (!proposal) return;

    setEditData((prev) => ({
      ...prev,
      nombre: proposal.suggestedNombre || prev.nombre || '',
      marca: proposal.suggestedMarca || prev.marca || '',
      origen: proposal.suggestedOrigen || prev.origen || '',
      notas: proposal.suggestedNotas || prev.notas || '',
      formato: proposal.suggestedFormato || prev.formato || '',
      officialPhoto: prev.officialPhoto || proposal.suggestedOfficialPhoto || '',
      bestPhotoMode:
        prev.officialPhoto || proposal.suggestedOfficialPhoto ? 'official' : prev.bestPhotoMode,
      isBio:
        proposal.isBio === true ||
        String(proposal.suggestedCertificaciones || '')
          .toLowerCase()
          .includes('bio') ||
        prev.isBio === true,
    }));
  }, [proposal]);

  const handleApprove = useCallback(async (item) => {
    try {
      setBusyId(item.id);
      await updateDocument('cafes', item.id, {
        status: 'approved',
        completionStatus: 'complete',
        provisional: false,
        reviewStatus: 'approved',
        appVisible: true,
        scannerVisible: true,
        approvedAt: new Date().toISOString(),
        adminReviewedAt: new Date().toISOString(),
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
        status: 'rejected',
        provisional: false,
        reviewStatus: 'rejected',
        appVisible: false,
        scannerVisible: false,
        adminReviewedAt: new Date().toISOString(),
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

  const getScaPreviewPayload = useCallback((data) => {
    if (!data) return null;

    return buildScaPayload({
      nombre: String(data.nombre || '').trim(),
      name: String(data.nombre || '').trim(),
      marca: String(data.marca || '').trim(),
      roaster: String(data.marca || '').trim(),
      origen: String(data.origen || '').trim(),
      origin: String(data.origen || '').trim(),
      pais: String(data.origen || '').trim(),
      notas: String(data.notas || '').trim(),
      notes: String(data.notas || '').trim(),
      variedad: String(data.variedad || '').trim(),
      proceso: String(data.proceso || '').trim(),
      altura: data.altura ? Number(data.altura) : null,
      tueste: String(data.tueste || '').trim(),
      formato: String(data.formato || '').trim(),
      coffeeCategory: data.coffeeCategory || 'specialty',
      scaScoreOfficial: data.scaScoreOfficial ? Number(data.scaScoreOfficial) : null,
      isBio: data.isBio === true,
    });
  }, []);

  const buildEditedPayload = useCallback(
    (approveNow = false) => {
      if (!editingCafe || !editData) return null;

      const rawPrice = String(editData.precio || '').trim();
      if (rawPrice && isPriceInputInvalid(rawPrice)) {
        Alert.alert('Precio inválido', 'Introduce un precio válido mayor que 0. Ejemplo: 12.90');
        return null;
      }

      const userPhoto = getUserPhoto(editingCafe);
      const officialPhoto = String(editData.officialPhoto || '').trim();
      const selectedBy =
        officialPhoto && editData.bestPhotoMode === 'official' ? 'official' : 'user';
      const bestPhoto =
        selectedBy === 'official'
          ? officialPhoto || userPhoto || ''
          : userPhoto || officialPhoto || '';

      const draftPayload = {
        ean: String(editData.ean || '')
          .replace(/\D/g, '')
          .trim(),
        nombre: String(editData.nombre || '').trim(),
        name: String(editData.nombre || '').trim(),
        marca: String(editData.marca || '').trim(),
        roaster: String(editData.marca || '').trim(),
        origen: String(editData.origen || '').trim(),
        origin: String(editData.origen || '').trim(),
        pais: String(editData.origen || '').trim(),
        notas: String(editData.notas || '').trim(),
        notes: String(editData.notas || '').trim(),
        officialPhoto,
        imageUrl: bestPhoto || userPhoto || '',
        bestPhoto,
        foto: bestPhoto || userPhoto || '',
        photoSources: {
          userPhoto,
          officialPhoto,
          bestPhoto,
          selectedBy,
        },
        variedad: String(editData.variedad || '').trim(),
        variety: String(editData.variedad || '').trim(),
        proceso: String(editData.proceso || '').trim(),
        process: String(editData.proceso || '').trim(),
        altura: editData.altura ? Number(editData.altura) : null,
        altitude: editData.altura ? Number(editData.altura) : null,
        tueste: String(editData.tueste || '').trim(),
        roastLevel: String(editData.tueste || '').trim(),
        preparacion: String(editData.preparacion || '').trim(),
        certificaciones: String(editData.certificaciones || '').trim(),
        precio: parsePrice(editData.precio),
        scaScoreOfficial: editData.scaScoreOfficial ? Number(editData.scaScoreOfficial) : null,
        formato: String(editData.formato || '').trim(),
        format: String(editData.formato || '').trim(),
        finca: String(editData.finca || '').trim(),
        adminNotes: String(editData.adminNotes || '').trim(),
        coffeeCategory: editData.coffeeCategory || 'specialty',
        category: editData.coffeeCategory === 'daily' ? 'supermarket' : 'specialty',
        isBio: editData.isBio === true,
        adminReviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return {
        ...draftPayload,
        sca: getScaPreviewPayload(editData),
        completionStatus: canBeApproved(draftPayload) ? 'complete' : 'incomplete',
        provisional: !approveNow,
        status: approveNow ? 'approved' : 'pending',
        appVisible: approveNow ? true : (editingCafe.appVisible ?? false),
        scannerVisible: true,
        reviewStatus: approveNow ? 'approved' : 'pending',
        approvedAt: approveNow ? new Date().toISOString() : (editingCafe.approvedAt ?? null),
      };
    },
    [editingCafe, editData, getScaPreviewPayload]
  );

  const handleSaveDraft = useCallback(async () => {
    try {
      if (!editingCafe) return;
      setBusyId(editingCafe.id);

      const payload = buildEditedPayload(false);
      if (!payload) return;

      await updateDocument('cafes', editingCafe.id, payload);

      Alert.alert('OK', 'Ficha guardada como borrador');
      closeEditor();
      loadCafes();
    } catch (error) {
      Alert.alert('Error', error?.message || 'No se pudo guardar la ficha');
    } finally {
      setBusyId(null);
    }
  }, [buildEditedPayload, closeEditor, editingCafe, loadCafes]);

  const handleSaveAndApprove = useCallback(async () => {
    try {
      if (!editingCafe) return;
      setBusyId(editingCafe.id);

      const payload = buildEditedPayload(true);
      if (!payload) return;

      await updateDocument('cafes', editingCafe.id, payload);

      Alert.alert('OK', 'Ficha guardada y aprobada');
      closeEditor();
      loadCafes();
    } catch (error) {
      Alert.alert('Error', error?.message || 'No se pudo aprobar la ficha');
    } finally {
      setBusyId(null);
    }
  }, [buildEditedPayload, closeEditor, editingCafe, loadCafes]);

  const handleRejectFromEditor = useCallback(async () => {
    try {
      if (!editingCafe) return;
      setBusyId(editingCafe.id);

      await updateDocument('cafes', editingCafe.id, {
        status: 'rejected',
        provisional: false,
        reviewStatus: 'rejected',
        appVisible: false,
        scannerVisible: false,
        adminReviewedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      Alert.alert('OK', 'Café rechazado');
      closeEditor();
      loadCafes();
    } catch (error) {
      Alert.alert('Error', error?.message || 'No se pudo rechazar');
    } finally {
      setBusyId(null);
    }
  }, [closeEditor, editingCafe, loadCafes]);

  const stats = useMemo(() => {
    const total = pendingCafes.length;
    const sinFoto = pendingCafes.filter((c) => !getBestPhoto(c)).length;
    const sinPrecio = pendingCafes.filter((c) => !c.precio).length;
    const sinNotas = pendingCafes.filter((c) => !String(c.notas || '').trim()).length;
    const sinEan = pendingCafes.filter((c) => !String(c.ean || c.barcode || '').trim()).length;
    const listos = pendingCafes.filter((c) => canBeApproved(c)).length;
    return { total, sinFoto, sinPrecio, sinNotas, sinEan, listos };
  }, [pendingCafes]);

  const filteredCafes = useMemo(() => {
    let rows = pendingCafes.filter((cafe) => matchesSearch(cafe, searchText));
    switch (activeFilter) {
      case FILTERS.WITHOUT_IMAGE:
        rows = rows.filter((c) => !getBestPhoto(c));
        break;
      case FILTERS.WITHOUT_PRICE:
        rows = rows.filter((c) => !c.precio);
        break;
      case FILTERS.WITHOUT_NOTAS:
        rows = rows.filter((c) => !String(c.notas || '').trim());
        break;
      case FILTERS.WITHOUT_EAN:
        rows = rows.filter((c) => !String(c.ean || c.barcode || '').trim());
        break;
      case FILTERS.INCOMPLETE:
        rows = rows.filter(isCafeIncomplete);
        break;
      case FILTERS.READY:
        rows = rows.filter(canBeApproved);
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
      onEdit={openEditor}
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

  if (editingCafe && editData) {
    const userPhoto = getUserPhoto(editingCafe);
    const officialPhoto = String(editData.officialPhoto || '').trim();
    const selectedBy = officialPhoto && editData.bestPhotoMode === 'official' ? 'official' : 'user';
    const previewBestPhoto =
      selectedBy === 'official'
        ? officialPhoto || userPhoto || ''
        : userPhoto || officialPhoto || '';

    const ai = editingCafe.aiSuggestion || {};
    const priceInvalid = isPriceInputInvalid(editData.precio);
    const editorPreviewPayload = {
      nombre: String(editData.nombre || '').trim(),
      marca: String(editData.marca || '').trim(),
      bestPhoto: String(previewBestPhoto || '').trim(),
      foto: String(previewBestPhoto || '').trim(),
      imageUrl: String(previewBestPhoto || '').trim(),
      ean: String(editData.ean || '')
        .replace(/\D/g, '')
        .trim(),
      precio: parsePrice(editData.precio),
      notas: String(editData.notas || '').trim(),
    };
    const editorReady = canBeApproved(editorPreviewPayload);
    const editorSca = getScaPreviewPayload(editData);
    const completionItems = [
      {
        label: 'EAN',
        ok: !!String(editData.ean || '')
          .replace(/\D/g, '')
          .trim(),
      },
      { label: 'Nombre', ok: !!String(editData.nombre || '').trim() },
      { label: 'Marca', ok: !!String(editData.marca || '').trim() },
      { label: 'Foto final', ok: !!String(previewBestPhoto || '').trim() },
      { label: 'Precio', ok: !!parsePrice(editData.precio) },
      { label: 'Notas', ok: !!String(editData.notas || '').trim() },
    ];

    return (
      <ScrollView style={styles.editorContainer} contentContainerStyle={styles.editorContent}>
        <Text style={styles.title}>Admin · Editar ficha</Text>
        <Text style={styles.subtitle}>
          Completa la ficha final, elige la portada y publícala desde aquí.
        </Text>

        <View style={styles.editorTopActions}>
          <TouchableOpacity
            style={[
              styles.editorTopActionPrimary,
              (busyId === editingCafe.id || priceInvalid) && styles.actionBtnDisabled,
            ]}
            onPress={handleSaveDraft}
            disabled={busyId === editingCafe.id || priceInvalid}
          >
            <Text style={styles.editorTopActionPrimaryText}>Guardar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.editorTopActionApprove,
              (busyId === editingCafe.id || priceInvalid) && styles.actionBtnDisabled,
            ]}
            onPress={handleSaveAndApprove}
            disabled={busyId === editingCafe.id || priceInvalid}
          >
            <Text style={styles.editorTopActionApproveText}>Aprobar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.editorTopActionGhost,
              busyId === editingCafe.id && styles.actionBtnDisabled,
            ]}
            onPress={handleRejectFromEditor}
            disabled={busyId === editingCafe.id}
          >
            <Text style={styles.editorTopActionGhostText}>Rechazar</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.editorTopActionGhost} onPress={closeEditor}>
            <Text style={styles.editorTopActionGhostText}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        <AdminSectionCard
          title="Resumen rapido"
          subtitle="Lectura visual de lo que falta antes de guardar o aprobar."
          tone={editorReady ? 'success' : 'accent'}
        >
          <View style={styles.editorStatsRow}>
            <EditorStat
              label="Estado"
              value={editorReady ? 'Lista para aprobar' : 'Falta revisar'}
              tone={editorReady ? 'success' : 'default'}
            />
            <EditorStat
              label="Categoria"
              value={editData.coffeeCategory === 'daily' ? 'Cafe diario' : 'Especialidad'}
            />
            <EditorStat
              label="SCA"
              value={editorSca ? Number(editorSca.score || 0).toFixed(1) : '-'}
            />
          </View>
          <View style={styles.checkGrid}>
            {completionItems.map((item) => (
              <View key={item.label} style={[styles.checkPill, item.ok && styles.checkPillOk]}>
                <Text style={[styles.checkPillText, item.ok && styles.checkPillTextOk]}>
                  {item.ok ? 'OK' : 'Pendiente'} · {item.label}
                </Text>
              </View>
            ))}
          </View>
        </AdminSectionCard>

        <CollapsibleAdminSection
          title="Fotos"
          subtitle="Usuario, oficial y portada final."
          open={editorSections.photos}
          onToggle={() => setEditorSections((prev) => ({ ...prev, photos: !prev.photos }))}
        >
          <View style={styles.previewSection}>
            <View style={styles.previewBlock}>
              <Text style={styles.previewTitle}>Foto usuario</Text>
              {userPhoto ? (
                <Image source={{ uri: userPhoto }} style={styles.previewImage} />
              ) : (
                <View style={[styles.previewImage, styles.previewPlaceholder]}>
                  <Text style={styles.previewPlaceholderText}>Sin foto</Text>
                </View>
              )}
            </View>

            <View style={styles.previewBlock}>
              <Text style={styles.previewTitle}>Foto oficial</Text>
              {officialPhoto ? (
                <Image source={{ uri: officialPhoto }} style={styles.previewImage} />
              ) : (
                <View style={[styles.previewImage, styles.previewPlaceholder]}>
                  <Text style={styles.previewPlaceholderText}>Sin oficial</Text>
                </View>
              )}
            </View>

            <View style={styles.previewBlock}>
              <Text style={styles.previewTitle}>Foto final</Text>
              {previewBestPhoto ? (
                <Image source={{ uri: previewBestPhoto }} style={styles.previewImage} />
              ) : (
                <View style={[styles.previewImage, styles.previewPlaceholder]}>
                  <Text style={styles.previewPlaceholderText}>Sin final</Text>
                </View>
              )}
            </View>
          </View>
        </CollapsibleAdminSection>

        <CollapsibleAdminSection
          title="Clasificacion y portada"
          subtitle="Tipo de cafe, BIO, foto activa y acciones rapidas."
          open={editorSections.classification}
          onToggle={() =>
            setEditorSections((prev) => ({ ...prev, classification: !prev.classification }))
          }
        >
          <View style={styles.categoryCard}>
            <Text style={styles.categoryTitle}>Tipo de café</Text>

            <View style={styles.categoryRow}>
              <TouchableOpacity
                style={[
                  styles.categoryBtn,
                  editData.coffeeCategory === 'specialty' && styles.categoryBtnActive,
                ]}
                onPress={() => setEditData((prev) => ({ ...prev, coffeeCategory: 'specialty' }))}
              >
                <Text
                  style={[
                    styles.categoryBtnText,
                    editData.coffeeCategory === 'specialty' && styles.categoryBtnTextActive,
                  ]}
                >
                  Especialidad
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.categoryBtn,
                  editData.coffeeCategory === 'daily' && styles.categoryBtnActive,
                ]}
                onPress={() => setEditData((prev) => ({ ...prev, coffeeCategory: 'daily' }))}
              >
                <Text
                  style={[
                    styles.categoryBtnText,
                    editData.coffeeCategory === 'daily' && styles.categoryBtnTextActive,
                  ]}
                >
                  Café diario
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.categoryHelp}>
              Usa “Especialidad” para roasters o cafés curados y “Café diario” para supermercado o
              consumo habitual.
            </Text>
          </View>

          <View style={styles.categoryCard}>
            <Text style={styles.categoryTitle}>Certificación BIO</Text>

            <View style={styles.categoryRow}>
              <TouchableOpacity
                style={[styles.categoryBtn, editData.isBio === true && styles.categoryBtnActive]}
                onPress={() => setEditData((prev) => ({ ...prev, isBio: true }))}
              >
                <Text
                  style={[
                    styles.categoryBtnText,
                    editData.isBio === true && styles.categoryBtnTextActive,
                  ]}
                >
                  🌿 BIO
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.categoryBtn, editData.isBio === false && styles.categoryBtnActive]}
                onPress={() => setEditData((prev) => ({ ...prev, isBio: false }))}
              >
                <Text
                  style={[
                    styles.categoryBtnText,
                    editData.isBio === false && styles.categoryBtnTextActive,
                  ]}
                >
                  No BIO
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.categoryHelp}>
              Marca si el café es ecológico u orgánico certificado.
            </Text>
          </View>

          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                editData.bestPhotoMode === 'user' && styles.toggleBtnActive,
              ]}
              onPress={() => setEditData((prev) => ({ ...prev, bestPhotoMode: 'user' }))}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  editData.bestPhotoMode === 'user' && styles.toggleBtnTextActive,
                ]}
              >
                Usar foto usuario
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleBtn,
                editData.bestPhotoMode === 'official' && styles.toggleBtnActive,
                !officialPhoto && styles.actionBtnDisabled,
              ]}
              onPress={() =>
                officialPhoto && setEditData((prev) => ({ ...prev, bestPhotoMode: 'official' }))
              }
              disabled={!officialPhoto}
            >
              <Text
                style={[
                  styles.toggleBtnText,
                  editData.bestPhotoMode === 'official' && styles.toggleBtnTextActive,
                ]}
              >
                Usar foto oficial
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.secondaryActionRow}>
            <TouchableOpacity
              style={[styles.secondaryActionBtn, styles.uploadPhotoBtn]}
              onPress={handlePickOfficialPhoto}
              disabled={uploadingOfficialPhoto}
            >
              <Text style={styles.secondaryActionBtnText}>
                {uploadingOfficialPhoto
                  ? 'Subiendo a Storage…'
                  : '📷 Subir foto (cámara / galería)'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryActionBtn,
                styles.openUrlBtn,
                !officialPhoto && styles.actionBtnDisabled,
              ]}
              onPress={handleOpenOfficialPhoto}
              disabled={!officialPhoto}
            >
              <Text style={styles.secondaryActionBtnText}>Abrir URL oficial</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.secondaryActionRow}>
            <TouchableOpacity
              style={[styles.secondaryActionBtn, styles.searchProposalBtn]}
              onPress={handleSearchProposal}
              disabled={searchingProposal}
            >
              <Text style={styles.secondaryActionBtnText}>
                {searchingProposal ? 'Buscando…' : 'Buscar datos y foto'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryActionBtn,
                styles.applyProposalBtn,
                !proposal && styles.actionBtnDisabled,
              ]}
              onPress={handleApplyProposal}
              disabled={!proposal}
            >
              <Text style={styles.secondaryActionBtnText}>Aplicar propuesta</Text>
            </TouchableOpacity>
          </View>
        </CollapsibleAdminSection>

        <CollapsibleAdminSection
          title="Asistencia IA"
          subtitle="Sugerencia guardada y propuesta externa."
          open={editorSections.ai}
          onToggle={() => setEditorSections((prev) => ({ ...prev, ai: !prev.ai }))}
        >
          <View style={styles.suggestionCard}>
            <View style={styles.suggestionHeader}>
              <Text style={styles.suggestionTitle}>Sugerencia IA</Text>
              <TouchableOpacity style={styles.copyAiBtn} onPress={handleCopyAiSuggestion}>
                <Text style={styles.copyAiBtnText}>Copiar sugerencia IA</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.blockTitle}>Sugerencia guardada</Text>
            <Text style={styles.blockText}>Nombre: {ai.nombre || '-'}</Text>
            <Text style={styles.blockText}>Marca: {ai.marca || '-'}</Text>
            <Text style={styles.blockText}>Origen: {ai.origen || '-'}</Text>
            <Text style={styles.blockText}>Resumen: {ai.summary || '-'}</Text>
            <Text style={styles.blockText}>
              Tipo sugerido:{' '}
              {typeof ai.isSpecialty === 'boolean'
                ? ai.isSpecialty
                  ? 'Especialidad'
                  : 'Café diario'
                : '-'}
            </Text>
            <Text style={styles.blockText}>
              BIO sugerido: {ai.isBio === true ? 'Sí' : 'No / sin dato'}
            </Text>

            {proposal ? (
              <>
                <Text style={[styles.blockTitle, { marginTop: 14 }]}>Propuesta encontrada</Text>
                <Text style={styles.blockText}>Nombre: {proposal.suggestedNombre || '-'}</Text>
                <Text style={styles.blockText}>Marca: {proposal.suggestedMarca || '-'}</Text>
                <Text style={styles.blockText}>Origen: {proposal.suggestedOrigen || '-'}</Text>
                <Text style={styles.blockText}>Formato: {proposal.suggestedFormato || '-'}</Text>
                <Text style={styles.blockText}>Notas: {proposal.suggestedNotas || '-'}</Text>
                <Text style={styles.blockText}>
                  Confianza: {Math.round((proposal.confidence || 0) * 100)}%
                </Text>
              </>
            ) : null}
          </View>
        </CollapsibleAdminSection>

        <CollapsibleAdminSection
          title="Ficha editable"
          subtitle="Datos finales que acabaran en la base de datos y en la app."
          open={editorSections.details}
          onToggle={() => setEditorSections((prev) => ({ ...prev, details: !prev.details }))}
        >
          <EditorField
            label="EAN / Código de barras"
            value={editData.ean}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, ean: t }))}
            placeholder="Ej. 8480000103529"
            keyboardType="number-pad"
          />
          <EditorField
            label="Nombre"
            value={editData.nombre}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, nombre: t }))}
            placeholder="Ej. Nomad Kenya Karimikui"
          />
          <EditorField
            label="Marca / Roaster"
            value={editData.marca}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, marca: t }))}
            placeholder="Ej. Nomad Coffee"
          />
          <EditorField
            label="Origen"
            value={editData.origen}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, origen: t }))}
            placeholder="Ej. Kenya / Etiopía / Colombia"
          />
          <EditorField
            label="Notas"
            value={editData.notas}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, notas: t }))}
            placeholder="Notas sensoriales"
            multiline
          />
          <EditorField
            label="URL foto oficial"
            value={editData.officialPhoto}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, officialPhoto: t }))}
            placeholder="Pega aquí la URL de la foto oficial"
          />
          <EditorField
            label="Variedad"
            value={editData.variedad}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, variedad: t }))}
            placeholder="Ej. Caturra, Bourbon"
          />
          <EditorField
            label="Proceso"
            value={editData.proceso}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, proceso: t }))}
            placeholder="Ej. Lavado, Natural"
          />
          <EditorField
            label="Altura"
            value={editData.altura}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, altura: t }))}
            placeholder="Ej. 1850"
            keyboardType="numeric"
          />
          <EditorField
            label="Tueste"
            value={editData.tueste}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, tueste: t }))}
            placeholder="Ligero / Medio / Espresso"
          />
          <EditorField
            label="Preparación"
            value={editData.preparacion}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, preparacion: t }))}
            placeholder="V60 / Espresso / Filtro"
          />
          <EditorField
            label="Certificaciones"
            value={editData.certificaciones}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, certificaciones: t }))}
            placeholder="BIO, Organic, Fair Trade, etc."
          />
          <EditorField
            label="Precio (€)"
            value={editData.precio}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, precio: t }))}
            placeholder="Ej. 12.90"
            keyboardType="decimal-pad"
          />
          {priceInvalid ? (
            <Text style={styles.priceErrorText}>
              Introduce un precio válido mayor que 0. Ejemplo: 12.90
            </Text>
          ) : null}
          <EditorField
            label="SCA"
            value={editData.scaScoreOfficial}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, scaScoreOfficial: t }))}
            placeholder="Ej. 86"
            keyboardType="numeric"
          />
          <EditorField
            label="Formato"
            value={editData.formato}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, formato: t }))}
            placeholder="Ej. 250g"
          />
          <EditorField
            label="Finca"
            value={editData.finca}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, finca: t }))}
            placeholder="Ej. Finca El Paraíso"
          />
          <EditorField
            label="Notas admin"
            value={editData.adminNotes}
            onChangeText={(t) => setEditData((prev) => ({ ...prev, adminNotes: t }))}
            placeholder="Notas internas para revisión"
            multiline
          />
        </CollapsibleAdminSection>

        <View style={styles.editorActionsColumn}>
          <TouchableOpacity
            style={[
              styles.editorActionBtn,
              styles.saveDraftBtn,
              (busyId === editingCafe.id || priceInvalid) && styles.actionBtnDisabled,
            ]}
            onPress={handleSaveDraft}
            disabled={busyId === editingCafe.id || priceInvalid}
          >
            <Text style={styles.actionBtnText}>Guardar borrador</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.editorActionBtn,
              styles.approveBtn,
              (busyId === editingCafe.id || priceInvalid) && styles.actionBtnDisabled,
            ]}
            onPress={handleSaveAndApprove}
            disabled={busyId === editingCafe.id || priceInvalid}
          >
            <Text style={styles.actionBtnText}>Guardar y aprobar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.editorActionBtn,
              styles.rejectBtn,
              busyId === editingCafe.id && styles.actionBtnDisabled,
            ]}
            onPress={handleRejectFromEditor}
            disabled={busyId === editingCafe.id}
          >
            <Text style={styles.actionBtnTextDark}>Rechazar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.editorActionBtn, styles.cancelBtn]}
            onPress={closeEditor}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin · Catálogo</Text>
      <Text style={styles.subtitle}>Gestiona y enriquece fichas. Filtra por datos faltantes.</Text>

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
          label="Sin foto"
          active={activeFilter === FILTERS.WITHOUT_IMAGE}
          onPress={() => setActiveFilter(FILTERS.WITHOUT_IMAGE)}
        />
        <FilterChip
          label="Sin precio"
          active={activeFilter === FILTERS.WITHOUT_PRICE}
          onPress={() => setActiveFilter(FILTERS.WITHOUT_PRICE)}
        />
        <FilterChip
          label="Sin notas"
          active={activeFilter === FILTERS.WITHOUT_NOTAS}
          onPress={() => setActiveFilter(FILTERS.WITHOUT_NOTAS)}
        />
        <FilterChip
          label="Sin EAN"
          active={activeFilter === FILTERS.WITHOUT_EAN}
          onPress={() => setActiveFilter(FILTERS.WITHOUT_EAN)}
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
      </ScrollView>

      <View style={styles.statsRow}>
        <InfoPill label="Total" value={stats.total} />
        <InfoPill label="Listos" value={stats.listos} />
        <InfoPill label="Sin foto" value={stats.sinFoto} />
        <InfoPill label="Sin precio" value={stats.sinPrecio} />
        <InfoPill label="Sin notas" value={stats.sinNotas} />
        <InfoPill label="Sin EAN" value={stats.sinEan} />
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
  editorContainer: { flex: 1, backgroundColor: '#FAFAFA' },
  editorContent: { padding: 16, paddingBottom: 40 },
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
  editorTopActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  editorTopActionPrimary: {
    flex: 1,
    minWidth: 110,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    alignItems: 'center',
  },
  editorTopActionPrimaryText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  editorTopActionApprove: {
    flex: 1,
    minWidth: 110,
    borderRadius: 12,
    backgroundColor: '#166534',
    paddingVertical: 12,
    alignItems: 'center',
  },
  editorTopActionApproveText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 13,
  },
  editorTopActionGhost: {
    minWidth: 110,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  editorTopActionGhostText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 13,
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
  cardReady: {
    borderColor: '#BBF7D0',
    backgroundColor: '#FBFFFC',
  },
  cardUrgent: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF9F9',
  },
  cardNeedsWork: {
    borderColor: '#E8D8C7',
    backgroundColor: '#FFFCF8',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardPriorityRow: {
    marginBottom: 8,
  },
  priorityPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  priorityPillReady: {
    backgroundColor: '#E7F7EC',
  },
  priorityPillUrgent: {
    backgroundColor: '#FEE2E2',
  },
  priorityPillReview: {
    backgroundColor: '#FDF1E4',
  },
  priorityPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  priorityPillTextReady: {
    color: '#166534',
  },
  priorityPillTextUrgent: {
    color: '#991B1B',
  },
  priorityPillTextReview: {
    color: '#9A3412',
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  cardBrand: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B4F3A',
    marginBottom: 8,
  },
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
  badgeDark: { backgroundColor: '#E5E7EB' },
  badgeBio: { backgroundColor: '#E7F7EC' },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextWarning: { color: '#92400E' },
  badgeTextSuccess: { color: '#166534' },
  badgeTextDanger: { color: '#991B1B' },
  badgeTextSuccessSoft: { color: '#075985' },
  badgeTextDark: { color: '#111827' },
  badgeTextBio: { color: '#1F6B42' },

  thumbnailWrap: { width: 82, height: 82 },
  thumbnail: { width: 82, height: 82, borderRadius: 14, backgroundColor: '#EEE' },
  thumbnailPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbnailPlaceholderText: { color: '#888', fontWeight: '700', fontSize: 12 },

  reviewChecksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
  },
  reviewCheckPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
  },
  reviewCheckPillOk: {
    backgroundColor: '#E7F7EC',
  },
  reviewCheckPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  reviewCheckPillTextOk: {
    color: '#1F6B42',
  },
  cardBody: { marginTop: 12 },
  cardLine: { fontSize: 14, color: '#374151', marginBottom: 5 },
  cardLineLabel: { fontWeight: '700', color: '#111827' },

  warningBox: { marginTop: 12, backgroundColor: '#FFF7ED', borderRadius: 12, padding: 12 },
  warningText: { color: '#9A3412', fontWeight: '700', marginBottom: 4 },
  warningSubtext: { color: '#C2410C', fontSize: 13 },

  readyBox: { marginTop: 12, backgroundColor: '#F0FDF4', borderRadius: 12, padding: 12 },
  readyText: { color: '#166534', fontWeight: '700' },

  actions: { flexDirection: 'row', marginTop: 14, gap: 10 },
  actionBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  editBtn: { backgroundColor: '#111827' },
  approveBtn: { backgroundColor: '#166534' },
  rejectBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' },
  actionBtnDisabled: { opacity: 0.4 },
  actionBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  actionBtnTextDark: { color: '#991B1B', fontWeight: '700', fontSize: 14 },

  previewSection: {
    gap: 12,
    marginBottom: 18,
  },
  adminSectionCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  adminSectionCardAccent: {
    backgroundColor: '#FFFCF8',
    borderColor: '#E8D8C7',
  },
  adminSectionCardSuccess: {
    backgroundColor: '#F7FFF9',
    borderColor: '#BBF7D0',
  },
  adminSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  adminSectionSubtitle: {
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18,
    color: '#6B7280',
  },
  adminSectionBody: {
    marginTop: 12,
  },
  editorStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  editorStatCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    padding: 12,
  },
  editorStatCardSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#BBF7D0',
  },
  editorStatLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  editorStatValue: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  editorStatValueSuccess: {
    color: '#166534',
  },
  checkGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checkPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#F3F4F6',
  },
  checkPillOk: {
    backgroundColor: '#E7F7EC',
  },
  checkPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  checkPillTextOk: {
    color: '#1F6B42',
  },
  collapsibleWrap: {
    marginBottom: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  collapsibleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FCFCFD',
  },
  collapsibleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  collapsibleSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#6B7280',
  },
  collapsibleIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  collapsibleIcon: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '800',
    color: '#374151',
  },
  collapsibleBody: {
    padding: 14,
    paddingTop: 10,
  },
  previewBlock: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 12,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  previewImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    backgroundColor: '#EEE',
  },
  previewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceholderText: {
    color: '#777',
    fontWeight: '700',
  },

  categoryCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  categoryBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    alignItems: 'center',
  },
  categoryBtnActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  categoryBtnText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 13,
  },
  categoryBtnTextActive: {
    color: '#FFF',
  },
  categoryHelp: {
    marginTop: 10,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },

  toggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  toggleBtnText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 13,
  },
  toggleBtnTextActive: {
    color: '#FFF',
  },

  secondaryActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  secondaryActionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  uploadPhotoBtn: {
    backgroundColor: '#2563EB',
  },
  openUrlBtn: {
    backgroundColor: '#0F766E',
  },
  searchProposalBtn: {
    backgroundColor: '#7C3AED',
  },
  applyProposalBtn: {
    backgroundColor: '#1D4ED8',
  },
  secondaryActionBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },

  suggestionCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  suggestionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  copyAiBtn: {
    backgroundColor: '#1D4ED8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  copyAiBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 12,
  },
  blockTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2563EB',
    marginBottom: 6,
  },
  blockText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    lineHeight: 20,
  },

  editorField: {
    marginBottom: 12,
  },
  editorLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  editorInput: {
    minHeight: 46,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111',
  },
  editorInputMultiline: {
    minHeight: 92,
    paddingTop: 12,
    paddingBottom: 12,
  },
  priceErrorText: {
    marginTop: -6,
    marginBottom: 12,
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
  },

  editorActionsColumn: {
    marginTop: 10,
    gap: 10,
  },
  editorActionBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveDraftBtn: {
    backgroundColor: '#2563EB',
  },
  cancelBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelBtnText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 14,
  },
});
