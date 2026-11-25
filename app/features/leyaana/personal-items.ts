import { and, desc, eq, isNull } from 'drizzle-orm';
import {
  contentKindSchema,
  submitSuggestionInputSchema,
  uuidv7,
  type ContentKind,
  type SubmitSuggestionInput,
} from '@roi/shared';
import { z } from 'zod';

import { softDelete, type Clock, type SyncDatabase } from '../db/events';
import { favorites, personalItems } from '../db/schema';
import { favoriteId } from './assignments';

export type PersonalItemRow = typeof personalItems.$inferSelect;

export interface CreatePersonalItemInput {
  kind: ContentKind;
  title: string;
  text: string;
  verseRef?: string | null;
}

export interface UpdatePersonalItemInput {
  id: string;
  title: string;
  text: string;
  verseRef?: string | null;
}

/**
 * Lenient schema for private on-device notes: non-empty and length-capped only. The strict
 * public-content rules (no links/HTML/foreign braces) apply at suggest time via `toSuggestionInput`.
 */
const personalItemInputSchema = z.object({
  kind: contentKindSchema,
  title: z.string().min(1).max(200),
  text: z.string().min(1).max(5000),
  verseRef: z.string().min(1).max(200).optional(),
});

function normalizePersonalInput(
  kind: ContentKind,
  title: string,
  text: string,
  verseRef?: string | null,
) {
  const trimmedVerseRef =
    kind === 'blessing' && typeof verseRef === 'string' && verseRef.trim().length > 0
      ? verseRef.trim()
      : null;

  return {
    kind,
    title: title.trim(),
    text: text.trim(),
    ...(trimmedVerseRef ? { verseRef: trimmedVerseRef } : {}),
  };
}

function normalizeAndValidatePersonalInput(
  kind: ContentKind,
  title: string,
  text: string,
  verseRef?: string | null,
) {
  return personalItemInputSchema.parse(
    normalizePersonalInput(kind, title, text, verseRef),
  );
}

/**
 * Create a local personal item (verse, Name of God, or blessing) in SQLite.
 * Validates plain-text fields with the lenient local schema (not the public-suggestion schema).
 */
export function createPersonalItem(
  db: SyncDatabase,
  clock: Clock,
  input: CreatePersonalItemInput,
): PersonalItemRow {
  const validated = normalizeAndValidatePersonalInput(
    input.kind,
    input.title,
    input.text,
    input.verseRef,
  );
  const now = clock.now();
  const id = uuidv7(now, clock.rand);

  db.insert(personalItems)
    .values({
      id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      kind: validated.kind,
      title: validated.title,
      text: validated.text,
      verseRef: validated.kind === 'blessing' ? (validated.verseRef ?? null) : null,
    })
    .run();

  return db
    .select()
    .from(personalItems)
    .where(eq(personalItems.id, id))
    .get()!;
}

/**
 * Update an existing non-tombstoned personal item in SQLite.
 * Returns null if the row does not exist or is already deleted.
 */
export function updatePersonalItem(
  db: SyncDatabase,
  clock: Clock,
  input: UpdatePersonalItemInput,
): PersonalItemRow | null {
  const existing = db
    .select()
    .from(personalItems)
    .where(and(eq(personalItems.id, input.id), isNull(personalItems.deletedAt)))
    .get();
  if (!existing) {
    return null;
  }

  const validated = normalizeAndValidatePersonalInput(
    existing.kind,
    input.title,
    input.text,
    input.verseRef,
  );
  const now = clock.now();

  db.update(personalItems)
    .set({
      title: validated.title,
      text: validated.text,
      verseRef:
        existing.kind === 'blessing' ? (validated.verseRef ?? null) : null,
      updatedAt: now,
    })
    .where(and(eq(personalItems.id, input.id), isNull(personalItems.deletedAt)))
    .run();

  return (
    db
      .select()
      .from(personalItems)
      .where(and(eq(personalItems.id, input.id), isNull(personalItems.deletedAt)))
      .get() ?? null
  );
}

/**
 * Soft-delete a personal item and tombstone any linked favorite row using deletedAt
 * without calling Drizzle .delete() (ME-08, FND-06).
 */
export function deletePersonalItem(
  db: SyncDatabase,
  clock: Clock,
  id: string,
): boolean {
  const existing = db
    .select()
    .from(personalItems)
    .where(and(eq(personalItems.id, id), isNull(personalItems.deletedAt)))
    .get();
  if (!existing) {
    return false;
  }

  softDelete(db, clock, personalItems, id);
  softDelete(
    db,
    clock,
    favorites,
    favoriteId('personal', existing.kind, existing.id),
  );
  return true;
}

/** List all non-tombstoned personal items, optionally filtered by kind, newest first. */
export function listPersonalItems(
  db: SyncDatabase,
  kind?: ContentKind,
): PersonalItemRow[] {
  const whereClause = kind
    ? and(eq(personalItems.kind, kind), isNull(personalItems.deletedAt))
    : isNull(personalItems.deletedAt);

  return db
    .select()
    .from(personalItems)
    .where(whereClause)
    .orderBy(desc(personalItems.createdAt), desc(personalItems.id))
    .all();
}

/** Build and validate a GraphQL submitSuggestion input payload from a personal item. */
export function toSuggestionInput(
  item: Pick<PersonalItemRow, 'kind' | 'title' | 'text' | 'verseRef'>,
): SubmitSuggestionInput {
  return submitSuggestionInputSchema.parse(
    normalizePersonalInput(item.kind, item.title, item.text, item.verseRef),
  );
}
