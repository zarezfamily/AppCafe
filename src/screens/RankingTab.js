import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import BestValueTab from './BestValueTab';
import BioTopTab from './BioTopTab';
import DailyTopTab from './DailyTopTab';
import TopCafesTab from './TopCafesTab';

function TabButton({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? '#8f5e3b' : '#e2d5c8',
        backgroundColor: active ? '#f3e7d9' : '#faf7f2',
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: '800',
          color: active ? '#8f5e3b' : '#6f5a4b',
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function RankingTab(props) {
  const [mode, setMode] = useState('specialty');

  return (
    <View style={{ flex: 1 }}>
      {/* SELECTOR */}
      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TabButton
              label="⭐ Especialidad"
              active={mode === 'specialty'}
              onPress={() => setMode('specialty')}
            />

            <TabButton
              label="☕ Diario"
              active={mode === 'daily'}
              onPress={() => setMode('daily')}
            />

            <TabButton label="🌿 BIO" active={mode === 'bio'} onPress={() => setMode('bio')} />

            <TabButton
              label="💸 Value"
              active={mode === 'value'}
              onPress={() => setMode('value')}
            />
          </View>
        </ScrollView>
      </View>

      {/* CONTENIDO */}
      {mode === 'specialty' && <TopCafesTab {...props} />}
      {mode === 'daily' && <DailyTopTab {...props} />}
      {mode === 'bio' && <BioTopTab {...props} />}
      {mode === 'value' && <BestValueTab {...props} />}
    </View>
  );
}
