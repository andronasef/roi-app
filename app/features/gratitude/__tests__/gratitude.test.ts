import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/telemetry', () => ({
  track: vi.fn(),
}));

import { track } from '../../../services/telemetry';
import type { Clock, SyncDatabase } from '../../db/events';
import * as schema from '../../db/schema';
import { gratitudeId, gratitudeLines } from '../../db/schema';
import {
  appendGratitudeLine,
  formatAnsweredPrefill,
  groupGratitudeByMonth,
} from '../models';
import {
  getGratitudeLineByDate,
  getGratitudeReminderSettings,
  listLiveGratitude,
  setGratitudeReminderSettings,
  upsertGratitudeLine,
} from '../repository';

const DRIZZLE_DIR = path.resolve(__dirname, '../../../drizzle');

function openTestDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: DRIZZLE_DIR });
  return db as unknown as SyncDatabase;
}

function createClock(start = Date.UTC(2026, 10, 26, 10, 0, 0)): Clock {
  let now = start;
  return {
    now: () => (now += 1_000),
    rand: (n) => new Uint8Array(n).map((_, i) => i + 1),
  };
}

describe('gratitude repository', () => {
  beforeEach(() => {
    vi.mocked(track).mockClear();
  });

  it('upserts one row per local day and updates it in place', () => {
    const db = openTestDb();
    const clock = createClock();
    upsertGratitudeLine(db, clock, '2026-11-26', 'شكراً');
    upsertGratitudeLine(db, clock, '2026-11-26', 'شكراً\nوكمان');

    const rows = db.select().from(gratitudeLines).all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: gratitudeId('2026-11-26'),
      localDate: '2026-11-26',
      body: 'شكراً\nوكمان',
      deletedAt: null,
    });
  });

  it('soft-deletes on blank text and revives the same row when written again', () => {
    const db = openTestDb();
    const clock = createClock();
    upsertGratitudeLine(db, clock, '2026-11-25', 'أول');
    upsertGratitudeLine(db, clock, '2026-11-25', '   \n ');

    expect(getGratitudeLineByDate(db, '2026-11-25')).toBeNull();
    expect(db.select().from(gratitudeLines).all()[0]?.deletedAt).not.toBeNull();

    upsertGratitudeLine(db, clock, '2026-11-25', 'تاني');
    expect(getGratitudeLineByDate(db, '2026-11-25')?.body).toBe('تاني');
    expect(db.select().from(gratitudeLines).all()).toHaveLength(1);
    expect(listLiveGratitude(db)).toHaveLength(1);
  });

  it('tracks gratitude_saved with zero parameters and never on clear', () => {
    const db = openTestDb();
    const clock = createClock();
    upsertGratitudeLine(db, clock, '2026-11-26', 'سر');
    expect(track).toHaveBeenCalledTimes(1);
    expect(vi.mocked(track).mock.calls[0]).toEqual(['gratitude_saved']);
    upsertGratitudeLine(db, clock, '2026-11-26', '');
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('defaults reminder to OFF at 21:00 and round-trips saved settings', () => {
    const db = openTestDb();
    const clock = createClock();
    expect(getGratitudeReminderSettings(db)).toEqual({
      enabled: false,
      hour: 21,
      minute: 0,
    });
    setGratitudeReminderSettings(db, clock, {
      enabled: true,
      hour: 7,
      minute: 30,
    });
    expect(getGratitudeReminderSettings(db)).toEqual({
      enabled: true,
      hour: 7,
      minute: 30,
    });
  });
});

describe('gratitude models', () => {
  it('appendGratitudeLine appends on a new line or returns the trimmed addition', () => {
    expect(appendGratitudeLine('', '  أول  ')).toBe('أول');
    expect(appendGratitudeLine('   ', 'أول')).toBe('أول');
    expect(appendGratitudeLine('أول', 'تاني')).toBe('أول\nتاني');
    expect(appendGratitudeLine('أول\n', 'تاني')).toBe('أول\nتاني');
    expect(appendGratitudeLine('أول', '')).toBe('أول\n');
  });

  it('formatAnsweredPrefill follows the copywriting contract', () => {
    expect(formatAnsweredPrefill('صلاة', 'مينا', 'اتشفى')).toBe(
      'الحمد لله على استجابة الصلاة (مينا): اتشفى',
    );
    expect(formatAnsweredPrefill('صلاة', null, ' نجح ')).toBe(
      'الحمد لله على استجابة الصلاة (عام): نجح',
    );
    expect(formatAnsweredPrefill('صلاة  عن\nشغل', 'مينا', null)).toBe(
      'الحمد لله على استجابة الصلاة: صلاة عن شغل',
    );
    const long = formatAnsweredPrefill('ا'.repeat(200), null, '');
    expect(long.endsWith('…')).toBe(true);
  });

  it('groupGratitudeByMonth skips today, blank and tombstoned rows and sorts newest first', () => {
    const row = (localDate: string, body: string, deletedAt: number | null = null) => ({
      localDate,
      body,
      deletedAt,
    });
    const groups = groupGratitudeByMonth(
      [
        row('2026-09-03', 'a'),
        row('2026-11-26', 'today'),
        row('2026-11-10', 'b'),
        row('2026-11-20', 'c'),
        row('2026-11-15', '   '),
        row('2026-11-12', 'gone', 5),
        row('2025-12-31', 'd'),
      ],
      '2026-11-26',
    );

    expect(groups.map((g) => g.monthKey)).toEqual([
      '2026-11',
      '2026-09',
      '2025-12',
    ]);
    expect(groups[0]?.monthLabel).toBe('نوفمبر ٢٠٢٦');
    expect(groups[0]?.items.map((i) => i.localDate)).toEqual([
      '2026-11-20',
      '2026-11-10',
    ]);
  });
});
