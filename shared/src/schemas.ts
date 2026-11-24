import { z } from 'zod';
import { NAME_TOKEN } from './arabic';

const epochMsSchema = z.number().int().nonnegative();

const EMPTY_TEXT_ERROR = 'النص لا يمكن أن يكون فارغاً';
const BRACE_TOKEN_ERROR = 'الرمز الوحيد المسموح به داخل الأقواس هو {الاسم}';

function hasOnlyAllowedBraceToken(value: string): boolean {
  return !/[{}]/.test(value.replaceAll(NAME_TOKEN, ''));
}

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

export type SyncRowRecord = z.infer<typeof syncRowSchema>;
export type PersonalizedText = z.infer<typeof personalizedTextSchema>;
