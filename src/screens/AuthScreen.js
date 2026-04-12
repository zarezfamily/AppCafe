import React, { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppDialogModal from '../components/AppDialogModal';
import { loginUser, registerUser, resetPassword } from '../../firebaseConfig';

const KEY_EMAIL = 'etiove_email';
const KEY_PASSWORD = 'etiove_password';
const KEY_REMEMBER = 'etiove_remember';
const KEY_HAS_ACCOUNT = 'etiove_has_account';

const COLORS = {
  primary: '#2f1d14',
  primaryText: '#fff9f1',
  accent: '#5d4030',
  surface: '#fffaf5',
  background: '#f6efe7',
  border: '#eadbce',
  muted: '#8f837a',
  text: '#1f140f',
};

export default function AuthScreen({ onAuth }) {
  const [modo, setModo] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [recordar, setRecordar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [faceIdDisponible, setFaceIdDisponible] = useState(false);
  const [faceIdGuardado, setFaceIdGuardado] = useState(false);
  const [hasAccount, setHasAccount] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ title: '', description: '', actions: [] });

  const showDialog = (title, description, actions = [{ label: 'Cerrar' }]) => {
    setDialogConfig({ title, description, actions });
    setDialogVisible(true);
  };

  useEffect(() => {
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const hasFaceId = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
        setFaceIdDisponible(hasHardware && isEnrolled && hasFaceId);

        if ((await SecureStore.getItemAsync(KEY_REMEMBER)) === 'true') {
          const em = await SecureStore.getItemAsync(KEY_EMAIL);
          const pw = await SecureStore.getItemAsync(KEY_PASSWORD);
          if (em && pw) {
            setEmail(em);
            setPassword(pw);
            setRecordar(true);
            setFaceIdGuardado(true);
          }
        }

        setHasAccount((await SecureStore.getItemAsync(KEY_HAS_ACCOUNT)) === 'true');
      } catch {
        // noop
      }
    })();
  }, []);

  const guardarCreds = async (em, pw) => {
    await SecureStore.setItemAsync(KEY_EMAIL, em);
    await SecureStore.setItemAsync(KEY_PASSWORD, pw);
    await SecureStore.setItemAsync(KEY_REMEMBER, 'true');
  };

  const borrarCreds = async () => {
    await SecureStore.deleteItemAsync(KEY_EMAIL);
    await SecureStore.deleteItemAsync(KEY_PASSWORD);
    await SecureStore.setItemAsync(KEY_REMEMBER, 'false');
    setFaceIdGuardado(false);
  };

  const marcarCuenta = async () => {
    await SecureStore.setItemAsync(KEY_HAS_ACCOUNT, 'true').catch(() => {});
    setHasAccount(true);
  };

  const handleSubmit = async () => {
    if (!email.trim() || (!password.trim() && modo !== 'reset')) {
      showDialog('Aviso', 'Rellena todos los campos');
      return;
    }

    setCargando(true);
    try {
      if (modo === 'login') {
        const user = await loginUser(email.trim(), password);
        await marcarCuenta();
        if (recordar) await guardarCreds(email.trim(), password);
        else await borrarCreds();
        onAuth?.(user);
      } else if (modo === 'register') {
        const user = await registerUser(email.trim(), password);
        await marcarCuenta();
        onAuth?.(user);
      } else {
        await resetPassword(email.trim());
        showDialog('Email enviado', 'Revisa tu bandeja de entrada');
        setModo('login');
      }
    } catch (e) {
      showDialog('Error', e?.message || 'Algo salió mal');
    } finally {
      setCargando(false);
    }
  };

  const handleFaceId = async () => {
    try {
      if (Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient') {
        showDialog('Face ID en Expo Go', 'En Expo Go Face ID puede fallar. Usa un build de desarrollo o TestFlight para biometría real.');
        return;
      }

      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFaceId = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);

      if (!hasHardware || !isEnrolled || !hasFaceId) {
        showDialog('Face ID no disponible', 'Este dispositivo no tiene Face ID listo para usar ahora mismo.');
        return;
      }

      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Accede a Etiove',
        disableDeviceFallback: true,
        fallbackLabel: '',
      });

      if (!auth.success) {
        showDialog('Face ID', 'No se pudo completar la autenticación biométrica.');
        return;
      }

      const em = await SecureStore.getItemAsync(KEY_EMAIL);
      const pw = await SecureStore.getItemAsync(KEY_PASSWORD);
      if (!em || !pw) {
        showDialog('Aviso', 'Primero inicia sesión y activa “Recordar contraseña”.');
        return;
      }

      setCargando(true);
      const user = await loginUser(em, pw);
      onAuth?.(user);
    } catch {
      showDialog('Error', 'No se pudo autenticar');
    } finally {
      setCargando(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <AppDialogModal
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        title={dialogConfig.title}
        description={dialogConfig.description}
        actions={dialogConfig.actions}
      />
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.authScroll}>
          <View style={styles.authShell}>
            <View style={styles.authAuraOne} />
            <View style={styles.authAuraTwo} />

            <View style={styles.authBrandBlock}>
              <Text style={styles.wordmark}>ETIOVE</Text>
              <Text style={styles.wordmarkSub}>COFFEE ATELIER</Text>
              <Text style={styles.wordmarkTag}>Donde nació el café</Text>
            </View>

            <View style={styles.authCard}>
              <Text style={styles.authKicker}>
                {modo === 'login'
                  ? hasAccount
                    ? 'BIENVENIDO DE NUEVO'
                    : 'BIENVENIDO'
                  : modo === 'register'
                    ? 'NUEVA MEMBRESÍA'
                    : 'RECUPERACIÓN SEGURA'}
              </Text>
              <Text style={styles.authTitle}>
                {modo === 'login'
                  ? 'Accede a tu cuenta'
                  : modo === 'register'
                    ? 'Crea tu cuenta'
                    : 'Recupera tu acceso'}
              </Text>
              <Text style={styles.authSub}>
                {modo === 'login'
                  ? 'Entra para seguir tu colección, nivel y ritual de cata.'
                  : modo === 'register'
                    ? 'Únete a Etiove y empieza a construir tu perfil de catador.'
                    : 'Te enviaremos un enlace para restaurar tu contraseña.'}
              </Text>

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="tu@email.com"
                placeholderTextColor="#9f9388"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              {modo !== 'reset' && (
                <>
                  <Text style={styles.label}>Contraseña</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor="#9f9388"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </>
              )}

              {modo === 'login' && (
                <View style={styles.rememberRow}>
                  <Switch
                    value={recordar}
                    onValueChange={(value) => {
                      setRecordar(value);
                      if (!value) borrarCreds();
                    }}
                    trackColor={{ false: '#ddd4cb', true: COLORS.accent }}
                    thumbColor="#fffdf8"
                  />
                  <Text style={styles.rememberText}>Recordar contraseña</Text>
                </View>
              )}

              <TouchableOpacity style={styles.primaryBtn} onPress={handleSubmit} disabled={cargando}>
                {cargando ? <ActivityIndicator color={COLORS.primaryText} /> : <Text style={styles.primaryBtnText}>{modo === 'login' ? 'Entrar' : modo === 'register' ? 'Crear cuenta' : 'Enviar enlace'}</Text>}
              </TouchableOpacity>

              {modo === 'login' && faceIdDisponible && faceIdGuardado && (
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleFaceId} disabled={cargando}>
                  <Ionicons name="scan-outline" size={22} color={COLORS.accent} />
                  <Text style={styles.secondaryBtnText}>Entrar con Face ID</Text>
                </TouchableOpacity>
              )}

              <View style={styles.links}>
                {modo === 'login' ? (
                  <>
                    <TouchableOpacity onPress={() => setModo('register')}>
                      <Text style={styles.link}>¿Sin cuenta? Regístrate</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setModo('reset')}>
                      <Text style={styles.linkMuted}>¿Olvidaste la contraseña?</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity onPress={() => setModo('login')}>
                    <Text style={styles.link}>← Volver</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  authScroll: {
    padding: 24,
    paddingTop: 36,
    paddingBottom: 40,
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  authShell: { position: 'relative', gap: 22 },
  authAuraOne: {
    position: 'absolute',
    top: -28,
    right: -18,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(119, 82, 57, 0.09)',
  },
  authAuraTwo: {
    position: 'absolute',
    bottom: 90,
    left: -36,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 248, 241, 0.72)',
  },
  authBrandBlock: { paddingTop: 8, paddingBottom: 2, alignItems: 'center' },
  wordmark: {
    fontSize: 42,
    letterSpacing: 4,
    color: COLORS.text,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  wordmarkSub: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
  },
  wordmarkTag: {
    marginTop: 6,
    fontSize: 13,
    color: '#7e6b5f',
  },
  authCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#3a2416',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  authKicker: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8d6d58',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  authTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
    fontFamily: 'PlayfairDisplay_700Bold',
  },
  authSub: {
    fontSize: 15,
    color: '#7e6b5f',
    marginBottom: 24,
    lineHeight: 22,
  },
  label: {
    color: '#836e61',
    marginBottom: 8,
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#f8f1ea',
    borderWidth: 1,
    borderColor: '#e8dacd',
    color: '#221610',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  rememberText: { fontSize: 14, color: '#5f534b' },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 30,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: {
    color: COLORS.primaryText,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    padding: 14,
    borderWidth: 1.2,
    borderColor: '#dcc8b7',
    borderRadius: 30,
    backgroundColor: '#f9f2ea',
  },
  secondaryBtnText: { color: COLORS.accent, fontWeight: '700', fontSize: 15 },
  links: { marginTop: 20, gap: 12, alignItems: 'center' },
  link: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },
  linkMuted: { color: COLORS.muted, fontSize: 14, fontWeight: '600' },
});
