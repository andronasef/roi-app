#!/usr/bin/env node

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

if (process.versions.bun) {
  throw new Error(
    'build-fixture.mjs must run under real Node, not Bun (better-sqlite3 native module).',
  );
}

const version = process.argv[2];
if (!version || !/^[a-zA-Z0-9_-]+$/.test(version)) {
  throw new Error('Usage: ./scripts/build-fixture.mjs <version> (e.g. v1)');
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, '..');
const migrationsFolder = join(appRoot, 'drizzle');
const fixturesDir = join(appRoot, 'features', 'db', '__tests__', 'fixtures');
const fixturePath = join(fixturesDir, `${version}.sqlite`);

if (existsSync(fixturePath)) {
  throw new Error(
    `Refusing to overwrite existing frozen fixture: ${fixturePath}`,
  );
}

const tempDir = mkdtempSync(join(tmpdir(), 'roi-fixture-'));
const tempFile = join(tempDir, `${version}.sqlite`);

try {
  const sqlite = new Database(tempFile);
  sqlite.pragma('journal_mode = DELETE');

  migrate(drizzle(sqlite), { migrationsFolder });

  const BASE_TS = 1_732_483_200_000;
  const PRAYER_1_ID = '01936000-0001-7000-8000-000000000001';
  const PRAYER_2_ID = '01936000-0001-7000-8000-000000000002';
  const PRAYER_3_ID = '01936000-0001-7000-8000-000000000003';
  const MEM_VERSE_ID = '01936000-0003-7000-8000-000000000001';

  const insertSetting = sqlite.prepare(
    'INSERT INTO settings (id, created_at, updated_at, deleted_at, value) VALUES (?, ?, ?, ?, ?)',
  );
  insertSetting.run(
    '01936000-0000-7000-8000-000000000001',
    BASE_TS,
    BASE_TS,
    null,
    'last_boot:1732483200000',
  );

  const insertPrayer = sqlite.prepare(
    'INSERT INTO prayers (id, created_at, updated_at, deleted_at, body, person_name, since_local_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  insertPrayer.run(
    PRAYER_1_ID,
    BASE_TS + 1_000,
    BASE_TS + 1_000,
    null,
    'صلاة من أجل السلام والفرح اليومي',
    'مريم',
    '2026-11-20',
  );
  insertPrayer.run(
    PRAYER_2_ID,
    BASE_TS + 2_000,
    BASE_TS + 2_000,
    null,
    'صلاة شكر على حفظ العائلة',
    'يوسف',
    '2026-11-22',
  );
  insertPrayer.run(
    PRAYER_3_ID,
    BASE_TS + 3_000,
    BASE_TS + 9_000,
    BASE_TS + 9_000,
    'صلاة تجريبية مؤرشفة',
    null,
    '2026-11-18',
  );

  const insertPrayerEvent = sqlite.prepare(
    'INSERT INTO prayer_events (id, created_at, updated_at, deleted_at, prayer_id, prayed_at, local_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  insertPrayerEvent.run(
    '01936000-0002-7000-8000-000000000001',
    BASE_TS + 10_000,
    BASE_TS + 10_000,
    null,
    PRAYER_1_ID,
    BASE_TS + 10_000,
    '2026-11-24',
  );
  insertPrayerEvent.run(
    '01936000-0002-7000-8000-000000000002',
    BASE_TS + 11_000,
    BASE_TS + 15_000,
    BASE_TS + 15_000,
    PRAYER_1_ID,
    BASE_TS + 11_000,
    '2026-11-24',
  );
  insertPrayerEvent.run(
    '01936000-0002-7000-8000-000000000003',
    BASE_TS + 12_000,
    BASE_TS + 12_000,
    null,
    PRAYER_1_ID,
    BASE_TS + 12_000,
    '2026-11-24',
  );
  insertPrayerEvent.run(
    '01936000-0002-7000-8000-000000000004',
    BASE_TS + 13_000,
    BASE_TS + 13_000,
    null,
    PRAYER_2_ID,
    BASE_TS + 13_000,
    '2026-11-24',
  );

  const insertMemVerse = sqlite.prepare(
    'INSERT INTO mem_verses (id, created_at, updated_at, deleted_at, verse_id, fsrs, fsrs_model) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  insertMemVerse.run(
    MEM_VERSE_ID,
    BASE_TS + 20_000,
    BASE_TS + 22_000,
    null,
    'psalm-23-1',
    JSON.stringify({
      cardId: 'psalm-23-1',
      stability: 3.5,
      stabilityFast: 3.5,
      difficulty: 4.2,
      dueAt: BASE_TS + 86_400_000,
      lastReviewAt: BASE_TS + 22_000,
      reps: 2,
      lapses: 0,
      scheduledDays: 1,
      learningStep: 0,
      state: 2,
      scheduleStatus: 0,
    }),
    'FSRS-7',
  );

  const insertReviewEvent = sqlite.prepare(
    'INSERT INTO review_events (id, created_at, updated_at, deleted_at, mem_verse_id, rating, reviewed_at, local_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  );
  insertReviewEvent.run(
    '01936000-0004-7000-8000-000000000001',
    BASE_TS + 21_000,
    BASE_TS + 21_000,
    null,
    MEM_VERSE_ID,
    3,
    BASE_TS + 21_000,
    '2026-11-24',
  );
  insertReviewEvent.run(
    '01936000-0004-7000-8000-000000000002',
    BASE_TS + 22_000,
    BASE_TS + 22_000,
    null,
    MEM_VERSE_ID,
    4,
    BASE_TS + 22_000,
    '2026-11-24',
  );

  const insertGratitude = sqlite.prepare(
    'INSERT INTO gratitude_lines (id, created_at, updated_at, deleted_at, local_date, body) VALUES (?, ?, ?, ?, ?, ?)',
  );
  insertGratitude.run(
    'shukr:2026-11-24',
    BASE_TS + 30_000,
    BASE_TS + 30_000,
    null,
    '2026-11-24',
    'أشكرك على نعمة الهدوء والرجاء اليوم',
  );

  sqlite.exec('VACUUM');
  sqlite.close();

  mkdirSync(fixturesDir, { recursive: true });
  copyFileSync(tempFile, fixturePath);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
