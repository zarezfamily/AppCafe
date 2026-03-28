import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import React from 'react';

import HomeScreen from './index';
import ExploreScreen from './explore';

const Tab = createBottomTabNavigator();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider value={theme}>
      <Tab.Navigator>
        <Tab.Screen 
          name="index" 
          component={HomeScreen}
          options={{ title: 'Home', tabBarLabel: 'Home' }}
        />
        <Tab.Screen 
          name="explore" 
          component={ExploreScreen}
          options={{ title: 'Explore', tabBarLabel: 'Explore' }}
        />
      </Tab.Navigator>
    </ThemeProvider>
  );
}
