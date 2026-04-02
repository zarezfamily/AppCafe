import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const setupNotificationChannelAsync = async () => {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('etiove-general', {
    name: 'Etiove',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 150, 80, 150],
    lightColor: '#d4a574',
  });
};

export const registerForPushNotificationsAsync = async () => {
  try {
    await setupNotificationChannelAsync();
    const permissions = await Notifications.getPermissionsAsync();
    let finalStatus = permissions.status;

    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') {
      return { status: finalStatus, token: null };
    }

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId || undefined;
    const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    return {
      status: finalStatus,
      token: tokenResponse?.data || null,
    };
  } catch (error) {
    return {
      status: 'error',
      token: null,
      error,
    };
  }
};

export const scheduleEtioveNotification = async ({ title, body, data = {} }) => {
  if (!title || !body) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: false,
      },
      trigger: null,
    });
  } catch {}
};