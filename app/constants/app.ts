import appConfig from '../app.json';

export const SCHEME = appConfig.expo.scheme;

export const DB_NAME = 'roi.db';

/**
 * SPIKE_WIDGET is a device-local diagnostic row (read by the Android widget to prove headless SQLite access).
 * Exclude it from Drive sync, or delete it, when the spike is signed off.
 */
export const SETTINGS_KEYS = {
  SPIKE_WIDGET: 'spike_widget_count',
  USER_PROFILE: 'user_profile',
  HOME_TILES: 'home_tiles',
  VERSE_SEED: 'verse_seed',
  INTERCESSION_SORT: 'intercession_sort',
  GRATITUDE_REMINDER: 'gratitude_reminder',
} as const;

export const ROUTES = {
  home: '/',
  settings: '/settings',
  leyaana: '/leyaana',
  leyaanaHistory: '/leyaana/history',
  leyaanaBrowse: '/leyaana/browse',
  intercession: '/intercession',
  intercessionPerson: '/intercession/person',
  intercessionPrayer: '/intercession/prayer',
  intercessionAnswered: '/intercession/answered',
  gratitude: '/gratitude',
  torture: '/torture',
  spike: '/spike',
} as const;

const rawRateUrl = process.env.EXPO_PUBLIC_RATE_URL?.trim() ?? '';
const rawShareUrl = process.env.EXPO_PUBLIC_SHARE_URL?.trim() ?? '';
const rawSupportUrl = process.env.EXPO_PUBLIC_SUPPORT_URL?.trim() ?? '';

export const SUPPORT_URLS = {
  whatsapp: 'https://wa.me/increasinglabs',
  rate: rawRateUrl || 'https://promote.increasinglabs.com/l/roi',
  share: rawShareUrl || 'https://promote.increasinglabs.com/l/roi',
  support: rawSupportUrl || 'https://forms.gle/DGKYCQwtfdtGcnTH6',
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
export const API_BASE_URL = resolveApiBaseUrl();

function resolveApiBaseUrl(): string {
  if (rawApiBaseUrl.length > 0) {
    const normalized = rawApiBaseUrl.replace(/\/+$/, '');
    // A Google ID token and suggestion text are sent here; never allow cleartext in release.
    if (process.env.NODE_ENV === 'production' && !normalized.startsWith('https://')) {
      throw new Error('EXPO_PUBLIC_API_BASE_URL must use https:// in release builds');
    }
    return normalized;
  }
  // Release bundles must never silently target cleartext localhost (unreachable on devices).
  if (process.env.NODE_ENV === 'production') {
    throw new Error('EXPO_PUBLIC_API_BASE_URL is required for release builds');
  }
  return 'http://localhost:3000';
}
