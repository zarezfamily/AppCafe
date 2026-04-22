import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UIProvider } from '../context/UIContext';
import { AuthProvider } from '../context/AuthContext';

export default function AppProviders({ children }) {
  return (
    <SafeAreaProvider>
      <UIProvider>
        <AuthProvider>{children}</AuthProvider>
      </UIProvider>
    </SafeAreaProvider>
  );
}
