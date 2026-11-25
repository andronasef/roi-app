import { EGYPTIAN_MONTHS, localDateKey, toArabicDigits } from '@roi/shared';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { MAX_FONT_SIZE_MULTIPLIER } from '@/constants/theme';

export interface ArabicDatePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Initial selected date in YYYY-MM-DD local format. Defaults to maxLocalDate. */
  initialDate?: string;
  /** Maximum selectable date in YYYY-MM-DD local format. Defaults to today. */
  maxLocalDate?: string;
  /** Optional modal title. Defaults to 'اختيار التاريخ'. */
  title?: string;
  /** Confirm button label. Defaults to 'تأكيد'. */
  confirmLabel?: string;
  onConfirm: (localDate: string) => void;
}

export interface ArabicTimePickerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 24h hour (0..23). */
  hour: number;
  /** Minute (0..59). */
  minute: number;
  /** Optional modal title. Defaults to 'ميعاد التذكير'. */
  title?: string;
  onConfirm: (hour: number, minute: number) => void;
}

function daysInMonth(year: number, month1To12: number): number {
  return new Date(year, month1To12, 0).getDate();
}

function parseLocalDate(
  value: string | undefined,
  fallback: { year: number; month: number; day: number },
): { year: number; month: number; day: number } {
  if (!value) {
    return fallback;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return fallback;
  }
  const year = Number(match[1]);
  const month = Math.max(1, Math.min(12, Number(match[2])));
  const maxDay = daysInMonth(year, month);
  const day = Math.max(1, Math.min(maxDay, Number(match[3])));
  return { year, month, day };
}

function formatDateKey(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function clampToMaxDate(
  year: number,
  month: number,
  day: number,
  max: { year: number; month: number; day: number },
): { year: number; month: number; day: number } {
  const clampedMonth = Math.max(1, Math.min(12, month));
  const clampedDay = Math.max(1, Math.min(daysInMonth(year, clampedMonth), day));
  const candidate = formatDateKey(year, clampedMonth, clampedDay);
  const maxKey = formatDateKey(max.year, max.month, max.day);
  if (candidate > maxKey) {
    return max;
  }
  return { year, month: clampedMonth, day: clampedDay };
}

/** Format 24h hour/minute in 12h Egyptian Arabic with Arabic-Indic digits (e.g. '٩:٠٠ مساءً'). */
export function formatArabicTime12h(hour24: number, minute: number): string {
  const isPm = hour24 >= 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const period = isPm ? 'مساءً' : 'صباحاً';
  const mm = String(minute).padStart(2, '0');
  return `${toArabicDigits(hour12)}:${toArabicDigits(mm)} ${period}`;
}

interface StepperColumnProps {
  label: string;
  valueDisplay: string;
  incrementLabel: string;
  decrementLabel: string;
  canIncrement?: boolean;
  canDecrement?: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
}

function StepperColumn({
  label,
  valueDisplay,
  incrementLabel,
  decrementLabel,
  canIncrement = true,
  canDecrement = true,
  onIncrement,
  onDecrement,
}: StepperColumnProps) {
  return (
    <View className="flex-1 items-center gap-2">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={incrementLabel}
        accessibilityState={{ disabled: !canIncrement }}
        disabled={!canIncrement}
        onPress={onIncrement}
        className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card px-3 active:opacity-80 disabled:opacity-40"
      >
        <Icon as={ChevronUp} className="size-5 text-foreground" />
      </Pressable>
      <View className="min-h-[44px] w-full items-center justify-center rounded-xl border border-border bg-muted px-2 py-2">
        <Text
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          className="text-center text-base font-bold text-foreground"
        >
          {valueDisplay}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={decrementLabel}
        accessibilityState={{ disabled: !canDecrement }}
        disabled={!canDecrement}
        onPress={onDecrement}
        className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card px-3 active:opacity-80 disabled:opacity-40"
      >
        <Icon as={ChevronDown} className="size-5 text-foreground" />
      </Pressable>
    </View>
  );
}

/**
 * Pure-JS RTL date picker modal restricted to dates <= maxLocalDate,
 * rendering Egyptian Arabic months and Arabic-Indic digits.
 */
export function ArabicDatePickerModal({
  open,
  onOpenChange,
  initialDate,
  maxLocalDate,
  title = 'اختيار التاريخ',
  confirmLabel = 'تأكيد',
  onConfirm,
}: ArabicDatePickerModalProps) {
  const todayFallback = useMemo(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };
  }, []);

  const maxParsed = useMemo(
    () => parseLocalDate(maxLocalDate ?? localDateKey(new Date()), todayFallback),
    [maxLocalDate, todayFallback],
  );

  const [selected, setSelected] = useState(() =>
    clampToMaxDate(
      parseLocalDate(initialDate, maxParsed).year,
      parseLocalDate(initialDate, maxParsed).month,
      parseLocalDate(initialDate, maxParsed).day,
      maxParsed,
    ),
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const parsed = parseLocalDate(initialDate, maxParsed);
    setSelected(clampToMaxDate(parsed.year, parsed.month, parsed.day, maxParsed));
  }, [open, initialDate, maxParsed]);

  const maxKey = formatDateKey(maxParsed.year, maxParsed.month, maxParsed.day);
  const currentKey = formatDateKey(selected.year, selected.month, selected.day);

  const canIncrementDay = currentKey < maxKey;
  const canIncrementMonth =
    selected.year < maxParsed.year ||
    (selected.year === maxParsed.year && selected.month < maxParsed.month);
  const canIncrementYear = selected.year < maxParsed.year;

  function stepDay(delta: number) {
    const nextDate = new Date(selected.year, selected.month - 1, selected.day + delta);
    setSelected(
      clampToMaxDate(
        nextDate.getFullYear(),
        nextDate.getMonth() + 1,
        nextDate.getDate(),
        maxParsed,
      ),
    );
  }

  function stepMonth(delta: number) {
    let nextMonth = selected.month + delta;
    let nextYear = selected.year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    } else if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    setSelected(clampToMaxDate(nextYear, nextMonth, selected.day, maxParsed));
  }

  function stepYear(delta: number) {
    const nextYear = Math.max(1970, selected.year + delta);
    setSelected(clampToMaxDate(nextYear, selected.month, selected.day, maxParsed));
  }

  const monthName = EGYPTIAN_MONTHS[selected.month - 1] ?? EGYPTIAN_MONTHS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle className="text-start text-xl font-bold text-foreground">
            {title}
          </DialogTitle>
        </DialogHeader>

        <View className="flex-row items-center gap-3 py-2">
          <StepperColumn
            label="اليوم"
            valueDisplay={toArabicDigits(selected.day)}
            incrementLabel="زيادة اليوم"
            decrementLabel="إنقاص اليوم"
            canIncrement={canIncrementDay}
            onIncrement={() => stepDay(1)}
            onDecrement={() => stepDay(-1)}
          />
          <StepperColumn
            label="الشهر"
            valueDisplay={monthName}
            incrementLabel="الشهر التالي"
            decrementLabel="الشهر السابق"
            canIncrement={canIncrementMonth}
            onIncrement={() => stepMonth(1)}
            onDecrement={() => stepMonth(-1)}
          />
          <StepperColumn
            label="السنة"
            valueDisplay={toArabicDigits(selected.year)}
            incrementLabel="السنة التالية"
            decrementLabel="السنة السابقة"
            canIncrement={canIncrementYear}
            canDecrement={selected.year > 1970}
            onIncrement={() => stepYear(1)}
            onDecrement={() => stepYear(-1)}
          />
        </View>

        <Text className="text-center text-sm text-muted-foreground">
          {`${toArabicDigits(selected.day)} ${monthName} ${toArabicDigits(selected.year)}`}
        </Text>

        <DialogFooter className="flex-row justify-end gap-2 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إغلاق النافذة"
            onPress={() => onOpenChange(false)}
            className="min-h-[44px] items-center justify-center rounded-xl border border-border px-4 py-2 active:opacity-80"
          >
            <Text className="text-sm font-bold text-foreground">إغلاق النافذة</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
            onPress={() => {
              onConfirm(formatDateKey(selected.year, selected.month, selected.day));
              onOpenChange(false);
            }}
            className="min-h-[44px] items-center justify-center rounded-xl bg-primary px-5 py-2 active:opacity-80"
          >
            <Text className="text-sm font-bold text-primary-foreground">
              {confirmLabel}
            </Text>
          </Pressable>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Pure-JS RTL time picker modal in 12h Egyptian Arabic format (صباحاً / مساءً)
 * with Arabic-Indic digits.
 */
export function ArabicTimePickerModal({
  open,
  onOpenChange,
  hour,
  minute,
  title = 'ميعاد التذكير',
  onConfirm,
}: ArabicTimePickerModalProps) {
  const [hour24, setHour24] = useState(hour);
  const [minuteVal, setMinuteVal] = useState(minute);

  useEffect(() => {
    if (!open) {
      return;
    }
    setHour24(Math.max(0, Math.min(23, Math.round(hour))));
    setMinuteVal(Math.max(0, Math.min(59, Math.round(minute))));
  }, [open, hour, minute]);

  const isPm = hour24 >= 12;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  function stepHour12(delta: number) {
    const next12 = ((hour12 - 1 + delta + 12) % 12) + 1;
    const base = isPm ? 12 : 0;
    const next24 = next12 === 12 ? base : base + next12;
    setHour24(next24);
  }

  function stepMinute(delta: number) {
    setMinuteVal((prev) => (prev + delta + 60) % 60);
  }

  function togglePeriod(targetPm: boolean) {
    if (targetPm === isPm) {
      return;
    }
    setHour24((prev) => (targetPm ? (prev % 12) + 12 : prev % 12));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-background">
        <DialogHeader>
          <DialogTitle className="text-start text-xl font-bold text-foreground">
            {title}
          </DialogTitle>
        </DialogHeader>

        <View className="flex-row items-center gap-3 py-2">
          <StepperColumn
            label="الساعة"
            valueDisplay={toArabicDigits(hour12)}
            incrementLabel="زيادة الساعة"
            decrementLabel="إنقاص الساعة"
            onIncrement={() => stepHour12(1)}
            onDecrement={() => stepHour12(-1)}
          />
          <StepperColumn
            label="الدقيقة"
            valueDisplay={toArabicDigits(String(minuteVal).padStart(2, '0'))}
            incrementLabel="زيادة الدقائق"
            decrementLabel="إنقاص الدقائق"
            onIncrement={() => stepMinute(5)}
            onDecrement={() => stepMinute(-5)}
          />
          <View className="flex-1 items-center gap-2">
            <Text className="text-sm text-muted-foreground">الفترة</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="صباحاً"
              accessibilityState={{ selected: !isPm }}
              onPress={() => togglePeriod(false)}
              className={`min-h-[44px] w-full items-center justify-center rounded-xl border px-3 py-2 ${
                !isPm
                  ? 'border-accent bg-primary'
                  : 'border-border bg-card'
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  !isPm ? 'text-primary-foreground' : 'text-foreground'
                }`}
              >
                صباحاً
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="مساءً"
              accessibilityState={{ selected: isPm }}
              onPress={() => togglePeriod(true)}
              className={`min-h-[44px] w-full items-center justify-center rounded-xl border px-3 py-2 ${
                isPm
                  ? 'border-accent bg-primary'
                  : 'border-border bg-card'
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  isPm ? 'text-primary-foreground' : 'text-foreground'
                }`}
              >
                مساءً
              </Text>
            </Pressable>
          </View>
        </View>

        <Text className="text-center text-sm text-muted-foreground">
          {formatArabicTime12h(hour24, minuteVal)}
        </Text>

        <DialogFooter className="flex-row justify-end gap-2 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="إغلاق النافذة"
            onPress={() => onOpenChange(false)}
            className="min-h-[44px] items-center justify-center rounded-xl border border-border px-4 py-2 active:opacity-80"
          >
            <Text className="text-sm font-bold text-foreground">إغلاق النافذة</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="حفظ الميعاد"
            onPress={() => {
              onConfirm(hour24, minuteVal);
              onOpenChange(false);
            }}
            className="min-h-[44px] items-center justify-center rounded-xl bg-primary px-5 py-2 active:opacity-80"
          >
            <Text className="text-sm font-bold text-primary-foreground">
              حفظ الميعاد
            </Text>
          </Pressable>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
