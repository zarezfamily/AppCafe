import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

export default function SectionHeaderNav({ s, title, onPress, marginTop = 0 }) {
  return (
    <View style={[s.sectionHeader, { marginTop }]}>
      <Text style={s.sectionTitle}>{title}</Text>
      <TouchableOpacity onPress={onPress}>
        <Ionicons name="chevron-forward" size={20} color="#555" />
      </TouchableOpacity>
    </View>
  );
}
