import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

function CommunityReplyChild({
  child,
  s,
  theme,
  PremiumBadge,
  formatRelativeTime,
  hasUserVotedForoItem,
  hasUserReportedForoItem,
  isForumOwner,
  isAdmin,
  isStaff,
  abrirMenuAutorForo,
  votarEnForo,
  reportarForo,
}) {
  const childUserReported = hasUserReportedForoItem(child);
  const childUserVoted = hasUserVotedForoItem ? hasUserVotedForoItem(child) : false;
  const canModerate = isForumOwner(child) || isAdmin || isStaff;

  return (
    <View style={s.forumChildReplyCard}>
      <View style={s.forumMetaRow}>
        <View>
          <Text style={s.forumAuthorName}>{child.authorName || 'Usuario'}</Text>
          {child.authorIsPremium && PremiumBadge ? <PremiumBadge style={{ marginTop: 4 }} /> : null}
        </View>
        <View style={s.forumMetaActions}>
          <Text style={s.forumMetaText}>{formatRelativeTime(child.createdAt)}</Text>
          {canModerate && (
            <TouchableOpacity
              style={s.forumDotsBtn}
              onPress={() => abrirMenuAutorForo('foro_respuestas', child)}
            >
              <Ionicons name="ellipsis-vertical" size={15} color={theme.brand.accentDeep} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={s.forumThreadBody}>{child.body}</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
        <TouchableOpacity
          onPress={() => votarEnForo && votarEnForo('foro_respuestas', child)}
          disabled={childUserVoted || childUserReported}
        >
          <Text style={[s.forumActionText, childUserVoted && s.forumActionTextDisabled]}>
            👍 Útil {child.upvotes || 0}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => reportarForo('foro_respuestas', child)}
          disabled={childUserReported}
        >
          <Text style={[s.forumActionText, childUserReported && s.forumActionTextDisabled]}>
            💔 NI FÚ NI FÁ {child.reportedCount || 0}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CommunityReplyCard({
  reply,
  childReplies,
  s,
  theme,
  PremiumBadge,
  formatRelativeTime,
  hasUserVotedForoItem,
  hasUserReportedForoItem,
  isForumOwner,
  isAdmin,
  isStaff,
  abrirMenuAutorForo,
  votarEnForo,
  reportarForo,
  handleReplyPress,
}) {
  const replyUserReported = hasUserReportedForoItem(reply);
  const replyUserVoted = hasUserVotedForoItem ? hasUserVotedForoItem(reply) : false;
  const canModerate = isForumOwner(reply) || isAdmin || isStaff;

  return (
    <View style={s.forumReplyCard}>
      <View style={s.forumMetaRow}>
        <View style={s.forumAuthorRow}>
          <View style={s.forumAvatar}>
            <Text style={s.forumAvatarText}>
              {(reply.authorName || '?')[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <View>
            <Text style={s.forumAuthorName}>{reply.authorName || 'Usuario'}</Text>
            {reply.authorIsPremium && PremiumBadge ? (
              <PremiumBadge style={{ marginTop: 4 }} />
            ) : null}
            <Text style={s.forumAuthorLevel}>{reply.authorLevel || 'Novato'}</Text>
          </View>
        </View>
        <View style={s.forumMetaActions}>
          <Text style={s.forumMetaText}>{formatRelativeTime(reply.createdAt)}</Text>
          {canModerate && (
            <TouchableOpacity
              style={s.forumDotsBtn}
              onPress={() => abrirMenuAutorForo('foro_respuestas', reply)}
            >
              <Ionicons name="ellipsis-vertical" size={16} color={theme.brand.accentDeep} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <Text style={s.forumThreadBody}>{reply.body}</Text>

      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
        <TouchableOpacity
          onPress={() => votarEnForo && votarEnForo('foro_respuestas', reply)}
          disabled={replyUserVoted || replyUserReported}
        >
          <Text style={[s.forumActionText, replyUserVoted && s.forumActionTextDisabled]}>
            👍 Útil {reply.upvotes || 0}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleReplyPress(reply)}>
          <Text style={s.forumActionText}>↩ Responder</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => reportarForo('foro_respuestas', reply)}
          disabled={replyUserReported}
        >
          <Text style={[s.forumActionText, replyUserReported && s.forumActionTextDisabled]}>
            💔 NI FÚ NI FÁ {reply.reportedCount || 0}
          </Text>
        </TouchableOpacity>
      </View>

      {childReplies.map((child) => (
        <CommunityReplyChild
          key={child.id}
          child={child}
          s={s}
          theme={theme}
          PremiumBadge={PremiumBadge}
          formatRelativeTime={formatRelativeTime}
          hasUserReportedForoItem={hasUserReportedForoItem}
          isForumOwner={isForumOwner}
          isAdmin={isAdmin}
          isStaff={isStaff}
          abrirMenuAutorForo={abrirMenuAutorForo}
          votarEnForo={votarEnForo}
          hasUserVotedForoItem={hasUserVotedForoItem}
          reportarForo={reportarForo}
        />
      ))}
    </View>
  );
}
