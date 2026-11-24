export const THEME_OPTIONS = ['system', 'light', 'dark'] as const;

export type ThemePreference = (typeof THEME_OPTIONS)[number];

export const THEME_DEFAULT: ThemePreference = 'system';
