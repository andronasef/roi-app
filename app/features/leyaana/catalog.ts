import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import {
  localDateKey,
  matches,
  seededPick,
  type ContentKind,
} from '@roi/shared';

import type { SyncDatabase } from '../db/events';
import {
  blessings,
  favorites,
  namesOfGod,
  personalItems,
  verses,
} from '../db/schema';
import type { FavoriteSource } from './assignments';

export type NameOfGodRow = typeof namesOfGod.$inferSelect;
export type BlessingRow = typeof blessings.$inferSelect;
export type PersonalItemRow = typeof personalItems.$inferSelect;

export interface HydratedFavoriteItem {
  favoriteId: string;
  favoritedAt: number;
  source: FavoriteSource;
  kind: ContentKind;
  itemId: string;
  title: string;
  text: string;
  textFemale: string | null;
  verseRef: string | null;
}

/** Return all non-tombstoned public Names of God ordered deterministically. */
export function listLiveNamesOfGod(db: SyncDatabase): NameOfGodRow[] {
  return db
    .select()
    .from(namesOfGod)
    .where(isNull(namesOfGod.deletedAt))
    .orderBy(asc(namesOfGod.sortOrder), asc(namesOfGod.id))
    .all();
}

/** Return all non-tombstoned public Blessings ordered deterministically. */
export function listLiveBlessings(db: SyncDatabase): BlessingRow[] {
  return db
    .select()
    .from(blessings)
    .where(isNull(blessings.deletedAt))
    .orderBy(asc(blessings.sortOrder), asc(blessings.id))
    .all();
}

/** Deterministically pick today's featured Name of God from live rows, or null when empty. */
export function pickDailyNameOfGod(
  db: SyncDatabase,
  now: Date,
): NameOfGodRow | null {
  const items = listLiveNamesOfGod(db);
  return seededPick(items, `name_of_god:${localDateKey(now)}`) ?? null;
}

/** Deterministically pick today's featured Blessing from live rows, or null when empty. */
export function pickDailyBlessing(
  db: SyncDatabase,
  now: Date,
): BlessingRow | null {
  const items = listLiveBlessings(db);
  return seededPick(items, `blessing:${localDateKey(now)}`) ?? null;
}

interface SearchableCatalogEntry {
  readonly title: string;
  readonly text: string;
  readonly textFemale?: string | null;
  readonly verseRef?: string | null;
}

function filterCatalogByQuery<T extends SearchableCatalogEntry>(
  items: readonly T[],
  query: string,
  includeVerseRef: boolean,
): T[] {
  if (!query.trim()) {
    return [...items];
  }
  return items.filter(
    (item) =>
      matches(item.title, query) ||
      matches(item.text, query) ||
      (item.textFemale ? matches(item.textFemale, query) : false) ||
      (includeVerseRef && item.verseRef
        ? matches(item.verseRef, query)
        : false),
  );
}

/** Filter Names of God using Arabic diacritic- and variant-insensitive matching. */
export function searchNamesOfGod<
  T extends { title: string; text: string; textFemale?: string | null },
>(items: readonly T[], query: string): T[] {
  return filterCatalogByQuery(items, query, false);
}

/** Filter Blessings across title, text, and supporting verseRef using Arabic matching. */
export function searchBlessings<
  T extends {
    title: string;
    text: string;
    textFemale?: string | null;
    verseRef?: string | null;
  },
>(items: readonly T[], query: string): T[] {
  return filterCatalogByQuery(items, query, true);
}

/**
 * Return starred public and personal items ordered newest-favorited first.
 * Safely skips any favorite whose underlying source item is missing or soft-deleted.
 */
export function listHydratedFavorites(
  db: SyncDatabase,
  kindFilter?: ContentKind | 'all',
): HydratedFavoriteItem[] {
  const favWhere =
    kindFilter && kindFilter !== 'all'
      ? and(isNull(favorites.deletedAt), eq(favorites.itemKind, kindFilter))
      : isNull(favorites.deletedAt);

  const favRows = db
    .select()
    .from(favorites)
    .where(favWhere)
    .orderBy(desc(favorites.createdAt), asc(favorites.id))
    .all();

  if (favRows.length === 0) {
    return [];
  }

  const needsPublicVerse = favRows.some(
    (f) => f.itemSource === 'public' && f.itemKind === 'verse',
  );
  const needsPublicName = favRows.some(
    (f) => f.itemSource === 'public' && f.itemKind === 'name_of_god',
  );
  const needsPublicBlessing = favRows.some(
    (f) => f.itemSource === 'public' && f.itemKind === 'blessing',
  );
  const needsPersonal = favRows.some((f) => f.itemSource === 'personal');

  const versesById = new Map(
    needsPublicVerse
      ? db
          .select()
          .from(verses)
          .where(isNull(verses.deletedAt))
          .all()
          .map((row) => [row.id, row] as const)
      : [],
  );
  const namesById = new Map(
    needsPublicName
      ? db
          .select()
          .from(namesOfGod)
          .where(isNull(namesOfGod.deletedAt))
          .all()
          .map((row) => [row.id, row] as const)
      : [],
  );
  const blessingsById = new Map(
    needsPublicBlessing
      ? db
          .select()
          .from(blessings)
          .where(isNull(blessings.deletedAt))
          .all()
          .map((row) => [row.id, row] as const)
      : [],
  );
  const personalById = new Map(
    needsPersonal
      ? db
          .select()
          .from(personalItems)
          .where(isNull(personalItems.deletedAt))
          .all()
          .map((row) => [row.id, row] as const)
      : [],
  );

  const results: HydratedFavoriteItem[] = [];
  for (const fav of favRows) {
    if (fav.itemSource === 'personal') {
      const item = personalById.get(fav.itemId);
      if (!item || item.kind !== fav.itemKind) {
        continue;
      }
      results.push({
        favoriteId: fav.id,
        favoritedAt: fav.createdAt,
        source: 'personal',
        kind: item.kind,
        itemId: item.id,
        title: item.title,
        text: item.text,
        textFemale: null,
        verseRef: item.verseRef ?? null,
      });
      continue;
    }

    if (fav.itemKind === 'verse') {
      const verse = versesById.get(fav.itemId);
      if (!verse) {
        continue;
      }
      results.push({
        favoriteId: fav.id,
        favoritedAt: fav.createdAt,
        source: 'public',
        kind: 'verse',
        itemId: verse.id,
        title: verse.ref,
        text: verse.text,
        textFemale: verse.textFemale ?? null,
        verseRef: null,
      });
    } else if (fav.itemKind === 'name_of_god') {
      const nameRow = namesById.get(fav.itemId);
      if (!nameRow) {
        continue;
      }
      results.push({
        favoriteId: fav.id,
        favoritedAt: fav.createdAt,
        source: 'public',
        kind: 'name_of_god',
        itemId: nameRow.id,
        title: nameRow.title,
        text: nameRow.text,
        textFemale: nameRow.textFemale ?? null,
        verseRef: null,
      });
    } else if (fav.itemKind === 'blessing') {
      const blessing = blessingsById.get(fav.itemId);
      if (!blessing) {
        continue;
      }
      results.push({
        favoriteId: fav.id,
        favoritedAt: fav.createdAt,
        source: 'public',
        kind: 'blessing',
        itemId: blessing.id,
        title: blessing.title,
        text: blessing.text,
        textFemale: blessing.textFemale ?? null,
        verseRef: blessing.verseRef ?? null,
      });
    }
  }

  return results;
}
