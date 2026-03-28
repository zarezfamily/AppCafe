import React from 'react';
import { useColorScheme, View } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Tabs are handled by the router */}
    </View>
  );
}
