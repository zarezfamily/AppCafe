import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { getDocument, setDocument, uploadImageToStorage } from '../../firebaseConfig';
import AppDialogModal from '../components/AppDialogModal';
import PremiumBadge from './PremiumBadge';
import { KEY_PROFILE } from '../constants/storageKeys';
import { useAuth } from '../context/AuthContext';
import { PAISES } from '../core/paises';
import { PREMIUM_ACCENT, PREMIUM_SURFACE_SOFT, THEME, W } from '../constants/theme';

function PaisPicklist({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = PAISES.find((pais) => pais.value === value) || PAISES[0];

  return (
    <>
      <TouchableOpacity style={pick.trigger} onPress={() => setOpen(true)}>
        <Text style={pick.triggerText}>{selected.label}</Text>
        <Ionicons name="chevron-down" size={18} color="#777" />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={pick.overlay}>
          <View style={pick.sheet}>
            <View style={pick.sheetHeader}>
              <Text style={pick.sheetTitle}>Selecciona tu país</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={24} color="#111" />
              </TouchableOpacity>
            </View>

            <ScrollView>
              {PAISES.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[pick.item, item.value === value && pick.itemActive]}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  <Text style={pick.itemText}>{item.label}</Text>
                  {item.value === value && <Ionicons name="checkmark" size={20} color={PREMIUM_ACCENT} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function ProfileScreen({ isPremium, premiumDaysLeft, onClose, onProfileSaved }) {
  const { user } = useAuth();
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

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <AppDialogModal
        visible={dialogVisible}
        onClose={() => setDialogVisible(false)}
        title={dialogConfig.title}
        description={dialogConfig.description}
        actions={dialogConfig.actions}
      />

      <SafeAreaView style={styles.screen}>
        <StatusBar barStyle="dark-content" />

        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="chevron-back" size={24} color="#111" />
          </TouchableOpacity>
          <Text style={styles.title}>Mi perfil</Text>
          <View style={styles.closeBtn} />
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <TouchableOpacity style={styles.avatarWrap} onPress={elegirFoto}>
            {foto ? (
              <Image source={{ uri: foto }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{(nombre || alias || email || '?')[0].toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.avatarBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
            <Text style={styles.avatarEmail}>{user?.email}</Text>
            {isPremium && <PremiumBadge size="lg" style={{ marginTop: 8 }} />}
            {isPremium && (
              <Text style={styles.premiumText}>
                {premiumDaysLeft == null ? 'Premium de por vida activo' : `Premium activo · ${premiumDaysLeft} días restantes`}
              </Text>
            )}
            <Text style={styles.avatarHint}>Toca para cambiar foto</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Nombre *</Text>
          <TextInput style={styles.input} placeholder="Tu nombre" placeholderTextColor="#bbb" value={nombre} onChangeText={setNombre} />

          <Text style={styles.label}>Apellidos *</Text>
          <TextInput style={styles.input} placeholder="Tus apellidos" placeholderTextColor="#bbb" value={apellidos} onChangeText={setApellidos} />

          <Text style={styles.label}>Alias *</Text>
          <TextInput
            style={styles.input}
            placeholder="@tu_alias"
            placeholderTextColor="#bbb"
            value={alias}
            onChangeText={setAlias}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            placeholder="tu@email.com"
            placeholderTextColor="#bbb"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={styles.input}
            placeholder="+34 600 000 000"
            placeholderTextColor="#bbb"
            value={telefono}
            onChangeText={setTelefono}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>País</Text>
          <PaisPicklist value={pais} onChange={setPais} />

          <TouchableOpacity
            style={[styles.primaryButton, { marginTop: 24, opacity: guardando || !camposObligatoriosCompletos ? 0.8 : 1 }]}
            onPress={guardar}
            disabled={guardando}
          >
            {guardando ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Guardar cambios</Text>}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: THEME.border.soft,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: '#111' },
  body: { padding: 24 },
  avatarWrap: { alignItems: 'center', marginBottom: 32, gap: 6 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: PREMIUM_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImg: { width: 90, height: 90, borderRadius: 45 },
  avatarText: { fontSize: 40, fontWeight: '800', color: '#fff' },
  avatarEmail: { fontSize: 13, color: THEME.text.secondary },
  avatarBadge: {
    position: 'absolute',
    bottom: 52,
    right: W / 2 - 55,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PREMIUM_ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarHint: { fontSize: 12, color: THEME.text.muted },
  premiumText: { fontSize: 12, color: THEME.text.secondary },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111',
    marginBottom: 18,
  },
  primaryButton: {
    backgroundColor: THEME.brand.primary,
    borderRadius: 30,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: THEME.brand.primaryBorder,
    shadowColor: THEME.brand.primary,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  primaryButtonText: {
    color: THEME.brand.onPrimary,
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});

const pick = StyleSheet.create({
  trigger: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#111',
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  triggerText: { fontSize: 15, color: '#111' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: THEME.border.soft,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: '#111' },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#f5f5f5',
  },
  itemActive: { backgroundColor: PREMIUM_SURFACE_SOFT },
  itemText: { fontSize: 15, color: '#111' },
});
