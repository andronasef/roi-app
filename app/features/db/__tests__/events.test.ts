import path from 'node:path';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it } from 'vitest';
import { localDateKey, uuidv7 } from '@roi/shared';

import {
  logPrayed,
  logReview,
  prayedCount,
  reviewCount,
  softDelete,
  type Clock,
} from '../events';
import * as schema from '../schema';

const MIGRATIONS_FOLDER = path.resolve(__dirname, '../../../drizzle');

function createDeterministicClock(startMs = 1_732_483_200_000): Clock {
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

describe('db events and soft deletes', () => {
  it('logs prayed events, computes live count, tombstones idempotently, and preserves parent on soft delete', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const clock = createDeterministicClock();
      const prayerNow = clock.now();
      const prayerId = uuidv7(prayerNow, clock.rand);

      db.insert(schema.prayers)
        .values({
          id: prayerId,
          createdAt: prayerNow,
          updatedAt: prayerNow,
          deletedAt: null,
          body: 'صلاة من أجل السلام',
          personName: 'مريم',
          sinceLocalDate: localDateKey(new Date(prayerNow)),
        })
        .run();

      const event1 = logPrayed(db, clock, prayerId);
      const event2 = logPrayed(db, clock, prayerId);
      const event3 = logPrayed(db, clock, prayerId);

      expect([event1, event2, event3]).toEqual([event1, event2, event3].sort());
      expect(prayedCount(db, prayerId)).toBe(3);

      const [row1] = db
        .select()
        .from(schema.prayerEvents)
        .where(eq(schema.prayerEvents.id, event1))
        .all();
      expect(row1).toBeDefined();
      expect(row1?.localDate).toBe(localDateKey(new Date(row1!.prayedAt)));

      const [beforeTombstone] = db
        .select()
        .from(schema.prayerEvents)
        .where(eq(schema.prayerEvents.id, event2))
        .all();

      softDelete(db, clock, schema.prayerEvents, event2);
      expect(prayedCount(db, prayerId)).toBe(2);

      const [afterFirstDelete] = db
        .select()
        .from(schema.prayerEvents)
        .where(eq(schema.prayerEvents.id, event2))
        .all();
      expect(afterFirstDelete).toBeDefined();
      expect(afterFirstDelete?.deletedAt).not.toBeNull();
      expect(afterFirstDelete?.updatedAt).toBe(afterFirstDelete?.deletedAt);
      expect(afterFirstDelete!.updatedAt).toBeGreaterThan(
        beforeTombstone!.updatedAt,
      );

      softDelete(db, clock, schema.prayerEvents, event2);
      const [afterSecondDelete] = db
        .select()
        .from(schema.prayerEvents)
        .where(eq(schema.prayerEvents.id, event2))
        .all();
      expect(afterSecondDelete?.updatedAt).toBe(afterFirstDelete?.updatedAt);
      expect(afterSecondDelete?.deletedAt).toBe(afterFirstDelete?.deletedAt);

      softDelete(db, clock, schema.prayers, prayerId);
      const [deletedPrayer] = db
        .select()
        .from(schema.prayers)
        .where(eq(schema.prayers.id, prayerId))
        .all();
      expect(deletedPrayer).toBeDefined();
      expect(deletedPrayer?.deletedAt).not.toBeNull();
      expect(prayedCount(db, prayerId)).toBe(2);
    } finally {
      sqlite.close();
    }
  });

  it('logs review events and counts only non-tombstoned reviews', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const clock = createDeterministicClock();
      const now = clock.now();
      const memVerseId = uuidv7(now, clock.rand);

      db.insert(schema.memVerses)
        .values({
          id: memVerseId,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          verseId: 'verse-ps23-1',
          fsrs: JSON.stringify({ reps: 0, lapses: 0 }),
          fsrsModel: 'fsrs-7',
        })
        .run();

      const r1 = logReview(db, clock, memVerseId, 3);
      const r2 = logReview(db, clock, memVerseId, 4);
      const r3 = logReview(db, clock, memVerseId, 2);

      expect([r1, r2, r3]).toEqual([r1, r2, r3].sort());
      expect(reviewCount(db, memVerseId)).toBe(3);

      softDelete(db, clock, schema.reviewEvents, r2);
      expect(reviewCount(db, memVerseId)).toBe(2);

      const [tombstoned] = db
        .select()
        .from(schema.reviewEvents)
        .where(eq(schema.reviewEvents.id, r2))
        .all();
      expect(tombstoned?.deletedAt).not.toBeNull();
      expect(tombstoned?.updatedAt).toBe(tombstoned?.deletedAt);
    } finally {
      sqlite.close();
    }
  });

  it('builds deterministic gratitude ids and rejects duplicate entries for the same day', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const clock = createDeterministicClock();
      const now = clock.now();
      const date = '2026-11-24';
      const id = schema.gratitudeId(date);

      expect(id).toBe('shukr:2026-11-24');

      db.insert(schema.gratitudeLines)
        .values({
          id,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
          localDate: date,
          body: 'أشكرك على نعمة اليوم',
        })
        .run();

      expect(() =>
        db
          .insert(schema.gratitudeLines)
          .values({
            id: schema.gratitudeId(date),
            createdAt: now + 1_000,
            updatedAt: now + 1_000,
            deletedAt: null,
            localDate: date,
            body: 'سطر مكرر لنفس اليوم',
          })
          .run(),
      ).toThrow();
    } finally {
      sqlite.close();
    }
  });
});
