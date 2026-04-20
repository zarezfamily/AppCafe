import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

export default function SectionHeaderNav({
  s,
  title,
  onPress,
  marginTop = 20,
  actionLabel = 'Ver todo',
  hideAction = false,
}) {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={onPress ? 0.82 : 1}
      style={{
        marginTop,
        marginBottom: 10,
        paddingHorizontal: 0,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={[
              s?.sectionTitle,
              {
                fontSize: 22,
                fontWeight: '900',
                color: '#1c130e',
                letterSpacing: -0.3,
              },
            ]}
          >
            {title}
          </Text>
        </View>

        {!hideAction && !!onPress && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: '#f3e7d9',
              borderWidth: 1,
              borderColor: '#eadbce',
            }}
          >
            <Text
              style={{
                fontSize: 11,
                fontWeight: '800',
                color: '#8f5e3b',
              }}
            >
              {actionLabel}
            </Text>
            <Ionicons name="arrow-forward" size={12} color="#8f5e3b" />
          </View>
        )}
      </View>

      <View
        style={{
          marginTop: 10,
          width: 56,
          height: 4,
          borderRadius: 999,
          backgroundColor: '#d7b08a',
        }}
      />
    </Wrapper>
  );
}
