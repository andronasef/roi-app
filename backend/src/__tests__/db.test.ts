import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';
import { openBackendDatabase } from '../db/client';
import { contentMeta, suggestions } from '../db/schema';

describe('backend SQLite Drizzle schema and WAL client', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  function makeTempDataDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'roi-backend-db-'));
    tempDirs.push(dir);
    return dir;
  }

  it('opens WAL SQLite database, runs migrations, and seeds singleton content_meta row', () => {
    const dataDir = makeTempDataDir();
    const handle = openBackendDatabase(dataDir);

    try {
      expect(existsSync(join(dataDir, 'roi-content.sqlite'))).toBe(true);
      expect(handle.sqlite.pragma('journal_mode', { simple: true })).toBe('wal');
      expect(handle.sqlite.pragma('busy_timeout', { simple: true })).toBe(5000);
      expect(handle.sqlite.pragma('foreign_keys', { simple: true })).toBe(1);
      expect(handle.sqlite.pragma('integrity_check', { simple: true })).toBe('ok');

      const tables = handle.sqlite
        .prepare(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name != '__drizzle_migrations' ORDER BY name",
        )
        .all() as { name: string }[];

      expect(tables.map((t) => t.name)).toEqual([
        'audit_log',
        'blessings',
        'content_meta',
        'names_of_god',
        'suggestions',
        'verses',
      ]);

      const indexes = handle.sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%'")
        .all() as { name: string }[];
      const indexNames = new Set(indexes.map((i) => i.name));

      expect(indexNames.has('verses_version_idx')).toBe(true);
      expect(indexNames.has('names_of_god_version_idx')).toBe(true);
      expect(indexNames.has('blessings_version_idx')).toBe(true);
      expect(indexNames.has('suggestions_sub_created_idx')).toBe(true);

      const metaRows = handle.db.select().from(contentMeta).all();
      expect(metaRows).toHaveLength(1);
      expect(metaRows[0]?.id).toBe(1);
      expect(metaRows[0]?.contentVersion).toBe(0);
    } finally {
      handle.close();
    }
  });

  it('preserves existing content_meta version on reopen and defaults suggestion status to pending', () => {
    const dataDir = makeTempDataDir();
    const first = openBackendDatabase(dataDir);
    const now = 1_795_552_000_000;

    try {
      first.db
        .update(contentMeta)
        .set({ contentVersion: 4, updatedAt: now })
        .where(eq(contentMeta.id, 1))
        .run();

      first.db
        .insert(suggestions)
        .values({
          id: 'sug-1',
          kind: 'verse',
          title: 'مزمور ٢٣',
          text: 'الرب راعي',
          textFemale: null,
          verseRef: null,
          googleSub: 'sub-123',
          email: 'user@example.com',
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        })
        .run();
    } finally {
      first.close();
    }

    const reopened = openBackendDatabase(dataDir);
    try {
      const meta = reopened.db.select().from(contentMeta).where(eq(contentMeta.id, 1)).get();
      expect(meta?.contentVersion).toBe(4);

      const sug = reopened.db.select().from(suggestions).where(eq(suggestions.id, 'sug-1')).get();
      expect(sug?.status).toBe('pending');
      expect(sug?.googleSub).toBe('sub-123');
      expect(sug?.email).toBe('user@example.com');
    } finally {
      reopened.close();
    }
  });
});
