import { Ionicons } from '@expo/vector-icons';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { buildThreadReplySections } from '../../domain/community/threadReplies';
import CommunityReplyCard from './CommunityReplyCard';
import CommunityThreadComposer from './CommunityThreadComposer';
import CommunityThreadMainPost from './CommunityThreadMainPost';

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
  const replySections = buildThreadReplySections(forumTopReplies, forumRepliesByThread);

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
        <CommunityThreadMainPost
          s={s}
          theme={theme}
          PremiumBadge={PremiumBadge}
          forumThread={forumThread}
          hasUserVotedForoItem={hasUserVotedForoItem}
          hasUserReportedForoItem={hasUserReportedForoItem}
          isForumOwner={isForumOwner}
          isAdmin={isAdmin}
          isStaff={isStaff}
          abrirMenuAutorForo={abrirMenuAutorForo}
          votarEnForo={votarEnForo}
          reportarForo={reportarForo}
          formatRelativeTime={formatRelativeTime}
        />

        <Text style={[s.sectionTitle, { marginTop: 14, marginBottom: 10 }]}>Respuestas</Text>
        {replySections.map(({ reply, childReplies }) => {
          return (
            <CommunityReplyCard
              key={reply.id}
              reply={reply}
              childReplies={childReplies}
              s={s}
              theme={theme}
              PremiumBadge={PremiumBadge}
              formatRelativeTime={formatRelativeTime}
              hasUserReportedForoItem={hasUserReportedForoItem}
              isForumOwner={isForumOwner}
              isAdmin={isAdmin}
              isStaff={isStaff}
              abrirMenuAutorForo={abrirMenuAutorForo}
              reportarForo={reportarForo}
              handleReplyPress={handleReplyPress}
            />
          );
        })}
        {forumTopReplies.length === 0 && <Text style={s.empty}>Sé el primero en responder.</Text>}
      </ScrollView>

      <CommunityThreadComposer
        s={s}
        theme={theme}
        composerEnterAnim={composerEnterAnim}
        forumReplyTo={forumReplyTo}
        setForumReplyTo={setForumReplyTo}
        forumReplyInputRef={forumReplyInputRef}
        forumReplyText={forumReplyText}
        setForumReplyText={setForumReplyText}
        handleSendReply={handleSendReply}
        forumSendingReply={forumSendingReply}
      />
    </KeyboardAvoidingView>
  );
}
