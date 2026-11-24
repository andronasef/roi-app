import {
  formatArabicDate,
  matches,
  personalize,
  toArabicDigits,
  TORTURE_FIXTURES,
} from '@roi/shared';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type Option,
} from '@/components/ui/select';
import { SAMPLE_NAME } from '@/constants/app';
import {
  SCRIPTURE_FONT_OPTIONS,
  type ScriptureFontCandidate,
} from '@/constants/theme';
import {
  Scripture,
  ScriptureSizeSlider,
  useScriptureSize,
} from '@/features/scripture/scripture';
import ar from '@/locales/ar.json';

const FONT_LABELS: Record<ScriptureFontCandidate, string> = {
  amiri: ar.fontAmiri,
  scheherazade: ar.fontScheherazade,
};

const SELECT_OPTIONS: readonly NonNullable<Option>[] = [
  { value: 'one', label: ar.selectOption1 },
  { value: 'two', label: ar.selectOption2 },
  { value: 'three', label: ar.selectOption3 },
];

export default function TortureScreen() {
  const [query, setQuery] = useState('');
  const [selectedOption, setSelectedOption] = useState<Option>(undefined);
  const { fontCandidate, setFontCandidate } = useScriptureSize();

  const filteredFixtures = useMemo(
    () =>
      TORTURE_FIXTURES.filter(
        (fixture) =>
          matches(fixture.text, query) || matches(fixture.ref, query),
      ),
    [query],
  );

  const digitsSample = `${toArabicDigits(1234567890)} · ${formatArabicDate(new Date())}`;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-5 py-10 gap-5"
    >
      <Text
        accessibilityRole="header"
        className="text-center text-2xl font-bold text-foreground"
      >
        {ar.tortureTitle}
      </Text>

      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={ar.searchPlaceholder}
        accessibilityLabel={ar.searchPlaceholder}
        className="min-h-[44px] rounded-xl border border-border bg-card px-4 py-2 text-start text-base text-foreground"
      />

      <View className="gap-2 rounded-2xl border border-border bg-card p-4">
        <Text className="text-sm font-medium text-muted-foreground">
          {ar.fontLabel}
        </Text>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={ar.fontLabel}
          className="flex-row gap-2"
        >
          {SCRIPTURE_FONT_OPTIONS.map((candidate) => {
            const isSelected = fontCandidate === candidate;
            const label = FONT_LABELS[candidate];
            return (
              <Pressable
                key={candidate}
                onPress={() => setFontCandidate(candidate)}
                accessibilityRole="radio"
                accessibilityLabel={label}
                accessibilityState={{ checked: isSelected }}
                className={`min-h-[44px] min-w-[44px] flex-1 items-center justify-center rounded-xl border px-3 py-2 ${
                  isSelected
                    ? 'border-primary bg-primary'
                    : 'border-border bg-background'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    isSelected ? 'text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <ScriptureSizeSlider />
      </View>

      <View className="gap-2 rounded-2xl border border-border bg-card p-4">
        <Text className="text-sm font-medium text-muted-foreground">
          {ar.digitsLabel}
        </Text>
        <Text className="text-base text-foreground">{digitsSample}</Text>
      </View>

      <View className="gap-2 rounded-2xl border border-border bg-card p-4">
        <Text className="text-sm font-medium text-muted-foreground">
          {ar.boldSamplesLabel}
        </Text>
        <Scripture bold candidate="amiri">
          {`${ar.fontAmiri}: ${TORTURE_FIXTURES[0].text}`}
        </Scripture>
        <Scripture bold candidate="scheherazade">
          {`${ar.fontScheherazade}: ${TORTURE_FIXTURES[0].text}`}
        </Scripture>
      </View>

      <View className="gap-3 rounded-2xl border border-border bg-card p-4">
        <Dialog>
          <DialogTrigger asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={ar.dialogOpen}
              className="min-h-[44px] items-center justify-center rounded-xl bg-primary px-4 py-2.5"
            >
              <Text className="text-sm font-medium text-primary-foreground">
                {ar.dialogOpen}
              </Text>
            </Pressable>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{ar.dialogTitle}</DialogTitle>
              <DialogDescription>{ar.dialogDescription}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={ar.close}
                  className="min-h-[44px] items-center justify-center rounded-xl bg-primary px-4 py-2"
                >
                  <Text className="text-sm font-medium text-primary-foreground">
                    {ar.close}
                  </Text>
                </Pressable>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <View className="gap-1.5">
          <Text className="text-sm font-medium text-muted-foreground">
            {ar.selectLabel}
          </Text>
          <Select value={selectedOption} onValueChange={setSelectedOption}>
            <SelectTrigger
              accessibilityRole="button"
              accessibilityLabel={ar.selectLabel}
              className="min-h-[44px] w-full"
            >
              <SelectValue placeholder={ar.selectPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {SELECT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </View>
      </View>

      <View className="gap-3">
        {filteredFixtures.length === 0 ? (
          <Text className="py-4 text-center text-sm text-muted-foreground">
            {ar.noSearchResults}
          </Text>
        ) : (
          filteredFixtures.map((fixture) => {
            const renderedText =
              fixture.id === 'token'
                ? personalize({ text: fixture.text }, { name: SAMPLE_NAME })
                : fixture.text;
            const refLabel =
              fixture.id === 'token' ? ar.personalizedLabel : fixture.ref;
            return (
              <View
                key={fixture.id}
                className="gap-1.5 rounded-2xl border border-border bg-card p-4"
              >
                <Text className="text-xs font-medium text-muted-foreground">
                  {refLabel}
                </Text>
                <Scripture>{renderedText}</Scripture>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
