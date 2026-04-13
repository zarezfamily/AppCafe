import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function CommunityThreadDetailView({
  s,
  theme,
  PremiumBadge,
  forumThread,
  setForumThread,
  setForumReplyTo,
  forumThreadScrollRef,
  hasUserVotedForoItem,
  hasUserReportedForoItem,
  isForumOwner,
  isAdmin,
  isStaff,
  abrirMenuAutorForo,
  votarEnForo,
  reportarForo,
  formatRelativeTime,
  forumTopReplies,
  forumRepliesByThread,
  handleReplyPress,
  composerEnterAnim,
  forumReplyTo,
  forumReplyInputRef,
  forumReplyText,
  setForumReplyText,
  handleSendReply,
  forumSendingReply,
}) {
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 12}
    >
      <View style={s.forumHeaderRow}>
        <TouchableOpacity
          onPress={() => {
            setForumThread(null);
            setForumReplyTo(null);
          }}
          style={s.backRow}
        >
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
                  <View
                    style={{
                      marginTop: 6,
                      alignSelf: 'flex-start',
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: forumThread.accessLevel === 'registered_only' ? '#f3e9de' : '#eff6ed',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: forumThread.accessLevel === 'registered_only' ? '#8f5e3b' : '#4f7a53',
                      }}
                    >
                      {forumThread.accessLevel === 'registered_only' ? 'Solo registrados' : 'Público'}
                    </Text>
                  </View>
                </View>
                {(isForumOwner(forumThread) || isAdmin || isStaff) && (
                  <TouchableOpacity style={s.forumDotsBtn} onPress={() => abrirMenuAutorForo('foro_hilos', forumThread)}>
                    <Ionicons name="ellipsis-vertical" size={18} color={theme.brand.accentDeep} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={s.forumThreadBody}>{forumThread.body}</Text>
              {!!forumThread.image && (
                <Image source={{ uri: forumThread.image }} style={s.forumMainPostImage} resizeMode="cover" />
              )}
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
                  <Text style={[s.forumActionText, (threadUserVoted || threadUserReported) && s.forumActionTextDisabled]}>
                    ❤️ INTERESANTE
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.forumActionBtn, (threadUserReported || threadUserVoted) && s.forumActionBtnDisabled]}
                  onPress={() => reportarForo('foro_hilos', forumThread)}
                  disabled={threadUserReported || threadUserVoted}
                >
                  <Text style={[s.forumActionText, (threadUserReported || threadUserVoted) && s.forumActionTextDisabled]}>
                    💔 NI FÚ NI FÁ
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })()}

        <Text style={[s.sectionTitle, { marginTop: 14, marginBottom: 10 }]}>Respuestas</Text>
        {forumTopReplies.map((reply) => {
          const childReplies = forumRepliesByThread.filter((item) => item.parentId === reply.id).slice(0, 50);
          const replyUserReported = hasUserReportedForoItem(reply);
          return (
            <View key={reply.id} style={s.forumReplyCard}>
              <View style={s.forumMetaRow}>
                <View style={s.forumAuthorRow}>
                  <View style={s.forumAvatar}>
                    <Text style={s.forumAvatarText}>{(reply.authorName || '?')[0]?.toUpperCase() || '?'}</Text>
                  </View>
                  <View>
                    <Text style={s.forumAuthorName}>{reply.authorName || 'Usuario'}</Text>
                    {reply.authorIsPremium && PremiumBadge ? <PremiumBadge style={{ marginTop: 4 }} /> : null}
                    <Text style={s.forumAuthorLevel}>{reply.authorLevel || 'Novato'}</Text>
                  </View>
                </View>
                <View style={s.forumMetaActions}>
                  <Text style={s.forumMetaText}>{formatRelativeTime(reply.createdAt)}</Text>
                  {(isForumOwner(reply) || isAdmin || isStaff) && (
                    <TouchableOpacity style={s.forumDotsBtn} onPress={() => abrirMenuAutorForo('foro_respuestas', reply)}>
                      <Ionicons name="ellipsis-vertical" size={16} color={theme.brand.accentDeep} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              <Text style={s.forumThreadBody}>{reply.body}</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                <TouchableOpacity onPress={() => handleReplyPress(reply)}>
                  <Text style={s.forumActionText}>↩ Responder</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => reportarForo('foro_respuestas', reply)} disabled={replyUserReported}>
                  <Text style={[s.forumActionText, replyUserReported && s.forumActionTextDisabled]}>
                    💔 NI FÚ NI FÁ {reply.reportedCount || 0}
                  </Text>
                </TouchableOpacity>
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
                      {(isForumOwner(child) || isAdmin || isStaff) && (
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
                        <TouchableOpacity onPress={() => reportarForo('foro_respuestas', child)} disabled={childUserReported}>
                          <Text style={[s.forumActionText, childUserReported && s.forumActionTextDisabled]}>
                            💔 NI FÚ NI FÁ {child.reportedCount || 0}
                          </Text>
                        </TouchableOpacity>
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
            <TouchableOpacity onPress={() => setForumReplyTo(null)}>
              <Ionicons name="close" size={16} color={theme.icon.inactive} />
            </TouchableOpacity>
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
  );
}
