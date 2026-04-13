import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { CommunityBodyField, CommunityCountText, CommunityTitleField } from './CommunityFormFields';
import CommunityModalActions from './CommunityModalActions';
import CommunityModalSheet from './CommunityModalSheet';

export default function CommunityCreateThreadModal({
  visible,
  s,
  theme,
  forumCategory,
  forumTitle,
  setForumTitle,
  forumBody,
  setForumBody,
  forumAccessLevel,
  setForumAccessLevel,
  forumPhoto,
  seleccionarFotoForo,
  forumSaving,
  handlePublishThread,
  closeCreateModal,
  onBackdropPress,
  createModalAnim,
}) {
  return (
    <CommunityModalSheet
      visible={visible}
      s={s}
      animation={createModalAnim}
      onClose={closeCreateModal}
      onBackdropPress={onBackdropPress}
    >
      <Text style={s.sectionTitle}>Nuevo hilo</Text>
      <Text style={s.sectionSub}>{forumCategory?.label || 'Comunidad'}</Text>
      <CommunityTitleField
        s={s}
        value={forumTitle}
        onChangeText={setForumTitle}
      />
      <CommunityBodyField
        s={s}
        value={forumBody}
        onChangeText={setForumBody}
        placeholder="Comparte tu experiencia cafetera..."
      />
      <Text style={[s.label, { marginTop: -6 }]}>Visibilidad</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        <TouchableOpacity
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: forumAccessLevel === 'public' ? '#8f5e3b' : '#d8c5b6',
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
            backgroundColor: forumAccessLevel === 'public' ? '#f3e9de' : '#fff',
          }}
          onPress={() => setForumAccessLevel('public')}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#5d4030' }}>Público</Text>
          <Text style={{ fontSize: 11, color: '#8b7355', marginTop: 2 }}>Cualquiera puede leerlo</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: forumAccessLevel === 'registered_only' ? '#8f5e3b' : '#d8c5b6',
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
            backgroundColor: forumAccessLevel === 'registered_only' ? '#f3e9de' : '#fff',
          }}
          onPress={() => setForumAccessLevel('registered_only')}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#5d4030' }}>Solo registrados</Text>
          <Text style={{ fontSize: 11, color: '#8b7355', marginTop: 2 }}>Solo usuarios con sesión</Text>
        </TouchableOpacity>
      </View>
      <CommunityCountText s={s} titleLength={forumTitle.length} bodyLength={forumBody.length} />
      <TouchableOpacity style={s.faceIdBtn} onPress={seleccionarFotoForo}>
        <Ionicons name="image-outline" size={18} color={theme.brand.accentDeep} />
        <Text style={s.faceIdText}>{forumPhoto ? 'Cambiar foto' : 'Añadir foto opcional'}</Text>
      </TouchableOpacity>
      <CommunityModalActions
        s={s}
        onCancel={closeCreateModal}
        onSubmit={handlePublishThread}
        submitLabel="Publicar"
        loading={forumSaving}
      />
    </CommunityModalSheet>
  );
}
