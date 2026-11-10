import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import type { Group } from '@/data/groups';
import type { Split } from '@/data/splits';
import type { Reminder } from '@/store/store';

const CHANNEL_ID = 'workouts';

// Show reminders even while Gainmark is open. The rest timer already vibrates in the app,
// so its "rest over" alert only shows when Gainmark is in the background.
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const isRest = n.request.content.data?.kind === 'rest';
      return { shouldShowBanner: !isRest, shouldShowList: !isRest, shouldPlaySound: false, shouldSetBadge: false };
    },
  });
}

export const remindersSupported = Platform.OS !== 'web';

/** Ask for notification permission. Returns true when granted. */
export async function requestReminderPermission(): Promise<boolean> {
  if (!remindersSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

/**
 * Replace all scheduled reminders with one weekly reminder per training day of the split.
 * Rest days get nothing.
 */
export async function syncReminders(split: Split | undefined, reminder: Reminder, groupById: Map<string, Group>) {
  if (!remindersSupported) return;
  // Only clear workout reminders; leave a running rest-timer alert alone.
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.content.data?.kind !== 'rest')
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!reminder.enabled || !split) return;

  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Workout reminders',
      importance: AndroidImportance.DEFAULT,
    });
  }

  await Promise.all(
    split.map((day, jsWeekday) => {
      if (!day) return null;
      const groups = day.groups
        .map((g) => groupById.get(g)?.name)
        .filter(Boolean)
        .join(' · ');
      return Notifications.scheduleNotificationAsync({
        content: {
          title: `${day.name} day 💪`,
          data: { kind: 'reminder' },
          body: groups ? `Time to train ${groups}. Copy your last session in Gainmark.` : 'Time to train.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          channelId: CHANNEL_ID,
          weekday: jsWeekday + 1, // Expo counts 1 = Sunday … 7 = Saturday.
          hour: reminder.hour,
          minute: reminder.minute,
        },
      });
    }),
  );
}
