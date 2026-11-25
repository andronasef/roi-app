import path from 'node:path';
import type { ContentDeltaResponse } from '@roi/shared';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it, vi } from 'vitest';

import { DELTA_SYNC_THROTTLE_MS } from '../../../constants/sync';
import type { Clock, SyncDatabase } from '../../db/events';
import * as schema from '../../db/schema';
import type { SyncApiClient } from '../api';
import { runDeltaSyncIfDue } from '../delta-sync';
import { upsertContentBatch } from '../db-ops';
import { readLibraryCounts, readSyncState } from '../first-download';

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

function createFixedClock(nowRef: { value: number }): Clock {
  return {
    now: () => nowRef.value,
    rand: (n: number) => new Uint8Array(n),
  };
}

function seedInitialLibrary(db: SyncDatabase, checkedAt = BASE_MS): void {
  db.transaction((tx) => {
    upsertContentBatch(tx, {
      verses: [
        {
          id: 'v-1',
          ref: 'مزمور ٢٣: ١',
          text: 'الرب راعي فلا يعوزني شيء.',
          textFemale: null,
          version: 1,
          sortOrder: 1,
          tags: ['ثقة'],
          createdAt: BASE_MS,
          updatedAt: BASE_MS,
          deletedAt: null,
        },
        {
          id: 'v-2',
          ref: 'فيلبي ٤: ١٣',
          text: 'أستطيع كل شيء في المسيح الذي يقويني.',
          textFemale: null,
          version: 1,
          sortOrder: 2,
          tags: null,
          createdAt: BASE_MS,
          updatedAt: BASE_MS,
          deletedAt: null,
        },
      ],
      namesOfGod: [
        {
          id: 'n-1',
          title: 'الراعي الصالح',
          text: 'يا {الاسم}، الرب راعيك.',
          textFemale: 'يا {الاسم}، الرب راعيكِ.',
          version: 1,
          sortOrder: 1,
          tags: null,
          createdAt: BASE_MS,
          updatedAt: BASE_MS,
          deletedAt: null,
        },
      ],
      blessings: [
        {
          id: 'b-1',
          title: 'بركة الصباح',
          verseRef: 'مزمور ٢٣: ١',
          text: 'سلام الله يحفظ قلبك يا {الاسم}.',
          textFemale: null,
          version: 1,
          sortOrder: 1,
          tags: null,
          createdAt: BASE_MS,
          updatedAt: BASE_MS,
          deletedAt: null,
        },
      ],
      contentVersion: 1,
      checkedAt,
    });
  });
}

describe('silent 6-hour throttled background delta sync', () => {
  it('skips without network calls when initial download has not completed (lastContentVersion === 0)', async () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const fetchContentDelta = vi.fn<SyncApiClient['fetchContentDelta']>();
      const api: SyncApiClient = {
        fetchSnapshot: vi.fn(),
        fetchContentDelta,
      };

      const result = await runDeltaSyncIfDue({
        db,
        clock: createFixedClock({ value: BASE_MS + DELTA_SYNC_THROTTLE_MS }),
        api,
        isOnline: true,
      });

      expect(result).toEqual({ status: 'skipped', reason: 'not_initialized' });
      expect(fetchContentDelta).not.toHaveBeenCalled();
    } finally {
      sqlite.close();
    }
  });

  it('skips without network calls when offline', async () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      seedInitialLibrary(db, BASE_MS);
      const fetchContentDelta = vi.fn<SyncApiClient['fetchContentDelta']>();
      const api: SyncApiClient = {
        fetchSnapshot: vi.fn(),
        fetchContentDelta,
      };

      const result = await runDeltaSyncIfDue({
        db,
        clock: createFixedClock({ value: BASE_MS + DELTA_SYNC_THROTTLE_MS }),
        api,
        isOnline: false,
      });

      expect(result).toEqual({ status: 'skipped', reason: 'offline' });
      expect(fetchContentDelta).not.toHaveBeenCalled();
    } finally {
      sqlite.close();
    }
  });

  it('skips within 6-hour throttle window (5h 59m) and runs at >= 6h', async () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      seedInitialLibrary(db, BASE_MS);
      const nowRef = { value: BASE_MS + DELTA_SYNC_THROTTLE_MS - 60_000 };
      const fetchContentDelta = vi
        .fn<SyncApiClient['fetchContentDelta']>()
        .mockResolvedValue({
          contentVersion: 1,
          verses: [],
          namesOfGod: [],
          blessings: [],
        });

      const api: SyncApiClient = {
        fetchSnapshot: vi.fn(),
        fetchContentDelta,
      };

      const early = await runDeltaSyncIfDue({
        db,
        clock: createFixedClock(nowRef),
        api,
        isOnline: true,
      });
      expect(early).toEqual({ status: 'skipped', reason: 'throttled' });
      expect(fetchContentDelta).not.toHaveBeenCalled();

      nowRef.value = BASE_MS + DELTA_SYNC_THROTTLE_MS;
      const due = await runDeltaSyncIfDue({
        db,
        clock: createFixedClock(nowRef),
        api,
        isOnline: true,
      });
      expect(due).toEqual({ status: 'up_to_date', contentVersion: 1 });
      expect(fetchContentDelta).toHaveBeenCalledTimes(1);
      expect(fetchContentDelta).toHaveBeenCalledWith(1, undefined);
      expect(readSyncState(db)).toEqual({
        lastContentVersion: 1,
        lastCheckedAt: nowRef.value,
      });
    } finally {
      sqlite.close();
    }
  });

  it('inserts new items, updates existing items, and applies deletedAt tombstones without hard deletes', async () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      seedInitialLibrary(db, BASE_MS);
      const syncTime = BASE_MS + DELTA_SYNC_THROTTLE_MS;
      const deltaPayload: ContentDeltaResponse = {
        contentVersion: 3,
        verses: [
          // Update v-1
          {
            id: 'v-1',
            ref: 'مزمور ٢٣: ١',
            text: 'الرب راعي فلا يعوزني شيء — محدثة.',
            textFemale: null,
            version: 2,
            sortOrder: 1,
            tags: ['ثقة', 'رعاية'],
            createdAt: BASE_MS,
            updatedAt: syncTime,
            deletedAt: null,
          },
          // Tombstone v-2
          {
            id: 'v-2',
            ref: 'فيلبي ٤: ١٣',
            text: 'أستطيع كل شيء في المسيح الذي يقويني.',
            textFemale: null,
            version: 3,
            sortOrder: 2,
            tags: null,
            createdAt: BASE_MS,
            updatedAt: syncTime,
            deletedAt: syncTime,
          },
          // Insert v-3
          {
            id: 'v-3',
            ref: 'يوحنا ٣: ١٦',
            text: 'لأنه هكذا أحب الله العالم.',
            textFemale: null,
            version: 3,
            sortOrder: 3,
            tags: ['محبة'],
            createdAt: syncTime,
            updatedAt: syncTime,
            deletedAt: null,
          },
        ],
        namesOfGod: [],
        blessings: [
          {
            id: 'b-2',
            title: 'بركة المساء',
            verseRef: null,
            text: 'سلام الليل يملأ بيتك يا {الاسم}.',
            textFemale: null,
            version: 3,
            sortOrder: 2,
            tags: null,
            createdAt: syncTime,
            updatedAt: syncTime,
            deletedAt: null,
          },
        ],
      };

      const api: SyncApiClient = {
        fetchSnapshot: vi.fn(),
        fetchContentDelta: vi.fn().mockResolvedValue(deltaPayload),
      };

      const result = await runDeltaSyncIfDue({
        db,
        clock: createFixedClock({ value: syncTime }),
        api,
        isOnline: true,
      });

      expect(result).toEqual({ status: 'updated', contentVersion: 3 });
      expect(readSyncState(db)).toEqual({
        lastContentVersion: 3,
        lastCheckedAt: syncTime,
      });

      // Tombstoned v-2 is excluded from live counts, while v-3 was inserted -> live verses = 2
      expect(readLibraryCounts(db)).toEqual({
        verses: 2,
        namesOfGod: 1,
        blessings: 2,
      });

      // Tombstoned row still physically exists in SQLite with deletedAt set
      const [tombstoned] = db
        .select()
        .from(schema.verses)
        .where(eq(schema.verses.id, 'v-2'))
        .all();
      expect(tombstoned).toBeDefined();
      expect(tombstoned?.deletedAt).toBe(syncTime);
      expect(tombstoned?.version).toBe(3);

      const [updated] = db
        .select()
        .from(schema.verses)
        .where(eq(schema.verses.id, 'v-1'))
        .all();
      expect(updated?.text).toBe('الرب راعي فلا يعوزني شيء — محدثة.');
    } finally {
      sqlite.close();
    }
  });

  it('fails quietly on network error without throwing or altering existing offline content', async () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      seedInitialLibrary(db, BASE_MS);
      const api: SyncApiClient = {
        fetchSnapshot: vi.fn(),
        fetchContentDelta: vi
          .fn()
          .mockRejectedValue(new Error('503 Service Unavailable')),
      };

      const result = await runDeltaSyncIfDue({
        db,
        clock: createFixedClock({ value: BASE_MS + DELTA_SYNC_THROTTLE_MS }),
        api,
        isOnline: true,
      });

      expect(result).toEqual({ status: 'failed' });
      expect(readSyncState(db)).toEqual({
        lastContentVersion: 1,
        lastCheckedAt: BASE_MS,
      });
      expect(readLibraryCounts(db)).toEqual({
        verses: 2,
        namesOfGod: 1,
        blessings: 1,
      });
    } finally {
      sqlite.close();
    }
  });
});
