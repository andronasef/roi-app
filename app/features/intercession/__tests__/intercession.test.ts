import path from 'node:path';
import { localDateKey } from '@roi/shared';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/telemetry', () => ({
  track: vi.fn(),
}));

import type { Clock, SyncDatabase } from '../../db/events';
import * as schema from '../../db/schema';
import {
  createPrayer,
  listPrayersWithStats,
  logPrayerWithNote,
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

describe('intercession tracer flow', () => {
  it('creates a prayer, shows prayedCount === 0, logs صليت, and increments prayedCount to 1 with todayKey', () => {
    const { sqlite, db } = openTestDb();
    try {
      const { clock, advanceMs } = createTestClock();
      const todayKey = localDateKey(new Date(clock.now()));

      const created = createPrayer(db, clock, {
        body: 'صلّي عشان شفاء ماما',
        personName: 'ماما',
      });

      const initialList = listPrayersWithStats(db);
      expect(initialList).toHaveLength(1);
      expect(initialList[0]?.id).toBe(created.id);
      expect(initialList[0]?.prayedCount).toBe(0);
      expect(initialList[0]?.lastPrayedLocalDate).toBeNull();

      advanceMs(5_000);
      logPrayerWithNote(db, clock, created.id, 'ملاحظة سريعة');

      const afterPrayed = listPrayersWithStats(db);
      expect(afterPrayed).toHaveLength(1);
      expect(afterPrayed[0]?.prayedCount).toBe(1);
      expect(afterPrayed[0]?.lastPrayedLocalDate).toBe(todayKey);
    } finally {
      sqlite.close();
    }
  });
});
