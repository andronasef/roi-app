import fs from 'node:fs';
import path from 'node:path';
import { is } from 'drizzle-orm';
import {
  getTableConfig,
  SQLiteColumn,
  SQLiteTable,
} from 'drizzle-orm/sqlite-core';
import { describe, expect, it } from 'vitest';

import { EVENT_TABLE_SUFFIX, SYNC_COLUMNS } from '../../../constants/db';
import * as schema from '../schema';

const APP_ROOT = path.resolve(__dirname, '../../..');
const SCAN_DIRS = ['app', 'features', 'services', 'hooks'] as const;

const tables = Object.entries(schema).filter((entry): entry is [string, SQLiteTable] =>
  is(entry[1], SQLiteTable),
);

function walkSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(fullPath));
    } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('database schema and soft-delete guards', () => {
  it('defines all thirteen Phase 1, Phase 2, and Phase 4 tables', () => {
    expect(tables).toHaveLength(13);
    expect(tables.map(([name]) => name)).toEqual(
      expect.arrayContaining([
        'verses',
        'namesOfGod',
        'blessings',
        'syncMeta',
        'verseAssignments',
        'favorites',
        'personalItems',
      ]),
    );
    expect(schema.CONTENT_SYNC_META_ID).toBe('content_sync');
  });

  it.each(tables)(
    '%s has sync columns with text PK, non-null timestamps, and nullable deleted_at',
    (_exportName, table) => {
      const cfg = getTableConfig(table);
      const colNames = cfg.columns.map((c) => c.name);
      expect(colNames).toEqual(expect.arrayContaining([...SYNC_COLUMNS]));

      const idCol = cfg.columns.find((c) => c.name === 'id');
      expect(idCol).toBeDefined();
      expect(idCol?.primary).toBe(true);
      expect(idCol?.columnType).toBe('SQLiteText');

      const createdAtCol = cfg.columns.find((c) => c.name === 'created_at');
      expect(createdAtCol?.notNull).toBe(true);

      const updatedAtCol = cfg.columns.find((c) => c.name === 'updated_at');
      expect(updatedAtCol?.notNull).toBe(true);

      const deletedAtCol = cfg.columns.find((c) => c.name === 'deleted_at');
      expect(deletedAtCol).toBeDefined();
      expect(deletedAtCol?.notNull).toBe(false);
    },
  );

  it.each(
    tables.filter(([, table]) =>
      getTableConfig(table).name.endsWith(EVENT_TABLE_SUFFIX),
    ),
  )('%s event table has an index covering deleted_at', (_exportName, table) => {
    const cfg = getTableConfig(table);
    const hasDeletedAtIndex = cfg.indexes.some((idx) =>
      idx.config.columns.some(
        (col) => is(col, SQLiteColumn) && col.name === 'deleted_at',
      ),
    );
    expect(hasDeletedAtIndex).toBe(true);
  });

  it('forbids calling Drizzle .delete() in app source directories', () => {
    const hardDeletePattern = /\b(?:db|tx)\s*\.\s*delete\s*\(/;
    const offenders: string[] = [];

    for (const dir of SCAN_DIRS) {
      for (const file of walkSourceFiles(path.join(APP_ROOT, dir))) {
        const content = fs.readFileSync(file, 'utf8');
        if (hardDeletePattern.test(content)) {
          offenders.push(path.relative(APP_ROOT, file));
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
