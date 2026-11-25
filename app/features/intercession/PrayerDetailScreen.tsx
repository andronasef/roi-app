import { formatArabicDate, localDateKey, toArabicDigits } from '@roi/shared';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowRight, MoreVertical } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../components/ui/icon';
import { Text } from '../../components/ui/text';
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
  type PrayerEventRow,
  type PrayerWithStats,
} from './models';
import {
  deletePrayer,
  listPrayerEvents,
  listPrayersWithStats,
  logPrayerWithNote,
  markPrayerAnswered,
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

function formatEventStamp(prayedAt: number): string {
  const date = new Date(prayedAt);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${formatArabicDate(date)} • ${toArabicDigits(`${hh}:${mm}`)}`;
}

/**
 * Single prayer detail with its chronological prayer_events timeline (INT-01, INT-02).
 */
export function PrayerDetailScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [prayer, setPrayer] = useState<PrayerWithStats | null>(null);
  const [events, setEvents] = useState<PrayerEventRow[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [prayOpen, setPrayOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [answerOpen, setAnswerOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const reload = useCallback(() => {
    if (!id) {
      setPrayer(null);
      setEvents([]);
      return;
    }
    setPrayer(listPrayersWithStats(db).find((row) => row.id === id) ?? null);
    setEvents(listPrayerEvents(db, id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const todayKey = localDateKey(new Date(deviceClock.now()));

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <View className="flex-row items-center gap-1">
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
            className="text-start text-xl font-bold text-foreground"
          >
            تفاصيل الصلاة
          </Text>
        </View>
        {prayer ? (
          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="خيارات الصلاة"
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
          >
            <Icon as={MoreVertical} size={20} className="text-foreground" />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-4 px-6 py-4 pb-16"
      >
        {prayer === null ? (
          <View className="items-center gap-2 rounded-2xl border border-border bg-card p-6 py-8">
            <Text
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="text-center text-xl font-bold text-foreground"
            >
              الصلاة دي مش موجودة
            </Text>
          </View>
        ) : (
          <>
            <View className="gap-4 rounded-2xl border border-border bg-card p-6">
              <View className="flex-row flex-wrap items-center gap-2">
                <View className="rounded-lg bg-muted px-2 py-1">
                  <Text className="text-sm font-bold text-foreground">
                    {prayer.personName?.trim() || DEFAULT_PERSON_LABEL}
                  </Text>
                </View>
                {prayer.answeredAt !== null ? (
                  <Text className="text-sm font-bold text-accent">
                    اتستجابت
                  </Text>
                ) : null}
              </View>
              <Text className="text-start text-base text-foreground">
                {prayer.body}
              </Text>
              <Text className="text-start text-sm text-muted-foreground">
                من {formatDateKey(prayer.sinceLocalDate, prayer.createdAt)} •
                اتصلت {toArabicDigits(prayer.prayedCount)} مرة
              </Text>
              {prayer.answeredAt === null ? (
                <Pressable
                  onPress={() => setPrayOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="صليت"
                  className="min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 py-2"
                >
                  <Text className="text-sm font-bold text-primary-foreground">
                    صليت
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {events.map((event) => (
              <View
                key={event.id}
                className="gap-2 rounded-2xl border border-border bg-card p-4"
              >
                <Text className="text-start text-sm font-bold text-foreground">
                  {formatEventStamp(event.prayedAt)}
                </Text>
                {event.note ? (
                  <Text className="text-start text-sm text-muted-foreground">
                    {event.note}
                  </Text>
                ) : null}
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <PrayNoteDialog
        open={prayOpen}
        onOpenChange={setPrayOpen}
        onConfirm={(note) => {
          if (prayer) {
            logPrayerWithNote(db, deviceClock, prayer.id, note);
            reload();
          }
        }}
      />

      <PrayerMenuDialog
        open={menuOpen}
        onOpenChange={setMenuOpen}
        prayer={prayer}
        onTogglePin={(target) => {
          togglePinPrayer(db, deviceClock, target.id);
          reload();
        }}
        onEdit={() => setEditOpen(true)}
        onMarkAnswered={() => setAnswerOpen(true)}
        onDelete={() => setDeleteOpen(true)}
      />

      <PrayerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editingPrayer={prayer}
        todayKey={todayKey}
        onSave={(values: PrayerFormValues) => {
          if (prayer) {
            updatePrayer(db, deviceClock, { id: prayer.id, ...values });
            reload();
          }
        }}
      />

      <MarkAnsweredDialog
        open={answerOpen}
        onOpenChange={setAnswerOpen}
        onConfirm={(outcome) => {
          if (prayer) {
            markPrayerAnswered(db, deviceClock, prayer.id, outcome);
            reload();
          }
        }}
      />

      <DeletePrayerDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        gender={profile.gender}
        onConfirm={() => {
          if (prayer) {
            deletePrayer(db, deviceClock, prayer.id);
            router.back();
          }
        }}
      />
    </SafeAreaView>
  );
}
