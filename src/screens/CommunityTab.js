import { Animated, View } from 'react-native';
import MemberInfoModal from '../components/MemberInfoModal';
import CommunityCategoriesView from './community/CommunityCategoriesView';
import CommunityCreateThreadModal from './community/CommunityCreateThreadModal';
import CommunityEditItemModal from './community/CommunityEditItemModal';
import CommunityThreadDetailView from './community/CommunityThreadDetailView';
import CommunityThreadListView from './community/CommunityThreadListView';
import useCommunityTabUi from './community/useCommunityTabUi';

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
  forumSort,
  setForumSort,
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
  const isAdmin = perfil?.role === 'admin';
  const isStaff = perfil?.role === 'staff';
  const {
    showMemberInfo,
    setShowMemberInfo,
    communityHeroAnim,
    categoryRowAnimsRef,
    categoryPressAnimsRef,
    threadRowAnimsRef,
    threadPressAnimsRef,
    threadListEnterAnim,
    skeletonShimmerAnim,
    composerEnterAnim,
    createModalAnim,
    editModalAnim,
    getPressAnim,
    animatePressIn,
    animatePressOut,
    closeCreateModal,
    closeEditModal,
    handleCreateBackdropPress,
    handleEditBackdropPress,
    handleOpenCreate,
    handleOpenCategory,
    handleOpenThread,
    handleReplyPress,
    handleSendReply,
    handlePublishThread,
    handleSaveEdit,
  } = useCommunityTabUi({
    forumCategories,
    forumCategory,
    setForumCategory,
    forumThread,
    setForumThread,
    forumCreateOpen,
    setForumCreateOpen,
    forumLoading,
    forumThreadsByCategory,
    prepararRespuestaForo,
    enviarRespuestaForo,
    crearHiloForo,
    forumEditOpen,
    setForumEditOpen,
    guardarEdicionForo,
    interactionFeedbackEnabled,
    interactionFeedbackMode,
  });

  return (
    <View style={{ flex: 1 }}>
      <MemberInfoModal visible={showMemberInfo} onClose={() => setShowMemberInfo(false)} />
      {!forumCategory && (
        <View style={{ flex: 1 }}>
          <Animated.View style={{ opacity: communityHeroAnim }}>
            <CommunityCategoriesView
              s={s}
              gamification={gamification}
              getAchievementDefs={getAchievementDefs}
              forumCategories={forumCategories}
              categoryRowAnimsRef={categoryRowAnimsRef}
              getPressAnim={getPressAnim}
              categoryPressAnimsRef={categoryPressAnimsRef}
              handleOpenCategory={handleOpenCategory}
              animatePressIn={animatePressIn}
              animatePressOut={animatePressOut}
            />
          </Animated.View>
        </View>
      )}

      {forumCategory && !forumThread && (
        <CommunityThreadListView
          s={s}
          PremiumBadge={PremiumBadge}
          forumCategory={forumCategory}
          setForumCategory={setForumCategory}
          handleOpenCreate={handleOpenCreate}
          forumSort={forumSort}
          setForumSort={setForumSort}
          forumLoading={forumLoading}
          forumThreadsByCategory={forumThreadsByCategory}
          forumError={forumError}
          formatRelativeTime={formatRelativeTime}
          threadListEnterAnim={threadListEnterAnim}
          skeletonShimmerAnim={skeletonShimmerAnim}
          threadRowAnimsRef={threadRowAnimsRef}
          getPressAnim={getPressAnim}
          threadPressAnimsRef={threadPressAnimsRef}
          animatePressIn={animatePressIn}
          animatePressOut={animatePressOut}
          handleOpenThread={handleOpenThread}
        />
      )}

      {forumCategory && forumThread && (
        <CommunityThreadDetailView
          s={s}
          theme={theme}
          PremiumBadge={PremiumBadge}
          forumThread={forumThread}
          setForumThread={setForumThread}
          setForumReplyTo={setForumReplyTo}
          forumThreadScrollRef={forumThreadScrollRef}
          hasUserVotedForoItem={hasUserVotedForoItem}
          hasUserReportedForoItem={hasUserReportedForoItem}
          isForumOwner={isForumOwner}
          isAdmin={isAdmin}
          isStaff={isStaff}
          abrirMenuAutorForo={abrirMenuAutorForo}
          votarEnForo={votarEnForo}
          reportarForo={reportarForo}
          formatRelativeTime={formatRelativeTime}
          forumTopReplies={forumTopReplies}
          forumRepliesByThread={forumRepliesByThread}
          handleReplyPress={handleReplyPress}
          composerEnterAnim={composerEnterAnim}
          forumReplyTo={forumReplyTo}
          forumReplyInputRef={forumReplyInputRef}
          forumReplyText={forumReplyText}
          setForumReplyText={setForumReplyText}
          handleSendReply={handleSendReply}
          forumSendingReply={forumSendingReply}
        />
      )}

      <CommunityCreateThreadModal
        visible={forumCreateOpen}
        s={s}
        theme={theme}
        forumCategory={forumCategory}
        forumTitle={forumTitle}
        setForumTitle={setForumTitle}
        forumBody={forumBody}
        setForumBody={setForumBody}
        forumAccessLevel={forumAccessLevel}
        setForumAccessLevel={setForumAccessLevel}
        forumPhoto={forumPhoto}
        seleccionarFotoForo={seleccionarFotoForo}
        forumSaving={forumSaving}
        handlePublishThread={handlePublishThread}
        closeCreateModal={closeCreateModal}
        onBackdropPress={handleCreateBackdropPress}
        createModalAnim={createModalAnim}
      />

      <CommunityEditItemModal
        visible={forumEditOpen}
        s={s}
        forumEditCollection={forumEditCollection}
        forumEditTitle={forumEditTitle}
        setForumEditTitle={setForumEditTitle}
        forumEditBody={forumEditBody}
        setForumEditBody={setForumEditBody}
        forumEditing={forumEditing}
        closeEditModal={closeEditModal}
        handleSaveEdit={handleSaveEdit}
        onBackdropPress={handleEditBackdropPress}
        editModalAnim={editModalAnim}
      />
    </View>
  );
}
