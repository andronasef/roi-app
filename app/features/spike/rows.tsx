import {
  GoogleSignin,
  isSuccessResponse,
} from '@react-native-google-signin/google-signin';
import { and, eq, isNull, sql } from 'drizzle-orm';
import * as Font from 'expo-font';
import { getLocales } from 'expo-localization';
import { I18nManager, Platform } from 'react-native';
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets';
import { DefaultScheduler, Rating } from 'ts-fsrs';

import { GOOGLE_OAUTH, SETTINGS_KEYS } from '@/constants/app';
import { PRAYER_SENTINEL } from '@/constants/telemetry';
import { FONT_FAMILIES } from '@/constants/theme';
import { db } from '@/features/db/client';
import { settings } from '@/features/db/schema';
import { type SpikeCheck } from '@/features/spike/runner';
import { pushSpikeWidget } from '@/features/widgets/update';
import { STORAGE_KEYS, storage } from '@/services/storage';
import {
  setTelemetryConsent,
  telemetryStatus,
  testCrash,
  track,
} from '@/services/telemetry';

const MMKV_PROBE_KEY = '__spike_mmkv_probe__';
const SQLITE_PROBE_ID = '__spike_sqlite_probe__';

export function getDeviceLocaleTag(): string {
  return getLocales()[0]?.languageTag ?? 'unknown';
}

function getAllExpectedFonts(): string[] {
  return [
    ...Object.values(FONT_FAMILIES.ui),
    ...Object.values(FONT_FAMILIES.scripture.amiri),
    ...Object.values(FONT_FAMILIES.scripture.scheherazade),
  ];
}

async function checkRtl(): Promise<boolean> {
  if (!I18nManager.isRTL) {
    throw new Error(`I18nManager.isRTL is false (locale=${getDeviceLocaleTag()})`);
  }
  return true;
}

async function checkFonts(): Promise<boolean> {
  const loaded = new Set(Font.getLoadedFonts());
  const missing = getAllExpectedFonts().filter(
    (family) => !Font.isLoaded(family) && !loaded.has(family),
  );
  if (missing.length > 0) {
    throw new Error(`Missing fonts: ${missing.join(', ')}`);
  }
  return true;
}

async function checkMmkv(): Promise<boolean> {
  const expected = `ok-${Date.now()}`;
  storage.set(MMKV_PROBE_KEY, expected);
  const readBack = storage.getString(MMKV_PROBE_KEY);
  storage.remove(MMKV_PROBE_KEY);
  const afterRemove = storage.getString(MMKV_PROBE_KEY);

  if (readBack !== expected || afterRemove !== undefined) {
    throw new Error(`MMKV roundtrip mismatch (${String(readBack)})`);
  }
  return true;
}

async function checkSqlite(): Promise<boolean> {
  const rows = db.all<{ count: number }>(
    sql`SELECT COUNT(*) AS count FROM __drizzle_migrations`,
  );
  const migrationCount = Number(rows[0]?.count ?? 0);
  if (migrationCount < 1) {
    throw new Error('__drizzle_migrations has zero rows');
  }

  const now = Date.now();
  const value = String(now);
  db.insert(settings)
    .values({
      id: SQLITE_PROBE_ID,
      value,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: { value, updatedAt: now, deletedAt: null },
    })
    .run();

  const row = db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.id, SQLITE_PROBE_ID), isNull(settings.deletedAt)))
    .get();

  // Remove the probe so it never lingers in a sync-eligible table.
  db.delete(settings).where(eq(settings.id, SQLITE_PROBE_ID)).run();

  if (row?.value !== value) {
    throw new Error('SQLite settings upsert readback mismatch');
  }
  return true;
}

async function checkReanimatedWorklets(): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const onUiThreadDone = (ok: boolean) => {
      resolve(ok);
    };
    scheduleOnUI(() => {
      'worklet';
      scheduleOnRN(onUiThreadDone, true);
    });
  });
}

async function checkFsrs(): Promise<boolean> {
  const scheduler = await DefaultScheduler();
  const now = new Date();
  const card = scheduler.newCard({ now });
  const { card: nextCard } = scheduler.review({
    card,
    grade: Rating.Good,
    now,
  });

  if (!(nextCard.dueAt.getTime() > now.getTime())) {
    throw new Error('ts-fsrs Good review did not advance dueAt');
  }
  return true;
}

async function checkFirebase(): Promise<boolean> {
  const status = telemetryStatus();
  if (!status.initialized || !status.hasProjectId) {
    throw new Error(
      `Firebase status initialized=${String(status.initialized)} projectId=${String(status.hasProjectId)}`,
    );
  }
  return true;
}

async function checkWidgetUpdate(): Promise<boolean> {
  const existing = db
    .select({ value: settings.value })
    .from(settings)
    .where(
      and(
        eq(settings.id, SETTINGS_KEYS.SPIKE_WIDGET),
        isNull(settings.deletedAt),
      ),
    )
    .get();

  const parsed = existing ? Number.parseInt(existing.value, 10) : 0;
  const currentCount = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  const nextCount = currentCount + 1;
  const now = Date.now();

  db.insert(settings)
    .values({
      id: SETTINGS_KEYS.SPIKE_WIDGET,
      value: String(nextCount),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: {
        value: String(nextCount),
        updatedAt: now,
        deletedAt: null,
      },
    })
    .run();

  await pushSpikeWidget(nextCount);
  return true;
}

export const AUTOMATIC_CHECKS: readonly SpikeCheck[] = [
  { id: 'rtl', titleKey: 'spikeRowRtl', run: checkRtl },
  { id: 'fonts', titleKey: 'spikeRowFonts', run: checkFonts },
  { id: 'mmkv', titleKey: 'spikeRowMmkv', run: checkMmkv },
  { id: 'sqlite', titleKey: 'spikeRowSqlite', run: checkSqlite },
  { id: 'reanimated', titleKey: 'spikeRowReanimated', run: checkReanimatedWorklets },
  { id: 'fsrs', titleKey: 'spikeRowFsrs', run: checkFsrs },
  { id: 'firebase', titleKey: 'spikeRowFirebase', run: checkFirebase },
  { id: 'widget', titleKey: 'spikeRowWidget', run: checkWidgetUpdate },
] as const;

export function getTelemetryConsent(): boolean {
  return storage.getBoolean(STORAGE_KEYS.TELEMETRY_CONSENT) ?? false;
}

/** Applies consent natively first; only persists the choice once that succeeds. */
export async function toggleTelemetryConsent(enabled: boolean): Promise<void> {
  await setTelemetryConsent(enabled);
  storage.set(STORAGE_KEYS.TELEMETRY_CONSENT, enabled);
}

export async function sendSpikeTestEvent(): Promise<void> {
  await track('spike_test');
}

export function triggerSpikeTestCrash(): void {
  testCrash();
}

export function throwSpikeSentinelError(): never {
  throw new Error(`${PRAYER_SENTINEL} spike test`);
}

export async function runGoogleSignInCheck(): Promise<boolean> {
  GoogleSignin.configure({
    iosClientId: GOOGLE_OAUTH.iosClientId,
    webClientId: GOOGLE_OAUTH.webClientId,
  });

  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const response = await GoogleSignin.signIn();
  if (!isSuccessResponse(response)) {
    return false;
  }

  try {
    const tokens = await GoogleSignin.getTokens();
    return typeof tokens.accessToken === 'string' && tokens.accessToken.length > 0;
  } finally {
    await GoogleSignin.signOut();
  }
}
