import { useEffect, useState } from 'react';

import { buildAuthFaceIdHandler, buildAuthSubmitHandler } from './buildAuthScreenActions';
import { getFaceIdAvailability } from './authScreenBiometrics';
import { clearRememberedCredentials, loadStoredAuthState } from './authScreenStorage';

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
        const isFaceIdAvailable = await getFaceIdAvailability();
        const storedState = await loadStoredAuthState();

        setFaceIdDisponible(isFaceIdAvailable);
        setHasAccount(storedState.hasAccount);

        if (storedState.rememberEnabled && storedState.email && storedState.password) {
          setEmail(storedState.email);
          setPassword(storedState.password);
          setRecordar(true);
          setFaceIdGuardado(true);
        }
      } catch {
        // noop
      }
    })();
  }, []);

  const borrarCreds = async () => {
    await clearRememberedCredentials();
    setFaceIdGuardado(false);
  };

  const getState = () => ({
    email,
    password,
    modo,
    recordar,
  });

  const handleSubmit = buildAuthSubmitHandler({
    getState,
    setModo,
    setCargando,
    showDialog,
    onAuth,
    setHasAccount,
    setFaceIdGuardado,
  });

  const handleFaceId = buildAuthFaceIdHandler({
    showDialog,
    setCargando,
    onAuth,
  });

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
