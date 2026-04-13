import { useEffect, useRef, useState } from 'react';
import { Animated, Vibration } from 'react-native';

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
  const communityHeroAnim = useRef(new Animated.Value(0)).current;
  const categoryRowAnimsRef = useRef([]);
  const categoryPressAnimsRef = useRef([]);
  const threadRowAnimsRef = useRef([]);
  const threadPressAnimsRef = useRef([]);
  const threadListEnterAnim = useRef(new Animated.Value(0)).current;
  const skeletonShimmerAnim = useRef(new Animated.Value(0)).current;
  const skeletonLoopRef = useRef(null);
  const composerEnterAnim = useRef(new Animated.Value(0)).current;
  const createModalAnim = useRef(new Animated.Value(0)).current;
  const editModalAnim = useRef(new Animated.Value(0)).current;

  const getPressAnim = (ref, idx) => {
    if (!ref.current[idx]) ref.current[idx] = new Animated.Value(1);
    return ref.current[idx];
  };

  const animatePressIn = (anim) => {
    Animated.spring(anim, {
      toValue: 0.975,
      friction: 8,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const animatePressOut = (anim) => {
    Animated.spring(anim, {
      toValue: 1,
      friction: 7,
      tension: 170,
      useNativeDriver: true,
    }).start();
  };

  const openModalAnim = (anim) => {
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1,
      friction: 8,
      tension: 110,
      useNativeDriver: true,
    }).start();
  };

  const closeModalAnim = (anim, onClosed) => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && onClosed) onClosed();
    });
  };

  const hapticTap = () => {
    if (!interactionFeedbackEnabled) return;
    Vibration.vibrate(interactionFeedbackMode === 'sound' ? 6 : 8);
  };

  const hapticConfirm = () => {
    if (!interactionFeedbackEnabled) return;
    Vibration.vibrate(interactionFeedbackMode === 'sound' ? 10 : 14);
  };

  const closeCreateModal = () => closeModalAnim(createModalAnim, () => setForumCreateOpen(false));
  const closeEditModal = () => closeModalAnim(editModalAnim, () => setForumEditOpen(false));
  const handleCreateBackdropPress = () => {
    hapticTap();
    closeCreateModal();
  };
  const handleEditBackdropPress = () => {
    hapticTap();
    closeEditModal();
  };

  const handleOpenCreate = () => {
    hapticTap();
    setForumCreateOpen(true);
  };

  const handleOpenCategory = (category) => {
    hapticTap();
    setForumCategory(category);
  };

  const handleOpenThread = (thread) => {
    hapticTap();
    setForumThread(thread);
  };

  const handleReplyPress = (reply) => {
    hapticTap();
    prepararRespuestaForo(reply);
  };

  const handleSendReply = () => {
    hapticConfirm();
    enviarRespuestaForo();
  };

  const handlePublishThread = () => {
    hapticConfirm();
    crearHiloForo();
  };

  const handleSaveEdit = () => {
    hapticConfirm();
    guardarEdicionForo();
  };

  useEffect(() => {
    if (forumCategory) return;
    communityHeroAnim.setValue(0);
    while (categoryRowAnimsRef.current.length < forumCategories.length) {
      categoryRowAnimsRef.current.push(new Animated.Value(0));
    }
    categoryRowAnimsRef.current = categoryRowAnimsRef.current.slice(0, forumCategories.length);
    categoryPressAnimsRef.current = categoryPressAnimsRef.current.slice(0, forumCategories.length);
    categoryRowAnimsRef.current.forEach((anim) => anim.setValue(0));

    Animated.timing(communityHeroAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();

    Animated.stagger(
      65,
      categoryRowAnimsRef.current.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [communityHeroAnim, forumCategories, forumCategory]);

  useEffect(() => {
    if (!forumCategory || forumThread || forumLoading) return;
    threadListEnterAnim.setValue(0);
    while (threadRowAnimsRef.current.length < forumThreadsByCategory.length) {
      threadRowAnimsRef.current.push(new Animated.Value(0));
    }
    threadRowAnimsRef.current = threadRowAnimsRef.current.slice(0, forumThreadsByCategory.length);
    threadPressAnimsRef.current = threadPressAnimsRef.current.slice(0, forumThreadsByCategory.length);
    threadRowAnimsRef.current.forEach((anim) => anim.setValue(0));

    Animated.timing(threadListEnterAnim, {
      toValue: 1,
      duration: 260,
      useNativeDriver: true,
    }).start();

    Animated.stagger(
      55,
      threadRowAnimsRef.current.map((anim) =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 230,
          useNativeDriver: true,
        })
      )
    ).start();
  }, [forumCategory, forumLoading, forumThread, forumThreadsByCategory, threadListEnterAnim]);

  useEffect(() => {
    if (forumCategory && !forumThread && forumLoading) {
      skeletonShimmerAnim.setValue(0);
      skeletonLoopRef.current = Animated.loop(
        Animated.timing(skeletonShimmerAnim, {
          toValue: 1,
          duration: 1050,
          useNativeDriver: true,
        })
      );
      skeletonLoopRef.current.start();
      return () => {
        if (skeletonLoopRef.current) {
          skeletonLoopRef.current.stop();
          skeletonLoopRef.current = null;
        }
      };
    }

    return undefined;
  }, [forumCategory, forumLoading, forumThread, skeletonShimmerAnim]);

  useEffect(() => {
    if (forumCategory && forumThread) {
      composerEnterAnim.setValue(0);
      Animated.timing(composerEnterAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
      return;
    }
    composerEnterAnim.setValue(0);
  }, [composerEnterAnim, forumCategory, forumThread]);

  useEffect(() => {
    if (forumCreateOpen) openModalAnim(createModalAnim);
  }, [createModalAnim, forumCreateOpen]);

  useEffect(() => {
    if (forumEditOpen) openModalAnim(editModalAnim);
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
