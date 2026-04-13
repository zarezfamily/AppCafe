import {
  triggerCommunityConfirmFeedback,
  triggerCommunityTapFeedback,
} from './interactionFeedback';

const createTapFeedback = (interactionFeedbackEnabled, interactionFeedbackMode) => () => {
  triggerCommunityTapFeedback({
    enabled: interactionFeedbackEnabled,
    mode: interactionFeedbackMode,
  });
};

const createConfirmFeedback = (interactionFeedbackEnabled, interactionFeedbackMode) => () => {
  triggerCommunityConfirmFeedback({
    enabled: interactionFeedbackEnabled,
    mode: interactionFeedbackMode,
  });
};

export const buildCommunityUiActions = ({
  interactionFeedbackEnabled,
  interactionFeedbackMode,
  setForumCreateOpen,
  setForumCategory,
  setForumThread,
  prepararRespuestaForo,
  enviarRespuestaForo,
  crearHiloForo,
  guardarEdicionForo,
  closeCreateModal,
  closeEditModal,
}) => {
  const hapticTap = createTapFeedback(interactionFeedbackEnabled, interactionFeedbackMode);
  const hapticConfirm = createConfirmFeedback(interactionFeedbackEnabled, interactionFeedbackMode);

  return {
    hapticTap,
    hapticConfirm,
    handleCreateBackdropPress: () => {
      hapticTap();
      closeCreateModal();
    },
    handleEditBackdropPress: () => {
      hapticTap();
      closeEditModal();
    },
    handleOpenCreate: () => {
      hapticTap();
      setForumCreateOpen(true);
    },
    handleOpenCategory: (category) => {
      hapticTap();
      setForumCategory(category);
    },
    handleOpenThread: (thread) => {
      hapticTap();
      setForumThread(thread);
    },
    handleReplyPress: (reply) => {
      hapticTap();
      prepararRespuestaForo(reply);
    },
    handleSendReply: () => {
      hapticConfirm();
      enviarRespuestaForo();
    },
    handlePublishThread: () => {
      hapticConfirm();
      crearHiloForo();
    },
    handleSaveEdit: () => {
      hapticConfirm();
      guardarEdicionForo();
    },
  };
};
