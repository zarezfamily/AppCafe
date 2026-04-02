import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import {
    ActivityIndicator,
    Animated,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';

export default function CommunityTab({
  s,
  theme,
  premiumAccent,
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
}) {
  const communityHeroAnim = useRef(new Animated.Value(0)).current;
  const categoryRowAnimsRef = useRef([]);
  const categoryPressAnimsRef = useRef([]);
  const threadRowAnimsRef = useRef([]);
  const threadPressAnimsRef = useRef([]);
  const categoryListEnterAnim = useRef(new Animated.Value(0)).current;
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

  const handleOpenCreate = () => {
    hapticTap();
    setForumCreateOpen(true);
  };

  const handleOpenCategory = (cat) => {
    hapticTap();
    setForumCategory(cat);
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
    categoryListEnterAnim.setValue(0);
    while (categoryRowAnimsRef.current.length < forumCategories.length) {
      categoryRowAnimsRef.current.push(new Animated.Value(0));
    }
    categoryRowAnimsRef.current = categoryRowAnimsRef.current.slice(0, forumCategories.length);
    categoryPressAnimsRef.current = categoryPressAnimsRef.current.slice(0, forumCategories.length);
    categoryRowAnimsRef.current.forEach((anim) => anim.setValue(0));

    Animated.parallel([
      Animated.timing(communityHeroAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(categoryListEnterAnim, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.stagger(
      65,
      categoryRowAnimsRef.current.map((anim) => Animated.timing(anim, {
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }))
    ).start();
  }, [categoryListEnterAnim, communityHeroAnim, forumCategories, forumCategory]);

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
      threadRowAnimsRef.current.map((anim) => Animated.timing(anim, {
        toValue: 1,
        duration: 230,
        useNativeDriver: true,
      }))
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

  return (
    <View style={{ flex: 1 }}>
      {!forumCategory && (
        <Animated.ScrollView
          contentContainerStyle={s.communityScrollContent}
          style={{
            opacity: categoryListEnterAnim,
            transform: [
              {
                translateX: categoryListEnterAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-14, 0],
                }),
              },
            ],
          }}
        >
          <View style={s.communityIntroWrap}>
            <Animated.View
              style={[
                s.communityHeroCard,
                {
                  opacity: communityHeroAnim,
                  transform: [
                    {
                      translateY: communityHeroAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [16, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={s.communityHeroGlowOne} />
              <View style={s.communityHeroGlowTwo} />
              <Text style={s.communityHeroKicker}>SALON ETIOVE</Text>
              <Text style={s.communityHeroTitle}>Comunidad cafetera</Text>
              <Text style={s.communityHeroSub}>Comparte recetas, descubre tostadores y conversa con amantes del cafe de especialidad.</Text>
              <View style={s.communityHeroMetaRow}>
                <View style={s.communityHeroBadge}>
                  <Text style={s.communityHeroBadgeText}>{forumCategories.length} categorias</Text>
                </View>
                <Text style={s.communityHeroHint}>Toca una para entrar</Text>
              </View>
            </Animated.View>
          </View>
          <View style={s.communityCategoryGrid}>
            {forumCategories.map((cat, idx) => {
              const rowAnim = categoryRowAnimsRef.current[idx] || new Animated.Value(1);
              const pressAnim = getPressAnim(categoryPressAnimsRef, idx);
              return (
                <Animated.View
                  key={cat.id}
                  style={{
                    opacity: rowAnim,
                    transform: [
                      {
                        translateY: rowAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [14, 0],
                        }),
                      },
                      {
                        scale: rowAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.98, 1],
                        }),
                      },
                      { scale: pressAnim },
                    ],
                  }}
                >
                  <TouchableOpacity
                    style={s.forumCatCard}
                    onPress={() => handleOpenCategory(cat)}
                    onPressIn={() => animatePressIn(pressAnim)}
                    onPressOut={() => animatePressOut(pressAnim)}
                    activeOpacity={0.95}
                  >
                    <Text style={s.forumCatEmoji}>{cat.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={s.forumCatTitle}>{cat.label}</Text>
                      <Text style={s.forumCatDesc}>{cat.desc}</Text>
                    </View>
                    <View style={s.forumCatChevronWrap}>
                      <Ionicons name="chevron-forward" size={18} color={theme.brand.accentDeep} />
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </Animated.ScrollView>
      )}

      {forumCategory && !forumThread && (
        <Animated.View
          style={{
            flex: 1,
            opacity: threadListEnterAnim,
            transform: [
              {
                translateX: threadListEnterAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              },
            ],
          }}
        >
          <View style={s.forumHeaderRow}>
            <TouchableOpacity onPress={() => setForumCategory(null)} style={s.backRow}>
              <Ionicons name="chevron-back" size={20} color={premiumAccent} />
              <Text style={s.backText}>Categorías</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.forumNewBtn} onPress={handleOpenCreate}>
              <Text style={s.forumNewBtnText}>Nuevo</Text>
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <Text style={s.sectionTitle}>{forumCategory.emoji} {forumCategory.label}</Text>
            <View style={s.forumSortRow}>
              <TouchableOpacity style={[s.forumSortChip, forumSort === 'top' && s.forumSortChipActive]} onPress={() => setForumSort('top')}>
                <Text style={[s.forumSortText, forumSort === 'top' && s.forumSortTextActive]}>Más votados</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.forumSortChip, forumSort === 'recent' && s.forumSortChipActive]} onPress={() => setForumSort('recent')}>
                <Text style={[s.forumSortText, forumSort === 'recent' && s.forumSortTextActive]}>Más recientes</Text>
              </TouchableOpacity>
            </View>
          </View>
          {forumLoading ? (
            <View style={s.forumSkeletonWrap}>
              {[0, 1, 2].map((idx) => (
                <View key={idx} style={s.forumSkeletonCard}>
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      s.forumSkeletonShimmer,
                      {
                        transform: [
                          {
                            translateX: skeletonShimmerAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-220, 220],
                            }),
                          },
                        ],
                      },
                    ]}
                  />
                  <View style={s.forumSkeletonLineLg} />
                  <View style={s.forumSkeletonLineMd} />
                  <View style={s.forumSkeletonLineSm} />
                  <View style={s.forumSkeletonMeta}>
                    <View style={s.forumSkeletonPill} />
                    <View style={s.forumSkeletonPill} />
                    <View style={s.forumSkeletonPill} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110, gap: 10 }}>
              {forumThreadsByCategory.map((thread, idx) => {
                const rowAnim = threadRowAnimsRef.current[idx] || new Animated.Value(1);
                const pressAnim = getPressAnim(threadPressAnimsRef, idx);
                return (
                  <Animated.View
                    key={thread.id}
                    style={{
                      opacity: rowAnim,
                      transform: [
                        {
                          translateY: rowAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [12, 0],
                          }),
                        },
                        { scale: pressAnim },
                      ],
                    }}
                  >
                    <TouchableOpacity
                      style={s.forumThreadCard}
                      activeOpacity={0.96}
                      onPress={() => handleOpenThread(thread)}
                      onPressIn={() => animatePressIn(pressAnim)}
                      onPressOut={() => animatePressOut(pressAnim)}
                    >
                      <Text style={s.forumThreadTitle} numberOfLines={2}>{thread.title}</Text>
                      <Text style={s.forumThreadBody} numberOfLines={2}>{thread.body}</Text>
                      <View style={s.forumMetaRow}>
                        <View style={s.forumAuthorRow}>
                          <View style={s.forumAvatar}><Text style={s.forumAvatarText}>{(thread.authorName || '?')[0]?.toUpperCase() || '?'}</Text></View>
                          <View>
                            <Text style={s.forumAuthorName}>{thread.authorName || 'Usuario'}</Text>
                            <Text style={s.forumAuthorLevel}>{thread.authorLevel || 'Novato'}</Text>
                          </View>
                        </View>
                        <Text style={s.forumMetaText}>{formatRelativeTime(thread.createdAt)}</Text>
                      </View>
                      <View style={s.forumCountersRow}>
                        <Text style={s.forumCounter}>💬 {thread.replyCount || 0}</Text>
                        <Text style={s.forumCounter}>❤️ {thread.upvotes || 0}</Text>
                        <Text style={s.forumCounter}>💔 {thread.reportedCount || 0}</Text>
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
              {!forumLoading && forumThreadsByCategory.length === 0 && <Text style={s.empty}>Todavía no hay hilos en esta categoría.</Text>}
              {!!forumError && <Text style={s.empty}>{forumError}</Text>}
            </ScrollView>
          )}
        </Animated.View>
      )}

      {forumCategory && forumThread && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 12}
        >
          <View style={s.forumHeaderRow}>
            <TouchableOpacity onPress={() => { setForumThread(null); setForumReplyTo(null); }} style={s.backRow}>
              <Ionicons name="chevron-back" size={20} color={premiumAccent} />
              <Text style={s.backText}>Hilos</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={forumThreadScrollRef}
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }}
          >
            {(() => {
              const threadUserVoted = hasUserVotedForoItem(forumThread);
              const threadUserReported = hasUserReportedForoItem(forumThread);
              return (
                <View style={s.forumMainPost}>
                  <View style={s.forumMainPostHead}>
                    <Text style={s.forumThreadTitle}>{forumThread.title}</Text>
                    {isForumOwner(forumThread) && (
                      <TouchableOpacity style={s.forumDotsBtn} onPress={() => abrirMenuAutorForo('foro_hilos', forumThread)}>
                        <Ionicons name="ellipsis-vertical" size={18} color={theme.brand.accentDeep} />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={s.forumThreadBody}>{forumThread.body}</Text>
                  {!!forumThread.image && <Image source={{ uri: forumThread.image }} style={s.forumMainPostImage} resizeMode="cover" />}
                  <View style={s.forumCountersRow}>
                    <Text style={s.forumCounter}>❤️ {forumThread.upvotes || 0}</Text>
                    <Text style={s.forumCounter}>💬 {forumThread.replyCount || 0}</Text>
                    <Text style={s.forumCounter}>💔 {forumThread.reportedCount || 0}</Text>
                    <Text style={s.forumMetaText}>{formatRelativeTime(forumThread.createdAt)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <TouchableOpacity
                      style={[s.forumActionBtn, (threadUserVoted || threadUserReported) && s.forumActionBtnDisabled]}
                      onPress={() => votarEnForo('foro_hilos', forumThread)}
                      disabled={threadUserVoted || threadUserReported}
                    >
                      <Text style={[s.forumActionText, (threadUserVoted || threadUserReported) && s.forumActionTextDisabled]}>❤️ INTERESANTE</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.forumActionBtn, (threadUserReported || threadUserVoted) && s.forumActionBtnDisabled]}
                      onPress={() => reportarForo('foro_hilos', forumThread)}
                      disabled={threadUserReported || threadUserVoted}
                    >
                      <Text style={[s.forumActionText, (threadUserReported || threadUserVoted) && s.forumActionTextDisabled]}>💔 NI FÚ NI FÁ</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })()}

            <Text style={[s.sectionTitle, { marginTop: 14, marginBottom: 10 }]}>Respuestas</Text>
            {forumTopReplies.map((reply) => {
              const childReplies = forumRepliesByThread.filter((r) => r.parentId === reply.id).slice(0, 50);
              const replyUserReported = hasUserReportedForoItem(reply);
              return (
                <View key={reply.id} style={s.forumReplyCard}>
                  <View style={s.forumMetaRow}>
                    <View style={s.forumAuthorRow}>
                      <View style={s.forumAvatar}><Text style={s.forumAvatarText}>{(reply.authorName || '?')[0]?.toUpperCase() || '?'}</Text></View>
                      <View>
                        <Text style={s.forumAuthorName}>{reply.authorName || 'Usuario'}</Text>
                        <Text style={s.forumAuthorLevel}>{reply.authorLevel || 'Novato'}</Text>
                      </View>
                    </View>
                    <View style={s.forumMetaActions}>
                      <Text style={s.forumMetaText}>{formatRelativeTime(reply.createdAt)}</Text>
                      {isForumOwner(reply) && (
                        <TouchableOpacity style={s.forumDotsBtn} onPress={() => abrirMenuAutorForo('foro_respuestas', reply)}>
                          <Ionicons name="ellipsis-vertical" size={16} color={theme.brand.accentDeep} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  <Text style={s.forumThreadBody}>{reply.body}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                    <TouchableOpacity onPress={() => handleReplyPress(reply)}><Text style={s.forumActionText}>↩ Responder</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => reportarForo('foro_respuestas', reply)} disabled={replyUserReported}><Text style={[s.forumActionText, replyUserReported && s.forumActionTextDisabled]}>💔 NI FÚ NI FÁ {reply.reportedCount || 0}</Text></TouchableOpacity>
                  </View>

                  {childReplies.map((child) => (
                    <View key={child.id} style={s.forumChildReplyCard}>
                      <View style={s.forumMetaRow}>
                        <Text style={s.forumAuthorName}>{child.authorName || 'Usuario'}</Text>
                        <View style={s.forumMetaActions}>
                          <Text style={s.forumMetaText}>{formatRelativeTime(child.createdAt)}</Text>
                          {isForumOwner(child) && (
                            <TouchableOpacity style={s.forumDotsBtn} onPress={() => abrirMenuAutorForo('foro_respuestas', child)}>
                              <Ionicons name="ellipsis-vertical" size={15} color={theme.brand.accentDeep} />
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                      <Text style={s.forumThreadBody}>{child.body}</Text>
                      {(() => {
                        const childUserReported = hasUserReportedForoItem(child);
                        return (
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                            <TouchableOpacity onPress={() => reportarForo('foro_respuestas', child)} disabled={childUserReported}><Text style={[s.forumActionText, childUserReported && s.forumActionTextDisabled]}>💔 NI FÚ NI FÁ {child.reportedCount || 0}</Text></TouchableOpacity>
                          </View>
                        );
                      })()}
                    </View>
                  ))}
                </View>
              );
            })}
            {forumTopReplies.length === 0 && <Text style={s.empty}>Sé el primero en responder.</Text>}
          </ScrollView>

          <Animated.View
            style={[
              s.forumComposerWrap,
              {
                opacity: composerEnterAnim,
                transform: [
                  {
                    translateY: composerEnterAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {!!forumReplyTo && (
              <View style={s.forumReplyingTag}>
                <Text style={s.forumReplyingText}>Respondiendo a {forumReplyTo.authorName}</Text>
                <TouchableOpacity onPress={() => setForumReplyTo(null)}><Ionicons name="close" size={16} color={theme.icon.inactive} /></TouchableOpacity>
              </View>
            )}
            <View style={s.forumComposerRow}>
              <TextInput
                ref={forumReplyInputRef}
                style={s.forumComposerInput}
                placeholder="Escribe tu respuesta..."
                placeholderTextColor="#9e958d"
                value={forumReplyText}
                onChangeText={setForumReplyText}
                multiline
              />
              <TouchableOpacity style={s.forumSendBtn} onPress={handleSendReply} disabled={forumSendingReply}>
                {forumSendingReply ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={16} color="#fff" />}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      )}

      <Modal visible={forumCreateOpen} animationType="none" transparent onRequestClose={closeCreateModal}>
        <KeyboardAvoidingView
          style={[s.forumModalOverlay, { backgroundColor: 'transparent' }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              hapticTap();
              closeCreateModal();
            }}
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
                onChangeText={(v) => setForumTitle(v.slice(0, 120))}
                placeholder="Máximo 120 caracteres"
                placeholderTextColor="#b3a9a0"
              />
              <Text style={[s.label, { marginTop: -6 }]}>Contenido</Text>
              <TextInput
                style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]}
                value={forumBody}
                onChangeText={(v) => setForumBody(v.slice(0, 1000))}
                placeholder="Comparte tu experiencia cafetera..."
                placeholderTextColor="#b3a9a0"
                multiline
              />
              <Text style={s.forumCountText}>{forumTitle.length}/120 · {forumBody.length}/1000</Text>
              <TouchableOpacity style={s.faceIdBtn} onPress={seleccionarFotoForo}>
                <Ionicons name="image-outline" size={18} color={theme.brand.accentDeep} />
                <Text style={s.faceIdText}>{forumPhoto ? 'Cambiar foto' : 'Añadir foto opcional'}</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingBottom: Platform.OS === 'ios' ? 8 : 14 }}>
                <TouchableOpacity style={[s.authSecondaryBtn, { flex: 1, marginTop: 0 }]} onPress={closeCreateModal}>
                  <Text style={s.authSecondaryBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.redBtn, { flex: 1, marginTop: 0 }]} onPress={handlePublishThread} disabled={forumSaving}>
                  {forumSaving ? <ActivityIndicator color="#fff" /> : <Text style={s.redBtnText}>Publicar</Text>}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={forumEditOpen} animationType="none" transparent onRequestClose={closeEditModal}>
        <KeyboardAvoidingView
          style={[s.forumModalOverlay, { backgroundColor: 'transparent' }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {
              hapticTap();
              closeEditModal();
            }}
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
              <Text style={s.sectionTitle}>{forumEditCollection === 'foro_hilos' ? 'Editar hilo' : 'Editar respuesta'}</Text>
              {forumEditCollection === 'foro_hilos' && (
                <>
                  <Text style={[s.label, { marginTop: 4 }]}>Título</Text>
                  <TextInput
                    style={s.input}
                    value={forumEditTitle}
                    onChangeText={(v) => setForumEditTitle(v.slice(0, 120))}
                    placeholder="Máximo 120 caracteres"
                    placeholderTextColor="#b3a9a0"
                  />
                </>
              )}
              <Text style={[s.label, { marginTop: forumEditCollection === 'foro_hilos' ? -6 : 4 }]}>Contenido</Text>
              <TextInput
                style={[s.input, { minHeight: 120, textAlignVertical: 'top' }]}
                value={forumEditBody}
                onChangeText={(v) => setForumEditBody(v.slice(0, 1000))}
                placeholder="Escribe aquí..."
                placeholderTextColor="#b3a9a0"
                multiline
              />
              <Text style={s.forumCountText}>{forumEditCollection === 'foro_hilos' ? `${forumEditTitle.length}/120 · ` : ''}{forumEditBody.length}/1000</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, paddingBottom: Platform.OS === 'ios' ? 8 : 14 }}>
                <TouchableOpacity style={[s.authSecondaryBtn, { flex: 1, marginTop: 0 }]} onPress={closeEditModal}>
                  <Text style={s.authSecondaryBtnText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.redBtn, { flex: 1, marginTop: 0 }]} onPress={handleSaveEdit} disabled={forumEditing}>
                  {forumEditing ? <ActivityIndicator color="#fff" /> : <Text style={s.redBtnText}>Guardar</Text>}
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
