export const THEME_OPTIONS = ['system', 'light', 'dark'] as const;

export type ThemePreference = (typeof THEME_OPTIONS)[number];

export const THEME_DEFAULT: ThemePreference = 'system';

export const FONT_FAMILIES = {
  ui: {
    regular: 'IBMPlexSansArabic-Regular',
    medium: 'IBMPlexSansArabic-Medium',
    bold: 'IBMPlexSansArabic-Bold',
  },
  scripture: {
    amiri: {
      regular: 'Amiri-Regular',
      bold: 'Amiri-Bold',
    },
    scheherazade: {
      regular: 'ScheherazadeNew-Regular',
      bold: 'ScheherazadeNew-Bold',
    },
  },
} as const;

export type ScriptureFontCandidate = keyof typeof FONT_FAMILIES.scripture;

export const SCRIPTURE_FONT_OPTIONS = ['amiri', 'scheherazade'] as const;

export const SCRIPTURE_FONT_DEFAULT: ScriptureFontCandidate = 'amiri';

export const SCRIPTURE_SIZES = [18, 20, 23, 27, 32] as const;

export const SCRIPTURE_STEP_DEFAULT = 1;

export const SCRIPTURE_LINE_HEIGHT = 1.8;

export const SCRIPTURE_SLIDER_INVERTED = false;

export const MAX_FONT_SIZE_MULTIPLIER = 1.3;

export const MIN_TOUCH = 44;
