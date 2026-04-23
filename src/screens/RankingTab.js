import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import BestValueTab from './BestValueTab';
import BioTopTab from './BioTopTab';
import DailyTopTab from './DailyTopTab';
import TopCafesTab from './TopCafesTab';
import WeeklyRankingTab from './WeeklyRankingTab';

function RankingModeChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.9}
      style={{
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? '#8f5e3b' : '#e2d5c8',
        backgroundColor: active ? '#f3e7d9' : '#faf7f2',
        marginRight: 8,
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
      <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <RankingModeChip
              label="⭐ Especialidad"
              active={mode === 'specialty'}
              onPress={() => setMode('specialty')}
            />
            <RankingModeChip
              label="☕ Diario"
              active={mode === 'daily'}
              onPress={() => setMode('daily')}
            />
            <RankingModeChip
              label="🌿 BIO"
              active={mode === 'bio'}
              onPress={() => setMode('bio')}
            />
            <RankingModeChip
              label="💸 Value"
              active={mode === 'value'}
              onPress={() => setMode('value')}
            />
            <RankingModeChip
              label="🔥 Semanal"
              active={mode === 'weekly'}
              onPress={() => setMode('weekly')}
            />
          </View>
        </ScrollView>
      </View>

      {mode === 'specialty' && <TopCafesTab {...props} />}
      {mode === 'daily' && <DailyTopTab {...props} />}
      {mode === 'bio' && <BioTopTab {...props} />}
      {mode === 'value' && <BestValueTab {...props} />}
      {mode === 'weekly' && (
        <WeeklyRankingTab
          allCafes={props.allCafes || props.top100 || []}
          setCafeDetalle={props.setCafeDetalle}
        />
      )}
    </View>
  );
}
