import { describe, expect, it } from 'vitest';
import { NAME_TOKEN } from '@roi/shared';
import {
  contentFormSchema,
  createContentFormSchema,
  hasOneSidedNameToken,
  normalizeOptionalVerseRef,
} from '@/lib/validation';

const base = {
  kind: 'blessing' as const,
  refOrTitle: 'بركة',
  verseRef: '',
  sameForBoth: true,
  text: `يباركك ${NAME_TOKEN}`,
  textFemale: '',
};

describe('contentFormSchema', () => {
  it('accepts valid input and coerces blank verseRef to null', () => {
    for (const verseRef of ['', '   ']) {
      const r = contentFormSchema.safeParse({ ...base, verseRef });
      expect(r.success).toBe(true);
      expect(r.data?.verseRef).toBeNull();
    }
    expect(contentFormSchema.parse({ ...base, verseRef: ' يوحنا ٣: ١٦ ' }).verseRef).toBe('يوحنا ٣: ١٦');
  });

  it.each(['{name}', '{foo}', 'x { y', 'y }'])('rejects brace token %s', (bad) => {
    const r = contentFormSchema.safeParse({ ...base, text: bad });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toContain('{الاسم}');
  });

  it('rejects brace tokens in the female text only when it is visible', () => {
    const bad = { ...base, textFemale: '{other}' };
    expect(contentFormSchema.safeParse({ ...bad, sameForBoth: false }).success).toBe(false);
    expect(contentFormSchema.safeParse({ ...bad, sameForBoth: true }).success).toBe(true);
  });

  it('requires non-empty trimmed textFemale when sameForBoth is false', () => {
    for (const textFemale of ['', '   ', null]) {
      const r = contentFormSchema.safeParse({ ...base, sameForBoth: false, textFemale });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0]?.path).toEqual(['textFemale']);
    }
    expect(contentFormSchema.safeParse({ ...base, sameForBoth: false, textFemale: 'تباركين' }).success).toBe(true);
  });

  it('trims and requires refOrTitle', () => {
    expect(contentFormSchema.safeParse({ ...base, refOrTitle: '   ' }).success).toBe(false);
    expect(contentFormSchema.parse({ ...base, refOrTitle: ' x ' }).refOrTitle).toBe('x');
  });

  it('createContentFormSchema pins the kind', () => {
    expect(createContentFormSchema('verse').safeParse({ ...base, kind: 'verse' }).success).toBe(true);
    expect(createContentFormSchema('verse').safeParse(base).success).toBe(false);
  });
});

describe('helpers', () => {
  it('normalizeOptionalVerseRef', () => {
    expect(normalizeOptionalVerseRef('')).toBeNull();
    expect(normalizeOptionalVerseRef('  ')).toBeNull();
    expect(normalizeOptionalVerseRef(undefined)).toBeNull();
    expect(normalizeOptionalVerseRef(' a ')).toBe('a');
  });

  it('hasOneSidedNameToken', () => {
    expect(hasOneSidedNameToken(true, NAME_TOKEN, '')).toBe(false);
    expect(hasOneSidedNameToken(false, NAME_TOKEN, 'x')).toBe(true);
    expect(hasOneSidedNameToken(false, 'x', NAME_TOKEN)).toBe(true);
    expect(hasOneSidedNameToken(false, NAME_TOKEN, NAME_TOKEN)).toBe(false);
    expect(hasOneSidedNameToken(false, 'x', null)).toBe(false);
  });
});
