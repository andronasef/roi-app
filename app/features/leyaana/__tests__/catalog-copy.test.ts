import path from 'node:path';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it } from 'vitest';
import { NAME_TOKEN } from '@roi/shared';

import { softDelete, type Clock } from '../../db/events';
import * as schema from '../../db/schema';
import { toggleFavorite } from '../assignments';
import {
  listHydratedFavorites,
  pickDailyBlessing,
  pickDailyNameOfGod,
  searchBlessings,
  searchNamesOfGod,
} from '../catalog';
import {
  formatArticleForCopy,
  formatVerseForCopy,
  needsRecipientPrompt,
  stripMarkdownForCopy,
} from '../copy';

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

describe('leyaana catalog, favorites hydration, and copy helpers', () => {
  it('picks deterministic daily Name of God and Blessing, returns null when empty, and searches ignoring diacritics/variants', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const dayOneMorning = new Date(2026, 10, 25, 8, 0, 0);
      const dayOneEvening = new Date(2026, 10, 25, 22, 30, 0);

      expect(pickDailyNameOfGod(db, dayOneMorning)).toBeNull();
      expect(pickDailyBlessing(db, dayOneMorning)).toBeNull();

      const now = 1_763_769_600_000;
      db.insert(schema.namesOfGod)
        .values([
          {
            id: 'name-deleted',
            title: 'اسم محذوف',
            text: 'لا يجب أن يظهر',
            textFemale: null,
            version: 1,
            sortOrder: 0,
            tagsJson: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: now,
          },
          {
            id: 'name-1',
            title: 'الراعي الصالح',
            text: 'إنت يا {الاسم} في رعاية **الأمين**.',
            textFemale: 'إنتي يا {الاسم} في رعاية **الأمين**.',
            version: 1,
            sortOrder: 1,
            tagsJson: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
          {
            id: 'name-2',
            title: 'أبونا السماوي',
            text: 'إلهُ السلامِ قريبٌ منك.',
            textFemale: null,
            version: 1,
            sortOrder: 2,
            tagsJson: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ])
        .run();

      db.insert(schema.blessings)
        .values([
          {
            id: 'blessing-deleted',
            title: 'بركة محذوفة',
            text: 'نص محذوف',
            textFemale: null,
            verseRef: 'مزمور ١: ١',
            version: 1,
            sortOrder: 0,
            tagsJson: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: now,
          },
          {
            id: 'blessing-1',
            title: 'أنا مبارك في الدخول والخروج',
            text: 'ربنا يبارك خطواتك يا {الاسم}.',
            textFemale: 'ربنا يبارك خطواتك يا {الاسم}.',
            verseRef: 'تثنية ٢٨: ٦',
            version: 1,
            sortOrder: 1,
            tagsJson: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
          {
            id: 'blessing-2',
            title: 'سلامي يملأ قلبى',
            text: 'ليحفظ الرب حياتي.',
            textFemale: null,
            verseRef: 'إشعياء ٢٦: ٣',
            version: 1,
            sortOrder: 2,
            tagsJson: null,
            createdAt: now,
            updatedAt: now,
            deletedAt: null,
          },
        ])
        .run();

      const pickedName1 = pickDailyNameOfGod(db, dayOneMorning);
      const pickedName2 = pickDailyNameOfGod(db, dayOneEvening);
      expect(pickedName1).not.toBeNull();
      expect(pickedName1?.id).not.toBe('name-deleted');
      expect(pickedName2?.id).toBe(pickedName1?.id);

      const pickedBlessing1 = pickDailyBlessing(db, dayOneMorning);
      const pickedBlessing2 = pickDailyBlessing(db, dayOneEvening);
      expect(pickedBlessing1).not.toBeNull();
      expect(pickedBlessing1?.id).not.toBe('blessing-deleted');
      expect(pickedBlessing2?.id).toBe(pickedBlessing1?.id);

      const liveNames = db
        .select()
        .from(schema.namesOfGod)
        .where(eq(schema.namesOfGod.id, 'name-2'))
        .all()
        .concat(
          db
            .select()
            .from(schema.namesOfGod)
            .where(eq(schema.namesOfGod.id, 'name-1'))
            .all(),
        );
      // Diacritic and alef/ta-marbuta/ya insensitive search across title and text
      expect(searchNamesOfGod(liveNames, 'اله السلام').map((n) => n.id)).toEqual([
        'name-2',
      ]);
      expect(searchNamesOfGod(liveNames, 'رعايه').map((n) => n.id)).toEqual([
        'name-1',
      ]);

      const liveBlessings = db
        .select()
        .from(schema.blessings)
        .where(eq(schema.blessings.id, 'blessing-1'))
        .all()
        .concat(
          db
            .select()
            .from(schema.blessings)
            .where(eq(schema.blessings.id, 'blessing-2'))
            .all(),
        );
      // Matches across verseRef and ya/alef-maqsura variants
      expect(searchBlessings(liveBlessings, 'اشعياء').map((b) => b.id)).toEqual([
        'blessing-2',
      ]);
      expect(searchBlessings(liveBlessings, 'قلبي').map((b) => b.id)).toEqual([
        'blessing-2',
      ]);
      expect(searchBlessings(liveBlessings, 'تثنيه').map((b) => b.id)).toEqual([
        'blessing-1',
      ]);
    } finally {
      sqlite.close();
    }
  });

  it('hydrates starred public and personal favorites newest-first, filters by kind, and skips tombstoned sources', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const clock = createDeterministicClock();
      const baseTs = 1_763_769_500_000;

      db.insert(schema.verses)
        .values({
          id: 'pub-verse-1',
          ref: 'مزمور ٢٣: ١',
          text: 'الرب راعي {الاسم}',
          textFemale: null,
          version: 1,
          sortOrder: 1,
          tagsJson: null,
          createdAt: baseTs,
          updatedAt: baseTs,
          deletedAt: null,
        })
        .run();

      db.insert(schema.namesOfGod)
        .values({
          id: 'pub-name-1',
          title: 'القدير',
          text: 'الله القادر على كل شيء',
          textFemale: null,
          version: 1,
          sortOrder: 1,
          tagsJson: null,
          createdAt: baseTs,
          updatedAt: baseTs,
          deletedAt: null,
        })
        .run();

      db.insert(schema.blessings)
        .values({
          id: 'pub-blessing-1',
          title: 'بركة السلام',
          text: 'سلام الله يملأ قلبي',
          textFemale: null,
          verseRef: 'فيلبي ٤: ٧',
          version: 1,
          sortOrder: 1,
          tagsJson: null,
          createdAt: baseTs,
          updatedAt: baseTs,
          deletedAt: null,
        })
        .run();

      db.insert(schema.personalItems)
        .values([
          {
            id: 'pers-verse-1',
            kind: 'verse',
            title: 'رومية ٨: ٢٨',
            text: 'كل الأشياء تعمل معاً للخير',
            verseRef: null,
            createdAt: baseTs,
            updatedAt: baseTs,
            deletedAt: null,
          },
          {
            id: 'pers-blessing-orphan',
            kind: 'blessing',
            title: 'بركة محذوفة',
            text: 'نص شخصي محذوف',
            verseRef: null,
            createdAt: baseTs,
            updatedAt: baseTs,
            deletedAt: null,
          },
        ])
        .run();

      toggleFavorite(db, clock, {
        source: 'public',
        kind: 'verse',
        itemId: 'pub-verse-1',
      });
      toggleFavorite(db, clock, {
        source: 'public',
        kind: 'name_of_god',
        itemId: 'pub-name-1',
      });
      toggleFavorite(db, clock, {
        source: 'public',
        kind: 'blessing',
        itemId: 'pub-blessing-1',
      });
      toggleFavorite(db, clock, {
        source: 'personal',
        kind: 'verse',
        itemId: 'pers-verse-1',
      });
      toggleFavorite(db, clock, {
        source: 'personal',
        kind: 'blessing',
        itemId: 'pers-blessing-orphan',
      });
      // Also star a non-existent item to ensure orphaned favorites never throw
      toggleFavorite(db, clock, {
        source: 'public',
        kind: 'verse',
        itemId: 'missing-verse-id',
      });

      // Tombstone one personal item after starring
      softDelete(db, clock, schema.personalItems, 'pers-blessing-orphan');

      const allFavorites = listHydratedFavorites(db);
      expect(allFavorites.map((f) => [f.source, f.kind, f.itemId])).toEqual([
        ['personal', 'verse', 'pers-verse-1'],
        ['public', 'blessing', 'pub-blessing-1'],
        ['public', 'name_of_god', 'pub-name-1'],
        ['public', 'verse', 'pub-verse-1'],
      ]);

      expect(allFavorites[1]?.verseRef).toBe('فيلبي ٤: ٧');
      expect(allFavorites[0]?.title).toBe('رومية ٨: ٢٨');

      expect(listHydratedFavorites(db, 'verse').map((f) => f.itemId)).toEqual([
        'pers-verse-1',
        'pub-verse-1',
      ]);
      expect(
        listHydratedFavorites(db, 'name_of_god').map((f) => f.itemId),
      ).toEqual(['pub-name-1']);
      expect(
        listHydratedFavorites(db, 'blessing').map((f) => f.itemId),
      ).toEqual(['pub-blessing-1']);
    } finally {
      sqlite.close();
    }
  });

  it('detects recipient prompt need, strips Markdown cleanly, and formats verse & article copy text', () => {
    expect(
      needsRecipientPrompt({
        text: `لا تخف يا ${NAME_TOKEN} لأني معك`,
        textFemale: null,
      }),
    ).toBe(true);
    expect(
      needsRecipientPrompt({
        text: 'تشجع وتشدد',
        textFemale: 'تشجعي وتشددي',
      }),
    ).toBe(true);
    expect(
      needsRecipientPrompt({
        text: 'الله محبة',
        textFemale: '   ',
      }),
    ).toBe(false);

    expect(
      formatVerseForCopy(
        {
          ref: 'إشعياء ٤١: ١٠',
          text: 'لا تخف يا {الاسم} لأني معك',
          textFemale: 'لا تخافي يا {الاسم} لأني معك',
        },
        { name: 'مريم', gender: 'female' },
      ),
    ).toBe('لا تخافي يا مريم لأني معك\n— إشعياء ٤١: ١٠');

    expect(
      formatVerseForCopy(
        {
          ref: 'مزمور ٢٣: ١',
          text: 'الرب راعي {الاسم} فلا يعوزه شيء',
          textFemale: null,
        },
        { name: '', gender: 'male' },
      ),
    ).toBe('الرب راعي فلا يعوزه شيء\n— مزمور ٢٣: ١');

    const rawMd = [
      '# عنوان رئيسي',
      '',
      'نص **غليظ** و *مائل* و _مؤكد_ مع `كود`.',
      '',
      '> اقتباس هادئ للقلب',
      '',
      '- عنصر أول',
      '- عنصر تاني',
      '',
      '',
      'فقرة أخيرة',
    ].join('\n');

    expect(stripMarkdownForCopy(rawMd)).toBe(
      [
        'عنوان رئيسي',
        '',
        'نص غليظ و مائل و مؤكد مع كود.',
        '',
        'اقتباس هادئ للقلب',
        '',
        'عنصر أول',
        'عنصر تاني',
        '',
        'فقرة أخيرة',
      ].join('\n'),
    );

    expect(
      formatArticleForCopy(
        {
          title: 'الراعي الصالح',
          text: '## وعد\n> الرب يرعاك يا {الاسم} **دائماً**.',
          textFemale: '## وعد\n> الرب يرعاكي يا {الاسم} **دائماً**.',
          verseRef: 'مزمور ٢٣: ١',
        },
        { name: 'مريم', gender: 'female' },
      ),
    ).toBe(
      'الراعي الصالح\n\nوعد\nالرب يرعاكي يا مريم دائماً.\n\n— مزمور ٢٣: ١',
    );
  });
});
