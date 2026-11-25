import { personalize } from '@roi/shared';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { Text } from '../../components/ui/text';
import { MAX_FONT_SIZE_MULTIPLIER } from '../../constants/theme';
import type { Gender, UserProfile } from '../profile/repository';
import { uiCopy } from '../profile/ui-copy';
import { Scripture } from '../scripture/scripture';
import { formatVerseForCopy } from './copy';

export interface CopyVerseTarget {
  ref: string;
  text: string;
  textFemale?: string | null;
}

export interface CopyVerseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verse: CopyVerseTarget | null;
  profile: UserProfile;
  onCopy: (formattedText: string) => void;
}

/**
 * Recipient-aware verse copy modal (ME-07, D-13):
 * Asks whether the verse is for the user ("ليا أنا") or someone else ("هبعتها لحد"),
 * letting the sender pick recipient gender and optional name with live preview.
 */
export function CopyVerseDialog({
  open,
  onOpenChange,
  verse,
  profile,
  onCopy,
}: CopyVerseDialogProps) {
  const [mode, setMode] = useState<'choose' | 'recipient'>('choose');
  const [recipientGender, setRecipientGender] = useState<Gender>('male');
  const [recipientName, setRecipientName] = useState('');

  useEffect(() => {
    if (open) {
      setMode('choose');
      setRecipientGender('male');
      setRecipientName('');
    }
  }, [open, verse]);

  if (!verse) {
    return null;
  }

  const recipientProfile: UserProfile = {
    name: recipientName.trim(),
    gender: recipientGender,
  };

  const previewText = personalize(
    { text: verse.text, textFemale: verse.textFemale },
    recipientProfile,
  );

  const handleCopyForSelf = () => {
    onCopy(formatVerseForCopy(verse, profile));
    onOpenChange(false);
  };

  const handleCopyForRecipient = () => {
    onCopy(formatVerseForCopy(verse, recipientProfile));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85%] rounded-2xl border border-border bg-background p-6">
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-4"
        >
          <DialogHeader>
            <DialogTitle
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="pe-6 text-start text-xl font-bold leading-snug text-foreground"
            >
              {uiCopy('leyaanaCopyQuestion', profile.gender)}
            </DialogTitle>
          </DialogHeader>

          <View className="gap-3">
            <Pressable
              onPress={handleCopyForSelf}
              accessibilityRole="button"
              accessibilityLabel="ليا أنا"
              className="min-h-[44px] w-full items-center justify-center rounded-xl border border-border bg-card px-4 py-3"
            >
              <Text className="text-sm font-bold text-foreground">ليا أنا</Text>
            </Pressable>

            <Pressable
              onPress={() => setMode('recipient')}
              accessibilityRole="button"
              accessibilityLabel="هبعتها لحد"
              accessibilityState={{ selected: mode === 'recipient' }}
              className={`min-h-[44px] w-full items-center justify-center rounded-xl border px-4 py-3 ${
                mode === 'recipient'
                  ? 'border-primary bg-primary'
                  : 'border-border bg-card'
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  mode === 'recipient'
                    ? 'text-primary-foreground'
                    : 'text-foreground'
                }`}
              >
                هبعتها لحد
              </Text>
            </Pressable>
          </View>

          {mode === 'recipient' ? (
            <View className="gap-4 pt-1">
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="نوع الشخص"
                className="flex-row gap-3"
              >
                <Pressable
                  onPress={() => setRecipientGender('male')}
                  accessibilityRole="radio"
                  accessibilityLabel="ولد"
                  accessibilityState={{ selected: recipientGender === 'male' }}
                  className={`min-h-[44px] flex-1 items-center justify-center rounded-xl border px-4 py-3 ${
                    recipientGender === 'male'
                      ? 'border-primary bg-primary'
                      : 'border-border bg-card'
                  }`}
                >
                  <Text
                    className={`text-sm font-bold ${
                      recipientGender === 'male'
                        ? 'text-primary-foreground'
                        : 'text-foreground'
                    }`}
                  >
                    ولد
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setRecipientGender('female')}
                  accessibilityRole="radio"
                  accessibilityLabel="بنت"
                  accessibilityState={{
                    selected: recipientGender === 'female',
                  }}
                  className={`min-h-[44px] flex-1 items-center justify-center rounded-xl border px-4 py-3 ${
                    recipientGender === 'female'
                      ? 'border-primary bg-primary'
                      : 'border-border bg-card'
                  }`}
                >
                  <Text
                    className={`text-sm font-bold ${
                      recipientGender === 'female'
                        ? 'text-primary-foreground'
                        : 'text-foreground'
                    }`}
                  >
                    بنت
                  </Text>
                </Pressable>
              </View>

              <TextInput
                value={recipientName}
                onChangeText={setRecipientName}
                placeholder="اسم الشخص (اختياري)"
                placeholderTextColor="#7A7265"
                accessibilityLabel="اسم الشخص (اختياري)"
                autoCapitalize="words"
                className="min-h-[44px] rounded-xl border border-input bg-card p-4 text-start text-base text-foreground"
              />

              <View className="gap-2 rounded-2xl border border-border bg-card p-4">
                <Scripture className="text-start">{previewText}</Scripture>
                <Text className="text-start text-sm text-muted-foreground">
                  {verse.ref}
                </Text>
              </View>

              <Pressable
                onPress={handleCopyForRecipient}
                accessibilityRole="button"
                accessibilityLabel="انسخ الآية"
                className="min-h-[44px] w-full items-center justify-center rounded-xl bg-primary px-6 py-4"
              >
                <Text className="text-sm font-bold text-primary-foreground">
                  انسخ الآية
                </Text>
              </Pressable>
            </View>
          ) : null}

          <DialogFooter>
            <Pressable
              onPress={() => onOpenChange(false)}
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
    </Dialog>
  );
}
