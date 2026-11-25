import path from 'node:path';
import type {
  BlessingItem,
  NameOfGodItem,
  SnapshotType,
  VerseItem,
} from '@roi/shared';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it, vi } from 'vitest';

import { CONTENT_STAGES } from '../../../constants/sync';
import type { Clock, SyncDatabase } from '../../db/events';
import * as schema from '../../db/schema';
import type { SnapshotEnvelopeByType, SyncApiClient } from '../api';
import {
  readLibraryCounts,
  readSyncState,
  runFirstDownload,
} from '../first-download';
import type { StagingManifest, StagingStore } from '../staging';

const MIGRATIONS_FOLDER = path.resolve(__dirname, '../../../drizzle');
const BASE_MS = 1_732_483_200_000;

function openMigratedMemoryDb(): {
  sqlite: Database.Database;
  db: SyncDatabase;
} {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema }) as unknown as SyncDatabase;
  migrate(drizzle(sqlite, { schema }), { migrationsFolder: MIGRATIONS_FOLDER });
  return { sqlite, db };
}

function createClock(nowMs = BASE_MS): Clock {
  let current = nowMs;
  return {
    now: () => {
      const value = current;
      current += 1000;
      return value;
    },
    rand: (n: number) => new Uint8Array(n),
  };
}

function createMemoryStagingStore(): StagingStore & {
  hasManifest: () => boolean;
  snapshotStageCount: () => number;
} {
  let manifest: StagingManifest | null = null;
  const stages = new Map<SnapshotType, SnapshotEnvelopeByType[SnapshotType]>();

  return {
    async readManifest() {
      return manifest
        ? {
            contentVersion: manifest.contentVersion,
            completed: [...manifest.completed],
          }
        : null;
    },
    async writeStage(type, envelope) {
      stages.set(type, envelope);
      const completed =
        manifest && manifest.contentVersion === envelope.contentVersion
          ? CONTENT_STAGES.filter(
              (s) => s === type || manifest!.completed.includes(s),
            )
          : [type];
      manifest = {
        contentVersion: envelope.contentVersion,
        completed: [...completed],
      };
      return {
        contentVersion: manifest.contentVersion,
        completed: [...manifest.completed],
      };
    },
    async readStage<T extends SnapshotType>(type: T) {
      return (stages.get(type) as SnapshotEnvelopeByType[T] | undefined) ?? null;
    },
    async clear() {
      manifest = null;
      stages.clear();
    },
    hasManifest() {
      return manifest !== null;
    },
    snapshotStageCount() {
      return stages.size;
    },
  };
}

function makeVerse(id: string, version: number): VerseItem {
  return {
    id,
    ref: 'مزمور ٢٣: ١',
    text: `الرب راعي فلا يعوزني شيء (${version})`,
    textFemale: null,
    version,
    sortOrder: 1,
    tags: ['ثقة'],
    createdAt: BASE_MS,
    updatedAt: BASE_MS + version * 1000,
    deletedAt: null,
  };
}

function makeName(id: string, version: number): NameOfGodItem {
  return {
    id,
    title: 'الراعي الصالح',
    text: `يا {الاسم}، الرب راعيك (${version})`,
    textFemale: `يا {الاسم}، الرب راعيكِ (${version})`,
    version,
    sortOrder: 1,
    tags: null,
    createdAt: BASE_MS,
    updatedAt: BASE_MS + version * 1000,
    deletedAt: null,
  };
}

function makeBlessing(id: string, version: number): BlessingItem {
  return {
    id,
    title: 'بركة الصباح',
    verseRef: 'مزمور ٢٣: ١',
    text: `ربنا يبارك يومك يا {الاسم} (${version})`,
    textFemale: null,
    version,
    sortOrder: 1,
    tags: ['صباح'],
    createdAt: BASE_MS,
    updatedAt: BASE_MS + version * 1000,
    deletedAt: null,
  };
}

function makeEnvelope<T extends SnapshotType>(
  type: T,
  version: number,
): SnapshotEnvelopeByType[T] {
  if (type === 'verses') {
    return {
      type: 'verses',
      contentVersion: version,
      generatedAt: BASE_MS,
      items: [makeVerse('v-1', version), makeVerse('v-2', version)],
    } as SnapshotEnvelopeByType[T];
  }
  if (type === 'names_of_god') {
    return {
      type: 'names_of_god',
      contentVersion: version,
      generatedAt: BASE_MS,
      items: [makeName('n-1', version)],
    } as SnapshotEnvelopeByType[T];
  }
  return {
    type: 'blessings',
    contentVersion: version,
    generatedAt: BASE_MS,
    items: [makeBlessing('b-1', version)],
  } as SnapshotEnvelopeByType[T];
}

describe('resumable transactional first download', () => {
  it('happy path downloads all 3 stages, commits all tables + syncMeta atomically, and clears staging', async () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const staging = createMemoryStagingStore();
      const progressCalls: [SnapshotType, number, number][] = [];
      const api: SyncApiClient = {
        fetchSnapshot: vi.fn(async (type) => makeEnvelope(type, 1)),
        fetchContentDelta: vi.fn(),
      };

      const result = await runFirstDownload({
        db,
        clock: createClock(),
        api,
        staging,
        onProgress: (stage, completed, total) => {
          progressCalls.push([stage, completed, total]);
        },
      });

      expect(result).toEqual({
        contentVersion: 1,
        counts: { verses: 2, namesOfGod: 1, blessings: 1 },
      });
      expect(readSyncState(db)).toEqual({
        lastContentVersion: 1,
        lastCheckedAt: BASE_MS,
      });
      expect(readLibraryCounts(db)).toEqual({
        verses: 2,
        namesOfGod: 1,
        blessings: 1,
      });
      expect(progressCalls).toEqual([
        ['verses', 0, 3],
        ['names_of_god', 1, 3],
        ['blessings', 2, 3],
      ]);
      expect(staging.hasManifest()).toBe(false);
      expect(staging.snapshotStageCount()).toBe(0);
    } finally {
      sqlite.close();
    }
  });

  it('leaves SQLite empty after stage 3 drop and resumes directly from blessings on retry', async () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const staging = createMemoryStagingStore();
      const fetchSnapshot = vi
        .fn<SyncApiClient['fetchSnapshot']>()
        .mockImplementationOnce(async () => makeEnvelope('verses', 1))
        .mockImplementationOnce(async () => makeEnvelope('names_of_god', 1))
        .mockRejectedValueOnce(new Error('network drop'))
        .mockImplementationOnce(async () => makeEnvelope('blessings', 1));

      const api: SyncApiClient = {
        fetchSnapshot,
        fetchContentDelta: vi.fn(),
      };

      await expect(
        runFirstDownload({ db, clock: createClock(), api, staging }),
      ).rejects.toThrow('network drop');

      expect(readSyncState(db)).toEqual({
        lastContentVersion: 0,
        lastCheckedAt: 0,
      });
      expect(readLibraryCounts(db)).toEqual({
        verses: 0,
        namesOfGod: 0,
        blessings: 0,
      });
      expect(staging.hasManifest()).toBe(true);
      expect(await staging.readManifest()).toEqual({
        contentVersion: 1,
        completed: ['verses', 'names_of_god'],
      });

      fetchSnapshot.mockClear();

      const resumed = await runFirstDownload({
        db,
        clock: createClock(),
        api,
        staging,
      });

      expect(fetchSnapshot).toHaveBeenCalledTimes(1);
      expect(fetchSnapshot).toHaveBeenCalledWith('blessings', undefined);
      expect(resumed).toEqual({
        contentVersion: 1,
        counts: { verses: 2, namesOfGod: 1, blessings: 1 },
      });
      expect(staging.hasManifest()).toBe(false);
    } finally {
      sqlite.close();
    }
  });

  it('clears staging and restarts from verses when server contentVersion advances mid-batch', async () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const staging = createMemoryStagingStore();
      const fetchOrder: SnapshotType[] = [];
      let callIndex = 0;
      const api: SyncApiClient = {
        fetchSnapshot: vi.fn(async (type) => {
          fetchOrder.push(type);
          callIndex += 1;
          // Call 1: verses at v1; Call 2: names_of_god arrives at v2 -> restart at v2!
          const version = callIndex === 1 ? 1 : 2;
          return makeEnvelope(type, version);
        }),
        fetchContentDelta: vi.fn(),
      };

      const result = await runFirstDownload({
        db,
        clock: createClock(),
        api,
        staging,
      });

      expect(fetchOrder).toEqual([
        'verses',
        'names_of_god',
        'verses',
        'names_of_god',
        'blessings',
      ]);
      expect(result.contentVersion).toBe(2);
      expect(readSyncState(db).lastContentVersion).toBe(2);

      const storedVerses = db.select().from(schema.verses).all();
      const storedNames = db.select().from(schema.namesOfGod).all();
      const storedBlessings = db.select().from(schema.blessings).all();
      expect(storedVerses.every((v) => v.version === 2)).toBe(true);
      expect(storedNames.every((n) => n.version === 2)).toBe(true);
      expect(storedBlessings.every((b) => b.version === 2)).toBe(true);
    } finally {
      sqlite.close();
    }
  });

  it('rolls back all 3 content tables and syncMeta if SQLite transaction throws, keeping staging intact', async () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const staging = createMemoryStagingStore();
      const api: SyncApiClient = {
        fetchSnapshot: vi.fn(async (type) => makeEnvelope(type, 1)),
        fetchContentDelta: vi.fn(),
      };

      // Inject a SQLite trigger failure on sync_meta insert so the transaction fails at the very end
      sqlite.exec(`
        CREATE TRIGGER fail_sync_meta_insert
        BEFORE INSERT ON sync_meta
        BEGIN
          SELECT RAISE(ABORT, 'simulated disk error');
        END;
      `);

      await expect(
        runFirstDownload({ db, clock: createClock(), api, staging }),
      ).rejects.toThrow();

      expect(readSyncState(db)).toEqual({
        lastContentVersion: 0,
        lastCheckedAt: 0,
      });
      expect(readLibraryCounts(db)).toEqual({
        verses: 0,
        namesOfGod: 0,
        blessings: 0,
      });
      expect(db.select().from(schema.verses).all()).toHaveLength(0);
      expect(db.select().from(schema.namesOfGod).all()).toHaveLength(0);
      expect(db.select().from(schema.blessings).all()).toHaveLength(0);
      expect(staging.hasManifest()).toBe(true);
    } finally {
      sqlite.close();
    }
  });
});
