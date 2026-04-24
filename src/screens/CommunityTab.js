import { Animated, View } from 'react-native';
import MemberInfoModal from '../components/MemberInfoModal';
import CommunityCategoriesView from './community/CommunityCategoriesView';
import CommunityCreateThreadModal from './community/CommunityCreateThreadModal';
import CommunityEditItemModal from './community/CommunityEditItemModal';
import CommunityThreadDetailView from './community/CommunityThreadDetailView';
import CommunityThreadListView from './community/CommunityThreadListView';
import useCommunityTabComposition from './community/useCommunityTabComposition';

export default function CommunityTab({
  s,
  theme,
  PremiumBadge,
  forumCategories,
  forumCategory,
  setForumCategory,
  forumThread,
  setForumThread,
  forumCreateOpen,
  setForumCreateOpen,
  forumLoading,
  forumThreadsByCategory,
  forumError,
  formatRelativeTime,
  forumThreadScrollRef,
  hasUserVotedForoItem,
  hasUserReportedForoItem,
  isForumOwner,
  abrirMenuAutorForo,
  votarEnForo,
  reportarForo,
  forumTopReplies,
  forumRepliesByThread,
  prepararRespuestaForo,
  setForumReplyTo,
  forumReplyTo,
  forumReplyInputRef,
  forumReplyText,
  setForumReplyText,
  enviarRespuestaForo,
  forumSendingReply,
  forumTitle,
  setForumTitle,
  forumBody,
  setForumBody,
  forumAccessLevel,
  setForumAccessLevel,
  forumPhoto,
  seleccionarFotoForo,
  crearHiloForo,
  forumSaving,
  forumEditOpen,
  setForumEditOpen,
  forumEditCollection,
  forumEditTitle,
  setForumEditTitle,
  forumEditBody,
  setForumEditBody,
  guardarEdicionForo,
  forumEditing,
  interactionFeedbackEnabled,
  interactionFeedbackMode,
  gamification,
  getAchievementDefs,
  perfil,
}) {
  const {
    showCategories,
    showThreadList,
    showThreadDetail,
    categoriesViewProps,
    threadListViewProps,
    threadDetailViewProps,
    createModalProps,
    editModalProps,
    ui: { showMemberInfo, setShowMemberInfo, communityHeroAnim },
  } = useCommunityTabComposition({
    s,
    theme,
    PremiumBadge,
    perfil,
    gamification,
    getAchievementDefs,
    forumCategories,
    forumCategory,
    setForumCategory,
    forumThread,
    setForumThread,
    forumCreateOpen,
    setForumCreateOpen,
    forumLoading,
    forumThreadsByCategory,
    forumError,
    formatRelativeTime,
    forumThreadScrollRef,
    hasUserVotedForoItem,
    hasUserReportedForoItem,
    isForumOwner,
    abrirMenuAutorForo,
    votarEnForo,
    reportarForo,
    forumTopReplies,
    forumRepliesByThread,
    prepararRespuestaForo,
    setForumReplyTo,
    forumReplyTo,
    forumReplyInputRef,
    forumReplyText,
    setForumReplyText,
    enviarRespuestaForo,
    forumSendingReply,
    forumTitle,
    setForumTitle,
    forumBody,
    setForumBody,
    forumAccessLevel,
    setForumAccessLevel,
    forumPhoto,
    seleccionarFotoForo,
    crearHiloForo,
    forumSaving,
    forumEditOpen,
    setForumEditOpen,
    forumEditCollection,
    forumEditTitle,
    setForumEditTitle,
    forumEditBody,
    setForumEditBody,
    guardarEdicionForo,
    forumEditing,
    interactionFeedbackEnabled,
    interactionFeedbackMode,
  });

  const renderCommunityView = () => {
    if (showThreadDetail) return <CommunityThreadDetailView {...threadDetailViewProps} />;
    if (showThreadList) return <CommunityThreadListView {...threadListViewProps} />;
    if (showCategories) {
      return (
        <View style={{ flex: 1 }}>
          <Animated.View style={{ flex: 1, opacity: communityHeroAnim }}>
            <CommunityCategoriesView {...categoriesViewProps} />
          </Animated.View>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={{ flex: 1 }}>
      <MemberInfoModal visible={showMemberInfo} onClose={() => setShowMemberInfo(false)} />
      {renderCommunityView()}
      <CommunityCreateThreadModal {...createModalProps} />
      <CommunityEditItemModal {...editModalProps} />
    </View>
  );
}
