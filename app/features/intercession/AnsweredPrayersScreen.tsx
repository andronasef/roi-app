import { formatArabicDate, toArabicDigits } from '@roi/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowRight, NotebookPen } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../components/ui/icon';
import { Text } from '../../components/ui/text';
import { ROUTES } from '../../constants/app';
import { MAX_FONT_SIZE_MULTIPLIER } from '../../constants/theme';
import { db, deviceClock } from '../db/client';
import { formatAnsweredPrefill } from '../gratitude/models';
import { useProfile } from '../profile/context';
import { uiCopy } from '../profile/ui-copy';
import { DEFAULT_PERSON_LABEL, type PrayerWithStats } from './models';
import { listPrayersWithStats, reopenPrayer } from './repository';

function listAnswered(): PrayerWithStats[] {
  return listPrayersWithStats(db)
    .filter((prayer) => prayer.answeredAt !== null)
    .sort((a, b) => (b.answeredAt ?? 0) - (a.answeredAt ?? 0));
}

/**
 * Answered prayers archive with رجّعها and one-tap gratitude link (INT-06, INT-07, D-06, D-07).
 */
export function AnsweredPrayersScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const [answered, setAnswered] = useState<PrayerWithStats[]>(listAnswered);

  const reload = useCallback(() => setAnswered(listAnswered()), []);

  useFocusEffect(reload);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center border-b border-border px-4 py-3">
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
          الصلوات المستجابة ({toArabicDigits(answered.length)})
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="gap-4 px-6 py-4 pb-16"
      >
        {answered.length === 0 ? (
          <View className="items-center gap-2 rounded-2xl border border-border bg-card p-6 py-8">
            <Text
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="text-center text-xl font-bold text-foreground"
            >
              مفيش صلوات مستجابة لسه
            </Text>
            <Text className="text-center text-base text-muted-foreground">
              {uiCopy('answeredEmptyBody', profile.gender)}
            </Text>
          </View>
        ) : (
          answered.map((prayer) => (
            <View
              key={prayer.id}
              className="gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <View className="flex-row flex-wrap items-center gap-2">
                <View className="rounded-lg bg-muted px-2 py-1">
                  <Text className="text-sm font-bold text-foreground">
                    {prayer.personName?.trim() || DEFAULT_PERSON_LABEL}
                  </Text>
                </View>
                <Text className="text-sm font-bold text-accent">اتستجابت</Text>
              </View>

              <Text className="text-start text-base text-foreground">
                {prayer.body}
              </Text>

              <Text className="text-start text-sm text-muted-foreground">
                {formatArabicDate(new Date(prayer.answeredAt ?? prayer.updatedAt))}{' '}
                • اتصلت {toArabicDigits(prayer.prayedCount)} مرة
              </Text>

              {prayer.outcome ? (
                <View className="rounded-xl border-s-2 border-accent bg-muted/50 p-4">
                  <Text className="text-start text-sm text-foreground">
                    {prayer.outcome}
                  </Text>
                </View>
              ) : null}

              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: ROUTES.gratitude,
                      params: {
                        prefill: formatAnsweredPrefill(
                          prayer.body,
                          prayer.personName,
                          prayer.outcome,
                        ),
                      },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel="اكتب في دفتر الشكر"
                  className="min-h-[44px] flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2"
                >
                  <Icon
                    as={NotebookPen}
                    size={16}
                    className="text-primary-foreground"
                  />
                  <Text className="text-sm font-bold text-primary-foreground">
                    اكتب في دفتر الشكر
                  </Text>
                </Pressable>
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
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
