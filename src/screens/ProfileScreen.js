import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Image, Modal, SafeAreaView,
    ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { getDocument, setDocument, uploadImageToStorage } from '../../firebaseConfig';
import AppDialogModal from '../components/AppDialogModal';
import { KEY_PROFILE } from '../constants/storageKeys';
import { PREMIUM_ACCENT, THEME, W } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { shared } from '../styles/sharedStyles';
import PaisPicklist from './PaisPicklist';

export default function ProfileScreen({ onClose }) {
  const { user } = useAuth();
  const [nombre,    setNombre]    = useState('');
  const [alias,     setAlias]     = useState('');
  const [apellidos, setApellidos] = useState('');
  const [email,     setEmail]     = useState(user?.email || '');
  const [telefono,  setTelefono]  = useState('');
  const [pais,      setPais]      = useState('España');
  const [foto,      setFoto]      = useState(null);
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
    SecureStore.getItemAsync(KEY_PROFILE).then(v => {
      if (v) {
        const p = JSON.parse(v);
        setNombre(p.nombre || ''); setAlias(p.alias || ''); setApellidos(p.apellidos || '');
        setEmail(p.email || user?.email || ''); setTelefono(p.telefono || '');
        setPais(p.pais || 'España'); setFoto(p.foto || null);
      }
    }).catch(() => {});
  }, []);

  const elegirFoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showDialog('Permiso denegado', 'Necesitas permitir el acceso a la galería.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!res.canceled) setFoto(res.assets[0].uri);
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
          // Si falla la subida, la app mantiene preview local, pero no guardamos file:// en Firestore.
          uploadPendiente = true;
        }
      }

      await SecureStore.setItemAsync(KEY_PROFILE, JSON.stringify({
        nombre: nombre.trim(),
        alias: alias.trim(),
        apellidos: apellidos.trim(),
        email: email.trim(),
        telefono,
        pais,
        foto: fotoPersistida,
      }));

      if (user?.uid) {
        try {
          const existing = await getDocument('user_profiles', user.uid);
          const displayName = alias.trim() || nombre.trim() || email.trim().split('@')[0] || 'Catador';
          const avatarCloud = avatarUrlParaWeb || String((existing && existing.avatarUrl) || '').trim();
          await setDocument('user_profiles', user.uid, {
            uid: user.uid,
            displayName,
            avatarUrl: avatarCloud,
            motto: String((existing && existing.motto) || '').trim() || '"Ninguno de nosotros es tan listo como todos nosotros."',
            updatedAt: new Date().toISOString(),
          });
        } catch {
          // No bloqueamos al usuario si falla la sincronización con web.
        }
      }

      setFoto(fotoPersistida || null);
      if (uploadPendiente) {
        showDialog('Guardado parcial', 'Tu perfil se guardo en el movil, pero no se pudo subir la foto a la nube. Vuelve a intentarlo con buena conexion para que tambien salga en la web.');
      } else {
        showDialog('Guardado', 'Tu perfil ha sido actualizado');
      }
      onClose();
    } catch { showDialog('Error', 'No se pudo guardar el perfil'); }
    finally { setGuardando(false); }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <AppDialogModal
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        title={dialogConfig.title}
        description={dialogConfig.description}
        actions={dialogConfig.actions}
      />
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
        <StatusBar barStyle="dark-content" />
        <View style={prf.header}>
          <TouchableOpacity onPress={onClose} style={prf.closeBtn}><Ionicons name="chevron-back" size={24} color="#111" /></TouchableOpacity>
          <Text style={prf.title}>Mi perfil</Text>
          <View style={{ width: 40 }} />
        </View>
        <ScrollView contentContainerStyle={prf.body}>
          <TouchableOpacity style={prf.avatarWrap} onPress={elegirFoto}>
            {foto
              ? <Image source={{ uri: foto }} style={prf.avatarImg} />
              : <View style={prf.avatar}><Text style={prf.avatarText}>{(nombre || alias || email || '?')[0].toUpperCase()}</Text></View>
            }
            <View style={prf.avatarBadge}><Ionicons name="camera" size={14} color="#fff" /></View>
            <Text style={prf.avatarEmail}>{user?.email}</Text>
            <Text style={{ fontSize: 12, color: THEME.text.muted }}>Toca para cambiar foto</Text>
          </TouchableOpacity>

          <Text style={shared.label}>Nombre *</Text>
          <TextInput style={shared.input} placeholder="Tu nombre" placeholderTextColor="#bbb" value={nombre} onChangeText={setNombre} />
          <Text style={shared.label}>Apellidos *</Text>
          <TextInput style={shared.input} placeholder="Tus apellidos" placeholderTextColor="#bbb" value={apellidos} onChangeText={setApellidos} />
          <Text style={shared.label}>Alias *</Text>
          <TextInput style={shared.input} placeholder="@tu_alias" placeholderTextColor="#bbb" value={alias} onChangeText={setAlias} autoCapitalize="none" />
          <Text style={shared.label}>Email *</Text>
          <TextInput style={shared.input} placeholder="tu@email.com" placeholderTextColor="#bbb" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <Text style={shared.label}>Teléfono</Text>
          <TextInput style={shared.input} placeholder="+34 600 000 000" placeholderTextColor="#bbb" value={telefono} onChangeText={setTelefono} keyboardType="phone-pad" />
          <Text style={shared.label}>País</Text>
          <PaisPicklist value={pais} onChange={setPais} />

          <TouchableOpacity
            style={[shared.redBtn, { marginTop: 24, opacity: guardando || !camposObligatoriosCompletos ? 0.8 : 1 }]}
            onPress={guardar}
            disabled={guardando}
          >
            {guardando ? <ActivityIndicator color="#fff" /> : <Text style={shared.redBtnText}>Guardar cambios</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const prf = StyleSheet.create({
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: THEME.border.soft },
  closeBtn:    { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title:       { fontSize: 18, fontWeight: '700', color: '#111' },
  body:        { padding: 24 },
  avatarWrap:  { alignItems: 'center', marginBottom: 32, gap: 6 },
  avatar:      { width: 90, height: 90, borderRadius: 45, backgroundColor: PREMIUM_ACCENT, alignItems: 'center', justifyContent: 'center' },
  avatarImg:   { width: 90, height: 90, borderRadius: 45 },
  avatarText:  { fontSize: 40, fontWeight: '800', color: '#fff' },
  avatarEmail: { fontSize: 13, color: THEME.text.secondary },
  avatarBadge: { position: 'absolute', bottom: 52, right: W / 2 - 55, width: 26, height: 26, borderRadius: 13, backgroundColor: PREMIUM_ACCENT, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
});
