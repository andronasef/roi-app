import { toArabicDigits } from '@roi/shared';
import * as Linking from 'expo-linking';

import { SUPPORT_URLS } from '../../constants/app';
import ar from '../../locales/ar.json';
import type { Gender, UserProfile } from '../profile/repository';
import { uiCopy } from '../profile/ui-copy';

export interface LinkingAdapter {
  canOpenURL?: (url: string) => Promise<boolean>;
  openURL: (url: string) => Promise<unknown>;
}

export type OpenSupportUrlResult =
  | { ok: true }
  | { ok: false; reason: 'invalid_url' | 'unsafe_scheme' | 'unsupported' | 'failed' };

export type SettingsProfileValidationResult =
  | { valid: true; profile: UserProfile }
  | { valid: false; error: string };

/** Format the About footer string with Arabic-Indic digits (SET-01, D-14). */
export function formatAppVersionLabel(version: string): string {
  const normalized = version.trim() || '0.1.0';
  return `${ar.settingsAboutPrefix} ${toArabicDigits(normalized)}`;
}

/** Build the Egyptian Arabic Share.share message including Ro'i tagline and link. */
export function buildShareMessage(
  shareUrl: string = SUPPORT_URLS.share,
): string {
  const trimmedUrl = shareUrl.trim() || SUPPORT_URLS.share;
  return `${ar.appName} — ${ar.appTagline}\n${trimmedUrl}`;
}

/** Validate profile name and gender before persisting Settings changes. */
export function validateSettingsProfile(
  name: string,
  gender: Gender,
): SettingsProfileValidationResult {
  const trimmed = name.trim();
  const safeGender: Gender = gender === 'female' ? 'female' : 'male';
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: uiCopy('onboarding2MissingError', safeGender),
    };
  }
  return {
    valid: true,
    profile: {
      name: trimmed,
      gender: safeGender,
    },
  };
}

/**
 * Safely open an external support/rate/WhatsApp URL restricted strictly to https://
 * (T-04-09), catching unsupported schemes or rejections without throwing.
 */
export async function openSupportUrl(
  url: string,
  linkingAdapter: LinkingAdapter = Linking,
): Promise<OpenSupportUrlResult> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, reason: 'invalid_url' };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: 'invalid_url' };
  }

  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'unsafe_scheme' };
  }

  try {
    if (typeof linkingAdapter.canOpenURL === 'function') {
      const supported = await linkingAdapter.canOpenURL(trimmed);
      if (!supported) {
        return { ok: false, reason: 'unsupported' };
      }
    }
    await linkingAdapter.openURL(trimmed);
    return { ok: true };
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
