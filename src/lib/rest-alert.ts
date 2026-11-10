import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform, Vibration } from 'react-native';

const CHANNEL_ID = 'rest-timer';
let scheduledId: string | null = null;

/** Buzz the phone when rest is over (no sound). */
export function vibrateRestOver() {
  if (Platform.OS === 'web') return;
  Vibration.vibrate([0, 250, 120, 250, 120, 400]);
}

/** Notify when rest is over, for when Gainmark is in the background. Replaces any earlier alert. */
export async function scheduleRestAlert(endsAt: number, label: string, kind: 'rest' | 'timer' = 'rest') {
  await cancelRestAlert();
  if (Platform.OS === 'web') return;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;
  const seconds = Math.round((endsAt - Date.now()) / 1000);
  if (seconds < 1) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Rest timer',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 120, 250],
    });
  }
  scheduledId = await Notifications.scheduleNotificationAsync({
    content:
      kind === 'rest'
        ? { title: 'Rest over 💪', body: `Time for your next set${label ? ` of ${label}` : ''}.`, data: { kind: 'rest' } }
        : { title: 'Timer done ⏱', body: 'Your timer has finished.', data: { kind: 'rest' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds, channelId: CHANNEL_ID },
  });
}

export async function cancelRestAlert() {
  if (Platform.OS === 'web' || !scheduledId) return;
  const id = scheduledId;
  scheduledId = null;
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}
