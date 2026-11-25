import path from 'node:path';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it } from 'vitest';

import type { Clock } from '../../db/events';
import * as schema from '../../db/schema';
import {
  favoriteId,
  listLiveFavoriteIds,
  toggleFavorite,
} from '../../leyaana/assignments';
import { readUserProfile, saveUserProfile } from '../../profile/repository';
import {
  filterStarterVerses,
  pickStarterVerses,
  validateOnboardingIdentity,
  type StarterVerseItem,
} from '../starter-verses';

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

const SAMPLE_VERSES: StarterVerseItem[] = [
  {
    id: 'v-gen-1',
    ref: 'مزمور ٢٣: ١',
    text: 'الرَّبُّ رَاعِيَّ فَلَا يُعْوِزُنِي شَيْءٌ',
    textFemale: null,
    sortOrder: 1,
    deletedAt: null,
  },
  {
    id: 'v-pers-1',
    ref: 'إشعياء ٤١: ١٠',
    text: 'لَا تَخَفْ يَا {الاسم} لِأَنِّي مَعَكَ',
    textFemale: 'لَا تَخَافِي يَا {الاسم} لِأَنِّي مَعَكِ',
    sortOrder: 2,
    deletedAt: null,
  },
  {
    id: 'v-gen-2',
    ref: 'فيلبي ٤: ١٣',
    text: 'أَسْتَطِيعُ كُلَّ شَيْءٍ فِي الْمَسِيحِ الَّذِي يُقَوِّينِي',
    textFemale: null,
    sortOrder: 3,
    deletedAt: null,
  },
  {
    id: 'v-pers-2',
    ref: 'إرميا ٢٩: ١١',
    text: 'لِأَنِّي عَرَفْتُ الْأَفْكَارَ الَّتِي أَنَا مُفْتَكِرٌ بِهَا عَنْكَ يَا {الاسم}',
    textFemale:
      'لِأَنِّي عَرَفْتُ الْأَفْكَارَ الَّتِي أَنَا مُفْتَكِرٌ بِهَا عَنْكِ يَا {الاسم}',
    sortOrder: 4,
    deletedAt: null,
  },
  {
    id: 'v-pers-3',
    ref: 'إشعياء ٤٣: ١',
    text: 'دَعَوْتُكَ بِاسْمِكَ يَا {الاسم} أَنْتَ لِي',
    textFemale: 'دَعَوْتُكِ بِاسْمِكِ يَا {الاسم} أَنْتِ لِي',
    sortOrder: 5,
    deletedAt: null,
  },
  {
    id: 'v-pers-4',
    ref: 'يشوع ١: ٩',
    text: 'تَشَدَّدْ وَتَشَجَّعْ يَا {الاسم}',
    textFemale: 'تَشَدَّدِي وَتَشَجَّعِي يَا {الاسم}',
    sortOrder: 6,
    deletedAt: null,
  },
  {
    id: 'v-pers-5',
    ref: 'مزمور ١٢١: ٥',
    text: 'الرَّبُّ حَافِظُكَ يَا {الاسم}',
    textFemale: 'الرَّبُّ حَافِظُكِ يَا {الاسم}',
    sortOrder: 7,
    deletedAt: null,
  },
  {
    id: 'v-deleted',
    ref: 'رومية ٨: ١',
    text: 'آية محذوفة {الاسم}',
    textFemale: null,
    sortOrder: 0,
    deletedAt: 1_763_769_600_000,
  },
];

describe('onboarding identity validation, starter verses, and SQLite first-win', () => {
  it('validates required name and gender and trims valid names cleanly', () => {
    expect(validateOnboardingIdentity('', 'male').valid).toBe(false);
    expect(validateOnboardingIdentity('   \t\n ', 'female').valid).toBe(false);
    expect(validateOnboardingIdentity('مريم', null).valid).toBe(false);
    expect(validateOnboardingIdentity('يوسف', undefined).valid).toBe(false);

    const femaleError = validateOnboardingIdentity('   ', 'female');
    expect(femaleError.valid).toBe(false);
    if (!femaleError.valid) {
      expect(femaleError.error).toContain('اكتبي اسمك');
    }

    const validResult = validateOnboardingIdentity('  مريم  ', 'female');
    expect(validResult).toEqual({
      valid: true,
      profile: { name: 'مريم', gender: 'female' },
    });
  });

  it('picks 3-5 live starter verses deterministically per shuffle batch and prioritizes personalized verses', () => {
    const batch0 = pickStarterVerses(SAMPLE_VERSES, 0, 4);
    expect(batch0).toHaveLength(4);
    expect(batch0.map((v) => v.id)).not.toContain('v-deleted');
    // All 4 come from the 5 personalized verses before general ones
    expect(
      batch0.every((v) => v.text.includes('{الاسم}') || v.textFemale !== null),
    ).toBe(true);

    // Deterministic for the same batchIndex
    expect(pickStarterVerses(SAMPLE_VERSES, 0, 4)).toEqual(batch0);

    // Shuffling produces deterministic alternate order across batches and respects 3..5 bounds
    const batch1 = pickStarterVerses(SAMPLE_VERSES, 1, 4);
    const batch2 = pickStarterVerses(SAMPLE_VERSES, 2, 4);
    expect(batch1).toHaveLength(4);
    expect(pickStarterVerses(SAMPLE_VERSES, 1, 4)).toEqual(batch1);
    expect([batch0.map((v) => v.id), batch1.map((v) => v.id), batch2.map((v) => v.id)]).not.toEqual([
      batch0.map((v) => v.id),
      batch0.map((v) => v.id),
      batch0.map((v) => v.id),
    ]);

    expect(pickStarterVerses(SAMPLE_VERSES, 0, 1)).toHaveLength(3);
    expect(pickStarterVerses(SAMPLE_VERSES, 0, 9)).toHaveLength(5);
  });

  it('filters starter verses across personalized text and ref with diacritic-insensitive Arabic matching', () => {
    const profile = { name: 'مريم', gender: 'female' as const };

    // Matches substituted user name inside personalized female text
    const byName = filterStarterVerses(SAMPLE_VERSES, 'مريم', profile);
    expect(byName.map((v) => v.id)).toEqual([
      'v-pers-1',
      'v-pers-2',
      'v-pers-3',
      'v-pers-4',
      'v-pers-5',
    ]);

    // Matches reference without diacritics or hamza variants
    const byRef = filterStarterVerses(SAMPLE_VERSES, 'اشعياء 41', profile);
    expect(byRef.map((v) => v.id)).toEqual(['v-pers-1']);

    // Matches un-diacritized verse body and excludes tombstoned verses
    const byBody = filterStarterVerses(SAMPLE_VERSES, 'الرب راعي', profile);
    expect(byBody.map((v) => v.id)).toEqual(['v-gen-1']);

    expect(filterStarterVerses(SAMPLE_VERSES, 'محذوفة', profile)).toEqual([]);
  });

  it('persists onboarding profile to SQLite settings and records first-win favorite ⭐ round-trip', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const clock = createDeterministicClock();
      const validation = validateOnboardingIdentity('  يوسف ', 'male');
      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        throw new Error('Expected valid identity');
      }

      saveUserProfile(db, clock, validation.profile);
      expect(readUserProfile(db)).toEqual({ name: 'يوسف', gender: 'male' });

      const now = clock.now();
      db.insert(schema.verses)
        .values({
          id: 'v-pers-1',
          ref: 'إشعياء ٤١: ١٠',
          text: 'لا تخف يا {الاسم} لأني معك',
          textFemale: 'لا تخافي يا {الاسم} لأني معك',
          version: 1,
          sortOrder: 1,
          tagsJson: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        })
        .run();

      const starred = toggleFavorite(db, clock, {
        source: 'public',
        kind: 'verse',
        itemId: 'v-pers-1',
      });
      expect(starred).toBe(true);
      expect(listLiveFavoriteIds(db)).toEqual([
        favoriteId('public', 'verse', 'v-pers-1'),
      ]);

      const [row] = db
        .select()
        .from(schema.favorites)
        .where(eq(schema.favorites.id, 'fav:public:verse:v-pers-1'))
        .all();
      expect(row?.deletedAt).toBeNull();
    } finally {
      sqlite.close();
    }
  });
});
