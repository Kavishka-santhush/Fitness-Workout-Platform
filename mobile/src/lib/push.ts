import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { api } from './api';

/**
 * Expo Push Notifications wiring.
 *
 *  - Configures the foreground handler once.
 *  - Registers for a push token and stores it on the server via
 *    `POST /api/notifications/devices` (the `registerDevice` endpoint).
 *  - Provides local-notification helpers for rest-timer completion and
 *    workout reminders (works fully offline — great for gym basements).
 */
let configured = false;

export function configurePush() {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

export async function registerForPush(): Promise<string | null> {
  if (Constants.isPlayer) return null; // Expo Go can't receive custom pushes

  configurePush();

  const { status } = await Notifications.getPermissionsAsync();
  let finalStatus = status;
  if (finalStatus !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    finalStatus = req.status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId = (Constants.expoConfig?.extra?.eas?.projectId as string) ?? Constants.easConfig?.projectId;
  const tokenData = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  const token = tokenData.data;

  // Persist to the backend so server-side notifications can target this device.
  try {
    await api.post('/notifications/devices', {
      token,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    });
  } catch {
    /* non-fatal: token still usable for local scheduling */
  }
  return token;
}

export async function scheduleLocal(
  title: string,
  body: string,
  secondsFromNow: number,
  channel = 'default'
): Promise<string> {
  configurePush();
  return Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true },
    trigger:
      secondsFromNow <= 0
        ? null
        : ({ type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(secondsFromNow), channelId: channel } as any),
  });
}

export async function cancelAllLocal() {
  await Notifications.removeAllScheduledNotificationsAsync();
}
