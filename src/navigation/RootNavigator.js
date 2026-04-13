import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import MainScreen from '../screens/MainScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { logout } = useAuth();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main">
        {(props) => <MainScreen {...props} onLogout={logout} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
