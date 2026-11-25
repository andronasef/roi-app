import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { formatArabicDate } from '@roi/shared';
import {
  ADMIN_DICTIONARY,
  ADMIN_LANG_STORAGE_KEY,
  I18nProvider,
  formatNumber,
  formatTimestamp,
  useI18n,
} from '@/lib/i18n';
import { cn } from '@/lib/utils';

function LangProbe() {
  const { lang, dir, t, toggleLang, setLang, formatNumber: fmtNum, formatTimestamp: fmtTs } =
    useI18n();
  return (
    <div dir={dir} data-testid="probe">
      <span data-testid="lang">{lang}</span>
      <span data-testid="dir">{dir}</span>
      <span data-testid="cta">{t.cta.saveChanges}</span>
      <span data-testid="num">{fmtNum(42)}</span>
      <span data-testid="ts">{fmtTs(new Date(2026, 10, 24, 9, 5).getTime())}</span>
      <button type="button" onClick={toggleLang}>
        toggle
      </button>
      <button type="button" onClick={() => setLang('ar')}>
        set-ar
      </button>
    </div>
  );
}

describe('cn utility', () => {
  it('merges conditional Tailwind classes cleanly', () => {
    expect(cn('px-2 py-1', false && 'hidden', 'px-4')).toBe('py-1 px-4');
  });
});

describe('i18n formatting & provider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.lang = '';
    document.documentElement.dir = '';
  });

  afterEach(() => {
    cleanup();
  });

  it('formats numbers and timestamps in Arabic-Indic vs ASCII', () => {
    expect(formatNumber(1205, 'ar')).toBe('١٢٠٥');
    expect(formatNumber(1205, 'en')).toBe('1205');

    const sample = new Date(2026, 10, 24, 14, 5);
    const arTs = formatTimestamp(sample.getTime(), 'ar');
    expect(arTs).toContain(formatArabicDate(sample));
    expect(arTs).toContain('١٤:٠٥');

    const enTs = formatTimestamp(sample.getTime(), 'en');
    expect(enTs).toBe('2026-11-24 14:05');
  });

  it('defaults to Arabic RTL, persists toggles to roi_admin_lang, and syncs documentElement', () => {
    render(
      <I18nProvider>
        <LangProbe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('lang').textContent).toBe('ar');
    expect(screen.getByTestId('dir').textContent).toBe('rtl');
    expect(screen.getByTestId('cta').textContent).toBe('حفظ التغييرات');
    expect(screen.getByTestId('num').textContent).toBe('٤٢');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');

    fireEvent.click(screen.getByText('toggle'));

    expect(screen.getByTestId('lang').textContent).toBe('en');
    expect(screen.getByTestId('dir').textContent).toBe('ltr');
    expect(screen.getByTestId('cta').textContent).toBe('Save Changes');
    expect(screen.getByTestId('num').textContent).toBe('42');
    expect(window.localStorage.getItem(ADMIN_LANG_STORAGE_KEY)).toBe('en');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('hydrates stored language from localStorage', () => {
    window.localStorage.setItem(ADMIN_LANG_STORAGE_KEY, 'en');

    render(
      <I18nProvider>
        <LangProbe />
      </I18nProvider>,
    );

    expect(screen.getByTestId('lang').textContent).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('contains all required UI-SPEC Copywriting Contract strings in both languages', () => {
    expect(ADMIN_DICTIONARY.ar.errors.allowlist403).toContain('ADMIN_EMAILS');
    expect(ADMIN_DICTIONARY.en.errors.allowlist403).toContain('ADMIN_EMAILS');
    expect(ADMIN_DICTIONARY.ar.errors.braceRuleAdm06).toContain('{الاسم}');
    expect(ADMIN_DICTIONARY.en.errors.braceRuleAdm06).toContain('{الاسم}');
    expect(ADMIN_DICTIONARY.ar.warnings.oneSidedNameD06).toContain('{الاسم}');
    expect(ADMIN_DICTIONARY.en.warnings.oneSidedNameD06).toContain('{الاسم}');
    expect(ADMIN_DICTIONARY.ar.errors.sessionExpired401).toContain('مسودتك محفوظة');
    expect(ADMIN_DICTIONARY.en.errors.sessionExpired401).toContain('unsaved edits are preserved');
    expect(ADMIN_DICTIONARY.ar.confirmations.softDelete.confirm).toBe('تأكيد الحذف المؤقت');
    expect(ADMIN_DICTIONARY.en.confirmations.softDelete.confirm).toBe('Confirm Soft Delete');
    expect(ADMIN_DICTIONARY.ar.confirmations.rejectSuggestion.confirm).toBe('تأكيد رفض الاقتراح');
    expect(ADMIN_DICTIONARY.en.confirmations.rejectSuggestion.confirm).toBe(
      'Confirm Reject Suggestion',
    );
  });
});
