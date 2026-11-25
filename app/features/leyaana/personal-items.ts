import { and, desc, eq, isNull } from 'drizzle-orm';
import {
  submitSuggestionInputSchema,
  uuidv7,
  type ContentKind,
  type SubmitSuggestionInput,
} from '@roi/shared';

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

function normalizeAndValidatePersonalInput(
  kind: ContentKind,
  title: string,
  text: string,
  verseRef?: string | null,
): SubmitSuggestionInput {
  const trimmedVerseRef =
    kind === 'blessing' && typeof verseRef === 'string' && verseRef.trim().length > 0
      ? verseRef.trim()
      : null;

  return submitSuggestionInputSchema.parse({
    kind,
    title: title.trim(),
    text: text.trim(),
    ...(trimmedVerseRef ? { verseRef: trimmedVerseRef } : {}),
  });
}

/**
 * Create a local personal item (verse, Name of God, or blessing) in SQLite.
 * Validates plain-text fields via submitSuggestionInputSchema.
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
  return normalizeAndValidatePersonalInput(
    item.kind,
    item.title,
    item.text,
    item.verseRef,
  );
}
