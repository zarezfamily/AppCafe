import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
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
import MemberInfoModal from '../components/MemberInfoModal';

export default function CommunityTab({
  s,
  theme,
  premiumAccent,
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
  // Gamificación
  gamification,
  getUserLevel,
  getAchievementDefs,
  LEVELS,
}) {
  const [showMemberInfo, setShowMemberInfo] = useState(false);
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
      <MemberInfoModal visible={showMemberInfo} onClose={() => setShowMemberInfo(false)} />
      {!forumCategory && (
        <View style={{ flex: 1 }}>
          <Animated.View style={{ opacity: communityHeroAnim }}>
            <ScrollView contentContainerStyle={{ paddingBottom: 110, gap: 0 }}>
              
              {/* ─── PREMIUM HEADER ─── */}
              <View style={{ backgroundColor: '#1f140f', paddingVertical: 24, paddingHorizontal: 16, gap: 16, overflow: 'hidden' }}>
                <View style={{ position: 'absolute', width: 170, height: 170, borderRadius: 85, right: -44, top: -68, backgroundColor: 'rgba(209, 139, 74, 0.2)' }} />
                <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, left: -30, bottom: -24, backgroundColor: 'rgba(255, 233, 210, 0.08)' }} />
                {/* Logo + Eslogan */}
                <View style={{ alignItems: 'center', gap: 4 }}>
                  <Text style={{ fontSize: 36, fontWeight: '900', letterSpacing: 2.4, color: '#fff8f0' }}>ETIOVE</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={s.homeMiniSealOuter}>
                      <View style={s.homeMiniSealMiddle}>
                        <View style={s.homeMiniSealInner}>
                          <Text style={s.homeMiniSealText}>E</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={{ fontSize: 10, fontWeight: '800', letterSpacing: 1.8, color: '#d4a574' }}>SPECIALTY COFFEE COMMUNITY</Text>
                  </View>
                </View>

                {/* User Rank Section */}
                {gamification && (
                  <TouchableOpacity
                    activeOpacity={0.96}
                    onLongPress={() => setShowMemberInfo(true)}
                    delayLongPress={280}
                    style={{ backgroundColor: '#faf8f5', borderRadius: 16, padding: 14, gap: 10, borderWidth: 1, borderColor: '#e8dcc8' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <Text style={{ fontSize: 32 }}>{getUserLevel(gamification.xp).icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#d4a574', textTransform: 'uppercase', letterSpacing: 0.5 }}>Tu Rango</Text>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: '#1f140f' }}>{getUserLevel(gamification.xp).name}</Text>
                      </View>
                      <Text style={{ fontSize: 20, fontWeight: '800', color: '#1f140f' }}>{gamification.xp}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#d4a574' }}>XP</Text>
                    </View>

                    {/* XP Progress Bar */}
                    <View style={{ gap: 6 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2 }}>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: '#d4a574' }}>Siguiente Nivel</Text>
                        {__getNextLevelXp(gamification.xp, LEVELS) && (
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#1f140f' }}>
                            {__getNextLevelXp(gamification.xp, LEVELS) - gamification.xp} XP restantes
                          </Text>
                        )}
                      </View>
                      <View style={{ height: 6, backgroundColor: '#e8dcc8', borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ 
                          height: '100%', 
                          backgroundColor: '#d4a574',
                          borderRadius: 3,
                          width: `${__getXpProgressPercent(gamification.xp, LEVELS)}%`
                        }} />
                      </View>
                    </View>
                  </TouchableOpacity>
                )}
              </View>

              {/* ─── ACHIEVEMENTS SECTION ─── */}
              {gamification && (
                <View style={{ paddingHorizontal: 16, paddingVertical: 20, gap: 12 }}>
                  <View>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#1f140f', marginBottom: 8 }}>🏆 Logros Desbloqueados</Text>
                    <Text style={{ fontSize: 12, color: '#8b7355', marginBottom: 10 }}>
                      {gamification.achievementIds.length > 0 
                        ? `${gamification.achievementIds.length} de ${getAchievementDefs().length} logros`
                        : 'Desbloquea logros interactuando en la comunidad'
                      }
                    </Text>
                  </View>

                  {gamification.achievementIds.length > 0 ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                      {gamification.achievementIds.map((achId) => {
                        const ach = getAchievementDefs().find(a => a.id === achId);
                        return ach ? (
                          <View key={achId} style={{ flex: 1, minWidth: 90 }}>
                            <View style={{ backgroundColor: '#faf8f5', borderRadius: 14, padding: 12, alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#d4a574' }}>
                              <Text style={{ fontSize: 24 }}>{ach.icon}</Text>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1f140f', textAlign: 'center', lineHeight: 14 }}>{ach.title}</Text>
                            </View>
                          </View>
                        ) : null;
                      })}
                    </View>
                  ) : (
                    <View style={{ backgroundColor: '#faf8f5', borderRadius: 14, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#e8dcc8' }}>
                      <Text style={{ fontSize: 28 }}>🎯</Text>
                      <Text style={{ fontSize: 13, fontWeight: '600', color: '#1f140f', textAlign: 'center' }}>Empieza a interactuar para desbloquear logros</Text>
                    </View>
                  )}
                </View>
              )}

              {/* ─── MOTIVATION CARDS ─── */}
              <View style={{ paddingHorizontal: 16, paddingBottom: 20, gap: 10 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1f140f', marginBottom: 4 }}>⚡ Gana Puntos</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <MotivationCard icon="💬" label="Responder" xp="+14 XP" />
                  <MotivationCard icon="🆕" label="Crear Tema" xp="+18 XP" />
                  <MotivationCard icon="👍" label="Votar" xp="+8 XP" />
                </View>
              </View>

              {/* ─── CATEGORIES ─── */}
              <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1f140f', marginBottom: 12 }}>Categorías</Text>
                <View style={{ gap: 10 }}>
              {forumCategories.map((cat, idx) => {
                const rowAnim = categoryRowAnimsRef.current[idx] || new Animated.Value(1);
                const pressAnim = getPressAnim(categoryPressAnimsRef, idx);
                return (
                  <Animated.View
                    key={cat.id}
                    style={{
                      opacity: rowAnim,
                      transform: [
                        { translateY: rowAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
                        { scale: pressAnim },
                      ],
                    }}
                  >
                    <TouchableOpacity
                      style={s.forumCatCard}
                      activeOpacity={0.96}
                      onPress={() => handleOpenCategory(cat)}
                      onPressIn={() => animatePressIn(pressAnim)}
                      onPressOut={() => animatePressOut(pressAnim)}
                    >
                      <Text style={s.forumCatEmoji}>{cat.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={s.forumCatTitle}>{cat.label}</Text>
                        {!!cat.desc && <Text style={s.forumCatDesc}>{cat.desc}</Text>}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#d4a574" />
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
                </View>
              </View>
            </ScrollView>
          </Animated.View>
        </View>
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
              <Ionicons name="chevron-back" size={20} color="#d4a574" />
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
                      <View style={{ marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: thread.accessLevel === 'registered_only' ? '#f3e9de' : '#eff6ed' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: thread.accessLevel === 'registered_only' ? '#8f5e3b' : '#4f7a53' }}>
                          {thread.accessLevel === 'registered_only' ? 'Solo registrados' : 'Público'}
                        </Text>
                      </View>
                      <View style={s.forumMetaRow}>
                        <View style={s.forumAuthorRow}>
                          <View style={s.forumAvatar}><Text style={s.forumAvatarText}>{(thread.authorName || '?')[0]?.toUpperCase() || '?'}</Text></View>
                          <View>
                            <Text style={s.forumAuthorName}>{thread.authorName || 'Usuario'}</Text>
                            {thread.authorIsPremium && PremiumBadge ? <PremiumBadge style={{ marginTop: 4 }} /> : null}
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
              <Ionicons name="chevron-back" size={20} color="#d4a574" />
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
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={s.forumThreadTitle}>{forumThread.title}</Text>
                      <View style={{ marginTop: 6, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: forumThread.accessLevel === 'registered_only' ? '#f3e9de' : '#eff6ed' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: forumThread.accessLevel === 'registered_only' ? '#8f5e3b' : '#4f7a53' }}>
                          {forumThread.accessLevel === 'registered_only' ? 'Solo registrados' : 'Público'}
                        </Text>
                      </View>
                    </View>
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
                  {forumThread.authorIsPremium && PremiumBadge ? <PremiumBadge style={{ marginTop: 10 }} /> : null}
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
                        {reply.authorIsPremium && PremiumBadge ? <PremiumBadge style={{ marginTop: 4 }} /> : null}
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
                        <View>
                          <Text style={s.forumAuthorName}>{child.authorName || 'Usuario'}</Text>
                          {child.authorIsPremium && PremiumBadge ? <PremiumBadge style={{ marginTop: 4 }} /> : null}
                        </View>
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

// ─── HELPERS & COMPONENTS ───────────────────────────────────────────────────────

// Calcula el porcentaje de progreso hacia el siguiente nivel
function __getXpProgressPercent(currentXp, levels = LEVELS) {
  const currentLevel = levels.find(l => l.minXp <= currentXp) || levels[0];
  const nextLevel = levels.find(l => l.minXp > currentXp);
  
  if (!nextLevel) return 100; // Ya está en el último nivel
  
  const currentLevelXp = currentLevel.minXp;
  const nextLevelXp = nextLevel.minXp;
  const progressXp = currentXp - currentLevelXp;
  const totalXpForLevel = nextLevelXp - currentLevelXp;
  
  return Math.min(100, Math.max(0, (progressXp / totalXpForLevel) * 100));
}

// Retorna el XP necesario para el siguiente nivel
function __getNextLevelXp(currentXp, levels = LEVELS) {
  const nextLevel = levels.find(l => l.minXp > currentXp);
  return nextLevel ? nextLevel.minXp : null;
}

// Componente para cards de motivación
function MotivationCard({ icon, label, xp }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 6, backgroundColor: '#faf8f5', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8, borderWidth: 1, borderColor: '#e8dcc8' }}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#1f140f' }}>{label}</Text>
      <Text style={{ fontSize: 10, fontWeight: '800', color: '#d4a574' }}>{xp}</Text>
    </View>
  );
}
