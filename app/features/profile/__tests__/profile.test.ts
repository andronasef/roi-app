import path from 'node:path';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it } from 'vitest';
import { personalize } from '@roi/shared';

import { SETTINGS_KEYS } from '../../../constants/app';
import type { Clock } from '../../db/events';
import * as schema from '../../db/schema';
import {
  DEFAULT_HOME_TILES,
  IMPLEMENTED_HOME_TOOLS,
  LAST_VISIBLE_TOOL_ERROR,
  moveHomeTile,
  readHomeTiles,
  readOrCreateVerseSeed,
  readUserProfile,
  saveHomeTiles,
  saveUserProfile,
  toggleHomeTileVisibility,
  type HomeToolId,
} from '../repository';
import { UI_COPY, uiCopy, type UiCopyKey } from '../ui-copy';

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

describe('profile repository & gender-aware personalization', () => {
  it('returns default profile when unset, persists updates to SQLite settings, and recovers from corrupted JSON', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const clock = createDeterministicClock();

      expect(readUserProfile(db)).toEqual({ name: '', gender: 'male' });

      const saved = saveUserProfile(db, clock, {
        name: '  مريم  ',
        gender: 'female',
      });
      expect(saved).toEqual({ name: 'مريم', gender: 'female' });
      expect(readUserProfile(db)).toEqual({ name: 'مريم', gender: 'female' });

      const row = db
        .select()
        .from(schema.settings)
        .where(eq(schema.settings.id, SETTINGS_KEYS.USER_PROFILE))
        .get();
      expect(row).toBeDefined();
      expect(JSON.parse(row!.value)).toEqual({ name: 'مريم', gender: 'female' });

      // Corrupt row falls back safely to canonical defaults (T-04-03)
      db.update(schema.settings)
        .set({ value: '{broken-json' })
        .where(eq(schema.settings.id, SETTINGS_KEYS.USER_PROFILE))
        .run();
      expect(readUserProfile(db)).toEqual({ name: '', gender: 'male' });
    } finally {
      sqlite.close();
    }
  });

  it('returns all 4 canonical home tiles, guards hiding the last visible implemented tool, and persists toggles and reorders', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const clock = createDeterministicClock();

      expect(readHomeTiles(db)).toEqual(DEFAULT_HOME_TILES);
      expect(readHomeTiles(db).map((t) => [t.id, t.visible, t.order])).toEqual([
        ['leyaana', true, 0],
        ['memorize', true, 1],
        ['intercession', true, 2],
        ['gratitude', true, 3],
      ]);

      // Phase 5 enables leyaana, intercession, and gratitude; turning off the last visible tool is blocked
      expect(Array.from(IMPLEMENTED_HOME_TOOLS)).toEqual([
        'leyaana',
        'intercession',
        'gratitude',
      ]);
      const singleImplemented = new Set<HomeToolId>(['leyaana']);
      const blocked = toggleHomeTileVisibility(
        db,
        clock,
        'leyaana',
        singleImplemented,
      );
      expect(blocked).toEqual({
        ok: false,
        reason: 'last_visible',
        message: LAST_VISIBLE_TOOL_ERROR,
        tiles: DEFAULT_HOME_TILES,
      });

      // With multiple implemented tools, turning one off persists while turning off the last is blocked
      const twoImplemented = new Set<HomeToolId>(['leyaana', 'memorize']);
      const toggledOff = toggleHomeTileVisibility(
        db,
        clock,
        'memorize',
        twoImplemented,
      );
      expect(toggledOff.ok).toBe(true);
      expect(
        readHomeTiles(db).find((t) => t.id === 'memorize')?.visible,
      ).toBe(false);

      const blockedSecond = toggleHomeTileVisibility(
        db,
        clock,
        'leyaana',
        twoImplemented,
      );
      expect(blockedSecond.ok).toBe(false);
      if (!blockedSecond.ok) {
        expect(blockedSecond.reason).toBe('last_visible');
      }

      // Reordering persists deterministically to SQLite settings
      const movedUp = moveHomeTile(db, clock, 'gratitude', 'up');
      expect(movedUp.map((t) => t.id)).toEqual([
        'leyaana',
        'memorize',
        'gratitude',
        'intercession',
      ]);
      expect(readHomeTiles(db).map((t) => [t.id, t.order])).toEqual([
        ['leyaana', 0],
        ['memorize', 1],
        ['gratitude', 2],
        ['intercession', 3],
      ]);

      // Explicit saveHomeTiles persists and creates/reuses verse seed
      const resaved = saveHomeTiles(db, clock, movedUp);
      expect(resaved).toEqual(movedUp);

      const seed1 = readOrCreateVerseSeed(db, clock);
      const seed2 = readOrCreateVerseSeed(db, clock);
      expect(seed1.length).toBeGreaterThan(10);
      expect(seed2).toBe(seed1);
    } finally {
      sqlite.close();
    }
  });

  it('resolves distinct Egyptian Arabic gender phrasing across Onboarding, Home, Leyaana, and Settings and neutral personalize fallback', () => {
    const genderDifferentiatedKeys: UiCopyKey[] = [
      'onboarding2Heading',
      'onboarding2Subtext',
      'onboarding2NamePlaceholder',
      'onboarding2MissingError',
      'onboarding3HeadingPrefix',
      'onboarding3Helper',
      'onboarding3GoogleDialogBody',
      'onboardingGoogleError',
      'homeGreetingPrefix',
      'homeIntroHeading',
      'homeIntroBody',
      'homeIntroDismiss',
      'leyaanaLongPressHint',
      'leyaanaCopyQuestion',
      'leyaanaEmptyFavoritesBody',
      'leyaanaEmptyHistoryBody',
      'leyaanaEmptySearchBody',
      'leyaanaEmptyPersonalBody',
      'leyaanaPersonalFormEmptyError',
      'leyaanaDeleteConfirmBody',
      'leyaanaSuggestOfflineError',
      'leyaanaSuggestSubmitError',
      'settingsEditPrompt',
      'settingsGoogleConnectHint',
      'settingsRateCta',
    ];

    for (const key of genderDifferentiatedKeys) {
      expect(UI_COPY[key]).toBeDefined();
      const maleText = uiCopy(key, 'male');
      const femaleText = uiCopy(key, 'female');
      expect(maleText.length).toBeGreaterThan(0);
      expect(femaleText.length).toBeGreaterThan(0);
      expect(femaleText).not.toBe(maleText);
    }

    const verse = {
      text: 'لا تخف يا {الاسم} لأني معك',
      textFemale: 'لا تخافي يا {الاسم} لأني معاكي',
    };
    expect(personalize(verse, { name: 'يوسف', gender: 'male' })).toBe(
      'لا تخف يا يوسف لأني معك',
    );
    expect(personalize(verse, { name: 'مريم', gender: 'female' })).toBe(
      'لا تخافي يا مريم لأني معاكي',
    );
    expect(personalize(verse, { name: '', gender: 'male' })).toBe(
      'لا تخف يا لأني معك',
    );
    expect(
      personalize(
        { text: 'الرب راعي {الاسم} فلا يعوزه شيء', textFemale: null },
        { name: '   ', gender: 'female' },
      ),
    ).toBe('الرب راعي فلا يعوزه شيء');
  });
});
