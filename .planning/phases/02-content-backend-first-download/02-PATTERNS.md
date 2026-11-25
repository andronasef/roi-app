# Phase 2: Content Backend & First Download - Pattern Map

**Mapped:** 2026-11-25
**Files analyzed:** 46
**Analogs found:** 35 / 46

> Every analog path below was verified against `git ls-files` (tracked source only). Code excerpts are copied verbatim with exact file paths and line ranges.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `shared/src/schemas.ts` *(modify)* | model / validation | transform | `shared/src/schemas.ts` | exact |
| `shared/src/index.ts` *(modify)* | config / barrel | transform | `shared/src/index.ts` | exact |
| `shared/src/__tests__/schemas.test.ts` *(modify)* | test | transform | `shared/src/__tests__/schemas.test.ts` | exact |
| `backend/package.json` *(modify)* | config | — | `app/package.json` | exact |
| `backend/tsconfig.json` & `backend/tsconfig.build.json` *(new)* | config | — | `tsconfig.json` & `app/tsconfig.json` | exact |
| `backend/vitest.config.ts` *(new)* | config | — | `vitest.config.ts` | exact |
| `backend/drizzle.config.ts` *(new)* | config | — | `app/drizzle.config.ts` | exact |
| `backend/scripts/build.mjs` *(new)* | utility | transform | `app/scripts/build-fixture.mjs` | role-match |
| `backend/Dockerfile` *(new)* | config / container | — | *None* | no-analog |
| `backend/seed/initial-content.json` *(new)* | config / fixture | batch | `shared/src/fixtures.ts` | role-match |
| `backend/src/config/env.ts` *(new)* | config / validation | transform | `app/constants/app.ts` + `shared/src/schemas.ts` | role-match |
| `backend/src/db/schema.ts` *(new)* | model | CRUD | `app/features/db/schema.ts` | exact |
| `backend/src/db/client.ts` *(new)* | service | file-I/O | `app/features/db/client.ts` + `app/features/db/__tests__/migrate.test.ts` | exact |
| `backend/src/db/drizzle.module.ts` *(new)* | provider | — | *None* | no-analog |
| `backend/src/common/zod-validation.pipe.ts` *(new)* | middleware | transform | `shared/src/schemas.ts` | partial-match |
| `backend/src/common/gql-throttler.guard.ts` *(new)* | middleware | request-response | *None* | no-analog |
| `backend/src/common/google-auth.guard.ts` *(new)* | middleware | request-response | *None* (client config in `app/constants/app.ts`) | no-analog |
| `backend/src/content/snapshot.service.ts` *(new)* | service | file-I/O | `app/scripts/build-fixture.mjs` | partial-match |
| `backend/src/content/snapshot.controller.ts` *(new)* | controller | request-response | *None* | no-analog |
| `backend/src/content/content.service.ts` *(new)* | service | CRUD | `app/features/db/events.ts` | role-match |
| `backend/src/content/content.resolver.ts` *(new)* | controller | request-response | *None* | no-analog |
| `backend/src/suggestions/suggestions.service.ts` *(new)* | service | CRUD | `app/features/db/events.ts` | role-match |
| `backend/src/suggestions/suggestions.resolver.ts` *(new)* | controller | request-response | *None* | no-analog |
| `backend/src/health/health.controller.ts` *(new)* | controller | request-response | *None* | no-analog |
| `backend/src/app.module.ts` *(new)* | config / provider | — | *None* | no-analog |
| `backend/src/main.ts` *(new)* | config | request-response | *None* | no-analog |
| `backend/src/scripts/seed.ts` *(new)* | utility | batch | `app/scripts/build-fixture.mjs` | role-match |
| `backend/src/scripts/backup.ts` *(new)* | utility | file-I/O | `app/scripts/build-fixture.mjs` + `app/features/db/__tests__/migrate.test.ts` | role-match |
| `backend/src/scripts/restore.ts` *(new)* | utility | file-I/O | `app/scripts/build-fixture.mjs` + `app/features/db/__tests__/migrate.test.ts` | role-match |
| `backend/src/__tests__/*.test.ts` *(new)* | test | request-response / CRUD | `backend/src/__tests__/shared.test.ts` + `app/features/db/__tests__/events.test.ts` | exact |
| `app/package.json` *(modify)* | config | — | `app/package.json` | exact |
| `app/constants/app.ts` *(modify)* | config | — | `app/constants/app.ts` | exact |
| `app/constants/sync.ts` *(new)* | config | — | `app/constants/db.ts` + `app/constants/telemetry.ts` | exact |
| `app/constants/telemetry.ts` *(modify)* | config | — | `app/constants/telemetry.ts` | exact |
| `app/features/db/schema.ts` *(modify)* | model | CRUD | `app/features/db/schema.ts` | exact |
| `app/features/db/__tests__/schema.test.ts` & `migrate.test.ts` *(modify)* | test / migration | file-I/O | `app/features/db/__tests__/schema.test.ts` & `migrate.test.ts` | exact |
| `app/features/sync/api.ts` *(new)* | service | request-response | *None* | no-analog |
| `app/features/sync/staging.ts` *(new)* | service | file-I/O | `app/services/storage.ts` | role-match |
| `app/features/sync/first-download.ts` *(new)* | service | batch / CRUD | `app/features/spike/rows.tsx` + `app/features/db/events.ts` | role-match |
| `app/features/sync/delta-sync.ts` *(new)* | service | CRUD | `app/features/spike/rows.tsx` + `app/features/db/events.ts` | role-match |
| `app/features/sync/ContentGate.tsx` *(new)* | component | event-driven | `app/app/_layout.tsx` + `app/app/(dev)/_layout.tsx` | exact |
| `app/features/sync/LibraryReadyView.tsx` *(new)* | component | CRUD (read-only) | `app/app/index.tsx` | exact |
| `app/app/_layout.tsx` *(modify)* | component | event-driven | `app/app/_layout.tsx` | exact |
| `app/app/index.tsx` *(modify)* | component | CRUD (read-only) | `app/app/index.tsx` | exact |
| `app/locales/ar.json` *(modify)* | config | — | `app/locales/ar.json` | exact |
| `app/features/sync/__tests__/*.test.ts` *(new)* | test | batch / CRUD | `app/features/db/__tests__/events.test.ts` + `app/features/spike/__tests__/runner.test.ts` | exact |

---

## Pattern Assignments

### 1. Shared Contracts (`shared/src/`)

#### `shared/src/schemas.ts`, `shared/src/index.ts`, `shared/src/__tests__/schemas.test.ts`
**Analogs:** Self-extending (`shared/src/schemas.ts`, `shared/src/index.ts`, `shared/src/__tests__/schemas.test.ts`).

**Extensionless relative imports & Arabic error constants** (`shared/src/schemas.ts` lines 1–38):
```typescript
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
```
*Note:* Keep imports inside `shared/src/` extensionless (`./arabic`) and free of `node:`, `expo*`, or `react-native*` imports (`app/__tests__/guards.test.ts` lines 111–124).

**Barrel re-exports** (`shared/src/index.ts` lines 21–26):
```typescript
export {
  syncRowSchema,
  personalizedTextSchema,
  type SyncRowRecord,
  type PersonalizedText,
} from './schemas';
```

**Schema test structure** (`shared/src/__tests__/schemas.test.ts` lines 40–78):
```typescript
describe('personalizedTextSchema', () => {
  it('accepts plain Arabic text and text containing {الاسم}', () => {
    expect(personalizedTextSchema.safeParse({ text: 'يا {الاسم}، الرب راعيك' }).success).toBe(true);
    // ...
  });

  it('rejects any brace token other than {الاسم} with an Arabic message', () => {
    const english = personalizedTextSchema.safeParse({ text: 'Hello {name}' });
    expect(english.success).toBe(false);
    if (!english.success) {
      expect(english.error.issues[0]?.message).toMatch(/[\u0600-\u06FF]/);
    }
    // ...
  });
});
```

---

### 2. Backend Config, Build & Tooling (`backend/`)

#### `backend/package.json` (config)
**Analog:** `backend/package.json` (lines 1–8) + `app/package.json` (lines 1–14, 26–30, 65–72)

**Workspace & script conventions** (`backend/package.json` lines 1–8; `app/package.json` lines 6–14, 65–72):
```json
// backend/package.json:
{
  "name": "@roi/backend",
  "private": true,
  "type": "module",
  "dependencies": {
    "@roi/shared": "workspace:*"
  }
}

// app/package.json script & drizzle/sqlite pin conventions:
  "scripts": {
    "db:generate": "drizzle-kit generate"
  },
  // dependencies:
    "@roi/shared": "workspace:*",
    "drizzle-orm": "0.45.4",
  // devDependencies:
    "better-sqlite3": "13.2.0",
    "drizzle-kit": "0.31.11",
    "typescript": "~6.0.3"
```
*Note:* Because `bunfig.toml` uses Bun's isolated linker, every runtime/peer dependency imported by `backend/src` (`zod@4.6.7`, `graphql@16.15.0`, `@as-integrations/express5@1.1.2`, `class-validator@0.15.1`, `class-transformer@0.5.1`, `reflect-metadata@0.2.2`, `better-sqlite3@13.2.0`) MUST be explicitly declared in `backend/package.json`.

#### `backend/tsconfig.json` & `backend/tsconfig.build.json` (config)
**Analog:** `tsconfig.json` (lines 1–14) & `app/tsconfig.json` (lines 1–24)
```json
// tsconfig.json:
{
  "compilerOptions": {
    "strict": true,
    "noEmit": true,
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "skipLibCheck": true,
    "noUncheckedIndexedAccess": true,
    "isolatedModules": true
  },
  "include": ["shared/src", "backend/src", "admin/src"]
}
```
*Adapter note:* Root `tsconfig.json` typechecks `backend/src`. `backend/tsconfig.build.json` extends/mirrors strict settings with `"noEmit": false`, `"emitDecoratorMetadata": true`, `"experimentalDecorators": true` for NestJS `tsc` + `esbuild` compilation.

#### `backend/vitest.config.ts` (config)
**Analog:** `vitest.config.ts` (lines 1–13)
```typescript
import { defineConfig } from 'vitest/config';

if ('bun' in process.versions) {
  throw new Error(
    'Run tests through the package scripts under real Node (e.g. `bun run test`), never with `bun --bun` or `bun test`.',
  );
}

export default defineConfig({
  test: {
    projects: ['shared', 'backend', 'admin', 'app'],
  },
});
```
*Adapter note:* `backend/vitest.config.ts` keeps the root project integration working while adding `unplugin-swc` (`swc.vite()`) so NestJS constructor DI metadata (`emitDecoratorMetadata`) works under Vitest.

#### `backend/drizzle.config.ts` (config)
**Analog:** `app/drizzle.config.ts` (lines 1–8)
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './features/db/schema.ts',
  out: './drizzle',
});
```
*Adapter note:* Omit `driver: 'expo'` for backend `better-sqlite3`, point `schema` at `'./src/db/schema.ts'`, and `out` at `'./drizzle'`.

#### `backend/scripts/build.mjs` (utility, transform)
**Analog:** `app/scripts/build-fixture.mjs` (lines 1–39)
```javascript
#!/usr/bin/env node

import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

if (process.versions.bun) {
  throw new Error(
    'build-fixture.mjs must run under real Node, not Bun (better-sqlite3 native module).',
  );
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(scriptDir, '..');
```
*Adapter note:* Follow the `fileURLToPath(import.meta.url)` + `resolve(scriptDir, '..')` path-anchoring pattern to run `tsc -p tsconfig.build.json` and `esbuild` (`bundle: true`, `platform: 'node'`, `format: 'cjs'`, `packages: 'external'`) for `dist/main.cjs` and CLI scripts.

---

### 3. Backend Database, Services, Scripts & Fixtures (`backend/`)

#### `backend/seed/initial-content.json` (config / fixture, batch)
**Analog:** `shared/src/fixtures.ts` (lines 1–63)
```typescript
export interface TortureFixture {
  readonly id: string;
  readonly ref: string;
  readonly text: string;
}

export const TORTURE_FIXTURES: readonly TortureFixture[] = [
  {
    id: 'ps23-1',
    ref: 'مزمور ٢٣: ١',
    text: 'اَلرَّبُّ رَاعِيَّ فَلاَ يُعْوِزُنِي شَيْءٌ.',
  },
  // ...
  {
    id: 'token',
    ref: 'تخصيص',
    text: '\u200Fيَا {الاسم}، الرَّبُّ مَعَكَ\u200F',
  },
  // ...
] as const;
```
*Adapter note:* Seed fixture JSON embeds the `TORTURE_FIXTURES` verses (preserving `ps23-1`, `token` with `{الاسم}`, diacritics, etc.) alongside sample `names_of_god` and `blessings` items valid against `@roi/shared` schemas.

#### `backend/src/config/env.ts` (config / validation, transform)
**Analog:** `app/constants/app.ts` (lines 28–33) + `shared/src/schemas.ts` (lines 14–22)
```typescript
// app/constants/app.ts:
export const GOOGLE_OAUTH = {
  webClientId:
    '23662840492-h4j3v57k9dpm0suqa61qpkv7qh78qq9v.apps.googleusercontent.com',
  iosClientId:
    '23662840492-laqcbt3hkft72a3mu0ofcokeskr7sr7a.apps.googleusercontent.com',
} as const;
```
*Adapter note:* Parse `process.env` through a Zod schema (mirroring `shared/src/schemas.ts` pattern) with defaults/overrides for `PORT`, `NODE_ENV`, `DATA_DIR`, `ADMIN_ORIGINS`, and `GOOGLE_CLIENT_IDS` (defaulting to the `roi-app-515721` `webClientId` and `iosClientId` from `app/constants/app.ts`).

#### `backend/src/db/schema.ts` (model, CRUD)
**Analog:** `app/features/db/schema.ts` (lines 1–68)
```typescript
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import { GRATITUDE_ID_PREFIX, SYNC_COLUMNS } from '../../constants/db';

const [ID_COL, CREATED_AT_COL, UPDATED_AT_COL, DELETED_AT_COL] = SYNC_COLUMNS;

/** Standard sync columns required on every user-data and event table (epoch ms UTC). */
export const syncCols = () => ({
  id: text(ID_COL).primaryKey(),
  createdAt: integer(CREATED_AT_COL).notNull(),
  updatedAt: integer(UPDATED_AT_COL).notNull(),
  deletedAt: integer(DELETED_AT_COL),
});
```
*Adapter note:* Reuse the `syncCols()` epoch-ms UTC pattern (`id` text PK, `created_at`, `updated_at`, `deleted_at`) for `verses`, `names_of_god`, `blessings`, and `suggestions`, adding `version: integer('version').notNull()` with an index on `version` for `contentDelta(sinceVersion)` queries, plus `content_meta` (singleton `content_version`) and `audit_log` tables.

#### `backend/src/db/client.ts` (service, file-I/O)
**Analog:** `app/features/db/client.ts` (lines 1–18) + `app/features/db/__tests__/migrate.test.ts` (lines 9–12, 38–42)
```typescript
// app/features/db/client.ts:
const expoDb = openDatabaseSync(DB_NAME);
expoDb.execSync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

export const db = drizzle(expoDb, { schema });

// app/features/db/__tests__/migrate.test.ts:
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
// ...
const sqlite = new Database(tempDbPath);
const db = drizzle(sqlite, { schema });
migrate(db, { migrationsFolder: DRIZZLE_DIR });
```
*Adapter note:* Open `better-sqlite3` on `DATA_DIR/roi-content.sqlite`, set `sqlite.pragma('journal_mode = WAL')`, `sqlite.pragma('busy_timeout = 5000')`, `sqlite.pragma('foreign_keys = ON')`, wrap with `drizzle(sqlite, { schema })`, and call `migrate(db, { migrationsFolder })` on boot.

#### `backend/src/content/content.service.ts` & `backend/src/suggestions/suggestions.service.ts` (service, CRUD)
**Analog:** `app/features/db/events.ts` (lines 1–23, 34–53, 130–139) + `app/features/spike/rows.tsx` (lines 84–96)
```typescript
// app/features/db/events.ts (Drizzle count + insert pattern):
import { and, count, eq, isNull } from 'drizzle-orm';
// ...
export function prayedCount(db: SyncDatabase, prayerId: string): number {
  const rows = db
    .select({ total: count() })
    .from(prayerEvents)
    .where(
      and(eq(prayerEvents.prayerId, prayerId), isNull(prayerEvents.deletedAt)),
    )
    .all();
  return rows[0]?.total ?? 0;
}

// app/features/spike/rows.tsx (idempotent upsert pattern):
  db.insert(settings)
    .values({
      id: SQLITE_PROBE_ID,
      value,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: { value, updatedAt: now, deletedAt: null },
    })
    .run();
```
*Adapter note:*
- `content.service.ts`: Queries `gt(table.version, sinceVersion)` ordered by `version` for deltas (including `deletedAt !== null` tombstones), and performs content writes inside `sqlite.transaction(...)` / `db.transaction(...)` bumping `content_meta.content_version` and inserting `audit_log`.
- `suggestions.service.ts`: Mirrors `prayedCount` using `select({ total: count() }).from(suggestions).where(and(eq(suggestions.googleSub, sub), gte(suggestions.createdAt, dayStartMs)))` to enforce the `10/day` quota (`D-11`) before inserting `pending` suggestion rows with `uuidv7()`.

#### `backend/src/content/snapshot.service.ts` (service, file-I/O)
**Analog:** `app/scripts/build-fixture.mjs` (lines 40–42, 202–205)
```javascript
const tempDir = mkdtempSync(join(tmpdir(), 'roi-fixture-'));
const tempFile = join(tempDir, `${version}.sqlite`);
// ... write and verify ...
  mkdirSync(fixturesDir, { recursive: true });
  copyFileSync(tempFile, fixturePath);
```
*Adapter note:* Write gzipped snapshot (`zlib.gzipSync(Buffer.from(JSON.stringify(envelope)))`) to `<snapshot>.json.gz.tmp` inside `DATA_DIR/snapshots/` (same filesystem for atomic `renameSync`) and then swap the in-memory `Map<ContentType, { buffer: Buffer; etag: string; contentVersion: number }>` cache.

#### `backend/src/common/zod-validation.pipe.ts` (middleware, transform)
**Analog:** `shared/src/schemas.ts` (lines 22–36) & `shared/src/__tests__/schemas.test.ts` (lines 54–59)
*Pattern:* Call `this.schema.safeParse(value)`; on `!result.success`, throw NestJS `BadRequestException` preserving Zod Arabic issue messages.

#### `backend/src/scripts/seed.ts`, `backup.ts`, `restore.ts` (utility, batch / file-I/O)
**Analogs:** `app/scripts/build-fixture.mjs` (lines 1–48, 199–206) & `app/features/db/__tests__/migrate.test.ts` (lines 34–38, 78, 84–87)
```javascript
// app/scripts/build-fixture.mjs (SQLite CLI + cleanup):
const scriptDir = dirname(fileURLToPath(import.meta.url));
// ...
  sqlite.exec('VACUUM');
  sqlite.close();

// app/features/db/__tests__/migrate.test.ts (integrity check):
expect(sqlite.pragma('integrity_check', { simple: true })).toBe('ok');
```
*Adapter note:*
- `seed.ts`: Parses `--file` / `--dry-run` CLI args, validates JSON against `@roi/shared` schemas, diffs against DB, and in non-dry-run mode executes transactional upsert + `audit_log` + snapshot rebuild.
- `backup.ts`: Executes `VACUUM INTO '${escapedTarget}'` on live WAL DB, opens backup readonly, checks `pragma('integrity_check', { simple: true }) === 'ok'`.
- `restore.ts`: Verifies source backup `integrity_check === 'ok'`, copies to target DB path, and deletes stale `-wal` and `-shm` files before closing.

#### `backend/src/__tests__/*.test.ts` (test)
**Analogs:** `backend/src/__tests__/shared.test.ts` (lines 1–78) & `app/features/db/__tests__/events.test.ts` (lines 21–51, 122–125)
```typescript
// app/features/db/__tests__/events.test.ts:
function openMigratedMemoryDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { sqlite, db };
}
```
*Pattern:* Use `describe`/`it`/`expect` from `vitest`, in-memory or `mkdtempSync` SQLite databases with `migrate()`, and `finally { sqlite.close(); rmSync(...); }` cleanup.

---

### 4. Mobile App Config, DB & Sync Logic (`app/`)

#### `app/constants/app.ts` & `app/constants/sync.ts` & `app/constants/telemetry.ts` (config)
**Analogs:** `app/constants/app.ts` (lines 23–33), `app/constants/db.ts` (lines 1–13), `app/constants/telemetry.ts` (lines 11–21)
```typescript
// app/constants/app.ts:
export const DEV_TOOLS_ENABLED =
  __DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === '1';

export const GOOGLE_OAUTH = {
  webClientId:
    '23662840492-h4j3v57k9dpm0suqa61qpkv7qh78qq9v.apps.googleusercontent.com',
  iosClientId:
    '23662840492-laqcbt3hkft72a3mu0ofcokeskr7sr7a.apps.googleusercontent.com',
} as const;

// app/constants/telemetry.ts:
export const ALLOWED_EVENTS = [
  'spike_test',
  'onboarding_completed',
  'first_win_reached',
  'review_session_completed',
  'prayer_logged',
  'gratitude_saved',
  'drive_backup_connected',
] as const;
```
*Adapter note:*
- Add `API_BASE_URL` in `app/constants/app.ts` via `process.env.EXPO_PUBLIC_API_BASE_URL` (env-var configured per `D-06`).
- Create `app/constants/sync.ts` following `app/constants/db.ts` (`as const` tuples/records for `CONTENT_STAGES = ['verses', 'names_of_god', 'blessings']`, `DELTA_SYNC_THROTTLE_MS = 6 * 60 * 60 * 1000`, staging dir/manifest filenames).
- If adding download lifecycle telemetry events (`first_download_started`, `first_download_completed`), add parameterless keys to `ALLOWED_EVENTS` matching `/^[a-z][a-z0-9_]{0,39}$/` (`app/services/__tests__/telemetry.test.ts` lines 81–92).

#### `app/features/db/schema.ts` (model, CRUD)
**Analog:** `app/features/db/schema.ts` (lines 7–27, 41–47)
```typescript
/** Standard sync columns required on every user-data and event table (epoch ms UTC). */
export const syncCols = () => ({
  id: text(ID_COL).primaryKey(),
  createdAt: integer(CREATED_AT_COL).notNull(),
  updatedAt: integer(UPDATED_AT_COL).notNull(),
  deletedAt: integer(DELETED_AT_COL),
});
```
*Critical guard (`app/features/db/__tests__/schema.test.ts` lines 45–67):* **Every** `sqliteTable` exported from `app/features/db/schema.ts` (`verses`, `namesOfGod`, `blessings`, AND `syncMeta`) **MUST** spread `...syncCols()`. Do not omit `syncCols()` on `syncMeta` or `schema.test.ts` will fail.

#### `app/features/db/__tests__/migrate.test.ts` & `app/features/db/__tests__/schema.test.ts` (test / migration)
**Analogs:** `app/features/db/__tests__/schema.test.ts` (lines 41–43), `app/features/db/__tests__/migrate.test.ts` (lines 31, 91–113), `app/scripts/build-fixture.mjs` (lines 1–206)
```typescript
// app/features/db/__tests__/migrate.test.ts:
  it.each(['v1'])(
    'migrates copied fixture %s to latest while keeping all rows, tombstones, and events intact',
    ...
  );
  // ...
      expect(tableRows.map((r) => r.name)).toEqual([
        'gratitude_lines',
        'mem_verses',
        'prayer_events',
        'prayers',
        'review_events',
        'settings',
      ]);
```
*Adapter note:* After running `drizzle-kit generate` in `app/`, update `schema.test.ts` table count assertion (`>= 10`), update `migrate.test.ts` alphabetical table list to include `blessings`, `names_of_god`, `sync_meta`, `verses`, and optionally generate/commit `v2.sqlite` via `app/scripts/build-fixture.mjs` while keeping `'v1'` in `it.each(['v1', 'v2'])` so v1 → v2 migration is continuously tested.

#### `app/features/sync/staging.ts` (service, file-I/O)
**Analog:** `app/services/storage.ts` (lines 11–54)
```typescript
// app/services/storage.ts (typed read/write encapsulation):
export function getScriptureStep(fallback = 2): number {
  const stored = storage.getNumber(STORAGE_KEYS.SCRIPTURE_STEP);
  if (stored === undefined || !Number.isInteger(stored) || stored < 0 || stored > 4) {
    return fallback;
  }
  return stored;
}
```
*Adapter note:* Expose typed functions (`readManifest`, `writeStageSnapshot`, `readStagedSnapshots`, `clearStaging`) backed by `expo-file-system` `Directory(Paths.document, 'content-staging')` and `File` — never SQLite `db.delete()`.

#### `app/features/sync/first-download.ts` & `app/features/sync/delta-sync.ts` (service, batch / CRUD)
**Analogs:** `app/features/db/events.ts` (lines 15–23) & `app/features/spike/rows.tsx` (lines 84–96, 171–187)
```typescript
// app/features/db/events.ts (injectable SyncDatabase + Clock for Vitest + Expo):
export interface Clock {
  now: () => number;
  rand: (n: number) => Uint8Array;
}

export type SyncDatabase = BaseSQLiteDatabase<'sync', unknown, typeof schema>;

// app/features/spike/rows.tsx (idempotent Drizzle upsert):
  db.insert(settings)
    .values({
      id: SETTINGS_KEYS.SPIKE_WIDGET,
      value: String(nextCount),
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: {
        value: String(nextCount),
        updatedAt: now,
        deletedAt: null,
      },
    })
    .run();
```
*Adapter note:* Accept `db: SyncDatabase` (or `BaseSQLiteDatabase`) and `clock: Clock` so both `expo-sqlite` in the app and `better-sqlite3` in Vitest execute the exact atomic `db.transaction((tx) => { ... })` logic. Never call `db.delete(...)` or `tx.delete(...)` (`schema.test.ts` lines 83–97); use `.onConflictDoUpdate` setting `deletedAt` from server tombstones.

---

### 5. Mobile UI Components, Routes & Localization (`app/`)

#### `app/features/sync/ContentGate.tsx` & `app/app/_layout.tsx` (component, event-driven)
**Analogs:** `app/app/_layout.tsx` (lines 23–56) & `app/app/(dev)/_layout.tsx` (lines 5–11) & `app/components/ui/native-only-animated-view.tsx` (lines 15–29)
```tsx
// app/app/_layout.tsx:
export default function RootLayout() {
  const { success, error } = useMigrations(db, migrations);
  // ...
  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Text className="text-center text-base text-foreground">
          {ar.migrationError}
        </Text>
      </View>
    );
  }

  if (!success) {
    return <View className="flex-1 bg-background" />;
  }

  return (
    <ScriptureSizeProvider>
      <Stack screenOptions={{ headerShown: false }} />
      <PortalHost />
    </ScriptureSizeProvider>
  );
}

// app/app/(dev)/_layout.tsx:
export default function DevLayout() {
  if (!DEV_TOOLS_ENABLED) {
    return <Redirect href={ROUTES.home} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
```
*Adapter note:* Place `<ContentGate>` inside `<ScriptureSizeProvider>` (after `useMigrations` succeeds) in `app/app/_layout.tsx`. Inside `ContentGate`, use `useSegments()` from `expo-router` so when `DEV_TOOLS_ENABLED && segments[0] === '(dev)'`, children (`<Stack />`) pass straight through without blocking `roi://spike` or `roi://torture` (`D-13`, `02-RESEARCH.md` Pitfall 7). For the progress bar fill animation, use Reanimated with `ReduceMotion.System` and logical `start` alignment (never `left-0` or `tracking-*`).

#### `app/features/sync/LibraryReadyView.tsx` & `app/app/index.tsx` (component, CRUD read-only)
**Analog:** `app/app/index.tsx` (lines 54–138)
```tsx
// app/app/index.tsx (theme switcher & dev links preserved in LibraryReadyView):
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={ar.themeLabel}
        className="mt-6 flex-row items-center gap-2 rounded-2xl border border-border bg-card p-1.5"
      >
        {THEME_OPTIONS.map((option) => {
          const isSelected = theme === option;
          const label = THEME_LABELS[option];
          return (
            <Pressable
              key={option}
              onPress={() => setTheme(option)}
              accessibilityRole="radio"
              accessibilityLabel={label}
              accessibilityState={{ checked: isSelected }}
              className={`min-h-[44px] min-w-[44px] items-center justify-center rounded-xl px-4 py-2.5 ${
                isSelected ? 'bg-primary' : 'bg-transparent'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  isSelected ? 'text-primary-foreground' : 'text-foreground'
                }`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {DEV_TOOLS_ENABLED ? (
        <View className="mt-6 flex-row gap-3">
          <Link href={ROUTES.torture} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={ar.tortureLink}
              className="min-h-[44px] items-center justify-center rounded-xl border border-border bg-card px-5 py-2.5"
            >
              <Text className="text-sm font-medium text-foreground">
                {ar.tortureLink}
              </Text>
            </Pressable>
          </Link>
          ...
        </View>
      ) : null}
```
*UI-SPEC alignment:* Use `@/components/ui/text` (`Text`), `@/components/ui/icon` (`Icon` with `WifiOff`, `CheckCircle2`), `MAX_FONT_SIZE_MULTIPLIER` (`1.3`) from `@/constants/theme` on large headings, `toArabicDigits()` from `@roi/shared` for all counts, `min-h-[44px] min-w-[44px]` touch targets, and warm paper semantic tokens (`bg-background`, `bg-card`, `bg-muted`, `bg-accent`, `bg-primary`, `text-destructive`).

#### `app/locales/ar.json` (config)
**Analog:** `app/locales/ar.json` (lines 1–33)
*Pattern:* Flat camelCase JSON keys consumed via `import ar from '@/locales/ar.json'`, holding exact Egyptian Arabic strings from `02-UI-SPEC.md` Copywriting Contract.

#### `app/features/sync/__tests__/*.test.ts` (test)
**Analogs:** `app/features/db/__tests__/events.test.ts` (lines 1–47) & `app/features/spike/__tests__/runner.test.ts` (lines 1–32, 53–76)
*Pattern:* Use `openMigratedMemoryDb()` with `better-sqlite3` + `drizzle-orm/better-sqlite3/migrator` for transactional download & delta-sync tombstone tests, and `vi.useFakeTimers()` / mocked fetch+staging interfaces for resumability and 6-hour throttle tests.

---

## Shared Patterns

### 1. RTL & Static Repository Guards (App-Wide)
**Source:** `app/__tests__/guards.test.ts` (lines 46–77, 111–158)
**Apply to:** All new/modified files in `app/` and `shared/src/`
```typescript
// app/__tests__/guards.test.ts:
// Lines 65-66: Forbidden physical-direction & tracking classes in app/
const forbiddenClassPattern =
  /(?:^|[\s'"`])(ml-|mr-|pl-|pr-|left-|right-|text-left\b|text-right\b|border-l-|border-r-|tracking-)/;

// Lines 112-113: Forbidden Node/Expo/RN imports in shared/src/
const forbiddenImport =
  /(?:from\s+['"]|require\(\s*['"]|import\(\s*['"])(node:|expo(?:-|\b)|react-native(?:-|\/|\b))/;

// Lines 146-152: Forbidden auth/telemetry/scaling attributes in app/
/\bofflineAccess\b/.test(content) ||
/\bserverAuthCode\b/.test(content) ||
/\bsetUserId\b/.test(content) ||
/\bsetUserProperty\b/.test(content) ||
/allowFontScaling\s*=\s*\{\s*false\s*\}/.test(content)
```

### 2. SQLite Soft-Delete & `syncCols()` Invariant (Mobile DB)
**Source:** `app/features/db/__tests__/schema.test.ts` (lines 45–67, 83–97)
**Apply to:** `app/features/db/schema.ts` and all files in `app/features/sync/`
```typescript
// Every exported SQLiteTable MUST have id (text PK), created_at (notNull), updated_at (notNull), deleted_at (nullable).
// Hard deletes via Drizzle are forbidden anywhere in app/, features/, services/, hooks/:
const hardDeletePattern = /\b(?:db|tx)\s*\.\s*delete\s*\(/;
```

### 3. Privacy & Telemetry Choke Point
**Source:** `app/services/telemetry.ts` (lines 48–54) & `app/services/__tests__/telemetry.test.ts` (lines 81–106)
**Apply to:** Any telemetry calls in `app/features/sync/`
```typescript
// app/services/telemetry.ts:
export function track(name: AllowedEvent): void {
  logEvent(getAnalytics(), name);
}

export function reportError(code: ErrorCode): void {
  recordError(getCrashlytics(), new Error(code));
}
```
Never pass parameter objects to `track()`, never import `@react-native-firebase/*` outside `app/services/telemetry.ts` (`guards.test.ts` lines 47–62), and never send personal user data off-device (`D-10`).

### 4. Reanimated Motion & Typography Tokens
**Source:** `app/constants/theme.ts` (lines 39–41) & `app/features/scripture/scripture.tsx` (lines 131–145)
**Apply to:** `app/features/sync/ContentGate.tsx`, `app/features/sync/LibraryReadyView.tsx`
```tsx
// app/constants/theme.ts:
export const MAX_FONT_SIZE_MULTIPLIER = 1.3;
export const MIN_TOUCH = 44;

// app/features/scripture/scripture.tsx:
<Text
  maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
  ...
/>
```

### 5. Deterministic Dependency Injection for SQLite + Clock
**Source:** `app/features/db/events.ts` (lines 15–23) & `app/features/db/client.ts` (lines 14–18)
**Apply to:** `app/features/sync/first-download.ts`, `app/features/sync/delta-sync.ts`, `backend/src/content/content.service.ts`, `backend/src/suggestions/suggestions.service.ts`
```typescript
export interface Clock {
  now: () => number;
  rand: (n: number) => Uint8Array;
}
```

---

## No Analog Found

`backend/` currently contains only a workspace shell (`backend/package.json` and `backend/src/__tests__/shared.test.ts`), and `app/` has not yet implemented network/GraphQL fetching. For the following files, the planner should follow the verified library patterns and code examples in `02-RESEARCH.md`:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend/Dockerfile` | config / container | — | First Docker multi-stage build in repo (`node:24-slim` + `bun` + `tsc`/`esbuild` + non-root user) |
| `backend/src/main.ts` | config | request-response | First NestJS Express bootstrap (`trust proxy`, `helmet`, `ADMIN_ORIGINS` CORS, `100kb` JSON limit, shutdown hooks) |
| `backend/src/app.module.ts` | config / provider | — | First NestJS root module (`ConfigModule`, `ThrottlerModule`, `GraphQLModule` with `ApolloDriver` + `ApolloArmor` + `!isProd` introspection/graphiql) |
| `backend/src/db/drizzle.module.ts` | provider | — | First NestJS `@Global()` DI provider module |
| `backend/src/common/gql-throttler.guard.ts` | middleware | request-response | First NestJS GraphQL guard overriding `ThrottlerGuard.getRequestResponse` via `GqlExecutionContext` |
| `backend/src/common/google-auth.guard.ts` | middleware | request-response | First backend Google ID token verifier (`google-auth-library` `OAuth2Client.verifyIdToken` against `roi-app-515721` client IDs) |
| `backend/src/content/snapshot.controller.ts` | controller | request-response | First Express static/raw gzip response controller (`req.acceptsEncodings('gzip')` + `zlib.gunzipSync` fallback, `ETag`, `X-Content-Version`) |
| `backend/src/content/content.resolver.ts` | controller | request-response | First NestJS `@Resolver` GraphQL query (`contentDelta(sinceVersion)`) |
| `backend/src/suggestions/suggestions.resolver.ts` | controller | request-response | First NestJS `@Resolver` GraphQL mutation (`submitSuggestion` with `GoogleAuthGuard` + `ZodValidationPipe`) |
| `backend/src/health/health.controller.ts` | controller | request-response | First NestJS `/health` readiness controller (`@SkipThrottle()`) |
| `app/features/sync/api.ts` | service | request-response | First HTTP snapshot & `graphql-request` client in `app/` (must NOT pass manual `Accept-Encoding: gzip` header per `02-RESEARCH.md` Pitfall 4) |

---

## Metadata

**Analog search scope:** `shared/src/`, `backend/`, `app/` (`app/features/db/`, `app/features/spike/`, `app/features/scripture/`, `app/app/`, `app/components/ui/`, `app/constants/`, `app/services/`, `app/hooks/`, `app/locales/`, `app/scripts/`, `app/__tests__/`)
**Files scanned:** 37 tracked source/config/test files
**Pattern extraction date:** 2026-11-25
