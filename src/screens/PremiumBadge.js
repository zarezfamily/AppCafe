import { StyleSheet, Text, View } from 'react-native';

export default function PremiumBadge({ size = 'sm', style }) {
  const isLarge = size === 'lg';

  return (
    <View style={[styles.badge, isLarge && styles.badgeLg, style]}>
      <Text style={[styles.text, isLarge && styles.textLg]}>☕ PREMIUM</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#1c120d',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  badgeLg: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    fontSize: 9,
    fontWeight: '800',
    color: '#d4a853',
    letterSpacing: 1,
  },
  textLg: {
    fontSize: 11,
  },
});
