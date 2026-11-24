import { formatArabicDate, toArabicDigits, TORTURE_FIXTURES } from '@roi/shared';
import { and, eq, isNull } from 'drizzle-orm';
import { Link } from 'expo-router';
import { useEffect, useState } from 'react';
import { I18nManager, Pressable, Text, View } from 'react-native';

import { DEV_TOOLS_ENABLED, ROUTES, SETTINGS_KEYS } from '@/constants/app';
import { THEME_OPTIONS, type ThemePreference } from '@/constants/theme';
import { db } from '@/features/db/client';
import { settings } from '@/features/db/schema';
import {
  Scripture,
  ScriptureSizeSlider,
} from '@/features/scripture/scripture';
import { useThemePreference } from '@/hooks/use-theme-preference';
import ar from '@/locales/ar.json';

const PSALM_23_1 =
  TORTURE_FIXTURES.find((fixture) => fixture.id === 'ps23-1') ??
  TORTURE_FIXTURES[0];

const THEME_LABELS: Record<ThemePreference, string> = {
  system: ar.themeSystem,
  light: ar.themeLight,
  dark: ar.themeDark,
};

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
  const { theme, setTheme } = useThemePreference();

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
    <View className="flex-1 items-center justify-center bg-background px-6 py-8">
      <Text
        accessibilityRole="header"
        className="mb-3 text-center text-3xl font-bold text-foreground"
      >
        {ar.appName}
      </Text>
      <Text className="mb-2 text-center text-lg text-foreground">
        {lastBootText}
      </Text>
      <Text className="text-center text-sm text-muted-foreground">
        {rtlStatus}
      </Text>

      <View className="mt-6 w-full rounded-2xl border border-border bg-card p-4">
        <Scripture className="text-center">{PSALM_23_1.text}</Scripture>
        <Text className="mt-1 text-center text-xs text-muted-foreground">
          {PSALM_23_1.ref}
        </Text>
        <View className="mt-3">
          <ScriptureSizeSlider />
        </View>
      </View>

      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={ar.themeLabel}
        className="mt-6 flex-row items-center gap-2 rounded-2xl border border-border bg-card p-1.5"
      >
        {THEME_OPTIONS.map((option) => {
          const isSelected = theme === option;
          const label = THEME_LABELS[option];
          return (
            <Pressable
              key={option}
              onPress={() => setTheme(option)}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ checked: isSelected }}
              className={`min-h-[44px] min-w-[44px] items-center justify-center rounded-xl px-4 py-2.5 ${
                isSelected ? 'bg-primary' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  isSelected ? 'text-primary-foreground' : 'text-foreground'
                }`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {DEV_TOOLS_ENABLED ? (
        <Link href={ROUTES.torture} asChild>
          <Pressable
            accessibilityRole="link"
            accessibilityLabel={ar.tortureLink}
            className="mt-6 min-h-[44px] items-center justify-center rounded-xl border border-border bg-card px-5 py-2.5"
          >
            <Text className="text-sm font-medium text-foreground">
              {ar.tortureLink}
            </Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}
