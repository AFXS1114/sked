import { Stack } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '../context/AuthContext';

// Configure push notifications behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(manager)" />
        <Stack.Screen name="(employee)" />
      </Stack>
    </AuthProvider>
  );
}
