import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import authScreenStyles from './authScreenStyles';
import {
  AuthActionButtons,
  AuthCredentialsFields,
  AuthInlineNotice,
  AuthRememberToggle,
} from './AuthScreenParts';
import buildAuthScreenViewModel from './buildAuthScreenViewModel';
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
  const viewModel = buildAuthScreenViewModel({
    modo,
    hasAccount,
    faceIdDisponible,
    faceIdGuardado,
    cargando,
  });

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.authScroll}>
          <View style={styles.authShell}>
            <View style={styles.authAuraOne} />
            <View style={styles.authAuraTwo} />

            <View style={styles.authBrandBlock}>
              <Text style={styles.wordmark}>ETIOVE</Text>
              <Text style={styles.wordmarkSub}>COFFEE ATELIER</Text>
              <Text style={styles.wordmarkTag}>Dónde nació el café</Text>
            </View>

            <View style={styles.authCard}>
              <Text style={styles.authKicker}>{viewModel.kicker}</Text>
              <Text style={styles.authTitle}>{viewModel.title}</Text>
              <Text style={styles.authSub}>{viewModel.subtitle}</Text>

              <AuthInlineNotice
                styles={styles}
                dialogVisible={dialogVisible}
                dialogConfig={dialogConfig}
                setDialogVisible={setDialogVisible}
              />

              <AuthCredentialsFields
                styles={styles}
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                showPasswordField={viewModel.showPasswordField}
              />

              {viewModel.showRememberToggle && (
                <AuthRememberToggle
                  styles={styles}
                  recordar={recordar}
                  setRecordar={setRecordar}
                  borrarCreds={borrarCreds}
                />
              )}

              <AuthActionButtons
                styles={styles}
                cargando={cargando}
                primaryAction={viewModel.primaryAction}
                handleSubmit={handleSubmit}
                showFaceIdButton={viewModel.showFaceIdButton}
                handleFaceId={handleFaceId}
                disablePrimaryAction={viewModel.disablePrimaryAction}
                disableSecondaryAction={viewModel.disableSecondaryAction}
              />

              <View style={styles.links}>
                {viewModel.isLoginMode ? (
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
