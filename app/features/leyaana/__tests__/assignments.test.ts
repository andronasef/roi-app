import path from 'node:path';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it } from 'vitest';

import { softDelete, type Clock } from '../../db/events';
import * as schema from '../../db/schema';
import {
  assignmentId,
  favoriteId,
  getOrAssignPeriodVerse,
  listLiveFavoriteIds,
  listVerseHistory,
  toggleFavorite,
} from '../assignments';

const MIGRATIONS_FOLDER = path.resolve(__dirname, '../../../drizzle');

function createDeterministicClock(startMs = 1_763_769_600_000): Clock {
  let currentMs = startMs;
  let counter = 1;
  return {
    now: () => {
      const value = currentMs;
      currentMs += 1_000;
      return value;
    },
    rand: (n: number) => {
      const bytes = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        bytes[i] = (counter + i) & 0xff;
      }
      counter += 1;
      return bytes;
    },
  };
}

function openMigratedMemoryDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { sqlite, db };
}

function seedVerses(
  db: ReturnType<typeof openMigratedMemoryDb>['db'],
  items: {
    id: string;
    ref: string;
    text: string;
    textFemale?: string | null;
    sortOrder?: number | null;
    deletedAt?: number | null;
  }[],
) {
  const now = 1_763_769_600_000;
  for (const item of items) {
    db.insert(schema.verses)
      .values({
        id: item.id,
        ref: item.ref,
        text: item.text,
        textFemale: item.textFemale ?? null,
        version: 1,
        sortOrder: item.sortOrder ?? null,
        tagsJson: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: item.deletedAt ?? null,
      })
      .run();
  }
}

describe('leyaana verse assignments and favorites', () => {
  it('returns null when live verses pool is empty and stays stable Saturday through Friday', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const clock = createDeterministicClock();
      const saturday = new Date(2026, 10, 21, 10, 0, 0); // Sat 2026-11-21
      const friday = new Date(2026, 10, 27, 22, 0, 0); // Fri 2026-11-27

      expect(
        getOrAssignPeriodVerse(db, clock, 'weekly', saturday, 'user-seed-1'),
      ).toBeNull();

      seedVerses(db, [
        {
          id: 'v-deleted',
          ref: 'رومية ٨: ١',
          text: 'آية محذوفة',
          sortOrder: 0,
          deletedAt: 1_763_769_600_000,
        },
        {
          id: 'v-1',
          ref: 'مزمور ٢٣: ١',
          text: 'الرب راعي {الاسم} فلا يعوزه شيء',
          textFemale: 'الرب راعي {الاسم} فلا يعوزها شيء',
          sortOrder: 1,
        },
        {
          id: 'v-2',
          ref: 'إشعياء ٤١: ١٠',
          text: 'لا تخف يا {الاسم} لأني معك',
          textFemale: 'لا تخافي يا {الاسم} لأني معك',
          sortOrder: 2,
        },
      ]);

      const satPick = getOrAssignPeriodVerse(
        db,
        clock,
        'weekly',
        saturday,
        'user-seed-1',
      );
      const friPick = getOrAssignPeriodVerse(
        db,
        clock,
        'weekly',
        friday,
        'user-seed-1',
      );

      expect(satPick).not.toBeNull();
      expect(satPick?.id).toBe(assignmentId('weekly', '2026-11-21'));
      expect(satPick?.verseId).not.toBe('v-deleted');
      expect(friPick).toEqual(satPick);
    } finally {
      sqlite.close();
    }
  });

  it('shares seen history across weekly and monthly slots and resets cleanly after exhausting pool', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const clock = createDeterministicClock();
      seedVerses(db, [
        { id: 'v-1', ref: 'شاهد ١', text: 'نص ١', sortOrder: 1 },
        { id: 'v-2', ref: 'شاهد ٢', text: 'نص ٢', sortOrder: 2 },
        { id: 'v-3', ref: 'شاهد ٣', text: 'نص ٣', sortOrder: 3 },
      ]);

      const week1 = getOrAssignPeriodVerse(
        db,
        clock,
        'weekly',
        new Date(2026, 10, 21, 9, 0, 0),
        'seed-abc',
      );
      const month1 = getOrAssignPeriodVerse(
        db,
        clock,
        'monthly',
        new Date(2026, 10, 21, 9, 0, 0),
        'seed-abc',
      );
      const week2 = getOrAssignPeriodVerse(
        db,
        clock,
        'weekly',
        new Date(2026, 10, 28, 9, 0, 0),
        'seed-abc',
      );

      const firstCycleIds = [week1?.verseId, month1?.verseId, week2?.verseId];
      expect(new Set(firstCycleIds)).toEqual(new Set(['v-1', 'v-2', 'v-3']));

      // Cycle resets cleanly once all 3 live verses are seen
      const month2 = getOrAssignPeriodVerse(
        db,
        clock,
        'monthly',
        new Date(2026, 11, 1, 9, 0, 0),
        'seed-abc',
      );
      const week3 = getOrAssignPeriodVerse(
        db,
        clock,
        'weekly',
        new Date(2026, 11, 5, 9, 0, 0),
        'seed-abc',
      );
      const week4 = getOrAssignPeriodVerse(
        db,
        clock,
        'weekly',
        new Date(2026, 11, 12, 9, 0, 0),
        'seed-abc',
      );

      const secondCycleIds = [
        month2?.verseId,
        week3?.verseId,
        week4?.verseId,
      ];
      expect(new Set(secondCycleIds)).toEqual(new Set(['v-1', 'v-2', 'v-3']));
    } finally {
      sqlite.close();
    }
  });

  it('snapshots ref, text, and textFemale so history survives source verse edits and soft deletes', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const clock = createDeterministicClock();
      seedVerses(db, [
        {
          id: 'v-only',
          ref: 'يوحنا ٣: ١٦',
          text: 'نص أصلي {الاسم}',
          textFemale: 'نص أصلي مؤنث {الاسم}',
          sortOrder: 1,
        },
      ]);

      const week1 = getOrAssignPeriodVerse(
        db,
        clock,
        'weekly',
        new Date(2026, 10, 21, 9, 0, 0),
        'seed-xyz',
      );
      expect(week1).not.toBeNull();

      // Seed a second verse so month1 picks it, giving 2 history rows
      seedVerses(db, [
        {
          id: 'v-second',
          ref: 'فيلبي ٤: ١٣',
          text: 'أستطيع كل شيء',
          textFemale: null,
          sortOrder: 2,
        },
      ]);
      const month1 = getOrAssignPeriodVerse(
        db,
        clock,
        'monthly',
        new Date(2026, 10, 21, 9, 0, 0),
        'seed-xyz',
      );
      expect(month1?.verseId).toBe('v-second');

      // Mutate and soft-delete the original verses
      db.update(schema.verses)
        .set({
          ref: 'شاهد معدل',
          text: 'نص معدل',
          textFemale: 'نص معدل مؤنث',
          deletedAt: clock.now(),
        })
        .where(eq(schema.verses.id, 'v-only'))
        .run();

      db.update(schema.verses)
        .set({ deletedAt: clock.now() })
        .where(eq(schema.verses.id, 'v-second'))
        .run();

      const history = listVerseHistory(db);
      expect(history).toHaveLength(2);
      // Ordered newest-first by assignedAt
      expect(history[0]?.id).toBe(month1?.id);
      expect(history[1]?.id).toBe(week1?.id);
      expect(history[1]?.ref).toBe('يوحنا ٣: ١٦');
      expect(history[1]?.text).toBe('نص أصلي {الاسم}');
      expect(history[1]?.textFemale).toBe('نص أصلي مؤنث {الاسم}');

      // Soft-deleting an assignment removes it from history without hard-deleting
      softDelete(db, clock, schema.verseAssignments, month1!.id);
      expect(listVerseHistory(db)).toHaveLength(1);
      expect(
        db.select().from(schema.verseAssignments).all(),
      ).toHaveLength(2);
    } finally {
      sqlite.close();
    }
  });

  it('toggles favorites with deterministic IDs, tombstones on unstar, and revives on conflict', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const clock = createDeterministicClock();
      const input = {
        source: 'public' as const,
        kind: 'verse' as const,
        itemId: 'verse-1',
      };
      const expectedId = favoriteId('public', 'verse', 'verse-1');
      expect(expectedId).toBe('fav:public:verse:verse-1');

      expect(toggleFavorite(db, clock, input)).toBe(true);
      expect(listLiveFavoriteIds(db)).toEqual([expectedId]);

      const personalBlessing = {
        source: 'personal' as const,
        kind: 'blessing' as const,
        itemId: 'pers-1',
      };
      expect(toggleFavorite(db, clock, personalBlessing)).toBe(true);
      expect(listLiveFavoriteIds(db)).toEqual([
        'fav:personal:blessing:pers-1',
        expectedId,
      ]);

      // Unstar sets deletedAt tombstone instead of hard delete
      expect(toggleFavorite(db, clock, input)).toBe(false);
      expect(listLiveFavoriteIds(db)).toEqual([
        'fav:personal:blessing:pers-1',
      ]);

      const [tombstoned] = db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.id, expectedId))
        .all();
      expect(tombstoned?.deletedAt).not.toBeNull();

      // Re-star clears deletedAt via onConflictDoUpdate
      expect(toggleFavorite(db, clock, input)).toBe(true);
      expect(listLiveFavoriteIds(db)).toContain(expectedId);
      const [revived] = db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.id, expectedId))
        .all();
      expect(revived?.deletedAt).toBeNull();
    } finally {
      sqlite.close();
    }
  });
});
