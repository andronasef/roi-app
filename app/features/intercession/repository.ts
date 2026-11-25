import { localDateKey, uuidv7 } from '@roi/shared';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { SETTINGS_KEYS } from '../../constants/app';
import { track } from '../../services/telemetry';
import {
  logPrayed,
  softDelete,
  type Clock,
  type SyncDatabase,
} from '../db/events';
import { prayerEvents, prayers, settings } from '../db/schema';
import type {
  PrayerEventRow,
  PrayerRow,
  PrayerSort,
  PrayerWithStats,
} from './models';

export const prayerSortSchema = z.enum([
  'random',
  'neglected',
  'oldest',
  'newest',
  'alphabetical',
]);

export const createPrayerInputSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  personName: z.string().trim().max(200).nullable().optional(),
  sinceLocalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

export const updatePrayerInputSchema = z.object({
  id: z.string().min(1),
  body: z.string().trim().min(1).max(2000),
  personName: z.string().trim().max(200).nullable().optional(),
  sinceLocalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
});

const optionalTextSchema = z.string().trim().max(1000).nullable().optional();

export interface CreatePrayerInput {
  body: string;
  personName?: string | null;
  sinceLocalDate?: string | null;
}

export interface UpdatePrayerInput {
  id: string;
  body: string;
  personName?: string | null;
  sinceLocalDate?: string | null;
}

function normalizeOptionalString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * List all live (non-tombstoned) prayers enriched with prayedCount and lastPrayedAt
 * derived strictly from live prayer_events rows (FND-07).
 */
export function listPrayersWithStats(db: SyncDatabase): PrayerWithStats[] {
  const livePrayers = db
    .select()
    .from(prayers)
    .where(isNull(prayers.deletedAt))
    .all();

  const liveEvents = db
    .select({
      prayerId: prayerEvents.prayerId,
      prayedAt: prayerEvents.prayedAt,
      localDate: prayerEvents.localDate,
    })
    .from(prayerEvents)
    .where(isNull(prayerEvents.deletedAt))
    .all();

  const statsByPrayer = new Map<
    string,
    { count: number; lastPrayedAt: number | null; lastPrayedLocalDate: string | null }
  >();

  for (const event of liveEvents) {
    const existing = statsByPrayer.get(event.prayerId);
    if (!existing) {
      statsByPrayer.set(event.prayerId, {
        count: 1,
        lastPrayedAt: event.prayedAt,
        lastPrayedLocalDate: event.localDate,
      });
    } else {
      existing.count += 1;
      if (existing.lastPrayedAt === null || event.prayedAt >= existing.lastPrayedAt) {
        existing.lastPrayedAt = event.prayedAt;
        existing.lastPrayedLocalDate = event.localDate;
      }
    }
  }

  return livePrayers.map((prayer) => {
    const stats = statsByPrayer.get(prayer.id);
    return {
      ...prayer,
      prayedCount: stats?.count ?? 0,
      lastPrayedAt: stats?.lastPrayedAt ?? null,
      lastPrayedLocalDate: stats?.lastPrayedLocalDate ?? null,
    };
  });
}

/**
 * List live chronological prayer_events (newest first) for a single prayer.
 */
export function listPrayerEvents(
  db: SyncDatabase,
  prayerId: string,
): PrayerEventRow[] {
  return db
    .select()
    .from(prayerEvents)
    .where(
      and(
        eq(prayerEvents.prayerId, prayerId),
        isNull(prayerEvents.deletedAt),
      ),
    )
    .orderBy(desc(prayerEvents.prayedAt))
    .all();
}

/**
 * Create a new intercession prayer validated with Zod.
 */
export function createPrayer(
  db: SyncDatabase,
  clock: Clock,
  input: CreatePrayerInput,
): PrayerWithStats {
  const validated = createPrayerInputSchema.parse(input);
  const now = clock.now();
  const id = uuidv7(now, clock.rand);
  const personName = normalizeOptionalString(validated.personName);
  const sinceLocalDate =
    validated.sinceLocalDate ?? localDateKey(new Date(now));

  db.insert(prayers)
    .values({
      id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      body: validated.body,
      personName,
      sinceLocalDate,
      pinnedAt: null,
      answeredAt: null,
      outcome: null,
    })
    .run();

  const row = db.select().from(prayers).where(eq(prayers.id, id)).get()!;
  return {
    ...row,
    prayedCount: 0,
    lastPrayedAt: null,
    lastPrayedLocalDate: null,
  };
}

/**
 * Update an existing non-tombstoned prayer's body, personName, and sinceLocalDate.
 */
export function updatePrayer(
  db: SyncDatabase,
  clock: Clock,
  input: UpdatePrayerInput,
): PrayerRow | null {
  const validated = updatePrayerInputSchema.parse(input);
  const existing = db
    .select()
    .from(prayers)
    .where(and(eq(prayers.id, validated.id), isNull(prayers.deletedAt)))
    .get();
  if (!existing) {
    return null;
  }

  const now = clock.now();
  const personName = normalizeOptionalString(validated.personName);
  const sinceLocalDate =
    validated.sinceLocalDate === undefined
      ? existing.sinceLocalDate
      : validated.sinceLocalDate;

  db.update(prayers)
    .set({
      body: validated.body,
      personName,
      sinceLocalDate,
      updatedAt: now,
    })
    .where(and(eq(prayers.id, validated.id), isNull(prayers.deletedAt)))
    .run();

  return (
    db
      .select()
      .from(prayers)
      .where(and(eq(prayers.id, validated.id), isNull(prayers.deletedAt)))
      .get() ?? null
  );
}

/**
 * Toggle pinned state on a live prayer.
 */
export function togglePinPrayer(
  db: SyncDatabase,
  clock: Clock,
  prayerId: string,
): PrayerRow | null {
  const existing = db
    .select()
    .from(prayers)
    .where(and(eq(prayers.id, prayerId), isNull(prayers.deletedAt)))
    .get();
  if (!existing) {
    return null;
  }

  const now = clock.now();
  const nextPinnedAt = existing.pinnedAt === null ? now : null;
  db.update(prayers)
    .set({ pinnedAt: nextPinnedAt, updatedAt: now })
    .where(and(eq(prayers.id, prayerId), isNull(prayers.deletedAt)))
    .run();

  return (
    db
      .select()
      .from(prayers)
      .where(and(eq(prayers.id, prayerId), isNull(prayers.deletedAt)))
      .get() ?? null
  );
}

/**
 * Log a prayer event with an optional note and emit zero-parameter telemetry (T-05-03).
 */
export function logPrayerWithNote(
  db: SyncDatabase,
  clock: Clock,
  prayerId: string,
  note?: string | null,
): string {
  const validatedNote = optionalTextSchema.parse(note);
  const eventId = logPrayed(db, clock, prayerId, validatedNote);
  try {
    track('prayer_logged');
  } catch {
    // Telemetry is best-effort and may be uninitialized in unit tests.
  }
  return eventId;
}

/**
 * Batch-log prayer events for multiple prayers (e.g. صليت لكلهم) in one transaction.
 */
export function logBatchPrayed(
  db: SyncDatabase,
  clock: Clock,
  prayerIds: readonly string[],
  note?: string | null,
): string[] {
  if (prayerIds.length === 0) {
    return [];
  }
  const validatedNote = optionalTextSchema.parse(note);
  const ids: string[] = [];
  db.transaction((tx) => {
    for (const prayerId of prayerIds) {
      ids.push(logPrayed(tx as unknown as SyncDatabase, clock, prayerId, validatedNote));
    }
  });
  try {
    track('prayer_logged');
  } catch {
    // Telemetry is best-effort and may be uninitialized in unit tests.
  }
  return ids;
}

/**
 * Mark a prayer as answered (اتستجابت) with an optional outcome note (D-06).
 */
export function markPrayerAnswered(
  db: SyncDatabase,
  clock: Clock,
  prayerId: string,
  outcome?: string | null,
): PrayerRow | null {
  const validatedOutcome = normalizeOptionalString(
    optionalTextSchema.parse(outcome),
  );
  const existing = db
    .select()
    .from(prayers)
    .where(and(eq(prayers.id, prayerId), isNull(prayers.deletedAt)))
    .get();
  if (!existing) {
    return null;
  }

  const now = clock.now();
  db.update(prayers)
    .set({
      answeredAt: now,
      outcome: validatedOutcome,
      updatedAt: now,
    })
    .where(and(eq(prayers.id, prayerId), isNull(prayers.deletedAt)))
    .run();

  return (
    db
      .select()
      .from(prayers)
      .where(and(eq(prayers.id, prayerId), isNull(prayers.deletedAt)))
      .get() ?? null
  );
}

/**
 * Reopen an answered prayer (رجّعها) back to active status (D-06).
 */
export function reopenPrayer(
  db: SyncDatabase,
  clock: Clock,
  prayerId: string,
): PrayerRow | null {
  const existing = db
    .select()
    .from(prayers)
    .where(and(eq(prayers.id, prayerId), isNull(prayers.deletedAt)))
    .get();
  if (!existing) {
    return null;
  }

  const now = clock.now();
  db.update(prayers)
    .set({
      answeredAt: null,
      outcome: null,
      updatedAt: now,
    })
    .where(and(eq(prayers.id, prayerId), isNull(prayers.deletedAt)))
    .run();

  return (
    db
      .select()
      .from(prayers)
      .where(and(eq(prayers.id, prayerId), isNull(prayers.deletedAt)))
      .get() ?? null
  );
}

/**
 * Soft-delete a prayer and all of its live prayer_events (FND-06).
 */
export function deletePrayer(
  db: SyncDatabase,
  clock: Clock,
  prayerId: string,
): void {
  db.transaction((tx) => {
    const syncTx = tx as unknown as SyncDatabase;
    softDelete(syncTx, clock, prayers, prayerId);
    const liveEvents = syncTx
      .select({ id: prayerEvents.id })
      .from(prayerEvents)
      .where(
        and(
          eq(prayerEvents.prayerId, prayerId),
          isNull(prayerEvents.deletedAt),
        ),
      )
      .all();
    for (const event of liveEvents) {
      softDelete(syncTx, clock, prayerEvents, event.id);
    }
  });
}

/**
 * Read the persisted default تشفع sort mode from SQLite settings, defaulting to 'random'.
 */
export function getDefaultIntercessionSort(db: SyncDatabase): PrayerSort {
  const row = db
    .select({ value: settings.value })
    .from(settings)
    .where(
      and(
        eq(settings.id, SETTINGS_KEYS.INTERCESSION_SORT),
        isNull(settings.deletedAt),
      ),
    )
    .get();

  if (!row) {
    return 'random';
  }
  const parsed = prayerSortSchema.safeParse(row.value);
  return parsed.success ? parsed.data : 'random';
}

/**
 * Persist the default تشفع sort mode into syncable SQLite settings (D-11).
 */
export function setDefaultIntercessionSort(
  db: SyncDatabase,
  clock: Clock,
  sort: PrayerSort,
): PrayerSort {
  const validated = prayerSortSchema.parse(sort);
  const now = clock.now();
  db.insert(settings)
    .values({
      id: SETTINGS_KEYS.INTERCESSION_SORT,
      value: validated,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: {
        value: validated,
        updatedAt: now,
        deletedAt: null,
      },
    })
    .run();
  return validated;
}
