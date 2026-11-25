import { z } from 'zod';
import { NAME_TOKEN, blessingItemSchema, contentKindSchema, personalizedTextSchema } from '@roi/shared';
import type { ContentKind } from '@roi/shared';

const EMPTY_TEXT_ERROR = 'النص لا يمكن أن يكون فارغاً';

/** Blank / whitespace-only optional verseRef becomes null so shared `min(1)` never trips on it. */
export function normalizeOptionalVerseRef(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

/** D-06: true when male/female variants exist and only one of them contains {الاسم}. */
export function hasOneSidedNameToken(
  sameForBoth: boolean,
  text: string,
  textFemale: string | null | undefined,
): boolean {
  return !sameForBoth && text.includes(NAME_TOKEN) !== (textFemale ?? '').includes(NAME_TOKEN);
}

function buildSchema<K extends z.ZodType<ContentKind>>(kind: K) {
  return z
    .object({
      kind,
      refOrTitle: blessingItemSchema.shape.title,
      verseRef: z.preprocess(
        (v) => normalizeOptionalVerseRef(typeof v === 'string' ? v : null),
        blessingItemSchema.shape.verseRef,
      ),
      sameForBoth: z.boolean(),
      text: personalizedTextSchema.shape.text,
      // Hidden (sameForBoth) drafts are never validated; checked in superRefine when visible.
      textFemale: z.string().max(5000).nullable().optional(),
    })
    .superRefine((value, ctx) => {
      if (value.sameForBoth) return;
      if (!(value.textFemale ?? '').trim()) {
        ctx.addIssue({ code: 'custom', path: ['textFemale'], message: EMPTY_TEXT_ERROR });
        return;
      }
      const result = personalizedTextSchema.shape.textFemale.safeParse(value.textFemale);
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({ code: 'custom', path: ['textFemale'], message: issue.message });
        }
      }
    });
}

export const contentFormSchema = buildSchema(contentKindSchema);

export function createContentFormSchema(kind: ContentKind) {
  return buildSchema(z.literal(kind));
}

export type ContentFormValues = {
  kind: ContentKind;
  refOrTitle: string;
  verseRef: string;
  sameForBoth: boolean;
  text: string;
  textFemale: string;
};
