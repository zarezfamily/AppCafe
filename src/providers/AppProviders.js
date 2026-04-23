import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../context/AuthContext';
import { NetworkProvider } from '../context/NetworkContext';
import { UIProvider } from '../context/UIContext';

export default function AppProviders({ children }) {
  return (
    <SafeAreaProvider>
      <NetworkProvider>
        <UIProvider>
          <AuthProvider>{children}</AuthProvider>
        </UIProvider>
      </NetworkProvider>
    </SafeAreaProvider>
  );
}
