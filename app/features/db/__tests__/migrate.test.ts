import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it } from 'vitest';

import { prayedCount, reviewCount } from '../events';
import * as schema from '../schema';

const DRIZZLE_DIR = path.resolve(__dirname, '../../../drizzle');
const FIXTURES_DIR = path.resolve(__dirname, 'fixtures');
const JOURNAL_PATH = path.join(DRIZZLE_DIR, 'meta', '_journal.json');

interface Journal {
  entries: { idx: number; tag: string }[];
}

function readJournalEntryCount(): number {
  const journal = JSON.parse(readFileSync(JOURNAL_PATH, 'utf8')) as Journal;
  return journal.entries.length;
}

describe('fixture database migrations', () => {
  it.each(['v1'])(
    'migrates copied fixture %s to latest while keeping all rows, tombstones, and events intact',
    (version) => {
      const tempDir = mkdtempSync(path.join(tmpdir(), 'roi-migrate-'));
      const tempDbPath = path.join(tempDir, `${version}.sqlite`);
      copyFileSync(path.join(FIXTURES_DIR, `${version}.sqlite`), tempDbPath);

      const sqlite = new Database(tempDbPath);
      try {
        const db = drizzle(sqlite, { schema });
        migrate(db, { migrationsFolder: DRIZZLE_DIR });

        const allPrayers = db.select().from(schema.prayers).all();
        const livePrayers = allPrayers.filter((row) => row.deletedAt === null);
        const tombstonedPrayers = allPrayers.filter(
          (row) => row.deletedAt !== null,
        );
        expect(allPrayers).toHaveLength(3);
        expect(livePrayers).toHaveLength(2);
        expect(tombstonedPrayers).toHaveLength(1);

        expect(
          prayedCount(db, '01936000-0001-7000-8000-000000000001'),
        ).toBe(2);
        expect(
          prayedCount(db, '01936000-0001-7000-8000-000000000002'),
        ).toBe(1);
        expect(db.select().from(schema.prayerEvents).all()).toHaveLength(4);

        const memVerses = db.select().from(schema.memVerses).all();
        expect(memVerses).toHaveLength(1);
        expect(memVerses[0]?.fsrsModel).toBe('FSRS-7');
        expect(memVerses[0]?.fsrs).toBeTruthy();

        expect(db.select().from(schema.reviewEvents).all()).toHaveLength(2);
        expect(
          reviewCount(db, '01936000-0003-7000-8000-000000000001'),
        ).toBe(2);

        const gratitudeRows = db.select().from(schema.gratitudeLines).all();
        expect(gratitudeRows).toHaveLength(1);
        expect(gratitudeRows[0]?.id).toBe('shukr:2026-11-24');

        const settingRows = db.select().from(schema.settings).all();
        expect(settingRows).toHaveLength(1);
        expect(settingRows[0]?.value).toBe('last_boot:1732483200000');

        expect(sqlite.pragma('integrity_check', { simple: true })).toBe('ok');

        const migrationCount = sqlite
          .prepare('SELECT count(*) AS count FROM __drizzle_migrations')
          .get() as { count: number };
        expect(migrationCount.count).toBe(readJournalEntryCount());
      } finally {
        sqlite.close();
        rmSync(tempDir, { recursive: true, force: true });
      }
    },
  );

  it('migrates an empty database to the latest schema with all six tables', () => {
    const tempDir = mkdtempSync(path.join(tmpdir(), 'roi-empty-'));
    const tempDbPath = path.join(tempDir, 'empty.sqlite');
    const sqlite = new Database(tempDbPath);

    try {
      const db = drizzle(sqlite, { schema });
      migrate(db, { migrationsFolder: DRIZZLE_DIR });

      const tableRows = sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations' ORDER BY name",
        )
        .all() as { name: string }[];

      expect(tableRows.map((r) => r.name)).toEqual([
        'gratitude_lines',
        'mem_verses',
        'prayer_events',
        'prayers',
        'review_events',
        'settings',
      ]);
      expect(sqlite.pragma('integrity_check', { simple: true })).toBe('ok');

      const migrationCount = sqlite
        .prepare('SELECT count(*) AS count FROM __drizzle_migrations')
        .get() as { count: number };
      expect(migrationCount.count).toBe(readJournalEntryCount());
    } finally {
      sqlite.close();
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
