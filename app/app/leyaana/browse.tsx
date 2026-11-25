import { personalize } from '@roi/shared';
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter,
} from 'expo-router';
import { ArrowRight, Copy, Search, Star } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ROUTES } from '@/constants/app';
import { MAX_FONT_SIZE_MULTIPLIER } from '@/constants/theme';
import { db, deviceClock } from '@/features/db/client';
import { CopiedToast, useCopiedToast } from '@/features/leyaana/LeyaanaScreen';
import { MarkdownBody } from '@/features/leyaana/MarkdownBody';
import {
  favoriteId,
  listLiveFavoriteIds,
  toggleFavorite,
} from '@/features/leyaana/assignments';
import {
  listLiveBlessings,
  listLiveNamesOfGod,
  searchBlessings,
  searchNamesOfGod,
  type BlessingRow,
  type NameOfGodRow,
} from '@/features/leyaana/catalog';
import { formatArticleForCopy } from '@/features/leyaana/copy';
import { useProfile } from '@/features/profile/context';
import { uiCopy } from '@/features/profile/ui-copy';
import { useContentVersion } from '@/features/sync/ContentGate';
import ar from '@/locales/ar.json';

type BrowseKind = 'name_of_god' | 'blessing';

interface BrowseArticle {
  id: string;
  title: string;
  text: string;
  textFemale: string | null;
  verseRef: string | null;
}

function loadBrowseItems(kind: BrowseKind): BrowseArticle[] {
  if (kind === 'blessing') {
    return listLiveBlessings(db).map((b: BlessingRow) => ({
      id: b.id,
      title: b.title,
      text: b.text,
      textFemale: b.textFemale ?? null,
      verseRef: b.verseRef ?? null,
    }));
  }
  return listLiveNamesOfGod(db).map((n: NameOfGodRow) => ({
    id: n.id,
    title: n.title,
    text: n.text,
    textFemale: n.textFemale ?? null,
    verseRef: null,
  }));
}

/**
 * تصفح الكل route (/leyaana/browse):
 * Searchable compact list of Names of God or Blessings with full rich-text Dialog modal (ME-04, ME-05, ME-07).
 */
export default function LeyaanaBrowseRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const kind: BrowseKind =
    params.kind === 'blessing' ? 'blessing' : 'name_of_god';

  const { profile } = useProfile();
  const contentVersion = useContentVersion();
  const { colorScheme } = useColorScheme();
  const accentHex = colorScheme === 'dark' ? '#C2B26B' : '#8B7B3C';

  const [refreshTick, setRefreshTick] = useState(0);
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<BrowseArticle | null>(null);
  const { copiedVisible, copyTextToClipboard } = useCopiedToast();

  const refresh = useCallback(() => {
    setRefreshTick((tick) => tick + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const items = useMemo(() => {
    void refreshTick;
    void contentVersion;
    return loadBrowseItems(kind);
  }, [kind, refreshTick, contentVersion]);

  const favoriteIds = useMemo(() => {
    void refreshTick;
    void contentVersion;
    return new Set(listLiveFavoriteIds(db));
  }, [refreshTick, contentVersion]);

  const filteredItems = useMemo(() => {
    if (kind === 'blessing') {
      return searchBlessings(items, query);
    }
    return searchNamesOfGod(items, query);
  }, [items, kind, query]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.leyaana);
    }
  }, [router]);

  const handleToggleFav = useCallback(
    (itemId: string) => {
      toggleFavorite(db, deviceClock, {
        source: 'public',
        kind,
        itemId,
      });
      refresh();
    },
    [kind, refresh],
  );

  const handleCopyItem = useCallback(
    (item: BrowseArticle) => {
      void copyTextToClipboard(formatArticleForCopy(item, profile));
    },
    [copyTextToClipboard, profile],
  );

  const screenTitle = kind === 'blessing' ? 'كل البركات' : 'كل أسماء الله';
  const searchPlaceholder =
    kind === 'blessing' ? 'ابحث في البركات...' : 'ابحث في أسماء الله...';
  const copyA11yLabel = kind === 'blessing' ? 'انسخ البركة' : 'انسخ الاسم';

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
          {screenTitle}
        </Text>
      </View>

      <View className="px-6 pb-4">
        <View className="flex-row items-center gap-2 rounded-xl border border-input bg-card px-4">
          <Icon as={Search} size={18} className="text-muted-foreground" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor="#7A7060"
            accessibilityLabel={searchPlaceholder}
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            className="min-h-[44px] flex-1 py-2 text-start text-base text-foreground"
          />
        </View>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="flex-grow gap-3 px-6 pb-10"
        ListEmptyComponent={
          <View className="items-center gap-2 rounded-2xl border border-border bg-card p-6">
            <Text
              accessibilityRole="header"
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="text-center text-xl font-bold text-foreground"
            >
              {ar.emptySearchTitle}
            </Text>
            <Text className="text-center text-base text-muted-foreground">
              {uiCopy('leyaanaEmptySearchBody', profile.gender)}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isStarred = favoriteIds.has(
            favoriteId('public', kind, item.id),
          );
          return (
            <View className="flex-row items-center justify-between gap-2 rounded-2xl border border-border bg-card p-4">
              <Pressable
                onPress={() => setSelectedItem(item)}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                className="min-h-[44px] flex-1 justify-center gap-1"
              >
                <Text className="text-start text-base font-bold text-foreground">
                  {item.title}
                </Text>
                {item.verseRef ? (
                  <Text className="text-start text-sm text-accent">
                    {item.verseRef}
                  </Text>
                ) : null}
              </Pressable>

              <Pressable
                onPress={() => handleToggleFav(item.id)}
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
            </View>
          );
        }}
      />

      <Dialog
        open={selectedItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItem(null);
          }
        }}
      >
        {selectedItem ? (
          <DialogContent className="max-h-[85%] rounded-2xl border border-border bg-background p-6">
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerClassName="gap-4"
            >
              <DialogHeader>
                <DialogTitle
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                  className="pe-6 text-start text-xl font-bold leading-snug text-foreground"
                >
                  {selectedItem.title}
                </DialogTitle>
              </DialogHeader>

              {selectedItem.verseRef ? (
                <Text className="text-start text-sm font-bold text-accent">
                  {selectedItem.verseRef}
                </Text>
              ) : null}

              <Pressable
                onLongPress={() => handleCopyItem(selectedItem)}
                accessibilityRole="button"
                accessibilityLabel={`${selectedItem.title} — ${uiCopy('leyaanaLongPressHint', profile.gender)}`}
              >
                <MarkdownBody
                  markdown={personalize(
                    {
                      text: selectedItem.text,
                      textFemale: selectedItem.textFemale,
                    },
                    profile,
                  )}
                />
              </Pressable>

              <View className="flex-row items-center justify-between gap-2 border-t border-border pt-3">
                <Pressable
                  onPress={() => handleToggleFav(selectedItem.id)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    favoriteIds.has(favoriteId('public', kind, selectedItem.id))
                      ? 'إزالة من المفضلة'
                      : 'أضف للمفضلة'
                  }
                  accessibilityState={{
                    selected: favoriteIds.has(
                      favoriteId('public', kind, selectedItem.id),
                    ),
                  }}
                  className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card px-4"
                >
                  <Icon
                    as={Star}
                    size={20}
                    color={
                      favoriteIds.has(
                        favoriteId('public', kind, selectedItem.id),
                      )
                        ? accentHex
                        : undefined
                    }
                    fill={
                      favoriteIds.has(
                        favoriteId('public', kind, selectedItem.id),
                      )
                        ? accentHex
                        : 'transparent'
                    }
                    className={
                      favoriteIds.has(
                        favoriteId('public', kind, selectedItem.id),
                      )
                        ? 'text-accent'
                        : 'text-muted-foreground'
                    }
                  />
                </Pressable>

                <Pressable
                  onPress={() => handleCopyItem(selectedItem)}
                  accessibilityRole="button"
                  accessibilityLabel={copyA11yLabel}
                  className="min-h-[44px] flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3"
                >
                  <Icon
                    as={Copy}
                    size={18}
                    className="text-primary-foreground"
                  />
                  <Text className="text-sm font-bold text-primary-foreground">
                    {copyA11yLabel}
                  </Text>
                </Pressable>
              </View>

              <DialogFooter>
                <Pressable
                  onPress={() => setSelectedItem(null)}
                  accessibilityRole="button"
                  accessibilityLabel="إغلاق النافذة"
                  className="min-h-[44px] w-full items-center justify-center rounded-xl border border-border bg-card px-4 py-3"
                >
                  <Text className="text-sm font-bold text-foreground">
                    إغلاق النافذة
                  </Text>
                </Pressable>
              </DialogFooter>
            </ScrollView>
          </DialogContent>
        ) : null}
      </Dialog>

      <CopiedToast visible={copiedVisible} />
    </SafeAreaView>
  );
}
