import { describe, expect, it } from 'vitest';
import {
  EGYPTIAN_MONTHS,
  NAME_TOKEN,
  SEARCH_CASES,
  TORTURE_FIXTURES,
  formatArabicDate,
  localDateKey,
  matches,
  mergeRecords,
  monthKey,
  normalizeArabic,
  personalize,
  personalizedTextSchema,
  seededPick,
  syncRowSchema,
  toArabicDigits,
  uuidv7,
  weekKey,
} from '@roi/shared';

describe('@roi/backend consumes @roi/shared from source TypeScript', () => {
  it('exercises Arabic normalization, search, digits, dates, and personalization exports', () => {
    expect(NAME_TOKEN).toBe('{الاسم}');
    expect(EGYPTIAN_MONTHS).toHaveLength(12);
    expect(normalizeArabic('اَلرَّبُّ رَاعِيَّ')).toBe('الرب راعي');
    expect(matches('فِي مَرَاعٍ خُضْرٍ', 'مراع خضر')).toBe(true);
    expect(toArabicDigits('2026-11-24')).toBe('٢٠٢٦-١١-٢٤');
    expect(formatArabicDate(new Date(2026, 10, 24))).toBe('٢٤ نوفمبر ٢٠٢٦');
    expect(
      personalize(
        { text: `يا ${NAME_TOKEN}، سلام`, textFemale: `يا ${NAME_TOKEN}، سلام لكِ` },
        { name: 'مريم', gender: 'female' },
      ),
    ).toBe('يا مريم، سلام لكِ');

    expect(TORTURE_FIXTURES.length).toBeGreaterThanOrEqual(10);
    for (const testCase of SEARCH_CASES) {
      const matchedIds = TORTURE_FIXTURES.filter((f) => matches(f.text, testCase.query)).map(
        (f) => f.id,
      );
      expect(matchedIds).toEqual(testCase.expected);
    }
  });

  it('exercises UUIDv7, period keys, seededPick, mergeRecords, and Zod schemas', () => {
    const now = 1795552466000;
    const id = uuidv7(now, (n) => new Uint8Array(n).fill(0x2a));
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);

    const sampleDate = new Date(2026, 10, 24);
    expect(localDateKey(sampleDate)).toBe('2026-11-24');
    expect(weekKey(sampleDate)).toBe('2026-11-21');
    expect(monthKey(sampleDate)).toBe('2026-11');
    expect(seededPick(TORTURE_FIXTURES, '2026-11-21')).toBeDefined();

    const merged = mergeRecords(
      [{ id, updatedAt: now - 1000, deletedAt: null, value: 'old' }],
      [{ id, updatedAt: now, deletedAt: null, value: 'new' }],
      now,
    );
    expect(merged).toEqual([{ id, updatedAt: now, deletedAt: null, value: 'new' }]);

    const validRow = syncRowSchema.parse({
      id,
      createdAt: now - 1000,
      updatedAt: now,
      deletedAt: null,
    });
    expect(validRow.id).toBe(id);

    const validContent = personalizedTextSchema.parse({
      text: `الرب يبارك ${NAME_TOKEN}`,
      textFemale: null,
    });
    expect(validContent.text).toContain(NAME_TOKEN);
  });
});
