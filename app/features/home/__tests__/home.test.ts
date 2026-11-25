import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { describe, expect, it, vi } from 'vitest';

const mmkvStore = new Map<string, string | number | boolean>();

vi.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => {
      const value = mmkvStore.get(key);
      return typeof value === 'string' ? value : undefined;
    },
    getNumber: (key: string) => {
      const value = mmkvStore.get(key);
      return typeof value === 'number' ? value : undefined;
    },
    getBoolean: (key: string) => {
      const value = mmkvStore.get(key);
      return typeof value === 'boolean' ? value : undefined;
    },
    set: (key: string, value: string | number | boolean) => {
      mmkvStore.set(key, value);
    },
  }),
}));

vi.mock('react-native', () => ({
  AppState: { addEventListener: () => ({ remove: () => {} }) },
  Pressable: () => null,
  ScrollView: () => null,
  Switch: () => null,
  View: () => null,
}));

vi.mock('react-native-reanimated', () => ({
  default: { View: () => null },
  ReduceMotion: { System: 'system' },
  useAnimatedStyle: () => ({}),
  useSharedValue: (value: number) => ({ value }),
  withTiming: (value: number) => value,
}));

vi.mock('expo-network', () => ({
  useNetworkState: () => ({ isConnected: false, isInternetReachable: false }),
  getNetworkStateAsync: async () => ({
    isConnected: false,
    isInternetReachable: false,
  }),
}));

vi.mock('expo-router', () => ({
  Link: () => null,
  useFocusEffect: () => {},
  useSegments: () => [],
}));

vi.mock('react-native-safe-area-context', () => ({
  SafeAreaView: () => null,
}));

vi.mock('lucide-react-native', () => ({
  ArrowDown: () => null,
  ArrowUp: () => null,
  BookOpen: () => null,
  HeartHandshake: () => null,
  NotebookPen: () => null,
  Settings: () => null,
  Sparkles: () => null,
  WifiOff: () => null,
}));

vi.mock('../../../components/ui/text', () => ({
  Text: () => null,
}));

vi.mock('../../../components/ui/icon', () => ({
  Icon: () => null,
}));

vi.mock('../../../services/telemetry', () => ({
  track: vi.fn(),
}));

vi.mock('../../db/client', () => ({
  db: {},
  deviceClock: { now: () => 0, rand: (n: number) => new Uint8Array(n) },
}));

vi.mock('../../sync/staging', () => ({
  createExpoStagingStore: () => ({}),
}));

import {
  STORAGE_KEYS,
  getHomeIntroDismissed,
  getOnboardingCompleted,
  setHomeIntroDismissed,
  setOnboardingCompleted,
} from '../../../services/storage';
import ar from '../../../locales/ar.json';
import type { Clock } from '../../db/events';
import * as schema from '../../db/schema';
import {
  IMPLEMENTED_HOME_TOOLS,
  LAST_VISIBLE_TOOL_ERROR,
  getVisibleHomeTools,
  moveHomeTile,
  readHomeTiles,
  saveHomeTiles,
  toggleHomeTileVisibility,
  type HomeTileConfig,
  type HomeToolId,
} from '../../profile/repository';
import {
  ContentRefreshContext,
  useContentVersion,
} from '../../sync/ContentGate';

const MIGRATIONS_FOLDER = path.resolve(__dirname, '../../../drizzle');
const HOME_SCREEN_PATH = path.resolve(__dirname, '../HomeScreen.tsx');

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

describe('HomeScreen tools, MMKV flags & ContentRefreshContext', () => {
  it('returns only visible implemented tools sorted by order while preserving all 4 tool entries in SQLite settings', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const clock = createDeterministicClock();

      const customTiles: HomeTileConfig[] = [
        { id: 'gratitude', visible: true, order: 0 },
        { id: 'memorize', visible: false, order: 1 },
        { id: 'leyaana', visible: true, order: 2 },
        { id: 'intercession', visible: true, order: 3 },
      ];
      const saved = saveHomeTiles(db, clock, customTiles);
      expect(saved).toHaveLength(4);
      expect(readHomeTiles(db).map((t) => t.id)).toEqual([
        'gratitude',
        'memorize',
        'leyaana',
        'intercession',
      ]);

      // In Phase 4 (D-06), only leyaana is rendered while all 4 remain persisted
      expect(getVisibleHomeTools(readHomeTiles(db))).toEqual([
        { id: 'leyaana', visible: true, order: 2 },
      ]);

      // When future tools are implemented, visibility and order sort apply deterministically
      const futureImplemented = new Set<HomeToolId>([
        'leyaana',
        'memorize',
        'gratitude',
      ]);
      expect(
        getVisibleHomeTools(readHomeTiles(db), futureImplemented).map(
          (t) => t.id,
        ),
      ).toEqual(['gratitude', 'leyaana']);
    } finally {
      sqlite.close();
    }
  });

  it('blocks hiding the last visible implemented tool with exact Arabic notice and persists deterministic reorders', () => {
    const { sqlite, db } = openMigratedMemoryDb();
    try {
      const clock = createDeterministicClock();

      const result = toggleHomeTileVisibility(db, clock, 'leyaana');
      expect(result).toEqual({
        ok: false,
        reason: 'last_visible',
        message: 'لازم تفضل أداة واحدة ظاهرة على الأقل في الشاشة الرئيسية',
        tiles: readHomeTiles(db),
      });
      expect(LAST_VISIBLE_TOOL_ERROR).toBe(
        'لازم تفضل أداة واحدة ظاهرة على الأقل في الشاشة الرئيسية',
      );
      expect(IMPLEMENTED_HOME_TOOLS.has('leyaana')).toBe(true);

      const reordered = moveHomeTile(db, clock, 'intercession', 'up');
      expect(reordered.map((t) => [t.id, t.order])).toEqual([
        ['leyaana', 0],
        ['intercession', 1],
        ['memorize', 2],
        ['gratitude', 3],
      ]);
      expect(readHomeTiles(db)).toEqual(reordered);
    } finally {
      sqlite.close();
    }
  });

  it('persists device-local onboarding_completed and home_intro_dismissed flags in MMKV', () => {
    mmkvStore.clear();
    expect(STORAGE_KEYS.ONBOARDING_COMPLETED).toBe('pref.onboarding_completed');
    expect(STORAGE_KEYS.HOME_INTRO_DISMISSED).toBe('pref.home_intro_dismissed');

    expect(getOnboardingCompleted()).toBe(false);
    expect(getHomeIntroDismissed()).toBe(false);

    setOnboardingCompleted(true);
    setHomeIntroDismissed(true);

    expect(getOnboardingCompleted()).toBe(true);
    expect(getHomeIntroDismissed()).toBe(true);
  });

  it('exports ContentRefreshContext/useContentVersion and wires intro card, edit mode, and Arabic strings', () => {
    expect(ContentRefreshContext).toBeDefined();
    expect(typeof useContentVersion).toBe('function');

    const homeSource = fs.readFileSync(HOME_SCREEN_PATH, 'utf8');
    expect(homeSource).toContain('useContentVersion');
    expect(homeSource).toContain('getHomeIntroDismissed');
    expect(homeSource).toContain('setHomeIntroDismissed');
    expect(homeSource).toContain('ar.homeEditTools');
    expect(homeSource).toContain('ar.homeSaveOrder');
    expect(homeSource).toContain('LAST_VISIBLE_TOOL_ERROR');

    expect((ar as Record<string, string>).homeEditTools).toBe('تعديل الأدوات');
    expect((ar as Record<string, string>).homeSaveOrder).toBe('حفظ الترتيب');
    expect((ar as Record<string, string>).copiedToast).toBe('اتنسخت');
    expect((ar as Record<string, string>).homeTitle).toBe('أدواتك');
  });
});
