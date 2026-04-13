import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

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
    <Modal visible={!!visible} animationType="none" transparent onRequestClose={closeCreateModal}>
      <KeyboardAvoidingView
        style={[s.forumModalOverlay, { backgroundColor: 'transparent' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onBackdropPress}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.35)',
              opacity: createModalAnim,
            }}
          />
        </TouchableOpacity>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
          <Animated.View
            style={[
              s.forumModalCard,
              {
                opacity: createModalAnim,
                transform: [
                  {
                    translateY: createModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [36, 0],
                    }),
                  },
                  {
                    scale: createModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.985, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={s.sectionTitle}>Nuevo hilo</Text>
            <Text style={s.sectionSub}>{forumCategory?.label || 'Comunidad'}</Text>
            <Text style={[s.label, { marginTop: 4 }]}>Título</Text>
            <TextInput
              style={s.input}
              value={forumTitle}
              onChangeText={(value) => setForumTitle(value.slice(0, 120))}
              placeholder="Máximo 120 caracteres"
              placeholderTextColor="#b3a9a0"
            />
            <Text style={[s.label, { marginTop: -6 }]}>Contenido</Text>
            <TextInput
              style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]}
              value={forumBody}
              onChangeText={(value) => setForumBody(value.slice(0, 1000))}
              placeholder="Comparte tu experiencia cafetera..."
              placeholderTextColor="#b3a9a0"
              multiline
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
            <Text style={s.forumCountText}>
              {forumTitle.length}/120 · {forumBody.length}/1000
            </Text>
            <TouchableOpacity style={s.faceIdBtn} onPress={seleccionarFotoForo}>
              <Ionicons name="image-outline" size={18} color={theme.brand.accentDeep} />
              <Text style={s.faceIdText}>{forumPhoto ? 'Cambiar foto' : 'Añadir foto opcional'}</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingBottom: Platform.OS === 'ios' ? 8 : 14 }}>
              <TouchableOpacity style={[s.authSecondaryBtn, { flex: 1, marginTop: 0 }]} onPress={closeCreateModal}>
                <Text style={s.authSecondaryBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.redBtn, { flex: 1, marginTop: 0 }]}
                onPress={handlePublishThread}
                disabled={!!forumSaving}
              >
                {!!forumSaving ? <ActivityIndicator color="#fff" /> : <Text style={s.redBtnText}>Publicar</Text>}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
