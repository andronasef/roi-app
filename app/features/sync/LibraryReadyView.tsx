import { toArabicDigits } from '@roi/shared';
import { Link, useFocusEffect } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { DEV_TOOLS_ENABLED, ROUTES } from '@/constants/app';
import {
  MAX_FONT_SIZE_MULTIPLIER,
  THEME_OPTIONS,
  type ThemePreference,
} from '@/constants/theme';
import { db } from '@/features/db/client';
import {
  readLibraryCounts,
  type LibraryCounts,
} from '@/features/sync/first-download';
import { useThemePreference } from '@/hooks/use-theme-preference';
import ar from '@/locales/ar.json';

const THEME_LABELS: Record<ThemePreference, string> = {
  system: ar.themeSystem,
  light: ar.themeLight,
  dark: ar.themeDark,
};

/**
 * Post-download offline-ready home view (D-04, HOME-06):
 * Displays "المكتبة جاهزة" with Arabic-Indic counts for الآيات, أسماء الله, البركات,
 * preserved Phase 1 theme switcher, and DEV_TOOLS_ENABLED navigation chips.
 */
export function LibraryReadyView() {
  const [counts, setCounts] = useState<LibraryCounts>(() =>
    readLibraryCounts(db),
  );
  const { theme, setTheme } = useThemePreference();

  useFocusEffect(
    useCallback(() => {
      setCounts(readLibraryCounts(db));
    }, []),
  );

  const summaryRows = [
    { key: 'verses', label: ar.countVersesLabel, value: counts.verses },
    {
      key: 'names_of_god',
      label: ar.countNamesOfGodLabel,
      value: counts.namesOfGod,
    },
    { key: 'blessings', label: ar.countBlessingsLabel, value: counts.blessings },
  ] as const;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
    >
      <View className="w-full items-center px-6 py-8">
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          className="text-center text-3xl font-bold text-foreground"
        >
          {ar.appName}
        </Text>

        <View className="mt-4 flex-row items-center justify-center gap-2">
          <Icon as={CheckCircle2} size={24} className="text-accent" />
          <Text
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            className="text-center text-xl font-bold text-foreground"
          >
            {ar.libraryReadyTitle}
          </Text>
        </View>

        <Text className="mt-2 text-center text-base text-muted-foreground">
          {ar.libraryReadyBody}
        </Text>

        <View className="mt-6 w-full gap-2 rounded-2xl border border-border bg-card p-4">
          {summaryRows.map((row) => (
            <View
              key={row.key}
              className="flex-row items-center justify-between py-2"
            >
              <Text className="text-base text-foreground">{row.label}</Text>
              <Text
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                className="text-xl font-bold text-foreground"
              >
                {toArabicDigits(row.value)}
              </Text>
            </View>
          ))}
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
                  className={`text-sm ${
                    isSelected
                      ? 'font-bold text-primary-foreground'
                      : 'text-foreground'
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {DEV_TOOLS_ENABLED ? (
          <View className="mt-6 flex-row gap-3">
            <Link href={ROUTES.torture} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={ar.tortureLink}
                className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card px-5 py-2.5"
              >
                <Text className="text-sm text-foreground">
                  {ar.tortureLink}
                </Text>
              </Pressable>
            </Link>
            <Link href={ROUTES.spike} asChild>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={ar.spikeLink}
                className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card px-5 py-2.5"
              >
                <Text className="text-sm text-foreground">{ar.spikeLink}</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
