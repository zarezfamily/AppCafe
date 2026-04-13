import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';

import { persistProfile } from '../domain/profile/profilePersistence';
import { loadStoredProfile, saveStoredProfile } from '../domain/profile/profileStorage';
import {
  hasRequiredProfileFields,
  isValidProfileEmail,
} from '../domain/profile/profileValidation';

export default function useProfileScreen({ user, onClose, onProfileSaved }) {
  const [nombre, setNombre] = useState('');
  const [alias, setAlias] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [telefono, setTelefono] = useState('');
  const [pais, setPais] = useState('España');
  const [foto, setFoto] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ title: '', description: '', actions: [] });

  const emailValido = isValidProfileEmail(email);
  const camposObligatoriosCompletos = hasRequiredProfileFields({ nombre, apellidos, alias, email });

  const showDialog = (title, description, actions = [{ label: 'Cerrar' }]) => {
    setDialogConfig({ title, description, actions });
    setDialogVisible(true);
  };

  useEffect(() => {
    loadStoredProfile()
      .then((profile) => {
        if (!profile) return;
        setNombre(profile.nombre || '');
        setAlias(profile.alias || '');
        setApellidos(profile.apellidos || '');
        setEmail(profile.email || user?.email || '');
        setTelefono(profile.telefono || '');
        setPais(profile.pais || 'España');
        setFoto(profile.foto || null);
      })
      .catch(() => {});
  }, [user?.email]);

  const elegirFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showDialog('Permiso denegado', 'Necesitas permitir el acceso a la galería.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setFoto(result.assets[0].uri);
    }
  };

  const guardar = async () => {
    if (!camposObligatoriosCompletos) {
      showDialog('Campos obligatorios', 'Nombre, apellidos, alias y email son obligatorios.');
      return;
    }

    if (!emailValido) {
      showDialog('Email inválido', 'Introduce un email válido para continuar.');
      return;
    }

    setGuardando(true);
    try {
      const { storedProfile, fotoPersistida, uploadPendiente } = await persistProfile({
        user,
        nombre,
        alias,
        apellidos,
        email,
        telefono,
        pais,
        foto,
      });

      await saveStoredProfile(storedProfile);

      await onProfileSaved?.();

      setFoto(fotoPersistida || null);

      if (uploadPendiente) {
        showDialog(
          'Guardado parcial',
          'Tu perfil se guardó en el móvil, pero no se pudo subir la foto a la nube. Vuelve a intentarlo con buena conexión para que también salga en la web.'
        );
      } else {
        showDialog('Guardado', 'Tu perfil ha sido actualizado');
      }

      onClose?.();
    } catch {
      showDialog('Error', 'No se pudo guardar el perfil');
    } finally {
      setGuardando(false);
    }
  };

  return {
    nombre,
    setNombre,
    alias,
    setAlias,
    apellidos,
    setApellidos,
    email,
    setEmail,
    telefono,
    setTelefono,
    pais,
    setPais,
    foto,
    setFoto,
    guardando,
    dialogVisible,
    setDialogVisible,
    dialogConfig,
    emailValido,
    camposObligatoriosCompletos,
    elegirFoto,
    guardar,
  };
}
