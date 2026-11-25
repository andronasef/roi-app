import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Heart,
  HelpCircle,
  MessageCircle,
  Share2,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
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
import { ROUTES, SUPPORT_URLS } from '../../constants/app';
import {
  MAX_FONT_SIZE_MULTIPLIER,
  type ThemePreference,
} from '../../constants/theme';
import { useThemePreference } from '../../hooks/use-theme-preference';
import ar from '../../locales/ar.json';
import { track } from '../../services/telemetry';
import {
  getGoogleAccountStatus,
  requestGoogleDriveScopeUpgrade,
  signInWithGoogleDriveScope,
  type GoogleAccountStatus,
} from '../google/auth';
import { useProfile } from '../profile/context';
import type { Gender } from '../profile/repository';
import { uiCopy } from '../profile/ui-copy';
import { Scripture, ScriptureSizeSlider } from '../scripture/scripture';
import {
  buildShareMessage,
  formatAppVersionLabel,
  openSupportUrl,
  validateSettingsProfile,
} from './support';

const THEME_OPTIONS_UI: readonly { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'تلقائي' },
  { value: 'light', label: ar.themeLight },
  { value: 'dark', label: ar.themeDark },
] as const;

const SCRIPTURE_PREVIEW_SAMPLE = 'اَلرَّبُّ رَاعِيَّ فَلاَ يُعْوِزُنِي شَيْءٌ.';

/**
 * Grouped-card Global Settings screen (SET-01, PERS-01, PERS-04, D-14):
 * - المظهر والقراءة: theme mode + 5-step ScriptureSizeSlider + live <Scripture> preview
 * - حسابك: editable name + gender immediately refreshing app UI/content + Google drive.appdata connect
 * - المساعدة والتواصل: Share.share, Rate, Support form, WhatsApp
 * - About footer with Arabic-Indic app version
 */
export function SettingsScreen() {
  const router = useRouter();
  const { theme, setTheme } = useThemePreference();
  const { profile, updateProfile, refreshProfile } = useProfile();

  const [nameInput, setNameInput] = useState<string>(profile.name);
  const [genderInput, setGenderInput] = useState<Gender>(profile.gender);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSavedNotice, setProfileSavedNotice] = useState(false);

  const [googleStatus, setGoogleStatus] = useState<GoogleAccountStatus>({
    signedIn: false,
    email: null,
    hasDriveScope: false,
  });
  const [googleDialogOpen, setGoogleDialogOpen] = useState(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [googleNotice, setGoogleNotice] = useState<string | null>(null);

  const [supportNotice, setSupportNotice] = useState<string | null>(null);
  const [isRunningSupportAction, setIsRunningSupportAction] = useState(false);

  const googleConnectLockRef = useRef(false);
  const supportActionLockRef = useRef(false);

  const loadGoogleStatus = useCallback(async () => {
    const status = await getGoogleAccountStatus();
    setGoogleStatus(status);
  }, []);

  useEffect(() => {
    setNameInput(profile.name);
    setGenderInput(profile.gender);
  }, [profile.name, profile.gender]);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      let active = true;
      void getGoogleAccountStatus().then((status) => {
        if (active) {
          setGoogleStatus(status);
        }
      });
      return () => {
        active = false;
      };
    }, [refreshProfile]),
  );

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(ROUTES.home);
    }
  }, [router]);

  const handleSaveProfile = useCallback(() => {
    const validation = validateSettingsProfile(nameInput, genderInput);
    if (!validation.valid) {
      setProfileSavedNotice(false);
      setProfileError(validation.error);
      return;
    }

    setProfileError(null);
    updateProfile(validation.profile);
    setNameInput(validation.profile.name);
    setGenderInput(validation.profile.gender);
    setProfileSavedNotice(true);
  }, [genderInput, nameInput, updateProfile]);

  const handleOpenGoogleDialog = useCallback(() => {
    if (googleConnectLockRef.current) {
      return;
    }
    setGoogleNotice(null);
    setGoogleDialogOpen(true);
  }, []);

  const handleConfirmGoogleConnect = useCallback(async () => {
    if (googleConnectLockRef.current) {
      return;
    }
    googleConnectLockRef.current = true;
    setIsConnectingGoogle(true);
    setGoogleNotice(null);

    try {
      const result = googleStatus.signedIn
        ? await requestGoogleDriveScopeUpgrade()
        : await signInWithGoogleDriveScope();

      if (result.status === 'success') {
        try {
          track('drive_backup_connected');
        } catch {
          // Best-effort telemetry; never pass email or profile fields.
        }
        await loadGoogleStatus();
        setGoogleDialogOpen(false);
        return;
      }

      setGoogleDialogOpen(false);
      setGoogleNotice(uiCopy('onboardingGoogleError', profile.gender));
    } finally {
      googleConnectLockRef.current = false;
      setIsConnectingGoogle(false);
    }
  }, [googleStatus.signedIn, loadGoogleStatus, profile.gender]);

  const handleShareApp = useCallback(async () => {
    if (supportActionLockRef.current) {
      return;
    }
    supportActionLockRef.current = true;
    setIsRunningSupportAction(true);
    setSupportNotice(null);

    try {
      await Share.share({
        message: buildShareMessage(SUPPORT_URLS.share),
      });
    } catch {
      setSupportNotice('تعذر فتح نافذة المشاركة دلوقتي — جرّب تاني بعد شوية');
    } finally {
      supportActionLockRef.current = false;
      setIsRunningSupportAction(false);
    }
  }, []);

  const handleOpenExternal = useCallback(async (url: string) => {
    if (supportActionLockRef.current) {
      return;
    }
    supportActionLockRef.current = true;
    setIsRunningSupportAction(true);
    setSupportNotice(null);

    try {
      const result = await openSupportUrl(url);
      if (!result.ok) {
        setSupportNotice('تعذر فتح الرابط دلوقتي — تأكد من الاتصال وحاول تاني');
      }
    } finally {
      supportActionLockRef.current = false;
      setIsRunningSupportAction(false);
    }
  }, []);

  const appVersionLabel = formatAppVersionLabel(
    Constants.expoConfig?.version ?? '0.1.0',
  );
  const isGoogleConnected = googleStatus.signedIn && googleStatus.hasDriveScope;

  const supportRows = [
    {
      id: 'share',
      label: uiCopy('settingsShareCta', profile.gender),
      icon: Share2,
      onPress: handleShareApp,
    },
    {
      id: 'rate',
      label: uiCopy('settingsRateCta', profile.gender),
      icon: Heart,
      onPress: () => void handleOpenExternal(SUPPORT_URLS.rate),
    },
    {
      id: 'help',
      label: uiCopy('settingsHelpCta', profile.gender),
      icon: HelpCircle,
      onPress: () => void handleOpenExternal(SUPPORT_URLS.support),
    },
    {
      id: 'whatsapp',
      label: ar.settingsWhatsapp,
      icon: MessageCircle,
      onPress: () => void handleOpenExternal(SUPPORT_URLS.whatsapp),
    },
  ] as const;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-row items-center gap-3 px-6 py-4">
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="ارجع للشاشة الرئيسية"
            className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-card"
          >
            <Icon as={ArrowRight} size={20} className="text-foreground" />
          </Pressable>
          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            className="text-start text-xl font-bold text-foreground"
          >
            {ar.settingsTitle}
          </Text>
        </View>

        <ScrollView
          className="flex-1 bg-background"
          contentContainerClassName="gap-6 px-6 pb-10 pt-2"
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: المظهر والقراءة */}
          <View className="gap-3">
            <Text
              accessibilityRole="header"
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="text-start text-xl font-bold text-foreground"
            >
              {ar.settingsAppearanceSection}
            </Text>

            <View className="gap-4 rounded-2xl border border-border bg-card p-4">
              <View className="gap-2">
                <Text className="text-start text-sm font-bold text-foreground">
                  {ar.themeLabel}
                </Text>
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel={ar.themeLabel}
                  className="flex-row gap-2"
                >
                  {THEME_OPTIONS_UI.map((option) => {
                    const isSelected = theme === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => setTheme(option.value)}
                        accessibilityRole="radio"
                        accessibilityLabel={option.label}
                        accessibilityState={{ checked: isSelected }}
                        className={`min-h-[44px] flex-1 items-center justify-center rounded-xl border px-3 py-2 ${
                          isSelected
                            ? 'border-primary bg-primary'
                            : 'border-border bg-background'
                        }`}
                      >
                        <Text
                          className={`text-sm font-bold ${
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

              <View className="gap-2 border-t border-border pt-4">
                <Text className="text-start text-sm font-bold text-foreground">
                  {ar.scriptureSizeLabel}
                </Text>
                <ScriptureSizeSlider />
                <View className="rounded-xl border border-border bg-background p-4">
                  <Scripture numberOfLines={1} className="text-start">
                    {SCRIPTURE_PREVIEW_SAMPLE}
                  </Scripture>
                </View>
              </View>
            </View>
          </View>

          {/* Section 2: حسابك */}
          <View className="gap-3">
            <Text
              accessibilityRole="header"
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="text-start text-xl font-bold text-foreground"
            >
              {ar.settingsAccountSection}
            </Text>

            <View className="gap-4 rounded-2xl border border-border bg-card p-4">
              <Text className="text-start text-sm text-muted-foreground">
                {uiCopy('settingsEditPrompt', profile.gender)}
              </Text>

              <View className="gap-2">
                <Text className="text-start text-sm font-bold text-foreground">
                  {ar.settingsNameLabel}
                </Text>
                <TextInput
                  value={nameInput}
                  onChangeText={(value) => {
                    setNameInput(value);
                    if (profileError) {
                      setProfileError(null);
                    }
                    if (profileSavedNotice) {
                      setProfileSavedNotice(false);
                    }
                  }}
                  placeholder={uiCopy('onboarding2NamePlaceholder', genderInput)}
                  placeholderTextColor="#7A7060"
                  autoCapitalize="words"
                  returnKeyType="done"
                  accessibilityLabel={ar.settingsNameLabel}
                  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                  className="min-h-[44px] rounded-xl border border-input bg-background p-4 text-start text-base text-foreground"
                />
              </View>

              <View className="gap-2">
                <Text className="text-start text-sm font-bold text-foreground">
                  {ar.settingsGenderLabel}
                </Text>
                <View
                  accessibilityRole="radiogroup"
                  accessibilityLabel={ar.settingsGenderLabel}
                  className="flex-row gap-4"
                >
                  {(
                    [
                      { value: 'male', label: ar.settingsGenderMale },
                      { value: 'female', label: ar.settingsGenderFemale },
                    ] as const
                  ).map((option) => {
                    const isSelected = genderInput === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => {
                          setGenderInput(option.value);
                          if (profileError) {
                            setProfileError(null);
                          }
                          if (profileSavedNotice) {
                            setProfileSavedNotice(false);
                          }
                        }}
                        accessibilityRole="radio"
                        accessibilityLabel={option.label}
                        accessibilityState={{ checked: isSelected }}
                        className={`min-h-[44px] flex-1 items-center justify-center rounded-xl border p-4 ${
                          isSelected
                            ? 'border-primary bg-primary'
                            : 'border-border bg-background'
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

              {profileError ? (
                <Text className="text-start text-sm text-destructive">
                  {profileError}
                </Text>
              ) : null}

              {profileSavedNotice ? (
                <Text className="text-start text-sm font-bold text-accent">
                  تم حفظ التعديلات
                </Text>
              ) : null}

              <Pressable
                onPress={handleSaveProfile}
                accessibilityRole="button"
                accessibilityLabel={ar.settingsSaveChanges}
                className="min-h-[44px] items-center justify-center rounded-xl bg-primary px-6 py-4"
              >
                <Text className="text-sm font-bold text-primary-foreground">
                  {ar.settingsSaveChanges}
                </Text>
              </Pressable>

              <View className="gap-3 border-t border-border pt-4">
                {isGoogleConnected ? (
                  <View className="flex-row items-center gap-3 rounded-xl border border-border bg-background p-4">
                    <Icon
                      as={CheckCircle2}
                      size={20}
                      className="text-accent"
                    />
                    <View className="flex-1 gap-1">
                      <Text className="text-start text-sm font-bold text-accent">
                        {ar.settingsGoogleConnected}
                      </Text>
                      {googleStatus.email ? (
                        <Text className="text-start text-sm text-muted-foreground">
                          {googleStatus.email}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                ) : (
                  <View className="gap-3">
                    <Text className="text-start text-sm text-muted-foreground">
                      {uiCopy('settingsGoogleConnectHint', profile.gender)}
                    </Text>

                    {googleNotice ? (
                      <Text className="text-start text-sm text-destructive">
                        {googleNotice}
                      </Text>
                    ) : null}

                    <Pressable
                      onPress={handleOpenGoogleDialog}
                      disabled={isConnectingGoogle}
                      accessibilityRole="button"
                      accessibilityLabel={ar.settingsConnectGoogle}
                      accessibilityState={{ disabled: isConnectingGoogle }}
                      className="min-h-[44px] flex-row items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3"
                    >
                      {isConnectingGoogle ? (
                        <ActivityIndicator size="small" />
                      ) : null}
                      <Text className="text-sm font-bold text-foreground">
                        {ar.settingsConnectGoogle}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Section 3: المساعدة والتواصل */}
          <View className="gap-3">
            <Text
              accessibilityRole="header"
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="text-start text-xl font-bold text-foreground"
            >
              {ar.settingsSupportSection}
            </Text>

            <View className="rounded-2xl border border-border bg-card">
              {supportRows.map((row, index) => {
                const isLast = index === supportRows.length - 1;
                return (
                  <Pressable
                    key={row.id}
                    onPress={row.onPress}
                    disabled={isRunningSupportAction}
                    accessibilityRole="button"
                    accessibilityLabel={row.label}
                    accessibilityState={{ disabled: isRunningSupportAction }}
                    className={`min-h-[44px] flex-row items-center justify-between gap-3 px-4 py-3 ${
                      isLast ? '' : 'border-b border-border'
                    }`}
                  >
                    <View className="flex-1 flex-row items-center gap-3">
                      <Icon as={row.icon} size={20} className="text-accent" />
                      <Text className="text-start text-base text-foreground">
                        {row.label}
                      </Text>
                    </View>
                    <Icon
                      as={ExternalLink}
                      size={16}
                      className="text-muted-foreground"
                    />
                  </Pressable>
                );
              })}
            </View>

            {supportNotice ? (
              <Text className="text-start text-sm text-destructive">
                {supportNotice}
              </Text>
            ) : null}
          </View>

          {/* About Footer */}
          <Text className="pt-2 text-center text-sm text-muted-foreground">
            {appVersionLabel}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Dialog open={googleDialogOpen} onOpenChange={setGoogleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-start">
              {ar.settingsConnectGoogle}
            </DialogTitle>
            <DialogDescription className="text-start">
              {uiCopy('onboarding3GoogleDialogBody', profile.gender)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Pressable
              onPress={() => setGoogleDialogOpen(false)}
              disabled={isConnectingGoogle}
              accessibilityRole="button"
              accessibilityLabel="إغلاق النافذة"
              accessibilityState={{ disabled: isConnectingGoogle }}
              className="min-h-[44px] items-center justify-center rounded-xl border border-border bg-card px-4 py-3"
            >
              <Text className="text-sm font-bold text-foreground">
                إغلاق النافذة
              </Text>
            </Pressable>
            <Pressable
              onPress={handleConfirmGoogleConnect}
              disabled={isConnectingGoogle}
              accessibilityRole="button"
              accessibilityLabel="متابعة مع جوجل"
              accessibilityState={{ disabled: isConnectingGoogle }}
              className="min-h-[44px] flex-row items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3"
            >
              {isConnectingGoogle ? <ActivityIndicator size="small" /> : null}
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
