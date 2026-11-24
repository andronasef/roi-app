import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Standard sync columns required on every user-data and event table (epoch ms UTC). */
export const syncCols = () => ({
  id: text('id').primaryKey(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  deletedAt: integer('deleted_at'),
});

/** Key-value settings persisted in SQLite and eligible for Drive sync. */
export const settings = sqliteTable('settings', {
  ...syncCols(),
  value: text('value').notNull(),
});
