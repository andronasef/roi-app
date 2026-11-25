import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  contentDeltaResponseSchema,
  uuidv7,
  type BlessingItem,
  type ContentDeltaResponse,
  type NameOfGodItem,
  type VerseItem,
} from '@roi/shared';
import type Database from 'better-sqlite3';
import { asc, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { CONTENT_META_SINGLETON_ID, type BackendDatabase } from '../db/client';
import { DRIZZLE_DB, SQLITE_DB } from '../db/drizzle.module';
import { auditLog, blessings, contentMeta, namesOfGod, verses } from '../db/schema';
import { parseTagsJson } from './snapshot-builder';
import { SnapshotService } from './snapshot.service';

const sinceVersionSchema = z.number().int().nonnegative();

export interface ApplyContentMutationContext {
  readonly db: BackendDatabase;
  readonly nextVersion: number;
  readonly nowMs: number;
}

export interface ApplyContentMutationOptions<TResult> {
  readonly actorEmail: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly nowMs?: number;
  readonly summarize?: (result: TResult) => Record<string, unknown>;
  readonly mutate: (ctx: ApplyContentMutationContext) => TResult;
}

@Injectable()
export class ContentService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: BackendDatabase,
    @Inject(SQLITE_DB) private readonly sqlite: Database.Database,
    private readonly snapshotService: SnapshotService,
  ) {}

  /** Read the current global monotonic content version from `content_meta`. */
  getCurrentVersion(): number {
    const metaRow = this.db
      .select()
      .from(contentMeta)
      .where(eq(contentMeta.id, CONTENT_META_SINGLETON_ID))
      .get();
    return metaRow?.contentVersion ?? 0;
  }

  /**
   * Return all changed, added, and soft-deleted (`deletedAt != null`) items
   * with `version > sinceVersion`, ordered monotonically by `(version, id)`.
   */
  getContentDelta(sinceVersion: number): ContentDeltaResponse {
    const validSince = sinceVersionSchema.parse(sinceVersion);
    const contentVersion = this.getCurrentVersion();

    const changedVerses: VerseItem[] = this.db
      .select()
      .from(verses)
      .where(gt(verses.version, validSince))
      .orderBy(asc(verses.version), asc(verses.id))
      .all()
      .map((row) => ({
        id: row.id,
        ref: row.ref,
        text: row.text,
        textFemale: row.textFemale,
        version: row.version,
        sortOrder: row.sortOrder,
        tags: parseTagsJson(row.tagsJson),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
      }));

    const changedNames: NameOfGodItem[] = this.db
      .select()
      .from(namesOfGod)
      .where(gt(namesOfGod.version, validSince))
      .orderBy(asc(namesOfGod.version), asc(namesOfGod.id))
      .all()
      .map((row) => ({
        id: row.id,
        title: row.title,
        text: row.text,
        textFemale: row.textFemale,
        version: row.version,
        sortOrder: row.sortOrder,
        tags: parseTagsJson(row.tagsJson),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
      }));

    const changedBlessings: BlessingItem[] = this.db
      .select()
      .from(blessings)
      .where(gt(blessings.version, validSince))
      .orderBy(asc(blessings.version), asc(blessings.id))
      .all()
      .map((row) => ({
        id: row.id,
        title: row.title,
        verseRef: row.verseRef,
        text: row.text,
        textFemale: row.textFemale,
        version: row.version,
        sortOrder: row.sortOrder,
        tags: parseTagsJson(row.tagsJson),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
      }));

    return contentDeltaResponseSchema.parse({
      contentVersion,
      verses: changedVerses,
      namesOfGod: changedNames,
      blessings: changedBlessings,
    });
  }

  /**
   * Execute a content mutation inside a single SQLite transaction:
   * increment `content_meta.content_version`, run `mutate`, insert `audit_log`,
   * then rebuild `.json.gz` snapshots and refresh the in-memory cache after commit.
   */
  applyContentMutation<TResult>(options: ApplyContentMutationOptions<TResult>): {
    contentVersion: number;
    result: TResult;
  } {
    const nowMs = options.nowMs ?? Date.now();

    const executeTx = this.sqlite.transaction(() => {
      const nextVersion = this.getCurrentVersion() + 1;

      this.db
        .insert(contentMeta)
        .values({
          id: CONTENT_META_SINGLETON_ID,
          contentVersion: nextVersion,
          updatedAt: nowMs,
        })
        .onConflictDoUpdate({
          target: contentMeta.id,
          set: {
            contentVersion: nextVersion,
            updatedAt: nowMs,
          },
        })
        .run();

      const result = options.mutate({
        db: this.db,
        nextVersion,
        nowMs,
      });

      const summary = options.summarize ? options.summarize(result) : {};
      this.db
        .insert(auditLog)
        .values({
          id: uuidv7(nowMs, randomBytes),
          actorEmail: options.actorEmail,
          action: options.action,
          entityType: options.entityType,
          entityId: options.entityId,
          contentVersion: nextVersion,
          summaryJson: JSON.stringify(summary),
          createdAt: nowMs,
        })
        .run();

      return { contentVersion: nextVersion, result };
    });

    // IMMEDIATE takes the write lock up front so the version read-then-write cannot race another process.
    const txOut = executeTx.immediate();
    this.snapshotService.refreshCache(nowMs);
    return txOut;
  }
}
