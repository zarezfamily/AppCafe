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

export default function CommunityEditItemModal({
  visible,
  s,
  forumEditCollection,
  forumEditTitle,
  setForumEditTitle,
  forumEditBody,
  setForumEditBody,
  forumEditing,
  closeEditModal,
  handleSaveEdit,
  onBackdropPress,
  editModalAnim,
}) {
  return (
    <Modal visible={!!visible} animationType="none" transparent onRequestClose={closeEditModal}>
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
              opacity: editModalAnim,
            }}
          />
        </TouchableOpacity>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
          <Animated.View
            style={[
              s.forumModalCard,
              {
                opacity: editModalAnim,
                transform: [
                  {
                    translateY: editModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [36, 0],
                    }),
                  },
                  {
                    scale: editModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.985, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={s.sectionTitle}>
              {forumEditCollection === 'foro_hilos' ? 'Editar hilo' : 'Editar respuesta'}
            </Text>
            {forumEditCollection === 'foro_hilos' && (
              <>
                <Text style={[s.label, { marginTop: 4 }]}>Título</Text>
                <TextInput
                  style={s.input}
                  value={forumEditTitle}
                  onChangeText={(value) => setForumEditTitle(value.slice(0, 120))}
                  placeholder="Máximo 120 caracteres"
                  placeholderTextColor="#b3a9a0"
                />
              </>
            )}
            <Text style={[s.label, { marginTop: forumEditCollection === 'foro_hilos' ? -6 : 4 }]}>Contenido</Text>
            <TextInput
              style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]}
              value={forumEditBody}
              onChangeText={(value) => setForumEditBody(value.slice(0, 1000))}
              placeholder="Escribe aquí..."
              placeholderTextColor="#b3a9a0"
              multiline
            />
            <Text style={s.forumCountText}>
              {forumEditCollection === 'foro_hilos' ? `${forumEditTitle.length}/120 · ` : ''}
              {forumEditBody.length}/1000
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingBottom: Platform.OS === 'ios' ? 8 : 14 }}>
              <TouchableOpacity style={[s.authSecondaryBtn, { flex: 1, marginTop: 0 }]} onPress={closeEditModal}>
                <Text style={s.authSecondaryBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.redBtn, { flex: 1, marginTop: 0 }]} onPress={handleSaveEdit} disabled={!!forumEditing}>
                {!!forumEditing ? <ActivityIndicator color="#fff" /> : <Text style={s.redBtnText}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
