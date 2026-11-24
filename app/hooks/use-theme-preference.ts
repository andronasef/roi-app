import { colorScheme } from 'nativewind';
import { useCallback, useEffect, useState } from 'react';

import { type ThemePreference } from '@/constants/theme';
import {
  getThemePreference,
  setThemePreference,
  storage,
  STORAGE_KEYS,
} from '@/services/storage';

export function useThemePreference() {
  const [theme, setThemeState] = useState<ThemePreference>(getThemePreference);

  useEffect(() => {
    const subscription = storage.addOnValueChangedListener((key) => {
      if (key === STORAGE_KEYS.THEME) {
        setThemeState(getThemePreference());
      }
    });
    return () => subscription.remove();
  }, []);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemePreference(next);
    colorScheme.set(next);
    setThemeState(next);
  }, []);

  return { theme, setTheme } as const;
}
