import { createContext, useContext, useState } from 'react';

// Define the shape of the global UI state
const UIContext = createContext();

export function UIProvider({ children }) {
  // Example UI states (add more as needed)
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState({ title: '', description: '', actions: [] });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  // Add more UI states here as needed

  const value = {
    dialogVisible,
    setDialogVisible,
    dialogConfig,
    setDialogConfig,
    showOnboarding,
    setShowOnboarding,
    showProfile,
    setShowProfile,
    // Add more states and setters here
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  return useContext(UIContext);
}
