import appConfig from '../app.json';

export const SCHEME = appConfig.expo.scheme;

export const DB_NAME = 'roi.db';

/**
 * SPIKE_WIDGET is a device-local diagnostic row (read by the Android widget to prove headless SQLite access).
 * Exclude it from Drive sync, or delete it, when the spike is signed off.
 */
export const SETTINGS_KEYS = {
  SPIKE_WIDGET: 'spike_widget_count',
} as const;

export const ROUTES = {
  home: '/',
  torture: '/torture',
  spike: '/spike',
} as const;

export const SPIKE_WIDGET_URL = `${SCHEME}://spike?from=widget`;

export const DEV_TOOLS_ENABLED =
  (typeof __DEV__ !== 'undefined' && __DEV__) ||
  process.env.EXPO_PUBLIC_DEV_TOOLS === '1';

export const SAMPLE_NAME = 'مريم';

export const GOOGLE_OAUTH = {
  webClientId:
    '23662840492-h4j3v57k9dpm0suqa61qpkv7qh78qq9v.apps.googleusercontent.com',
  iosClientId:
    '23662840492-laqcbt3hkft72a3mu0ofcokeskr7sr7a.apps.googleusercontent.com',
} as const;

const rawApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? '';

/** Public backend base URL injected at bundle time via EXPO_PUBLIC_API_BASE_URL (D-06). */
export const API_BASE_URL =
  rawApiBaseUrl.length > 0
    ? rawApiBaseUrl.replace(/\/+$/, '')
    : 'http://localhost:3000';
