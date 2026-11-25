import { describe, expect, it } from 'vitest';
import {
  blessingItemSchema,
  contentDeltaResponseSchema,
  contentKindSchema,
  createSnapshotEnvelopeSchema,
  nameOfGodItemSchema,
  personalizedTextSchema,
  seedContentFileSchema,
  snapshotEnvelopeSchema,
  snapshotTypeSchema,
  submitSuggestionInputSchema,
  syncRowSchema,
  verseItemSchema,
} from '../schemas';

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
  it('rejects Markdown links/images and raw HTML but allows blockquotes and comparisons (WR-03)', () => {
    for (const bad of ['[x](https://evil.example)', '![](https://t.example/p.png)', 'a <img src=x> b', '<script>']) {
      expect(personalizedTextSchema.safeParse({ text: bad }).success).toBe(false);
      expect(personalizedTextSchema.safeParse({ text: 'ok', textFemale: bad }).success).toBe(false);
    }
    expect(personalizedTextSchema.safeParse({ text: '> اقتباس\n\n**نص** و 1 < 2' }).success).toBe(true);
  });

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

describe('contentKindSchema & snapshotTypeSchema', () => {
  it('accepts only verse, name_of_god, and blessing for contentKindSchema', () => {
    expect(contentKindSchema.safeParse('verse').success).toBe(true);
    expect(contentKindSchema.safeParse('name_of_god').success).toBe(true);
    expect(contentKindSchema.safeParse('blessing').success).toBe(true);
    expect(contentKindSchema.safeParse('prayer').success).toBe(false);
    expect(contentKindSchema.safeParse('verses').success).toBe(false);
  });

  it('accepts only verses, names_of_god, and blessings for snapshotTypeSchema', () => {
    expect(snapshotTypeSchema.safeParse('verses').success).toBe(true);
    expect(snapshotTypeSchema.safeParse('names_of_god').success).toBe(true);
    expect(snapshotTypeSchema.safeParse('blessings').success).toBe(true);
    expect(snapshotTypeSchema.safeParse('verse').success).toBe(false);
    expect(snapshotTypeSchema.safeParse('other').success).toBe(false);
  });
});

describe('content item, snapshot envelope, and delta schemas', () => {
  const baseSync = {
    id: 'ps23-1',
    createdAt: 1_795_552_000_000,
    updatedAt: 1_795_552_000_000,
    deletedAt: null,
    version: 1,
    sortOrder: 1,
    tags: ['سلام', 'تعزية'],
  };

  const validVerse = {
    ...baseSync,
    ref: 'مزمور ٢٣: ١',
    text: 'اَلرَّبُّ رَاعِيَّ فَلاَ يُعْوِزُنِي شَيْءٌ.',
    textFemale: null,
  };

  const validName = {
    ...baseSync,
    id: 'name-shepherd',
    title: 'الراعي الصالح',
    text: 'يا {الاسم}، الرب يرعاك',
    textFemale: 'يا {الاسم}، الرب يرعاكِ',
  };

  const validBlessing = {
    ...baseSync,
    id: 'blessing-peace',
    title: 'بركة السلام',
    text: 'سلام الله يحفظ قلبك يا {الاسم}',
    textFemale: 'سلام الله يحفظ قلبكِ يا {الاسم}',
    verseRef: 'فيلبي ٤: ٧',
  };

  it('validates verseItemSchema, nameOfGodItemSchema, and blessingItemSchema', () => {
    expect(verseItemSchema.safeParse(validVerse).success).toBe(true);
    expect(nameOfGodItemSchema.safeParse(validName).success).toBe(true);
    expect(blessingItemSchema.safeParse(validBlessing).success).toBe(true);
    expect(
      blessingItemSchema.safeParse({ ...validBlessing, verseRef: null, sortOrder: null, tags: null })
        .success,
    ).toBe(true);
  });

  it('supports tombstones (deletedAt != null) and rejects invalid brace tokens or negative version', () => {
    expect(
      verseItemSchema.safeParse({ ...validVerse, deletedAt: 1_795_553_000_000, version: 2 }).success,
    ).toBe(true);
    expect(verseItemSchema.safeParse({ ...validVerse, version: -1 }).success).toBe(false);
    expect(verseItemSchema.safeParse({ ...validVerse, text: 'يا {user}' }).success).toBe(false);
  });

  it('validates createSnapshotEnvelopeSchema, snapshotEnvelopeSchema, and contentDeltaResponseSchema', () => {
    const verseEnvelopeSchema = createSnapshotEnvelopeSchema(verseItemSchema);
    const envelope = {
      type: 'verses' as const,
      contentVersion: 3,
      generatedAt: 1_795_552_000_000,
      items: [validVerse],
    };
    expect(verseEnvelopeSchema.safeParse(envelope).success).toBe(true);
    expect(snapshotEnvelopeSchema.safeParse(envelope).success).toBe(true);
    expect(
      snapshotEnvelopeSchema.safeParse({
        ...envelope,
        type: 'names_of_god',
        items: [validName],
      }).success,
    ).toBe(true);
    expect(
      snapshotEnvelopeSchema.safeParse({
        ...envelope,
        type: 'blessings',
        items: [validBlessing],
      }).success,
    ).toBe(true);
    expect(
      snapshotEnvelopeSchema.safeParse({
        ...envelope,
        type: 'blessings',
        items: [validVerse],
      }).success,
    ).toBe(false);

    expect(
      contentDeltaResponseSchema.safeParse({
        contentVersion: 3,
        verses: [validVerse],
        namesOfGod: [validName],
        blessings: [validBlessing],
      }).success,
    ).toBe(true);
  });
});

describe('submitSuggestionInputSchema', () => {
  it('accepts valid suggestions for all three kinds and trims title', () => {
    const parsed = submitSuggestionInputSchema.parse({
      kind: 'blessing',
      title: '  بركة الصباح  ',
      text: 'يباركك الرب يا {الاسم}',
      textFemale: 'يبارككِ الرب يا {الاسم}',
      verseRef: '  العدد ٦: ٢٤  ',
    });
    expect(parsed.title).toBe('بركة الصباح');
    expect(parsed.verseRef).toBe('العدد ٦: ٢٤');

    expect(
      submitSuggestionInputSchema.safeParse({
        kind: 'verse',
        title: 'مزمور ٢٣: ١',
        text: 'الرب راعي فلا يعوزني شيء',
        verseRef: null,
      }).success,
    ).toBe(true);
  });

  it('rejects empty/whitespace/oversized title and invalid brace tokens with Arabic errors', () => {
    expect(
      submitSuggestionInputSchema.safeParse({
        kind: 'verse',
        title: '   ',
        text: 'نص صحيح',
      }).success,
    ).toBe(false);

    expect(
      submitSuggestionInputSchema.safeParse({
        kind: 'name_of_god',
        title: 'أ'.repeat(201),
        text: 'نص صحيح',
      }).success,
    ).toBe(false);

    const badToken = submitSuggestionInputSchema.safeParse({
      kind: 'verse',
      title: 'آية',
      text: 'يا {name} سلام',
    });
    expect(badToken.success).toBe(false);
    if (!badToken.success) {
      expect(badToken.error.issues[0]?.message).toMatch(/[\u0600-\u06FF]/);
    }

    const badFemaleToken = submitSuggestionInputSchema.safeParse({
      kind: 'blessing',
      title: 'بركة',
      text: 'سلام يا {الاسم}',
      textFemale: 'سلام يا {الإسم}',
    });
    expect(badFemaleToken.success).toBe(false);
    if (!badFemaleToken.success) {
      expect(badFemaleToken.error.issues[0]?.message).toMatch(/[\u0600-\u06FF]/);
    }
  });
});

describe('seedContentFileSchema', () => {
  it('accepts clean local seed JSON without Sanity metadata', () => {
    const result = seedContentFileSchema.safeParse({
      verses: [
        {
          id: 'ps23-1',
          ref: 'مزمور ٢٣: ١',
          text: 'اَلرَّبُّ رَاعِيَّ فَلاَ يُعْوِزُنِي شَيْءٌ.',
          sortOrder: 1,
          tags: ['رعاية'],
        },
      ],
      namesOfGod: [
        {
          id: 'name-1',
          title: 'الراعي',
          text: 'يرعاك يا {الاسم}',
          textFemale: 'يرعاكِ يا {الاسم}',
        },
      ],
      blessings: [
        {
          id: 'blessing-1',
          title: 'بركة',
          text: 'سلام لك يا {الاسم}',
          verseRef: 'يوحنا ١٤: ٢٧',
          deletedAt: null,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid brace tokens or missing required arrays in seed JSON', () => {
    expect(
      seedContentFileSchema.safeParse({
        verses: [{ id: 'v1', ref: 'مرجع', text: 'يا {wrong}' }],
        namesOfGod: [],
        blessings: [],
      }).success,
    ).toBe(false);

    expect(seedContentFileSchema.safeParse({ verses: [] }).success).toBe(false);
  });
});
