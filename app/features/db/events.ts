import { and, count, eq, isNull } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import { localDateKey, uuidv7 } from '@roi/shared';

import {
  gratitudeLines,
  memVerses,
  prayerEvents,
  prayers,
  reviewEvents,
  settings,
} from './schema';
import type * as schema from './schema';

/** Time and randomness source injected for deterministic testing and CSPRNG on device. */
export interface Clock {
  now: () => number;
  rand: (n: number) => Uint8Array;
}

/** Sync SQLite database over the app schema (satisfied by expo-sqlite and better-sqlite3). */
export type SyncDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

/** Sync-ready table union supported by softDelete. */
export type SyncTable =
  | typeof settings
  | typeof prayers
  | typeof prayerEvents
  | typeof memVerses
  | typeof reviewEvents
  | typeof gratitudeLines;

/** Insert one append-only prayer event and return its UUIDv7 id. */
export function logPrayed(
  db: SyncDatabase,
  clock: Clock,
  prayerId: string,
): string {
  const now = clock.now();
  const id = uuidv7(now, clock.rand);
  db.insert(prayerEvents)
    .values({
      id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      prayerId,
      prayedAt: now,
      localDate: localDateKey(new Date(now)),
    })
    .run();
  return id;
}

/** Insert one append-only memorization review event and return its UUIDv7 id. */
export function logReview(
  db: SyncDatabase,
  clock: Clock,
  memVerseId: string,
  rating: number,
): string {
  const now = clock.now();
  const id = uuidv7(now, clock.rand);
  db.insert(reviewEvents)
    .values({
      id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      memVerseId,
      rating,
      reviewedAt: now,
      localDate: localDateKey(new Date(now)),
    })
    .run();
  return id;
}

/** Tombstone a row by setting deletedAt and updatedAt if it is not already deleted. */
export function softDelete(
  db: SyncDatabase,
  clock: Clock,
  table: SyncTable,
  id: string,
): void {
  const now = clock.now();
  switch (table) {
    case settings:
      db.update(settings)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(settings.id, id), isNull(settings.deletedAt)))
        .run();
      return;
    case prayers:
      db.update(prayers)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(prayers.id, id), isNull(prayers.deletedAt)))
        .run();
      return;
    case prayerEvents:
      db.update(prayerEvents)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(prayerEvents.id, id), isNull(prayerEvents.deletedAt)))
        .run();
      return;
    case memVerses:
      db.update(memVerses)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(memVerses.id, id), isNull(memVerses.deletedAt)))
        .run();
      return;
    case reviewEvents:
      db.update(reviewEvents)
        .set({ deletedAt: now, updatedAt: now })
        .where(and(eq(reviewEvents.id, id), isNull(reviewEvents.deletedAt)))
        .run();
      return;
    case gratitudeLines:
      db.update(gratitudeLines)
        .set({ deletedAt: now, updatedAt: now })
        .where(
          and(eq(gratitudeLines.id, id), isNull(gratitudeLines.deletedAt)),
        )
        .run();
      return;
  }
}

/** Count non-tombstoned prayer events for a prayer. */
export function prayedCount(db: SyncDatabase, prayerId: string): number {
  const rows = db
    .select({ total: count() })
    .from(prayerEvents)
    .where(
      and(eq(prayerEvents.prayerId, prayerId), isNull(prayerEvents.deletedAt)),
    )
    .all();
  return rows[0]?.total ?? 0;
}

/** Count non-tombstoned review events for a memorized verse. */
export function reviewCount(db: SyncDatabase, memVerseId: string): number {
  const rows = db
    .select({ total: count() })
    .from(reviewEvents)
    .where(
      and(
        eq(reviewEvents.memVerseId, memVerseId),
        isNull(reviewEvents.deletedAt),
      ),
    )
    .all();
  return rows[0]?.total ?? 0;
}
