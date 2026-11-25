import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolveBackendPath } from '../config/paths';
import * as schema from './schema';

export type BackendDatabase = BetterSQLite3Database<typeof schema>;

export interface BackendDatabaseHandle {
  readonly db: BackendDatabase;
  readonly sqlite: Database.Database;
  readonly dbPath: string;
  close: () => void;
}

export const CONTENT_META_SINGLETON_ID = 1;
export const BACKEND_DB_FILENAME = 'roi-content.sqlite';

/**
 * Open the backend SQLite database in WAL mode, run pending Drizzle migrations,
 * and ensure the singleton `content_meta` row exists.
 */
export function openBackendDatabase(
  dataDir: string,
  migrationsFolder = resolveBackendPath('drizzle'),
): BackendDatabaseHandle {
  mkdirSync(dataDir, { recursive: true });
  const dbPath = join(dataDir, BACKEND_DB_FILENAME);
  const sqlite = new Database(dbPath);

  try {
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('busy_timeout = 5000');
    sqlite.pragma('foreign_keys = ON');

    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder });

    db.insert(schema.contentMeta)
      .values({
        id: CONTENT_META_SINGLETON_ID,
        contentVersion: 0,
        updatedAt: Date.now(),
      })
      .onConflictDoNothing({ target: schema.contentMeta.id })
      .run();

    return {
      db,
      sqlite,
      dbPath,
      close: () => {
        sqlite.close();
      },
    };
  } catch (error) {
    sqlite.close();
    throw error;
  }
}
