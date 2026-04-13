import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Animated, ScrollView, Text, TouchableOpacity, View } from 'react-native';

export default function CommunityThreadListView({
  s,
  PremiumBadge,
  forumCategory,
  setForumCategory,
  handleOpenCreate,
  forumSort,
  setForumSort,
  forumLoading,
  forumThreadsByCategory,
  forumError,
  formatRelativeTime,
  threadListEnterAnim,
  skeletonShimmerAnim,
  threadRowAnimsRef,
  getPressAnim,
  threadPressAnimsRef,
  animatePressIn,
  animatePressOut,
  handleOpenThread,
}) {
  return (
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
        <Text style={s.sectionTitle}>
          {forumCategory.emoji} {forumCategory.label}
        </Text>
        <View style={s.forumSortRow}>
          <TouchableOpacity
            style={[s.forumSortChip, forumSort === 'top' && s.forumSortChipActive]}
            onPress={() => setForumSort('top')}
          >
            <Text style={[s.forumSortText, forumSort === 'top' && s.forumSortTextActive]}>Más votados</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.forumSortChip, forumSort === 'recent' && s.forumSortChipActive]}
            onPress={() => setForumSort('recent')}
          >
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
                  <Text style={s.forumThreadTitle} numberOfLines={2}>
                    {thread.title}
                  </Text>
                  <Text style={s.forumThreadBody} numberOfLines={2}>
                    {thread.body}
                  </Text>
                  <View
                    style={{
                      marginTop: 6,
                      alignSelf: 'flex-start',
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: thread.accessLevel === 'registered_only' ? '#f3e9de' : '#eff6ed',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: thread.accessLevel === 'registered_only' ? '#8f5e3b' : '#4f7a53',
                      }}
                    >
                      {thread.accessLevel === 'registered_only' ? 'Solo registrados' : 'Público'}
                    </Text>
                  </View>
                  <View style={s.forumMetaRow}>
                    <View style={s.forumAuthorRow}>
                      <View style={s.forumAvatar}>
                        <Text style={s.forumAvatarText}>{(thread.authorName || '?')[0]?.toUpperCase() || '?'}</Text>
                      </View>
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
          {!forumLoading && forumThreadsByCategory.length === 0 && (
            <Text style={s.empty}>Todavía no hay hilos en esta categoría.</Text>
          )}
          {!!forumError && <Text style={s.empty}>{forumError}</Text>}
        </ScrollView>
      )}
    </Animated.View>
  );
}
