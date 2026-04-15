import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function AccessBadge({ accessLevel }) {
  const isRegisteredOnly = accessLevel === 'registered_only';

  return (
    <View
      style={{
        marginTop: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: isRegisteredOnly ? '#f3e9de' : '#eff6ed',
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '700',
          color: isRegisteredOnly ? '#8f5e3b' : '#4f7a53',
        }}
      >
        {isRegisteredOnly ? 'Solo registrados' : 'Público'}
      </Text>
    </View>
  );
}

export default function CommunityThreadMainPost({
  s,
  theme,
  PremiumBadge,
  forumThread,
  hasUserVotedForoItem,
  hasUserReportedForoItem,
  isForumOwner,
  isAdmin,
  isStaff,
  abrirMenuAutorForo,
  votarEnForo,
  reportarForo,
  formatRelativeTime,
}) {
  const threadUserVoted = hasUserVotedForoItem(forumThread);
  const threadUserReported = hasUserReportedForoItem(forumThread);
  const canModerate = isForumOwner(forumThread) || isAdmin || isStaff;

  return (
    <View style={s.forumMainPost}>
      <View style={s.forumMainPostHead}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={s.forumThreadTitle}>{forumThread.title}</Text>
          <AccessBadge accessLevel={forumThread.accessLevel} />
        </View>
        {canModerate && (
          <TouchableOpacity
            style={s.forumDotsBtn}
            onPress={() => abrirMenuAutorForo('foro_hilos', forumThread)}
          >
            <Ionicons name="ellipsis-vertical" size={18} color={theme.brand.accentDeep} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={s.forumThreadBody}>{forumThread.body}</Text>

      {!!forumThread.image && (
        <Image
          source={{ uri: forumThread.image }}
          style={s.forumMainPostImage}
          resizeMode="cover"
        />
      )}

      <View style={s.forumCountersRow}>
        <Text style={s.forumCounter}>❤️ {forumThread.upvotes || 0}</Text>
        <Text style={s.forumCounter}>💬 {forumThread.replyCount || 0}</Text>
        <Text style={s.forumCounter}>💔 {forumThread.reportedCount || 0}</Text>
        <Text style={s.forumMetaText}>{formatRelativeTime(forumThread.createdAt)}</Text>
      </View>

      {forumThread.authorIsPremium && PremiumBadge ? (
        <PremiumBadge style={{ marginTop: 10 }} />
      ) : null}

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <TouchableOpacity
          style={[
            s.forumActionBtn,
            (threadUserVoted || threadUserReported) && s.forumActionBtnDisabled,
          ]}
          onPress={() => votarEnForo('foro_hilos', forumThread)}
          disabled={threadUserVoted || threadUserReported}
        >
          <Text
            style={[
              s.forumActionText,
              (threadUserVoted || threadUserReported) && s.forumActionTextDisabled,
            ]}
          >
            ❤️ INTERESANTE
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            s.forumActionBtn,
            (threadUserReported || threadUserVoted) && s.forumActionBtnDisabled,
          ]}
          onPress={() => reportarForo('foro_hilos', forumThread)}
          disabled={threadUserReported || threadUserVoted}
        >
          <Text
            style={[
              s.forumActionText,
              (threadUserReported || threadUserVoted) && s.forumActionTextDisabled,
            ]}
          >
            💔 NI FÚ NI FÁ
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
