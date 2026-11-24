import { describe, expect, it } from 'vitest';
import { personalizedTextSchema, syncRowSchema } from '../schemas';

describe('syncRowSchema', () => {
  const validRow = {
    id: '01939a4b-cdef-7000-8000-000000000001',
    createdAt: 1_795_552_000_000,
    updatedAt: 1_795_552_100_000,
    deletedAt: null,
  };

  it('accepts integer epoch ms timestamps and null deletedAt', () => {
    expect(syncRowSchema.safeParse(validRow).success).toBe(true);
    expect(
      syncRowSchema.safeParse({
        id: 'shukr:2026-11-24',
        createdAt: 0,
        updatedAt: 1000,
        deletedAt: 2000,
      }).success,
    ).toBe(true);
  });

  it('rejects fractional, negative, or ISO string timestamps', () => {
    expect(syncRowSchema.safeParse({ ...validRow, createdAt: 12.5 }).success).toBe(false);
    expect(syncRowSchema.safeParse({ ...validRow, updatedAt: -1 }).success).toBe(false);
    expect(syncRowSchema.safeParse({ ...validRow, deletedAt: -5 }).success).toBe(false);
    expect(syncRowSchema.safeParse({ ...validRow, deletedAt: 1.1 }).success).toBe(false);
    expect(
      syncRowSchema.safeParse({ ...validRow, updatedAt: '2026-11-24T00:00:00Z' }).success,
    ).toBe(false);
  });

  it('rejects empty or oversized ids', () => {
    expect(syncRowSchema.safeParse({ ...validRow, id: '' }).success).toBe(false);
    expect(syncRowSchema.safeParse({ ...validRow, id: 'a'.repeat(65) }).success).toBe(false);
  });
});

describe('personalizedTextSchema', () => {
  it('accepts plain Arabic text and text containing {الاسم}', () => {
    expect(personalizedTextSchema.safeParse({ text: 'يا {الاسم}، الرب راعيك' }).success).toBe(true);
    expect(
      personalizedTextSchema.safeParse({
        text: 'يا {الاسم}، الرب معك',
        textFemale: 'يا {الاسم}، الرب معكِ',
      }).success,
    ).toBe(true);
    expect(personalizedTextSchema.safeParse({ text: 'نص بدون رمز', textFemale: null }).success).toBe(
      true,
    );
  });

  it('rejects any brace token other than {الاسم} with an Arabic message', () => {
    const english = personalizedTextSchema.safeParse({ text: 'Hello {name}' });
    expect(english.success).toBe(false);
    if (!english.success) {
      expect(english.error.issues[0]?.message).toMatch(/[\u0600-\u06FF]/);
    }

    const wrongHamza = personalizedTextSchema.safeParse({ text: 'يا {الإسم}' });
    expect(wrongHamza.success).toBe(false);

    const femaleWrong = personalizedTextSchema.safeParse({
      text: 'يا {الاسم}',
      textFemale: 'يا {user}',
    });
    expect(femaleWrong.success).toBe(false);

    const strayBrace = personalizedTextSchema.safeParse({ text: 'يا {الاسم' });
    expect(strayBrace.success).toBe(false);
  });

  it('rejects empty or whitespace-only text', () => {
    expect(personalizedTextSchema.safeParse({ text: '' }).success).toBe(false);
    expect(personalizedTextSchema.safeParse({ text: '   ' }).success).toBe(false);
  });
});
