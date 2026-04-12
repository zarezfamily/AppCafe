import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_800ExtraBold,
} from '@expo-google-fonts/playfair-display';
import linking from '../navigation/linking';
import RootNavigator from '../navigation/RootNavigator';
import WelcomeScreen from '../screens/WelcomeScreen';
import { useAuth } from '../context/AuthContext';
import { useProfileRealtimeSync } from '../api/profileSync';

export default function AppBootstrap() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold,
  });
  const [showWelcome, setShowWelcome] = useState(true);
  const { user, setPerfil } = useAuth();

  useProfileRealtimeSync(user, setPerfil);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded) return null;
  if (showWelcome) return <WelcomeScreen />;

  return (
    <NavigationContainer linking={linking}>
      <RootNavigator />
    </NavigationContainer>
  );
}
