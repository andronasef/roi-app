import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-linking', () => ({
  canOpenURL: vi.fn(async () => true),
  openURL: vi.fn(async () => true),
}));

import { SUPPORT_URLS } from '../../../constants/app';
import ar from '../../../locales/ar.json';
import {
  buildShareMessage,
  formatAppVersionLabel,
  openSupportUrl,
  validateSettingsProfile,
  type LinkingAdapter,
} from '../support';

describe('settings support helpers', () => {
  it('formats app version with Arabic-Indic digits', () => {
    expect(formatAppVersionLabel('0.1.0')).toBe('تطبيق روعي • الإصدار ٠.١.٠');
    expect(formatAppVersionLabel('12.3.4')).toBe('تطبيق روعي • الإصدار ١٢.٣.٤');
    expect(formatAppVersionLabel('   ')).toBe('تطبيق روعي • الإصدار ٠.١.٠');
  });

  it('allows only https URLs, checks canOpenURL, and handles failures without throwing', async () => {
    const okAdapter: LinkingAdapter = {
      canOpenURL: vi.fn(async () => true),
      openURL: vi.fn(async () => true),
    };

    const okResult = await openSupportUrl(SUPPORT_URLS.whatsapp, okAdapter);
    expect(okResult).toEqual({ ok: true });
    expect(okAdapter.canOpenURL).toHaveBeenCalledWith(SUPPORT_URLS.whatsapp);
    expect(okAdapter.openURL).toHaveBeenCalledWith(SUPPORT_URLS.whatsapp);

    for (const unsafeUrl of [
      '',
      'not-a-url',
      'http://example.com',
      'javascript:alert(1)',
      'tel:+201000000000',
      'file:///etc/passwd',
      'roi://spike',
    ]) {
      const spyAdapter: LinkingAdapter = {
        canOpenURL: vi.fn(async () => true),
        openURL: vi.fn(async () => true),
      };
      const res = await openSupportUrl(unsafeUrl, spyAdapter);
      expect(res.ok).toBe(false);
      expect(spyAdapter.canOpenURL).not.toHaveBeenCalled();
      expect(spyAdapter.openURL).not.toHaveBeenCalled();
    }

    const unsupportedAdapter: LinkingAdapter = {
      canOpenURL: vi.fn(async () => false),
      openURL: vi.fn(async () => true),
    };
    const unsupportedRes = await openSupportUrl(
      SUPPORT_URLS.rate,
      unsupportedAdapter,
    );
    expect(unsupportedRes.ok).toBe(false);
    expect(unsupportedAdapter.openURL).not.toHaveBeenCalled();

    const throwingAdapter: LinkingAdapter = {
      canOpenURL: vi.fn(async () => true),
      openURL: vi.fn(async () => {
        throw new Error('scheme unavailable');
      }),
    };
    await expect(
      openSupportUrl(SUPPORT_URLS.support, throwingAdapter),
    ).resolves.toEqual({ ok: false, reason: 'failed' });
  });

  it('builds a share message containing app name, tagline, and share URL', () => {
    const message = buildShareMessage(SUPPORT_URLS.share);
    expect(message).toContain(ar.appName);
    expect(message).toContain(ar.appTagline);
    expect(message).toContain(SUPPORT_URLS.share);
  });

  it('validates settings profile name and trims valid input cleanly', () => {
    const emptyMale = validateSettingsProfile('   ', 'male');
    expect(emptyMale.valid).toBe(false);
    if (!emptyMale.valid) {
      expect(emptyMale.error).toContain('اكتب اسمك');
    }

    const emptyFemale = validateSettingsProfile('', 'female');
    expect(emptyFemale.valid).toBe(false);
    if (!emptyFemale.valid) {
      expect(emptyFemale.error).toContain('اكتبي اسمك');
    }

    expect(validateSettingsProfile('  مريم  ', 'female')).toEqual({
      valid: true,
      profile: { name: 'مريم', gender: 'female' },
    });
  });
});
