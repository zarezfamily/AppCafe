import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import AuthScreen from '../screens/AuthScreen';
import MainScreen from '../screens/MainScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { user, setUser, logout } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Auth">
          {(props) => <AuthScreen {...props} onAuth={setUser} />}
        </Stack.Screen>
      ) : (
        <Stack.Screen name="Main">
          {(props) => <MainScreen {...props} onLogout={logout} />}
        </Stack.Screen>
      )}
    </Stack.Navigator>
  );
}
