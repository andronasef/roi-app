import { z } from 'zod';

export const syncRowSchema = z.object({
  id: z.any(),
  createdAt: z.any(),
  updatedAt: z.any(),
  deletedAt: z.any(),
});

export const personalizedTextSchema = z.object({
  text: z.any(),
  textFemale: z.any().optional(),
});

export type SyncRowRecord = z.infer<typeof syncRowSchema>;
export type PersonalizedText = z.infer<typeof personalizedTextSchema>;
