export const ERROR_CODES = {
  E_UNCAUGHT: 'E_UNCAUGHT',
  E_MIGRATION: 'E_MIGRATION',
  E_SPIKE: 'E_SPIKE',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export const PRAYER_SENTINEL = 'PRAYER_SENTINEL_تشفع';

export const ALLOWED_EVENTS = [
  'spike_test',
  'onboarding_completed',
  'first_win_reached',
  'review_session_completed',
  'prayer_logged',
  'gratitude_saved',
  'drive_backup_connected',
] as const;

export type AllowedEvent = (typeof ALLOWED_EVENTS)[number];
