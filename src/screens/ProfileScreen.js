import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Image,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import AppDialogModal from '../components/AppDialogModal';
import PaisPicklist from './PaisPicklist';
import PremiumBadge from './PremiumBadge';
import { useAuth } from '../context/AuthContext';
import { profileScreenStyles as styles } from './profileScreenStyles';
import useProfileScreen from './useProfileScreen';

export default function ProfileScreen({ isPremium, premiumDaysLeft, onClose, onProfileSaved }) {
  const { user } = useAuth();
  const {
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
    guardando,
    dialogVisible,
    setDialogVisible,
    dialogConfig,
    camposObligatoriosCompletos,
    elegirFoto,
    guardar,
  } = useProfileScreen({
    user,
    onClose,
    onProfileSaved,
  });

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
