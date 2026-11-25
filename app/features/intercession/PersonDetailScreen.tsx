import { formatArabicDate, localDateKey, toArabicDigits } from '@roi/shared';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Pin,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../components/ui/icon';
import { Text } from '../../components/ui/text';
import { ROUTES } from '../../constants/app';
import { MAX_FONT_SIZE_MULTIPLIER } from '../../constants/theme';
import { db, deviceClock } from '../db/client';
import { useProfile } from '../profile/context';
import {
  DeletePrayerDialog,
  MarkAnsweredDialog,
  PrayerFormDialog,
  PrayerMenuDialog,
  PrayNoteDialog,
  type PrayerFormValues,
} from './IntercessionDialogs';
import {
  DEFAULT_PERSON_LABEL,
  normalizePersonKey,
  type PrayerWithStats,
} from './models';
import {
  deletePrayer,
  listPrayersWithStats,
  logBatchPrayed,
  logPrayerWithNote,
  markPrayerAnswered,
  reopenPrayer,
  togglePinPrayer,
  updatePrayer,
} from './repository';

function formatDateKey(dateKey: string | null, fallbackMs: number): string {
  const match = dateKey ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey) : null;
  return formatArabicDate(
    match
      ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      : new Date(fallbackMs),
  );
}

/**
 * Person-grouped prayer detail with صليت لكلهم and collapsible المكتمل (INT-03, INT-06).
 */
export function PersonDetailScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { name } = useLocalSearchParams<{ name?: string }>();
  const personName = name?.trim() || DEFAULT_PERSON_LABEL;
  const personKey = normalizePersonKey(personName);

  const [prayers, setPrayers] = useState<PrayerWithStats[]>([]);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [batchOpen, setBatchOpen] = useState(false);
  const [prayNoteTarget, setPrayNoteTarget] =
    useState<PrayerWithStats | null>(null);
  const [menuTarget, setMenuTarget] = useState<PrayerWithStats | null>(null);
  const [editTarget, setEditTarget] = useState<PrayerWithStats | null>(null);
  const [answerTarget, setAnswerTarget] = useState<PrayerWithStats | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<PrayerWithStats | null>(
    null,
  );

  const reload = useCallback(() => {
    setPrayers(
      listPrayersWithStats(db).filter(
        (prayer) => normalizePersonKey(prayer.personName) === personKey,
      ),
    );
  }, [personKey]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const todayKey = localDateKey(new Date(deviceClock.now()));
  const active = useMemo(
    () =>
      prayers
        .filter((prayer) => prayer.answeredAt === null)
        .sort((a, b) => a.createdAt - b.createdAt),
    [prayers],
  );
  const answered = useMemo(
    () =>
      prayers
        .filter((prayer) => prayer.answeredAt !== null)
        .sort((a, b) => (b.answeredAt ?? 0) - (a.answeredAt ?? 0)),
    [prayers],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between gap-2 border-b border-border px-4 py-3">
        <View className="flex-1 flex-row items-center gap-1">
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="ارجع"
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
          >
            <Icon as={ArrowRight} size={22} className="text-foreground" />
          </Pressable>
          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            numberOfLines={1}
            className="flex-1 text-start text-xl font-bold text-foreground"
          >
            {personName}
          </Text>
        </View>
        {active.length > 0 ? (
          <Pressable
            onPress={() => setBatchOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="صليت لكلهم"
            className="min-h-[44px] items-center justify-center rounded-xl bg-primary px-4 py-2"
          >
            <Text className="text-sm font-bold text-primary-foreground">
              صليت لكلهم
            </Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-4 px-6 py-4 pb-16"
      >
        {active.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-border bg-card p-6 py-8">
            <Text
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="text-center text-xl font-bold text-foreground"
            >
              مفيش صلوات نشطة
            </Text>
          </View>
        ) : (
          active.map((prayer) => (
            <View
              key={prayer.id}
              className="gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-1 flex-row items-center gap-2">
                  {prayer.pinnedAt !== null ? (
                    <Icon as={Pin} size={16} className="text-accent" />
                  ) : null}
                  {prayer.lastPrayedLocalDate === todayKey ? (
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
                  من {formatDateKey(prayer.sinceLocalDate, prayer.createdAt)} •
                  اتصلت {toArabicDigits(prayer.prayedCount)} مرة
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
          ))
        )}

        {answered.length > 0 ? (
          <View className="gap-4">
            <Pressable
              onPress={() => setCompletedOpen((prev) => !prev)}
              accessibilityRole="button"
              accessibilityState={{ expanded: completedOpen }}
              accessibilityLabel={`المكتمل (${toArabicDigits(answered.length)})`}
              className="min-h-[44px] flex-row items-center justify-between rounded-2xl border border-border bg-card px-4"
            >
              <Text className="text-start text-base font-bold text-foreground">
                المكتمل ({toArabicDigits(answered.length)})
              </Text>
              <Icon
                as={completedOpen ? ChevronUp : ChevronDown}
                size={20}
                className="text-muted-foreground"
              />
            </Pressable>

            {completedOpen
              ? answered.map((prayer) => (
                  <View
                    key={prayer.id}
                    className="gap-4 rounded-2xl border border-border bg-card p-4"
                  >
                    <Text className="text-start text-base text-foreground">
                      {prayer.body}
                    </Text>
                    {prayer.outcome ? (
                      <View className="rounded-xl bg-muted/50 p-4">
                        <Text className="text-start text-sm text-foreground">
                          {prayer.outcome}
                        </Text>
                      </View>
                    ) : null}
                    <Pressable
                      onPress={() => {
                        reopenPrayer(db, deviceClock, prayer.id);
                        reload();
                      }}
                      accessibilityRole="button"
                      accessibilityLabel="رجّعها"
                      className="min-h-[44px] items-center justify-center rounded-xl border border-border px-4 py-2"
                    >
                      <Text className="text-sm font-bold text-foreground">
                        رجّعها
                      </Text>
                    </Pressable>
                  </View>
                ))
              : null}
          </View>
        ) : null}
      </ScrollView>

      <PrayNoteDialog
        open={batchOpen}
        onOpenChange={setBatchOpen}
        title="صليت لكلهم"
        onConfirm={(note) => {
          logBatchPrayed(
            db,
            deviceClock,
            active.map((prayer) => prayer.id),
            note,
          );
          reload();
        }}
      />

      <PrayNoteDialog
        open={prayNoteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPrayNoteTarget(null);
          }
        }}
        onConfirm={(note) => {
          if (prayNoteTarget) {
            logPrayerWithNote(db, deviceClock, prayNoteTarget.id, note);
            setPrayNoteTarget(null);
            reload();
          }
        }}
      />

      <PrayerMenuDialog
        open={menuTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMenuTarget(null);
          }
        }}
        prayer={menuTarget}
        onTogglePin={(prayer) => {
          togglePinPrayer(db, deviceClock, prayer.id);
          reload();
        }}
        onEdit={setEditTarget}
        onMarkAnswered={setAnswerTarget}
        onDelete={setDeleteTarget}
      />

      <PrayerFormDialog
        open={editTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
          }
        }}
        editingPrayer={editTarget}
        todayKey={todayKey}
        onSave={(values: PrayerFormValues) => {
          if (editTarget) {
            updatePrayer(db, deviceClock, { id: editTarget.id, ...values });
            reload();
          }
        }}
      />

      <MarkAnsweredDialog
        open={answerTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAnswerTarget(null);
          }
        }}
        onConfirm={(outcome) => {
          if (answerTarget) {
            markPrayerAnswered(db, deviceClock, answerTarget.id, outcome);
            setAnswerTarget(null);
            reload();
          }
        }}
      />

      <DeletePrayerDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        gender={profile.gender}
        onConfirm={() => {
          if (deleteTarget) {
            deletePrayer(db, deviceClock, deleteTarget.id);
            setDeleteTarget(null);
            reload();
          }
        }}
      />
    </SafeAreaView>
  );
}
