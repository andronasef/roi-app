import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Standard syncable row columns (epoch-ms UTC timestamps matching mobile SQLite). */
export const syncCols = () => ({
  id: text('id').primaryKey(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

const publicContentCols = () => ({
  ...syncCols(),
  text: text('text').notNull(),
  textFemale: text('text_female'),
  version: integer('version').notNull(),
  sortOrder: integer('sort_order'),
  tagsJson: text('tags_json'),
});

/** Singleton row (id = 1) tracking the global monotonic content version (BE-02). */
export const contentMeta = sqliteTable('content_meta', {
  id: integer('id').primaryKey().default(1),
  contentVersion: integer('content_version').notNull().default(0),
  updatedAt: integer('updated_at').notNull(),
});

/** Public Bible verses served via snapshots and monotonic delta sync. */
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

/** Public Names of God cards served via snapshots and monotonic delta sync. */
export const namesOfGod = sqliteTable(
  'names_of_god',
  {
    ...publicContentCols(),
    title: text('title').notNull(),
  },
  (t) => [
    index('names_of_god_version_idx').on(t.version),
    index('names_of_god_live_order_idx').on(t.deletedAt, t.sortOrder),
  ],
);

/** Public blessings served via snapshots and monotonic delta sync. */
export const blessings = sqliteTable(
  'blessings',
  {
    ...publicContentCols(),
    title: text('title').notNull(),
    verseRef: text('verse_ref'),
  },
  (t) => [
    index('blessings_version_idx').on(t.version),
    index('blessings_live_order_idx').on(t.deletedAt, t.sortOrder),
  ],
);

/** Google-authenticated user content suggestions awaiting admin moderation (D-10, D-11). */
export const suggestions = sqliteTable(
  'suggestions',
  {
    ...syncCols(),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    text: text('text').notNull(),
    textFemale: text('text_female'),
    verseRef: text('verse_ref'),
    status: text('status').notNull().default('pending'),
    googleSub: text('google_sub').notNull(),
    email: text('email').notNull(),
  },
  (t) => [index('suggestions_sub_created_idx').on(t.googleSub, t.createdAt)],
);

/** Transactional audit trail for all content mutations and seed imports (BE-05). */
export const auditLog = sqliteTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    actorEmail: text('actor_email').notNull(),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    contentVersion: integer('content_version').notNull(),
    summaryJson: text('summary_json').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('audit_log_created_idx').on(t.createdAt)],
);
