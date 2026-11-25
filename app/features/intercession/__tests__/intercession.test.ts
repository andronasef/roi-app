import path from 'node:path';
import { localDateKey } from '@roi/shared';
import Database from 'better-sqlite3';
import { isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/telemetry', () => ({
  track: vi.fn(),
}));

import { track } from '../../../services/telemetry';
import type { Clock, SyncDatabase } from '../../db/events';
import * as schema from '../../db/schema';
import {
  countedPrayers,
  dailyPrayerRank,
  filterPrayers,
  groupPrayersByPerson,
  sortPrayers,
  type PrayerWithStats,
} from '../models';
import {
  createPrayer,
  deletePrayer,
  getDefaultIntercessionSort,
  listPrayerEvents,
  listPrayersWithStats,
  logBatchPrayed,
  logPrayerWithNote,
  markPrayerAnswered,
  reopenPrayer,
  setDefaultIntercessionSort,
  togglePinPrayer,
  updatePrayer,
} from '../repository';

const DRIZZLE_DIR = path.resolve(__dirname, '../../../drizzle');

function openTestDb(): { sqlite: Database.Database; db: SyncDatabase } {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: DRIZZLE_DIR });
  return { sqlite, db: db as unknown as SyncDatabase };
}

function createTestClock(initialMs = Date.UTC(2026, 10, 26, 10, 0, 0)): {
  clock: Clock;
  advanceMs: (deltaMs: number) => void;
} {
  let now = initialMs;
  let counter = 1;
  return {
    clock: {
      now: () => now,
      rand: (n: number) => {
        const bytes = new Uint8Array(n);
        bytes[n - 1] = counter++ & 0xff;
        return bytes;
      },
    },
    advanceMs: (deltaMs: number) => {
      now += deltaMs;
    },
  };
}

function makePrayer(
  overrides: Partial<PrayerWithStats> & { id: string; body: string },
): PrayerWithStats {
  return {
    createdAt: 1000,
    updatedAt: 1000,
    deletedAt: null,
    personName: null,
    sinceLocalDate: '2026-11-26',
    pinnedAt: null,
    answeredAt: null,
    outcome: null,
    prayedCount: 0,
    lastPrayedAt: null,
    lastPrayedLocalDate: null,
    ...overrides,
  };
}

describe('intercession models', () => {
  it('countedPrayers returns only pinned prayers when >= 1 active prayer is pinned, otherwise all active', () => {
    const a = makePrayer({ id: 'a', body: 'صلاة أ', pinnedAt: null });
    const b = makePrayer({ id: 'b', body: 'صلاة ب', pinnedAt: null });
    expect(countedPrayers([a, b]).map((p) => p.id)).toEqual(['a', 'b']);

    const c = makePrayer({ id: 'c', body: 'صلاة ج', pinnedAt: 5000 });
    expect(countedPrayers([a, b, c]).map((p) => p.id)).toEqual(['c']);
  });

  it('sortPrayers sinks prayed-today items and keeps pinned prayers at top of unprayed group across all 5 modes', () => {
    const today = '2026-11-26';
    const prayedToday = makePrayer({
      id: 'p-today',
      body: 'ألف',
      createdAt: 100,
      pinnedAt: 900,
      lastPrayedAt: 5000,
      lastPrayedLocalDate: today,
    });
    const pinnedUnprayed = makePrayer({
      id: 'p-pinned',
      body: 'ياء',
      createdAt: 400,
      pinnedAt: 800,
      lastPrayedAt: 4000,
      lastPrayedLocalDate: '2026-11-25',
    });
    const neverPrayed = makePrayer({
      id: 'p-never',
      body: 'باء',
      createdAt: 300,
      lastPrayedAt: null,
      lastPrayedLocalDate: null,
    });
    const olderPrayed = makePrayer({
      id: 'p-older',
      body: 'تاء',
      createdAt: 200,
      lastPrayedAt: 2000,
      lastPrayedLocalDate: '2026-11-24',
    });

    const items = [prayedToday, pinnedUnprayed, neverPrayed, olderPrayed];

    // All modes keep pinnedUnprayed first and prayedToday last
    for (const mode of [
      'random',
      'neglected',
      'oldest',
      'newest',
      'alphabetical',
    ] as const) {
      const sorted = sortPrayers(items, mode, today);
      expect(sorted[0]?.id).toBe('p-pinned');
      expect(sorted[sorted.length - 1]?.id).toBe('p-today');
    }

    // Neglected: neverPrayed (null) before olderPrayed
    expect(
      sortPrayers(items, 'neglected', today).map((p) => p.id),
    ).toEqual(['p-pinned', 'p-never', 'p-older', 'p-today']);

    // Oldest: createdAt 200 before 300
    expect(sortPrayers(items, 'oldest', today).map((p) => p.id)).toEqual([
      'p-pinned',
      'p-older',
      'p-never',
      'p-today',
    ]);

    // Newest: createdAt 300 before 200
    expect(sortPrayers(items, 'newest', today).map((p) => p.id)).toEqual([
      'p-pinned',
      'p-never',
      'p-older',
      'p-today',
    ]);

    // Alphabetical: باء before تاء
    expect(
      sortPrayers(items, 'alphabetical', today).map((p) => p.id),
    ).toEqual(['p-pinned', 'p-never', 'p-older', 'p-today']);

    // Random: deterministic for same todayKey:id
    const r1 = sortPrayers(items, 'random', today).map((p) => p.id);
    const r2 = sortPrayers(items, 'random', today).map((p) => p.id);
    expect(r1).toEqual(r2);
    expect(dailyPrayerRank(today, 'p-never')).toBe(
      dailyPrayerRank(today, 'p-never'),
    );
  });

  it('filterPrayers matches diacritic-stripped Arabic across body and personName', () => {
    const items = [
      makePrayer({
        id: '1',
        body: 'شِفَاءُ مَرْيَمَ',
        personName: 'مَرْيَم',
      }),
      makePrayer({
        id: '2',
        body: 'سلامة العائلة',
        personName: 'إبراهيم',
      }),
    ];

    expect(filterPrayers(items, 'شفاء مريم').map((p) => p.id)).toEqual(['1']);
    expect(filterPrayers(items, 'ابراهيم').map((p) => p.id)).toEqual(['2']);
    expect(filterPrayers(items, '   ').map((p) => p.id)).toEqual(['1', '2']);
  });

  it('groupPrayersByPerson groups by normalized personName with عام fallback and alphabetical order', () => {
    const items = [
      makePrayer({ id: '1', body: 'أ', personName: 'يوسف' }),
      makePrayer({ id: '2', body: 'ب', personName: '  أحمد ' }),
      makePrayer({ id: '3', body: 'ج', personName: 'احمد', answeredAt: 9000 }),
      makePrayer({ id: '4', body: 'د', personName: null }),
    ];

    const groups = groupPrayersByPerson(items);
    expect(groups.map((g) => g.personName)).toEqual(['أحمد', 'عام', 'يوسف']);
    expect(groups[0]?.activeCount).toBe(1);
    expect(groups[0]?.answeredCount).toBe(1);
    expect(groups[1]?.activeCount).toBe(1);
    expect(groups[2]?.activeCount).toBe(1);
  });
});

describe('intercession repository', () => {
  it('creates a prayer, logs صليت with optional note, and increments prayedCount from live prayer_events', () => {
    const { sqlite, db } = openTestDb();
    try {
      vi.mocked(track).mockClear();
      const { clock, advanceMs } = createTestClock();
      const todayKey = localDateKey(new Date(clock.now()));

      const created = createPrayer(db, clock, {
        body: 'صلّي عشان شفاء ماما',
        personName: 'ماما',
      });

      const initialList = listPrayersWithStats(db);
      expect(initialList).toHaveLength(1);
      expect(initialList[0]?.prayedCount).toBe(0);
      expect(initialList[0]?.lastPrayedLocalDate).toBeNull();

      advanceMs(5_000);
      logPrayerWithNote(db, clock, created.id, 'ملاحظة سريعة');

      const afterPrayed = listPrayersWithStats(db);
      expect(afterPrayed[0]?.prayedCount).toBe(1);
      expect(afterPrayed[0]?.lastPrayedLocalDate).toBe(todayKey);

      const events = listPrayerEvents(db, created.id);
      expect(events).toHaveLength(1);
      expect(events[0]?.note).toBe('ملاحظة سريعة');

      expect(track).toHaveBeenCalledTimes(1);
      expect(track).toHaveBeenCalledWith('prayer_logged');
    } finally {
      sqlite.close();
    }
  });

  it('supports updatePrayer, togglePinPrayer, logBatchPrayed, markPrayerAnswered, reopenPrayer, and soft-delete tombstones', () => {
    const { sqlite, db } = openTestDb();
    try {
      const { clock, advanceMs } = createTestClock();

      const p1 = createPrayer(db, clock, {
        body: 'صلاة ١',
        personName: 'باسم',
        sinceLocalDate: '2026-11-20',
      });
      advanceMs(1000);
      const p2 = createPrayer(db, clock, {
        body: 'صلاة ٢',
        personName: 'باسم',
      });

      // Update & pin
      advanceMs(1000);
      const updated = updatePrayer(db, clock, {
        id: p1.id,
        body: 'صلاة ١ معدلة',
        personName: 'باسم',
        sinceLocalDate: '2026-11-19',
      });
      expect(updated?.body).toBe('صلاة ١ معدلة');
      expect(updated?.sinceLocalDate).toBe('2026-11-19');

      const pinned = togglePinPrayer(db, clock, p1.id);
      expect(pinned?.pinnedAt).not.toBeNull();
      const unpinned = togglePinPrayer(db, clock, p1.id);
      expect(unpinned?.pinnedAt).toBeNull();

      // Batch pray
      advanceMs(1000);
      const batchIds = logBatchPrayed(db, clock, [p1.id, p2.id], 'صلاة جماعية');
      expect(batchIds).toHaveLength(2);
      const statsAfterBatch = listPrayersWithStats(db);
      expect(statsAfterBatch.every((p) => p.prayedCount === 1)).toBe(true);

      // Mark answered & reopen
      advanceMs(1000);
      const answered = markPrayerAnswered(db, clock, p1.id, 'تم الشفاء');
      expect(answered?.answeredAt).not.toBeNull();
      expect(answered?.outcome).toBe('تم الشفاء');

      advanceMs(1000);
      const reopened = reopenPrayer(db, clock, p1.id);
      expect(reopened?.answeredAt).toBeNull();
      expect(reopened?.outcome).toBeNull();

      // Soft-delete cascades tombstones to prayerEvents
      advanceMs(1000);
      deletePrayer(db, clock, p1.id);

      const live = listPrayersWithStats(db);
      expect(live.map((p) => p.id)).toEqual([p2.id]);
      expect(listPrayerEvents(db, p1.id)).toEqual([]);

      const allEvents = db
        .select()
        .from(schema.prayerEvents)
        .where(isNull(schema.prayerEvents.deletedAt))
        .all();
      expect(allEvents).toHaveLength(1);
      expect(allEvents[0]?.prayerId).toBe(p2.id);
    } finally {
      sqlite.close();
    }
  });

  it('persists default intercession sort in SQLite settings', () => {
    const { sqlite, db } = openTestDb();
    try {
      const { clock } = createTestClock();
      expect(getDefaultIntercessionSort(db)).toBe('random');

      setDefaultIntercessionSort(db, clock, 'neglected');
      expect(getDefaultIntercessionSort(db)).toBe('neglected');

      setDefaultIntercessionSort(db, clock, 'alphabetical');
      expect(getDefaultIntercessionSort(db)).toBe('alphabetical');
    } finally {
      sqlite.close();
    }
  });
});
