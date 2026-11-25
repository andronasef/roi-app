import {
  NAME_TOKEN,
  matches,
  personalize,
  type PersonalizeProfile,
} from '@roi/shared';

import type { Gender, UserProfile } from '../profile/repository';
import { uiCopy } from '../profile/ui-copy';

export interface StarterVerseItem {
  readonly id: string;
  readonly ref: string;
  readonly text: string;
  readonly textFemale?: string | null;
  readonly sortOrder?: number | null;
  readonly deletedAt?: number | null;
}

export type OnboardingIdentityValidationResult =
  | { valid: true; profile: UserProfile }
  | { valid: false; error: string };

/**
 * Validate required name (non-blank after trim) and gender selection on Screen 2.
 */
export function validateOnboardingIdentity(
  name: string,
  gender: Gender | null | undefined,
): OnboardingIdentityValidationResult {
  const trimmedName = name.trim();
  const safeGender: Gender = gender === 'female' ? 'female' : 'male';
  if (trimmedName.length === 0 || (gender !== 'male' && gender !== 'female')) {
    return {
      valid: false,
      error: uiCopy('onboarding2MissingError', safeGender),
    };
  }
  return {
    valid: true,
    profile: {
      name: trimmedName,
      gender,
    },
  };
}

function isPersonalizedVerse(verse: StarterVerseItem): boolean {
  return (
    verse.text.includes(NAME_TOKEN) ||
    Boolean(verse.textFemale && verse.textFemale.trim().length > 0)
  );
}

function hashBatchItem(id: string, batchIndex: number): number {
  const seed = `${batchIndex}:${id}`;
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function compareCanonical<T extends StarterVerseItem>(a: T, b: T): number {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  return a.id.localeCompare(b.id);
}

function orderBucket<T extends StarterVerseItem>(
  bucket: readonly T[],
  batchIndex: number,
): T[] {
  const sorted = [...bucket].sort(compareCanonical);
  if (batchIndex <= 0 || sorted.length <= 1) {
    return sorted;
  }
  return [...sorted].sort((a, b) => {
    const rankA = hashBatchItem(a.id, batchIndex);
    const rankB = hashBatchItem(b.id, batchIndex);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    return compareCanonical(a, b);
  });
}

/**
 * Pick 3-5 live starter verses deterministically per shuffle batch,
 * prioritizing personalized verses (containing {الاسم} or textFemale) first.
 */
export function pickStarterVerses<T extends StarterVerseItem>(
  liveVerses: readonly T[],
  batchIndex = 0,
  count = 4,
): T[] {
  const clampedCount = Math.max(3, Math.min(5, Math.round(count)));
  const live = liveVerses.filter((v) => v.deletedAt == null);
  if (live.length === 0) {
    return [];
  }

  const personalized = live.filter(isPersonalizedVerse);
  const general = live.filter((v) => !isPersonalizedVerse(v));

  const ordered = [
    ...orderBucket(personalized, batchIndex),
    ...orderBucket(general, batchIndex),
  ];

  return ordered.slice(0, Math.min(clampedCount, ordered.length));
}

/**
 * Filter live starter verses across both personalized text and reference
 * using diacritic- and variant-insensitive Arabic matching.
 */
export function filterStarterVerses<T extends StarterVerseItem>(
  liveVerses: readonly T[],
  query: string,
  profile: PersonalizeProfile,
): T[] {
  const live = liveVerses.filter((v) => v.deletedAt == null);
  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    return live;
  }

  return live.filter((verse) => {
    const personalizedText = personalize(
      { text: verse.text, textFemale: verse.textFemale },
      profile,
    );
    return (
      matches(personalizedText, trimmedQuery) || matches(verse.ref, trimmedQuery)
    );
  });
}
