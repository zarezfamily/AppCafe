import { loginUser, registerUser, resetPassword } from '../services/authService';
import {
  authenticateWithFaceId,
  getFaceIdAvailability,
  shouldBlockFaceIdInExpoGo,
} from './authScreenBiometrics';
import {
  clearRememberedCredentials,
  loadRememberedCredentials,
  markStoredAccount,
  saveRememberedCredentials,
} from './authScreenStorage';

export function buildAuthSubmitHandler({
  getState,
  setModo,
  setCargando,
  showDialog,
  onAuth,
  setHasAccount,
  setFaceIdGuardado,
}) {
  return async function handleSubmit() {
    const { email, password, modo, recordar } = getState();

    if (!email.trim() || (!password.trim() && modo !== 'reset')) {
      showDialog('Aviso', 'Rellena todos los campos');
      return;
    }

    setCargando(true);
    try {
      if (modo === 'login') {
        const user = await loginUser(email.trim(), password);
        await markStoredAccount();
        setHasAccount(true);
        if (recordar) {
          await saveRememberedCredentials(email.trim(), password);
          setFaceIdGuardado(true);
        } else {
          await clearRememberedCredentials();
          setFaceIdGuardado(false);
        }
        onAuth?.(user);
      } else if (modo === 'register') {
        const user = await registerUser(email.trim(), password);
        await markStoredAccount();
        setHasAccount(true);
        onAuth?.(user);
      } else {
        await resetPassword(email.trim());
        showDialog('Email enviado', 'Revisa tu bandeja de entrada');
        setModo('login');
      }
    } catch (error) {
      showDialog('Error', error?.message || 'Algo salió mal');
    } finally {
      setCargando(false);
    }
  };
}

export function buildAuthFaceIdHandler({ showDialog, setCargando, onAuth }) {
  return async function handleFaceId() {
    try {
      if (shouldBlockFaceIdInExpoGo()) {
        showDialog(
          'Face ID en Expo Go',
          'En Expo Go Face ID puede fallar. Usa un build de desarrollo o TestFlight para biometría real.'
        );
        return;
      }

      const faceIdAvailable = await getFaceIdAvailability();
      if (!faceIdAvailable) {
        showDialog(
          'Face ID no disponible',
          'Este dispositivo no tiene Face ID listo para usar ahora mismo.'
        );
        return;
      }

      const auth = await authenticateWithFaceId();
      if (!auth.success) {
        showDialog('Face ID', 'No se pudo completar la autenticación biométrica.');
        return;
      }

      const { email, password } = await loadRememberedCredentials();
      if (!email || !password) {
        showDialog('Aviso', 'Primero inicia sesión y activa “Recordar contraseña”.');
        return;
      }

      setCargando(true);
      const user = await loginUser(email, password);
      onAuth?.(user);
    } catch {
      showDialog('Error', 'No se pudo autenticar');
    } finally {
      setCargando(false);
    }
  };
}
