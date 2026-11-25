import { personalize, toArabicDigits } from '@roi/shared';
import { asc, isNull } from 'drizzle-orm';
import {
  BookOpen,
  HeartHandshake,
  NotebookPen,
  Search,
  Shuffle,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
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
import { MAX_FONT_SIZE_MULTIPLIER } from '../../constants/theme';
import { setOnboardingCompleted } from '../../services/storage';
import { track } from '../../services/telemetry';
import { db, deviceClock } from '../db/client';
import { verses } from '../db/schema';
import { signInWithGoogleDriveScope } from '../google/auth';
import {
  favoriteId,
  listLiveFavoriteIds,
  toggleFavorite,
} from '../leyaana/assignments';
import { useProfile } from '../profile/context';
import type { Gender } from '../profile/repository';
import { uiCopy } from '../profile/ui-copy';
import { Scripture } from '../scripture/scripture';
import { useContentVersion } from '../sync/ContentGate';
import {
  filterStarterVerses,
  pickStarterVerses,
  validateOnboardingIdentity,
  type StarterVerseItem,
} from './starter-verses';

export interface OnboardingFlowProps {
  onComplete: () => void;
}

interface ToolPreviewRow {
  id: string;
  title: string;
  summary: string;
  icon: LucideIcon;
}

const TOOL_PREVIEWS: readonly ToolPreviewRow[] = [
  {
    id: 'leyaana',
    title: 'ليا أنا',
    summary: 'آيتك الأسبوعية والشهرية، أسماء الله، وبركات مكتوبة ليك',
    icon: Sparkles,
  },
  {
    id: 'memorize',
    title: 'حفظ الآيات',
    summary: 'راجع آياتك المحفوظة في وقتها من غير ما تنسى',
    icon: BookOpen,
  },
  {
    id: 'intercession',
    title: 'تشفع',
    summary: 'افتكر الناس اللي بتصلي لأجلهم كل يوم',
    icon: HeartHandshake,
  },
  {
    id: 'gratitude',
    title: 'دفتر الشكر',
    summary: 'اكتب سطر شكر يومي يثبّت قلبك على نعمة ربنا',
    icon: NotebookPen,
  },
] as const;

type OnboardingStep = 1 | 2 | 3;

function loadLiveVerses(): StarterVerseItem[] {
  return db
    .select({
      id: verses.id,
      ref: verses.ref,
      text: verses.text,
      textFemale: verses.textFemale,
      sortOrder: verses.sortOrder,
      deletedAt: verses.deletedAt,
    })
    .from(verses)
    .where(isNull(verses.deletedAt))
    .orderBy(asc(verses.sortOrder), asc(verses.id))
    .all();
}

function loadFavoriteIdSet(): Set<string> {
  return new Set(listLiveFavoriteIds(db));
}

/**
 * 3-screen RTL Onboarding flow (HOME-01, HOME-02, PERS-01, D-01..D-03):
 * 1. What Ro'i is + 4 core tools
 * 2. Required name + gender (ولد / بنت) persisted to SQLite settings
 * 3. 3-5 personalized starter verses with shuffle, search, ⭐ first win, and skippable Google Sign-In
 */
export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { profile, updateProfile } = useProfile();
  const contentVersion = useContentVersion();
  const { colorScheme } = useColorScheme();
  const accentHex = colorScheme === 'dark' ? '#C2B26B' : '#8B7B3C';

  const [step, setStep] = useState<OnboardingStep>(1);
  const [nameInput, setNameInput] = useState<string>(() => profile.name);
  const [selectedGender, setSelectedGender] = useState<Gender | null>(() =>
    profile.name.trim().length > 0 ? profile.gender : null,
  );
  const [identityError, setIdentityError] = useState<string | null>(null);

  const liveVerses = useMemo(() => {
    void contentVersion;
    return loadLiveVerses();
  }, [contentVersion]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() =>
    loadFavoriteIdSet(),
  );
  const [shuffleTick, setShuffleTick] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [googleDialogOpen, setGoogleDialogOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);

  const firstWinTrackedRef = useRef(false);
  const googleSignInLockRef = useRef(false);

  const effectiveGender: Gender = selectedGender ?? profile.gender;

  const displayedVerses = useMemo(() => {
    if (searchQuery.trim().length > 0) {
      return filterStarterVerses(liveVerses, searchQuery, profile).slice(0, 5);
    }
    return pickStarterVerses(liveVerses, shuffleTick, 4);
  }, [liveVerses, profile, searchQuery, shuffleTick]);

  const completeOnboarding = useCallback(() => {
    setOnboardingCompleted(true);
    try {
      track('onboarding_completed');
    } catch {
      // Telemetry is best-effort and must never block onboarding completion.
    }
    onComplete();
  }, [onComplete]);

  const handleSaveIdentity = useCallback(() => {
    const validation = validateOnboardingIdentity(nameInput, selectedGender);
    if (!validation.valid) {
      setIdentityError(validation.error);
      return;
    }

    setIdentityError(null);
    updateProfile(validation.profile);
    setStep(3);
  }, [nameInput, selectedGender, updateProfile]);

  const handleToggleVerseFavorite = useCallback((verseId: string) => {
    const isNowStarred = toggleFavorite(db, deviceClock, {
      source: 'public',
      kind: 'verse',
      itemId: verseId,
    });
    const favKey = favoriteId('public', 'verse', verseId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (isNowStarred) {
        next.add(favKey);
      } else {
        next.delete(favKey);
      }
      return next;
    });

    if (isNowStarred && !firstWinTrackedRef.current) {
      firstWinTrackedRef.current = true;
      try {
        track('first_win_reached');
      } catch {
        // Best-effort telemetry.
      }
    }
  }, []);

  const handleOpenGoogleDialog = useCallback(() => {
    setGoogleNotice(null);
    setGoogleDialogOpen(true);
  }, []);

  const handleConfirmGoogleSignIn = useCallback(async () => {
    if (googleSignInLockRef.current) {
      return;
    }
    googleSignInLockRef.current = true;
    setIsSigningIn(true);
    setGoogleNotice(null);
    try {
      const result = await signInWithGoogleDriveScope();
      if (result.status === 'success') {
        try {
          track('drive_backup_connected');
        } catch {
          // Best-effort telemetry.
        }
        setGoogleDialogOpen(false);
        completeOnboarding();
        return;
      }

      setGoogleDialogOpen(false);
      setGoogleNotice(uiCopy('onboardingGoogleError', profile.gender));
    } finally {
      googleSignInLockRef.current = false;
      setIsSigningIn(false);
    }
  }, [completeOnboarding, profile.gender]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1 bg-background"
          contentContainerClassName="flex-grow gap-6 px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View
            accessibilityLabel={`الخطوة ${toArabicDigits(step)} من ٣`}
            className="flex-row items-center justify-center gap-2"
          >
            {([1, 2, 3] as const).map((stepNumber) => {
              const isActive = step === stepNumber;
              return (
                <View
                  key={stepNumber}
                  className={`h-8 min-w-[32px] items-center justify-center rounded-full px-2 ${
                    isActive ? 'bg-accent' : 'bg-muted'
                  }`}
                >
                  <Text
                    className={`text-sm font-bold ${
                      isActive ? 'text-accent-foreground' : 'text-muted-foreground'
                    }`}
                  >
                    {toArabicDigits(stepNumber)}
                  </Text>
                </View>
              );
            })}
          </View>

          {step === 1 ? (
            <View className="flex-1 justify-between gap-8">
              <View className="gap-6">
                <View className="items-center gap-2 pt-4">
                  <Text
                    accessibilityRole="header"
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                    className="text-center text-3xl font-bold text-foreground"
                  >
                    روعي
                  </Text>
                  <Text className="text-center text-base text-muted-foreground">
                    {uiCopy('onboarding1Tagline', 'male')}
                  </Text>
                </View>

                <View className="gap-4">
                  {TOOL_PREVIEWS.map((tool) => (
                    <View
                      key={tool.id}
                      className="flex-row items-center gap-4 rounded-2xl border border-border bg-card p-4"
                    >
                      <View className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-muted">
                        <Icon
                          as={tool.icon}
                          size={22}
                          className="text-accent"
                        />
                      </View>
                      <View className="flex-1 gap-1">
                        <Text className="text-start text-base font-bold text-foreground">
                          {tool.title}
                        </Text>
                        <Text className="text-start text-sm text-muted-foreground">
                          {tool.summary}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              <Pressable
                onPress={() => setStep(2)}
                accessibilityRole="button"
                accessibilityLabel="ابدأ الرحلة"
                className="min-h-[44px] w-full items-center justify-center rounded-xl bg-primary px-6 py-4"
              >
                <Text className="text-sm font-bold text-primary-foreground">
                  ابدأ الرحلة
                </Text>
              </Pressable>
            </View>
          ) : null}

          {step === 2 ? (
            <View className="flex-1 justify-between gap-8">
              <View className="gap-6">
                <View className="gap-2">
                  <Text
                    accessibilityRole="header"
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                    className="text-start text-xl font-bold text-foreground"
                  >
                    {uiCopy('onboarding2Heading', effectiveGender)}
                  </Text>
                  <Text className="text-start text-base text-muted-foreground">
                    {uiCopy('onboarding2Subtext', effectiveGender)}
                  </Text>
                </View>

                <View className="gap-2">
                  <Text className="text-start text-sm font-bold text-foreground">
                    الاسم
                  </Text>
                  <TextInput
                    value={nameInput}
                    onChangeText={(value) => {
                      setNameInput(value);
                      if (identityError) {
                        setIdentityError(null);
                      }
                    }}
                    placeholder={uiCopy(
                      'onboarding2NamePlaceholder',
                      effectiveGender,
                    )}
                    placeholderTextColor="#7A7060"
                    autoCapitalize="words"
                    returnKeyType="done"
                    accessibilityLabel="الاسم"
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                    className="min-h-[44px] rounded-xl border border-input bg-card p-4 text-start text-base text-foreground"
                  />
                </View>

                <View className="gap-2">
                  <Text className="text-start text-sm font-bold text-foreground">
                    النوع
                  </Text>
                  <View
                    accessibilityRole="radiogroup"
                    accessibilityLabel="النوع"
                    className="flex-row gap-4"
                  >
                    {(
                      [
                        { value: 'male', label: 'ولد' },
                        { value: 'female', label: 'بنت' },
                      ] as const
                    ).map((option) => {
                      const isSelected = selectedGender === option.value;
                      return (
                        <Pressable
                          key={option.value}
                          onPress={() => {
                            setSelectedGender(option.value);
                            if (identityError) {
                              setIdentityError(null);
                            }
                          }}
                          accessibilityRole="radio"
                          accessibilityLabel={option.label}
                          accessibilityState={{ checked: isSelected }}
                          className={`min-h-[44px] flex-1 items-center justify-center rounded-xl border p-4 ${
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-border bg-card'
                          }`}
                        >
                          <Text
                            className={`text-base font-bold ${
                              isSelected
                                ? 'text-primary-foreground'
                                : 'text-foreground'
                            }`}
                          >
                            {option.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {identityError ? (
                  <Text className="text-start text-sm text-destructive">
                    {identityError}
                  </Text>
                ) : null}
              </View>

              <Pressable
                onPress={handleSaveIdentity}
                accessibilityRole="button"
                accessibilityLabel={uiCopy('onboarding2Cta', effectiveGender)}
                className="min-h-[44px] w-full items-center justify-center rounded-xl bg-primary px-6 py-4"
              >
                <Text className="text-sm font-bold text-primary-foreground">
                  {uiCopy('onboarding2Cta', effectiveGender)}
                </Text>
              </Pressable>
            </View>
          ) : null}

          {step === 3 ? (
            <View className="flex-1 justify-between gap-6">
              <View className="gap-4">
                <View className="gap-2">
                  <Text
                    accessibilityRole="header"
                    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                    className="text-start text-xl font-bold text-foreground"
                  >
                    {`${uiCopy('onboarding3HeadingPrefix', profile.gender)}${profile.name}`}
                  </Text>
                  <Text className="text-start text-sm text-muted-foreground">
                    {uiCopy('onboarding3Helper', profile.gender)}
                  </Text>
                </View>

                <View className="flex-row items-center gap-2">
                  <View className="flex-1 flex-row items-center gap-2 rounded-xl border border-input bg-card px-4">
                    <Icon
                      as={Search}
                      size={18}
                      className="text-muted-foreground"
                    />
                    <TextInput
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      placeholder="ابحث في الآيات..."
                      placeholderTextColor="#7A7060"
                      accessibilityLabel="ابحث في الآيات"
                      maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                      className="min-h-[44px] flex-1 py-2 text-start text-base text-foreground"
                    />
                  </View>

                  <Pressable
                    onPress={() => setShuffleTick((prev) => prev + 1)}
                    accessibilityRole="button"
                    accessibilityLabel="آيات تانية"
                    className="min-h-[44px] flex-row items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2"
                  >
                    <Icon as={Shuffle} size={16} className="text-foreground" />
                    <Text className="text-sm font-bold text-foreground">
                      آيات تانية
                    </Text>
                  </Pressable>
                </View>

                {displayedVerses.length === 0 ? (
                  <View className="gap-2 rounded-2xl border border-border bg-card p-4">
                    <Text className="text-start text-base font-bold text-foreground">
                      مفيش نتائج مطابقة
                    </Text>
                    <Text className="text-start text-sm text-muted-foreground">
                      {uiCopy('leyaanaEmptySearchBody', profile.gender)}
                    </Text>
                  </View>
                ) : (
                  <View className="gap-4">
                    {displayedVerses.map((verse) => {
                      const favKey = favoriteId('public', 'verse', verse.id);
                      const isFavorited = favoriteIds.has(favKey);
                      return (
                        <View
                          key={verse.id}
                          className="gap-2 rounded-2xl border border-border bg-card p-4"
                        >
                          <Scripture className="text-start">
                            {personalize(
                              {
                                text: verse.text,
                                textFemale: verse.textFemale,
                              },
                              profile,
                            )}
                          </Scripture>
                          <View className="flex-row items-center justify-between gap-2">
                            <Text className="flex-1 text-start text-sm text-muted-foreground">
                              {verse.ref}
                            </Text>
                            <Pressable
                              onPress={() =>
                                handleToggleVerseFavorite(verse.id)
                              }
                              accessibilityRole="button"
                              accessibilityLabel={
                                isFavorited
                                  ? 'إزالة من المفضلة'
                                  : 'أضف للمفضلة'
                              }
                              accessibilityState={{ selected: isFavorited }}
                              className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
                            >
                              <Icon
                                as={Star}
                                size={22}
                                className={
                                  isFavorited
                                    ? 'text-accent'
                                    : 'text-muted-foreground'
                                }
                                fill={isFavorited ? accentHex : 'none'}
                              />
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              <View className="gap-3 pt-2">
                {googleNotice ? (
                  <Text className="text-start text-sm text-destructive">
                    {googleNotice}
                  </Text>
                ) : null}

                <Pressable
                  onPress={handleOpenGoogleDialog}
                  accessibilityRole="button"
                  accessibilityLabel="استمر باستخدام جوجل"
                  className="min-h-[44px] w-full items-center justify-center rounded-xl bg-primary px-6 py-4"
                >
                  <Text className="text-sm font-bold text-primary-foreground">
                    استمر باستخدام جوجل
                  </Text>
                </Pressable>

                <Pressable
                  onPress={completeOnboarding}
                  accessibilityRole="button"
                  accessibilityLabel="استمر بدون تسجيل"
                  className="min-h-[44px] items-center justify-center self-center px-4 py-2"
                >
                  <Text className="text-sm text-muted-foreground underline">
                    استمر بدون تسجيل
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <Dialog open={googleDialogOpen} onOpenChange={setGoogleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-start">ربط حساب جوجل</DialogTitle>
            <DialogDescription className="text-start">
              {uiCopy('onboarding3GoogleDialogBody', profile.gender)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Pressable
              onPress={() => setGoogleDialogOpen(false)}
              disabled={isSigningIn}
              accessibilityRole="button"
              accessibilityLabel="إغلاق النافذة"
              className="min-h-[44px] items-center justify-center rounded-xl border border-border bg-card px-4 py-3"
            >
              <Text className="text-sm font-bold text-foreground">
                إغلاق النافذة
              </Text>
            </Pressable>
            <Pressable
              onPress={handleConfirmGoogleSignIn}
              disabled={isSigningIn}
              accessibilityRole="button"
              accessibilityLabel="متابعة مع جوجل"
              accessibilityState={{ disabled: isSigningIn }}
              className="min-h-[44px] flex-row items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3"
            >
              {isSigningIn ? (
                <ActivityIndicator size="small" />
              ) : null}
              <Text className="text-sm font-bold text-primary-foreground">
                متابعة مع جوجل
              </Text>
            </Pressable>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SafeAreaView>
  );
}
