import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { AUTH_COLORS } from './authScreenStyles';

export function AuthInlineNotice({ styles, dialogVisible, dialogConfig, setDialogVisible }) {
  if (!dialogVisible) return null;

  return (
    <View style={styles.inlineNotice}>
      <Text style={styles.inlineNoticeTitle}>{dialogConfig.title || 'Aviso'}</Text>

      {dialogConfig.description && (
        <Text style={styles.inlineNoticeText}>{dialogConfig.description}</Text>
      )}

      <TouchableOpacity onPress={() => setDialogVisible(false)} style={styles.inlineNoticeBtn}>
        <Text style={styles.inlineNoticeBtnText}>Cerrar</Text>
      </TouchableOpacity>
    </View>
  );
}

export function AuthCredentialsFields({
  styles,
  email,
  setEmail,
  password,
  setPassword,
  showPasswordField,
}) {
  return (
    <>
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

      {showPasswordField && (
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
    </>
  );
}

export function AuthRememberToggle({ styles, recordar, setRecordar, borrarCreds }) {
  return (
    <View style={styles.rememberRow}>
      <TouchableOpacity
        onPress={() => {
          const nextValue = !recordar;
          setRecordar(nextValue);
          if (!nextValue) borrarCreds();
        }}
        activeOpacity={0.85}
        style={[styles.rememberToggle, recordar && styles.rememberToggleActive]}
      >
        <View style={[styles.rememberToggleKnob, recordar && styles.rememberToggleKnobActive]} />
      </TouchableOpacity>

      <Text style={styles.rememberText}>Recordar contraseña</Text>
    </View>
  );
}

export function AuthActionButtons({
  styles,
  cargando,
  primaryAction,
  handleSubmit,
  showFaceIdButton,
  handleFaceId,
  disablePrimaryAction,
  disableSecondaryAction,
}) {
  return (
    <>
      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={handleSubmit}
        disabled={disablePrimaryAction}
      >
        {cargando ? (
          <ActivityIndicator color={AUTH_COLORS.primaryText} />
        ) : (
          <Text style={styles.primaryBtnText}>{primaryAction}</Text>
        )}
      </TouchableOpacity>

      {showFaceIdButton && (
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={handleFaceId}
          disabled={disableSecondaryAction}
        >
          <Ionicons name="scan-outline" size={22} color={AUTH_COLORS.accent} />
          <Text style={styles.secondaryBtnText}>Entrar con Face ID</Text>
        </TouchableOpacity>
      )}
    </>
  );
}
