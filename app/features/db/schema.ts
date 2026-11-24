import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { GRATITUDE_ID_PREFIX, SYNC_COLUMNS } from '../../constants/db';

const [ID_COL, CREATED_AT_COL, UPDATED_AT_COL, DELETED_AT_COL] = SYNC_COLUMNS;

/** Standard sync columns required on every user-data and event table (epoch ms UTC). */
export const syncCols = () => ({
  id: text(ID_COL).primaryKey(),
  createdAt: integer(CREATED_AT_COL).notNull(),
  updatedAt: integer(UPDATED_AT_COL).notNull(),
  deletedAt: integer(DELETED_AT_COL),
});

/** Key-value settings persisted in SQLite and eligible for Drive sync. */
export const settings = sqliteTable('settings', {
  ...syncCols(),
  value: text('value').notNull(),
});

/** Intercession prayers persisted on device and eligible for Drive sync. */
export const prayers = sqliteTable('prayers', {
  ...syncCols(),
  body: text('body').notNull(),
  personName: text('person_name'),
  sinceLocalDate: text('since_local_date'),
});

/** Append-only prayer events; counts come from live (non-tombstoned) rows. */
export const prayerEvents = sqliteTable(
  'prayer_events',
  {
    ...syncCols(),
    prayerId: text('prayer_id').notNull(),
    prayedAt: integer('prayed_at').notNull(),
    localDate: text('local_date').notNull(),
  },
  (t) => [index('prayer_events_parent_idx').on(t.prayerId, t.deletedAt)],
);

/** Memorized verses with serialized ts-fsrs card JSON and explicit FSRS model. */
export const memVerses = sqliteTable('mem_verses', {
  ...syncCols(),
  verseId: text('verse_id').notNull(),
  fsrs: text('fsrs'),
  fsrsModel: text('fsrs_model'),
});

/** Append-only spaced-repetition review events; counts ignore tombstoned rows. */
export const reviewEvents = sqliteTable(
  'review_events',
  {
    ...syncCols(),
    memVerseId: text('mem_verse_id').notNull(),
    rating: integer('rating').notNull(),
    reviewedAt: integer('reviewed_at').notNull(),
    localDate: text('local_date').notNull(),
  },
  (t) => [index('review_events_parent_idx').on(t.memVerseId, t.deletedAt)],
);

/** Daily gratitude lines keyed deterministically by local calendar date. */
export const gratitudeLines = sqliteTable('gratitude_lines', {
  ...syncCols(),
  localDate: text('local_date').notNull().unique(),
  body: text('body').notNull(),
});

/** Deterministic natural-key ID for a gratitude line so two devices merge to one row. */
export function gratitudeId(localDate: string): string {
  return `${GRATITUDE_ID_PREFIX}${localDate}`;
}
