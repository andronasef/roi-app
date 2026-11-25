import type { BlessingItem, NameOfGodItem, VerseItem } from '@roi/shared';

import type { SyncDatabase } from '../db/events';
import {
  blessings,
  CONTENT_SYNC_META_ID,
  namesOfGod,
  syncMeta,
  verses,
} from '../db/schema';

export type SyncTransaction = Parameters<
  Parameters<SyncDatabase['transaction']>[0]
>[0];

export interface ContentBatchPayload {
  verses: readonly VerseItem[];
  namesOfGod: readonly NameOfGodItem[];
  blessings: readonly BlessingItem[];
  contentVersion: number;
  checkedAt: number;
}

function serializeTags(tags: readonly string[] | null | undefined): string | null {
  return tags ? JSON.stringify(tags) : null;
}

/**
 * Upsert a batch of public content items (including deletedAt tombstones) and update
 * the singleton sync_meta cursor inside the caller's synchronous SQLite transaction.
 */
export function upsertContentBatch(
  tx: SyncTransaction,
  payload: ContentBatchPayload,
): void {
  for (const item of payload.verses) {
    const tagsJson = serializeTags(item.tags);
    const textFemale = item.textFemale ?? null;
    const sortOrder = item.sortOrder ?? null;
    tx.insert(verses)
      .values({
        id: item.id,
        ref: item.ref,
        text: item.text,
        textFemale,
        version: item.version,
        sortOrder,
        tagsJson,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        deletedAt: item.deletedAt,
      })
      .onConflictDoUpdate({
        target: verses.id,
        set: {
          ref: item.ref,
          text: item.text,
          textFemale,
          version: item.version,
          sortOrder,
          tagsJson,
          updatedAt: item.updatedAt,
          deletedAt: item.deletedAt,
        },
      })
      .run();
  }

  for (const item of payload.namesOfGod) {
    const tagsJson = serializeTags(item.tags);
    const textFemale = item.textFemale ?? null;
    const sortOrder = item.sortOrder ?? null;
    tx.insert(namesOfGod)
      .values({
        id: item.id,
        title: item.title,
        text: item.text,
        textFemale,
        version: item.version,
        sortOrder,
        tagsJson,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        deletedAt: item.deletedAt,
      })
      .onConflictDoUpdate({
        target: namesOfGod.id,
        set: {
          title: item.title,
          text: item.text,
          textFemale,
          version: item.version,
          sortOrder,
          tagsJson,
          updatedAt: item.updatedAt,
          deletedAt: item.deletedAt,
        },
      })
      .run();
  }

  for (const item of payload.blessings) {
    const tagsJson = serializeTags(item.tags);
    const textFemale = item.textFemale ?? null;
    const sortOrder = item.sortOrder ?? null;
    const verseRef = item.verseRef ?? null;
    tx.insert(blessings)
      .values({
        id: item.id,
        title: item.title,
        verseRef,
        text: item.text,
        textFemale,
        version: item.version,
        sortOrder,
        tagsJson,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        deletedAt: item.deletedAt,
      })
      .onConflictDoUpdate({
        target: blessings.id,
        set: {
          title: item.title,
          verseRef,
          text: item.text,
          textFemale,
          version: item.version,
          sortOrder,
          tagsJson,
          updatedAt: item.updatedAt,
          deletedAt: item.deletedAt,
        },
      })
      .run();
  }

  upsertSyncMeta(tx, payload.contentVersion, payload.checkedAt);
}

/** Upsert the singleton sync_meta row inside an active SQLite transaction. */
export function upsertSyncMeta(
  tx: SyncTransaction,
  lastContentVersion: number,
  lastCheckedAt: number,
): void {
  tx.insert(syncMeta)
    .values({
      id: CONTENT_SYNC_META_ID,
      lastContentVersion,
      lastCheckedAt,
      createdAt: lastCheckedAt,
      updatedAt: lastCheckedAt,
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: syncMeta.id,
      set: {
        lastContentVersion,
        lastCheckedAt,
        updatedAt: lastCheckedAt,
        deletedAt: null,
      },
    })
    .run();
}
