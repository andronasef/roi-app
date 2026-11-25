import type { SnapshotType } from '@roi/shared';
import { and, count, eq, isNull } from 'drizzle-orm';

import { CONTENT_STAGES } from '../../constants/sync';
import type { Clock, SyncDatabase } from '../db/events';
import {
  blessings,
  CONTENT_SYNC_META_ID,
  namesOfGod,
  syncMeta,
  verses,
} from '../db/schema';
import type { SnapshotEnvelopeByType, SyncApiClient } from './api';
import { upsertContentBatch } from './db-ops';
import type { StagingStore } from './staging';

const MAX_VERSION_MISMATCH_RESTARTS = 3;

export interface SyncState {
  lastContentVersion: number;
  lastCheckedAt: number;
}

export interface LibraryCounts {
  verses: number;
  namesOfGod: number;
  blessings: number;
}

export type FirstDownloadProgress = (
  stage: SnapshotType,
  completedCount: number,
  totalCount: number,
) => void;

export interface RunFirstDownloadParams {
  db: SyncDatabase;
  clock: Clock;
  api: SyncApiClient;
  staging: StagingStore;
  onProgress?: FirstDownloadProgress;
  signal?: AbortSignal;
}

export interface FirstDownloadResult {
  contentVersion: number;
  counts: LibraryCounts;
}

/** Read current local contentVersion cursor and last delta-check timestamp from sync_meta. */
export function readSyncState(db: SyncDatabase): SyncState {
  const rows = db
    .select({
      lastContentVersion: syncMeta.lastContentVersion,
      lastCheckedAt: syncMeta.lastCheckedAt,
    })
    .from(syncMeta)
    .where(
      and(eq(syncMeta.id, CONTENT_SYNC_META_ID), isNull(syncMeta.deletedAt)),
    )
    .all();

  const row = rows[0];
  if (!row) {
    return { lastContentVersion: 0, lastCheckedAt: 0 };
  }

  return {
    lastContentVersion: row.lastContentVersion,
    lastCheckedAt: row.lastCheckedAt,
  };
}

/** Count non-tombstoned public library items stored locally across all 3 tables. */
export function readLibraryCounts(db: SyncDatabase): LibraryCounts {
  const [versesRow] = db
    .select({ total: count() })
    .from(verses)
    .where(isNull(verses.deletedAt))
    .all();
  const [namesRow] = db
    .select({ total: count() })
    .from(namesOfGod)
    .where(isNull(namesOfGod.deletedAt))
    .all();
  const [blessingsRow] = db
    .select({ total: count() })
    .from(blessings)
    .where(isNull(blessings.deletedAt))
    .all();

  return {
    verses: versesRow?.total ?? 0,
    namesOfGod: namesRow?.total ?? 0,
    blessings: blessingsRow?.total ?? 0,
  };
}

async function resolveVerifiedStagedStages(
  staging: StagingStore,
): Promise<{ expectedVersion: number | null; completed: Set<SnapshotType> }> {
  const manifest = await staging.readManifest();
  if (!manifest || manifest.contentVersion <= 0) {
    return { expectedVersion: null, completed: new Set() };
  }

  const verified = new Set<SnapshotType>();
  for (const stage of CONTENT_STAGES) {
    if (!manifest.completed.includes(stage)) {
      continue;
    }
    const staged = await staging.readStage(stage);
    if (staged && staged.contentVersion === manifest.contentVersion) {
      verified.add(stage);
    }
  }

  if (verified.size === 0) {
    await staging.clear();
    return { expectedVersion: null, completed: new Set() };
  }

  return { expectedVersion: manifest.contentVersion, completed: verified };
}

/**
 * Resumable 3-stage initial content downloader (D-02, HOME-07):
 * - Stages each completed snapshot to disk before moving on.
 * - Resumes from the first uncompleted stage on retry/restart.
 * - Clears staging and restarts from stage 1 if server contentVersion shifts mid-batch.
 * - Commits all 3 tables + sync_meta inside one atomic synchronous SQLite transaction,
 *   and clears staging only after the transaction succeeds.
 */
export async function runFirstDownload({
  db,
  clock,
  api,
  staging,
  onProgress,
  signal,
}: RunFirstDownloadParams): Promise<FirstDownloadResult> {
  let { expectedVersion, completed } = await resolveVerifiedStagedStages(staging);
  let restarts = 0;

  while (completed.size < CONTENT_STAGES.length) {
    const remaining = CONTENT_STAGES.filter((stage) => !completed.has(stage));
    let restarted = false;

    for (const stage of remaining) {
      onProgress?.(stage, completed.size, CONTENT_STAGES.length);

      const fetched = await api.fetchSnapshot(stage, signal);

      if (
        expectedVersion !== null &&
        fetched.contentVersion !== expectedVersion
      ) {
        restarts += 1;
        if (restarts > MAX_VERSION_MISMATCH_RESTARTS) {
          throw new Error(
            'Content version kept changing during download; please retry.',
          );
        }
        await staging.clear();
        expectedVersion = null;
        completed = new Set();
        restarted = true;
        break;
      }

      expectedVersion = fetched.contentVersion;
      await staging.writeStage(stage, fetched);
      completed.add(stage);
    }

    if (!restarted && completed.size < CONTENT_STAGES.length) {
      break;
    }
  }

  const versesEnvelope = (await staging.readStage('verses')) as
    | SnapshotEnvelopeByType['verses']
    | null;
  const namesEnvelope = (await staging.readStage('names_of_god')) as
    | SnapshotEnvelopeByType['names_of_god']
    | null;
  const blessingsEnvelope = (await staging.readStage('blessings')) as
    | SnapshotEnvelopeByType['blessings']
    | null;

  if (!versesEnvelope || !namesEnvelope || !blessingsEnvelope) {
    await staging.clear();
    throw new Error('Staged snapshot missing before atomic SQLite commit.');
  }

  const uniformVersion = versesEnvelope.contentVersion;
  if (
    namesEnvelope.contentVersion !== uniformVersion ||
    blessingsEnvelope.contentVersion !== uniformVersion
  ) {
    await staging.clear();
    throw new Error('Staged contentVersion mismatch before atomic SQLite commit.');
  }

  const checkedAt = clock.now();
  db.transaction((tx) => {
    upsertContentBatch(tx, {
      verses: versesEnvelope.items,
      namesOfGod: namesEnvelope.items,
      blessings: blessingsEnvelope.items,
      contentVersion: uniformVersion,
      checkedAt,
    });
  });

  await staging.clear();

  return {
    contentVersion: uniformVersion,
    counts: readLibraryCounts(db),
  };
}
