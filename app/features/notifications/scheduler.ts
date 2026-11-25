import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import {
  getGratitudeNotificationId,
  setGratitudeNotificationId,
} from '../../services/storage';
import type { GratitudeReminderSettings } from '../gratitude/models';

export const GRATITUDE_CHANNEL_ID = 'daily-reminders';

/** Static generic copy only: never embeds gratitude or prayer text (SET-04, T-05-06). */
const REMINDER_TITLE = 'روعي';
const REMINDER_BODY = 'لحظة هدوء قبل ما تنام — تحب تكتب سطر شكر النهاردة؟';

// Expo SDK 58 shows foreground notifications by default; make it explicit (Pitfall 5).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Ask for OS notification permission (only ever called after the user opts in). */
export async function ensureReminderPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

/** Cancel the scheduled gratitude reminder (given id or the one stored in MMKV). */
export async function cancelGratitudeReminder(
  id?: string | null,
): Promise<void> {
  const target = id ?? getGratitudeNotificationId();
  if (target) {
    await Notifications.cancelScheduledNotificationAsync(target).catch(
      () => undefined,
    );
  }
  setGratitudeNotificationId(null);
}

/** Schedule the repeating daily reminder, replacing any previous one. Returns the new id. */
export async function scheduleDailyGratitudeReminder(
  hour: number,
  minute: number,
  previousId?: string | null,
): Promise<string> {
  if (previousId) {
    await Notifications.cancelScheduledNotificationAsync(previousId).catch(
      () => undefined,
    );
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(GRATITUDE_CHANNEL_ID, {
      name: 'التذكيرات اليومية',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return Notifications.scheduleNotificationAsync({
    content: { title: REMINDER_TITLE, body: REMINDER_BODY },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: GRATITUDE_CHANNEL_ID,
    },
  });
}

export type GratitudeSyncResult =
  | { ok: true }
  | { ok: false; reason: 'permission_denied' };

/**
 * Make the OS schedule match the settings. Disabled: cancel only (never asks for permission).
 * Enabled: request permission, then replace the previous schedule.
 */
export async function syncGratitudeReminderSchedule(
  next: GratitudeReminderSettings,
): Promise<GratitudeSyncResult> {
  if (!next.enabled) {
    await cancelGratitudeReminder();
    return { ok: true };
  }
  if (!(await ensureReminderPermissions())) {
    await cancelGratitudeReminder();
    return { ok: false, reason: 'permission_denied' };
  }
  const id = await scheduleDailyGratitudeReminder(
    next.hour,
    next.minute,
    getGratitudeNotificationId(),
  );
  setGratitudeNotificationId(id);
  return { ok: true };
}
