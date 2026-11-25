import { z } from 'zod';
import { NAME_TOKEN } from './arabic';

const epochMsSchema = z.number().int().nonnegative();
const versionSchema = z.number().int().nonnegative();

const EMPTY_TEXT_ERROR = 'النص لا يمكن أن يكون فارغاً';
const BRACE_TOKEN_ERROR = 'الرمز الوحيد المسموح به داخل الأقواس هو {الاسم}';

function hasOnlyAllowedBraceToken(value: string): boolean {
  return !/[{}]/.test(value.replaceAll(NAME_TOKEN, ''));
}

const titleOrRefSchema = z.string().trim().min(1, EMPTY_TEXT_ERROR).max(200);
const optionalVerseRefSchema = z
  .string()
  .trim()
  .min(1, EMPTY_TEXT_ERROR)
  .max(200)
  .nullable()
  .optional();
const sortOrderSchema = z.number().int().nullable().optional();
const tagsSchema = z.array(z.string().trim().min(1).max(64)).max(32).nullable().optional();

/** Schema for syncable rows with integer epoch-ms UTC timestamps (D-12). */
export const syncRowSchema = z.object({
  id: z.string().min(1).max(64),
  createdAt: epochMsSchema,
  updatedAt: epochMsSchema,
  deletedAt: epochMsSchema.nullable(),
});

/** Schema for personalized Arabic content allowing only {الاسم} as a brace token. */
export const personalizedTextSchema = z.object({
  text: z
    .string()
    .min(1, EMPTY_TEXT_ERROR)
    .max(5000)
    .refine((v) => v.trim().length > 0, EMPTY_TEXT_ERROR)
    .refine(hasOnlyAllowedBraceToken, BRACE_TOKEN_ERROR),
  textFemale: z
    .string()
    .max(5000)
    .refine(hasOnlyAllowedBraceToken, BRACE_TOKEN_ERROR)
    .nullable()
    .optional(),
});

/** Content kinds supported for public library items and user suggestions. */
export const contentKindSchema = z.enum(['verse', 'name_of_god', 'blessing']);

/** Snapshot file types served by GET /snapshots/:type and staged on mobile. */
export const snapshotTypeSchema = z.enum(['verses', 'names_of_god', 'blessings']);

/** Public verse item contract shared between backend snapshots/deltas and mobile SQLite. */
export const verseItemSchema = syncRowSchema
  .extend(personalizedTextSchema.shape)
  .extend({
    ref: titleOrRefSchema,
    version: versionSchema,
    sortOrder: sortOrderSchema,
    tags: tagsSchema,
  });

/** Public Name of God item contract shared between backend snapshots/deltas and mobile SQLite. */
export const nameOfGodItemSchema = syncRowSchema
  .extend(personalizedTextSchema.shape)
  .extend({
    title: titleOrRefSchema,
    version: versionSchema,
    sortOrder: sortOrderSchema,
    tags: tagsSchema,
  });

/** Public blessing item contract shared between backend snapshots/deltas and mobile SQLite. */
export const blessingItemSchema = syncRowSchema
  .extend(personalizedTextSchema.shape)
  .extend({
    title: titleOrRefSchema,
    verseRef: optionalVerseRefSchema,
    version: versionSchema,
    sortOrder: sortOrderSchema,
    tags: tagsSchema,
  });

/** Factory for typed per-content-type gzipped snapshot envelopes. */
export function createSnapshotEnvelopeSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    type: snapshotTypeSchema,
    contentVersion: versionSchema,
    generatedAt: epochMsSchema,
    items: z.array(itemSchema),
  });
}

/** Discriminated union validating any of the three public content snapshot envelopes. */
export const snapshotEnvelopeSchema = z.discriminatedUnion('type', [
  createSnapshotEnvelopeSchema(verseItemSchema).extend({ type: z.literal('verses') }),
  createSnapshotEnvelopeSchema(nameOfGodItemSchema).extend({ type: z.literal('names_of_god') }),
  createSnapshotEnvelopeSchema(blessingItemSchema).extend({ type: z.literal('blessings') }),
]);

/** GraphQL contentDelta(sinceVersion) response contract including tombstones. */
export const contentDeltaResponseSchema = z.object({
  contentVersion: versionSchema,
  verses: z.array(verseItemSchema),
  namesOfGod: z.array(nameOfGodItemSchema),
  blessings: z.array(blessingItemSchema),
});

/** Google-authenticated suggestion payload validated before inserting pending rows (D-12). */
export const submitSuggestionInputSchema = personalizedTextSchema.extend({
  kind: contentKindSchema,
  title: titleOrRefSchema,
  verseRef: optionalVerseRefSchema,
});

const seedBaseSchema = personalizedTextSchema.extend({
  id: z.string().min(1).max(64),
  sortOrder: sortOrderSchema,
  tags: tagsSchema,
  deletedAt: epochMsSchema.nullable().optional(),
});

export const seedVerseItemSchema = seedBaseSchema.extend({
  ref: titleOrRefSchema,
});

export const seedNameOfGodItemSchema = seedBaseSchema.extend({
  title: titleOrRefSchema,
});

export const seedBlessingItemSchema = seedBaseSchema.extend({
  title: titleOrRefSchema,
  verseRef: optionalVerseRefSchema,
});

/** Local JSON seed file contract (D-05, zero Sanity API metadata). */
export const seedContentFileSchema = z.object({
  verses: z.array(seedVerseItemSchema),
  namesOfGod: z.array(seedNameOfGodItemSchema),
  blessings: z.array(seedBlessingItemSchema),
});

export type SyncRowRecord = z.infer<typeof syncRowSchema>;
export type PersonalizedText = z.infer<typeof personalizedTextSchema>;
export type ContentKind = z.infer<typeof contentKindSchema>;
export type SnapshotType = z.infer<typeof snapshotTypeSchema>;
export type VerseItem = z.infer<typeof verseItemSchema>;
export type NameOfGodItem = z.infer<typeof nameOfGodItemSchema>;
export type BlessingItem = z.infer<typeof blessingItemSchema>;
export type SnapshotEnvelope = z.infer<typeof snapshotEnvelopeSchema>;
export type ContentDeltaResponse = z.infer<typeof contentDeltaResponseSchema>;
export type SubmitSuggestionInput = z.infer<typeof submitSuggestionInputSchema>;
export type SeedVerseItem = z.infer<typeof seedVerseItemSchema>;
export type SeedNameOfGodItem = z.infer<typeof seedNameOfGodItemSchema>;
export type SeedBlessingItem = z.infer<typeof seedBlessingItemSchema>;
export type SeedContentFile = z.infer<typeof seedContentFileSchema>;
