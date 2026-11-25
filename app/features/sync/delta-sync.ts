import type { ContentDeltaResponse } from '@roi/shared';

import { DELTA_SYNC_THROTTLE_MS } from '../../constants/sync';
import type { Clock, SyncDatabase } from '../db/events';
import type { SyncApiClient } from './api';
import { upsertContentBatch, upsertSyncMeta } from './db-ops';
import { readSyncState } from './first-download';

export type DeltaSyncResult =
  | { status: 'skipped'; reason: 'not_initialized' | 'offline' | 'throttled' }
  | { status: 'up_to_date'; contentVersion: number }
  | { status: 'updated'; contentVersion: number }
  | { status: 'reset'; serverContentVersion: number }
  | { status: 'failed' };

export interface RunDeltaSyncParams {
  db: SyncDatabase;
  clock: Clock;
  api: SyncApiClient;
  isOnline: boolean;
  throttleMs?: number;
  signal?: AbortSignal;
}

/**
 * Silent 6-hour throttled background delta sync (D-03, BE-02).
 * Never runs before first download completes, never throws on transient network failure,
 * and applies inserts/updates plus deletedAt tombstones inside one atomic SQLite transaction.
 */
export async function runDeltaSyncIfDue({
  db,
  clock,
  api,
  isOnline,
  throttleMs = DELTA_SYNC_THROTTLE_MS,
  signal,
}: RunDeltaSyncParams): Promise<DeltaSyncResult> {
  let syncState: ReturnType<typeof readSyncState>;
  try {
    syncState = readSyncState(db);
  } catch {
    return { status: 'failed' };
  }
  if (syncState.lastContentVersion <= 0) {
    return { status: 'skipped', reason: 'not_initialized' };
  }

  if (!isOnline) {
    return { status: 'skipped', reason: 'offline' };
  }

  const now = clock.now();
  if (now - syncState.lastCheckedAt < throttleMs) {
    return { status: 'skipped', reason: 'throttled' };
  }

  let delta: ContentDeltaResponse;
  try {
    delta = await api.fetchContentDelta(syncState.lastContentVersion, signal);
  } catch {
    return { status: 'failed' };
  }

  const checkedAt = clock.now();
  try {
    if (delta.contentVersion > syncState.lastContentVersion) {
      db.transaction((tx) => {
        upsertContentBatch(tx, {
          verses: delta.verses,
          namesOfGod: delta.namesOfGod,
          blessings: delta.blessings,
          contentVersion: delta.contentVersion,
          checkedAt,
        });
      });
      return { status: 'updated', contentVersion: delta.contentVersion };
    }

    if (delta.contentVersion < syncState.lastContentVersion) {
      // Server is behind this client (e.g. restored from an older backup): the version lineage was
      // rewound, so deltas can never catch up. Rewind the cursor so the gate re-runs first download.
      db.transaction((tx) => {
        upsertSyncMeta(tx, 0, checkedAt);
      });
      return { status: 'reset', serverContentVersion: delta.contentVersion };
    }

    db.transaction((tx) => {
      upsertSyncMeta(tx, syncState.lastContentVersion, checkedAt);
    });
    return { status: 'up_to_date', contentVersion: syncState.lastContentVersion };
  } catch {
    return { status: 'failed' };
  }
}
