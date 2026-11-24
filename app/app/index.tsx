import { formatArabicDate, toArabicDigits } from '@roi/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { useEffect, useState } from 'react';
import { I18nManager, StyleSheet, Text, View } from 'react-native';

import { SETTINGS_KEYS } from '@/constants/app';
import { db } from '@/features/db/client';
import { settings } from '@/features/db/schema';
import ar from '@/locales/ar.json';

function readPreviousBootMs(): number | null {
  const existing = db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.id, SETTINGS_KEYS.LAST_BOOT), isNull(settings.deletedAt)))
    .get();

  const parsed = existing ? Number(existing.value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatBootTimestamp(epochMs: number): string {
  const date = new Date(epochMs);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${formatArabicDate(date)} · ${toArabicDigits(`${hours}:${minutes}`)}`;
}

export default function HomeScreen() {
  const [previousBootMs] = useState<number | null>(readPreviousBootMs);

  useEffect(() => {
    const now = Date.now();
    db.insert(settings)
      .values({
        id: SETTINGS_KEYS.LAST_BOOT,
        value: String(now),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .onConflictDoUpdate({
        target: settings.id,
        set: {
          value: String(now),
          updatedAt: now,
          deletedAt: null,
        },
      })
      .run();
  }, []);

  const isRtl = I18nManager.isRTL;
  const rtlStatus = isRtl ? ar.rtlActive : ar.rtlInactive;
  const lastBootText =
    previousBootMs !== null
      ? `${ar.lastBootLabel}: ${formatBootTimestamp(previousBootMs)}`
      : ar.firstBoot;

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        {ar.appName}
      </Text>
      <Text style={styles.subtitle}>{lastBootText}</Text>
      <Text style={styles.meta}>{rtlStatus}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    backgroundColor: '#FAF6EC',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2B2620',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: '#2B2620',
    textAlign: 'center',
    marginBottom: 8,
  },
  meta: {
    fontSize: 14,
    color: '#6B6257',
    textAlign: 'center',
  },
});
