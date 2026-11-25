import { personalize } from '@roi/shared';
import { Link, useFocusEffect } from 'expo-router';
import {
  BookOpen,
  HeartHandshake,
  NotebookPen,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../components/ui/icon';
import { Text } from '../../components/ui/text';
import { DEV_TOOLS_ENABLED, ROUTES } from '../../constants/app';
import { MAX_FONT_SIZE_MULTIPLIER } from '../../constants/theme';
import ar from '../../locales/ar.json';
import { db, deviceClock } from '../db/client';
import {
  getOrAssignPeriodVerse,
  type VerseAssignmentRow,
} from '../leyaana/assignments';
import { useProfile } from '../profile/context';
import {
  getVisibleHomeTools,
  readOrCreateVerseSeed,
  type HomeToolId,
} from '../profile/repository';
import { uiCopy } from '../profile/ui-copy';
import { Scripture } from '../scripture/scripture';

interface HomeToolDisplayMeta {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  route: (typeof ROUTES)[keyof typeof ROUTES];
}

const HOME_TOOL_META: Record<HomeToolId, HomeToolDisplayMeta> = {
  leyaana: {
    title: 'ليا أنا',
    subtitle: 'آية الأسبوع والشهر، أسماء الله، البركات',
    icon: Sparkles,
    route: ROUTES.leyaana,
  },
  memorize: {
    title: 'حفظ الآيات',
    subtitle: 'مراجعة يومية بالآيات المحفوظة',
    icon: BookOpen,
    route: ROUTES.home,
  },
  intercession: {
    title: 'تشفع',
    subtitle: 'متابعة صلواتك عن الناس',
    icon: HeartHandshake,
    route: ROUTES.home,
  },
  gratitude: {
    title: 'دفتر الشكر',
    subtitle: 'سطر شكر كل يوم',
    icon: NotebookPen,
    route: ROUTES.home,
  },
};

function loadWeeklyVerse(): VerseAssignmentRow | null {
  const seed = readOrCreateVerseSeed(db, deviceClock);
  return getOrAssignPeriodVerse(db, deviceClock, 'weekly', new Date(), seed);
}

/**
 * Personalized أدواتك Home screen (HOME-03, HOME-05, D-05..D-07):
 * Renders gender-aware greeting, weekly verse peek into ليا أنا, and visible tool tiles.
 */
export function HomeScreen() {
  const { profile, tiles, refreshProfile } = useProfile();
  const [weeklyVerse, setWeeklyVerse] = useState<VerseAssignmentRow | null>(() =>
    loadWeeklyVerse(),
  );

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      setWeeklyVerse(loadWeeklyVerse());
    }, [refreshProfile]),
  );

  const greetingText = profile.name.trim()
    ? `${uiCopy('homeGreetingPrefix', profile.gender)}${profile.name.trim()}`
    : uiCopy('homeGreetingNeutral', profile.gender);

  const visibleTools = getVisibleHomeTools(tiles);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="px-6 py-6 gap-6"
      >
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1 gap-1">
            <Text
              accessibilityRole="header"
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="text-start text-xl font-bold text-foreground"
            >
              {greetingText}
            </Text>
            <Text className="text-start text-sm text-muted-foreground">
              {uiCopy('homeSubtitle', profile.gender)}
            </Text>
          </View>

          <Link href={ROUTES.settings} asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="افتح الإعدادات"
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card"
            >
              <Icon as={Settings} size={22} className="text-foreground" />
            </Pressable>
          </Link>
        </View>

        <Link href={ROUTES.leyaana} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="آية الأسبوع — افتح ليا أنا"
            className="min-h-[44px] gap-2 rounded-2xl border border-border bg-card p-4"
          >
            <Text className="text-start text-sm font-bold text-accent">
              آية الأسبوع
            </Text>
            {weeklyVerse ? (
              <>
                <Scripture numberOfLines={2} className="text-start">
                  {personalize(
                    {
                      text: weeklyVerse.text,
                      textFemale: weeklyVerse.textFemale,
                    },
                    profile,
                  )}
                </Scripture>
                <Text className="text-start text-sm text-muted-foreground">
                  {weeklyVerse.ref}
                </Text>
              </>
            ) : (
              <Text className="text-start text-base text-muted-foreground">
                افتح ليا أنا عشان تقرأ آيتك الأسبوعية
              </Text>
            )}
          </Pressable>
        </Link>

        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text
              accessibilityRole="header"
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="text-start text-xl font-bold text-foreground"
            >
              أدواتك
            </Text>
          </View>

          <View className="gap-4">
            {visibleTools.map((tile) => {
              const meta = HOME_TOOL_META[tile.id];
              return (
                <Link key={tile.id} href={meta.route} asChild>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={meta.title}
                    className="min-h-[44px] flex-row items-center gap-4 rounded-2xl border border-border bg-card p-6"
                  >
                    <View className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-muted">
                      <Icon as={meta.icon} size={24} className="text-accent" />
                    </View>
                    <View className="flex-1 gap-1">
                      <Text
                        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                        className="text-start text-xl font-bold text-foreground"
                      >
                        {meta.title}
                      </Text>
                      <Text className="text-start text-sm text-muted-foreground">
                        {meta.subtitle}
                      </Text>
                    </View>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        </View>

        {DEV_TOOLS_ENABLED ? (
          <View className="mt-2 flex-row flex-wrap justify-center gap-3">
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
      </ScrollView>
    </SafeAreaView>
  );
}
