import {
  existsSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveBackendPath } from '../config/paths';
import { CONTENT_META_SINGLETON_ID, openBackendDatabase } from '../db/client';
import {
  auditLog,
  blessings,
  contentMeta,
  namesOfGod,
  suggestions,
  verses,
} from '../db/schema';
import { runBackup } from '../scripts/backup';
import { runRestore } from '../scripts/restore';
import { runSeed } from '../scripts/seed';

describe('WAL-safe VACUUM INTO backup & integrity-verified restore drill (D-07, BE-06)', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  function makeTempDir(prefix = 'roi-backup-'): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  it('backs up live WAL database with uncheckpointed frames, survives DB corruption + stale -wal/-shm, and restores all tables identically', () => {
    const dataDir = makeTempDir('roi-live-');
    const backupDir = makeTempDir('roi-bkp-');
    const handle = openBackendDatabase(dataDir);

    const seedResult = runSeed({
      db: handle.db,
      sqlite: handle.sqlite,
      dataDir,
      filePath: resolveBackendPath('seed', 'initial-content.json'),
      nowMs: 1_795_552_000_000,
    });

    const suggestionId = '01936000-9999-7000-8000-000000000001';
    handle.db
      .insert(suggestions)
      .values({
        id: suggestionId,
        kind: 'verse',
        title: 'مزمور ٩١: ١',
        text: 'اَلسَّاكِنُ فِي سِتْرِ الْعَلِيِّ فِي ظِلِّ الْقَدِيرِ يَبِيتُ.',
        textFemale: null,
        verseRef: null,
        status: 'pending',
        googleSub: 'sub-wal-test-1',
        email: 'wal-tester@example.com',
        createdAt: 1_795_552_005_000,
        updatedAt: 1_795_552_005_000,
        deletedAt: null,
      })
      .run();

    // Verify we actually have WAL mode active and capture expected state while connection remains open
    expect(handle.sqlite.pragma('journal_mode', { simple: true })).toBe('wal');

    const expectedMeta = handle.db.select().from(contentMeta).all();
    const expectedVerses = handle.db.select().from(verses).all();
    const expectedNames = handle.db.select().from(namesOfGod).all();
    const expectedBlessings = handle.db.select().from(blessings).all();
    const expectedSuggestions = handle.db.select().from(suggestions).all();
    const expectedAudit = handle.db.select().from(auditLog).all();

    expect(expectedMeta[0]?.contentVersion).toBe(seedResult.contentVersion);
    expect(expectedSuggestions).toHaveLength(1);

    const backupOutPath = join(backupDir, "snapshot-'quoted'.sqlite");
    const backupResult = runBackup({
      dbPath: handle.dbPath,
      outPath: backupOutPath,
    });

    handle.close();

    expect(backupResult.outPath).toBe(backupOutPath);
    expect(backupResult.bytes).toBeGreaterThan(0);
    expect(existsSync(backupOutPath)).toBe(true);

    // Backup must be standalone & intact without any -wal/-shm sidecar
    const verifyBackup = new Database(backupOutPath, { readonly: true });
    expect(verifyBackup.pragma('integrity_check', { simple: true })).toBe('ok');
    const backupSuggestionCount = verifyBackup
      .prepare('SELECT COUNT(*) AS count FROM suggestions WHERE id = ?')
      .get(suggestionId) as { count: number };
    expect(backupSuggestionCount.count).toBe(1);
    verifyBackup.close();

    // Corrupt working DB and leave stale -wal / -shm artifacts
    writeFileSync(handle.dbPath, 'CORRUPTED_SQLITE_BYTES', 'utf8');
    writeFileSync(`${handle.dbPath}-wal`, 'STALE_WAL_FRAMES', 'utf8');
    writeFileSync(`${handle.dbPath}-shm`, 'STALE_SHM_INDEX', 'utf8');

    const restoreResult = runRestore({
      backupPath: backupOutPath,
      dbPath: handle.dbPath,
    });

    expect(restoreResult.restoredPath).toBe(handle.dbPath);
    expect(existsSync(`${handle.dbPath}-wal`)).toBe(false);
    expect(existsSync(`${handle.dbPath}-shm`)).toBe(false);

    const reopened = openBackendDatabase(dataDir);
    try {
      expect(reopened.sqlite.pragma('integrity_check', { simple: true })).toBe('ok');
      expect(reopened.db.select().from(contentMeta).all()).toEqual(expectedMeta);
      expect(reopened.db.select().from(verses).all()).toEqual(expectedVerses);
      expect(reopened.db.select().from(namesOfGod).all()).toEqual(expectedNames);
      expect(reopened.db.select().from(blessings).all()).toEqual(expectedBlessings);
      expect(reopened.db.select().from(suggestions).all()).toEqual(expectedSuggestions);
      expect(reopened.db.select().from(auditLog).all()).toEqual(expectedAudit);
      expect(
        reopened.db
          .select()
          .from(contentMeta)
          .all()
          .find((m) => m.id === CONTENT_META_SINGLETON_ID)?.contentVersion,
      ).toBe(seedResult.contentVersion);
    } finally {
      reopened.close();
    }
  });

  it('refuses existing backup target, blocks path traversal outside backupDir, and prunes beyond retentionCount', () => {
    const dataDir = makeTempDir('roi-live-ret-');
    const backupDir = makeTempDir('roi-bkp-ret-');
    const handle = openBackendDatabase(dataDir);
    handle.close();

    // Refuses path traversal outside backupDir
    expect(() =>
      runBackup({
        dbPath: handle.dbPath,
        backupDir,
        outPath: join(backupDir, '..', 'escape.sqlite'),
      }),
    ).toThrow(/inside backup directory/i);

    // Creates timestamped backups when outPath is omitted and prunes oldest beyond retentionCount
    const first = runBackup({
      dbPath: handle.dbPath,
      backupDir,
      retentionCount: 2,
    });
    const second = runBackup({
      dbPath: handle.dbPath,
      backupDir,
      retentionCount: 2,
    });

    // Ensure distinct mtimes so pruning order is deterministic
    utimesSync(first.outPath, new Date(1_700_000_001_000), new Date(1_700_000_001_000));
    utimesSync(second.outPath, new Date(1_700_000_002_000), new Date(1_700_000_002_000));

    const third = runBackup({
      dbPath: handle.dbPath,
      backupDir,
      retentionCount: 2,
    });

    const remaining = readdirSync(backupDir).filter((name) => name.endsWith('.sqlite'));
    expect(remaining).toHaveLength(2);
    expect(existsSync(first.outPath)).toBe(false);
    expect(existsSync(second.outPath)).toBe(true);
    expect(existsSync(third.outPath)).toBe(true);

    // Refuses overwriting an existing backup file
    expect(() =>
      runBackup({
        dbPath: handle.dbPath,
        outPath: third.outPath,
      }),
    ).toThrow(/already exists/i);
  });

  it('refuses to overwrite target DB when backup is missing or corrupt', () => {
    const dataDir = makeTempDir('roi-live-safe-');
    const backupDir = makeTempDir('roi-bkp-safe-');
    const handle = openBackendDatabase(dataDir);
    runSeed({
      db: handle.db,
      sqlite: handle.sqlite,
      dataDir,
      filePath: resolveBackendPath('seed', 'initial-content.json'),
      nowMs: 1_795_552_000_000,
    });
    const beforeCount = handle.db.select().from(verses).all().length;
    handle.close();

    const missingBackup = join(backupDir, 'does-not-exist.sqlite');
    expect(() =>
      runRestore({ backupPath: missingBackup, dbPath: handle.dbPath }),
    ).toThrow(/does not exist/i);

    const corruptBackup = join(backupDir, 'corrupt.sqlite');
    writeFileSync(corruptBackup, 'not a valid sqlite database', 'utf8');
    expect(() =>
      runRestore({ backupPath: corruptBackup, dbPath: handle.dbPath }),
    ).toThrow();

    // Target DB remains untouched and intact
    const intact = openBackendDatabase(dataDir);
    try {
      expect(intact.db.select().from(verses).all()).toHaveLength(beforeCount);
    } finally {
      intact.close();
    }
  });
});
