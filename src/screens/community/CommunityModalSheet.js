import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';

export default function CommunityModalSheet({
  visible,
  s,
  animation,
  onClose,
  onBackdropPress,
  children,
}) {
  return (
    <Modal visible={!!visible} animationType="none" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[s.forumModalOverlay, { backgroundColor: 'transparent' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={onBackdropPress}
          style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.35)',
              opacity: animation,
            }}
          />
        </TouchableOpacity>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}>
          <Animated.View
            style={[
              s.forumModalCard,
              {
                opacity: animation,
                transform: [
                  {
                    translateY: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [36, 0],
                    }),
                  },
                  {
                    scale: animation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.985, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            {children}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
