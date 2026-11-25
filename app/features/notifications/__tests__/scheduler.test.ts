import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  cancelScheduledNotificationAsync: vi.fn(async () => undefined),
  scheduleNotificationAsync: vi.fn(async () => 'new-id'),
  setNotificationChannelAsync: vi.fn(async () => undefined),
  setNotificationHandler: vi.fn(),
  storedId: { value: null as string | null },
}));

vi.mock('expo-notifications', () => ({
  getPermissionsAsync: mocks.getPermissionsAsync,
  requestPermissionsAsync: mocks.requestPermissionsAsync,
  cancelScheduledNotificationAsync: mocks.cancelScheduledNotificationAsync,
  scheduleNotificationAsync: mocks.scheduleNotificationAsync,
  setNotificationChannelAsync: mocks.setNotificationChannelAsync,
  setNotificationHandler: mocks.setNotificationHandler,
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }));

vi.mock('../../../services/storage', () => ({
  getGratitudeNotificationId: () => mocks.storedId.value,
  setGratitudeNotificationId: (id: string | null) => {
    mocks.storedId.value = id;
  },
}));

import {
  GRATITUDE_CHANNEL_ID,
  syncGratitudeReminderSchedule,
} from '../scheduler';

describe('syncGratitudeReminderSchedule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.storedId.value = null;
    mocks.getPermissionsAsync.mockResolvedValue({ granted: false });
    mocks.requestPermissionsAsync.mockResolvedValue({ granted: true });
  });

  it('never requests permission when disabled, and cancels the stored id', async () => {
    mocks.storedId.value = 'old-id';
    const result = await syncGratitudeReminderSchedule({
      enabled: false,
      hour: 21,
      minute: 0,
    });

    expect(result).toEqual({ ok: true });
    expect(mocks.getPermissionsAsync).not.toHaveBeenCalled();
    expect(mocks.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mocks.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old-id');
    expect(mocks.storedId.value).toBeNull();
  });

  it('requests permission, replaces the old id and schedules generic daily copy when enabled', async () => {
    mocks.storedId.value = 'old-id';
    const result = await syncGratitudeReminderSchedule({
      enabled: true,
      hour: 21,
      minute: 30,
    });

    expect(result).toEqual({ ok: true });
    expect(mocks.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mocks.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old-id');
    expect(mocks.scheduleNotificationAsync).toHaveBeenCalledWith({
      content: {
        title: 'روعي',
        body: 'لحظة هدوء قبل ما تنام — تحب تكتب سطر شكر النهاردة؟',
      },
      trigger: {
        type: 'daily',
        hour: 21,
        minute: 30,
        channelId: GRATITUDE_CHANNEL_ID,
      },
    });
    expect(mocks.storedId.value).toBe('new-id');
  });

  it('reports permission_denied and schedules nothing when the OS refuses', async () => {
    mocks.requestPermissionsAsync.mockResolvedValue({ granted: false });
    const result = await syncGratitudeReminderSchedule({
      enabled: true,
      hour: 21,
      minute: 0,
    });

    expect(result).toEqual({ ok: false, reason: 'permission_denied' });
    expect(mocks.scheduleNotificationAsync).not.toHaveBeenCalled();
    expect(mocks.storedId.value).toBeNull();
  });

  it('skips the prompt when permission is already granted', async () => {
    mocks.getPermissionsAsync.mockResolvedValue({ granted: true });
    await syncGratitudeReminderSchedule({ enabled: true, hour: 8, minute: 0 });
    expect(mocks.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mocks.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
  });
});
