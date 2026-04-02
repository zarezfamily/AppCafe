import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';
import { THEME } from '../constants/theme';

export default function Stars({ value, onPress, size = 14 }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onPress?.(n)} disabled={!onPress}>
          <Ionicons
            name={n <= value ? 'star' : 'star-outline'}
            size={size}
            color={n <= value ? THEME.brand.accent : THEME.icon.faint}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}
