import { personalize } from '@roi/shared';
import { Link, useFocusEffect } from 'expo-router';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  HeartHandshake,
  NotebookPen,
  Settings,
  Sparkles,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../components/ui/icon';
import { Text } from '../../components/ui/text';
import { DEV_TOOLS_ENABLED, ROUTES } from '../../constants/app';
import { MAX_FONT_SIZE_MULTIPLIER } from '../../constants/theme';
import ar from '../../locales/ar.json';
import {
  getHomeIntroDismissed,
  setHomeIntroDismissed,
} from '../../services/storage';
import { db, deviceClock } from '../db/client';
import {
  getOrAssignPeriodVerse,
  type VerseAssignmentRow,
} from '../leyaana/assignments';
import { useProfile } from '../profile/context';
import {
  IMPLEMENTED_HOME_TOOLS,
  LAST_VISIBLE_TOOL_ERROR,
  getVisibleHomeTools,
  readOrCreateVerseSeed,
  type HomeToolId,
} from '../profile/repository';
import { uiCopy } from '../profile/ui-copy';
import { Scripture } from '../scripture/scripture';
import { useContentVersion } from '../sync/ContentGate';

interface HomeToolDisplayMeta {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  route: (typeof ROUTES)[keyof typeof ROUTES];
}

const HOME_TOOL_META: Record<HomeToolId, HomeToolDisplayMeta> = {
  leyaana: {
    title: ar.leyaanaTitle,
    subtitle: ar.leyaanaSubtitle,
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
 * - Gender-aware personalized greeting and settings gear
 * - One-time dismissible MMKV intro card
 * - Compact weekly verse peek synced on focus and silent 6h delta updates
 * - أدواتك grid (Phase 4 renders ليا أنا only) with inline تعديل الأدوات edit mode
 */
export function HomeScreen() {
  const { profile, tiles, toggleTile, reorderTile, refreshProfile } =
    useProfile();
  const contentVersion = useContentVersion();
  const [weeklyVerse, setWeeklyVerse] = useState<VerseAssignmentRow | null>(() =>
    loadWeeklyVerse(),
  );
  const [introDismissed, setIntroDismissed] = useState<boolean>(() =>
    getHomeIntroDismissed(),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      setWeeklyVerse(loadWeeklyVerse());
    }, [refreshProfile]),
  );

  useEffect(() => {
    setWeeklyVerse(loadWeeklyVerse());
  }, [contentVersion]);

  const handleDismissIntro = useCallback(() => {
    setHomeIntroDismissed(true);
    setIntroDismissed(true);
  }, []);

  const handleToggleEditMode = useCallback(() => {
    setIsEditing((prev) => !prev);
    setEditError(null);
  }, []);

  const handleToggleVisibility = useCallback(
    (toolId: HomeToolId) => {
      const result = toggleTile(toolId);
      if (!result.ok) {
        setEditError(result.message || LAST_VISIBLE_TOOL_ERROR);
      } else {
        setEditError(null);
      }
    },
    [toggleTile],
  );

  const handleMoveTile = useCallback(
    (toolId: HomeToolId, direction: 'up' | 'down') => {
      setEditError(null);
      reorderTile(toolId, direction, IMPLEMENTED_HOME_TOOLS);
    },
    [reorderTile],
  );

  const greetingText = profile.name.trim()
    ? `${uiCopy('homeGreetingPrefix', profile.gender)}${profile.name.trim()}`
    : uiCopy('homeGreetingNeutral', profile.gender);

  const visibleTools = getVisibleHomeTools(tiles);
  const editableImplementedTools = [...tiles]
    .filter((tile) => IMPLEMENTED_HOME_TOOLS.has(tile.id))
    .sort((a, b) => a.order - b.order);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-6 px-6 py-6"
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

        {!introDismissed ? (
          <View className="gap-4 rounded-2xl border border-border bg-card p-4">
            <Text
              accessibilityRole="header"
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="text-start text-xl font-bold text-foreground"
            >
              {uiCopy('homeIntroHeading', profile.gender)}
            </Text>
            <Text className="text-start text-base text-muted-foreground">
              {uiCopy('homeIntroBody', profile.gender)}
            </Text>
            <Pressable
              onPress={handleDismissIntro}
              accessibilityRole="button"
              accessibilityLabel={uiCopy('homeIntroDismiss', profile.gender)}
              className="min-h-[44px] min-w-[44px] items-center justify-center self-start rounded-xl bg-primary px-4 py-2"
            >
              <Text className="text-sm font-bold text-primary-foreground">
                {uiCopy('homeIntroDismiss', profile.gender)}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Link href={ROUTES.leyaana} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="آية الأسبوع — افتح ليا أنا"
            className="min-h-[44px] gap-2 rounded-2xl border border-border bg-card p-4"
          >
            <Text className="text-start text-sm font-bold text-accent">
              {ar.weeklyVerseBadge}
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
          <View className="flex-row items-center justify-between gap-2">
            <Text
              accessibilityRole="header"
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="text-start text-xl font-bold text-foreground"
            >
              {ar.homeTitle}
            </Text>
            <Pressable
              onPress={handleToggleEditMode}
              accessibilityRole="button"
              accessibilityLabel={
                isEditing ? ar.homeSaveOrder : ar.homeEditTools
              }
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card px-4 py-2"
            >
              <Text className="text-sm font-bold text-foreground">
                {isEditing ? ar.homeSaveOrder : ar.homeEditTools}
              </Text>
            </Pressable>
          </View>

          {isEditing && editError ? (
            <Text className="text-start text-sm text-destructive">
              {editError}
            </Text>
          ) : null}

          {isEditing ? (
            <View className="gap-4">
              {editableImplementedTools.map((tile, index) => {
                const meta = HOME_TOOL_META[tile.id];
                const isFirst = index === 0;
                const isLast = index === editableImplementedTools.length - 1;
                return (
                  <View
                    key={tile.id}
                    className="flex-row items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4"
                  >
                    <View className="flex-1 flex-row items-center gap-3">
                      <View className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-muted">
                        <Icon
                          as={meta.icon}
                          size={22}
                          className="text-accent"
                        />
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
                    </View>

                    <View className="flex-row items-center gap-1">
                      <Pressable
                        onPress={() => handleMoveTile(tile.id, 'up')}
                        disabled={isFirst}
                        accessibilityRole="button"
                        accessibilityLabel="حرّك الأداة لفوق"
                        accessibilityState={{ disabled: isFirst }}
                        className={`min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-background ${
                          isFirst ? 'opacity-40' : ''
                        }`}
                      >
                        <Icon
                          as={ArrowUp}
                          size={18}
                          className="text-foreground"
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => handleMoveTile(tile.id, 'down')}
                        disabled={isLast}
                        accessibilityRole="button"
                        accessibilityLabel="حرّك الأداة لتحت"
                        accessibilityState={{ disabled: isLast }}
                        className={`min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-background ${
                          isLast ? 'opacity-40' : ''
                        }`}
                      >
                        <Icon
                          as={ArrowDown}
                          size={18}
                          className="text-foreground"
                        />
                      </Pressable>
                      <View className="min-h-[44px] min-w-[44px] items-center justify-center">
                        <Switch
                          value={tile.visible}
                          onValueChange={() => handleToggleVisibility(tile.id)}
                          accessibilityRole="switch"
                          accessibilityLabel="إظهار أو إخفاء الأداة"
                          accessibilityState={{ checked: tile.visible }}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
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
                        <Icon
                          as={meta.icon}
                          size={24}
                          className="text-accent"
                        />
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
          )}
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
