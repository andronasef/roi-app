import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { DB_NAME } from '@/constants/app';
import * as schema from './schema';

const expoDb = openDatabaseSync(DB_NAME);
expoDb.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const db = drizzle(expoDb, { schema });
