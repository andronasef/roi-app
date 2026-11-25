import { formatArabicDate, localDateKey } from '@roi/shared';
import { Calendar, Check, Edit3, Pin, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

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
import { MAX_FONT_SIZE_MULTIPLIER } from '../../constants/theme';
import { ArabicDatePickerModal } from '../gratitude/ArabicPickers';
import type { Gender } from '../profile/repository';
import { uiCopy } from '../profile/ui-copy';
import {
  PRAYER_SORTS,
  type PrayerSort,
  type PrayerWithStats,
} from './models';

export interface PrayerFormValues {
  body: string;
  personName: string | null;
  sinceLocalDate: string;
}

export interface PrayerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPrayer: PrayerWithStats | null;
  todayKey: string;
  onSave: (values: PrayerFormValues) => void;
}

function parseDateKey(dateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!match) {
    return new Date();
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * Create or edit a prayer card (body required, optional personName, optional sinceLocalDate).
 */
export function PrayerFormDialog({
  open,
  onOpenChange,
  editingPrayer,
  todayKey,
  onSave,
}: PrayerFormDialogProps) {
  const [body, setBody] = useState('');
  const [personName, setPersonName] = useState('');
  const [sinceLocalDate, setSinceLocalDate] = useState(todayKey);
  const [error, setError] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    setBody(editingPrayer?.body ?? '');
    setPersonName(editingPrayer?.personName ?? '');
    setSinceLocalDate(editingPrayer?.sinceLocalDate ?? todayKey);
    setError(null);
  }, [open, editingPrayer, todayKey]);

  const handleConfirm = () => {
    const trimmedBody = body.trim();
    if (!trimmedBody) {
      setError('اكتب نص الصلاة الأول عشان نقدر نحفظها');
      return;
    }
    const trimmedPerson = personName.trim();
    onSave({
      body: trimmedBody,
      personName: trimmedPerson.length > 0 ? trimmedPerson : null,
      sinceLocalDate,
    });
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
              {editingPrayer ? 'تعديل الصلاة' : 'أضف صلاة'}
            </DialogTitle>
          </DialogHeader>

          <View className="gap-4">
            <View className="gap-2">
              <Text className="text-start text-sm font-bold text-foreground">
                نص الصلاة
              </Text>
              <TextInput
                value={body}
                onChangeText={(value) => {
                  setBody(value);
                  if (error) {
                    setError(null);
                  }
                }}
                placeholder="اكتب الصلاة هنا..."
                multiline
                textAlignVertical="top"
                accessibilityLabel="نص الصلاة"
                className="min-h-[96px] rounded-xl border border-input bg-background p-4 text-start text-base text-foreground"
              />
              {error ? (
                <Text className="text-start text-sm text-destructive">
                  {error}
                </Text>
              ) : null}
            </View>

            <View className="gap-2">
              <Text className="text-start text-sm font-bold text-foreground">
                الشخص
              </Text>
              <TextInput
                value={personName}
                onChangeText={setPersonName}
                placeholder="اسم الشخص (اختياري)"
                accessibilityLabel="اسم الشخص"
                className="min-h-[44px] rounded-xl border border-input bg-background px-4 text-start text-base text-foreground"
              />
            </View>

            <View className="gap-2">
              <Text className="text-start text-sm font-bold text-foreground">
                من امتى
              </Text>
              <Pressable
                onPress={() => setDatePickerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="اختر تاريخ بداية الصلاة"
                className="min-h-[44px] flex-row items-center justify-between rounded-xl border border-input bg-background px-4 py-2"
              >
                <Text className="text-start text-base text-foreground">
                  {formatArabicDate(parseDateKey(sinceLocalDate))}
                </Text>
                <Icon as={Calendar} size={18} className="text-muted-foreground" />
              </Pressable>
            </View>
          </View>

          <DialogFooter>
            <Pressable
              onPress={() => onOpenChange(false)}
              accessibilityRole="button"
              accessibilityLabel="إغلاق النافذة"
              className="min-h-[44px] items-center justify-center rounded-xl border border-border px-4 py-2"
            >
              <Text className="text-sm font-bold text-foreground">
                إغلاق النافذة
              </Text>
            </Pressable>
            <Pressable
              onPress={handleConfirm}
              accessibilityRole="button"
              accessibilityLabel="احفظ الصلاة"
              className="min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 py-2"
            >
              <Text className="text-sm font-bold text-primary-foreground">
                احفظ الصلاة
              </Text>
            </Pressable>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ArabicDatePickerModal
        open={datePickerOpen}
        onOpenChange={setDatePickerOpen}
        initialDate={sinceLocalDate}
        maxLocalDate={todayKey || localDateKey(new Date())}
        title="من امتى بتصلي عشان الطلبة دي؟"
        confirmLabel="اختيار التاريخ"
        onConfirm={(picked) => setSinceLocalDate(picked)}
      />
    </>
  );
}

export interface PrayNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  onConfirm: (note: string | null) => void;
}

/**
 * Quick optional note dialog shown on صليت and صليت لكلهم (D-04).
 */
export function PrayNoteDialog({
  open,
  onOpenChange,
  title = 'تسجيل صلاة',
  onConfirm,
}: PrayNoteDialogProps) {
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setNote('');
    }
  }, [open]);

  const handleConfirm = () => {
    const trimmed = note.trim();
    onConfirm(trimmed.length > 0 ? trimmed : null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            {title}
          </DialogTitle>
        </DialogHeader>

        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="ملاحظة (اختياري)..."
          multiline
          textAlignVertical="top"
          accessibilityLabel="ملاحظة الصلاة"
          className="min-h-[88px] rounded-xl border border-input bg-background p-4 text-start text-base text-foreground"
        />

        <DialogFooter>
          <Pressable
            onPress={() => onOpenChange(false)}
            accessibilityRole="button"
            accessibilityLabel="إغلاق النافذة"
            className="min-h-[44px] items-center justify-center rounded-xl border border-border px-4 py-2"
          >
            <Text className="text-sm font-bold text-foreground">
              إغلاق النافذة
            </Text>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel="سجّل الصلاة"
            className="min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 py-2"
          >
            <Text className="text-sm font-bold text-primary-foreground">
              سجّل الصلاة
            </Text>
          </Pressable>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface PrayerSortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSort: PrayerSort;
  onSelectSort: (sort: PrayerSort) => void;
}

/**
 * 5-option sort selector dialog for تشفع (D-02).
 */
export function PrayerSortDialog({
  open,
  onOpenChange,
  selectedSort,
  onSelectSort,
}: PrayerSortDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            ترتيب الصلوات
          </DialogTitle>
        </DialogHeader>

        <View className="gap-2">
          {PRAYER_SORTS.map((option) => {
            const active = option.id === selectedSort;
            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  onSelectSort(option.id);
                  onOpenChange(false);
                }}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: active }}
                className={`min-h-[44px] flex-row items-center justify-between rounded-xl border px-4 py-3 ${
                  active
                    ? 'border-accent bg-primary'
                    : 'border-border bg-background'
                }`}
              >
                <Text
                  className={`text-start text-base font-bold ${
                    active ? 'text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {option.label}
                </Text>
                {active ? (
                  <Icon
                    as={Check}
                    size={18}
                    className="text-primary-foreground"
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </DialogContent>
    </Dialog>
  );
}

export interface MarkAnsweredDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (outcome: string | null) => void;
}

/**
 * Outcome dialog shown when marking a prayer اتستجابت (D-06).
 */
export function MarkAnsweredDialog({
  open,
  onOpenChange,
  onConfirm,
}: MarkAnsweredDialogProps) {
  const [outcome, setOutcome] = useState('');

  useEffect(() => {
    if (open) {
      setOutcome('');
    }
  }, [open]);

  const handleConfirm = () => {
    const trimmed = outcome.trim();
    onConfirm(trimmed.length > 0 ? trimmed : null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            اتستجابت الصلاة
          </DialogTitle>
        </DialogHeader>

        <TextInput
          value={outcome}
          onChangeText={setOutcome}
          placeholder="النتيجة (اختياري)..."
          multiline
          textAlignVertical="top"
          accessibilityLabel="نتيجة استجابة الصلاة"
          className="min-h-[88px] rounded-xl border border-input bg-background p-4 text-start text-base text-foreground"
        />

        <DialogFooter>
          <Pressable
            onPress={() => onOpenChange(false)}
            accessibilityRole="button"
            accessibilityLabel="إغلاق النافذة"
            className="min-h-[44px] items-center justify-center rounded-xl border border-border px-4 py-2"
          >
            <Text className="text-sm font-bold text-foreground">
              إغلاق النافذة
            </Text>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            accessibilityRole="button"
            accessibilityLabel="حفظ في المكتمل"
            className="min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 py-2"
          >
            <Text className="text-sm font-bold text-primary-foreground">
              حفظ في المكتمل
            </Text>
          </Pressable>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface PrayerMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prayer: PrayerWithStats | null;
  onTogglePin: (prayer: PrayerWithStats) => void;
  onEdit: (prayer: PrayerWithStats) => void;
  onMarkAnswered: (prayer: PrayerWithStats) => void;
  onDelete: (prayer: PrayerWithStats) => void;
}

/**
 * 4-action overflow menu dialog for a prayer card.
 */
export function PrayerMenuDialog({
  open,
  onOpenChange,
  prayer,
  onTogglePin,
  onEdit,
  onMarkAnswered,
  onDelete,
}: PrayerMenuDialogProps) {
  if (!prayer) {
    return null;
  }

  const isPinned = prayer.pinnedAt !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            خيارات الصلاة
          </DialogTitle>
        </DialogHeader>

        <View className="gap-2">
          <Pressable
            onPress={() => {
              onOpenChange(false);
              onTogglePin(prayer);
            }}
            accessibilityRole="button"
            accessibilityLabel={isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
            className="min-h-[44px] flex-row items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
          >
            <Icon as={Pin} size={18} className="text-accent" />
            <Text className="text-start text-base font-bold text-foreground">
              {isPinned ? 'إلغاء التثبيت' : 'تثبيت'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              onOpenChange(false);
              onEdit(prayer);
            }}
            accessibilityRole="button"
            accessibilityLabel="تعديل"
            className="min-h-[44px] flex-row items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
          >
            <Icon as={Edit3} size={18} className="text-foreground" />
            <Text className="text-start text-base font-bold text-foreground">
              تعديل
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              onOpenChange(false);
              onMarkAnswered(prayer);
            }}
            accessibilityRole="button"
            accessibilityLabel="اتستجابت"
            className="min-h-[44px] flex-row items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
          >
            <Icon as={Check} size={18} className="text-accent" />
            <Text className="text-start text-base font-bold text-foreground">
              اتستجابت
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              onOpenChange(false);
              onDelete(prayer);
            }}
            accessibilityRole="button"
            accessibilityLabel="حذف"
            className="min-h-[44px] flex-row items-center gap-3 rounded-xl border border-border bg-background px-4 py-3"
          >
            <Icon as={Trash2} size={18} className="text-destructive" />
            <Text className="text-start text-base font-bold text-destructive">
              حذف
            </Text>
          </Pressable>
        </View>
      </DialogContent>
    </Dialog>
  );
}

export interface DeletePrayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gender: Gender;
  onConfirm: () => void;
}

/**
 * Gender-aware destructive soft-delete confirmation dialog for a prayer.
 */
export function DeletePrayerDialog({
  open,
  onOpenChange,
  gender,
  onConfirm,
}: DeletePrayerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            حذف الصلاة
          </DialogTitle>
          <DialogDescription>
            {uiCopy('deletePrayerBody', gender)}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Pressable
            onPress={() => onOpenChange(false)}
            accessibilityRole="button"
            accessibilityLabel="ارجع عن الحذف"
            className="min-h-[44px] items-center justify-center rounded-xl border border-border px-4 py-2"
          >
            <Text className="text-sm font-bold text-foreground">
              ارجع عن الحذف
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              onConfirm();
              onOpenChange(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="احذف الصلاة"
            className="min-h-[44px] items-center justify-center rounded-xl bg-destructive px-6 py-2"
          >
            <Text className="text-sm font-bold text-destructive-foreground">
              احذف الصلاة
            </Text>
          </Pressable>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface IntercessionSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSort: PrayerSort;
  onChangeDefaultSort: (sort: PrayerSort) => void;
}

/**
 * In-tool settings dialog for تشفع (default sort mode persisted in SQLite settings, D-11).
 */
export function IntercessionSettingsDialog({
  open,
  onOpenChange,
  defaultSort,
  onChangeDefaultSort,
}: IntercessionSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}>
            إعدادات تشفع
          </DialogTitle>
          <DialogDescription>الترتيب الافتراضي في تشفع</DialogDescription>
        </DialogHeader>

        <View className="gap-2">
          {PRAYER_SORTS.map((option) => {
            const active = option.id === defaultSort;
            return (
              <Pressable
                key={option.id}
                onPress={() => {
                  onChangeDefaultSort(option.id);
                  onOpenChange(false);
                }}
                accessibilityRole="radio"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: active }}
                className={`min-h-[44px] flex-row items-center justify-between rounded-xl border px-4 py-3 ${
                  active
                    ? 'border-accent bg-primary'
                    : 'border-border bg-background'
                }`}
              >
                <Text
                  className={`text-start text-base font-bold ${
                    active ? 'text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {option.label}
                </Text>
                {active ? (
                  <Icon
                    as={Check}
                    size={18}
                    className="text-primary-foreground"
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </DialogContent>
    </Dialog>
  );
}
