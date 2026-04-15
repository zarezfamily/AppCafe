import { ActivityIndicator, Animated, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function CommunityThreadComposer({
  s,
  theme,
  composerEnterAnim,
  forumReplyTo,
  setForumReplyTo,
  forumReplyInputRef,
  forumReplyText,
  setForumReplyText,
  handleSendReply,
  forumSendingReply,
}) {
  return (
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
        <TouchableOpacity
          style={s.forumSendBtn}
          onPress={handleSendReply}
          disabled={!!forumSendingReply}
        >
          {forumSendingReply ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="send" size={16} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
