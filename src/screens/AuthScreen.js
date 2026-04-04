import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, KeyboardAvoidingView, Platform,
    SafeAreaView, ScrollView, StatusBar, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { loginUser, registerUser, resetPassword, sendPhoneVerificationCode, verifyPhoneCode, queryCollection, setDocument } from '../../firebaseConfig';
import AppDialogModal from '../components/AppDialogModal';
import { KEY_EMAIL, KEY_HAS_ACCOUNT, KEY_PASSWORD, KEY_REMEMBER } from '../constants/storageKeys';
import { THEME } from '../constants/theme';
  // --- Alias State ---
  const [alias, setAlias] = useState('');
  const [aliasChecking, setAliasChecking] = useState(false);
  const [aliasAvailable, setAliasAvailable] = useState(null);
  // --- SMS Verification State ---
    // Validar alias único
    const checkAlias = async (aliasValue) => {
      setAliasChecking(true);
      try {
        const results = await queryCollection('user_profiles', 'alias', aliasValue.trim().toLowerCase());
        setAliasAvailable(results.length === 0);
      } catch {
        setAliasAvailable(null);
      }
      setAliasChecking(false);
    };

    useEffect(() => {
      if (modo === 'register' && alias.trim().length > 2) {
        checkAlias(alias);
      } else {
        setAliasAvailable(null);
      }
    }, [alias, modo]);
  const [telefono, setTelefono] = useState('');
  const [smsVerificando, setSmsVerificando] = useState(false);
  const [smsSessionInfo, setSmsSessionInfo] = useState(null);
  const [smsCode, setSmsCode] = useState('');
  const [smsVerified, setSmsVerified] = useState(false);
  // Enviar SMS
  const handleVerificarSMS = async () => {
    if (!telefono.trim() || telefono.length < 8) {
      showDialog('Teléfono requerido', 'Introduce un número de móvil válido.');
      return;
    }
    setSmsVerificando(true);
    try {
      // TODO: Obtener recaptchaToken real en producción
      const recaptchaToken = 'test';
      const sessionInfo = await sendPhoneVerificationCode(telefono.trim(), recaptchaToken);
      setSmsSessionInfo(sessionInfo);
      showDialog('Código enviado', 'Te hemos enviado un SMS con el código de verificación.');
    } catch (e) {
      showDialog('Error', e.message || 'No se pudo enviar el SMS');
    }
    setSmsVerificando(false);
  };

  // Verificar código SMS
  const handleConfirmarSMS = async () => {
    if (!smsSessionInfo || !smsCode.trim()) {
      showDialog('Código requerido', 'Introduce el código que recibiste por SMS.');
      return;
    }
    setSmsVerificando(true);
    try {
      await verifyPhoneCode(smsSessionInfo, smsCode.trim());
      setSmsVerified(true);
      showDialog('Teléfono verificado', '¡Tu número ha sido verificado correctamente!');
    } catch (e) {
      showDialog('Error', e.message || 'Código incorrecto');
    }
    setSmsVerificando(false);
  };

export default function AuthScreen({ onAuth }) {
  const [modo, setModo]         = useState('login');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [recordar, setRecordar] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [faceIdDisponible, setFID] = useState(false);
  const [faceIdGuardado, setFIG]   = useState(false);
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
        const hasHardware    = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled     = await LocalAuthentication.isEnrolledAsync();
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        const hasFaceId      = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
        setFID(hasHardware && isEnrolled && hasFaceId);
        if (await SecureStore.getItemAsync(KEY_REMEMBER) === 'true') {
          const em = await SecureStore.getItemAsync(KEY_EMAIL);
          const pw = await SecureStore.getItemAsync(KEY_PASSWORD);
          if (em && pw) { setEmail(em); setPassword(pw); setRecordar(true); setFIG(true); }
        }
        setHasAccount((await SecureStore.getItemAsync(KEY_HAS_ACCOUNT)) === 'true');
      } catch {}
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
    setFIG(false);
  };
  const marcarCuenta = async () => {
    await SecureStore.setItemAsync(KEY_HAS_ACCOUNT, 'true').catch(() => {});
    setHasAccount(true);
  };

  const handleSubmit = async () => {
    if (!email.trim() || (!password.trim() && modo !== 'reset') || (modo === 'register' && !alias.trim())) {
      showDialog('Aviso', 'Rellena todos los campos');
      return;
    }
    if (modo === 'register' && aliasAvailable === false) {
      showDialog('Alias en uso', 'El alias elegido ya está registrado. Elige otro.');
      return;
    }
    setCargando(true);
    try {
      if (modo === 'login') {
        const user = await loginUser(email.trim(), password);
        await marcarCuenta();
        if (recordar) await guardarCreds(email.trim(), password); else await borrarCreds();
        onAuth(user);
      } else if (modo === 'register') {
        // Guardar alias en Firestore tras registro
        const user = await registerUser(email.trim(), password);
        await marcarCuenta();
        // Guardar alias en perfil
        await setDocument('user_profiles', user.uid, {
          uid: user.uid,
          alias: alias.trim().toLowerCase(),
          email: email.trim(),
          displayName: alias.trim(),
          createdAt: new Date().toISOString(),
          role: 'usuario', // Por defecto
        });
        onAuth(user);
      } else {
        await resetPassword(email.trim());
        showDialog('Email enviado', 'Revisa tu bandeja de entrada');
        setModo('login');
      }
    } catch (e) { showDialog('Error', e.message || 'Algo salió mal'); }
    finally { setCargando(false); }
  };

  const handleFaceId = async () => {
    try {
      if (Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient') {
        showDialog('Face ID en Expo Go', 'En Expo Go Face ID puede fallar. Usa un build de desarrollo/TestFlight para autenticación biométrica real.');
        return;
      }
      const hasHardware    = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled     = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFaceId      = supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      if (!hasHardware || !isEnrolled || !hasFaceId) {
        showDialog('Face ID no disponible', 'Este dispositivo/app no tiene Face ID listo para usar en este momento.');
        return;
      }
      const auth = await LocalAuthentication.authenticateAsync({ promptMessage: 'Accede a Etiove', disableDeviceFallback: true, fallbackLabel: '' });
      if (!auth.success) {
        const errorMap = {
          user_cancel:           'Cancelaste la autenticación.',
          app_cancel:            'La app canceló la autenticación.',
          system_cancel:         'iOS interrumpió la autenticación. Inténtalo de nuevo.',
          not_enrolled:          'Face ID no está configurado en este iPhone.',
          passcode_not_set:      'Debes configurar un código de desbloqueo para usar Face ID.',
          lockout:               'Face ID está bloqueado temporalmente. Desbloquea el iPhone con tu código y vuelve a intentarlo.',
          not_available:         'Face ID no está disponible ahora mismo en este dispositivo.',
          authentication_failed: 'No se pudo verificar tu rostro. Vuelve a intentarlo.',
          user_fallback:         'Face ID no está disponible ahora mismo. Revisa su configuración.',
          invalid_context:       'No se pudo iniciar Face ID en este momento.',
        };
        showDialog('Face ID', errorMap[auth.error] || `No se pudo completar la autenticación biométrica (${auth.error || 'desconocido'}).`);
        return;
      }
      const em = await SecureStore.getItemAsync(KEY_EMAIL);
      const pw = await SecureStore.getItemAsync(KEY_PASSWORD);
      if (!em || !pw) {
        showDialog('Aviso', 'Primero inicia sesión y activa "Recordarme"');
        return;
      }
      setCargando(true);
      onAuth(await loginUser(em, pw));
    } catch { showDialog('Error', 'No se pudo autenticar'); }
    finally { setCargando(false); }
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
              <View style={styles.wordmarkWrap}>
                <View style={styles.wordmarkCrest}>
                  <View style={styles.wordmarkMiniLabelWrap}><Text style={styles.wordmarkMiniLabel}>SPECIALTY</Text></View>
                  <View style={styles.wordmarkSealOuter}>
                    <View style={styles.wordmarkSealMiddle}>
                      <View style={styles.wordmarkSeal}><Text style={styles.wordmarkSealText}>E</Text></View>
                    </View>
                  </View>
                  <View style={styles.wordmarkMiniLabelWrap}><Text style={styles.wordmarkMiniLabel}>ROASTERS</Text></View>
                </View>
                <Text style={styles.wordmark}>ETIOVE</Text>
                <Text style={[styles.wordmarkSub, styles.authWordmarkSub]}>COFFEE ATELIER</Text>
                <Text style={[styles.wordmarkTag, styles.authWordmarkTag]}>Donde nació el café</Text>
              </View>
            </View>

            <View style={styles.authCard}>
              <Text style={styles.authKicker}>{modo === 'login' ? (hasAccount ? 'BIENVENIDO DE NUEVO' : 'BIENVENIDO') : modo === 'register' ? 'NUEVA MEMBRESÍA' : 'RECUPERACIÓN SEGURA'}</Text>
              <Text style={styles.authTitle}>{modo === 'login' ? 'Accede a tu cuenta' : modo === 'register' ? 'Crea tu cuenta' : 'Recupera tu acceso'}</Text>
              <Text style={styles.authSub}>{modo === 'login' ? 'Entra para seguir tu colección, nivel y ritual de cata.' : modo === 'register' ? 'Únete a Etiove y empieza a construir tu perfil de catador.' : 'Te enviaremos un enlace para restaurar tu contraseña.'}</Text>

              <Text style={[styles.label, styles.authLabel]}>Email</Text>
              <TextInput style={[styles.input, styles.authInput]} placeholder="tu@email.com" placeholderTextColor="#9f9388" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
              {modo === 'register' && (
                <>
                  <Text style={[styles.label, styles.authLabel]}>Alias *</Text>
                  <TextInput
                    style={[styles.input, styles.authInput, aliasAvailable === false && { borderColor: '#a44f45', backgroundColor: '#fff6f6' }]}
                    placeholder="@tu_alias"
                    placeholderTextColor="#9f9388"
                    value={alias}
                    onChangeText={setAlias}
                    autoCapitalize="none"
                  />
                  {aliasChecking && <Text style={{ color: '#a47c1c', fontSize: 13, marginBottom: 6 }}>Comprobando alias...</Text>}
                  {aliasAvailable === false && <Text style={{ color: '#a44f45', fontSize: 13, marginBottom: 6 }}>Este alias ya está en uso. Elige otro.</Text>}
                  {aliasAvailable && <Text style={{ color: '#5f8f61', fontSize: 13, marginBottom: 6 }}>Alias disponible ✔️</Text>}
                  <Text style={[styles.label, styles.authLabel]}>Teléfono (opcional, para verificar por SMS)</Text>
                  <Text style={{ color: '#8d6d58', fontSize: 13, marginBottom: 6 }}>
                    Si lo verificas por SMS, podrás recuperar tu cuenta aunque pierdas acceso al email.
                  </Text>
                  <TextInput style={[styles.input, styles.authInput]} placeholder="+34 600 000 000" placeholderTextColor="#9f9388" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
                  {!smsVerified && !!telefono.trim() && (
                    <Text style={{ color: '#a47c1c', fontSize: 13, marginBottom: 6 }}>
                      Te enviaremos un SMS con un código de 6 dígitos. Introduce el código para completar la verificación.
                    </Text>
                    <>
                      <TouchableOpacity
                        style={[styles.authPrimaryBtn, { marginTop: 0, backgroundColor: '#f7b500' }]
                        onPress={handleVerificarSMS}
                        disabled={smsVerificando}
                      >
                        {smsVerificando ? <ActivityIndicator color="#fff" /> : <Text style={styles.authPrimaryBtnText}>Verificar por SMS</Text>}
                      </TouchableOpacity>
                      {smsSessionInfo && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
                          <TextInput
                            style={[styles.input, { flex: 1, marginRight: 8 }]}
                            placeholder="Código SMS"
                            value={smsCode}
                            onChangeText={setSmsCode}
                            keyboardType="number-pad"
                            maxLength={6}
                          />
                          <TouchableOpacity
                            style={[styles.authPrimaryBtn, { paddingHorizontal: 16 }]
                            onPress={handleConfirmarSMS}
                            disabled={smsVerificando || !smsCode.trim()}
                          >
                            <Text style={styles.authPrimaryBtnText}>Confirmar</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
              {modo !== 'reset' && (
                <>
                  <Text style={[styles.label, styles.authLabel]}>Contraseña</Text>
                  <TextInput style={[styles.input, styles.authInput]} placeholder="Mínimo 6 caracteres" placeholderTextColor="#9f9388" value={password} onChangeText={setPassword} secureTextEntry />
                </>
              )}
              {modo === 'login' && (
                <View style={styles.rememberRow}>
                  <Switch value={recordar} onValueChange={(v) => { setRecordar(v); if (!v) borrarCreds(); }} trackColor={{ false: THEME.border.muted, true: THEME.brand.accentDeep }} thumbColor="#fffdf8" />
                  <Text style={[styles.rememberText, styles.authRememberText]}>Recordar contraseña</Text>
                </View>
              )}

              <TouchableOpacity style={styles.authPrimaryBtn} onPress={handleSubmit} disabled={cargando}>
                {cargando ? <ActivityIndicator color="#fffaf4" /> : <Text style={styles.authPrimaryBtnText}>{modo === 'login' ? 'Entrar' : modo === 'register' ? 'Crear cuenta' : 'Enviar enlace'}</Text>}
              </TouchableOpacity>

              {modo === 'login' && faceIdDisponible && faceIdGuardado && (
                <TouchableOpacity style={styles.authSecondaryBtn} onPress={handleFaceId} disabled={cargando}>
                  <Ionicons name="scan-outline" size={22} color={THEME.brand.accentDeep} />
                  <Text style={styles.authSecondaryBtnText}>Entrar con Face ID</Text>
                </TouchableOpacity>
              )}

              <View style={styles.authLinks}>
                {modo === 'login' && (
                  <>
                    <TouchableOpacity onPress={() => setModo('register')}><Text style={styles.authLink}>¿Sin cuenta? Regístrate</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setModo('reset')}><Text style={styles.authLinkMuted}>¿Olvidaste la contraseña?</Text></TouchableOpacity>
                  </>
                )}
                {modo !== 'login' && <TouchableOpacity onPress={() => setModo('login')}><Text style={styles.authLink}>← Volver</Text></TouchableOpacity>}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:              { flex: 1, backgroundColor: '#fff' },
  authScroll:          { padding: 24, paddingTop: 36, paddingBottom: 40, flexGrow: 1, justifyContent: 'center', backgroundColor: '#f6efe7' },
  authShell:           { position: 'relative', gap: 22 },
  authAuraOne:         { position: 'absolute', top: -28, right: -18, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(119, 82, 57, 0.09)' },
  authAuraTwo:         { position: 'absolute', bottom: 90, left: -36, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255, 248, 241, 0.72)' },
  authBrandBlock:      { paddingTop: 8, paddingBottom: 2 },
  authTitle:           { fontSize: 30, fontWeight: '800', color: '#1f140f', marginBottom: 8 },
  authSub:             { fontSize: 15, color: '#7e6b5f', marginBottom: 24, lineHeight: 22 },
  authKicker:          { fontSize: 11, fontWeight: '800', color: '#8d6d58', textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 10 },
  authCard:            { backgroundColor: '#fffaf5', borderRadius: 28, padding: 22, borderWidth: 1, borderColor: '#eadbce', shadowColor: '#3a2416', shadowOpacity: 0.1, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 4 },
  authLinks:           { marginTop: 20, gap: 12, alignItems: 'center' },
  authLink:            { color: THEME.brand.accentDeep, fontSize: 14, fontWeight: '700' },
  authLinkMuted:       { color: '#8f837a', fontSize: 14, fontWeight: '600' },
  rememberRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  rememberText:        { fontSize: 14, color: THEME.text.tertiary },
  authRememberText:    { color: '#5f534b' },
  authLabel:           { color: '#836e61' },
  authInput:           { backgroundColor: '#f8f1ea', borderWidth: 1, borderColor: '#e8dacd', color: '#221610' },
  authPrimaryBtn:      { backgroundColor: THEME.brand.primary, borderRadius: 30, padding: 16, alignItems: 'center', marginTop: 8, shadowColor: THEME.brand.primary, shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, elevation: 3 },
  authPrimaryBtnText:  { color: THEME.brand.onPrimary, fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  authSecondaryBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14, padding: 14, borderWidth: 1.2, borderColor: '#dcc8b7', borderRadius: 30, backgroundColor: '#f9f2ea' },
  authSecondaryBtnText:{ color: THEME.brand.accentDeep, fontWeight: '700', fontSize: 15 },
  label:               { fontSize: 12, fontWeight: '600', color: THEME.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  input:               { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 14, fontSize: 15, color: '#111', marginBottom: 18 },
  wordmarkWrap:        { alignItems: 'center', justifyContent: 'center', gap: 4, paddingHorizontal: 2, paddingTop: 4 },
  wordmarkCrest:       { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 3 },
  wordmarkMiniLabelWrap:{ minWidth: 78, alignItems: 'center' },
  wordmarkMiniLabel:   { fontSize: 9, fontWeight: '800', color: '#9a7963', letterSpacing: 2.2 },
  wordmarkSealOuter:   { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: '#c4a18a', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fcf7f1' },
  wordmarkSealMiddle:  { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(154, 121, 99, 0.38)', alignItems: 'center', justifyContent: 'center' },
  wordmarkSeal:        { width: 22, height: 22, borderRadius: 11, borderWidth: 1, borderColor: '#8f6a53', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2e7dc' },
  wordmarkSealText:    { fontSize: 11, fontWeight: '900', color: '#6f5444', letterSpacing: 1.1 },
  wordmark:            { fontSize: 40, fontWeight: '900', letterSpacing: 5.8, color: '#1c120d', textShadowColor: 'rgba(111, 84, 68, 0.08)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
  wordmarkSub:         { fontSize: 10, color: '#8a6b57', fontWeight: '800', letterSpacing: 3.2, marginTop: -2 },
  wordmarkTag:         { fontSize: 10, color: '#6f5444', fontWeight: '800', letterSpacing: 2.1, textAlign: 'center', marginTop: 2 },
  authWordmarkSub:     { marginBottom: 10 },
  authWordmarkTag:     { marginTop: 0 },
});
