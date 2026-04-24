import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function CollapsibleSectionHeader({ title: _title, collapsed, onToggle }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onToggle}
      style={styles.toggleBtn}
      hitSlop={{ top: 6, bottom: 6, left: 10, right: 10 }}
    >
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{collapsed ? '+' : '−'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  toggleBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
    padding: 2,
  },
  iconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#f3ece4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
    fontWeight: '900',
    color: '#8f5e3b',
    lineHeight: 18,
  },
});
