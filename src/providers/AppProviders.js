import React from 'react';
import { UIProvider } from '../context/UIContext';
import { AuthProvider } from '../context/AuthContext';

export default function AppProviders({ children }) {
  return (
    <UIProvider>
      <AuthProvider>{children}</AuthProvider>
    </UIProvider>
  );
}
