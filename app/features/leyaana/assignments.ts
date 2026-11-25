import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import {
  monthKey,
  seededPick,
  weekKey,
  type ContentKind,
} from '@roi/shared';

import { ASSIGNMENT_ID_PREFIX, FAVORITE_ID_PREFIX } from '../../constants/db';
import { softDelete, type Clock, type SyncDatabase } from '../db/events';
import { favorites, verseAssignments, verses } from '../db/schema';

export type PeriodType = 'weekly' | 'monthly';
export type FavoriteSource = 'public' | 'personal';
export type VerseAssignmentRow = typeof verseAssignments.$inferSelect;

export interface ToggleFavoriteInput {
  source: FavoriteSource;
  kind: ContentKind;
  itemId: string;
}

/** Deterministic natural-key ID for a weekly or monthly verse assignment. */
export function assignmentId(periodType: PeriodType, periodKey: string): string {
  return `${ASSIGNMENT_ID_PREFIX}${periodType}:${periodKey}`;
}

/** Deterministic natural-key ID for a favorite row across public and personal items. */
export function favoriteId(
  source: FavoriteSource,
  kind: ContentKind,
  itemId: string,
): string {
  return `${FAVORITE_ID_PREFIX}${source}:${kind}:${itemId}`;
}

/**
 * Return the persisted verse assignment for the given week (Saturday-start) or month,
 * or deterministically pick and snapshot a verse from the live pool without repeating
 * until every live verse has been assigned across weekly and monthly slots.
 */
export function getOrAssignPeriodVerse(
  db: SyncDatabase,
  clock: Clock,
  periodType: PeriodType,
  now: Date,
  userSeed: string,
): VerseAssignmentRow | null {
  const key = periodType === 'weekly' ? weekKey(now, 6) : monthKey(now);
  const id = assignmentId(periodType, key);

  const existing = db
    .select()
    .from(verseAssignments)
    .where(and(eq(verseAssignments.id, id), isNull(verseAssignments.deletedAt)))
    .get();
  if (existing) {
    return existing;
  }

  const liveVerses = db
    .select()
    .from(verses)
    .where(isNull(verses.deletedAt))
    .orderBy(asc(verses.sortOrder), asc(verses.id))
    .all();
  if (liveVerses.length === 0) {
    return null;
  }

  const priorAssignments = db
    .select({ verseId: verseAssignments.verseId })
    .from(verseAssignments)
    .where(isNull(verseAssignments.deletedAt))
    .all();

  const seenCounts = new Map<string, number>();
  for (const row of priorAssignments) {
    seenCounts.set(row.verseId, (seenCounts.get(row.verseId) ?? 0) + 1);
  }

  let minCount = Infinity;
  for (const verse of liveVerses) {
    const count = seenCounts.get(verse.id) ?? 0;
    if (count < minCount) {
      minCount = count;
    }
  }

  const candidates = liveVerses.filter(
    (verse) => (seenCounts.get(verse.id) ?? 0) === minCount,
  );
  const chosen = seededPick(candidates, `${userSeed}:${periodType}:${key}`);
  if (!chosen) {
    return null;
  }

  const ts = clock.now();
  db.insert(verseAssignments)
    .values({
      id,
      createdAt: ts,
      updatedAt: ts,
      deletedAt: null,
      periodType,
      periodKey: key,
      verseId: chosen.id,
      ref: chosen.ref,
      text: chosen.text,
      textFemale: chosen.textFemale ?? null,
      assignedAt: ts,
    })
    .onConflictDoUpdate({
      target: verseAssignments.id,
      set: {
        periodType,
        periodKey: key,
        verseId: chosen.id,
        ref: chosen.ref,
        text: chosen.text,
        textFemale: chosen.textFemale ?? null,
        assignedAt: ts,
        updatedAt: ts,
        deletedAt: null,
      },
    })
    .run();

  return (
    db
      .select()
      .from(verseAssignments)
      .where(
        and(eq(verseAssignments.id, id), isNull(verseAssignments.deletedAt)),
      )
      .get() ?? null
  );
}

/** Return all non-tombstoned verse assignments ordered newest-first by assignedAt. */
export function listVerseHistory(db: SyncDatabase): VerseAssignmentRow[] {
  return db
    .select()
    .from(verseAssignments)
    .where(isNull(verseAssignments.deletedAt))
    .orderBy(desc(verseAssignments.assignedAt), desc(verseAssignments.id))
    .all();
}

/**
 * Toggle a favorite star state using a deterministic natural-key ID.
 * Returns true if now starred, false if soft-deleted.
 */
export function toggleFavorite(
  db: SyncDatabase,
  clock: Clock,
  input: ToggleFavoriteInput,
): boolean {
  const id = favoriteId(input.source, input.kind, input.itemId);
  const existing = db
    .select()
    .from(favorites)
    .where(eq(favorites.id, id))
    .get();

  if (existing && existing.deletedAt === null) {
    softDelete(db, clock, favorites, id);
    return false;
  }

  const now = clock.now();
  db.insert(favorites)
    .values({
      id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      itemKind: input.kind,
      itemSource: input.source,
      itemId: input.itemId,
    })
    .onConflictDoUpdate({
      target: favorites.id,
      set: {
        updatedAt: now,
        deletedAt: null,
      },
    })
    .run();

  return true;
}

/** Return all non-tombstoned favorite IDs ordered newest-first. */
export function listLiveFavoriteIds(db: SyncDatabase): string[] {
  return db
    .select({ id: favorites.id })
    .from(favorites)
    .where(isNull(favorites.deletedAt))
    .orderBy(desc(favorites.createdAt), asc(favorites.id))
    .all()
    .map((row) => row.id);
}
