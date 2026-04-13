import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { buildCommunityUiActions } from '../../domain/community/actions';
import {
  ensureIndexedAnimatedValue,
  prepareStaggeredAnimatedValues,
  runCommunityModalClose,
  runCommunityModalOpen,
  runCommunityPressIn,
  runCommunityPressOut,
  runFadeIn,
  runStaggeredFadeIn,
  startShimmerLoop,
  stopShimmerLoop,
} from '../../domain/community/animations';

export default function useCommunityTabUi({
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
}) {
  const [showMemberInfo, setShowMemberInfo] = useState(false);
  const communityHeroAnim = useRef(new Animated.Value(1)).current;
  const categoryRowAnimsRef = useRef([]);
  const categoryPressAnimsRef = useRef([]);
  const threadRowAnimsRef = useRef([]);
  const threadPressAnimsRef = useRef([]);
  const threadListEnterAnim = useRef(new Animated.Value(1)).current;
  const skeletonShimmerAnim = useRef(new Animated.Value(0)).current;
  const skeletonLoopRef = useRef(null);
  const composerEnterAnim = useRef(new Animated.Value(1)).current;
  const createModalAnim = useRef(new Animated.Value(0)).current;
  const editModalAnim = useRef(new Animated.Value(0)).current;

  const getPressAnim = (ref, idx) => ensureIndexedAnimatedValue(ref, idx);
  const animatePressIn = runCommunityPressIn;
  const animatePressOut = runCommunityPressOut;

  const closeCreateModal = () => runCommunityModalClose(createModalAnim, () => setForumCreateOpen(false));
  const closeEditModal = () => runCommunityModalClose(editModalAnim, () => setForumEditOpen(false));
  const {
    hapticTap,
    handleCreateBackdropPress,
    handleEditBackdropPress,
    handleOpenCreate,
    handleOpenCategory,
    handleOpenThread,
    handleReplyPress,
    handleSendReply,
    handlePublishThread,
    handleSaveEdit,
  } = buildCommunityUiActions({
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
  });

  useEffect(() => {
    if (forumCategory) return;
    communityHeroAnim.setValue(0);
    prepareStaggeredAnimatedValues(categoryRowAnimsRef, categoryPressAnimsRef, forumCategories.length, 0);
    runFadeIn(communityHeroAnim, 320);
    runStaggeredFadeIn(categoryRowAnimsRef.current, 65, 260);
  }, [communityHeroAnim, forumCategories, forumCategory]);

  useEffect(() => {
    if (!forumCategory || forumThread || forumLoading) return;
    threadListEnterAnim.setValue(0);
    prepareStaggeredAnimatedValues(threadRowAnimsRef, threadPressAnimsRef, forumThreadsByCategory.length, 0);
    runFadeIn(threadListEnterAnim, 260);
    runStaggeredFadeIn(threadRowAnimsRef.current, 55, 230);
  }, [forumCategory, forumLoading, forumThread, forumThreadsByCategory, threadListEnterAnim]);

  useEffect(() => {
    if (forumCategory && !forumThread && forumLoading) {
      startShimmerLoop(skeletonShimmerAnim, skeletonLoopRef, 1050);
      return () => {
        stopShimmerLoop(skeletonLoopRef);
      };
    }

    return undefined;
  }, [forumCategory, forumLoading, forumThread, skeletonShimmerAnim]);

  useEffect(() => {
    if (forumCategory && forumThread) {
      composerEnterAnim.setValue(0);
      runFadeIn(composerEnterAnim, 250);
      return;
    }
    composerEnterAnim.setValue(0);
  }, [composerEnterAnim, forumCategory, forumThread]);

  useEffect(() => {
    if (forumCreateOpen) runCommunityModalOpen(createModalAnim);
  }, [createModalAnim, forumCreateOpen]);

  useEffect(() => {
    if (forumEditOpen) runCommunityModalOpen(editModalAnim);
  }, [editModalAnim, forumEditOpen]);

  return {
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
    hapticTap,
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
  };
}
