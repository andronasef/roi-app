import { createMMKV } from 'react-native-mmkv';

import {
  THEME_DEFAULT,
  THEME_OPTIONS,
  type ThemePreference,
} from '@/constants/theme';

export const storage = createMMKV({ id: 'roi-preferences' });

export const STORAGE_KEYS = {
  THEME: 'pref.theme',
  SCRIPTURE_STEP: 'pref.scripture_step',
  SCRIPTURE_FONT: 'pref.scripture_font',
  LAST_BOOT: 'diag.last_boot',
  TELEMETRY_CONSENT: 'pref.telemetry_consent',
} as const;

function isThemePreference(value: string | undefined): value is ThemePreference {
  return (
    value !== undefined &&
    (THEME_OPTIONS as readonly string[]).includes(value)
  );
}

export function getThemePreference(): ThemePreference {
  const stored = storage.getString(STORAGE_KEYS.THEME);
  return isThemePreference(stored) ? stored : THEME_DEFAULT;
}

export function setThemePreference(theme: ThemePreference): void {
  storage.set(STORAGE_KEYS.THEME, theme);
}

export function getScriptureStep(fallback = 2): number {
  const stored = storage.getNumber(STORAGE_KEYS.SCRIPTURE_STEP);
  if (stored === undefined || !Number.isInteger(stored) || stored < 0 || stored > 4) {
    return fallback;
  }
  return stored;
}

export function setScriptureStep(step: number): void {
  const clamped = Math.max(0, Math.min(4, Math.round(step)));
  storage.set(STORAGE_KEYS.SCRIPTURE_STEP, clamped);
}

export function getScriptureFont(): string | undefined {
  return storage.getString(STORAGE_KEYS.SCRIPTURE_FONT);
}

export function setScriptureFont(fontFamily: string): void {
  storage.set(STORAGE_KEYS.SCRIPTURE_FONT, fontFamily);
}
