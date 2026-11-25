import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Pressable: () => null,
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
  useSegments: () => [],
}));

vi.mock('lucide-react-native', () => ({
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

vi.mock('../staging', () => ({
  createExpoStagingStore: () => ({}),
}));

import { ALLOWED_EVENTS } from '../../../constants/telemetry';
import ar from '../../../locales/ar.json';
import {
  deriveGateMode,
  getStageLabel,
  getStageProgressFraction,
  shouldBypassContentGate,
} from '../ContentGate';

const APP_ROOT = path.resolve(__dirname, '../../..');

describe('ContentGate state & UI-SPEC contract', () => {
  it('bypasses ContentGate only when DEV_TOOLS_ENABLED is true and segments[0] is (dev)', () => {
    expect(shouldBypassContentGate(true, ['(dev)', 'spike'])).toBe(true);
    expect(shouldBypassContentGate(true, ['(dev)', 'torture'])).toBe(true);
    expect(shouldBypassContentGate(true, ['(dev)'])).toBe(true);

    expect(shouldBypassContentGate(false, ['(dev)', 'spike'])).toBe(false);
    expect(shouldBypassContentGate(false, ['(dev)', 'torture'])).toBe(false);
    expect(shouldBypassContentGate(true, [])).toBe(false);
    expect(shouldBypassContentGate(true, ['index'])).toBe(false);
  });

  it('derives ready immediately whenever lastContentVersion > 0, and offline_empty/downloading/paused/error when uninitialized', () => {
    expect(
      deriveGateMode({
        lastContentVersion: 1,
        isOnline: false,
        downloadStatus: 'idle',
      }),
    ).toBe('ready');
    expect(
      deriveGateMode({
        lastContentVersion: 5,
        isOnline: false,
        downloadStatus: 'error',
      }),
    ).toBe('ready');
    expect(
      deriveGateMode({
        lastContentVersion: 2,
        isOnline: true,
        downloadStatus: 'paused',
      }),
    ).toBe('ready');

    expect(
      deriveGateMode({
        lastContentVersion: 0,
        isOnline: false,
        downloadStatus: 'idle',
      }),
    ).toBe('offline_empty');
    expect(
      deriveGateMode({
        lastContentVersion: 0,
        isOnline: true,
        downloadStatus: 'idle',
      }),
    ).toBe('downloading');
    expect(
      deriveGateMode({
        lastContentVersion: 0,
        isOnline: true,
        downloadStatus: 'downloading',
      }),
    ).toBe('downloading');
    expect(
      deriveGateMode({
        lastContentVersion: 0,
        isOnline: false,
        downloadStatus: 'paused',
      }),
    ).toBe('paused');
    expect(
      deriveGateMode({
        lastContentVersion: 0,
        isOnline: true,
        downloadStatus: 'error',
      }),
    ).toBe('error');
  });

  it('maps download stages to calm Egyptian Arabic labels and 1/3..3/3 fractions with zero percentages or technical strings', () => {
    const stages = [
      ['verses', 'جاري تنزيل: الآيات', 1 / 3],
      ['names_of_god', 'جاري تنزيل: أسماء الله', 2 / 3],
      ['blessings', 'جاري تنزيل: البركات', 1],
    ] as const;

    const forbiddenTerms = /(%|KB|MB|SQLite|HTTP|GraphQL|contentVersion)/i;

    for (const [stage, expectedLabel, expectedFraction] of stages) {
      const label = getStageLabel(stage);
      expect(label).toBe(expectedLabel);
      expect(label).not.toMatch(forbiddenTerms);
      expect(getStageProgressFraction(stage)).toBeCloseTo(expectedFraction, 5);
    }
  });

  it('contains exact 02-UI-SPEC.md Egyptian Arabic strings in ar.json without percentages or technical strings', () => {
    const expectedStrings = {
      offlineGateTitle: 'محتاجين إنترنت أول مرة بس',
      offlineGateBody:
        'محتاجين إنترنت أول مرة بس عشان ننزّل لك مكتبة روعي، وبعدها كل حاجة شغالة أوفلاين',
      retryButton: 'جرّب تاني',
      downloadingTitle: 'بنجهّز لك مكتبة روعي...',
      stageVerses: 'جاري تنزيل: الآيات',
      stageNamesOfGod: 'جاري تنزيل: أسماء الله',
      stageBlessings: 'جاري تنزيل: البركات',
      downloadPausedNotice:
        'الاتصال انقطع — هنكمّل تلقائي من آخر جزء أول ما الإنترنت يرجع',
      downloadErrorNotice:
        'حصلت مشكلة في التنزيل دلوقتي — تأكد من الإنترنت واضغط جرّب تاني',
      libraryReadyTitle: 'المكتبة جاهزة',
      libraryReadyBody: 'كل حاجة بقت على جهازك وشغالة أوفلاين',
      countVersesLabel: 'الآيات',
      countNamesOfGodLabel: 'أسماء الله',
      countBlessingsLabel: 'البركات',
    } as const;

    const forbiddenTerms = /(%|KB|MB|SQLite|HTTP|GraphQL|contentVersion)/i;

    for (const [key, value] of Object.entries(expectedStrings)) {
      const actual = (ar as Record<string, string>)[key];
      expect(actual).toBe(value);
      expect(actual).not.toMatch(forbiddenTerms);
    }
  });

  it('includes first_download_started and first_download_completed in telemetry ALLOWED_EVENTS', () => {
    expect(ALLOWED_EVENTS).toContain('first_download_started');
    expect(ALLOWED_EVENTS).toContain('first_download_completed');
  });

  it('wires ContentGate inside app/app/_layout.tsx after useMigrations', () => {
    const layoutSource = fs.readFileSync(
      path.join(APP_ROOT, 'app', '_layout.tsx'),
      'utf8',
    );
    expect(layoutSource).toContain('ContentGate');
    expect(layoutSource).toContain('useMigrations');
  });
});
