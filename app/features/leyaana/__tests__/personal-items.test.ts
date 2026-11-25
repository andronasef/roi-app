import path from 'node:path';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it } from 'vitest';

import type { Clock } from '../../db/events';
import * as schema from '../../db/schema';
import { favoriteId, toggleFavorite } from '../assignments';
import { listHydratedFavorites } from '../catalog';
import {
  createPersonalItem,
  deletePersonalItem,
  listPersonalItems,
  toSuggestionInput,
  updatePersonalItem,
} from '../personal-items';

const MIGRATIONS_FOLDER = path.resolve(__dirname, '../../../drizzle');

function createDeterministicClock(startMs = 1_763_769_600_000): Clock {
  let currentMs = startMs;
  let counter = 1;
  return {
    now: () => {
      const value = currentMs;
      currentMs += 1_000;
      return value;
    },
    rand: (n: number) => {
      const bytes = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        bytes[i] = (counter + i) & 0xff;
      }
      counter += 1;
      return bytes;
    },
  };
}

function openMigratedMemoryDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { sqlite, db };
}

describe('personal items CRUD, tombstones, and suggestion payload', () => {
  it('creates, updates, and lists personal items across all 3 kinds', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    const clock = createDeterministicClock();

    try {
      const verse = createPersonalItem(db, clock, {
        kind: 'verse',
        title: 'مزمور ٢٣: ١',
        text: 'الرب راعيّ فلا يعوزني شيء.',
        verseRef: 'should-be-ignored',
      });
      expect(verse.kind).toBe('verse');
      expect(verse.verseRef).toBeNull();

      const nameItem = createPersonalItem(db, clock, {
        kind: 'name_of_god',
        title: 'الراعي الصالح',
        text: 'يهتم بكل تفاصيل يومي.',
        verseRef: 'ignored-for-name',
      });
      expect(nameItem.kind).toBe('name_of_god');
      expect(nameItem.verseRef).toBeNull();

      const blessing = createPersonalItem(db, clock, {
        kind: 'blessing',
        title: 'سلام في البيت',
        text: 'بركة هدوء وسلام في وسط اليوم.',
        verseRef: 'فيلبي ٤: ٧',
      });
      expect(blessing.kind).toBe('blessing');
      expect(blessing.verseRef).toBe('فيلبي ٤: ٧');

      const updated = updatePersonalItem(db, clock, {
        id: blessing.id,
        title: 'سلام عميق',
        text: 'بركة سلام تفوق كل عقل.',
        verseRef: '  ',
      });
      expect(updated?.title).toBe('سلام عميق');
      expect(updated?.verseRef).toBeNull();

      expect(listPersonalItems(db)).toHaveLength(3);
      expect(listPersonalItems(db, 'verse')).toHaveLength(1);
      expect(listPersonalItems(db, 'name_of_god')).toHaveLength(1);
      expect(listPersonalItems(db, 'blessing')).toHaveLength(1);
      expect(listPersonalItems(db, 'blessing')[0]?.title).toBe('سلام عميق');
    } finally {
      sqlite.close();
    }
  });

  it('rejects empty title/text, foreign brace tokens, and unsafe Markdown', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    const clock = createDeterministicClock();

    try {
      expect(() =>
        createPersonalItem(db, clock, {
          kind: 'verse',
          title: '   ',
          text: 'الرب نوري',
        }),
      ).toThrow();

      expect(() =>
        createPersonalItem(db, clock, {
          kind: 'verse',
          title: 'مزمور ٢٧',
          text: '   ',
        }),
      ).toThrow();

      expect(() =>
        createPersonalItem(db, clock, {
          kind: 'name_of_god',
          title: 'الله القريب',
          text: 'نص به {name} غير مسموح',
        }),
      ).toThrow();

      expect(() =>
        createPersonalItem(db, clock, {
          kind: 'blessing',
          title: 'بركة',
          text: 'اضغط [هنا](https://example.com)',
        }),
      ).toThrow();
    } finally {
      sqlite.close();
    }
  });

  it('soft-deletes personal item and tombstones linked favorite without hard deletion', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    const clock = createDeterministicClock();

    try {
      const item = createPersonalItem(db, clock, {
        kind: 'blessing',
        title: 'شكر على العائلة',
        text: 'ربنا يبارك كل بيتنا.',
        verseRef: 'يشوع ٢٤: ١٥',
      });

      const starred = toggleFavorite(db, clock, {
        source: 'personal',
        kind: 'blessing',
        itemId: item.id,
      });
      expect(starred).toBe(true);
      expect(listHydratedFavorites(db)).toHaveLength(1);

      const deleted = deletePersonalItem(db, clock, item.id);
      expect(deleted).toBe(true);

      expect(listPersonalItems(db)).toHaveLength(0);
      expect(listHydratedFavorites(db)).toHaveLength(0);

      const rawItem = db
        .select()
        .from(schema.personalItems)
        .where(eq(schema.personalItems.id, item.id))
        .get();
      expect(rawItem?.deletedAt).not.toBeNull();

      const favRow = db
        .select()
        .from(schema.favorites)
        .where(
          eq(schema.favorites.id, favoriteId('personal', 'blessing', item.id)),
        )
        .get();
      expect(favRow?.deletedAt).not.toBeNull();

      expect(deletePersonalItem(db, clock, item.id)).toBe(false);
    } finally {
      sqlite.close();
    }
  });

  it('builds validated SubmitSuggestionInput via toSuggestionInput', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    const clock = createDeterministicClock();

    try {
      const item = createPersonalItem(db, clock, {
        kind: 'blessing',
        title: 'نور في الطريق',
        text: 'كلمة ربنا تنور خطواتي.',
        verseRef: 'مزمور ١١٩: ١٠٥',
      });

      expect(toSuggestionInput(item)).toEqual({
        kind: 'blessing',
        title: 'نور في الطريق',
        text: 'كلمة ربنا تنور خطواتي.',
        verseRef: 'مزمور ١١٩: ١٠٥',
      });
    } finally {
      sqlite.close();
    }
  });
});
