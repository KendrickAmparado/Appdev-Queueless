import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotificationsAsync } from './src/notifications/registerForPushNotifications';
import { upsertCurrentUserPushToken } from './firebase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  useEffect(() => {
    registerForPushNotificationsAsync()
      .then((token) => upsertCurrentUserPushToken(token))
      .catch(() => {
        // Ignore setup failures to avoid blocking app launch.
      });

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
      // Intentionally keep this listener active for future deep-link routing.
    });

    return () => {
      responseSubscription.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="dark" />
      <AppNavigator />
    </>
  );
}
