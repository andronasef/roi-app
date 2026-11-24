import { describe, expect, it } from 'vitest';
import { matches, normalizeArabic } from '../arabic';
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
