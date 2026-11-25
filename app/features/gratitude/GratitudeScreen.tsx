import { formatArabicDate, localDateKey } from '@roi/shared';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowRight,
  CalendarPlus,
  Maximize2,
  Plus,
  Settings,
} from 'lucide-react-native';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentRef,
} from 'react';
import {
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Icon } from '../../components/ui/icon';
import { Text } from '../../components/ui/text';
import { ROUTES } from '../../constants/app';
import { MAX_FONT_SIZE_MULTIPLIER } from '../../constants/theme';
import { db, deviceClock } from '../db/client';
import { syncGratitudeReminderSchedule } from '../notifications/scheduler';
import { useProfile } from '../profile/context';
import { uiCopy } from '../profile/ui-copy';
import {
  ArabicDatePickerModal,
  ArabicTimePickerModal,
  formatArabicTime12h,
} from './ArabicPickers';
import { ExpandableGratitudeEditor } from './ExpandableGratitudeEditor';
import {
  appendGratitudeLine,
  groupGratitudeByMonth,
  type GratitudeReminderSettings,
} from './models';
import {
  getGratitudeLineByDate,
  getGratitudeReminderSettings,
  listLiveGratitude,
  setGratitudeReminderSettings,
  upsertGratitudeLine,
} from './repository';

const AUTOSAVE_DELAY_MS = 400;
const TODAY_PLACEHOLDER = 'اكتب حاجة بتشكر ربنا عليها النهاردة...';

function parseDateKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

function yesterdayKey(nowMs: number): string {
  const d = new Date(nowMs);
  d.setDate(d.getDate() - 1);
  return localDateKey(d);
}

/**
 * دفتر الشكر: today card with autosave + expandable editor, month-grouped past days,
 * past-day entry and the opt-in nightly reminder (GRT-01..GRT-04, D-07..D-12).
 */
export function GratitudeScreen() {
  const router = useRouter();
  const { profile } = useProfile();
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();

  const todayKey = localDateKey(new Date(deviceClock.now()));
  const [todayText, setTodayText] = useState(
    () => getGratitudeLineByDate(db, todayKey)?.body ?? '',
  );
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [rows, setRows] = useState(() => listLiveGratitude(db));

  const inputRef = useRef<ComponentRef<typeof TextInput>>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef({ text: todayText, dirty: false, key: todayKey });
  const appliedPrefillRef = useRef<string | null>(null);

  // Past-day edit dialog state.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editDate, setEditDate] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Reminder dialog state.
  const [reminder, setReminder] = useState<GratitudeReminderSettings>(() =>
    getGratitudeReminderSettings(db),
  );
  const [reminderOpen, setReminderOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const reloadRows = useCallback(() => setRows(listLiveGratitude(db)), []);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const { text, dirty, key } = latestRef.current;
    if (!dirty) {
      return;
    }
    latestRef.current.dirty = false;
    upsertGratitudeLine(db, deviceClock, key, text);
    setSaving(false);
    reloadRows();
  }, [reloadRows]);

  const handleTodayChange = useCallback(
    (text: string) => {
      setTodayText(text);
      latestRef.current = { text, dirty: true, key: todayKey };
      setSaving(true);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(flush, AUTOSAVE_DELAY_MS);
    },
    [flush, todayKey],
  );

  // Persist anything pending when leaving the screen.
  useEffect(() => flush, [flush]);

  useFocusEffect(
    useCallback(() => {
      reloadRows();
      setReminder(getGratitudeReminderSettings(db));
    }, [reloadRows]),
  );

  // D-07: merge an answered-prayer prefill into today's card for review. It is persisted by
  // the next edit or blur, not silently on arrival.
  useEffect(() => {
    if (!prefill || appliedPrefillRef.current === prefill) {
      return;
    }
    appliedPrefillRef.current = prefill;
    const merged = appendGratitudeLine(latestRef.current.text, prefill);
    setTodayText(merged);
    latestRef.current = { text: merged, dirty: true, key: todayKey };
    inputRef.current?.focus();
  }, [prefill, todayKey]);

  const handleAppendLine = () => {
    handleTodayChange(appendGratitudeLine(todayText, ''));
    inputRef.current?.focus();
  };

  const openPastDay = (localDate: string) => {
    setEditText(getGratitudeLineByDate(db, localDate)?.body ?? '');
    setEditDate(localDate);
  };

  const savePastDay = (confirmedClear = false) => {
    if (!editDate) {
      return;
    }
    const existing = getGratitudeLineByDate(db, editDate);
    if (editText.trim() === '' && existing && !confirmedClear) {
      setConfirmClearOpen(true);
      return;
    }
    upsertGratitudeLine(db, deviceClock, editDate, editText);
    setEditDate(null);
    setConfirmClearOpen(false);
    reloadRows();
  };

  const applyReminder = async (next: GratitudeReminderSettings) => {
    const result = await syncGratitudeReminderSchedule(next);
    if (!result.ok) {
      // D-12: OS permission refused, keep the switch off and explain how to fix it.
      setPermissionDenied(true);
      next = { ...next, enabled: false };
    } else {
      setPermissionDenied(false);
    }
    setReminder(setGratitudeReminderSettings(db, deviceClock, next));
  };

  const groups = groupGratitudeByMonth(rows, todayKey);
  const todayLabel = formatArabicDate(parseDateKey(todayKey));
  const editLabel = editDate ? formatArabicDate(parseDateKey(editDate)) : '';

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={() =>
                router.canGoBack() ? router.back() : router.replace(ROUTES.home)
              }
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
              دفتر الشكر
            </Text>
          </View>

          <View className="flex-row items-center gap-1">
            <Pressable
              onPress={() => setPickerOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="ضيف ليوم فات"
              className="min-h-[44px] flex-row items-center gap-2 rounded-xl border border-border bg-card px-4 py-2"
            >
              <Icon as={CalendarPlus} size={18} className="text-foreground" />
              <Text className="text-sm font-bold text-foreground">
                ضيف ليوم فات
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setReminderOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="إعدادات دفتر الشكر"
              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
            >
              <Icon as={Settings} size={20} className="text-foreground" />
            </Pressable>
          </View>
        </View>

        <ScrollView
          className="flex-1 bg-background"
          contentContainerClassName="gap-4 px-6 py-4 pb-16"
          keyboardShouldPersistTaps="handled"
        >
          {/* Today card */}
          <View className="gap-4 rounded-2xl border border-border bg-card p-6">
            <View className="flex-row items-center justify-between">
              <View className="gap-1">
                <Text className="text-start text-sm font-bold text-accent">
                  النهاردة
                </Text>
                <Text className="text-start text-sm text-muted-foreground">
                  {todayLabel}
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text className="text-sm text-muted-foreground">
                  {saving ? 'بيتحفظ...' : 'اتحفظ تلقائي'}
                </Text>
                <Pressable
                  onPress={() => setExpanded(true)}
                  accessibilityRole="button"
                  accessibilityLabel="توسيع مساحة الكتابة"
                  className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
                >
                  <Icon as={Maximize2} size={20} className="text-foreground" />
                </Pressable>
              </View>
            </View>

            <TextInput
              ref={inputRef}
              multiline
              value={todayText}
              onChangeText={handleTodayChange}
              onBlur={flush}
              placeholder={TODAY_PLACEHOLDER}
              textAlignVertical="top"
              accessibilityLabel="سطر الشكر النهاردة"
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="min-h-[120px] text-start text-base text-foreground"
            />

            {todayText.trim().length > 0 ? (
              <Pressable
                onPress={handleAppendLine}
                accessibilityRole="button"
                accessibilityLabel="أضف شكر تاني"
                className="min-h-[44px] flex-row items-center gap-2 self-start rounded-xl border border-border bg-background px-4 py-2"
              >
                <Icon as={Plus} size={16} className="text-foreground" />
                <Text className="text-sm font-bold text-foreground">
                  أضف شكر تاني
                </Text>
              </Pressable>
            ) : null}
          </View>

          {/* Past entries */}
          {groups.length === 0 ? (
            <View className="items-center gap-2 rounded-2xl border border-border bg-card p-6 py-8">
              <Text
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                className="text-center text-xl font-bold text-foreground"
              >
                مفيش سطور شكر قديمة لسه
              </Text>
              <Text className="text-center text-base text-muted-foreground">
                كل يوم تكتب فيه سطر شكر هيتحفظ هنا متجمع بالشهر، وتقدر تضيف ليوم
                فات من فوق
              </Text>
            </View>
          ) : (
            groups.map((group) => (
              <View key={group.monthKey} className="gap-2">
                <Text
                  accessibilityRole="header"
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                  className="mt-2 text-start text-xl font-bold text-foreground"
                >
                  {group.monthLabel}
                </Text>
                {group.items.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => openPastDay(item.localDate)}
                    accessibilityRole="button"
                    accessibilityLabel={`تعديل شكر ${formatArabicDate(parseDateKey(item.localDate))}`}
                    className="min-h-[44px] gap-2 rounded-2xl border border-border bg-card p-4 active:opacity-80"
                  >
                    <Text className="text-start text-sm font-bold text-muted-foreground">
                      {formatArabicDate(parseDateKey(item.localDate))}
                    </Text>
                    <Text className="text-start text-base text-foreground">
                      {item.body}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      {expanded ? (
        <ExpandableGratitudeEditor
          value={todayText}
          onChangeText={handleTodayChange}
          onBlur={flush}
          onCollapse={() => {
            flush();
            setExpanded(false);
          }}
          dateLabel={todayLabel}
          saving={saving}
        />
      ) : null}

      {/* Past-day picker (<= yesterday) */}
      <ArabicDatePickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        maxLocalDate={yesterdayKey(deviceClock.now())}
        title="اختار اليوم"
        onConfirm={openPastDay}
      />

      {/* Past-day edit dialog */}
      <Dialog
        open={editDate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditDate(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {editLabel}
            </DialogTitle>
          </DialogHeader>
          <TextInput
            multiline
            value={editText}
            onChangeText={setEditText}
            placeholder="اكتب حاجة بتشكر ربنا عليها..."
            textAlignVertical="top"
            accessibilityLabel="سطر الشكر"
            className="min-h-[120px] rounded-xl border border-input bg-background p-4 text-start text-base text-foreground"
          />
          <DialogFooter>
            <Pressable
              onPress={() => setEditDate(null)}
              accessibilityRole="button"
              accessibilityLabel="إغلاق النافذة"
              className="min-h-[44px] items-center justify-center rounded-xl border border-border px-4 py-2"
            >
              <Text className="text-sm font-bold text-foreground">
                إغلاق النافذة
              </Text>
            </Pressable>
            <Pressable
              onPress={() => savePastDay()}
              accessibilityRole="button"
              accessibilityLabel="احفظ الشكر"
              className="min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 py-2"
            >
              <Text className="text-sm font-bold text-primary-foreground">
                احفظ الشكر
              </Text>
            </Pressable>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear-day confirmation (GRT-04) */}
      <Dialog open={confirmClearOpen} onOpenChange={setConfirmClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              مسح سطر الشكر
            </DialogTitle>
            <DialogDescription>
              {uiCopy('clearGratitudeBody', profile.gender)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Pressable
              onPress={() => setConfirmClearOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="ارجع عن الحذف"
              className="min-h-[44px] items-center justify-center rounded-xl border border-border px-4 py-2"
            >
              <Text className="text-sm font-bold text-foreground">
                ارجع عن الحذف
              </Text>
            </Pressable>
            <Pressable
              onPress={() => savePastDay(true)}
              accessibilityRole="button"
              accessibilityLabel="احذف السطر"
              className="min-h-[44px] items-center justify-center rounded-xl bg-destructive px-6 py-2"
            >
              <Text className="text-sm font-bold text-destructive-foreground">
                احذف السطر
              </Text>
            </Pressable>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nightly reminder dialog (D-11, D-12) */}
      <Dialog open={reminderOpen} onOpenChange={setReminderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              إعدادات دفتر الشكر
            </DialogTitle>
          </DialogHeader>
          <View className="min-h-[44px] flex-row items-center justify-between gap-4">
            <Text className="flex-1 text-start text-base text-foreground">
              تذكير دفتر الشكر بالليل
            </Text>
            <Switch
              value={reminder.enabled}
              onValueChange={(enabled) =>
                void applyReminder({ ...reminder, enabled })
              }
              accessibilityRole="switch"
              accessibilityLabel="تذكير دفتر الشكر بالليل"
              accessibilityState={{ checked: reminder.enabled }}
              className="min-h-[44px] min-w-[44px]"
            />
          </View>
          <Pressable
            onPress={() => setTimeOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="ميعاد التذكير"
            className="min-h-[44px] justify-center rounded-xl border border-border px-4 py-2"
          >
            <Text className="text-start text-base text-foreground">
              ميعاد التذكير:{' '}
              {formatArabicTime12h(reminder.hour, reminder.minute)}
            </Text>
          </Pressable>
          {permissionDenied ? (
            <Text className="text-start text-sm text-destructive">
              {uiCopy('notificationDeniedError', profile.gender)}
            </Text>
          ) : null}
        </DialogContent>
      </Dialog>

      <ArabicTimePickerModal
        open={timeOpen}
        onOpenChange={setTimeOpen}
        hour={reminder.hour}
        minute={reminder.minute}
        onConfirm={(hour, minute) =>
          void applyReminder({ ...reminder, hour, minute })
        }
      />
    </View>
  );
}
