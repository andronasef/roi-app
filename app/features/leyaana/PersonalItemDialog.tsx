import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  submitSuggestionInputSchema,
  type ContentKind,
} from '@roi/shared';
import * as Network from 'expo-network';
import {
  Copy,
  Edit3,
  Plus,
  Send,
  Star,
  Trash2,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

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
import ar from '../../locales/ar.json';
import { db, deviceClock } from '../db/client';
import {
  getGoogleSessionToken,
  signInWithGoogleDriveScope,
} from '../google/auth';
import type { Gender } from '../profile/repository';
import { uiCopy } from '../profile/ui-copy';
import { Scripture } from '../scripture/scripture';
import {
  createSyncApiClient,
  SuggestionSubmitError,
} from '../sync/api';
import { favoriteId } from './assignments';
import {
  createPersonalItem,
  toSuggestionInput,
  updatePersonalItem,
  type PersonalItemRow,
} from './personal-items';

const KIND_OPTIONS: readonly { id: ContentKind; label: string }[] = [
  { id: 'verse', label: 'آية' },
  { id: 'name_of_god', label: 'اسم من أسماء الله' },
  { id: 'blessing', label: 'بركة' },
];

export interface SuggestFeedback {
  type: 'success' | 'error';
  message: string;
  itemId: string;
}

const SUGGEST_SUCCESS_MESSAGE =
  'تم إرسال اقتراحك للمراجعة — شكراً لمشاركتك';
const DAILY_LIMIT_MESSAGE =
  'وصلت للحد اليومي للاقتراحات النهاردة — جرّب تاني بكرة';
const RATE_LIMIT_MESSAGE =
  'بعتّ اقتراحات كتير في وقت قصير — استنى دقيقة وجرّب تاني';

function mapSuggestionErrorMessage(
  err: unknown,
  gender: Gender,
): string {
  if (err instanceof SuggestionSubmitError) {
    if (err.code === 'daily_limit') {
      return DAILY_LIMIT_MESSAGE;
    }
    if (err.code === 'rate_limited') {
      return RATE_LIMIT_MESSAGE;
    }
    if (err.code === 'validation') {
      return err.message;
    }
  }
  return uiCopy('leyaanaSuggestSubmitError', gender);
}

/**
 * Shared hook orchestrating "اقترح للكل" (ME-09, D-12):
 * checks connectivity, prompts inline Google Sign-In when unauthenticated,
 * and submits via SyncApiClient.submitSuggestion with calm error handling.
 */
export function usePersonalSuggestion(gender: Gender) {
  const [suggestingItemId, setSuggestingItemId] = useState<string | null>(null);
  const [signInDialogItem, setSignInDialogItem] =
    useState<PersonalItemRow | null>(null);
  const [signInSubmitting, setSignInSubmitting] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [suggestFeedback, setSuggestFeedback] =
    useState<SuggestFeedback | null>(null);

  const submitWithToken = useCallback(
    async (item: PersonalItemRow, idToken: string): Promise<boolean> => {
      const api = createSyncApiClient();
      const payload = toSuggestionInput(item);
      await api.submitSuggestion(payload, idToken);
      setSuggestFeedback({
        type: 'success',
        message: SUGGEST_SUCCESS_MESSAGE,
        itemId: item.id,
      });
      return true;
    },
    [],
  );

  const handleSuggest = useCallback(
    async (item: PersonalItemRow) => {
      if (suggestingItemId !== null) {
        return;
      }
      setSuggestFeedback(null);
      setSignInError(null);

      try {
        const net = await Network.getNetworkStateAsync();
        if (!net.isConnected || net.isInternetReachable === false) {
          setSuggestFeedback({
            type: 'error',
            message: uiCopy('leyaanaSuggestOfflineError', gender),
            itemId: item.id,
          });
          return;
        }
      } catch {
        // Proceed if network probe itself throws; fetch will handle offline errors.
      }

      setSuggestingItemId(item.id);
      try {
        const session = await getGoogleSessionToken();
        if (session.status === 'unauthenticated') {
          setSignInDialogItem(item);
          return;
        }
        if (session.status === 'error') {
          setSuggestFeedback({
            type: 'error',
            message: uiCopy('onboardingGoogleError', gender),
            itemId: item.id,
          });
          return;
        }

        try {
          await submitWithToken(item, session.idToken);
        } catch (err) {
          if (
            err instanceof SuggestionSubmitError &&
            err.code === 'unauthenticated'
          ) {
            try {
              const refreshed = await GoogleSignin.getTokens();
              if (
                typeof refreshed.idToken === 'string' &&
                refreshed.idToken.trim().length > 0
              ) {
                await submitWithToken(item, refreshed.idToken);
                return;
              }
            } catch {
              // Fall through to inline Google Sign-In dialog
            }
            setSignInDialogItem(item);
            return;
          }

          setSuggestFeedback({
            type: 'error',
            message: mapSuggestionErrorMessage(err, gender),
            itemId: item.id,
          });
        }
      } finally {
        setSuggestingItemId(null);
      }
    },
    [gender, submitWithToken, suggestingItemId],
  );

  const handleConfirmSignInAndSubmit = useCallback(async () => {
    if (!signInDialogItem || signInSubmitting) {
      return;
    }
    const targetItem = signInDialogItem;
    setSignInSubmitting(true);
    setSignInError(null);

    try {
      const result = await signInWithGoogleDriveScope();
      if (result.status !== 'success') {
        setSignInError(uiCopy('onboardingGoogleError', gender));
        return;
      }

      await submitWithToken(targetItem, result.idToken);
      setSignInDialogItem(null);
    } catch (err) {
      setSignInError(mapSuggestionErrorMessage(err, gender));
    } finally {
      setSignInSubmitting(false);
    }
  }, [gender, signInDialogItem, signInSubmitting, submitWithToken]);

  return {
    suggestingItemId,
    signInDialogItem,
    setSignInDialogItem,
    signInSubmitting,
    signInError,
    setSignInError,
    suggestFeedback,
    handleSuggest,
    handleConfirmSignInAndSubmit,
  };
}

export interface PersonalItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialKind: ContentKind;
  editingItem: PersonalItemRow | null;
  gender: Gender;
  onSaved: () => void;
}

/**
 * Plain-text create/edit dialog for local personal items across all 3 kinds (ME-08, D-11).
 * Exposes zero {الاسم} tokens or Markdown syntax controls.
 */
export function PersonalItemDialog({
  open,
  onOpenChange,
  initialKind,
  editingItem,
  gender,
  onSaved,
}: PersonalItemDialogProps) {
  const [kind, setKind] = useState<ContentKind>(initialKind);
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [verseRef, setVerseRef] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setKind(editingItem?.kind ?? initialKind);
      setTitle(editingItem?.title ?? '');
      setText(editingItem?.text ?? '');
      setVerseRef(editingItem?.verseRef ?? '');
      setError(null);
    }
  }, [editingItem, initialKind, open]);

  const isEditing = editingItem !== null;
  const titleLabel =
    kind === 'verse' ? ar.personalItemRefLabel : ar.personalItemTitleLabel;

  const handleSave = () => {
    const trimmedTitle = title.trim();
    const trimmedText = text.trim();
    const trimmedVerseRef = verseRef.trim();

    if (!trimmedTitle || !trimmedText) {
      setError(uiCopy('leyaanaPersonalFormEmptyError', gender));
      return;
    }

    const parsed = submitSuggestionInputSchema.safeParse({
      kind,
      title: trimmedTitle,
      text: trimmedText,
      ...(kind === 'blessing' && trimmedVerseRef
        ? { verseRef: trimmedVerseRef }
        : {}),
    });

    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ??
          uiCopy('leyaanaPersonalFormEmptyError', gender),
      );
      return;
    }

    try {
      if (editingItem) {
        updatePersonalItem(db, deviceClock, {
          id: editingItem.id,
          title: trimmedTitle,
          text: trimmedText,
          verseRef: kind === 'blessing' ? trimmedVerseRef || null : null,
        });
      } else {
        createPersonalItem(db, deviceClock, {
          kind,
          title: trimmedTitle,
          text: trimmedText,
          verseRef: kind === 'blessing' ? trimmedVerseRef || null : null,
        });
      }
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : uiCopy('leyaanaPersonalFormEmptyError', gender),
      );
    }
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
              {isEditing ? 'تعديل عنصر شخصي' : 'إضافة عنصر شخصي'}
            </DialogTitle>
          </DialogHeader>

          <View className="flex-row flex-wrap gap-2">
            {KIND_OPTIONS.map((option) => {
              const isSelected = kind === option.id;
              return (
                <Pressable
                  key={option.id}
                  disabled={isEditing}
                  onPress={() => {
                    setKind(option.id);
                    setError(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{
                    selected: isSelected,
                    disabled: isEditing,
                  }}
                  className={`min-h-[44px] items-center justify-center rounded-xl border px-3 py-2 ${
                    isSelected
                      ? 'border-primary bg-primary'
                      : 'border-border bg-card'
                  } ${isEditing && !isSelected ? 'opacity-50' : ''}`}
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

          <View className="gap-2">
            <Text className="text-start text-sm font-bold text-foreground">
              {titleLabel}
            </Text>
            <TextInput
              value={title}
              onChangeText={(value) => {
                setTitle(value);
                if (error) setError(null);
              }}
              placeholder={titleLabel}
              placeholderTextColor="#7A7060"
              accessibilityLabel={titleLabel}
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="min-h-[44px] rounded-xl border border-input bg-card px-4 py-3 text-start text-base text-foreground"
            />
          </View>

          <View className="gap-2">
            <Text className="text-start text-sm font-bold text-foreground">
              {ar.personalItemTextLabel}
            </Text>
            <TextInput
              value={text}
              onChangeText={(value) => {
                setText(value);
                if (error) setError(null);
              }}
              placeholder={ar.personalItemTextLabel}
              placeholderTextColor="#7A7060"
              accessibilityLabel={ar.personalItemTextLabel}
              multiline
              textAlignVertical="top"
              maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
              className="min-h-[112px] rounded-xl border border-input bg-card px-4 py-3 text-start text-base text-foreground"
            />
          </View>

          {kind === 'blessing' ? (
            <View className="gap-2">
              <Text className="text-start text-sm font-bold text-foreground">
                {ar.personalItemVerseRefLabel}
              </Text>
              <TextInput
                value={verseRef}
                onChangeText={setVerseRef}
                placeholder={ar.personalItemVerseRefLabel}
                placeholderTextColor="#7A7060"
                accessibilityLabel={ar.personalItemVerseRefLabel}
                maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                className="min-h-[44px] rounded-xl border border-input bg-card px-4 py-3 text-start text-base text-foreground"
              />
            </View>
          ) : null}

          {error ? (
            <Text className="text-start text-sm text-destructive">{error}</Text>
          ) : null}

          <DialogFooter className="gap-2 pt-2">
            <Pressable
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel={ar.saveItem}
              className="min-h-[44px] w-full items-center justify-center rounded-xl bg-primary px-6 py-3"
            >
              <Text className="text-sm font-bold text-primary-foreground">
                {ar.saveItem}
              </Text>
            </Pressable>
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

export interface DeletePersonalItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PersonalItemRow | null;
  gender: Gender;
  onConfirmDelete: (item: PersonalItemRow) => void;
}

/** Confirmation dialog for soft-deleting a personal item (ME-08). */
export function DeletePersonalItemDialog({
  open,
  onOpenChange,
  item,
  gender,
  onConfirmDelete,
}: DeletePersonalItemDialogProps) {
  if (!item) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl border border-border bg-background p-6">
        <DialogHeader className="gap-2">
          <DialogTitle
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            className="pe-6 text-start text-xl font-bold leading-snug text-foreground"
          >
            حذف العنصر الشخصي
          </DialogTitle>
          <DialogDescription className="text-start text-base text-muted-foreground">
            {uiCopy('leyaanaDeleteConfirmBody', gender)}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 pt-4">
          <Pressable
            onPress={() => {
              onConfirmDelete(item);
              onOpenChange(false);
            }}
            accessibilityRole="button"
            accessibilityLabel="احذف العنصر"
            className="min-h-[44px] w-full items-center justify-center rounded-xl bg-destructive px-6 py-3"
          >
            <Text className="text-sm font-bold text-destructive-foreground">
              احذف العنصر
            </Text>
          </Pressable>
          <Pressable
            onPress={() => onOpenChange(false)}
            accessibilityRole="button"
            accessibilityLabel="ارجع عن الحذف"
            className="min-h-[44px] w-full items-center justify-center rounded-xl border border-border bg-card px-4 py-3"
          >
            <Text className="text-sm font-bold text-foreground">
              ارجع عن الحذف
            </Text>
          </Pressable>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export interface SuggestSignInDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  errorMessage: string | null;
  onConfirmSignInAndSubmit: () => void;
}

/**
 * Inline Google Sign-In explanation dialog for "اقترح للكل" (ME-09, D-12).
 */
export function SuggestSignInDialog({
  open,
  onOpenChange,
  submitting,
  errorMessage,
  onConfirmSignInAndSubmit,
}: SuggestSignInDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!submitting) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent className="rounded-2xl border border-border bg-background p-6">
        <DialogHeader className="gap-2">
          <DialogTitle
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            className="pe-6 text-start text-xl font-bold leading-snug text-foreground"
          >
            {ar.suggestToAll}
          </DialogTitle>
          <DialogDescription className="text-start text-base text-muted-foreground">
            عشان نراجع الاقتراحات ونمنع السبام، محتاجين نسجّل بحساب جوجل الأول —
            ومن غير ما نرفع أي بيانات شخصية تانية.
          </DialogDescription>
        </DialogHeader>

        {errorMessage ? (
          <Text className="pt-2 text-start text-sm text-destructive">
            {errorMessage}
          </Text>
        ) : null}

        <DialogFooter className="gap-2 pt-4">
          <Pressable
            disabled={submitting}
            onPress={onConfirmSignInAndSubmit}
            accessibilityRole="button"
            accessibilityLabel="سجّل بجوجل وابعت الاقتراح"
            className={`min-h-[44px] w-full flex-row items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 ${
              submitting ? 'opacity-70' : ''
            }`}
          >
            {submitting ? <ActivityIndicator size="small" /> : null}
            <Text className="text-sm font-bold text-primary-foreground">
              سجّل بجوجل وابعت الاقتراح
            </Text>
          </Pressable>
          <Pressable
            disabled={submitting}
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
      </DialogContent>
    </Dialog>
  );
}

export interface PersonalItemsSectionProps {
  items: PersonalItemRow[];
  favoriteIds: Set<string>;
  accentHex: string;
  gender: Gender;
  suggestingItemId: string | null;
  suggestFeedback: SuggestFeedback | null;
  onAddPress: () => void;
  onToggleFavorite: (item: PersonalItemRow) => void;
  onCopy: (item: PersonalItemRow) => void;
  onEdit: (item: PersonalItemRow) => void;
  onDelete: (item: PersonalItemRow) => void;
  onSuggest: (item: PersonalItemRow) => void;
  onPressItem?: (item: PersonalItemRow) => void;
}

/**
 * Reusable "عناصري الشخصية" list section with dedicated empty state,
 * ⭐ favorite toggle, copy/long-press, edit, soft-delete, and "اقترح للكل".
 */
export function PersonalItemsSection({
  items,
  favoriteIds,
  accentHex,
  gender,
  suggestingItemId,
  suggestFeedback,
  onAddPress,
  onToggleFavorite,
  onCopy,
  onEdit,
  onDelete,
  onSuggest,
  onPressItem,
}: PersonalItemsSectionProps) {
  return (
    <View className="gap-3 pt-2">
      <View className="flex-row items-center justify-between gap-2">
        <Text
          accessibilityRole="header"
          maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
          className="text-start text-xl font-bold text-foreground"
        >
          عناصري الشخصية
        </Text>
        <Pressable
          onPress={onAddPress}
          accessibilityRole="button"
          accessibilityLabel="أضف عنصر شخصي"
          className="min-h-[44px] flex-row items-center gap-1 rounded-xl border border-border bg-card px-3 py-2"
        >
          <Icon as={Plus} size={16} className="text-foreground" />
          <Text className="text-sm font-bold text-foreground">
            {ar.addPersonalItem}
          </Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <View className="items-center gap-2 rounded-2xl border border-border bg-card p-6">
          <Text
            accessibilityRole="header"
            maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
            className="text-center text-xl font-bold text-foreground"
          >
            {ar.emptyPersonalTitle}
          </Text>
          <Text className="text-center text-base text-muted-foreground">
            {uiCopy('leyaanaEmptyPersonalBody', gender)}
          </Text>
        </View>
      ) : (
        <View className="gap-3">
          {items.map((item) => {
            const isStarred = favoriteIds.has(
              favoriteId('personal', item.kind, item.id),
            );
            const isSuggesting = suggestingItemId === item.id;
            const itemFeedback =
              suggestFeedback?.itemId === item.id ? suggestFeedback : null;
            const copyA11yLabel =
              item.kind === 'verse'
                ? 'انسخ الآية'
                : item.kind === 'name_of_god'
                  ? 'انسخ الاسم'
                  : 'انسخ البركة';

            return (
              <View
                key={item.id}
                className="gap-3 rounded-2xl border border-border bg-card p-4"
              >
                <Pressable
                  onPress={onPressItem ? () => onPressItem(item) : undefined}
                  onLongPress={() => onCopy(item)}
                  accessibilityRole="button"
                  accessibilityLabel={item.title}
                  className="gap-2"
                >
                  {item.kind === 'verse' ? (
                    <>
                      <Scripture className="text-start">{item.text}</Scripture>
                      <Text className="text-start text-sm text-muted-foreground">
                        {item.title}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text
                        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
                        className="text-start text-xl font-bold text-foreground"
                      >
                        {item.title}
                      </Text>
                      {item.verseRef ? (
                        <Text className="text-start text-sm font-bold text-accent">
                          {item.verseRef}
                        </Text>
                      ) : null}
                      <Text className="text-start text-base text-foreground">
                        {item.text}
                      </Text>
                    </>
                  )}
                </Pressable>

                <View className="flex-row flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                  <Pressable
                    disabled={isSuggesting}
                    onPress={() => onSuggest(item)}
                    accessibilityRole="button"
                    accessibilityLabel={ar.suggestToAll}
                    className={`min-h-[44px] flex-row items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 ${
                      isSuggesting ? 'opacity-70' : ''
                    }`}
                  >
                    {isSuggesting ? (
                      <ActivityIndicator size="small" />
                    ) : (
                      <Icon as={Send} size={16} className="text-accent" />
                    )}
                    <Text className="text-sm font-bold text-foreground">
                      {ar.suggestToAll}
                    </Text>
                  </Pressable>

                  <View className="flex-row items-center gap-1">
                    <Pressable
                      onPress={() => onToggleFavorite(item)}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isStarred ? 'إزالة من المفضلة' : 'أضف للمفضلة'
                      }
                      accessibilityState={{ selected: isStarred }}
                      className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
                    >
                      <Icon
                        as={Star}
                        size={20}
                        color={isStarred ? accentHex : undefined}
                        fill={isStarred ? accentHex : 'transparent'}
                        className={
                          isStarred ? 'text-accent' : 'text-muted-foreground'
                        }
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => onCopy(item)}
                      accessibilityRole="button"
                      accessibilityLabel={copyA11yLabel}
                      className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
                    >
                      <Icon
                        as={Copy}
                        size={20}
                        className="text-muted-foreground"
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => onEdit(item)}
                      accessibilityRole="button"
                      accessibilityLabel="عدّل العنصر الشخصي"
                      className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
                    >
                      <Icon
                        as={Edit3}
                        size={20}
                        className="text-muted-foreground"
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => onDelete(item)}
                      accessibilityRole="button"
                      accessibilityLabel="احذف العنصر الشخصي"
                      className="min-h-[44px] min-w-[44px] items-center justify-center rounded-xl"
                    >
                      <Icon
                        as={Trash2}
                        size={20}
                        className="text-destructive"
                      />
                    </Pressable>
                  </View>
                </View>

                {itemFeedback ? (
                  <Text
                    className={`text-start text-sm ${
                      itemFeedback.type === 'success'
                        ? 'text-accent'
                        : 'text-destructive'
                    }`}
                  >
                    {itemFeedback.message}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
