// ─────────────────────────────────────────────────────────────────────────────
//  App.js — Etiove ☕
// ─────────────────────────────────────────────────────────────────────────────

import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState, createContext, useContext } from 'react';
import {
  ActivityIndicator, Alert, Dimensions, Image, Modal, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, TouchableOpacity,
  View, SafeAreaView, KeyboardAvoidingView, Platform, Switch,
} from 'react-native';

import {
  addDocument, deleteDocument, getCollection, getDocument,
  getUserCafes, setDocument, updateDocument,
  loginUser, registerUser, resetPassword,
} from './firebaseConfig';

const { width: W, height: H } = Dimensions.get('window');

// ─── CLAVES SECURE STORE ──────────────────────────────────────────────────────
const KEY_EMAIL    = 'etiove_email';
const KEY_PASSWORD = 'etiove_password';
const KEY_REMEMBER = 'etiove_remember';

// ─── CONTEXTO ─────────────────────────────────────────────────────────────────
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// ─── STARS ────────────────────────────────────────────────────────────────────
function Stars({ value, onPress, size = 14 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1,2,3,4,5].map(s => (
        <TouchableOpacity key={s} onPress={() => onPress?.(s)} disabled={!onPress}>
          <Ionicons name={s <= value ? 'star' : 'star-outline'} size={size} color={s <= value ? '#e8590c' : '#ccc'} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── PANTALLA DETALLE CAFÉ (estilo Vivino) ────────────────────────────────────
function CafeDetailScreen({ cafe, onClose, onDelete }) {
  if (!cafe) return null;
  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar barStyle="dark-content" />
        <ScrollView showsVerticalScrollIndicator={false}>

          {/* FOTO HERO */}
          <View style={det.hero}>
            {cafe.foto
              ? <Image source={{ uri: cafe.foto }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              : <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#f5f0eb', alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="cafe" size={80} color="#e8590c" />
                </View>
            }
            {/* Gradiente simulado */}
            <View style={det.heroGrad} />
            <TouchableOpacity style={det.backBtn} onPress={onClose}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            {onDelete && (
              <TouchableOpacity style={det.deleteBtn} onPress={() => onDelete(cafe)}>
                <Ionicons name="trash-outline" size={20} color="#fff" />
              </TouchableOpacity>
            )}
            {/* Puntuación sobre la foto */}
            <View style={det.scoreBox}>
              <Text style={det.scoreNum}>{cafe.puntuacion}.0</Text>
              <Stars value={cafe.puntuacion} size={16} />
              <Text style={det.scoreVotos}>{cafe.votos || 0} valoraciones</Text>
            </View>
          </View>

          {/* CUERPO */}
          <View style={det.body}>

            {/* Nombre y origen */}
            <Text style={det.nombre}>{cafe.nombre}</Text>
            {cafe.finca && <Text style={det.finca}>{cafe.finca}</Text>}
            <View style={det.originRow}>
              {cafe.pais && <Text style={det.originText}>🌍 {cafe.pais}{cafe.region ? `, ${cafe.region}` : ''}</Text>}
            </View>

            {/* Chips rápidos */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={det.chipsWrap}>
              {cafe.variedad   && <Chip label={cafe.variedad} icon="leaf-outline" />}
              {cafe.proceso    && <Chip label={cafe.proceso} icon="water-outline" />}
              {cafe.tueste     && <Chip label={`Tueste ${cafe.tueste}`} icon="flame-outline" />}
              {cafe.altura     && <Chip label={`${cafe.altura} msnm`} icon="trending-up-outline" />}
            </ScrollView>

            {/* SCA Score */}
            {cafe.sca && (
              <View style={det.scaBox}>
                <View style={det.scaLeft}>
                  <Text style={det.scaScore}>{cafe.sca}</Text>
                  <Text style={det.scaLabel}>Puntuación SCA</Text>
                </View>
                <View style={det.scaBar}>
                  <View style={[det.scaFill, { width: `${((cafe.sca - 80) / 20) * 100}%` }]} />
                </View>
                <Text style={det.scaCat}>{cafe.sca >= 90 ? '☕ Excepcional' : cafe.sca >= 85 ? '⭐ Excelente' : '✓ Especialidad'}</Text>
              </View>
            )}

            {/* Divider */}
            <View style={det.divider} />

            {/* Perfil sensorial */}
            <Text style={det.sectionTitle}>Perfil sensorial</Text>
            {cafe.notas && (
              <View style={det.notasBox}>
                <Text style={det.notasLabel}>Notas de cata</Text>
                <Text style={det.notasText}>{cafe.notas}</Text>
              </View>
            )}
            <View style={det.sensRow}>
              {cafe.acidez && <SensItem label="Acidez" value={cafe.acidez} icon="flash-outline" />}
              {cafe.cuerpo && <SensItem label="Cuerpo" value={cafe.cuerpo} icon="fitness-outline" />}
              {cafe.regusto && <SensItem label="Regusto" value={cafe.regusto} icon="time-outline" />}
            </View>

            <View style={det.divider} />

            {/* Origen y proceso */}
            <Text style={det.sectionTitle}>Origen y proceso</Text>
            <InfoRow icon="location-outline"   label="País / Región"  value={[cafe.pais, cafe.region].filter(Boolean).join(', ')} />
            <InfoRow icon="person-outline"     label="Productor"      value={cafe.productor} />
            <InfoRow icon="home-outline"       label="Finca"          value={cafe.finca} />
            <InfoRow icon="trending-up-outline" label="Altura"        value={cafe.altura ? `${cafe.altura} msnm` : null} />
            <InfoRow icon="leaf-outline"       label="Variedad"       value={cafe.variedad} />
            <InfoRow icon="water-outline"      label="Proceso"        value={cafe.proceso} />
            <InfoRow icon="sunny-outline"      label="Secado"         value={cafe.secado} />

            <View style={det.divider} />

            {/* Tueste */}
            <Text style={det.sectionTitle}>Tueste</Text>
            <InfoRow icon="flame-outline"    label="Nivel"        value={cafe.tueste} />
            <InfoRow icon="calendar-outline" label="Fecha tueste" value={cafe.fechaTueste} />

            {/* Preparación */}
            {cafe.preparacion && (
              <>
                <View style={det.divider} />
                <Text style={det.sectionTitle}>Preparación recomendada</Text>
                <View style={det.prepBox}>
                  <Ionicons name="cafe-outline" size={20} color="#e8590c" />
                  <Text style={det.prepText}>{cafe.preparacion}</Text>
                </View>
              </>
            )}

            {/* Certificaciones */}
            {cafe.certificaciones && (
              <>
                <View style={det.divider} />
                <Text style={det.sectionTitle}>Certificaciones</Text>
                <Text style={det.certText}>{cafe.certificaciones}</Text>
              </>
            )}

            {/* Precio */}
            {cafe.precio && (
              <View style={det.precioBox}>
                <Text style={det.precioLabel}>Precio orientativo</Text>
                <Text style={det.precioVal}>{cafe.precio}€ / 100g</Text>
              </View>
            )}

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Chip({ label, icon }) {
  return (
    <View style={det.chip}>
      <Ionicons name={icon} size={12} color="#e8590c" />
      <Text style={det.chipText}>{label}</Text>
    </View>
  );
}

function SensItem({ label, value, icon }) {
  return (
    <View style={det.sensItem}>
      <Ionicons name={icon} size={18} color="#e8590c" />
      <Text style={det.sensLabel}>{label}</Text>
      <Text style={det.sensVal}>{value}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <View style={det.infoRow}>
      <Ionicons name={icon} size={16} color="#e8590c" style={{ width: 22 }} />
      <Text style={det.infoLabel}>{label}</Text>
      <Text style={det.infoVal}>{value}</Text>
    </View>
  );
}

// ─── CARD HORIZONTAL (tappable) ───────────────────────────────────────────────
function CardHorizontal({ item, badge, onPress }) {
  return (
    <TouchableOpacity style={s.cardH} onPress={() => onPress?.(item)} activeOpacity={0.85}>
      <View style={s.cardHImg}>
        {item.foto
          ? <Image source={{ uri: item.foto }} style={StyleSheet.absoluteFillObject} borderRadius={10} resizeMode="cover" />
          : <Ionicons name="cafe" size={36} color="#ccc" />
        }
        <View style={s.badgeRed}><Text style={s.badgeText}>{badge}</Text></View>
      </View>
      <Text style={s.cardHOrigin} numberOfLines={1}>{item.region || item.origen || 'Sin origen'}</Text>
      <Text style={s.cardHName} numberOfLines={2}>{item.nombre}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
        <Ionicons name="star" size={13} color="#e8590c" />
        <Text style={s.cardHRating}>{item.puntuacion}.0</Text>
        <Text style={s.cardHVotos}>({item.votos || 1})</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── CARD VERTICAL (tappable) ─────────────────────────────────────────────────
function CardVertical({ item, onDelete, onPress }) {
  return (
    <TouchableOpacity style={s.cardV} onPress={() => onPress?.(item)} activeOpacity={0.85}>
      <View style={s.cardVImg}>
        {item.foto
          ? <Image source={{ uri: item.foto }} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" />
          : <Ionicons name="cafe" size={32} color="#ccc" />
        }
        <View style={s.badgeRed}><Text style={s.badgeText}>{item.puntuacion}.0</Text></View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.cardVOrigin}>{item.region || item.origen || 'Sin origen'}</Text>
        <Text style={s.cardVName}>{item.nombre}</Text>
        <Stars value={item.puntuacion} />
        {item.notas ? <Text style={s.cardVNotas} numberOfLines={2}>{item.notas}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => onDelete(item)} style={{ padding: 4 }}>
        <Ionicons name="trash-outline" size={18} color="#ccc" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function TabBtn({ icon, label, tab, active, onPress }) {
  const isActive = active === tab;
  return (
    <TouchableOpacity style={s.tabBtn} onPress={() => onPress(tab)}>
      <Ionicons name={isActive ? icon : `${icon}-outline`} size={22} color={isActive ? '#e8590c' : '#888'} />
      <Text style={[s.tabLabel, isActive && { color: '#e8590c' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── PANTALLA DE BIENVENIDA ───────────────────────────────────────────────────
function WelcomeScreen() {
  return (
    <SafeAreaView style={s.welcomeScreen}>
      <StatusBar barStyle="light-content" backgroundColor="#1a0a00" />
      <Ionicons name="cafe" size={80} color="#e8590c" />
      <Text style={s.welcomeTitle}>Etiove</Text>
      <Text style={s.welcomeSub}>Tu colección de cafés</Text>
    </SafeAreaView>
  );
}

// ─── AUTH SCREEN ──────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [modo, setModo]         = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [recordar, setRecordar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [faceIdDisponible, setFaceIdDisponible] = useState(false);
  const [faceIdGuardado, setFaceIdGuardado]     = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled   = await LocalAuthentication.isEnrolledAsync();
        setFaceIdDisponible(compatible && enrolled);
        const savedRemember = await SecureStore.getItemAsync(KEY_REMEMBER);
        if (savedRemember === 'true') {
          const savedEmail    = await SecureStore.getItemAsync(KEY_EMAIL);
          const savedPassword = await SecureStore.getItemAsync(KEY_PASSWORD);
          if (savedEmail && savedPassword) {
            setEmail(savedEmail); setPassword(savedPassword);
            setRecordar(true); setFaceIdGuardado(true);
          }
        }
      } catch (e) { console.warn('Error credenciales:', e); }
    };
    init();
  }, []);

  const guardarCredenciales = async (em, pw) => {
    await SecureStore.setItemAsync(KEY_EMAIL, em);
    await SecureStore.setItemAsync(KEY_PASSWORD, pw);
    await SecureStore.setItemAsync(KEY_REMEMBER, 'true');
  };

  const borrarCredenciales = async () => {
    await SecureStore.deleteItemAsync(KEY_EMAIL);
    await SecureStore.deleteItemAsync(KEY_PASSWORD);
    await SecureStore.setItemAsync(KEY_REMEMBER, 'false');
    setFaceIdGuardado(false);
  };

  const handleSubmit = async () => {
    if (!email.trim() || (!password.trim() && modo !== 'reset')) return Alert.alert('Aviso', 'Rellena todos los campos');
    setCargando(true);
    try {
      if (modo === 'login') {
        const user = await loginUser(email.trim(), password);
        if (recordar) await guardarCredenciales(email.trim(), password);
        else await borrarCredenciales();
        onAuth(user);
      } else if (modo === 'register') {
        const user = await registerUser(email.trim(), password);
        onAuth(user);
      } else {
        await resetPassword(email.trim());
        Alert.alert('✅ Email enviado', 'Revisa tu bandeja de entrada');
        setModo('login');
      }
    } catch (e) { Alert.alert('Error', e.message || 'Algo salió mal'); }
    finally { setCargando(false); }
  };

  const handleFaceId = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({ promptMessage: 'Accede a Etiove', fallbackLabel: 'Usar contraseña' });
      if (result.success) {
        const savedEmail    = await SecureStore.getItemAsync(KEY_EMAIL);
        const savedPassword = await SecureStore.getItemAsync(KEY_PASSWORD);
        if (!savedEmail || !savedPassword) return Alert.alert('Aviso', 'Primero inicia sesión con email y activa "Recordarme"');
        setCargando(true);
        const user = await loginUser(savedEmail, savedPassword);
        onAuth(user);
      }
    } catch (e) { Alert.alert('Error', 'No se pudo autenticar con Face ID'); }
    finally { setCargando(false); }
  };

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.authScroll}>
          <Ionicons name="cafe" size={64} color="#e8590c" style={{ marginBottom: 8 }} />
          <Text style={s.authTitle}>Etiove ☕</Text>
          <Text style={s.authSub}>
            {modo === 'login' ? 'Inicia sesión para continuar' : modo === 'register' ? 'Crea tu cuenta gratuita' : 'Recupera tu contraseña'}
          </Text>

          <Text style={s.label}>Email</Text>
          <TextInput style={s.input} placeholder="tu@email.com" placeholderTextColor="#bbb" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />

          {modo !== 'reset' && (
            <>
              <Text style={s.label}>Contraseña</Text>
              <TextInput style={s.input} placeholder="Mínimo 6 caracteres" placeholderTextColor="#bbb" value={password} onChangeText={setPassword} secureTextEntry />
            </>
          )}

          {modo === 'login' && (
            <View style={s.rememberRow}>
              <Switch value={recordar} onValueChange={val => { setRecordar(val); if (!val) borrarCredenciales(); }} trackColor={{ false: '#ddd', true: '#e8590c' }} thumbColor="#fff" />
              <Text style={s.rememberText}>Recordar contraseña</Text>
            </View>
          )}

          <TouchableOpacity style={s.redBtn} onPress={handleSubmit} disabled={cargando}>
            {cargando ? <ActivityIndicator color="#fff" /> : <Text style={s.redBtnText}>{modo === 'login' ? 'Entrar' : modo === 'register' ? 'Crear cuenta' : 'Enviar enlace'}</Text>}
          </TouchableOpacity>

          {modo === 'login' && faceIdDisponible && faceIdGuardado && (
            <TouchableOpacity style={s.faceIdBtn} onPress={handleFaceId} disabled={cargando}>
              <Ionicons name="scan-outline" size={22} color="#e8590c" />
              <Text style={s.faceIdText}>Entrar con Face ID</Text>
            </TouchableOpacity>
          )}

          <View style={s.authLinks}>
            {modo === 'login' && (
              <>
                <TouchableOpacity onPress={() => setModo('register')}><Text style={s.authLink}>¿Sin cuenta? Regístrate</Text></TouchableOpacity>
                <TouchableOpacity onPress={() => setModo('reset')}><Text style={[s.authLink, { color: '#888' }]}>¿Olvidaste la contraseña?</Text></TouchableOpacity>
              </>
            )}
            {modo !== 'login' && <TouchableOpacity onPress={() => setModo('login')}><Text style={s.authLink}>← Volver al inicio de sesión</Text></TouchableOpacity>}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── ESCÁNER MEJORADO (estilo Vivino) ─────────────────────────────────────────
function ScannerScreen({ onScanned, onSkip, onBack }) {
  const [scanned, setScanned] = useState(false);

  const handleBarcode = (result) => {
    if (scanned) return;
    setScanned(true);
    onScanned(result);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />
      <CameraView onBarcodeScanned={handleBarcode} style={StyleSheet.absoluteFillObject} barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'qr', 'code128'] }} />

      {/* Overlay oscuro con ventana transparente */}
      <View style={scan.overlay}>
        <View style={scan.top} />
        <View style={scan.middle}>
          <View style={scan.side} />
          <View style={scan.window}>
            {/* Esquinas del marco */}
            <View style={[scan.corner, scan.tl]} />
            <View style={[scan.corner, scan.tr]} />
            <View style={[scan.corner, scan.bl]} />
            <View style={[scan.corner, scan.br]} />
            {/* Línea de escaneo animada */}
            <View style={scan.scanLine} />
          </View>
          <View style={scan.side} />
        </View>
        <View style={scan.bottom}>
          <Text style={scan.hint}>Coloca la etiqueta del café dentro del marco</Text>
          <View style={scan.tabs}>
            <TouchableOpacity style={scan.tabActive}>
              <Text style={scan.tabTextActive}>Etiqueta del café</Text>
            </TouchableOpacity>
            <TouchableOpacity style={scan.tabInactive} onPress={onSkip}>
              <Text style={scan.tabTextInactive}>Añadir manual</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Botón volver */}
      <TouchableOpacity style={scan.backBtn} onPress={onBack}>
        <Ionicons name="close" size={28} color="#fff" />
      </TouchableOpacity>

      {/* Botón galería */}
      <TouchableOpacity style={scan.galleryBtn} onPress={onSkip}>
        <Ionicons name="images-outline" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── FORMULARIO ───────────────────────────────────────────────────────────────
function FormScreen({ onSave, onBack }) {
  const { user } = useAuth();
  const [nombreCafe, setNombreCafe] = useState('');
  const [origen, setOrigen]         = useState('');
  const [notas, setNotas]           = useState('');
  const [rating, setRating]         = useState(0);
  const [foto, setFoto]             = useState(null);
  const [subiendo, setSubiendo]     = useState(false);

  const hacerFoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permiso denegado', 'Necesitas permitir la cámara.'); return; }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6 });
    if (!res.canceled) setFoto(res.assets[0].uri);
  };

  const guardarCafe = async () => {
    if (!nombreCafe.trim()) return Alert.alert('Aviso', 'Escribe el nombre del café');
    setSubiendo(true);
    try {
      await addDocument('cafes', { nombre: nombreCafe.trim(), origen: origen.trim(), puntuacion: rating, notas, foto: foto || '', fecha: new Date().toISOString(), uid: user.uid });
      const rankId = nombreCafe.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_');
      const existente = await getDocument('ranking', rankId);
      if (existente) await updateDocument('ranking', rankId, { votos: (existente.votos || 0) + 1 });
      else await setDocument('ranking', rankId, { nombre: nombreCafe.trim(), votos: 1 });
      Alert.alert('✅ Guardado', 'Café añadido a tu colección');
      onSave();
    } catch (e) { Alert.alert('Error', 'No se pudo conectar con Firebase'); }
    finally { setSubiendo(false); }
  };

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={s.formScroll}>
        <TouchableOpacity onPress={onBack} style={s.backRow}>
          <Ionicons name="chevron-back" size={20} color="#e8590c" />
          <Text style={s.backText}>Volver</Text>
        </TouchableOpacity>
        <Text style={s.formTitle}>Nuevo café</Text>

        <TouchableOpacity style={foto ? {} : s.fotoEmpty} onPress={hacerFoto}>
          {foto ? <Image source={{ uri: foto }} style={s.fotoFull} /> : <><Ionicons name="camera-outline" size={32} color="#aaa" /><Text style={s.fotoEmptyText}>Añadir foto</Text></>}
        </TouchableOpacity>
        {foto && <TouchableOpacity onPress={hacerFoto}><Text style={s.retake}>Cambiar foto</Text></TouchableOpacity>}

        <Text style={s.label}>Nombre del café</Text>
        <TextInput style={s.input} placeholder="Ej: Yirgacheffe Etiopía" placeholderTextColor="#bbb" value={nombreCafe} onChangeText={setNombreCafe} />
        <Text style={s.label}>Origen / Tostado</Text>
        <TextInput style={s.input} placeholder="Ej: Etiopía · Tostado medio · Floral" placeholderTextColor="#bbb" value={origen} onChangeText={setOrigen} />
        <Text style={s.label}>Puntuación</Text>
        <View style={{ marginBottom: 20 }}><Stars value={rating} onPress={setRating} size={32} /></View>
        <Text style={s.label}>Notas de cata</Text>
        <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Aromas, sabores, acidez..." placeholderTextColor="#bbb" value={notas} onChangeText={setNotas} multiline />

        <TouchableOpacity style={s.redBtn} onPress={guardarCafe} disabled={subiendo}>
          {subiendo ? <ActivityIndicator color="#fff" /> : <Text style={s.redBtnText}>Guardar café</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
function MainScreen({ onLogout }) {
  const { user }                  = useAuth();
  const [activeTab, setActiveTab] = useState('Inicio');
  const [scanning, setScanning]   = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [misCafes, setMisCafes]   = useState([]);
  const [topCafes, setTopCafes]   = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [busqueda, setBusqueda]   = useState('');
  const [cafeDetalle, setCafeDetalle] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const cafes   = await getUserCafes(user.uid);
      const ranking = await getCollection('cafes', 'puntuacion', 10);
      setMisCafes(cafes);
      setTopCafes(ranking);
    } catch (e) { console.error('Error de carga:', e); }
    finally { setCargando(false); }
  };

  useEffect(() => { cargarDatos(); }, []);

  const eliminarCafe = (item) => {
    Alert.alert('Eliminar', `¿Eliminar "${item.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await deleteDocument('cafes', item.id); setCafeDetalle(null); cargarDatos(); }
        catch { Alert.alert('Error', 'No se pudo eliminar'); }
      }},
    ]);
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: onLogout },
    ]);
  };

  if (!permission?.granted) {
    return (
      <SafeAreaView style={s.permScreen}>
        <Ionicons name="cafe" size={72} color="#e8590c" />
        <Text style={s.permTitle}>Etiove necesita la cámara</Text>
        <Text style={s.permSub}>Para escanear paquetes de café</Text>
        <TouchableOpacity style={s.redBtn} onPress={requestPermission}><Text style={s.redBtnText}>Activar cámara</Text></TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (scanning) return <ScannerScreen onScanned={() => { setScanning(false); setShowForm(true); }} onSkip={() => { setScanning(false); setShowForm(true); }} onBack={() => setScanning(false)} />;
  if (showForm) return <FormScreen onBack={() => setShowForm(false)} onSave={() => { setShowForm(false); setActiveTab('Mis Cafés'); cargarDatos(); }} />;

  const cafesFiltrados = misCafes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.origen || c.region || '')?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Detalle café */}
      {cafeDetalle && (
        <CafeDetailScreen
          cafe={cafeDetalle}
          onClose={() => setCafeDetalle(null)}
          onDelete={cafeDetalle.uid === user.uid ? eliminarCafe : null}
        />
      )}

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {/* ── INICIO ── */}
        {activeTab === 'Inicio' && (
          <View>
            <View style={s.topBar}>
              <View style={s.locationPill}><Text style={s.locationText}>🇪🇸  Etiove</Text></View>
              <TouchableOpacity onPress={handleLogout}><Ionicons name="log-out-outline" size={24} color="#888" /></TouchableOpacity>
            </View>
            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={18} color="#999" />
              <TextInput style={s.searchInput} placeholder="Buscar cualquier café" placeholderTextColor="#999" value={busqueda} onChangeText={setBusqueda} />
            </View>

            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Últimos añadidos</Text>
              <TouchableOpacity onPress={() => setActiveTab('Mis Cafés')}><Ionicons name="chevron-forward" size={20} color="#555" /></TouchableOpacity>
            </View>
            <Text style={s.sectionSub}>Tu colección · {misCafes.length} cafés</Text>
            {cargando ? <ActivityIndicator color="#e8590c" style={{ margin: 30 }} /> : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
                {misCafes.slice(0, 5).map(item => <CardHorizontal key={item.id} item={item} badge={`${item.puntuacion}.0`} onPress={setCafeDetalle} />)}
                {misCafes.length === 0 && <Text style={[s.empty, { marginLeft: 0 }]}>Aún no hay cafés. ¡Añade el primero!</Text>}
              </ScrollView>
            )}

            <View style={[s.sectionHeader, { marginTop: 28 }]}>
              <Text style={s.sectionTitle}>Top cafés globales</Text>
              <TouchableOpacity onPress={() => setActiveTab('Ranking')}><Ionicons name="chevron-forward" size={20} color="#555" /></TouchableOpacity>
            </View>
            <Text style={s.sectionSub}>Los mejor puntuados de la comunidad</Text>
            {cargando ? <ActivityIndicator color="#e8590c" style={{ margin: 30 }} /> : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
                {topCafes.map(item => <CardHorizontal key={item.id} item={item} badge={`${item.puntuacion}.0 ⭐`} onPress={setCafeDetalle} />)}
                {topCafes.length === 0 && <Text style={[s.empty, { marginLeft: 0 }]}>Aún no hay cafés en la base de datos</Text>}
              </ScrollView>
            )}
          </View>
        )}

        {/* ── MIS CAFÉS ── */}
        {activeTab === 'Mis Cafés' && (
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            <Text style={s.pageTitle}>Mis Cafés</Text>
            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={18} color="#999" />
              <TextInput style={s.searchInput} placeholder="Buscar en tu colección" placeholderTextColor="#999" value={busqueda} onChangeText={setBusqueda} />
            </View>
            {cargando ? <ActivityIndicator color="#e8590c" style={{ margin: 30 }} /> : cafesFiltrados.map(item => <CardVertical key={item.id} item={item} onDelete={eliminarCafe} onPress={setCafeDetalle} />)}
            {!cargando && cafesFiltrados.length === 0 && <Text style={s.empty}>No se encontraron cafés</Text>}
          </View>
        )}

        {/* ── RANKING ── */}
        {activeTab === 'Ranking' && (
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            <Text style={s.pageTitle}>Top Cafés</Text>
            <Text style={[s.sectionSub, { marginBottom: 16 }]}>Los 10 mejores según puntuación</Text>
            {cargando ? <ActivityIndicator color="#e8590c" style={{ margin: 30 }} /> : topCafes.map((c, i) => (
              <TouchableOpacity key={c.id} style={s.rankRow} onPress={() => setCafeDetalle(c)} activeOpacity={0.8}>
                <Text style={[s.rankNum, i === 0 && { color: '#e8590c' }]}>{i + 1}</Text>
                {c.foto ? <Image source={{ uri: c.foto }} style={{ width: 44, height: 44, borderRadius: 8 }} resizeMode="cover" /> : <View style={{ width: 44, height: 44, borderRadius: 8, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="cafe" size={20} color="#ccc" /></View>}
                <View style={{ flex: 1 }}>
                  <Text style={s.rankName}>{c.nombre}</Text>
                  <Text style={s.rankVotos}>{c.region || c.origen || c.pais || ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#e8590c' }}>{c.puntuacion}.0</Text>
                  <Ionicons name="trophy" size={16} color={i === 0 ? '#e8590c' : i === 1 ? '#9a9a9a' : i === 2 ? '#cd7f32' : '#eee'} />
                </View>
              </TouchableOpacity>
            ))}
            {!cargando && topCafes.length === 0 && <Text style={s.empty}>Aún no hay cafés registrados</Text>}
          </View>
        )}
      </ScrollView>

      {/* BOTTOM BAR */}
      <View style={s.bottomBar}>
        <TabBtn icon="home"               label="Inicio"    tab="Inicio"    active={activeTab} onPress={setActiveTab} />
        <TabBtn icon="storefront"         label="Tienda"    tab="Tienda"    active={activeTab} onPress={setActiveTab} />
        <TouchableOpacity style={s.camBtn} onPress={() => setScanning(true)}>
          <Ionicons name="camera" size={28} color="#fff" />
        </TouchableOpacity>
        <TabBtn icon="cafe"               label="Mis Cafés" tab="Mis Cafés" active={activeTab} onPress={setActiveTab} />
        <TabBtn icon="ellipsis-horizontal" label="Ranking"  tab="Ranking"   active={activeTab} onPress={setActiveTab} />
      </View>
    </SafeAreaView>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]             = useState(null);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleAuth   = (userData) => setUser(userData);
  const handleLogout = () => setUser(null);

  if (showWelcome) return <WelcomeScreen />;

  return (
    <AuthContext.Provider value={{ user }}>
      {user ? <MainScreen onLogout={handleLogout} /> : <AuthScreen onAuth={handleAuth} />}
    </AuthContext.Provider>
  );
}

// ─── ESTILOS PRINCIPALES ──────────────────────────────────────────────────────
const s = StyleSheet.create({
  screen:        { flex: 1, backgroundColor: '#fff' },
  welcomeScreen: { flex: 1, backgroundColor: '#1a0a00', alignItems: 'center', justifyContent: 'center', gap: 16 },
  welcomeTitle:  { fontSize: 48, fontWeight: '800', color: '#fff', letterSpacing: 2 },
  welcomeSub:    { fontSize: 16, color: '#e8590c', fontWeight: '500', letterSpacing: 1 },
  permScreen:    { flex: 1, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  permTitle:     { fontSize: 22, fontWeight: '700', color: '#111', textAlign: 'center' },
  permSub:       { fontSize: 15, color: '#888', textAlign: 'center' },
  authScroll:    { padding: 32, paddingTop: 60, flexGrow: 1, justifyContent: 'center' },
  authTitle:     { fontSize: 32, fontWeight: '800', color: '#111', marginBottom: 6 },
  authSub:       { fontSize: 15, color: '#888', marginBottom: 32 },
  authLinks:     { marginTop: 20, gap: 12, alignItems: 'center' },
  authLink:      { color: '#e8590c', fontSize: 14, fontWeight: '500' },
  rememberRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  rememberText:  { fontSize: 14, color: '#555' },
  faceIdBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16, padding: 14, borderWidth: 1.5, borderColor: '#e8590c', borderRadius: 30 },
  faceIdText:    { color: '#e8590c', fontWeight: '600', fontSize: 15 },
  topBar:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  locationPill:  { borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  locationText:  { fontSize: 14, fontWeight: '500', color: '#222' },
  searchWrap:    { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginVertical: 10, backgroundColor: '#f5f5f5', borderRadius: 25, paddingHorizontal: 14, height: 44 },
  searchInput:   { flex: 1, fontSize: 15, color: '#222', marginLeft: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginTop: 20, marginBottom: 2 },
  sectionTitle:  { fontSize: 20, fontWeight: '700', color: '#111' },
  sectionSub:    { fontSize: 13, color: '#888', paddingHorizontal: 16, marginBottom: 14 },
  pageTitle:     { fontSize: 24, fontWeight: '700', color: '#111', marginBottom: 12 },
  empty:         { color: '#aaa', textAlign: 'center', marginTop: 40, fontSize: 14 },
  cardH:         { width: 160, marginRight: 4 },
  cardHImg:      { width: 160, height: 200, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' },
  cardHOrigin:   { fontSize: 12, color: '#888', marginBottom: 2 },
  cardHName:     { fontSize: 14, fontWeight: '700', color: '#111', lineHeight: 19 },
  cardHRating:   { fontSize: 13, fontWeight: '600', color: '#e8590c' },
  cardHVotos:    { fontSize: 12, color: '#888' },
  cardV:         { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  cardVImg:      { width: 80, height: 100, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
  cardVOrigin:   { fontSize: 12, color: '#888', marginBottom: 2 },
  cardVName:     { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 5 },
  cardVNotas:    { fontSize: 12, color: '#aaa', marginTop: 5, lineHeight: 17 },
  badgeRed:      { position: 'absolute', top: 8, left: 8, backgroundColor: '#e8590c', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText:     { color: '#fff', fontSize: 11, fontWeight: '700' },
  rankRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  rankNum:       { fontSize: 22, fontWeight: '700', color: '#ccc', width: 28 },
  rankName:      { fontSize: 15, fontWeight: '600', color: '#111' },
  rankVotos:     { fontSize: 12, color: '#888', marginTop: 2 },
  redBtn:        { backgroundColor: '#e8590c', borderRadius: 30, padding: 16, alignItems: 'center', marginTop: 8 },
  redBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
  bottomBar:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#eee', flexDirection: 'row', alignItems: 'center', paddingBottom: 20, paddingTop: 10 },
  tabBtn:        { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel:      { fontSize: 10, color: '#888' },
  camBtn:        { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e8590c', alignItems: 'center', justifyContent: 'center', marginTop: -20, shadowColor: '#e8590c', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  formScroll:    { padding: 20, paddingTop: 52, paddingBottom: 50 },
  backRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 20 },
  backText:      { color: '#e8590c', fontSize: 15 },
  formTitle:     { fontSize: 26, fontWeight: '700', color: '#111', marginBottom: 20 },
  fotoEmpty:     { backgroundColor: '#f5f5f5', borderRadius: 14, height: 140, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
  fotoEmptyText: { color: '#aaa', fontSize: 14 },
  fotoFull:      { width: '100%', height: 200, borderRadius: 14, marginBottom: 8 },
  retake:        { color: '#e8590c', fontSize: 13, textAlign: 'right', marginBottom: 20 },
  label:         { fontSize: 12, fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  input:         { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, fontSize: 15, color: '#111', marginBottom: 18 },
});

// ─── ESTILOS DETALLE ──────────────────────────────────────────────────────────
const det = StyleSheet.create({
  hero:        { width: W, height: H * 0.42, backgroundColor: '#f5f0eb' },
  heroGrad:    { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, backgroundColor: 'rgba(0,0,0,0.45)' },
  backBtn:     { position: 'absolute', top: 52, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center' },
  deleteBtn:   { position: 'absolute', top: 52, right: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(220,50,50,0.7)', alignItems: 'center', justifyContent: 'center' },
  scoreBox:    { position: 'absolute', bottom: 20, left: 20, gap: 4 },
  scoreNum:    { fontSize: 42, fontWeight: '800', color: '#fff' },
  scoreVotos:  { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  body:        { padding: 20 },
  nombre:      { fontSize: 26, fontWeight: '800', color: '#111', marginBottom: 4 },
  finca:       { fontSize: 15, color: '#555', marginBottom: 4 },
  originRow:   { marginBottom: 14 },
  originText:  { fontSize: 14, color: '#888' },
  chipsWrap:   { marginBottom: 20 },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff5f0', borderWidth: 1, borderColor: '#fdd', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, marginRight: 8 },
  chipText:    { fontSize: 12, color: '#e8590c', fontWeight: '600' },
  scaBox:      { backgroundColor: '#f9f9f9', borderRadius: 16, padding: 16, marginBottom: 20, gap: 8 },
  scaLeft:     { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  scaScore:    { fontSize: 36, fontWeight: '800', color: '#111' },
  scaLabel:    { fontSize: 13, color: '#888' },
  scaBar:      { height: 8, backgroundColor: '#eee', borderRadius: 4, overflow: 'hidden' },
  scaFill:     { height: '100%', backgroundColor: '#e8590c', borderRadius: 4 },
  scaCat:      { fontSize: 13, color: '#555', fontWeight: '600' },
  divider:     { height: 0.5, backgroundColor: '#eee', marginVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 14 },
  notasBox:    { backgroundColor: '#fff5f0', borderRadius: 12, padding: 14, marginBottom: 14 },
  notasLabel:  { fontSize: 11, fontWeight: '700', color: '#e8590c', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  notasText:   { fontSize: 15, color: '#333', lineHeight: 22 },
  sensRow:     { flexDirection: 'row', gap: 10 },
  sensItem:    { flex: 1, backgroundColor: '#f9f9f9', borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  sensLabel:   { fontSize: 11, color: '#888', fontWeight: '600' },
  sensVal:     { fontSize: 12, color: '#333', textAlign: 'center' },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  infoLabel:   { fontSize: 14, color: '#888', flex: 1 },
  infoVal:     { fontSize: 14, color: '#111', fontWeight: '500', flex: 2, textAlign: 'right' },
  prepBox:     { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff5f0', borderRadius: 12, padding: 14 },
  prepText:    { fontSize: 14, color: '#333', flex: 1 },
  certText:    { fontSize: 14, color: '#555', lineHeight: 22 },
  precioBox:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginTop: 20 },
  precioLabel: { fontSize: 14, color: '#888' },
  precioVal:   { fontSize: 20, fontWeight: '800', color: '#e8590c' },
});

// ─── ESTILOS ESCÁNER ──────────────────────────────────────────────────────────
const WINDOW_SIZE = W * 0.72;
const scan = StyleSheet.create({
  overlay:     { flex: 1 },
  top:         { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  middle:      { flexDirection: 'row', height: WINDOW_SIZE },
  side:        { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  window:      { width: WINDOW_SIZE, height: WINDOW_SIZE },
  bottom:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: 24, gap: 20 },
  hint:        { color: '#fff', fontSize: 15, textAlign: 'center', paddingHorizontal: 32 },
  tabs:        { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 25, padding: 4 },
  tabActive:   { backgroundColor: '#fff', borderRadius: 22, paddingHorizontal: 20, paddingVertical: 10 },
  tabInactive: { paddingHorizontal: 20, paddingVertical: 10 },
  tabTextActive:   { color: '#111', fontWeight: '700', fontSize: 14 },
  tabTextInactive: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  corner:      { position: 'absolute', width: 24, height: 24, borderColor: '#e8590c', borderWidth: 3 },
  tl:          { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  tr:          { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  bl:          { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  br:          { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  scanLine:    { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: '#e8590c', opacity: 0.8 },
  backBtn:     { position: 'absolute', top: 52, left: 16, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  galleryBtn:  { position: 'absolute', bottom: 60, left: 40, width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
});
