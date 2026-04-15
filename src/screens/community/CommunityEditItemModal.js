import { Text } from 'react-native';
import { CommunityBodyField, CommunityCountText, CommunityTitleField } from './CommunityFormFields';
import CommunityModalActions from './CommunityModalActions';
import CommunityModalSheet from './CommunityModalSheet';

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
    <CommunityModalSheet
      visible={visible}
      s={s}
      animation={editModalAnim}
      onClose={closeEditModal}
      onBackdropPress={onBackdropPress}
    >
      <Text style={s.sectionTitle}>
        {forumEditCollection === 'foro_hilos' ? 'Editar hilo' : 'Editar respuesta'}
      </Text>
      {forumEditCollection === 'foro_hilos' && (
        <CommunityTitleField s={s} value={forumEditTitle} onChangeText={setForumEditTitle} />
      )}
      <CommunityBodyField
        s={s}
        value={forumEditBody}
        onChangeText={setForumEditBody}
        marginTop={forumEditCollection === 'foro_hilos' ? -6 : 4}
        placeholder="Escribe aquí..."
      />
      <CommunityCountText
        s={s}
        titleLength={forumEditTitle.length}
        bodyLength={forumEditBody.length}
        showTitleLength={forumEditCollection === 'foro_hilos'}
      />
      <CommunityModalActions
        s={s}
        onCancel={closeEditModal}
        onSubmit={handleSaveEdit}
        submitLabel="Guardar"
        loading={forumEditing}
      />
    </CommunityModalSheet>
  );
}
