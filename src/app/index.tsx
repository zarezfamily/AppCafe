import { View, Text } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Mi App de Café ☕</Text>
      <Text style={{ fontSize: 14, color: '#666', marginTop: 10 }}>Welcome!</Text>
    </View>
  );
}
