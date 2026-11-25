import { z } from 'zod';

/**
 * Default Google OAuth client IDs for GCP project `roi-app-515721`
 * (matching `app/constants/app.ts` per D-10).
 */
export const DEFAULT_GOOGLE_CLIENT_IDS = [
  '23662840492-h4j3v57k9dpm0suqa61qpkv7qh78qq9v.apps.googleusercontent.com',
  '23662840492-laqcbt3hkft72a3mu0ofcokeskr7sr7a.apps.googleusercontent.com',
] as const;

function parseCsvList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

/** Validated backend environment schema (D-06, D-10). */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATA_DIR: z.string().trim().min(1).default('./data'),
  ADMIN_ORIGINS: z
    .string()
    .optional()
    .transform((value) => parseCsvList(value)),
  GOOGLE_CLIENT_IDS: z
    .string()
    .optional()
    .transform((value) =>
      value === undefined ? [...DEFAULT_GOOGLE_CLIENT_IDS] : parseCsvList(value),
    )
    .refine((ids) => ids.length > 0, {
      message: 'GOOGLE_CLIENT_IDS must contain at least one client ID',
    }),
});

export type BackendEnv = z.infer<typeof envSchema>;

/** Parse and validate backend environment variables dynamically from the provided env map. */
export function loadEnv(rawEnv: Record<string, string | undefined> = process.env): BackendEnv {
  return envSchema.parse(rawEnv);
}
