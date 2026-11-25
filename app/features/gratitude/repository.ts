import { and, desc, eq, isNull } from 'drizzle-orm';

import { SETTINGS_KEYS } from '../../constants/app';
import { track } from '../../services/telemetry';
import { softDelete, type Clock, type SyncDatabase } from '../db/events';
import { gratitudeId, gratitudeLines, settings } from '../db/schema';
import {
  DEFAULT_GRATITUDE_REMINDER,
  gratitudeReminderSchema,
  type GratitudeReminderSettings,
} from './models';

export type GratitudeLineRow = typeof gratitudeLines.$inferSelect;

/**
 * Save one day's gratitude text keyed by gratitudeId(localDate). Blank text tombstones
 * the day; writing again revives the same row (no UNIQUE local_date violation).
 */
export function upsertGratitudeLine(
  db: SyncDatabase,
  clock: Clock,
  localDate: string,
  body: string,
): void {
  const id = gratitudeId(localDate);
  if (body.trim() === '') {
    softDelete(db, clock, gratitudeLines, id);
    return;
  }

  const now = clock.now();
  db.insert(gratitudeLines)
    .values({
      id,
      localDate,
      body,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: gratitudeLines.id,
      set: { body, updatedAt: now, deletedAt: null },
    })
    .run();

  try {
    track('gratitude_saved');
  } catch {
    // Best-effort telemetry; never pass gratitude text.
  }
}

/** Live (non-tombstoned) gratitude rows, newest day first. */
export function listLiveGratitude(db: SyncDatabase): GratitudeLineRow[] {
  return db
    .select()
    .from(gratitudeLines)
    .where(isNull(gratitudeLines.deletedAt))
    .orderBy(desc(gratitudeLines.localDate))
    .all();
}

export function getGratitudeLineByDate(
  db: SyncDatabase,
  localDate: string,
): GratitudeLineRow | null {
  return (
    db
      .select()
      .from(gratitudeLines)
      .where(
        and(
          eq(gratitudeLines.id, gratitudeId(localDate)),
          isNull(gratitudeLines.deletedAt),
        ),
      )
      .get() ?? null
  );
}

/** Reminder settings from SQLite, defaulting to OFF at 21:00 (D-12). */
export function getGratitudeReminderSettings(
  db: SyncDatabase,
): GratitudeReminderSettings {
  const row = db
    .select({ value: settings.value })
    .from(settings)
    .where(
      and(
        eq(settings.id, SETTINGS_KEYS.GRATITUDE_REMINDER),
        isNull(settings.deletedAt),
      ),
    )
    .get();
  if (!row) {
    return { ...DEFAULT_GRATITUDE_REMINDER };
  }
  try {
    const parsed = gratitudeReminderSchema.safeParse(JSON.parse(row.value));
    if (parsed.success) {
      return parsed.data;
    }
  } catch {
    // Fall through to defaults on corrupt JSON.
  }
  return { ...DEFAULT_GRATITUDE_REMINDER };
}

export function setGratitudeReminderSettings(
  db: SyncDatabase,
  clock: Clock,
  next: GratitudeReminderSettings,
): GratitudeReminderSettings {
  const validated = gratitudeReminderSchema.parse(next);
  const value = JSON.stringify(validated);
  const now = clock.now();
  db.insert(settings)
    .values({
      id: SETTINGS_KEYS.GRATITUDE_REMINDER,
      value,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: { value, updatedAt: now, deletedAt: null },
    })
    .run();
  return validated;
}
