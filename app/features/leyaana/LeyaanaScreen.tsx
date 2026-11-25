import {
  EGYPTIAN_MONTHS,
  formatArabicDate,
  personalize,
  toArabicDigits,
  type ContentKind,
} from '@roi/shared';
import * as Clipboard from 'expo-clipboard';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Copy,
  History,
  Plus,
  Star,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../components/ui/icon';
import { Text } from '../../components/ui/text';
import { ROUTES } from '../../constants/app';
import { MAX_FONT_SIZE_MULTIPLIER } from '../../constants/theme';
import ar from '../../locales/ar.json';
import { db, deviceClock } from '../db/client';
import { readOrCreateVerseSeed } from '../profile/repository';
import { useProfile } from '../profile/context';
import { uiCopy } from '../profile/ui-copy';
import { Scripture } from '../scripture/scripture';
import { useContentVersion } from '../sync/ContentGate';
import {
  CopyVerseDialog,
  type CopyVerseTarget,
} from './CopyVerseDialog';
import { MarkdownBody } from './MarkdownBody';
import {
  DeletePersonalItemDialog,
  PersonalItemDialog,
  PersonalItemsSection,
  SuggestSignInDialog,
  usePersonalSuggestion,
} from './PersonalItemDialog';
import {
  favoriteId,
  getOrAssignPeriodVerse,
  listLiveFavoriteIds,
  toggleFavorite,
  type FavoriteSource,
  type VerseAssignmentRow,
} from './assignments';
import {
  listHydratedFavorites,
  pickDailyBlessing,
  pickDailyNameOfGod,
  type BlessingRow,
  type HydratedFavoriteItem,
  type NameOfGodRow,
} from './catalog';
import {
  formatArticleForCopy,
  formatVerseForCopy,
  needsRecipientPrompt,
  stripMarkdownForCopy,
} from './copy';
import {
  deletePersonalItem,
  listPersonalItems,
  type PersonalItemRow,
} from './personal-items';

export type LeyaanaTab = 'verses' | 'names' | 'blessings' | 'favorites';

const TABS: readonly { id: LeyaanaTab; label: string }[] = [
  { id: 'verses', label: ar.tabVerses },
  { id: 'names', label: ar.tabNamesOfGod },
  { id: 'blessings', label: ar.tabBlessings },
  { id: 'favorites', label: ar.tabFavorites },
];

const FAVORITE_FILTERS: readonly { id: ContentKind | 'all'; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'verse', label: ar.tabVerses },
  { id: 'name_of_god', label: ar.tabNamesOfGod },
  { id: 'blessing', label: ar.tabBlessings },
];

const KIND_BADGE_LABELS: Record<ContentKind, string> = {
  verse: 'آية',
  name_of_god: 'اسم من أسماء الله',
  blessing: 'بركة',
};

/** Format a weekly (Saturday-to-Friday) or monthly period key in Arabic-Indic digits. */
export function formatPeriodBadge(
  periodType: 'weekly' | 'monthly',
  periodKey: string,
): string {
  if (periodType === 'weekly') {
    const [year, month, day] = periodKey.split('-').map(Number);
    if (!year || !month || !day) {
      return toArabicDigits(periodKey);
    }
    const start = new Date(year, month - 1, day);
    const end = new Date(year, month - 1, day + 6);
    return `${formatArabicDate(start)} – ${formatArabicDate(end)}`;
  }

  const [year, month] = periodKey.split('-').map(Number);
  if (!year || !month) {
    return toArabicDigits(periodKey);
  }
  const monthName = EGYPTIAN_MONTHS[month - 1] ?? '';
  return `${monthName} ${toArabicDigits(year)}`;
}

/** Shared clipboard helper with non-blocking 2-second "اتنسخت" toast state. */
export function useCopiedToast() {
  const [copiedVisible, setCopiedVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const copyTextToClipboard = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    setCopiedVisible(true);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setCopiedVisible(false);
      timerRef.current = null;
    }, 2000);
  }, []);

  return { copiedVisible, copyTextToClipboard };
}

/** Calm non-blocking 2-second bottom pill toast ("اتنسخت"). */
export function CopiedToast({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }
  return (
    <View
      pointerEvents="none"
      className="absolute bottom-6 self-center rounded-full bg-primary px-6 py-3 shadow-md"
    >
      <Text className="text-sm font-bold text-primary-foreground">
        {ar.copiedToast}
      </Text>
    </View>
  );
}

interface LeyaanaSnapshot {
  weeklyVerse: VerseAssignmentRow | null;
  monthlyVerse: VerseAssignmentRow | null;
  dailyName: NameOfGodRow | null;
  dailyBlessing: BlessingRow | null;
  favoriteIds: Set<string>;
  favoritesList: HydratedFavoriteItem[];
  personalVerses: PersonalItemRow[];
  personalNames: PersonalItemRow[];
  personalBlessings: PersonalItemRow[];
}

function loadLeyaanaSnapshot(): LeyaanaSnapshot {
  const now = new Date();
  const seed = readOrCreateVerseSeed(db, deviceClock);
  return {
    weeklyVerse: getOrAssignPeriodVerse(db, deviceClock, 'weekly', now, seed),
    monthlyVerse: getOrAssignPeriodVerse(db, deviceClock, 'monthly', now, seed),
    dailyName: pickDailyNameOfGod(db, now),
    dailyBlessing: pickDailyBlessing(db, now),
    favoriteIds: new Set(listLiveFavoriteIds(db)),
    favoritesList: listHydratedFavorites(db),
    personalVerses: listPersonalItems(db, 'verse'),
    personalNames: listPersonalItems(db, 'name_of_god'),
    personalBlessings: listPersonalItems(db, 'blessing'),
  };
}

interface PeriodVerseCardProps {
  badgeLabel: string;
  assignment: VerseAssignmentRow;
  renderedText: string;
  longPressHint: string;
  isStarred: boolean;
  accentHex: string;
  onToggleFavorite: () => void;
  onCopy: () => void;
}

function PeriodVerseCard({
  badgeLabel,
  assignment,
  renderedText,
  longPressHint,
  isStarred,
  accentHex,
  onToggleFavorite,
  onCopy,
}: PeriodVerseCardProps) {
  const periodRange = formatPeriodBadge(
    assignment.periodType,
    assignment.periodKey,
  );

  return (
    <View className="gap-4 rounded-2xl border border-border bg-card p-6">
      <View className="flex-row flex-wrap items-center justify-between gap-2">
        <Text className="text-start text-sm font-bold text-accent">
          {badgeLabel}
        </Text>
        <Text className="text-start text-sm text-muted-foreground">
          {periodRange}
        </Text>
      </View>

      <Pressable
        onLongPress={onCopy}
        accessibilityRole="button"
        accessibilityLabel={`${badgeLabel} — ${longPressHint}`}
        className="gap-2"
      >
        <Scripture className="text-start">{renderedText}</Scripture>
        <Text className="text-start text-sm text-muted-foreground">
          {assignment.ref}
        </Text>
      </Pressable>

      <View className="flex-row items-center justify-between gap-2 border-t border-border pt-3">
        <Text className="text-start text-sm text-muted-foreground">
          {longPressHint}
        </Text>
        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={onToggleFavorite}
            accessibilityRole="button"
            accessibilityLabel={isStarred ? 'إزالة من المفضلة' : 'أضف للمفضلة'}
            accessibilityState={{ selected: isStarred }}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
          >
            <Icon
              as={Star}
              size={20}
              color={isStarred ? accentHex : undefined}
              fill={isStarred ? accentHex : 'transparent'}
              className={isStarred ? 'text-accent' : 'text-muted-foreground'}
            />
          </Pressable>
          <Pressable
            onPress={onCopy}
            accessibilityRole="button"
            accessibilityLabel="انسخ الآية"
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
          >
            <Icon as={Copy} size={20} className="text-muted-foreground" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

interface DailyArticleCardProps {
  title: string;
  verseRef?: string | null;
  personalizedMarkdown: string;
  longPressHint: string;
  copyLabel: string;
  isStarred: boolean;
  accentHex: string;
  onToggleFavorite: () => void;
  onCopy: () => void;
}

function DailyArticleCard({
  title,
  verseRef,
  personalizedMarkdown,
  longPressHint,
  copyLabel,
  isStarred,
  accentHex,
  onToggleFavorite,
  onCopy,
}: DailyArticleCardProps) {
  return (
    <View className="gap-4 rounded-2xl border border-border bg-card p-6">
      <Pressable
        onLongPress={onCopy}
        accessibilityRole="button"
        accessibilityLabel={`${title} — ${longPressHint}`}
        className="gap-2"
      >
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          className="text-start text-xl font-bold text-foreground"
        >
          {title}
        </Text>
        {verseRef ? (
          <Text className="text-start text-sm font-bold text-accent">
            {verseRef}
          </Text>
        ) : null}
        <MarkdownBody markdown={personalizedMarkdown} />
      </Pressable>

      <View className="flex-row items-center justify-between gap-2 border-t border-border pt-3">
        <Text className="text-start text-sm text-muted-foreground">
          {longPressHint}
        </Text>
        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={onToggleFavorite}
            accessibilityRole="button"
            accessibilityLabel={isStarred ? 'إزالة من المفضلة' : 'أضف للمفضلة'}
            accessibilityState={{ selected: isStarred }}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
          >
            <Icon
              as={Star}
              size={20}
              color={isStarred ? accentHex : undefined}
              fill={isStarred ? accentHex : 'transparent'}
              className={isStarred ? 'text-accent' : 'text-muted-foreground'}
            />
          </Pressable>
          <Pressable
            onPress={onCopy}
            accessibilityRole="button"
            accessibilityLabel={copyLabel}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
          >
            <Icon as={Copy} size={20} className="text-muted-foreground" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/**
 * 4-tab ليا أنا screen (ME-01..ME-07, D-08..D-10, D-13):
 * الآيات (weekly + monthly + السجل) | أسماء الله | البركات | المفضلة
 */
export function LeyaanaScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const contentVersion = useContentVersion();
  const { colorScheme } = useColorScheme();
  const accentHex = colorScheme === 'dark' ? '#C2B26B' : '#8B7B3C';

  const [activeTab, setActiveTab] = useState<LeyaanaTab>('verses');
  const [favFilter, setFavFilter] = useState<ContentKind | 'all'>('all');
  const [refreshTick, setRefreshTick] = useState(0);
  const [copyDialogVerse, setCopyDialogVerse] =
    useState<CopyVerseTarget | null>(null);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemDialogKind, setItemDialogKind] = useState<ContentKind>('verse');
  const [editingPersonalItem, setEditingPersonalItem] =
    useState<PersonalItemRow | null>(null);
  const [deletingPersonalItem, setDeletingPersonalItem] =
    useState<PersonalItemRow | null>(null);
  const { copiedVisible, copyTextToClipboard } = useCopiedToast();
  const suggestion = usePersonalSuggestion(profile.gender);

  const refreshData = useCallback(() => {
    setRefreshTick((tick) => tick + 1);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [refreshData]),
  );

  const snapshot = useMemo(() => {
    void refreshTick;
    void contentVersion;
    return loadLeyaanaSnapshot();
  }, [refreshTick, contentVersion]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.home);
    }
  }, [router]);

  const handleToggleFavorite = useCallback(
    (source: FavoriteSource, kind: ContentKind, itemId: string) => {
      toggleFavorite(db, deviceClock, { source, kind, itemId });
      refreshData();
    },
    [refreshData],
  );

  const handleCopyVerse = useCallback(
    (verse: CopyVerseTarget) => {
      if (needsRecipientPrompt(verse)) {
        setCopyDialogVerse(verse);
        return;
      }
      void copyTextToClipboard(formatVerseForCopy(verse, profile));
    },
    [copyTextToClipboard, profile],
  );

  const handleCopyArticle = useCallback(
    (item: {
      title: string;
      text: string;
      textFemale?: string | null;
      verseRef?: string | null;
    }, plain = false) => {
      void copyTextToClipboard(
        formatArticleForCopy(item, profile, { plain }),
      );
    },
    [copyTextToClipboard, profile],
  );

  const defaultKindForTab: ContentKind =
    activeTab === 'names'
      ? 'name_of_god'
      : activeTab === 'blessings'
        ? 'blessing'
        : 'verse';

  const openCreatePersonalDialog = useCallback((kind: ContentKind) => {
    setEditingPersonalItem(null);
    setItemDialogKind(kind);
    setItemDialogOpen(true);
  }, []);

  const openEditPersonalDialog = useCallback((item: PersonalItemRow) => {
    setEditingPersonalItem(item);
    setItemDialogKind(item.kind);
    setItemDialogOpen(true);
  }, []);

  const handleCopyPersonalItem = useCallback(
    (item: PersonalItemRow) => {
      if (item.kind === 'verse') {
        handleCopyVerse({
          ref: item.title,
          text: item.text,
          textFemale: null,
        });
        return;
      }
      handleCopyArticle(
        {
          title: item.title,
          text: item.text,
          textFemale: null,
          verseRef: item.verseRef,
        },
        true,
      );
    },
    [handleCopyArticle, handleCopyVerse],
  );

  const handleConfirmDeletePersonalItem = useCallback(
    (item: PersonalItemRow) => {
      deletePersonalItem(db, deviceClock, item.id);
      refreshData();
    },
    [refreshData],
  );

  const filteredFavorites = useMemo(() => {
    if (favFilter === 'all') {
      return snapshot.favoritesList;
    }
    return snapshot.favoritesList.filter((item) => item.kind === favFilter);
  }, [favFilter, snapshot.favoritesList]);

  const longPressHint = uiCopy('leyaanaLongPressHint', profile.gender);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between gap-3 px-6 py-4">
        <View className="flex-row items-center gap-2">
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="ارجع للشاشة الرئيسية"
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card"
          >
            <Icon as={ArrowRight} size={20} className="text-foreground" />
          </Pressable>
          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            className="text-start text-xl font-bold text-foreground"
          >
            {ar.leyaanaTitle}
          </Text>
        </View>
        <Pressable
          onPress={() => openCreatePersonalDialog(defaultKindForTab)}
          accessibilityRole="button"
          accessibilityLabel="أضف عنصر شخصي"
          className="min-h-[44px] flex-row items-center gap-1 rounded-xl border border-border bg-card px-3 py-2"
        >
          <Icon as={Plus} size={16} className="text-foreground" />
          <Text className="text-sm font-bold text-foreground">
            {ar.addPersonalItem}
          </Text>
        </Pressable>
      </View>

      <View
        accessibilityRole="tablist"
        className="flex-row border-b border-border bg-card"
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: isActive }}
              className={`min-h-[44px] flex-1 items-center justify-center px-1 ${
                isActive ? 'border-b-2 border-accent' : ''
              }`}
            >
              <Text
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                className={`text-center text-sm ${
                  isActive
                    ? 'font-bold text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-4 px-6 py-6"
      >
        {activeTab === 'verses' ? (
          <View className="gap-4">
            {snapshot.weeklyVerse ? (
              <PeriodVerseCard
                badgeLabel={ar.weeklyVerseBadge}
                assignment={snapshot.weeklyVerse}
                renderedText={personalize(
                  {
                    text: snapshot.weeklyVerse.text,
                    textFemale: snapshot.weeklyVerse.textFemale,
                  },
                  profile,
                )}
                longPressHint={longPressHint}
                isStarred={snapshot.favoriteIds.has(
                  favoriteId('public', 'verse', snapshot.weeklyVerse.verseId),
                )}
                accentHex={accentHex}
                onToggleFavorite={() =>
                  handleToggleFavorite(
                    'public',
                    'verse',
                    snapshot.weeklyVerse!.verseId,
                  )
                }
                onCopy={() =>
                  handleCopyVerse({
                    ref: snapshot.weeklyVerse!.ref,
                    text: snapshot.weeklyVerse!.text,
                    textFemale: snapshot.weeklyVerse!.textFemale,
                  })
                }
              />
            ) : null}

            {snapshot.monthlyVerse ? (
              <PeriodVerseCard
                badgeLabel={ar.monthlyVerseBadge}
                assignment={snapshot.monthlyVerse}
                renderedText={personalize(
                  {
                    text: snapshot.monthlyVerse.text,
                    textFemale: snapshot.monthlyVerse.textFemale,
                  },
                  profile,
                )}
                longPressHint={longPressHint}
                isStarred={snapshot.favoriteIds.has(
                  favoriteId('public', 'verse', snapshot.monthlyVerse.verseId),
                )}
                accentHex={accentHex}
                onToggleFavorite={() =>
                  handleToggleFavorite(
                    'public',
                    'verse',
                    snapshot.monthlyVerse!.verseId,
                  )
                }
                onCopy={() =>
                  handleCopyVerse({
                    ref: snapshot.monthlyVerse!.ref,
                    text: snapshot.monthlyVerse!.text,
                    textFemale: snapshot.monthlyVerse!.textFemale,
                  })
                }
              />
            ) : null}

            <Link href={ROUTES.leyaanaHistory} asChild>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ar.viewHistory}
                className="min-h-[44px] flex-row items-center justify-between rounded-xl border border-border bg-card p-4"
              >
                <View className="flex-row items-center gap-3">
                  <Icon as={History} size={20} className="text-accent" />
                  <Text className="text-start text-base font-bold text-foreground">
                    {ar.viewHistory}
                  </Text>
                </View>
                <Icon
                  as={ArrowLeft}
                  size={18}
                  className="text-muted-foreground"
                />
              </Pressable>
            </Link>

            <PersonalItemsSection
              items={snapshot.personalVerses}
              favoriteIds={snapshot.favoriteIds}
              accentHex={accentHex}
              gender={profile.gender}
              suggestingItemId={suggestion.suggestingItemId}
              suggestFeedback={suggestion.suggestFeedback}
              onAddPress={() => openCreatePersonalDialog('verse')}
              onToggleFavorite={(item) =>
                handleToggleFavorite('personal', item.kind, item.id)
              }
              onCopy={handleCopyPersonalItem}
              onEdit={openEditPersonalDialog}
              onDelete={setDeletingPersonalItem}
              onSuggest={(item) => void suggestion.handleSuggest(item)}
            />
          </View>
        ) : null}

        {activeTab === 'names' ? (
          <View className="gap-4">
            {snapshot.dailyName ? (
              <DailyArticleCard
                title={snapshot.dailyName.title}
                personalizedMarkdown={personalize(
                  {
                    text: snapshot.dailyName.text,
                    textFemale: snapshot.dailyName.textFemale,
                  },
                  profile,
                )}
                longPressHint={longPressHint}
                copyLabel="انسخ الاسم"
                isStarred={snapshot.favoriteIds.has(
                  favoriteId(
                    'public',
                    'name_of_god',
                    snapshot.dailyName.id,
                  ),
                )}
                accentHex={accentHex}
                onToggleFavorite={() =>
                  handleToggleFavorite(
                    'public',
                    'name_of_god',
                    snapshot.dailyName!.id,
                  )
                }
                onCopy={() => handleCopyArticle(snapshot.dailyName!)}
              />
            ) : null}

            <Link
              href={{
                pathname: ROUTES.leyaanaBrowse,
                params: { kind: 'name_of_god' },
              }}
              asChild
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ar.browseAllNames}
                className="min-h-[44px] flex-row items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4"
              >
                <Icon
                  as={BookOpen}
                  size={18}
                  className="text-primary-foreground"
                />
                <Text className="text-sm font-bold text-primary-foreground">
                  {ar.browseAllNames}
                </Text>
              </Pressable>
            </Link>

            <PersonalItemsSection
              items={snapshot.personalNames}
              favoriteIds={snapshot.favoriteIds}
              accentHex={accentHex}
              gender={profile.gender}
              suggestingItemId={suggestion.suggestingItemId}
              suggestFeedback={suggestion.suggestFeedback}
              onAddPress={() => openCreatePersonalDialog('name_of_god')}
              onToggleFavorite={(item) =>
                handleToggleFavorite('personal', item.kind, item.id)
              }
              onCopy={handleCopyPersonalItem}
              onEdit={openEditPersonalDialog}
              onDelete={setDeletingPersonalItem}
              onSuggest={(item) => void suggestion.handleSuggest(item)}
            />
          </View>
        ) : null}

        {activeTab === 'blessings' ? (
          <View className="gap-4">
            {snapshot.dailyBlessing ? (
              <DailyArticleCard
                title={snapshot.dailyBlessing.title}
                verseRef={snapshot.dailyBlessing.verseRef}
                personalizedMarkdown={personalize(
                  {
                    text: snapshot.dailyBlessing.text,
                    textFemale: snapshot.dailyBlessing.textFemale,
                  },
                  profile,
                )}
                longPressHint={longPressHint}
                copyLabel="انسخ البركة"
                isStarred={snapshot.favoriteIds.has(
                  favoriteId(
                    'public',
                    'blessing',
                    snapshot.dailyBlessing.id,
                  ),
                )}
                accentHex={accentHex}
                onToggleFavorite={() =>
                  handleToggleFavorite(
                    'public',
                    'blessing',
                    snapshot.dailyBlessing!.id,
                  )
                }
                onCopy={() => handleCopyArticle(snapshot.dailyBlessing!)}
              />
            ) : null}

            <Link
              href={{
                pathname: ROUTES.leyaanaBrowse,
                params: { kind: 'blessing' },
              }}
              asChild
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={ar.browseAllBlessings}
                className="min-h-[44px] flex-row items-center justify-center gap-2 rounded-xl bg-primary px-6 py-4"
              >
                <Icon
                  as={BookOpen}
                  size={18}
                  className="text-primary-foreground"
                />
                <Text className="text-sm font-bold text-primary-foreground">
                  {ar.browseAllBlessings}
                </Text>
              </Pressable>
            </Link>

            <PersonalItemsSection
              items={snapshot.personalBlessings}
              favoriteIds={snapshot.favoriteIds}
              accentHex={accentHex}
              gender={profile.gender}
              suggestingItemId={suggestion.suggestingItemId}
              suggestFeedback={suggestion.suggestFeedback}
              onAddPress={() => openCreatePersonalDialog('blessing')}
              onToggleFavorite={(item) =>
                handleToggleFavorite('personal', item.kind, item.id)
              }
              onCopy={handleCopyPersonalItem}
              onEdit={openEditPersonalDialog}
              onDelete={setDeletingPersonalItem}
              onSuggest={(item) => void suggestion.handleSuggest(item)}
            />
          </View>
        ) : null}

        {activeTab === 'favorites' ? (
          <View className="gap-4">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="flex-row gap-2"
            >
              {FAVORITE_FILTERS.map((chip) => {
                const isSelected = favFilter === chip.id;
                return (
                  <Pressable
                    key={chip.id}
                    onPress={() => setFavFilter(chip.id)}
                    accessibilityRole="button"
                    accessibilityLabel={chip.label}
                    accessibilityState={{ selected: isSelected }}
                    className={`min-h-[44px] items-center justify-center rounded-xl border px-4 py-2 ${
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-border bg-card'
                    }`}
                  >
                    <Text
                      className={`text-sm font-bold ${
                        isSelected
                          ? 'text-primary-foreground'
                          : 'text-foreground'
                      }`}
                    >
                      {chip.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {filteredFavorites.length === 0 ? (
              <View className="items-center gap-3 rounded-2xl border border-border bg-card p-6">
                <Icon as={Star} size={28} className="text-accent" />
                <Text
                  accessibilityRole="header"
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                  className="text-center text-xl font-bold text-foreground"
                >
                  {ar.emptyFavoritesTitle}
                </Text>
                <Text className="text-center text-base text-muted-foreground">
                  {uiCopy('leyaanaEmptyFavoritesBody', profile.gender)}
                </Text>
              </View>
            ) : (
              <View className="gap-4">
                {filteredFavorites.map((item) => {
                  const personalized = personalize(
                    { text: item.text, textFemale: item.textFemale },
                    profile,
                  );
                  const copyLabel =
                    item.kind === 'verse'
                      ? 'انسخ الآية'
                      : item.kind === 'name_of_god'
                        ? 'انسخ الاسم'
                        : 'انسخ البركة';

                  const onPressCopy = () => {
                    if (item.kind === 'verse') {
                      handleCopyVerse({
                        ref: item.title,
                        text: item.text,
                        textFemale: item.textFemale,
                      });
                    } else {
                      handleCopyArticle(
                        {
                          title: item.title,
                          text: item.text,
                          textFemale: item.textFemale,
                          verseRef: item.verseRef,
                        },
                        item.source === 'personal',
                      );
                    }
                  };

                  return (
                    <View
                      key={item.favoriteId}
                      className="gap-3 rounded-2xl border border-border bg-card p-4"
                    >
                      <Pressable
                        onLongPress={onPressCopy}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.title} — ${longPressHint}`}
                        className="gap-2"
                      >
                        <Text className="text-start text-sm font-bold text-accent">
                          {KIND_BADGE_LABELS[item.kind]}
                        </Text>

                        {item.kind === 'verse' ? (
                          <>
                            <Scripture className="text-start">
                              {personalized}
                            </Scripture>
                            <Text className="text-start text-sm text-muted-foreground">
                              {item.title}
                            </Text>
                          </>
                        ) : (
                          <>
                            <Text
                              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                              className="text-start text-xl font-bold text-foreground"
                            >
                              {item.title}
                            </Text>
                            {item.verseRef ? (
                              <Text className="text-start text-sm font-bold text-accent">
                                {item.verseRef}
                              </Text>
                            ) : null}
                            <Text
                              numberOfLines={3}
                              className="text-start text-base text-foreground"
                            >
                              {item.source === 'personal'
                                ? item.text
                                : stripMarkdownForCopy(personalized)}
                            </Text>
                          </>
                        )}
                      </Pressable>

                      <View className="flex-row items-center justify-end gap-1 border-t border-border pt-2">
                        <Pressable
                          onPress={() =>
                            handleToggleFavorite(
                              item.source,
                              item.kind,
                              item.itemId,
                            )
                          }
                          accessibilityRole="button"
                          accessibilityLabel="إزالة من المفضلة"
                          accessibilityState={{ selected: true }}
                          className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
                        >
                          <Icon
                            as={Star}
                            size={20}
                            color={accentHex}
                            fill={accentHex}
                            className="text-accent"
                          />
                        </Pressable>
                        <Pressable
                          onPress={onPressCopy}
                          accessibilityRole="button"
                          accessibilityLabel={copyLabel}
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
                  );
                })}
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>

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

      <PersonalItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        initialKind={itemDialogKind}
        editingItem={editingPersonalItem}
        gender={profile.gender}
        onSaved={refreshData}
      />

      <DeletePersonalItemDialog
        open={deletingPersonalItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingPersonalItem(null);
          }
        }}
        item={deletingPersonalItem}
        gender={profile.gender}
        onConfirmDelete={handleConfirmDeletePersonalItem}
      />

      <SuggestSignInDialog
        open={suggestion.signInDialogItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            suggestion.setSignInDialogItem(null);
            suggestion.setSignInError(null);
          }
        }}
        submitting={suggestion.signInSubmitting}
        errorMessage={suggestion.signInError}
        onConfirmSignInAndSubmit={() =>
          void suggestion.handleConfirmSignInAndSubmit()
        }
      />

      <CopiedToast visible={copiedVisible} />
    </SafeAreaView>
  );
}
