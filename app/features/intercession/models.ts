import { matches, normalizeArabic } from '@roi/shared';

import type { prayerEvents, prayers } from '../db/schema';

export type PrayerRow = typeof prayers.$inferSelect;
export type PrayerEventRow = typeof prayerEvents.$inferSelect;

export type PrayerSort =
  | 'random'
  | 'neglected'
  | 'oldest'
  | 'newest'
  | 'alphabetical';

export interface PrayerSortOption {
  readonly id: PrayerSort;
  readonly label: string;
}

export const PRAYER_SORTS: readonly PrayerSortOption[] = [
  { id: 'random', label: 'عشوائي' },
  { id: 'neglected', label: 'الأكتر إهمالاً' },
  { id: 'oldest', label: 'الأقدم إضافة' },
  { id: 'newest', label: 'الأحدث إضافة' },
  { id: 'alphabetical', label: 'أبجدي' },
] as const;

export const DEFAULT_PERSON_LABEL = 'عام';

export interface PrayerWithStats extends PrayerRow {
  prayedCount: number;
  lastPrayedAt: number | null;
  lastPrayedLocalDate: string | null;
}

export interface PersonGroup {
  personName: string;
  activeCount: number;
  answeredCount: number;
  prayers: PrayerWithStats[];
}

/**
 * Return the prayers counted toward today's intercession goal (D-01):
 * pinned active prayers when at least one is pinned, otherwise all active prayers.
 */
export function countedPrayers(
  active: readonly PrayerWithStats[],
): PrayerWithStats[] {
  const pinned = active.filter((prayer) => prayer.pinnedAt !== null);
  return pinned.length > 0 ? pinned : [...active];
}

/**
 * Deterministic daily FNV-1a 32-bit rank for stable `random` sort order per local day (D-02).
 */
export function dailyPrayerRank(todayKey: string, prayerId: string): number {
  const input = `${todayKey}:${prayerId}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function compareByMode(
  a: PrayerWithStats,
  b: PrayerWithStats,
  sort: PrayerSort,
  todayKey: string,
): number {
  switch (sort) {
    case 'random': {
      const rankDiff =
        dailyPrayerRank(todayKey, a.id) - dailyPrayerRank(todayKey, b.id);
      return rankDiff !== 0 ? rankDiff : a.createdAt - b.createdAt;
    }
    case 'neglected': {
      if (a.lastPrayedAt === null && b.lastPrayedAt !== null) {
        return -1;
      }
      if (a.lastPrayedAt !== null && b.lastPrayedAt === null) {
        return 1;
      }
      const lastDiff = (a.lastPrayedAt ?? 0) - (b.lastPrayedAt ?? 0);
      return lastDiff !== 0 ? lastDiff : a.createdAt - b.createdAt;
    }
    case 'oldest':
      return a.createdAt - b.createdAt;
    case 'newest':
      return b.createdAt - a.createdAt;
    case 'alphabetical': {
      const cmp = normalizeArabic(a.body).localeCompare(
        normalizeArabic(b.body),
        'ar',
      );
      return cmp !== 0 ? cmp : a.createdAt - b.createdAt;
    }
  }
}

/**
 * Sort active prayers with prayed-today sinking and pinned priority in the unprayed group (D-02).
 */
export function sortPrayers(
  active: readonly PrayerWithStats[],
  sort: PrayerSort,
  todayKey: string,
): PrayerWithStats[] {
  return [...active].sort((a, b) => {
    const aPrayedToday = a.lastPrayedLocalDate === todayKey;
    const bPrayedToday = b.lastPrayedLocalDate === todayKey;
    if (aPrayedToday !== bPrayedToday) {
      return aPrayedToday ? 1 : -1;
    }

    if (!aPrayedToday && !bPrayedToday) {
      const aPinned = a.pinnedAt !== null;
      const bPinned = b.pinnedAt !== null;
      if (aPinned !== bPinned) {
        return aPinned ? -1 : 1;
      }
    }

    return compareByMode(a, b, sort, todayKey);
  });
}

/**
 * Filter prayers by diacritic-insensitive Arabic query across body and personName (D-05).
 */
export function filterPrayers(
  list: readonly PrayerWithStats[],
  query: string,
): PrayerWithStats[] {
  if (normalizeArabic(query) === '') {
    return [...list];
  }
  return list.filter(
    (prayer) =>
      matches(prayer.body, query) || matches(prayer.personName ?? '', query),
  );
}

/**
 * Resolve normalized grouping key for a person's name, falling back to 'عام'.
 */
export function normalizePersonKey(personName: string | null | undefined): string {
  const trimmed = personName?.trim() ?? '';
  if (!trimmed) {
    return normalizeArabic(DEFAULT_PERSON_LABEL);
  }
  return normalizeArabic(trimmed);
}

/**
 * Group prayers by normalized personName (falling back to 'عام'), sorted alphabetically (INT-03).
 */
export function groupPrayersByPerson(
  list: readonly PrayerWithStats[],
): PersonGroup[] {
  const buckets = new Map<string, PersonGroup>();

  for (const prayer of list) {
    const trimmed = prayer.personName?.trim() ?? '';
    const displayName = trimmed.length > 0 ? trimmed : DEFAULT_PERSON_LABEL;
    const key = normalizePersonKey(displayName);
    const existing = buckets.get(key);
    const isAnswered = prayer.answeredAt !== null;

    if (existing) {
      existing.prayers.push(prayer);
      if (isAnswered) {
        existing.answeredCount += 1;
      } else {
        existing.activeCount += 1;
      }
    } else {
      buckets.set(key, {
        personName: displayName,
        activeCount: isAnswered ? 0 : 1,
        answeredCount: isAnswered ? 1 : 0,
        prayers: [prayer],
      });
    }
  }

  return Array.from(buckets.values()).sort((a, b) =>
    normalizeArabic(a.personName).localeCompare(
      normalizeArabic(b.personName),
      'ar',
    ),
  );
}
