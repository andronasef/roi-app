import { localDateKey, toArabicDigits } from '@roi/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowRight, Plus } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../components/ui/icon';
import { Text } from '../../components/ui/text';
import { MAX_FONT_SIZE_MULTIPLIER } from '../../constants/theme';
import { db, deviceClock } from '../db/client';
import { sortPrayers, type PrayerWithStats } from './models';
import {
  createPrayer,
  getDefaultIntercessionSort,
  listPrayersWithStats,
  logPrayerWithNote,
} from './repository';

/**
 * Initial tracer shell for تشفع (Intercession) proving the end-to-end
 * Home -> /intercession -> SQLite prayers + prayer_events -> live prayedCount loop.
 */
export function IntercessionScreen() {
  const router = useRouter();
  const [prayers, setPrayers] = useState<PrayerWithStats[]>(() =>
    listPrayersWithStats(db),
  );
  const [draftBody, setDraftBody] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const reload = useCallback(() => {
    setPrayers(listPrayersWithStats(db));
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const todayKey = localDateKey(new Date(deviceClock.now()));
  const defaultSort = getDefaultIntercessionSort(db);
  const activePrayers = sortPrayers(
    prayers.filter((p) => p.answeredAt === null),
    defaultSort,
    todayKey,
  );

  const handleQuickCreate = useCallback(() => {
    const trimmed = draftBody.trim();
    if (!trimmed) {
      return;
    }
    createPrayer(db, deviceClock, { body: trimmed });
    setDraftBody('');
    setShowQuickAdd(false);
    reload();
  }, [draftBody, reload]);

  const handlePrayed = useCallback(
    (prayerId: string) => {
      logPrayerWithNote(db, deviceClock, prayerId, null);
      reload();
    },
    [reload],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between border-b border-border px-6 py-4">
        <View className="flex-row items-center gap-2">
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

        <Pressable
          onPress={() => setShowQuickAdd((prev) => !prev)}
          accessibilityRole="button"
          accessibilityLabel="أضف صلاة"
          className="min-h-[44px] flex-row items-center gap-1 rounded-xl bg-primary px-4 py-2"
        >
          <Icon as={Plus} size={18} className="text-primary-foreground" />
          <Text className="text-sm font-bold text-primary-foreground">
            أضف صلاة
          </Text>
        </Pressable>
      </View>

      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-4 px-6 py-6 pb-16"
      >
        {showQuickAdd ? (
          <View className="gap-3 rounded-2xl border border-border bg-card p-4">
            <TextInput
              value={draftBody}
              onChangeText={setDraftBody}
              placeholder="اكتب الصلاة هنا..."
              multiline
              accessibilityLabel="نص الصلاة"
              className="min-h-[88px] rounded-xl border border-input bg-background p-4 text-start text-base text-foreground"
            />
            <Pressable
              onPress={handleQuickCreate}
              accessibilityRole="button"
              accessibilityLabel="احفظ الصلاة"
              className="min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 py-3"
            >
              <Text className="text-sm font-bold text-primary-foreground">
                احفظ الصلاة
              </Text>
            </Pressable>
          </View>
        ) : null}

        {activePrayers.map((prayer) => (
          <View
            key={prayer.id}
            className="gap-4 rounded-2xl border border-border bg-card p-4"
          >
            <Text className="text-start text-base text-foreground">
              {prayer.body}
            </Text>
            <View className="flex-row items-center justify-between gap-2">
              <Text className="text-start text-sm text-muted-foreground">
                اتصلت {toArabicDigits(prayer.prayedCount)} مرة
              </Text>
              <Pressable
                onPress={() => handlePrayed(prayer.id)}
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
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
