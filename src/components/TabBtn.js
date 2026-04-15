import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

export default function TabBtn({
  s,
  icon,
  label,
  tab,
  active,
  onPress,
  badge,
  accentColor,
  inactiveColor,
}) {
  const isActive = active === tab;

  return (
    <TouchableOpacity style={s.tabBtn} onPress={() => onPress(tab)}>
      <View>
        <Ionicons
          name={isActive ? icon : `${icon}-outline`}
          size={22}
          color={isActive ? accentColor : inactiveColor}
        />
        {badge > 0 && (
          <View style={s.tabBadge}>
            <Text style={s.tabBadgeText}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[s.tabLabel, isActive && { color: accentColor }]}>{label}</Text>
    </TouchableOpacity>
  );
}
