import { randomBytes } from 'node:crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type ContentKind, uuidv7 } from '@roi/shared';
import type Database from 'better-sqlite3';
import { and, asc, count, desc, eq } from 'drizzle-orm';
import { ContentService } from '../content/content.service';
import type { BackendDatabase } from '../db/client';
import { DRIZZLE_DB, SQLITE_DB } from '../db/drizzle.module';
import {
  auditLog,
  blessings,
  namesOfGod,
  suggestions,
  verses,
} from '../db/schema';

export type SuggestionStatusFilter = 'pending' | 'accepted' | 'rejected' | 'all';

export interface SubmitterStats {
  readonly pendingCount: number;
  readonly acceptedCount: number;
  readonly rejectedCount: number;
}

export interface AdminSuggestionRecord {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly text: string;
  readonly textFemale: string | null;
  readonly verseRef: string | null;
  readonly status: string;
  readonly moderationNote: string | null;
  readonly googleSub: string;
  readonly email: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly submitterStats: SubmitterStats;
}

export interface AcceptSuggestionPayload {
  readonly kind: ContentKind;
  readonly title: string;
  readonly verseRef?: string | null;
  readonly text: string;
  readonly textFemale?: string | null;
}

function emptyStats(): { pendingCount: number; acceptedCount: number; rejectedCount: number } {
  return { pendingCount: 0, acceptedCount: 0, rejectedCount: 0 };
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  return value.trim().length === 0 ? null : value;
}

function normalizeTrimmedOptional(value: string | null | undefined): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function mapSuggestionRow(
  row: typeof suggestions.$inferSelect,
  submitterStats: SubmitterStats,
): AdminSuggestionRecord {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    text: row.text,
    textFemale: row.textFemale,
    verseRef: row.verseRef,
    status: row.status,
    moderationNote: row.moderationNote ?? null,
    googleSub: row.googleSub,
    email: row.email,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    submitterStats,
  };
}

function addStatusCount(
  target: { pendingCount: number; acceptedCount: number; rejectedCount: number },
  status: string,
  total: number,
): void {
  if (status === 'pending') {
    target.pendingCount += total;
  } else if (status === 'accepted') {
    target.acceptedCount += total;
  } else if (status === 'rejected') {
    target.rejectedCount += total;
  }
}

/**
 * Admin suggestion moderation queue service providing submitter historical counts,
 * atomic Accept & Publish promotion into public tables, one-click Reject with optional note,
 * and SQLite-guarded concurrent moderation protection (ADM-07, D-09..D-11).
 */
@Injectable()
export class AdminModerationService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: BackendDatabase,
    @Inject(SQLITE_DB) private readonly sqlite: Database.Database,
    private readonly contentService: ContentService,
  ) {}

  listSuggestions(status: SuggestionStatusFilter = 'pending'): AdminSuggestionRecord[] {
    const rows =
      status === 'all'
        ? this.db
            .select()
            .from(suggestions)
            .orderBy(desc(suggestions.createdAt), desc(suggestions.id))
            .all()
        : status === 'pending'
          ? this.db
              .select()
              .from(suggestions)
              .where(eq(suggestions.status, 'pending'))
              .orderBy(asc(suggestions.createdAt), asc(suggestions.id))
              .all()
          : this.db
              .select()
              .from(suggestions)
              .where(eq(suggestions.status, status))
              .orderBy(desc(suggestions.createdAt), desc(suggestions.id))
              .all();

    if (rows.length === 0) {
      return [];
    }

    const statsBySub = this.loadAllSubmitterStats(this.db);
    return rows.map((row) =>
      mapSuggestionRow(row, statsBySub.get(row.googleSub) ?? emptyStats()),
    );
  }

  getSuggestion(id: string): AdminSuggestionRecord {
    const row = this.db.select().from(suggestions).where(eq(suggestions.id, id)).get();
    if (!row) {
      throw new NotFoundException('SUGGESTION_NOT_FOUND');
    }
    const stats = this.loadSubmitterStats(this.db, row.googleSub);
    return mapSuggestionRow(row, stats);
  }

  acceptSuggestion(
    actorEmail: string,
    id: string,
    input: AcceptSuggestionPayload,
  ): AdminSuggestionRecord {
    const nowMs = Date.now();
    const newItemId = uuidv7(nowMs, randomBytes);
    const title = input.title.trim();
    const verseRef = normalizeTrimmedOptional(input.verseRef);
    const textFemale = input.kind === 'verse' ? normalizeOptionalText(input.textFemale) : null;

    const { result } = this.contentService.applyContentMutation<AdminSuggestionRecord>({
      actorEmail,
      action: 'accept_suggestion',
      entityType: 'suggestion',
      entityId: id,
      nowMs,
      summarize: () => ({
        suggestionId: id,
        kind: input.kind,
        title,
        newItemId,
      }),
      mutate: ({ db, nextVersion }) => {
        const existing = db.select().from(suggestions).where(eq(suggestions.id, id)).get();
        if (!existing) {
          throw new NotFoundException('SUGGESTION_NOT_FOUND');
        }

        const updateRes = db
          .update(suggestions)
          .set({ status: 'accepted', updatedAt: nowMs })
          .where(and(eq(suggestions.id, id), eq(suggestions.status, 'pending')))
          .run();

        if (updateRes.changes !== 1) {
          throw new ConflictException('SUGGESTION_ALREADY_MODERATED');
        }

        if (input.kind === 'verse') {
          db.insert(verses)
            .values({
              id: newItemId,
              ref: title,
              text: input.text,
              textFemale,
              version: nextVersion,
              sortOrder: null,
              tagsJson: null,
              createdAt: nowMs,
              updatedAt: nowMs,
              deletedAt: null,
            })
            .run();
        } else if (input.kind === 'name_of_god') {
          db.insert(namesOfGod)
            .values({
              id: newItemId,
              title,
              text: input.text,
              version: nextVersion,
              sortOrder: null,
              tagsJson: null,
              createdAt: nowMs,
              updatedAt: nowMs,
              deletedAt: null,
            })
            .run();
        } else {
          db.insert(blessings)
            .values({
              id: newItemId,
              title,
              verseRef,
              text: input.text,
              version: nextVersion,
              sortOrder: null,
              tagsJson: null,
              createdAt: nowMs,
              updatedAt: nowMs,
              deletedAt: null,
            })
            .run();
        }

        const updated = db.select().from(suggestions).where(eq(suggestions.id, id)).get();
        if (!updated) {
          throw new NotFoundException('SUGGESTION_NOT_FOUND');
        }
        const stats = this.loadSubmitterStats(db, updated.googleSub);
        return mapSuggestionRow(updated, stats);
      },
    });

    return result;
  }

  rejectSuggestion(
    actorEmail: string,
    id: string,
    note?: string | null,
  ): AdminSuggestionRecord {
    const trimmedNoteOrNull = normalizeTrimmedOptional(note);

    const executeTx = this.sqlite.transaction((): AdminSuggestionRecord => {
      const nowMs = Date.now();
      const existing = this.db.select().from(suggestions).where(eq(suggestions.id, id)).get();
      if (!existing) {
        throw new NotFoundException('SUGGESTION_NOT_FOUND');
      }

      const updateRes = this.db
        .update(suggestions)
        .set({
          status: 'rejected',
          moderationNote: trimmedNoteOrNull,
          updatedAt: nowMs,
        })
        .where(and(eq(suggestions.id, id), eq(suggestions.status, 'pending')))
        .run();

      if (updateRes.changes !== 1) {
        throw new ConflictException('SUGGESTION_ALREADY_MODERATED');
      }

      this.db
        .insert(auditLog)
        .values({
          id: uuidv7(nowMs, randomBytes),
          actorEmail,
          action: 'reject_suggestion',
          entityType: 'suggestion',
          entityId: id,
          contentVersion: this.contentService.getCurrentVersion(),
          summaryJson: JSON.stringify({
            note: trimmedNoteOrNull,
            kind: existing.kind,
            title: existing.title,
          }),
          createdAt: nowMs,
        })
        .run();

      const updated = this.db.select().from(suggestions).where(eq(suggestions.id, id)).get();
      if (!updated) {
        throw new NotFoundException('SUGGESTION_NOT_FOUND');
      }
      const stats = this.loadSubmitterStats(this.db, updated.googleSub);
      return mapSuggestionRow(updated, stats);
    });

    return executeTx.immediate();
  }

  private loadAllSubmitterStats(db: BackendDatabase): Map<string, SubmitterStats> {
    const grouped = db
      .select({
        googleSub: suggestions.googleSub,
        status: suggestions.status,
        total: count(),
      })
      .from(suggestions)
      .groupBy(suggestions.googleSub, suggestions.status)
      .all();

    const map = new Map<string, { pendingCount: number; acceptedCount: number; rejectedCount: number }>();
    for (const row of grouped) {
      let stats = map.get(row.googleSub);
      if (!stats) {
        stats = emptyStats();
        map.set(row.googleSub, stats);
      }
      addStatusCount(stats, row.status, row.total);
    }
    return map;
  }

  private loadSubmitterStats(db: BackendDatabase, googleSub: string): SubmitterStats {
    const grouped = db
      .select({
        status: suggestions.status,
        total: count(),
      })
      .from(suggestions)
      .where(eq(suggestions.googleSub, googleSub))
      .groupBy(suggestions.status)
      .all();

    const stats = emptyStats();
    for (const row of grouped) {
      addStatusCount(stats, row.status, row.total);
    }
    return stats;
  }
}
