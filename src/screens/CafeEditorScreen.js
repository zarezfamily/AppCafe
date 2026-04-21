import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  canBeApproved,
  computeAutomaticSca,
  getCafeById,
  saveCafeDraft,
} from '../services/cafeService';
// import { useAuth } from '../context/AuthContext';

const PROCESS_OPTIONS = ['Lavado', 'Natural', 'Honey', 'Anaeróbico', 'Experimental'];
const CATEGORY_OPTIONS = [
  { value: 'specialty', label: 'Especialidad' },
  { value: 'supermarket', label: 'Supermercado' },
  { value: 'bio', label: 'Bio' },
];
const FORMAT_OPTIONS = [
  { value: 'beans', label: 'Grano' },
  { value: 'ground', label: 'Molido' },
  { value: 'capsules', label: 'Cápsulas' },
];
const ROAST_OPTIONS = [
  { value: 'light', label: 'Claro' },
  { value: 'medium', label: 'Medio' },
  { value: 'dark', label: 'Oscuro' },
];
const SPECIES_OPTIONS = [
  { value: 'arabica', label: 'Arábica' },
  { value: 'robusta', label: 'Robusta' },
  { value: 'blend', label: 'Blend' },
];

const ORIGIN_SUGGESTIONS = [
  'Etiopía',
  'Colombia',
  'Brasil',
  'Kenia',
  'Guatemala',
  'Costa Rica',
  'El Salvador',
  'Ruanda',
];

function getMissingFields(form) {
  const missing = [];

  if (!String(form.name || '').trim()) missing.push('Nombre');
  if (!String(form.roaster || '').trim()) missing.push('Tostador');
  if (!String(form.imageUrl || '').trim()) missing.push('Imagen');

  return missing;
}

function isValidHttpUrl(value) {
  const v = String(value || '')
    .trim()
    .toLowerCase();
  return v.startsWith('http://') || v.startsWith('https://');
}

function normalizeNumberInput(value) {
  const normalized = String(value || '')
    .replace(',', '.')
    .trim();
  if (!normalized) return '';
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? String(parsed) : value;
}

function Chip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function MetricChip({ label, active, onPress, compact = false }) {
  return (
    <TouchableOpacity
      style={[
        styles.metricChip,
        active && styles.metricChipActive,
        compact && styles.metricChipCompact,
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.metricChipText, active && styles.metricChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function ScaTypePill({ type }) {
  const isOfficial = type === 'official';
  return (
    <View
      style={[styles.scaTypePill, isOfficial ? styles.scaTypeOfficial : styles.scaTypeEstimated]}
    >
      <Text
        style={[
          styles.scaTypeText,
          isOfficial ? styles.scaTypeTextOfficial : styles.scaTypeTextEstimated,
        ]}
      >
        {isOfficial ? 'SCA oficial' : 'SCA estimado'}
      </Text>
    </View>
  );
}

export default function CafeEditorScreen({ route, navigation }) {
  const { cafeId, mode } = route.params || {};
  // const { user } = useAuth();
  const user = null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pickingImage, setPickingImage] = useState(false);

  const [form, setForm] = useState({
    ean: '',
    name: '',
    roaster: '',
    origin: '',
    process: '',
    variety: '',
    notes: '',
    imageUrl: '',
    category: '',
    format: '',
    roastLevel: '',
    species: '',
    altitude: '',
    scaScoreOfficial: '',
    decaf: false,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        if (!cafeId) {
          throw new Error('No se recibió cafeId');
        }

        const cafe = await getCafeById(cafeId);

        if (!cafe) {
          throw new Error('No se encontró el café');
        }

        if (!active) return;

        setForm({
          ean: cafe.ean || '',
          name: cafe.name || cafe.nombre || '',
          roaster: cafe.roaster || cafe.marca || '',
          origin: cafe.origin || cafe.origen || cafe.pais || '',
          process: cafe.process || cafe.proceso || '',
          variety: cafe.variety || cafe.variedad || '',
          notes: cafe.notes || cafe.notas || '',
          imageUrl:
            cafe.imageUrl || cafe.bestPhoto || cafe.officialPhoto || cafe.foto || cafe.image || '',
          category: cafe.category || '',
          format: cafe.format || cafe.formato || '',
          roastLevel: cafe.roastLevel || cafe.tueste || '',
          species: cafe.species || cafe.especie || '',
          altitude:
            cafe.altitude !== undefined && cafe.altitude !== null
              ? String(cafe.altitude)
              : cafe.altura !== undefined && cafe.altura !== null
                ? String(cafe.altura)
                : '',
          scaScoreOfficial:
            cafe.scaScoreOfficial !== undefined && cafe.scaScoreOfficial !== null
              ? String(cafe.scaScoreOfficial)
              : '',
          decaf: cafe.decaf === true,
        });
      } catch (error) {
        Alert.alert('Error', error?.message || 'No se pudo cargar la ficha');
        navigation.goBack();
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [cafeId, navigation]);

  const setField = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const readyToReview = useMemo(() => canBeApproved(form), [form]);
  const missingFields = useMemo(() => getMissingFields(form), [form]);
  const scaPreview = useMemo(() => computeAutomaticSca(form), [form]);

  const pickImageFromLibrary = async () => {
    try {
      setPickingImage(true);

      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          'Permiso necesario',
          'Necesitas permitir acceso a la galería para seleccionar una imagen.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 4],
        quality: 0.9,
      });

      if (result.canceled) return;

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setField('imageUrl', asset.uri);
    } catch (error) {
      Alert.alert('Error', error?.message || 'No se pudo seleccionar la imagen');
    } finally {
      setPickingImage(false);
    }
  };

  const handleSave = async () => {
    try {
      const hasImage = String(form.imageUrl || '').trim();

      if (hasImage && !hasImage.startsWith('file://') && !isValidHttpUrl(hasImage)) {
        Alert.alert('Error', 'La imagen debe ser una URL válida o una imagen de la galería');
        return;
      }

      setSaving(true);

      await saveCafeDraft(
        cafeId,
        {
          ...form,
          altitude: normalizeNumberInput(form.altitude),
          scaScoreOfficial: normalizeNumberInput(form.scaScoreOfficial),
        },
        user?.uid || null
      );

      Alert.alert(
        'Guardado',
        readyToReview
          ? 'La ficha ha quedado lista para validación.'
          : 'La ficha provisional se ha guardado. Aún faltan datos para revisión.'
      );

      navigation.replace('CafeDetailScreen', {
        cafeId,
        mode: 'view_pending',
      });
    } catch (error) {
      Alert.alert('Error', error?.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Cargando ficha…</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>
        {mode === 'continue_pending' ? 'Completar café pendiente' : 'Editar café'}
      </Text>

      {mode === 'continue_pending' ? (
        <Text style={styles.helperText}>
          Completa esta ficha para que pueda validarse y aparecer correctamente en ETIOVE.
        </Text>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.label}>EAN</Text>
        <TextInput
          value={form.ean}
          editable={false}
          style={[styles.input, styles.inputDisabled]}
          placeholder="EAN"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Nombre *</Text>
        <TextInput
          value={form.name}
          onChangeText={(v) => setField('name', v)}
          style={styles.input}
          placeholder="Nombre del café"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Tostador *</Text>
        <TextInput
          value={form.roaster}
          onChangeText={(v) => setField('roaster', v)}
          style={styles.input}
          placeholder="Nomad, Hola Coffee, Syra..."
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Categoría</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {CATEGORY_OPTIONS.map((item) => (
            <MetricChip
              key={item.value}
              label={item.label}
              active={form.category === item.value}
              onPress={() => setField('category', item.value)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Formato</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {FORMAT_OPTIONS.map((item) => (
            <MetricChip
              key={item.value}
              label={item.label}
              active={form.format === item.value}
              onPress={() => setField('format', item.value)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Origen</Text>
        <TextInput
          value={form.origin}
          onChangeText={(v) => setField('origin', v)}
          style={styles.input}
          placeholder="País o región"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {ORIGIN_SUGGESTIONS.map((origin) => (
            <Chip
              key={origin}
              label={origin}
              active={form.origin === origin}
              onPress={() => setField('origin', origin)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Proceso</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {PROCESS_OPTIONS.map((process) => (
            <Chip
              key={process}
              label={process}
              active={form.process === process}
              onPress={() => setField('process', process)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Variedad</Text>
        <TextInput
          value={form.variety}
          onChangeText={(v) => setField('variety', v)}
          style={styles.input}
          placeholder="Bourbon, Caturra, Gesha..."
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Especie</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {SPECIES_OPTIONS.map((item) => (
            <MetricChip
              key={item.value}
              label={item.label}
              active={form.species === item.value}
              onPress={() => setField('species', item.value)}
              compact
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Tueste</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {ROAST_OPTIONS.map((item) => (
            <MetricChip
              key={item.value}
              label={item.label}
              active={form.roastLevel === item.value}
              onPress={() => setField('roastLevel', item.value)}
            />
          ))}
        </ScrollView>
      </View>

      <View style={styles.sectionRow}>
        <View style={[styles.section, styles.halfSection]}>
          <Text style={styles.label}>Altitud (msnm)</Text>
          <TextInput
            value={form.altitude}
            onChangeText={(v) => setField('altitude', v)}
            style={styles.input}
            placeholder="1800"
            keyboardType="numeric"
          />
        </View>

        <View style={[styles.section, styles.halfSection]}>
          <Text style={styles.label}>SCA oficial</Text>
          <TextInput
            value={form.scaScoreOfficial}
            onChangeText={(v) => setField('scaScoreOfficial', v)}
            style={styles.input}
            placeholder="86"
            keyboardType="numeric"
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.toggleRow, form.decaf && styles.toggleRowActive]}
        activeOpacity={0.85}
        onPress={() => setField('decaf', !form.decaf)}
      >
        <View style={[styles.toggleKnob, form.decaf && styles.toggleKnobActive]} />
        <Text style={[styles.toggleText, form.decaf && styles.toggleTextActive]}>Descafeinado</Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={styles.label}>Imagen *</Text>

        <View style={styles.imageActions}>
          <View style={styles.imageActionButton}>
            <Button
              title={pickingImage ? 'Abriendo galería...' : 'Elegir de galería'}
              onPress={pickImageFromLibrary}
              disabled={pickingImage || saving}
            />
          </View>
        </View>

        <Text style={styles.imageHint}>
          También puedes pegar una URL si prefieres usar una imagen remota.
        </Text>

        <TextInput
          value={form.imageUrl}
          onChangeText={(v) => setField('imageUrl', v)}
          style={styles.input}
          placeholder="https://... o file://..."
          autoCapitalize="none"
        />

        {form.imageUrl ? (
          <Image source={{ uri: form.imageUrl }} style={styles.imagePreview} resizeMode="cover" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>Sin imagen</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Notas</Text>
        <TextInput
          value={form.notes}
          onChangeText={(v) => setField('notes', v)}
          style={[styles.input, styles.notesInput]}
          placeholder="Notas de cata, perfil, curiosidades..."
          multiline
        />
      </View>

      <View style={styles.scaPreviewBox}>
        <View style={styles.scaPreviewHeader}>
          <View>
            <Text style={styles.scaPreviewTitle}>SCA automático</Text>
            <Text style={styles.scaPreviewSubtitle}>
              Se recalcula al guardar según la información disponible
            </Text>
          </View>
          <ScaTypePill type={scaPreview.type} />
        </View>

        <View style={styles.scaScoreRow}>
          <Text style={styles.scaScoreValue}>{Number(scaPreview.score || 0).toFixed(1)}</Text>
          <View style={styles.scaMetaCol}>
            <Text style={styles.scaConfidence}>
              Confianza: {Math.round(Number(scaPreview.confidence || 0) * 100)}%
            </Text>
            <Text style={styles.scaSummary}>
              {scaPreview.type === 'official'
                ? 'Usando puntuación oficial'
                : 'Estimación ETIOVE según señales del café'}
            </Text>
          </View>
        </View>

        {Array.isArray(scaPreview.reasons) && scaPreview.reasons.length ? (
          <View style={styles.reasonsWrap}>
            {scaPreview.reasons.map((reason) => (
              <View key={reason} style={styles.reasonPill}>
                <Text style={styles.reasonPillText}>{reason}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={[styles.statusBox, readyToReview ? styles.statusOkBox : styles.statusWarnBox]}>
        {readyToReview ? (
          <Text style={styles.statusOkText}>✔ La ficha está lista para validación.</Text>
        ) : (
          <>
            <Text style={styles.statusWarnTitle}>Faltan campos obligatorios</Text>
            <Text style={styles.statusWarnText}>{missingFields.join(', ')}</Text>
          </>
        )}
      </View>

      <Button
        title={
          saving
            ? 'Guardando...'
            : readyToReview
              ? 'Guardar y enviar a validación'
              : 'Guardar borrador'
        }
        onPress={handleSave}
        disabled={saving}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
    backgroundColor: '#FAFAFA',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
  },
  loadingText: {
    marginTop: 10,
    color: '#555',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
    color: '#111827',
  },
  helperText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 18,
    lineHeight: 20,
  },
  section: {
    marginBottom: 16,
  },
  sectionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfSection: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111827',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: '#FFF',
    fontSize: 15,
    color: '#111',
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  chipsRow: {
    paddingTop: 10,
    paddingBottom: 2,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#111827',
  },
  chipText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#FFF',
  },
  metricChip: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#EEF2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#D8E1EA',
  },
  metricChipCompact: {
    paddingHorizontal: 12,
  },
  metricChipActive: {
    backgroundColor: '#1F2937',
    borderColor: '#1F2937',
  },
  metricChipText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  metricChipTextActive: {
    color: '#FFF',
  },
  toggleRow: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleRowActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#CBD5E1',
  },
  toggleKnobActive: {
    backgroundColor: '#10B981',
  },
  toggleText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '700',
  },
  toggleTextActive: {
    color: '#065F46',
  },
  imageActions: {
    marginBottom: 10,
  },
  imageActionButton: {
    marginBottom: 8,
  },
  imageHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    marginTop: 12,
    backgroundColor: '#E5E7EB',
  },
  imagePlaceholder: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    marginTop: 12,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePlaceholderText: {
    color: '#6B7280',
    fontWeight: '700',
  },
  notesInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  scaPreviewBox: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  scaPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  scaPreviewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  scaPreviewSubtitle: {
    marginTop: 4,
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
  },
  scaTypePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  scaTypeOfficial: {
    backgroundColor: '#ECFDF5',
    borderColor: '#BBF7D0',
  },
  scaTypeEstimated: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  scaTypeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  scaTypeTextOfficial: {
    color: '#166534',
  },
  scaTypeTextEstimated: {
    color: '#1D4ED8',
  },
  scaScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scaScoreValue: {
    fontSize: 42,
    fontWeight: '900',
    color: '#111827',
    lineHeight: 46,
  },
  scaMetaCol: {
    flex: 1,
  },
  scaConfidence: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
  },
  scaSummary: {
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 18,
  },
  reasonsWrap: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonPill: {
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reasonPillText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
  },
  statusBox: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  statusOkBox: {
    backgroundColor: '#ECFDF5',
  },
  statusWarnBox: {
    backgroundColor: '#FFF7ED',
  },
  statusOkText: {
    color: '#166534',
    fontWeight: '800',
  },
  statusWarnTitle: {
    color: '#9A3412',
    fontWeight: '800',
    marginBottom: 4,
  },
  statusWarnText: {
    color: '#C2410C',
    fontWeight: '600',
  },
});
