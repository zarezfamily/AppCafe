import React from 'react';
import AppProviders from './src/providers/AppProviders';
import AppBootstrap from './src/app/AppBootstrap';

export default function App() {
  return (
    <AppProviders>
      <AppBootstrap />
    </AppProviders>
  );
}
