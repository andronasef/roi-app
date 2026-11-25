import {
  formatArabicDate,
  localDateKey,
  toArabicDigits,
} from '@roi/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ArrowRight,
  ArrowUpDown,
  CheckCircle2,
  MoreVertical,
  Pin,
  Plus,
  Search,
  Settings,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../components/ui/icon';
import { Text } from '../../components/ui/text';
import { ROUTES } from '../../constants/app';
import { MAX_FONT_SIZE_MULTIPLIER } from '../../constants/theme';
import { db, deviceClock } from '../db/client';
import { useProfile } from '../profile/context';
import { uiCopy } from '../profile/ui-copy';
import {
  DeletePrayerDialog,
  IntercessionSettingsDialog,
  MarkAnsweredDialog,
  PrayerFormDialog,
  PrayerMenuDialog,
  PrayerSortDialog,
  PrayNoteDialog,
  type PrayerFormValues,
} from './IntercessionDialogs';
import {
  countedPrayers,
  DEFAULT_PERSON_LABEL,
  filterPrayers,
  groupPrayersByPerson,
  sortPrayers,
  type PrayerSort,
  type PrayerWithStats,
} from './models';
import {
  createPrayer,
  deletePrayer,
  getDefaultIntercessionSort,
  listPrayersWithStats,
  logPrayerWithNote,
  markPrayerAnswered,
  setDefaultIntercessionSort,
  togglePinPrayer,
  updatePrayer,
} from './repository';

type IntercessionTab = 'prayers' | 'people';

function formatSinceDate(sinceLocalDate: string | null, createdAt: number): string {
  if (sinceLocalDate) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(sinceLocalDate);
    if (match) {
      return formatArabicDate(
        new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
      );
    }
  }
  return formatArabicDate(new Date(createdAt));
}

/**
 * Full 2-tab تشفع (Intercession) screen (INT-01..INT-06, D-01..D-06).
 */
export function IntercessionScreen() {
  const router = useRouter();
  const { profile } = useProfile();

  const [prayers, setPrayers] = useState<PrayerWithStats[]>(() =>
    listPrayersWithStats(db),
  );
  const [defaultSort, setDefaultSort] = useState<PrayerSort>(() =>
    getDefaultIntercessionSort(db),
  );
  const [activeSort, setActiveSort] = useState<PrayerSort>(() =>
    getDefaultIntercessionSort(db),
  );
  const [activeTab, setActiveTab] = useState<IntercessionTab>('prayers');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingPrayer, setEditingPrayer] = useState<PrayerWithStats | null>(
    null,
  );
  const [prayNoteTarget, setPrayNoteTarget] =
    useState<PrayerWithStats | null>(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuTarget, setMenuTarget] = useState<PrayerWithStats | null>(null);
  const [answerTarget, setAnswerTarget] = useState<PrayerWithStats | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<PrayerWithStats | null>(
    null,
  );

  const reload = useCallback(() => {
    setPrayers(listPrayersWithStats(db));
    const persistedDefault = getDefaultIntercessionSort(db);
    setDefaultSort(persistedDefault);
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const todayKey = localDateKey(new Date(deviceClock.now()));

  const activePrayers = useMemo(
    () => prayers.filter((prayer) => prayer.answeredAt === null),
    [prayers],
  );
  const answeredCount = useMemo(
    () => prayers.filter((prayer) => prayer.answeredAt !== null).length,
    [prayers],
  );

  const counted = useMemo(
    () => countedPrayers(activePrayers),
    [activePrayers],
  );
  const remainingToday = useMemo(
    () =>
      counted.filter((prayer) => prayer.lastPrayedLocalDate !== todayKey)
        .length,
    [counted, todayKey],
  );

  const displayedPrayers = useMemo(() => {
    const filtered = searchOpen
      ? filterPrayers(activePrayers, searchQuery)
      : activePrayers;
    return sortPrayers(filtered, activeSort, todayKey);
  }, [activePrayers, activeSort, searchOpen, searchQuery, todayKey]);

  const peopleGroups = useMemo(() => {
    const base = searchOpen ? filterPrayers(prayers, searchQuery) : prayers;
    return groupPrayersByPerson(base).filter((group) => group.activeCount > 0);
  }, [prayers, searchOpen, searchQuery]);

  const handleOpenCreate = useCallback(() => {
    setEditingPrayer(null);
    setFormOpen(true);
  }, []);

  const handleSaveForm = useCallback(
    (values: PrayerFormValues) => {
      if (editingPrayer) {
        updatePrayer(db, deviceClock, {
          id: editingPrayer.id,
          body: values.body,
          personName: values.personName,
          sinceLocalDate: values.sinceLocalDate,
        });
      } else {
        createPrayer(db, deviceClock, {
          body: values.body,
          personName: values.personName,
          sinceLocalDate: values.sinceLocalDate,
        });
      }
      reload();
    },
    [editingPrayer, reload],
  );

  const handleConfirmPrayNote = useCallback(
    (note: string | null) => {
      if (!prayNoteTarget) {
        return;
      }
      logPrayerWithNote(db, deviceClock, prayNoteTarget.id, note);
      setPrayNoteTarget(null);
      reload();
    },
    [prayNoteTarget, reload],
  );

  const handleTogglePin = useCallback(
    (prayer: PrayerWithStats) => {
      togglePinPrayer(db, deviceClock, prayer.id);
      reload();
    },
    [reload],
  );

  const handleConfirmAnswered = useCallback(
    (outcome: string | null) => {
      if (!answerTarget) {
        return;
      }
      markPrayerAnswered(db, deviceClock, answerTarget.id, outcome);
      setAnswerTarget(null);
      reload();
    },
    [answerTarget, reload],
  );

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) {
      return;
    }
    deletePrayer(db, deviceClock, deleteTarget.id);
    setDeleteTarget(null);
    reload();
  }, [deleteTarget, reload]);

  const handleChangeDefaultSort = useCallback((nextSort: PrayerSort) => {
    const saved = setDefaultIntercessionSort(db, deviceClock, nextSort);
    setDefaultSort(saved);
    setActiveSort(saved);
  }, []);

  const handleToggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (prev) {
        setSearchQuery('');
      }
      return !prev;
    });
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      {/* Top Header Bar */}
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="ارجع للشاشة الرئيسية"
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
          >
            <Icon as={ArrowRight} size={22} className="text-foreground" />
          </Pressable>
          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            className="text-start text-xl font-bold text-foreground"
          >
            تشفع
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={handleToggleSearch}
            accessibilityRole="button"
            accessibilityLabel="ابحث في الصلوات"
            accessibilityState={{ expanded: searchOpen }}
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
          >
            <Icon
              as={Search}
              size={20}
              className={searchOpen ? 'text-accent' : 'text-foreground'}
            />
          </Pressable>

          <Pressable
            onPress={() => setSortOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="ترتيب الصلوات"
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
          >
            <Icon as={ArrowUpDown} size={20} className="text-foreground" />
          </Pressable>

          <Pressable
            onPress={() => router.push(ROUTES.intercessionAnswered)}
            accessibilityRole="button"
            accessibilityLabel="الصلوات المستجابة"
            className="min-h-[44px] min-w-[44px] flex-row items-center justify-center gap-1 rounded-xl px-2"
          >
            <Icon as={CheckCircle2} size={20} className="text-accent" />
            {answeredCount > 0 ? (
              <Text className="text-sm font-bold text-accent">
                {toArabicDigits(answeredCount)}
              </Text>
            ) : null}
          </Pressable>

          <Pressable
            onPress={() => setSettingsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="إعدادات تشفع"
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
          >
            <Icon as={Settings} size={20} className="text-foreground" />
          </Pressable>
        </View>
      </View>

      {/* 2-Tab Bar */}
      <View className="flex-row border-b border-border bg-card">
        <Pressable
          onPress={() => setActiveTab('prayers')}
          accessibilityRole="tab"
          accessibilityLabel="الصلوات"
          accessibilityState={{ selected: activeTab === 'prayers' }}
          className={`min-h-[44px] flex-1 items-center justify-center ${
            activeTab === 'prayers' ? 'border-b-2 border-accent' : ''
          }`}
        >
          <Text
            className={`text-sm ${
              activeTab === 'prayers'
                ? 'font-bold text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            الصلوات
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('people')}
          accessibilityRole="tab"
          accessibilityLabel="الأشخاص"
          accessibilityState={{ selected: activeTab === 'people' }}
          className={`min-h-[44px] flex-1 items-center justify-center ${
            activeTab === 'people' ? 'border-b-2 border-accent' : ''
          }`}
        >
          <Text
            className={`text-sm ${
              activeTab === 'people'
                ? 'font-bold text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            الأشخاص
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-4 px-6 py-4 pb-16"
      >
        {/* Collapsible Search Bar */}
        {searchOpen ? (
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="ابحث في الصلوات أو الأسماء..."
            accessibilityLabel="ابحث في الصلوات أو الأسماء"
            className="min-h-[44px] rounded-xl border border-input bg-card px-4 text-start text-base text-foreground"
          />
        ) : null}

        {/* Primary CTA */}
        <Pressable
          onPress={handleOpenCreate}
          accessibilityRole="button"
          accessibilityLabel="أضف صلاة"
          className="min-h-[44px] flex-row items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3"
        >
          <Icon as={Plus} size={18} className="text-primary-foreground" />
          <Text className="text-sm font-bold text-primary-foreground">
            أضف صلاة
          </Text>
        </Pressable>

        {activeTab === 'prayers' ? (
          <>
            {/* Daily Progress Header */}
            {counted.length > 0 ? (
              <View className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-4">
                <Text className="text-start text-sm font-bold text-foreground">
                  صلوات النهاردة
                </Text>
                {remainingToday === 0 ? (
                  <Text className="text-start text-sm font-bold text-accent">
                    خلصت كل صلوات النهاردة ✓
                  </Text>
                ) : (
                  <Text className="text-start text-sm font-bold text-foreground">
                    فاضل {toArabicDigits(remainingToday)} من{' '}
                    {toArabicDigits(counted.length)}
                  </Text>
                )}
              </View>
            ) : null}

            {/* Active Prayers List or Empty States */}
            {activePrayers.length === 0 ? (
              <View className="items-center gap-2 rounded-2xl border border-border bg-card p-6 py-8">
                <Text
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                  className="text-center text-xl font-bold text-foreground"
                >
                  مفيش صلوات متسجلة لسه
                </Text>
                <Text className="text-center text-base text-muted-foreground">
                  {uiCopy('intercessionEmptyBody', profile.gender)}
                </Text>
              </View>
            ) : displayedPrayers.length === 0 ? (
              <View className="items-center gap-2 rounded-2xl border border-border bg-card p-6 py-8">
                <Text
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                  className="text-center text-xl font-bold text-foreground"
                >
                  مفيش نتائج مطابقة
                </Text>
                <Text className="text-center text-base text-muted-foreground">
                  {uiCopy('intercessionSearchEmptyBody', profile.gender)}
                </Text>
              </View>
            ) : (
              displayedPrayers.map((prayer) => {
                const isPinned = prayer.pinnedAt !== null;
                const isPrayedToday = prayer.lastPrayedLocalDate === todayKey;
                const personLabel =
                  prayer.personName?.trim() || DEFAULT_PERSON_LABEL;
                const sinceFormatted = formatSinceDate(
                  prayer.sinceLocalDate,
                  prayer.createdAt,
                );

                return (
                  <View
                    key={prayer.id}
                    className="gap-4 rounded-2xl border border-border bg-card p-4"
                  >
                    <View className="flex-row items-center justify-between gap-2">
                      <View className="flex-1 flex-row flex-wrap items-center gap-2">
                        <View className="rounded-lg bg-muted px-2 py-1">
                          <Text className="text-sm font-bold text-foreground">
                            {personLabel}
                          </Text>
                        </View>
                        {isPinned ? (
                          <Icon as={Pin} size={16} className="text-accent" />
                        ) : null}
                        {isPrayedToday ? (
                          <View className="rounded-lg bg-muted px-2 py-1">
                            <Text className="text-sm text-muted-foreground">
                              اتصلى النهاردة ✓
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <Pressable
                        onPress={() => setMenuTarget(prayer)}
                        accessibilityRole="button"
                        accessibilityLabel="خيارات الصلاة"
                        className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
                      >
                        <Icon
                          as={MoreVertical}
                          size={18}
                          className="text-muted-foreground"
                        />
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={() =>
                        router.push({
                          pathname: ROUTES.intercessionPrayer,
                          params: { id: prayer.id },
                        })
                      }
                      accessibilityRole="button"
                      accessibilityLabel="تفاصيل الصلاة"
                      className="min-h-[44px] justify-center"
                    >
                      <Text className="text-start text-base text-foreground">
                        {prayer.body}
                      </Text>
                    </Pressable>

                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="flex-1 text-start text-sm text-muted-foreground">
                        من {sinceFormatted} • اتصلت{' '}
                        {toArabicDigits(prayer.prayedCount)} مرة
                      </Text>
                      <Pressable
                        onPress={() => setPrayNoteTarget(prayer)}
                        accessibilityRole="button"
                        accessibilityLabel="صليت"
                        className="min-h-[44px] items-center justify-center rounded-xl bg-primary px-4 py-2"
                      >
                        <Text className="text-sm font-bold text-primary-foreground">
                          صليت
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : peopleGroups.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-border bg-card p-6 py-8">
            <Text
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="text-center text-xl font-bold text-foreground"
            >
              {searchOpen && searchQuery.trim()
                ? 'مفيش نتائج مطابقة'
                : 'مفيش أشخاص لسه'}
            </Text>
            <Text className="text-center text-base text-muted-foreground">
              {searchOpen && searchQuery.trim()
                ? uiCopy('intercessionSearchEmptyBody', profile.gender)
                : 'لما تضيف صلاة وتكتب اسم الشخص، هتلاقيهم متجمعين هنا بالترتيب'}
            </Text>
          </View>
        ) : (
          peopleGroups.map((group) => (
            <Pressable
              key={group.personName}
              onPress={() =>
                router.push({
                  pathname: ROUTES.intercessionPerson,
                  params: { name: group.personName },
                })
              }
              accessibilityRole="button"
              accessibilityLabel={`${group.personName} — ${toArabicDigits(group.activeCount)} صلوات`}
              className="min-h-[44px] flex-row items-center justify-between rounded-2xl border border-border bg-card p-4"
            >
              <Text className="text-start text-base font-bold text-foreground">
                {group.personName}
              </Text>
              <View className="rounded-lg bg-muted px-3 py-1">
                <Text className="text-sm font-bold text-foreground">
                  {toArabicDigits(group.activeCount)}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <PrayerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingPrayer={editingPrayer}
        todayKey={todayKey}
        onSave={handleSaveForm}
      />

      <PrayNoteDialog
        open={prayNoteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPrayNoteTarget(null);
          }
        }}
        onConfirm={handleConfirmPrayNote}
      />

      <PrayerSortDialog
        open={sortOpen}
        onOpenChange={setSortOpen}
        selectedSort={activeSort}
        onSelectSort={setActiveSort}
      />

      <IntercessionSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        defaultSort={defaultSort}
        onChangeDefaultSort={handleChangeDefaultSort}
      />

      <PrayerMenuDialog
        open={menuTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMenuTarget(null);
          }
        }}
        prayer={menuTarget}
        onTogglePin={handleTogglePin}
        onEdit={(prayer) => {
          setEditingPrayer(prayer);
          setFormOpen(true);
        }}
        onMarkAnswered={(prayer) => setAnswerTarget(prayer)}
        onDelete={(prayer) => setDeleteTarget(prayer)}
      />

      <MarkAnsweredDialog
        open={answerTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAnswerTarget(null);
          }
        }}
        onConfirm={handleConfirmAnswered}
      />

      <DeletePrayerDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        gender={profile.gender}
        onConfirm={handleConfirmDelete}
      />
    </SafeAreaView>
  );
}
