import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppDialogModal from '../components/AppDialogModal';
import authScreenStyles, { AUTH_COLORS } from './authScreenStyles';
import useAuthScreen from './useAuthScreen';

export default function AuthScreen({ onAuth }) {
  const {
    modo,
    setModo,
    email,
    setEmail,
    password,
    setPassword,
    recordar,
    setRecordar,
    cargando,
    faceIdDisponible,
    faceIdGuardado,
    hasAccount,
    dialogVisible,
    setDialogVisible,
    dialogConfig,
    handleSubmit,
    handleFaceId,
    borrarCreds,
  } = useAuthScreen({ onAuth });

  const styles = authScreenStyles;

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
                {cargando ? <ActivityIndicator color={AUTH_COLORS.primaryText} /> : <Text style={styles.primaryBtnText}>{modo === 'login' ? 'Entrar' : modo === 'register' ? 'Crear cuenta' : 'Enviar enlace'}</Text>}
              </TouchableOpacity>

              {modo === 'login' && faceIdDisponible && faceIdGuardado && (
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleFaceId} disabled={cargando}>
                  <Ionicons name="scan-outline" size={22} color={AUTH_COLORS.accent} />
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
