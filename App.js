// ─────────────────────────────────────────────────────────────────────────────
//  App.js — Etiove ☕
//  Autenticación con recordar sesión + Face ID, componentes separados
// ─────────────────────────────────────────────────────────────────────────────

import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState, createContext, useContext } from 'react';
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
  View,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';

import {
  addDocument,
  deleteDocument,
  getCollection,
  getDocument,
  getUserCafes,
  setDocument,
  updateDocument,
  loginUser,
  registerUser,
  resetPassword,
} from './firebaseConfig';

// ─── CLAVES DE ALMACENAMIENTO SEGURO ─────────────────────────────────────────
const KEY_EMAIL    = 'etiove_email';
const KEY_PASSWORD = 'etiove_password';
const KEY_REMEMBER = 'etiove_remember';

// ─── CONTEXTO DE AUTENTICACIÓN ────────────────────────────────────────────────
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

// ─── COMPONENTES REUTILIZABLES ────────────────────────────────────────────────

function Stars({ value, onPress, size = 14 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <TouchableOpacity key={s} onPress={() => onPress?.(s)} disabled={!onPress}>
          <Ionicons
            name={s <= value ? 'star' : 'star-outline'}
            size={size}
            color={s <= value ? '#e8590c' : '#ccc'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function CardHorizontal({ item, badge }) {
  return (
    <View style={s.cardH}>
      <View style={s.cardHImg}>
        {item.foto
          ? <Image source={{ uri: item.foto }} style={StyleSheet.absoluteFillObject} borderRadius={10} resizeMode="cover" />
          : <Ionicons name="cafe" size={36} color="#ccc" />
        }
        <View style={s.badgeRed}><Text style={s.badgeText}>{badge}</Text></View>
        <View style={s.cardDots}>
          <Ionicons name="ellipsis-horizontal" size={16} color="#555" />
        </View>
      </View>
      <Text style={s.cardHOrigin} numberOfLines={1}>{item.origen || 'Sin origen'}</Text>
      <Text style={s.cardHName} numberOfLines={2}>{item.nombre}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
        <Ionicons name="star" size={13} color="#e8590c" />
        <Text style={s.cardHRating}>{item.puntuacion}.0</Text>
        <Text style={s.cardHVotos}>({item.votos || 1})</Text>
      </View>
    </View>
  );
}

function CardVertical({ item, onDelete }) {
  return (
    <View style={s.cardV}>
      <View style={s.cardVImg}>
        {item.foto
          ? <Image source={{ uri: item.foto }} style={{ width: '100%', height: '100%', borderRadius: 10 }} resizeMode="cover" />
          : <Ionicons name="cafe" size={32} color="#ccc" />
        }
        <View style={s.badgeRed}><Text style={s.badgeText}>{item.puntuacion}.0</Text></View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.cardVOrigin}>{item.origen || 'Sin origen'}</Text>
        <Text style={s.cardVName}>{item.nombre}</Text>
        <Stars value={item.puntuacion} />
        {item.notas ? <Text style={s.cardVNotas} numberOfLines={2}>{item.notas}</Text> : null}
      </View>
      <TouchableOpacity onPress={() => onDelete(item)} style={{ padding: 4 }}>
        <Ionicons name="trash-outline" size={18} color="#ccc" />
      </TouchableOpacity>
    </View>
  );
}

function TabBtn({ icon, label, tab, active, onPress }) {
  const isActive = active === tab;
  return (
    <TouchableOpacity style={s.tabBtn} onPress={() => onPress(tab)}>
      <Ionicons
        name={isActive ? icon : `${icon}-outline`}
        size={22}
        color={isActive ? '#e8590c' : '#888'}
      />
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

// ─── PANTALLA DE LOGIN / REGISTRO ─────────────────────────────────────────────

function AuthScreen({ onAuth }) {
  const [modo, setModo]           = useState('login');
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [recordar, setRecordar]   = useState(false);
  const [cargando, setCargando]   = useState(false);
  const [faceIdDisponible, setFaceIdDisponible] = useState(false);
  const [faceIdGuardado, setFaceIdGuardado]     = useState(false);

  // Al montar: cargar credenciales guardadas y comprobar Face ID
  useEffect(() => {
    const init = async () => {
      try {
        // ¿Tiene el dispositivo biometría?
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled   = await LocalAuthentication.isEnrolledAsync();
        setFaceIdDisponible(compatible && enrolled);

        // ¿Hay credenciales guardadas?
        const savedRemember = await SecureStore.getItemAsync(KEY_REMEMBER);
        if (savedRemember === 'true') {
          const savedEmail    = await SecureStore.getItemAsync(KEY_EMAIL);
          const savedPassword = await SecureStore.getItemAsync(KEY_PASSWORD);
          if (savedEmail && savedPassword) {
            setEmail(savedEmail);
            setPassword(savedPassword);
            setRecordar(true);
            setFaceIdGuardado(true);
          }
        }
      } catch (e) {
        console.warn('Error cargando credenciales:', e);
      }
    };
    init();
  }, []);

  const guardarCredenciales = async (em, pw) => {
    await SecureStore.setItemAsync(KEY_EMAIL,    em);
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
    if (!email.trim() || (!password.trim() && modo !== 'reset')) {
      return Alert.alert('Aviso', 'Rellena todos los campos');
    }
    setCargando(true);
    try {
      if (modo === 'login') {
        const user = await loginUser(email.trim(), password);
        if (recordar) {
          await guardarCredenciales(email.trim(), password);
        } else {
          await borrarCredenciales();
        }
        onAuth(user);
      } else if (modo === 'register') {
        const user = await registerUser(email.trim(), password);
        onAuth(user);
      } else {
        await resetPassword(email.trim());
        Alert.alert('✅ Email enviado', 'Revisa tu bandeja de entrada');
        setModo('login');
      }
    } catch (e) {
      Alert.alert('Error', e.message || 'Algo salió mal');
    } finally {
      setCargando(false);
    }
  };

  const handleFaceId = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:   'Accede a Etiove',
        fallbackLabel:   'Usar contraseña',
        cancelLabel:     'Cancelar',
        disableDeviceFallback: false,
      });
      if (result.success) {
        // Recuperar credenciales guardadas y hacer login automático
        const savedEmail    = await SecureStore.getItemAsync(KEY_EMAIL);
        const savedPassword = await SecureStore.getItemAsync(KEY_PASSWORD);
        if (!savedEmail || !savedPassword) {
          return Alert.alert('Aviso', 'Primero inicia sesión con email y activa "Recordarme"');
        }
        setCargando(true);
        const user = await loginUser(savedEmail, savedPassword);
        onAuth(user);
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo autenticar con Face ID');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.authScroll}>
          <Ionicons name="cafe" size={64} color="#e8590c" style={{ marginBottom: 8 }} />
          <Text style={s.authTitle}>Etiove ☕</Text>
          <Text style={s.authSub}>
            {modo === 'login'    ? 'Inicia sesión para continuar' :
             modo === 'register' ? 'Crea tu cuenta gratuita'      :
                                   'Recupera tu contraseña'}
          </Text>

          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            placeholder="tu@email.com"
            placeholderTextColor="#bbb"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {modo !== 'reset' && (
            <>
              <Text style={s.label}>Contraseña</Text>
              <TextInput
                style={s.input}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#bbb"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </>
          )}

          {/* Recordar contraseña */}
          {modo === 'login' && (
            <View style={s.rememberRow}>
              <Switch
                value={recordar}
                onValueChange={val => {
                  setRecordar(val);
                  if (!val) borrarCredenciales();
                }}
                trackColor={{ false: '#ddd', true: '#e8590c' }}
                thumbColor="#fff"
              />
              <Text style={s.rememberText}>Recordar contraseña</Text>
            </View>
          )}

          <TouchableOpacity style={s.redBtn} onPress={handleSubmit} disabled={cargando}>
            {cargando
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.redBtnText}>
                  {modo === 'login'    ? 'Entrar'       :
                   modo === 'register' ? 'Crear cuenta' :
                                         'Enviar enlace'}
                </Text>
            }
          </TouchableOpacity>

          {/* Botón Face ID — solo si hay biometría Y credenciales guardadas */}
          {modo === 'login' && faceIdDisponible && faceIdGuardado && (
            <TouchableOpacity style={s.faceIdBtn} onPress={handleFaceId} disabled={cargando}>
              <Ionicons name="scan-outline" size={22} color="#e8590c" />
              <Text style={s.faceIdText}>Entrar con Face ID</Text>
            </TouchableOpacity>
          )}

          <View style={s.authLinks}>
            {modo === 'login' && (
              <>
                <TouchableOpacity onPress={() => setModo('register')}>
                  <Text style={s.authLink}>¿Sin cuenta? Regístrate</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModo('reset')}>
                  <Text style={[s.authLink, { color: '#888' }]}>¿Olvidaste la contraseña?</Text>
                </TouchableOpacity>
              </>
            )}
            {modo !== 'login' && (
              <TouchableOpacity onPress={() => setModo('login')}>
                <Text style={s.authLink}>← Volver al inicio de sesión</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── PANTALLA DE ESCÁNER ───────────────────────────────────────────────────────

function ScannerScreen({ onScanned, onSkip, onBack }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <StatusBar barStyle="light-content" />
      <CameraView onBarcodeScanned={onScanned} style={StyleSheet.absoluteFillObject} />
      <View style={s.scanOverlay}>
        <Text style={s.scanText}>Enfoca el paquete de café</Text>
        <TouchableOpacity style={s.skipBtn} onPress={onSkip}>
          <Text style={s.skipText}>Añadir sin escanear</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={s.scanBack} onPress={onBack}>
        <Ionicons name="chevron-back" size={28} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

// ─── FORMULARIO DE NUEVO CAFÉ ──────────────────────────────────────────────────

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
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitas permitir la cámara.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.6 });
    if (!res.canceled) setFoto(res.assets[0].uri);
  };

  const guardarCafe = async () => {
    if (!nombreCafe.trim()) return Alert.alert('Aviso', 'Escribe el nombre del café');
    setSubiendo(true);
    try {
      await addDocument('cafes', {
        nombre:     nombreCafe.trim(),
        origen:     origen.trim(),
        puntuacion: rating,
        notas,
        foto:       foto || '',
        fecha:      new Date().toISOString(),
        uid:        user.uid,
      });
      const rankId = nombreCafe.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '_');
      const existente = await getDocument('ranking', rankId);
      if (existente) {
        await updateDocument('ranking', rankId, { votos: (existente.votos || 0) + 1 });
      } else {
        await setDocument('ranking', rankId, { nombre: nombreCafe.trim(), votos: 1 });
      }
      Alert.alert('✅ Guardado', 'Café añadido a tu colección');
      onSave();
    } catch (e) {
      Alert.alert('Error', 'No se pudo conectar con Firebase');
    } finally {
      setSubiendo(false);
    }
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
          {foto
            ? <Image source={{ uri: foto }} style={s.fotoFull} />
            : <>
                <Ionicons name="camera-outline" size={32} color="#aaa" />
                <Text style={s.fotoEmptyText}>Añadir foto</Text>
              </>
          }
        </TouchableOpacity>
        {foto && (
          <TouchableOpacity onPress={hacerFoto}>
            <Text style={s.retake}>Cambiar foto</Text>
          </TouchableOpacity>
        )}

        <Text style={s.label}>Nombre del café</Text>
        <TextInput style={s.input} placeholder="Ej: Yirgacheffe Etiopía" placeholderTextColor="#bbb" value={nombreCafe} onChangeText={setNombreCafe} />

        <Text style={s.label}>Origen / Tostado</Text>
        <TextInput style={s.input} placeholder="Ej: Etiopía · Tostado medio · Floral" placeholderTextColor="#bbb" value={origen} onChangeText={setOrigen} />

        <Text style={s.label}>Puntuación</Text>
        <View style={{ marginBottom: 20 }}>
          <Stars value={rating} onPress={setRating} size={32} />
        </View>

        <Text style={s.label}>Notas de cata</Text>
        <TextInput style={[s.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Aromas, sabores, acidez..." placeholderTextColor="#bbb" value={notas} onChangeText={setNotas} multiline />

        <TouchableOpacity style={s.redBtn} onPress={guardarCafe} disabled={subiendo}>
          {subiendo ? <ActivityIndicator color="#fff" /> : <Text style={s.redBtnText}>Guardar café</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── PANTALLA PRINCIPAL ────────────────────────────────────────────────────────

function MainScreen({ onLogout }) {
  const { user }                  = useAuth();
  const [activeTab, setActiveTab] = useState('Inicio');
  const [scanning, setScanning]   = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [misCafes, setMisCafes]   = useState([]);
  const [topCafes, setTopCafes]   = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [busqueda, setBusqueda]   = useState('');
  const [permission, requestPermission] = useCameraPermissions();

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const cafes   = await getUserCafes(user.uid);
      const ranking = await getCollection('cafes', 'puntuacion', 10);
      setMisCafes(cafes);
      setTopCafes(ranking);
    } catch (e) {
      console.error('Error de carga:', e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarDatos(); }, []);

  const eliminarCafe = (item) => {
    Alert.alert('Eliminar', `¿Eliminar "${item.nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try { await deleteDocument('cafes', item.id); cargarDatos(); }
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
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Ionicons name="cafe" size={72} color="#e8590c" />
        <Text style={s.permTitle}>Etiove necesita la cámara</Text>
        <Text style={s.permSub}>Para escanear paquetes de café</Text>
        <TouchableOpacity style={s.redBtn} onPress={requestPermission}>
          <Text style={s.redBtnText}>Activar cámara</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (scanning) {
    return (
      <ScannerScreen
        onScanned={() => { setScanning(false); setShowForm(true); }}
        onSkip={() => { setScanning(false); setShowForm(true); }}
        onBack={() => setScanning(false)}
      />
    );
  }

  if (showForm) {
    return (
      <FormScreen
        onBack={() => setShowForm(false)}
        onSave={() => { setShowForm(false); setScanning(false); setActiveTab('Mis Cafés'); cargarDatos(); }}
      />
    );
  }

  const cafesFiltrados = misCafes.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.origen?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <SafeAreaView style={s.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

        {activeTab === 'Inicio' && (
          <View>
            <View style={s.topBar}>
              <View style={s.locationPill}>
                <Text style={s.locationText}>🇪🇸  Etiove</Text>
              </View>
              <TouchableOpacity onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={24} color="#888" />
              </TouchableOpacity>
            </View>

            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={18} color="#999" />
              <TextInput style={s.searchInput} placeholder="Buscar cualquier café" placeholderTextColor="#999" value={busqueda} onChangeText={setBusqueda} />
            </View>

            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Últimos añadidos</Text>
              <TouchableOpacity onPress={() => setActiveTab('Mis Cafés')}>
                <Ionicons name="chevron-forward" size={20} color="#555" />
              </TouchableOpacity>
            </View>
            <Text style={s.sectionSub}>Tu colección · {misCafes.length} cafés</Text>

            {cargando ? <ActivityIndicator color="#e8590c" style={{ margin: 30 }} /> : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
                {misCafes.slice(0, 5).map(item => <CardHorizontal key={item.id} item={item} badge={`${item.puntuacion}.0`} />)}
                {misCafes.length === 0 && <Text style={[s.empty, { marginLeft: 0 }]}>Aún no hay cafés. ¡Añade el primero!</Text>}
              </ScrollView>
            )}

            <View style={[s.sectionHeader, { marginTop: 28 }]}>
              <Text style={s.sectionTitle}>Top cafés globales</Text>
              <TouchableOpacity onPress={() => setActiveTab('Ranking')}>
                <Ionicons name="chevron-forward" size={20} color="#555" />
              </TouchableOpacity>
            </View>
            <Text style={s.sectionSub}>Los más votados por la comunidad</Text>

            {cargando ? <ActivityIndicator color="#e8590c" style={{ margin: 30 }} /> : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingLeft: 16, paddingRight: 8, gap: 12 }}>
                {topCafes.map(item => <CardHorizontal key={item.id} item={item} badge={`${item.puntuacion}.0 ⭐`} />)}
                {topCafes.length === 0 && <Text style={[s.empty, { marginLeft: 0 }]}>Aún no hay cafés en la base de datos</Text>}
              </ScrollView>
            )}
          </View>
        )}

        {activeTab === 'Mis Cafés' && (
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            <Text style={s.pageTitle}>Mis Cafés</Text>
            <View style={s.searchWrap}>
              <Ionicons name="search-outline" size={18} color="#999" />
              <TextInput style={s.searchInput} placeholder="Buscar en tu colección" placeholderTextColor="#999" value={busqueda} onChangeText={setBusqueda} />
            </View>
            {cargando ? <ActivityIndicator color="#e8590c" style={{ margin: 30 }} /> : cafesFiltrados.map(item => <CardVertical key={item.id} item={item} onDelete={eliminarCafe} />)}
            {!cargando && cafesFiltrados.length === 0 && <Text style={s.empty}>No se encontraron cafés</Text>}
          </View>
        )}

        {activeTab === 'Ranking' && (
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            <Text style={s.pageTitle}>Top Cafés</Text>
            <Text style={[s.sectionSub, { marginBottom: 16 }]}>Los 10 mejores según puntuación</Text>
            {cargando ? <ActivityIndicator color="#e8590c" style={{ margin: 30 }} /> : topCafes.map((c, i) => (
              <View key={c.id} style={s.rankRow}>
                <Text style={[s.rankNum, i === 0 && { color: '#e8590c' }]}>{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.rankName}>{c.nombre}</Text>
                  <Text style={s.rankVotos}>{c.origen || 'Sin origen'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <Ionicons name="trophy" size={20} color={i === 0 ? '#e8590c' : i === 1 ? '#9a9a9a' : i === 2 ? '#cd7f32' : '#eee'} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#e8590c' }}>{c.puntuacion}.0 ⭐</Text>
                </View>
              </View>
            ))}
            {!cargando && topCafes.length === 0 && <Text style={s.empty}>Aún no hay cafés registrados</Text>}
          </View>
        )}
      </ScrollView>

      <View style={s.bottomBar}>
        <TabBtn icon="home"                label="Inicio"    tab="Inicio"    active={activeTab} onPress={setActiveTab} />
        <TabBtn icon="storefront"          label="Tienda"    tab="Tienda"    active={activeTab} onPress={setActiveTab} />
        <TouchableOpacity style={s.camBtn} onPress={() => setScanning(true)}>
          <Ionicons name="camera" size={28} color="#fff" />
        </TouchableOpacity>
        <TabBtn icon="cafe"                label="Mis Cafés" tab="Mis Cafés" active={activeTab} onPress={setActiveTab} />
        <TabBtn icon="ellipsis-horizontal" label="Ranking"   tab="Ranking"   active={activeTab} onPress={setActiveTab} />
      </View>
    </SafeAreaView>
  );
}

// ─── COMPONENTE RAÍZ ──────────────────────────────────────────────────────────

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
      {user
        ? <MainScreen onLogout={handleLogout} />
        : <AuthScreen onAuth={handleAuth} />
      }
    </AuthContext.Provider>
  );
}

// ─── ESTILOS ──────────────────────────────────────────────────────────────────

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
  cardDots:      { position: 'absolute', top: 8, right: 8, backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 12, padding: 4 },

  cardV:         { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  cardVImg:      { width: 80, height: 100, borderRadius: 10, backgroundColor: '#f5f5f5', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' },
  cardVOrigin:   { fontSize: 12, color: '#888', marginBottom: 2 },
  cardVName:     { fontSize: 15, fontWeight: '700', color: '#111', marginBottom: 5 },
  cardVNotas:    { fontSize: 12, color: '#aaa', marginTop: 5, lineHeight: 17 },

  badgeRed:      { position: 'absolute', top: 8, left: 8, backgroundColor: '#e8590c', borderRadius: 12, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText:     { color: '#fff', fontSize: 11, fontWeight: '700' },

  rankRow:       { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  rankNum:       { fontSize: 22, fontWeight: '700', color: '#ccc', width: 28 },
  rankName:      { fontSize: 15, fontWeight: '600', color: '#111' },
  rankVotos:     { fontSize: 12, color: '#888', marginTop: 2 },

  redBtn:        { backgroundColor: '#e8590c', borderRadius: 30, padding: 16, alignItems: 'center', marginTop: 8 },
  redBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },

  bottomBar:     { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', borderTopWidth: 0.5, borderTopColor: '#eee', flexDirection: 'row', alignItems: 'center', paddingBottom: 20, paddingTop: 10 },
  tabBtn:        { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel:      { fontSize: 10, color: '#888' },
  camBtn:        { width: 60, height: 60, borderRadius: 30, backgroundColor: '#e8590c', alignItems: 'center', justifyContent: 'center', marginTop: -20, shadowColor: '#e8590c', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },

  scanOverlay:   { position: 'absolute', bottom: 60, alignSelf: 'center', alignItems: 'center', gap: 14 },
  scanText:      { color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', padding: 12, borderRadius: 14, fontSize: 15 },
  skipBtn:       { backgroundColor: '#e8590c', paddingVertical: 12, paddingHorizontal: 28, borderRadius: 30 },
  skipText:      { color: '#fff', fontWeight: '700', fontSize: 14 },
  scanBack:      { position: 'absolute', top: 52, left: 16 },

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
