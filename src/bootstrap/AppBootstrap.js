import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_700Bold,
  PlayfairDisplay_800ExtraBold,
} from '@expo-google-fonts/playfair-display';
import AuthScreen from '../screens/AuthScreen';
import MainScreen from '../screens/MainScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import { useAuth } from '../context/AuthContext';
import { useProfileRealtimeSync } from '../api/profileSync';

export default function AppBootstrap() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_700Bold,
    PlayfairDisplay_800ExtraBold,
  });
  const [showWelcome, setShowWelcome] = useState(true);
  const { user, setPerfil, setUser, logout } = useAuth();

  useProfileRealtimeSync(user, setPerfil);

  useEffect(() => {
    const timer = setTimeout(() => setShowWelcome(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded) return null;
  if (showWelcome) return <WelcomeScreen />;
  if (!user) return <AuthScreen onAuth={setUser} />;

  return <MainScreen onLogout={logout} />;
}
