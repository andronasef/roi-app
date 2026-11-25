import { personalize } from '@roi/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowRight, Copy, History, Star } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ROUTES } from '@/constants/app';
import { MAX_FONT_SIZE_MULTIPLIER } from '@/constants/theme';
import { db, deviceClock } from '@/features/db/client';
import {
  CopyVerseDialog,
  type CopyVerseTarget,
} from '@/features/leyaana/CopyVerseDialog';
import {
  CopiedToast,
  formatPeriodBadge,
  useCopiedToast,
} from '@/features/leyaana/LeyaanaScreen';
import {
  favoriteId,
  listLiveFavoriteIds,
  listVerseHistory,
  toggleFavorite,
  type VerseAssignmentRow,
} from '@/features/leyaana/assignments';
import { formatVerseForCopy, needsRecipientPrompt } from '@/features/leyaana/copy';
import { useProfile } from '@/features/profile/context';
import { uiCopy } from '@/features/profile/ui-copy';
import { Scripture } from '@/features/scripture/scripture';
import { useContentVersion } from '@/features/sync/ContentGate';
import ar from '@/locales/ar.json';

/**
 * السجل route (/leyaana/history):
 * Lists past weekly & monthly assigned verse snapshots newest-first, surviving content edits/soft-deletes (ME-03).
 */
export default function LeyaanaHistoryRoute() {
  const router = useRouter();
  const { profile } = useProfile();
  const contentVersion = useContentVersion();
  const { colorScheme } = useColorScheme();
  const accentHex = colorScheme === 'dark' ? '#C2B26B' : '#8B7B3C';

  const [refreshTick, setRefreshTick] = useState(0);
  const [copyDialogVerse, setCopyDialogVerse] =
    useState<CopyVerseTarget | null>(null);
  const { copiedVisible, copyTextToClipboard } = useCopiedToast();

  const refresh = useCallback(() => {
    setRefreshTick((tick) => tick + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const rows = useMemo(() => {
    void refreshTick;
    void contentVersion;
    return listVerseHistory(db);
  }, [refreshTick, contentVersion]);

  const favoriteIds = useMemo(() => {
    void refreshTick;
    void contentVersion;
    return new Set(listLiveFavoriteIds(db));
  }, [refreshTick, contentVersion]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.leyaana);
    }
  }, [router]);

  const handleCopy = useCallback(
    (row: VerseAssignmentRow) => {
      const target: CopyVerseTarget = {
        ref: row.ref,
        text: row.text,
        textFemale: row.textFemale,
      };
      if (needsRecipientPrompt(target)) {
        setCopyDialogVerse(target);
        return;
      }
      void copyTextToClipboard(formatVerseForCopy(target, profile));
    },
    [copyTextToClipboard, profile],
  );

  const longPressHint = uiCopy('leyaanaLongPressHint', profile.gender);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 px-6 py-4">
        <Pressable
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="ارجع لليا أنا"
          className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card"
        >
          <Icon as={ArrowRight} size={20} className="text-foreground" />
        </Pressable>
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          className="text-start text-xl font-bold text-foreground"
        >
          السجل
        </Text>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerClassName="flex-grow gap-4 px-6 pb-10 pt-2"
        ListEmptyComponent={
          <View className="items-center gap-3 rounded-2xl border border-border bg-card p-6">
            <Icon as={History} size={28} className="text-accent" />
            <Text
              accessibilityRole="header"
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="text-center text-xl font-bold text-foreground"
            >
              {ar.emptyHistoryTitle}
            </Text>
            <Text className="text-center text-base text-muted-foreground">
              {uiCopy('leyaanaEmptyHistoryBody', profile.gender)}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isStarred = favoriteIds.has(
            favoriteId('public', 'verse', item.verseId),
          );
          const badge =
            item.periodType === 'weekly'
              ? ar.weeklyVerseBadge
              : ar.monthlyVerseBadge;
          const periodRange = formatPeriodBadge(
            item.periodType,
            item.periodKey,
          );
          const rendered = personalize(
            { text: item.text, textFemale: item.textFemale },
            profile,
          );

          return (
            <View className="gap-3 rounded-2xl border border-border bg-card p-6">
              <View className="flex-row flex-wrap items-center justify-between gap-2">
                <Text className="text-start text-sm font-bold text-accent">
                  {badge}
                </Text>
                <Text className="text-start text-sm text-muted-foreground">
                  {periodRange}
                </Text>
              </View>

              <Pressable
                onLongPress={() => handleCopy(item)}
                accessibilityRole="button"
                accessibilityLabel={`${badge} — ${longPressHint}`}
                className="gap-2"
              >
                <Scripture className="text-start">{rendered}</Scripture>
                <Text className="text-start text-sm text-muted-foreground">
                  {item.ref}
                </Text>
              </Pressable>

              <View className="flex-row items-center justify-between gap-2 border-t border-border pt-3">
                <Text className="text-start text-sm text-muted-foreground">
                  {longPressHint}
                </Text>
                <View className="flex-row items-center gap-1">
                  <Pressable
                    onPress={() => {
                      toggleFavorite(db, deviceClock, {
                        source: 'public',
                        kind: 'verse',
                        itemId: item.verseId,
                      });
                      refresh();
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={
                      isStarred ? 'إزالة من المفضلة' : 'أضف للمفضلة'
                    }
                    accessibilityState={{ selected: isStarred }}
                    className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
                  >
                    <Icon
                      as={Star}
                      size={20}
                      color={isStarred ? accentHex : undefined}
                      fill={isStarred ? accentHex : 'transparent'}
                      className={
                        isStarred ? 'text-accent' : 'text-muted-foreground'
                      }
                    />
                  </Pressable>
                  <Pressable
                    onPress={() => handleCopy(item)}
                    accessibilityRole="button"
                    accessibilityLabel="انسخ الآية"
                    className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
                  >
                    <Icon
                      as={Copy}
                      size={20}
                      className="text-muted-foreground"
                    />
                  </Pressable>
                </View>
              </View>
            </View>
          );
        }}
      />

      <CopyVerseDialog
        open={copyDialogVerse !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCopyDialogVerse(null);
          }
        }}
        verse={copyDialogVerse}
        profile={profile}
        onCopy={(formatted) => {
          void copyTextToClipboard(formatted);
        }}
      />

      <CopiedToast visible={copiedVisible} />
    </SafeAreaView>
  );
}
