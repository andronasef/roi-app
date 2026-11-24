import { getRandomBytes } from 'expo-crypto';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { DB_NAME } from '@/constants/app';
import type { Clock } from './events';
import * as schema from './schema';

const expoDb = openDatabaseSync(DB_NAME);
expoDb.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const db = drizzle(expoDb, { schema });

/** Device clock backed by Date.now and expo-crypto CSPRNG. */
export const deviceClock: Clock = {
  now: () => Date.now(),
  rand: (n) => getRandomBytes(n),
};
