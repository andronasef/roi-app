import { describe, expect, it } from 'vitest';
import {
  NAME_TOKEN,
  formatArabicDate,
  matches,
  normalizeArabic,
  personalize,
  toArabicDigits,
} from '../arabic';
import { SEARCH_CASES, TORTURE_FIXTURES } from '../fixtures';

describe('normalizeArabic', () => {
  it('strips diacritics from fully voweled Psalm 23:1 to plain letters', () => {
    const ps23 = TORTURE_FIXTURES.find((f) => f.id === 'ps23-1')!;
    expect(normalizeArabic(ps23.text)).toBe('الرب راعي فلا يعوزني شيء.');
  });

  it('maps alef variants آ أ إ ٱ to bare alef ا', () => {
    expect(normalizeArabic('آأإٱ')).toBe('اااا');
  });

  it('maps taa marbuta ة to haa ه', () => {
    expect(normalizeArabic('محبة الحياة')).toBe('محبه الحياه');
  });

  it('maps alef maqsura ى to yaa ي', () => {
    expect(normalizeArabic('إلى على')).toBe('الي علي');
  });

  it('strips tatweel and bidi control marks', () => {
    expect(normalizeArabic('\u200Eالـــر\u200Fب\u202A\u2066\u061C\u2069\u202C')).toBe('الرب');
  });

  it('does not collapse ؤ or ئ', () => {
    expect(normalizeArabic('يُؤْمِنُ شَيْءٌ')).toBe('يؤمن شيء');
  });

  it('normalizes Arabic-Indic and Persian digits and lowercases Latin', () => {
    expect(normalizeArabic('Psalm ٢۳: 1')).toBe('psalm 23: 1');
  });
});

describe('matches', () => {
  it('empty or whitespace-only query matches everything', () => {
    for (const fixture of TORTURE_FIXTURES) {
      expect(matches(fixture.text, '')).toBe(true);
      expect(matches(fixture.text, '   \u200F ')).toBe(true);
    }
  });

  it.each(SEARCH_CASES)(
    'search case "$query" matches expected fixture ids',
    ({ query, expected }) => {
      const actual = TORTURE_FIXTURES.filter((f) => matches(f.text, query)).map((f) => f.id);
      expect(actual).toEqual(expected);
    },
  );
});

describe('toArabicDigits', () => {
  it('converts numbers and mixed strings to Arabic-Indic digits leaving non-digits untouched', () => {
    expect(toArabicDigits(2026)).toBe('٢٠٢٦');
    expect(toArabicDigits('Psalm 23')).toBe('Psalm ٢٣');
  });
});

describe('formatArabicDate', () => {
  it('formats local date with Egyptian Arabic month names and Arabic-Indic digits', () => {
    expect(formatArabicDate(new Date(2026, 10, 24))).toBe('٢٤ نوفمبر ٢٠٢٦');
    expect(formatArabicDate(new Date(2026, 10, 24, 23, 30))).toBe('٢٤ نوفمبر ٢٠٢٦');
  });

  it('honours a custom 12-month table', () => {
    const customMonths = Array.from({ length: 12 }, (_, i) => `شهر${i + 1}`);
    expect(formatArabicDate(new Date(2026, 0, 5), customMonths)).toBe('٥ شهر1 ٢٠٢٦');
  });
});

describe('personalize', () => {
  it('exposes NAME_TOKEN as {الاسم}', () => {
    expect(NAME_TOKEN).toBe('{الاسم}');
  });

  it('replaces NAME_TOKEN with trimmed name for male profile', () => {
    expect(personalize({ text: 'يا {الاسم}، الرب معك' }, { name: 'أندرو', gender: 'male' })).toBe(
      'يا أندرو، الرب معك',
    );
  });

  it('uses textFemale when gender is female and falls back to text when textFemale is absent', () => {
    expect(
      personalize(
        { text: 'يا {الاسم}، الرب معك', textFemale: 'يا {الاسم}، الرب معكِ' },
        { name: 'مريم', gender: 'female' },
      ),
    ).toBe('يا مريم، الرب معكِ');
    expect(personalize({ text: 'يا {الاسم}، الرب معك' }, { name: 'مريم', gender: 'female' })).toBe(
      'يا مريم، الرب معك',
    );
  });

  it('leaves no raw braces or double spaces when name is missing or blank', () => {
    const missing = personalize({ text: 'الرب مع {الاسم} دائماً' }, {});
    expect(missing).toBe('الرب مع دائماً');
    expect(missing).not.toMatch(/[{}]/);
    expect(missing).not.toMatch(/\s{2,}/);

    const blank = personalize({ text: 'الرب مع {الاسم} دائماً' }, { name: '   ' });
    expect(blank).toBe('الرب مع دائماً');
  });

  it('inserts $& literally without replacement pattern expansion', () => {
    expect(personalize({ text: 'يا {الاسم}، سلام' }, { name: '$&' })).toBe('يا $&، سلام');
  });
});
