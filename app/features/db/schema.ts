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
  pinnedAt: integer('pinned_at'),
  answeredAt: integer('answered_at'),
  outcome: text('outcome'),
});

/** Append-only prayer events; counts come from live (non-tombstoned) rows. */
export const prayerEvents = sqliteTable(
  'prayer_events',
  {
    ...syncCols(),
    prayerId: text('prayer_id').notNull(),
    prayedAt: integer('prayed_at').notNull(),
    localDate: text('local_date').notNull(),
    note: text('note'),
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

/** Singleton row ID in sync_meta tracking downloaded content version and delta throttle. */
export const CONTENT_SYNC_META_ID = 'content_sync';

const publicContentCols = () => ({
  ...syncCols(),
  text: text('text').notNull(),
  textFemale: text('text_female'),
  version: integer('version').notNull(),
  sortOrder: integer('sort_order'),
  tagsJson: text('tags_json'),
});

/** Downloaded public Bible verses synced from backend snapshots and deltas. */
export const verses = sqliteTable(
  'verses',
  {
    ...publicContentCols(),
    ref: text('ref').notNull(),
  },
  (t) => [
    index('verses_version_idx').on(t.version),
    index('verses_live_order_idx').on(t.deletedAt, t.sortOrder),
  ],
);

/** Downloaded public Names of God entries synced from backend snapshots and deltas. */
export const namesOfGod = sqliteTable(
  'names_of_god',
  {
    ...publicContentCols(),
    title: text('title').notNull(),
  },
  (t) => [index('names_of_god_version_idx').on(t.version)],
);

/** Downloaded public blessings entries synced from backend snapshots and deltas. */
export const blessings = sqliteTable(
  'blessings',
  {
    ...publicContentCols(),
    title: text('title').notNull(),
    verseRef: text('verse_ref'),
  },
  (t) => [index('blessings_version_idx').on(t.version)],
);

/** Local content sync cursor and last delta check timestamp (keyed by CONTENT_SYNC_META_ID). */
export const syncMeta = sqliteTable('sync_meta', {
  ...syncCols(),
  lastContentVersion: integer('last_content_version').notNull().default(0),
  lastCheckedAt: integer('last_checked_at').notNull().default(0),
});

/** Assigned weekly and monthly verses with ref/text snapshots surviving public content edits. */
export const verseAssignments = sqliteTable(
  'verse_assignments',
  {
    ...syncCols(),
    periodType: text('period_type').$type<'weekly' | 'monthly'>().notNull(),
    periodKey: text('period_key').notNull(),
    verseId: text('verse_id').notNull(),
    ref: text('ref').notNull(),
    text: text('text').notNull(),
    textFemale: text('text_female'),
    assignedAt: integer('assigned_at').notNull(),
  },
  (t) => [
    index('verse_assignments_period_idx').on(
      t.periodType,
      t.periodKey,
      t.deletedAt,
    ),
  ],
);

/** Local starred favorites across public and personal items with deterministic natural-key IDs. */
export const favorites = sqliteTable(
  'favorites',
  {
    ...syncCols(),
    itemKind: text('item_kind')
      .$type<'verse' | 'name_of_god' | 'blessing'>()
      .notNull(),
    itemSource: text('item_source').$type<'public' | 'personal'>().notNull(),
    itemId: text('item_id').notNull(),
  },
  (t) => [index('favorites_live_created_idx').on(t.deletedAt, t.createdAt)],
);

/** Local user-authored personal verses, Names of God, and blessings. */
export const personalItems = sqliteTable(
  'personal_items',
  {
    ...syncCols(),
    kind: text('kind')
      .$type<'verse' | 'name_of_god' | 'blessing'>()
      .notNull(),
    title: text('title').notNull(),
    text: text('text').notNull(),
    verseRef: text('verse_ref'),
  },
  (t) => [
    index('personal_items_kind_live_idx').on(t.kind, t.deletedAt, t.createdAt),
  ],
);
