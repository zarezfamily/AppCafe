import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

import { getDocument, setDocument } from '../../firestoreService';
import { uploadImageToStorage } from '../../storageService';
import { KEY_PROFILE } from '../constants/storageKeys';

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

  const emailValido = /^\S+@\S+\.\S+$/.test(String(email || '').trim());
  const camposObligatoriosCompletos = !!nombre.trim() && !!apellidos.trim() && !!alias.trim() && !!email.trim();

  const showDialog = (title, description, actions = [{ label: 'Cerrar' }]) => {
    setDialogConfig({ title, description, actions });
    setDialogVisible(true);
  };

  useEffect(() => {
    SecureStore.getItemAsync(KEY_PROFILE)
      .then((value) => {
        if (!value) return;
        const profile = JSON.parse(value);
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
      let fotoPersistida = foto;
      let avatarUrlParaWeb = String(foto || '').startsWith('http') ? String(foto).trim() : '';
      let uploadPendiente = false;

      if (foto && !String(foto).startsWith('http')) {
        try {
          fotoPersistida = await uploadImageToStorage(foto, `profile_avatars/${user?.uid || 'anon'}`);
          avatarUrlParaWeb = String(fotoPersistida || '').trim();
        } catch {
          uploadPendiente = true;
        }
      }

      await SecureStore.setItemAsync(
        KEY_PROFILE,
        JSON.stringify({
          nombre: nombre.trim(),
          alias: alias.trim(),
          apellidos: apellidos.trim(),
          email: email.trim(),
          telefono,
          pais,
          foto: fotoPersistida,
        })
      );

      await onProfileSaved?.();

      if (user?.uid) {
        try {
          const existing = await getDocument('user_profiles', user.uid);
          const displayName = alias.trim() || nombre.trim() || email.trim().split('@')[0] || 'Catador';
          const avatarCloud = avatarUrlParaWeb || String(existing?.avatarUrl || '').trim();
          await setDocument('user_profiles', user.uid, {
            uid: user.uid,
            displayName,
            avatarUrl: avatarCloud,
            motto: String(existing?.motto || '').trim() || '"Ninguno de nosotros es tan listo como todos nosotros."',
            updatedAt: new Date().toISOString(),
          });
        } catch {}
      }

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
