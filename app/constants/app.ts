import appConfig from '@/app.json';

export const SCHEME = appConfig.expo.scheme;

export const DB_NAME = 'roi.db';

export const SETTINGS_KEYS = {
  LAST_BOOT: 'last_boot',
} as const;

export const ROUTES = {
  home: '/',
} as const;

export const GOOGLE_OAUTH = {
  webClientId:
    '23662840492-h4j3v57k9dpm0suqa61qpkv7qh78qq9v.apps.googleusercontent.com',
  iosClientId:
    '23662840492-laqcbt3hkft72a3mu0ofcokeskr7sr7a.apps.googleusercontent.com',
} as const;
