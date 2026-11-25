import { randomBytes } from 'node:crypto';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { type SubmitSuggestionInput, uuidv7 } from '@roi/shared';
import type Database from 'better-sqlite3';
import { and, count, eq, gte } from 'drizzle-orm';
import type { GoogleUser } from '../common/google-auth.guard';
import type { BackendDatabase } from '../db/client';
import { DRIZZLE_DB, SQLITE_DB } from '../db/drizzle.module';
import { suggestions } from '../db/schema';

export const DAILY_SUGGESTION_LIMIT = 10;

export interface SuggestionReceipt {
  readonly id: string;
  readonly status: 'pending';
  readonly createdAt: number;
  readonly remainingToday: number;
}

function utcDayStartMs(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Enforces durable 10/UTC-day per-Google-account quota in SQLite and inserts
 * pending community content suggestions without storing unrelated personal data (D-10, D-11).
 */
@Injectable()
export class SuggestionsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: BackendDatabase,
    @Inject(SQLITE_DB) private readonly sqlite: Database.Database,
  ) {}

  submitSuggestion(
    user: GoogleUser,
    input: SubmitSuggestionInput,
    nowMs = Date.now(),
  ): SuggestionReceipt {
    const dayStartMs = utcDayStartMs(nowMs);

    const executeTx = this.sqlite.transaction((): SuggestionReceipt => {
      const countRows = this.db
        .select({ total: count() })
        .from(suggestions)
        .where(
          and(
            eq(suggestions.googleSub, user.googleSub),
            // Soft-deleted (rejected) rows still count, so moderation cannot refund the quota.
            gte(suggestions.createdAt, dayStartMs),
          ),
        )
        .all();

      const total = countRows[0]?.total ?? 0;
      if (total >= DAILY_SUGGESTION_LIMIT) {
        throw new HttpException(
          'DAILY_SUGGESTION_LIMIT_REACHED',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      const id = uuidv7(nowMs, randomBytes);
      this.db
        .insert(suggestions)
        .values({
          id,
          createdAt: nowMs,
          updatedAt: nowMs,
          deletedAt: null,
          kind: input.kind,
          title: input.title,
          text: input.text,
          textFemale: input.kind === 'verse' ? (input.textFemale ?? null) : null,
          verseRef: input.verseRef ?? null,
          status: 'pending',
          googleSub: user.googleSub,
          email: user.email,
        })
        .run();

      return {
        id,
        status: 'pending',
        createdAt: nowMs,
        remainingToday: DAILY_SUGGESTION_LIMIT - (total + 1),
      };
    });

    return executeTx();
  }
}
