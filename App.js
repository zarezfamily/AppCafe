import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import {
  addDocument,
  deleteDocument,
  getCollection,
  getDocument,
  setDocument,
  updateDocument,
} from './firebaseConfig';

const TABS = ['Inicio', 'Mis Cafés', 'Ranking'];

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [activeTab, setActiveTab]       = useState('Inicio');
  const [scanned, setScanned]           = useState(false);
  const [nombreCafe, setNombreCafe]     = useState('');
  const [origen, setOrigen]             = useState('');
  const [notas, setNotas]               = useState('');
  const [rating, setRating]             = useState(0);
  const [foto, setFoto]                 = useState(null);
  const [misCafes, setMisCafes]         = useState([]);
  const [topCafes, setTopCafes]         = useState([]);
  const [subiendo, setSubiendo]         = useState(false);
  const [cargando, setCargando]         = useState(true);

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const cafes   = await getCollection("cafes", "fecha");
      const ranking = await getCollection("ranking", "votos", 5);
      setMisCafes(cafes);
      setTopCafes(ranking);
    } catch (e) {
      console.error("Error de carga:", e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const guardarCafe = async () => {
    if (!nombreCafe.trim()) return Alert.alert("Aviso", "Escribe el nombre del café");
    setSubiendo(true);
    try {
      await addDocument("cafes", {
        nombre:    nombreCafe.trim(),
        origen:    origen.trim(),
        puntuacion: rating,
        notas:     notas,
        foto:      foto || '',
        fecha:     new Date().toISOString(),
      });

      const rankId = nombreCafe.trim().toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_");
      const existente = await getDocument("ranking", rankId);
      if (existente) {
        await updateDocument("ranking", rankId, { votos: (existente.votos || 0) + 1 });
      } else {
        await setDocument("ranking", rankId, { nombre: nombreCafe.trim(), votos: 1 });
      }

      Alert.alert("✅ Guardado", "Café añadido a tu colección");
      setNombreCafe(''); setOrigen(''); setNotas(''); setRating(0); setFoto(null); setScanned(false);
      setActiveTab('Mis Cafés');
      cargarDatos();
    } catch (e) {
      console.error("Error al guardar:", e);
      Alert.alert("Error", "No se pudo conectar con Firebase");
    } finally {
      setSubiendo(false);
    }
  };

  const hacerFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permiso denegado", "Necesitas permitir el acceso a la cámara.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6 });
    if (!res.canceled) setFoto(res.assets[0].uri);
  };

  const eliminarCafe = (item) => {
    Alert.alert("Eliminar", `¿Eliminar "${item.nombre}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        try {
          await deleteDocument("cafes", item.id);
          cargarDatos();
        } catch (e) {
          Alert.alert("Error", "No se pudo eliminar");
        }
      }}
    ]);
  };

  const StarRow = ({ value, onPress, size = 32 }) => (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1,2,3,4,5].map(s => (
        <TouchableOpacity key={s} onPress={() => onPress && onPress(s)} disabled={!onPress}>
          <Ionicons
            name={s <= value ? "star" : "star-outline"}
            size={size}
            color={s <= value ? "#c8860a" : "#4a3520"}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  // ── PANTALLA: ESCÁNER ──────────────────────────────────────────────────────
  if (!permission?.granted) {
    return (
      <View style={s.permissionScreen}>
        <StatusBar barStyle="light-content" />
        <Ionicons name="cafe" size={72} color="#c8860a" />
        <Text style={s.permTitle}>CaféLog necesita la cámara</Text>
        <Text style={s.permSub}>Para escanear paquetes de café y hacer fotos</Text>
        <TouchableOpacity style={s.goldBtn} onPress={requestPermission}>
          <Text style={s.goldBtnText}>Activar cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── PANTALLA: FORMULARIO ───────────────────────────────────────────────────
  if (scanned) {
    return (
      <View style={s.screen}>
        <StatusBar barStyle="light-content" />
        <ScrollView contentContainerStyle={s.formScroll}>
          <TouchableOpacity onPress={() => setScanned(false)} style={s.backRow}>
            <Ionicons name="chevron-back" size={20} color="#c8860a" />
            <Text style={s.backText}>Volver</Text>
          </TouchableOpacity>

          <Text style={s.formTitle}>Nuevo café</Text>

          {foto
            ? <Image source={{ uri: foto }} style={s.fotoPreview} />
            : (
              <TouchableOpacity style={s.fotoPlaceholder} onPress={hacerFoto}>
                <Ionicons name="camera" size={32} color="#c8860a" />
                <Text style={s.fotoPlaceholderText}>Hacer foto</Text>
              </TouchableOpacity>
            )
          }
          {foto && (
            <TouchableOpacity onPress={hacerFoto} style={s.retakeBtn}>
              <Text style={s.retakeText}>Cambiar foto</Text>
            </TouchableOpacity>
          )}

          <Text style={s.label}>Nombre del café</Text>
          <TextInput
            style={s.input}
            placeholder="Ej: Yirgacheffe Etiopía"
            placeholderTextColor="#6a4f30"
            value={nombreCafe}
            onChangeText={setNombreCafe}
          />

          <Text style={s.label}>Origen / Tostado</Text>
          <TextInput
            style={s.input}
            placeholder="Ej: Tostado medio · Floral, cítrico"
            placeholderTextColor="#6a4f30"
            value={origen}
            onChangeText={setOrigen}
          />

          <Text style={s.label}>Puntuación</Text>
          <View style={{ marginBottom: 20 }}>
            <StarRow value={rating} onPress={setRating} />
          </View>

          <Text style={s.label}>Notas de cata</Text>
          <TextInput
            style={[s.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Aromas, sabores, acidez, cuerpo..."
            placeholderTextColor="#6a4f30"
            value={notas}
            onChangeText={setNotas}
            multiline
          />

          <TouchableOpacity style={s.goldBtn} onPress={guardarCafe} disabled={subiendo}>
            {subiendo
              ? <ActivityIndicator color="#1a1008" />
              : <Text style={s.goldBtnText}>Guardar café</Text>
            }
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── PANTALLA: PRINCIPAL ────────────────────────────────────────────────────
  return (
    <View style={s.screen}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={s.header}>
        <Text style={s.logo}>CaféLog</Text>
        <TouchableOpacity style={s.scanBtn} onPress={() => setScanned(true)}>
          <Ionicons name="scan" size={16} color="#1a1008" />
          <Text style={s.scanBtnText}>Escanear</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={s.tabs}>
        {TABS.map(tab => (
          <TouchableOpacity key={tab} style={s.tab} onPress={() => setActiveTab(tab)}>
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
            {activeTab === tab && <View style={s.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* Contenido */}
      <ScrollView contentContainerStyle={s.scroll}>

        {/* TAB: INICIO */}
        {activeTab === 'Inicio' && (
          <View>
            <View style={s.heroCard}>
              <Ionicons name="cafe" size={40} color="#c8860a" />
              <Text style={s.heroTitle}>¿Qué café probamos hoy?</Text>
              <Text style={s.heroSub}>Escanea el paquete o añade manualmente</Text>
              <TouchableOpacity style={s.goldBtn} onPress={() => setScanned(true)}>
                <Text style={s.goldBtnText}>+ Añadir café</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.sectionLabel}>Últimos añadidos</Text>
            {cargando
              ? <ActivityIndicator color="#c8860a" style={{ marginTop: 20 }} />
              : misCafes.slice(0, 3).map(item => (
                <CafeCard key={item.id} item={item} onDelete={eliminarCafe} StarRow={StarRow} />
              ))
            }
            {misCafes.length === 0 && !cargando && (
              <Text style={s.empty}>Aún no hay cafés. ¡Añade el primero!</Text>
            )}
          </View>
        )}

        {/* TAB: MIS CAFÉS */}
        {activeTab === 'Mis Cafés' && (
          <View>
            <Text style={s.sectionLabel}>{misCafes.length} cafés en tu colección</Text>
            {cargando
              ? <ActivityIndicator color="#c8860a" style={{ marginTop: 20 }} />
              : misCafes.map(item => (
                <CafeCard key={item.id} item={item} onDelete={eliminarCafe} StarRow={StarRow} />
              ))
            }
            {misCafes.length === 0 && !cargando && (
              <Text style={s.empty}>Tu colección está vacía. ¡Empieza a explorar!</Text>
            )}
          </View>
        )}

        {/* TAB: RANKING */}
        {activeTab === 'Ranking' && (
          <View>
            <Text style={s.sectionLabel}>Top cafés más votados</Text>
            {cargando
              ? <ActivityIndicator color="#c8860a" style={{ marginTop: 20 }} />
              : topCafes.map((c, i) => (
                <View key={c.id} style={s.rankCard}>
                  <Text style={s.rankNum}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rankName}>{c.nombre}</Text>
                    <Text style={s.rankVotos}>{c.votos} {c.votos === 1 ? 'voto' : 'votos'}</Text>
                  </View>
                  <Ionicons name="trophy" size={20} color={i === 0 ? '#c8860a' : i === 1 ? '#9a9a9a' : i === 2 ? '#cd7f32' : '#3a2510'} />
                </View>
              ))
            }
            {topCafes.length === 0 && !cargando && (
              <Text style={s.empty}>Aún no hay votos en el ranking</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── COMPONENTE: TARJETA DE CAFÉ ────────────────────────────────────────────
function CafeCard({ item, onDelete, StarRow }) {
  return (
    <View style={s.card}>
      <View style={s.cardImgWrap}>
        {item.foto
          ? <Image source={{ uri: item.foto }} style={s.cardImg} />
          : <Ionicons name="cafe" size={28} color="#c8860a" />
        }
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.cardName}>{item.nombre}</Text>
        {item.origen ? <Text style={s.cardOrigin}>{item.origen}</Text> : null}
        <StarRow value={item.puntuacion} size={14} />
        {item.notas ? <Text style={s.cardNotas} numberOfLines={2}>{item.notas}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <View style={s.ratingBadge}>
          <Text style={s.ratingBadgeText}>{item.puntuacion}.0</Text>
        </View>
        <TouchableOpacity onPress={() => onDelete(item)}>
          <Ionicons name="trash-outline" size={18} color="#6a4f30" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── ESTILOS ────────────────────────────────────────────────────────────────
const BG      = '#1a1008';
const SURFACE = '#261a0a';
const GOLD    = '#c8860a';
const TEXT    = '#f5e6c8';
const MUTED   = '#9a7a50';
const BORDER  = 'rgba(200,134,10,0.15)';

const s = StyleSheet.create({
  screen:         { flex: 1, backgroundColor: BG },
  permissionScreen:{ flex: 1, backgroundColor: BG, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  permTitle:      { color: TEXT, fontSize: 22, fontWeight: '600', textAlign: 'center' },
  permSub:        { color: MUTED, fontSize: 15, textAlign: 'center' },
  header:         { paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  logo:           { color: TEXT, fontSize: 24, fontWeight: '600', letterSpacing: 1 },
  scanBtn:        { backgroundColor: GOLD, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 14 },
  scanBtnText:    { color: BG, fontSize: 13, fontWeight: '600' },
  tabs:           { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: BORDER, marginHorizontal: 20 },
  tab:            { flex: 1, alignItems: 'center', paddingBottom: 10 },
  tabText:        { color: MUTED, fontSize: 13, fontWeight: '500' },
  tabTextActive:  { color: GOLD },
  tabIndicator:   { position: 'absolute', bottom: 0, height: 2, width: '60%', backgroundColor: GOLD, borderRadius: 2 },
  scroll:         { padding: 20, paddingBottom: 40 },
  heroCard:       { backgroundColor: SURFACE, borderRadius: 20, padding: 24, alignItems: 'center', gap: 10, marginBottom: 24, borderWidth: 0.5, borderColor: BORDER },
  heroTitle:      { color: TEXT, fontSize: 20, fontWeight: '600', textAlign: 'center' },
  heroSub:        { color: MUTED, fontSize: 14, textAlign: 'center', marginBottom: 4 },
  sectionLabel:   { color: MUTED, fontSize: 12, fontWeight: '500', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 12 },
  card:           { backgroundColor: SURFACE, borderRadius: 16, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 10, borderWidth: 0.5, borderColor: BORDER },
  cardImgWrap:    { width: 56, height: 68, borderRadius: 10, backgroundColor: '#3a2510', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardImg:        { width: 56, height: 68, borderRadius: 10 },
  cardName:       { color: TEXT, fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardOrigin:     { color: MUTED, fontSize: 12, marginBottom: 6 },
  cardNotas:      { color: MUTED, fontSize: 12, marginTop: 5, lineHeight: 17 },
  ratingBadge:    { backgroundColor: GOLD, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  ratingBadgeText:{ color: BG, fontSize: 12, fontWeight: '700' },
  rankCard:       { backgroundColor: SURFACE, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8, borderWidth: 0.5, borderColor: BORDER },
  rankNum:        { color: GOLD, fontSize: 22, fontWeight: '700', width: 28 },
  rankName:       { color: TEXT, fontSize: 15, fontWeight: '500' },
  rankVotos:      { color: MUTED, fontSize: 12, marginTop: 2 },
  empty:          { color: MUTED, textAlign: 'center', marginTop: 40, fontSize: 14 },
  formScroll:     { padding: 20, paddingTop: 56, paddingBottom: 50 },
  backRow:        { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20 },
  backText:       { color: GOLD, fontSize: 15 },
  formTitle:      { color: TEXT, fontSize: 26, fontWeight: '700', marginBottom: 20 },
  fotoPreview:    { width: '100%', height: 200, borderRadius: 16, marginBottom: 8 },
  fotoPlaceholder:{ backgroundColor: SURFACE, borderRadius: 16, height: 140, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20, borderWidth: 0.5, borderColor: BORDER },
  fotoPlaceholderText: { color: MUTED, fontSize: 14 },
  retakeBtn:      { alignSelf: 'flex-end', marginBottom: 20 },
  retakeText:     { color: GOLD, fontSize: 13 },
  label:          { color: MUTED, fontSize: 12, fontWeight: '500', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
  input:          { backgroundColor: SURFACE, color: TEXT, borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 18, borderWidth: 0.5, borderColor: BORDER },
  goldBtn:        { backgroundColor: GOLD, borderRadius: 30, padding: 16, alignItems: 'center', marginTop: 8 },
  goldBtnText:    { color: BG, fontWeight: '700', fontSize: 15 },
});
