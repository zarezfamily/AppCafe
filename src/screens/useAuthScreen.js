import Constants from 'expo-constants';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

import { loginUser, registerUser, resetPassword } from '../../authService';

const KEY_EMAIL = 'etiove_email';
const KEY_PASSWORD = 'etiove_password';
const KEY_REMEMBER = 'etiove_remember';
const KEY_HAS_ACCOUNT = 'etiove_has_account';

export default function useAuthScreen({ onAuth }) {
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

  return {
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
  };
}
