import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return '';

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('queue-turn', {
        name: 'Queue Turn Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0B7A75',
      });
    }

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;

    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }

    if (status !== 'granted') {
      return '';
    }

    if (Platform.OS === 'android') {
      try {
        const deviceToken = await Notifications.getDevicePushTokenAsync();
        const nativeToken = String(deviceToken?.data || '').trim();

        if (nativeToken) {
          return {
            provider: String(deviceToken?.type || 'fcm').toLowerCase(),
            token: nativeToken,
          };
        }
      } catch {
        // Fall back to Expo push tokens if a native token is unavailable.
      }
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ||
      Constants?.easConfig?.projectId ||
      undefined;

    const tokenResponse = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();
    const expoToken = String(tokenResponse?.data || '').trim();
    if (!expoToken) return '';

    return {
      provider: 'expo',
      token: expoToken,
    };
  } catch {
    return '';
  }
}

export async function sendLocalQueueJoinedNotification(queueLabel = 'Office Queue') {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'QueueLess: Joined queue',
        body: `You joined ${queueLabel}. We will notify you when it is your turn.`,
        sound: 'default',
        data: {
          type: 'queue_joined',
          queueLabel: String(queueLabel || 'Office Queue'),
        },
      },
      trigger: null,
    });
  } catch {
    // Ignore local notification failures to avoid blocking queue join.
  }
}
