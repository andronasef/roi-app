import {
  copyFileSync,
  mkdtempSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { isNull } from 'drizzle-orm';
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
  it.each(['v1', 'v2'])(
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
        for (const prayer of allPrayers) {
          expect(prayer.pinnedAt).toBeNull();
          expect(prayer.answeredAt).toBeNull();
          expect(prayer.outcome).toBeNull();
        }

        expect(
          prayedCount(db, '01936000-0001-7000-8000-000000000001'),
        ).toBe(2);
        expect(
          prayedCount(db, '01936000-0001-7000-8000-000000000002'),
        ).toBe(1);
        const allPrayerEvents = db.select().from(schema.prayerEvents).all();
        expect(allPrayerEvents).toHaveLength(4);
        for (const event of allPrayerEvents) {
          expect(event.note).toBeNull();
        }

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

        const allVerses = db.select().from(schema.verses).all();
        const allNames = db.select().from(schema.namesOfGod).all();
        const allBlessings = db.select().from(schema.blessings).all();
        const allSyncMeta = db.select().from(schema.syncMeta).all();

        if (version === 'v1') {
          expect(allVerses).toHaveLength(0);
          expect(allNames).toHaveLength(0);
          expect(allBlessings).toHaveLength(0);
          expect(allSyncMeta).toHaveLength(0);
        } else {
          const liveVerses = allVerses.filter((row) => row.deletedAt === null);
          const tombstonedVerses = allVerses.filter(
            (row) => row.deletedAt !== null,
          );
          expect(allVerses).toHaveLength(2);
          expect(liveVerses).toHaveLength(1);
          expect(tombstonedVerses).toHaveLength(1);

          expect(allNames).toHaveLength(1);
          expect(allNames[0]?.deletedAt).toBeNull();

          expect(allBlessings).toHaveLength(1);
          expect(allBlessings[0]?.deletedAt).toBeNull();

          expect(allSyncMeta).toHaveLength(1);
          expect(allSyncMeta[0]?.id).toBe(schema.CONTENT_SYNC_META_ID);
          expect(allSyncMeta[0]?.lastContentVersion).toBe(1);
        }

        expect(sqlite.pragma('integrity_check', { simple: true })).toBe('ok');

        const migrationCount = sqlite
          .prepare('SELECT count(*) AS count FROM __drizzle_migrations')
          .get() as { count: number };
        expect(readJournalEntryCount()).toBe(4);
        expect(migrationCount.count).toBe(readJournalEntryCount());
      } finally {
        sqlite.close();
        rmSync(tempDir, { recursive: true, force: true });
      }
    },
  );

  it('migrates an empty database to the latest schema with all thirteen tables', () => {
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
        'blessings',
        'favorites',
        'gratitude_lines',
        'mem_verses',
        'names_of_god',
        'personal_items',
        'prayer_events',
        'prayers',
        'review_events',
        'settings',
        'sync_meta',
        'verse_assignments',
        'verses',
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

  it('supports idempotent upsert and deletedAt tombstone updates on public content tables', () => {
    const sqlite = new Database(':memory:');
    try {
      const db = drizzle(sqlite, { schema });
      migrate(db, { migrationsFolder: DRIZZLE_DIR });

      const now = 1_732_483_200_000;
      db.insert(schema.verses)
        .values({
          id: 'verse-1',
          ref: 'مزمور ٢٣: ١',
          text: 'الرب راعي فلا يعوزني شيء',
          textFemale: null,
          version: 1,
          sortOrder: 1,
          tagsJson: '["سلام"]',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        })
        .onConflictDoUpdate({
          target: schema.verses.id,
          set: {
            text: 'الرب راعي فلا يعوزني شيء',
            version: 1,
            updatedAt: now,
            deletedAt: null,
          },
        })
        .run();

      db.insert(schema.verses)
        .values({
          id: 'verse-1',
          ref: 'مزمور ٢٣: ١',
          text: 'الرب راعي فلا يعوزني شيء',
          textFemale: null,
          version: 2,
          sortOrder: 1,
          tagsJson: '["سلام"]',
          createdAt: now,
          updatedAt: now + 1000,
          deletedAt: now + 1000,
        })
        .onConflictDoUpdate({
          target: schema.verses.id,
          set: {
            version: 2,
            updatedAt: now + 1000,
            deletedAt: now + 1000,
          },
        })
        .run();

      const allRows = db.select().from(schema.verses).all();
      const liveRows = db
        .select()
        .from(schema.verses)
        .where(isNull(schema.verses.deletedAt))
        .all();
      expect(allRows).toHaveLength(1);
      expect(allRows[0]?.version).toBe(2);
      expect(allRows[0]?.deletedAt).toBe(now + 1000);
      expect(liveRows).toHaveLength(0);
    } finally {
      sqlite.close();
    }
  });
});
