# Phase 3: Admin Panel & Moderation - Pattern Map

**Mapped:** 2026-11-25
**Files analyzed:** 48
**Analogs found:** 39 / 48 (remaining 9 are new web/Tiptap SPA modules covered by `03-RESEARCH.md` & `03-UI-SPEC.md`)

---

## File Classification

### Root & Workspace Config (Modified)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `tsconfig.json` | config | build-config | `tsconfig.json` + `app/tsconfig.json` | exact |
| `package.json` | config | build-config | `package.json` | exact |

### Backend (`backend/` — Created & Modified)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/package.json` | config | dependency-manifest | `backend/package.json` | exact |
| `backend/Dockerfile` | config | container-build | `backend/Dockerfile` | exact |
| `backend/drizzle/0001_admin_suggestions_note.sql` | migration | schema-ddl | `backend/drizzle/0000_supreme_prowler.sql` | exact |
| `backend/src/db/schema.ts` | model | schema-definition | `backend/src/db/schema.ts` | exact |
| `backend/src/config/env.ts` | config | validation | `backend/src/config/env.ts` | exact |
| `backend/src/config/paths.ts` | utility | path-resolution | `backend/src/config/paths.ts` | exact |
| `backend/src/main.ts` | config | request-response | `backend/src/main.ts` | exact |
| `backend/src/app.module.ts` | module | di-wiring | `backend/src/app.module.ts` | exact |
| `backend/src/admin-auth/admin-auth.module.ts` | module | di-wiring | `backend/src/db/drizzle.module.ts` | role-match |
| `backend/src/admin-auth/admin-auth.service.ts` | service | request-response | `backend/src/common/google-auth.guard.ts` | role-match |
| `backend/src/admin-auth/admin-auth.guard.ts` | middleware | request-response | `backend/src/common/google-auth.guard.ts` + `backend/src/common/gql-throttler.guard.ts` | exact |
| `backend/src/admin-auth/admin-auth.resolver.ts` | controller | request-response | `backend/src/suggestions/suggestions.resolver.ts` | exact |
| `backend/src/admin-content/admin-content.module.ts` | module | di-wiring | `backend/src/db/drizzle.module.ts` | role-match |
| `backend/src/admin-content/admin-content.service.ts` | service | CRUD | `backend/src/content/content.service.ts` | exact |
| `backend/src/admin-content/admin-content.resolver.ts` | controller | CRUD | `backend/src/suggestions/suggestions.resolver.ts` + `backend/src/content/content.resolver.ts` | exact |
| `backend/src/admin-moderation/admin-moderation.module.ts` | module | di-wiring | `backend/src/db/drizzle.module.ts` | role-match |
| `backend/src/admin-moderation/admin-moderation.service.ts` | service | CRUD | `backend/src/content/content.service.ts` + `backend/src/suggestions/suggestions.service.ts` | exact |
| `backend/src/admin-moderation/admin-moderation.resolver.ts` | controller | CRUD | `backend/src/suggestions/suggestions.resolver.ts` | exact |
| `backend/src/admin-audit/admin-audit.resolver.ts` | controller | request-response | `backend/src/content/content.resolver.ts` | exact |
| `backend/src/__tests__/admin-auth.test.ts` (+ `admin-content.test.ts`, `admin-moderation.test.ts`, `admin-static-audit.test.ts`, shared helper) | test | request-response | `backend/src/__tests__/suggestions.test.ts` + `backend/src/__tests__/hardening.test.ts` + `backend/src/__tests__/content-api.test.ts` | exact |

### Admin SPA (`admin/` — Created & Modified)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `admin/package.json` | config | dependency-manifest | `backend/package.json` + `admin/package.json` | exact |
| `admin/tsconfig.json` | config | ts-config | `app/tsconfig.json` + `tsconfig.json` | exact |
| `admin/vitest.config.ts` | config | test-config | `backend/vitest.config.ts` + `vitest.config.ts` | exact |
| `admin/vite.config.ts` | config | build-config | — | none |
| `admin/index.html` | config | html-shell | — | none |
| `admin/src/index.css` | config | styling-tokens | `app/global.css` | partial-match |
| `admin/src/main.tsx` | provider | app-bootstrap | `app/app/_layout.tsx` | partial-match |
| `admin/src/lib/utils.ts` | utility | transform | `app/lib/utils.ts` | exact |
| `admin/src/lib/graphql.ts` | service | request-response | `app/features/sync/api.ts` | exact |
| `admin/src/lib/i18n.ts` | utility | transform | `shared/src/arabic.ts` | partial-match |
| `admin/src/lib/markdown-serializer.ts` | utility | transform | — | none |
| `admin/src/lib/validation.ts` | utility | validation | `shared/src/schemas.ts` | exact |
| `admin/src/components/ui/*` (shadcn Tailwind 4 primitives) | component | presentation | `app/components/ui/dialog.tsx` | partial-match |
| `admin/src/components/auth/AuthProvider.tsx` | provider | event-driven | `app/features/sync/ContentGate.tsx` | partial-match |
| `admin/src/components/auth/ReauthModal.tsx` | component | request-response | `app/components/ui/dialog.tsx` | partial-match |
| `admin/src/components/editor/NameTokenExtension.ts` | utility | transform | — | none |
| `admin/src/components/editor/NameChipView.tsx` | component | presentation | — | none |
| `admin/src/components/editor/RichContentEditor.tsx` | component | event-driven | — | none |
| `admin/src/components/editor/LivePreviewCard.tsx` | component | transform | `app/features/scripture/scripture.tsx` | partial-match |
| `admin/src/components/layout/AdminShell.tsx` | component | layout | `app/features/sync/LibraryReadyView.tsx` | partial-match |
| `admin/src/pages/LoginPage.tsx` | component | request-response | `app/features/sync/ContentGate.tsx` | partial-match |
| `admin/src/pages/CatalogPage.tsx` | component | CRUD | `app/features/sync/LibraryReadyView.tsx` | partial-match |
| `admin/src/pages/ItemEditorPage.tsx` | component | CRUD | — | none |
| `admin/src/pages/ModerationQueuePage.tsx` | component | CRUD | — | none |
| `admin/src/pages/AuditLogPage.tsx` | component | request-response | — | none |
| `admin/src/__tests__/*.test.{ts,tsx}` | test | unit / component | `admin/src/__tests__/shared.test.ts` | role-match |

---

## Pattern Assignments

### Root `tsconfig.json` & `package.json` (config, build-config)

**Analog:** `tsconfig.json`, `app/tsconfig.json`, `package.json`

**Root TS project split pattern** (`tsconfig.json` lines 1-18):
```json
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
    "isolatedModules": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "typeRoots": ["./node_modules/@types", "./backend/node_modules/@types"],
    "types": ["node"]
  },
  "include": ["shared/src", "backend/src", "admin/src"]
}
```
Remove `"admin/src"` from root `tsconfig.json#include` and give `admin/` its own `admin/tsconfig.json` (with DOM + `react-jsx` + `vite/client`), mirroring how `app/tsconfig.json` is excluded from root `tsconfig.json` and wired into `package.json#typecheck` (`package.json` line 19):
```json
"typecheck": "tsc -p tsconfig.json && tsc -p app/tsconfig.json"
```
Update to include `&& tsc -p admin/tsconfig.json`.

---

### `backend/drizzle/0001_admin_suggestions_note.sql` & `backend/src/db/schema.ts` (migration & model)

**Analog:** `backend/drizzle/0000_supreme_prowler.sql` & `backend/src/db/schema.ts`

**Drizzle SQLite table + index pattern** (`backend/src/db/schema.ts` lines 68-82):
```typescript
/** Google-authenticated user content suggestions awaiting admin moderation (D-10, D-11). */
export const suggestions = sqliteTable(
  'suggestions',
  {
    ...syncCols(),
    kind: text('kind').notNull(),
    title: text('title').notNull(),
    text: text('text').notNull(),
    textFemale: text('text_female'),
    verseRef: text('verse_ref'),
    status: text('status').notNull().default('pending'),
    googleSub: text('google_sub').notNull(),
    email: text('email').notNull(),
  },
  (t) => [index('suggestions_sub_created_idx').on(t.googleSub, t.createdAt)],
);
```

**Drizzle migration DDL pattern** (`backend/drizzle/0000_supreme_prowler.sql` lines 50-65):
```sql
CREATE TABLE `suggestions` (
	`id` text PRIMARY KEY NOT NULL,
	...
	`email` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `suggestions_sub_created_idx` ON `suggestions` (`google_sub`,`created_at`);
```
Run `bun run --cwd backend db:generate` (or author `0001_*.sql` + snapshot/journal via `drizzle-kit generate`) so `openBackendDatabase()` (`backend/src/db/client.ts` line 39: `migrate(db, { migrationsFolder })`) applies the `moderation_note` column and `suggestions_status_created_idx` automatically.

---

### `backend/src/config/env.ts` (config, validation)

**Analog:** `backend/src/config/env.ts`

**CSV parsing + optional Zod transform pattern** (`backend/src/config/env.ts` lines 12-40):
```typescript
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
```
Apply the same `parseCsvList(value).map((e) => e.toLowerCase())` pattern for `ADMIN_EMAILS` (defaulting to `[]` so existing Phase 2 tests boot without it) and add optional `ADMIN_JWT_SECRET` + `ADMIN_GOOGLE_CLIENT_ID` (with fail-closed length check in `AdminAuthService` when `NODE_ENV === 'production'`, per `03-RESEARCH.md` Pitfall 3).

---

### `backend/src/main.ts` (config, request-response / bootstrap)

**Analog:** `backend/src/main.ts`

**Express/Nest HTTP configuration pattern** (`backend/src/main.ts` lines 13-34):
```typescript
export function configureApp(app: NestExpressApplication, env: BackendEnv): void {
  const isProd = env.NODE_ENV === 'production';
  const allowedOrigins = new Set(env.ADMIN_ORIGINS);

  app.set('trust proxy', 1);
  app.use(helmet(isProd ? {} : { contentSecurityPolicy: false }));
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Allow native mobile clients and curl requests that omit Origin.
      if (!origin) {
        callback(null, true);
        return;
      }
      callback(null, allowedOrigins.has(origin));
    },
  });
  app.useBodyParser('json', { limit: '100kb' });
  app.enableShutdownHooks();
}
```
Extend `configureApp()` in-place:
- Mount `app.use(cookieParser())`.
- Update `helmet(...)` in `isProd` to allow Google Identity Services (`accounts.google.com/gsi/client`, `frameSrc`, `connectSrc`, `styleSrc 'unsafe-inline'`, `https://*.googleusercontent.com`) while still emitting `content-security-policy` (`hardening.test.ts:75`).
- Add `credentials: true` and `allowedHeaders: ['Content-Type', 'Authorization', 'X-Roi-Admin', 'Apollo-Require-Preflight']` to `app.enableCors(...)` for local Vite dev (`ADMIN_ORIGINS`).
- Mount `/admin` `express.static` + Express 5 named splat `httpAdapter.get('/admin/{*splat}', ...)` SPA fallback (using `resolveAdminDistDir()`).

---

### `backend/src/admin-auth/admin-auth.service.ts` & `backend/src/admin-auth/admin-auth.guard.ts` (service & guard, request-response)

**Analog:** `backend/src/common/google-auth.guard.ts` & `backend/src/common/gql-throttler.guard.ts`

**DI & `OAuth2Client` token verification pattern** (`backend/src/common/google-auth.guard.ts` lines 14-97):
```typescript
export const GOOGLE_OAUTH_CLIENT = Symbol('GOOGLE_OAUTH_CLIENT');

export interface GoogleTokenVerifier {
  verifyIdToken(options: {
    idToken: string;
    audience: string | string[];
  }): Promise<{
    getPayload():
      | {
          sub?: string;
          email?: string;
          email_verified?: boolean;
        }
      | undefined;
  }>;
}

@Injectable()
export class GoogleAuthGuard implements CanActivate {
  private readonly oauthClient: GoogleTokenVerifier;

  constructor(
    @Inject(BACKEND_ENV) private readonly env: BackendEnv,
    @Optional()
    @Inject(GOOGLE_OAUTH_CLIENT)
    oauthClient?: GoogleTokenVerifier,
  ) {
    this.oauthClient = oauthClient ?? new OAuth2Client();
  }
  ...
    let payload: { sub?: string; email?: string; email_verified?: boolean } | undefined;
    try {
      const ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience: this.env.GOOGLE_CLIENT_IDS,
      });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('GOOGLE_TOKEN_INVALID');
    }

    if (
      !payload ||
      payload.email_verified !== true ||
      typeof payload.sub !== 'string' ||
      payload.sub.length === 0 ||
      typeof payload.email !== 'string' ||
      payload.email.length === 0
    ) {
      throw new UnauthorizedException('GOOGLE_TOKEN_INVALID');
    }
```
Notice how `GOOGLE_OAUTH_CLIENT` is already provided in `AppModule` (`backend/src/app.module.ts` lines 103-106) and overridden in `suggestions.test.ts:63-64`! Reusing `@Optional() @Inject(GOOGLE_OAUTH_CLIENT)` in `AdminAuthService` lets Nest integration tests stub Google ID token verification with the exact same `createStubVerifier()` pattern.

**GraphQL `ExecutionContext` extraction pattern** (`backend/src/common/google-auth.guard.ts` lines 99-106):
```typescript
  private extractRequest(context: ExecutionContext): GoogleAuthenticatedRequest {
    if (context.getType<string>() === 'graphql') {
      return GqlExecutionContext.create(context).getContext<{
        req: GoogleAuthenticatedRequest;
      }>().req;
    }
    return context.switchToHttp().getRequest<GoogleAuthenticatedRequest>();
  }
```
Copy this for `AdminAuthGuard` to read `req.headers?.['x-roi-admin']` (CSRF check → `ForbiddenException`) and `req.cookies?.roi_admin_session` (session JWT check → `UnauthorizedException`), attaching `req.adminUser`.

---

### `backend/src/admin-auth/admin-auth.resolver.ts` (controller/resolver, request-response)

**Analog:** `backend/src/suggestions/suggestions.resolver.ts`

**Resolver + GraphQL Context + ZodValidationPipe pattern** (`backend/src/suggestions/suggestions.resolver.ts` lines 1-78):
```typescript
@Resolver()
export class SuggestionsResolver {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  @UseGuards(GoogleAuthGuard)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Mutation(() => SuggestionReceiptDto)
  submitSuggestion(
    @Args('input', new ZodValidationPipe(submitSuggestionInputSchema))
    input: SubmitSuggestionInput,
    @Context() ctx: { req: GoogleAuthenticatedRequest },
  ): SuggestionReceiptDto {
    const googleUser = ctx.req.googleUser;
    if (!googleUser) {
      throw new UnauthorizedException('GOOGLE_TOKEN_REQUIRED');
    }
    return this.suggestionsService.submitSuggestion(googleUser, input);
  }
}
```
And `AppModule` (`backend/src/app.module.ts` line 87) already passes `{ req, res }` into GraphQL context:
```typescript
context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
```
So `adminLogin` and `adminLogout` in `AdminAuthResolver` can type `@Context() ctx: { req: AdminRequest; res: Response }` to call `res.cookie(...)` and `res.clearCookie(...)`.

---

### `backend/src/admin-content/admin-content.service.ts` (service, CRUD)

**Analog:** `backend/src/content/content.service.ts`

**Transactional mutation + version bump + audit log + snapshot rebuild pattern** (`backend/src/content/content.service.ts` lines 131-184):
```typescript
  applyContentMutation<TResult>(options: ApplyContentMutationOptions<TResult>): {
    contentVersion: number;
    result: TResult;
  } {
    const nowMs = options.nowMs ?? Date.now();

    const executeTx = this.sqlite.transaction(() => {
      const nextVersion = this.getCurrentVersion() + 1;

      this.db
        .insert(contentMeta)
        .values({
          id: CONTENT_META_SINGLETON_ID,
          contentVersion: nextVersion,
          updatedAt: nowMs,
        })
        .onConflictDoUpdate({
          target: contentMeta.id,
          set: {
            contentVersion: nextVersion,
            updatedAt: nowMs,
          },
        })
        .run();

      const result = options.mutate({
        db: this.db,
        nextVersion,
        nowMs,
      });

      const summary = options.summarize ? options.summarize(result) : {};
      this.db
        .insert(auditLog)
        .values({
          id: uuidv7(nowMs, randomBytes),
          actorEmail: options.actorEmail,
          action: options.action,
          entityType: options.entityType,
          entityId: options.entityId,
          contentVersion: nextVersion,
          summaryJson: JSON.stringify(summary),
          createdAt: nowMs,
        })
        .run();

      return { contentVersion: nextVersion, result };
    });

    // IMMEDIATE takes the write lock up front so the version read-then-write cannot race another process.
    const txOut = executeTx.immediate();
    this.snapshotService.refreshCache(nowMs);
    return txOut;
  }
```
Every create/update/softDelete/restore in `AdminContentService` (and `acceptSuggestion` in `AdminModerationService`) MUST delegate to `this.contentService.applyContentMutation(...)` rather than duplicating transaction, `contentMeta`, `auditLog`, or `SnapshotService.refreshCache()` logic.

**Row mapping pattern** (`backend/src/content/content.service.ts` lines 60-116):
Reuses `parseTagsJson(row.tagsJson)` from `backend/src/content/snapshot-builder.ts` and returns DTO shapes matching `VerseDto`, `NameOfGodDto`, `BlessingDto` (`backend/src/content/content.resolver.ts` lines 8-108).

---

### `backend/src/admin-moderation/admin-moderation.service.ts` (service, CRUD)

**Analog:** `backend/src/content/content.service.ts` + `backend/src/suggestions/suggestions.service.ts`

**SQLite `transaction().immediate()` + conditional update pattern** (`backend/src/suggestions/suggestions.service.ts` lines 43-91 & `backend/src/content/content.service.ts` lines 137-183):
```typescript
    const executeTx = this.sqlite.transaction((): SuggestionReceipt => {
      const countRows = this.db
        .select({ total: count() })
        .from(suggestions)
        .where(
          and(
            eq(suggestions.googleSub, user.googleSub),
            gte(suggestions.createdAt, dayStartMs),
          ),
        )
        .all();
      ...
    });
```
- `acceptSuggestion`: runs inside `this.contentService.applyContentMutation(...)`. Inside `mutate({ db, nextVersion, nowMs })`, executes conditional `db.update(suggestions).set({ status: 'accepted', updatedAt: nowMs }).where(and(eq(suggestions.id, id), eq(suggestions.status, 'pending'))).run()` and throws `ConflictException('SUGGESTION_ALREADY_MODERATED')` if `changes !== 1` (rolling back `contentMeta` + `auditLog`), then inserts into `verses` / `namesOfGod` / `blessings` with `version: nextVersion`.
- `rejectSuggestion`: runs its own `this.sqlite.transaction(...).immediate()` updating `status = 'rejected'`, `moderationNote`, `updatedAt` guarded by `and(eq(suggestions.id, id), eq(suggestions.status, 'pending'))` (`changes !== 1` → `ConflictException`), and writes an `auditLog` row at `this.contentService.getCurrentVersion()` without refreshing snapshots.

---

### `backend/src/admin-content/admin-content.resolver.ts`, `admin-moderation.resolver.ts`, `admin-audit.resolver.ts` (controllers/resolvers)

**Analog:** `backend/src/content/content.resolver.ts` + `backend/src/suggestions/suggestions.resolver.ts`

**GraphQL DTO & `@UseGuards` + `ZodValidationPipe` pattern** (`backend/src/content/content.resolver.ts` lines 8-135 & `backend/src/suggestions/suggestions.resolver.ts` lines 27-78):
- Reuse `VerseDto`, `NameOfGodDto`, `BlessingDto` from `backend/src/content/content.resolver.ts` rather than redefining duplicate DTOs.
- Apply `@UseGuards(AdminAuthGuard)` at class or method level on all admin queries/mutations (`adminVerses`, `adminNamesOfGod`, `adminBlessings`, `createVerse`, `updateVerse`, `softDeleteContent`, `restoreContent`, `adminSuggestions`, `acceptSuggestion`, `rejectSuggestion`, `adminAuditLogs`).
- Validate every input `@Args('input', new ZodValidationPipe(schema))` using `@roi/shared` `personalizedTextSchema` and content schemas (`ZodValidationPipe` at `backend/src/common/zod-validation.pipe.ts` lines 8-22).

---

### `backend/src/__tests__/admin-*.test.ts` (test, request-response)

**Analog:** `backend/src/__tests__/suggestions.test.ts`, `backend/src/__tests__/hardening.test.ts`, `backend/src/__tests__/content-api.test.ts`

**NestJS TestingModule + `OAuth2Client` stub + `configureApp` + `supertest` pattern** (`backend/src/__tests__/suggestions.test.ts` lines 28-72):
```typescript
function createStubVerifier(): GoogleTokenVerifier {
  return {
    async verifyIdToken({ idToken }) {
      if (idToken === 'unverified') {
        return {
          getPayload: () => ({
            sub: 'sub-unverified',
            email: 'unverified@example.com',
            email_verified: false,
          }),
        };
      }
      if (idToken.startsWith('valid:')) {
        const sub = idToken.slice('valid:'.length);
        return {
          getPayload: () => ({
            sub,
            email: `${sub}@example.com`,
            email_verified: true,
          }),
        };
      }
      throw new Error('Invalid Google ID token');
    },
  };
}

async function createTestApp(dataDir: string) {
  process.env.DATA_DIR = dataDir;
  process.env.NODE_ENV = 'test';
  const env = loadEnv(process.env);

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(GOOGLE_OAUTH_CLIENT)
    .useValue(createStubVerifier())
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  configureApp(app, env);
  await app.init();

  return { moduleRef, app };
}
```
Also copy `tempDirs` + `savedEnv` `afterEach` cleanup (`hardening.test.ts` lines 36-47) and extract cookie jar from `res.headers['set-cookie']` for authenticated `supertest` calls.

---

### `backend/Dockerfile` (config, container-build)

**Analog:** `backend/Dockerfile`

**Multi-stage isolated-linker Docker build pattern** (`backend/Dockerfile` lines 6-38):
```dockerfile
FROM bun-node AS builder
WORKDIR /app
COPY package.json bunfig.toml bun.lock tsconfig.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/
COPY admin/package.json ./admin/
COPY app/package.json ./app/
RUN bun install --frozen-lockfile
COPY shared ./shared
COPY backend ./backend
RUN bun run --cwd backend build
...
COPY --from=builder /app/backend/dist /app/backend/dist
COPY --from=builder /app/backend/drizzle /app/backend/drizzle
COPY --from=builder /app/backend/seed /app/backend/seed
```
Extend `builder` to also `COPY admin ./admin`, `RUN bun run --cwd admin build`, and `COPY --from=builder /app/admin/dist /app/admin/dist` into `runner` (or `/app/backend/admin-dist`) so `resolveAdminDistDir()` finds it in production without shipping `admin/node_modules` in the runtime image.

---

### `admin/tsconfig.json`, `admin/vitest.config.ts`, `admin/package.json` (config)

**Analog:** `app/tsconfig.json`, `backend/vitest.config.ts`, `vitest.config.ts`, `backend/package.json`

**Workspace Vitest Node-guard pattern** (`backend/vitest.config.ts` lines 1-16):
```typescript
import { defineConfig } from 'vitest/config';

if ('bun' in process.versions) {
  throw new Error(
    'Run tests through the package scripts under real Node (e.g. `bun run test`), never with `bun --bun` or `bun test`.',
  );
}
```
In `admin/vitest.config.ts`, preserve the `'bun' in process.versions` guard, add `plugins: [react()]` (`@vitejs/plugin-react`), `test: { environment: 'jsdom' }`, and `resolve: { alias: { '@': ... } }`.

**Isolated-linker manifest pattern** (`backend/package.json` lines 13-46):
Because `bunfig.toml` enforces `linker = "isolated"`, every runtime and test dependency (`react`, `react-dom`, `graphql: "16.15.0"`, `@testing-library/dom`, etc.) MUST be explicitly declared in `admin/package.json`.

---

### `admin/src/index.css` & `admin/src/lib/utils.ts` (config & utility)

**Analog:** `app/global.css` & `app/lib/utils.ts`

**Warm-paper HSL color palette tokens** (`app/global.css` lines 5-25):
```css
:root {
  --background: 43 58% 95%;
  --foreground: 33 15% 15%;
  --card: 42 46% 91%;
  --card-foreground: 33 15% 15%;
  --popover: 43 58% 95%;
  --popover-foreground: 33 15% 15%;
  --primary: 33 15% 15%;
  --primary-foreground: 43 58% 95%;
  --secondary: 40 32% 87%;
  --secondary-foreground: 33 15% 15%;
  --muted: 40 28% 88%;
  --muted-foreground: 33 10% 38%;
  --accent: 48 40% 39%;
  --accent-foreground: 43 58% 95%;
  --destructive: 4 65% 46%;
  --destructive-foreground: 43 58% 95%;
  --border: 38 24% 81%;
  --input: 38 24% 81%;
  --ring: 48 40% 39%;
}
```
Convert into Tailwind v4 `@import "tailwindcss";` + `@theme inline` / `:root` hex/HSL tokens matching `03-UI-SPEC.md` (`#FAF5EB`, `#F2EAD7`, `#E9E0CE`, `#DAD2C3`, `#8B7B3C`, `#2C2721`, `#C23329`).

**Classname helper pattern** (`app/lib/utils.ts` lines 1-6):
```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

### `admin/src/lib/graphql.ts` (service, request-response)

**Analog:** `app/features/sync/api.ts`

**`graphql-request` `GraphQLClient` + Zod parse wrapper pattern** (`app/features/sync/api.ts` lines 139-201):
```typescript
export function createSyncApiClient(
  baseUrl = API_BASE_URL,
  fetchImpl: typeof fetch = fetch,
): SyncApiClient {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const graphqlClient = new GraphQLClient(`${normalizedBaseUrl}/graphql`, {
    fetch: fetchImpl,
  });
  ...
        const result = await graphqlClient.request<
          { contentDelta: unknown },
          { sinceVersion: number }
        >({
          document: CONTENT_DELTA_QUERY,
          variables: { sinceVersion },
          signal: requestSignal,
        });
```
Adapt for `admin/src/lib/graphql.ts`: instantiate `GraphQLClient('/graphql', { credentials: 'include', headers: { 'x-roi-admin': '1' } })` and wrap `request()` with an auth interceptor that invokes the `onUnauthorized` silent GIS re-auth + modal handler and retries once on fresh login (`D-02`, `D-03`).

---

### `admin/src/lib/validation.ts` (utility, validation)

**Analog:** `shared/src/schemas.ts`

**Shared `personalizedTextSchema` + brace-rule enforcement** (`shared/src/schemas.ts` lines 7-47):
```typescript
const EMPTY_TEXT_ERROR = 'النص لا يمكن أن يكون فارغاً';
const BRACE_TOKEN_ERROR = 'الرمز الوحيد المسموح به داخل الأقواس هو {الاسم}';

function hasOnlyAllowedBraceToken(value: string): boolean {
  return !/[{}]/.test(value.replaceAll(NAME_TOKEN, ''));
}
...
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
```
Reuse `personalizedTextSchema`, `contentKindSchema`, `NAME_TOKEN` directly from `@roi/shared`; add form-level refinement for `D-05` (when `sameForBoth === false`, require non-empty trimmed `textFemale`) and export pure predicate `hasOneSidedNameToken(text, textFemale)` for the `D-06` non-blocking amber warning banner.

---

### `admin/src/components/editor/LivePreviewCard.tsx` (component, transform)

**Analog:** `app/features/scripture/scripture.tsx` + `shared/src/arabic.ts`

**Scripture RTL rendering + `personalize()` consumption** (`app/features/scripture/scripture.tsx` lines 131-145 & `shared/src/arabic.ts` lines 73-80):
```typescript
export function personalize(item: PersonalizeItem, profile: PersonalizeProfile): string {
  const raw = profile.gender === 'female' && item.textFemale ? item.textFemale : item.text;
  const name = profile.name?.trim();
  if (name) {
    return raw.replaceAll(NAME_TOKEN, () => name);
  }
  return raw.replaceAll(NAME_TOKEN, '').replace(/[ \t ]{2,}/g, ' ').trim();
}
```
Render the verse preview with `dir="rtl"`, `Amiri` serif font, `20px` size, and `leading-[1.8]` (`SCRIPTURE_LINE_HEIGHT` in `app/constants/theme.ts:35`), and render Names/Blessings in `IBM Plex Sans Arabic` at `16px` (`1.5` line-height) using a safe React Markdown-subset renderer (no `dangerouslySetInnerHTML`).

---

### `admin/src/components/auth/AuthProvider.tsx` & `admin/src/pages/LoginPage.tsx` (provider & page)

**Analog:** `app/features/sync/ContentGate.tsx` & `app/features/sync/LibraryReadyView.tsx`

**Gate + retry + Arabic-Indic summary pattern** (`app/features/sync/ContentGate.tsx` lines 302-332 & `app/features/sync/LibraryReadyView.tsx` lines 84-99):
- Centered `bg-background` warm-paper card (`rounded-2xl border border-border bg-card p-6`) for `LoginPage.tsx`.
- Use `toArabicDigits()` and `formatArabicDate()` from `@roi/shared` in Arabic UI mode (`LibraryReadyView.tsx:95`) and standard ASCII digits/dates in English UI mode (`03-UI-SPEC.md`).

---

## Shared Patterns

### 1. Authentication, Allowlist & CSRF Protection
**Sources:** `backend/src/common/google-auth.guard.ts` (lines 46-107), `backend/src/common/gql-throttler.guard.ts` (lines 9-27), `03-RESEARCH.md` Pattern 3
**Apply to:** `backend/src/admin-auth/*`, `backend/src/admin-content/admin-content.resolver.ts`, `backend/src/admin-moderation/admin-moderation.resolver.ts`, `backend/src/admin-audit/admin-audit.resolver.ts`, `admin/src/lib/graphql.ts`
- Verify Google ID tokens with injected `GOOGLE_OAUTH_CLIENT` (`OAuth2Client.verifyIdToken` + `email_verified === true`) and compare normalized `email.trim().toLowerCase()` against `env.ADMIN_EMAILS`.
- Mint/verify 14-day `HttpOnly`, `SameSite=Lax`, `Secure` (prod) session cookie `roi_admin_session` using `@nestjs/jwt`; re-check `ADMIN_EMAILS` on every guarded request.
- Enforce `x-roi-admin: 1` header in `AdminAuthGuard` alongside Apollo `csrfPrevention`.

### 2. Transactional Public Content Mutation & Snapshot Refresh
**Source:** `backend/src/content/content.service.ts` (lines 131-184)
**Apply to:** `backend/src/admin-content/admin-content.service.ts`, `backend/src/admin-moderation/admin-moderation.service.ts`
- All mutations changing public items (`create*`, `update*`, `softDelete*`, `restore*`, `acceptSuggestion`) MUST call `ContentService.applyContentMutation()` so `content_meta.content_version` increment, `audit_log` insertion, and `SnapshotService.refreshCache()` happen atomically inside a SQLite `IMMEDIATE` transaction.

### 3. Zod Validation & Error Handling
**Source:** `backend/src/common/zod-validation.pipe.ts` (lines 8-22) & `shared/src/schemas.ts` (lines 7-47)
**Apply to:** All admin GraphQL input mutations (`admin-content`, `admin-moderation`) and `admin/src/lib/validation.ts`
```typescript
@Injectable()
export class ZodValidationPipe<TOutput = unknown> implements PipeTransform<unknown, TOutput> {
  constructor(private readonly schema: ZodType<TOutput>) {}

  transform(value: unknown): TOutput {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: result.error.issues[0]?.message ?? 'INVALID_INPUT',
        issues: result.error.issues,
      });
    }
    return result.data;
  }
}
```
- Never use `class-validator` or `nestjs-zod`. Validate with `@roi/shared` schemas (`personalizedTextSchema`, etc.) on both client (`react-hook-form` + `zodResolver`) and backend (`ZodValidationPipe`).

### 4. Bilingual Logical Layout + Locked `dir="rtl"` Content Invariant
**Source:** `03-CONTEXT.md` `D-12`, `03-UI-SPEC.md` §1, `app/features/scripture/scripture.tsx` (line 140)
**Apply to:** `admin/src/components/layout/AdminShell.tsx`, `admin/src/components/editor/*`, all `admin/src/pages/*`
- Admin shell switches `dir={lang === 'ar' ? 'rtl' : 'ltr'}` using strictly Tailwind logical utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `border-s-*`).
- All content fields (`ref`, `title`, `verseRef`, `RichContentEditor`, test name input, catalog text cells, `LivePreviewCard`) explicitly set `dir="rtl"` and `lang="ar"` regardless of UI shell language.

---

## No Analog Found

Files with no close match in the codebase (planner should use `03-RESEARCH.md` & `03-UI-SPEC.md` patterns directly):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `admin/vite.config.ts` | config | build-config | First Vite 8 + `@tailwindcss/vite` config in repo (`base: '/admin/'`, `/graphql` & `/health` dev proxy); follow `03-RESEARCH.md` Architecture & Pitfall 9. |
| `admin/index.html` | config | html-shell | First web SPA HTML entry in repo; follow `03-RESEARCH.md` & `03-UI-SPEC.md` font loading (`IBM Plex Sans Arabic`, `Inter`, `Amiri`). |
| `admin/src/lib/markdown-serializer.ts` | utility | transform | First ProseMirror-JSON ⇄ Markdown-subset & Verse plain-text serializer; follow `03-RESEARCH.md` Pattern 1 (no `@tiptap/markdown`). |
| `admin/src/components/editor/NameTokenExtension.ts` | utility | transform | First Tiptap 3 custom inline atom draggable node; follow `03-RESEARCH.md` Pattern 2 & Code Example 1. |
| `admin/src/components/editor/NameChipView.tsx` | component | presentation | First Tiptap `ReactNodeViewRenderer` (`<NodeViewWrapper as="span">`); follow `03-RESEARCH.md` Pitfall 6 & `03-UI-SPEC.md` §3. |
| `admin/src/components/editor/RichContentEditor.tsx` | component | event-driven | First Tiptap 3 editor component with subset toolbar & `handlePaste`; follow `03-RESEARCH.md` Pattern 2 & `03-UI-SPEC.md` §3. |
| `admin/src/pages/ItemEditorPage.tsx` | component | CRUD | First `react-hook-form` + split editor + non-destructive M/F toggle + amber warning page; follow `03-CONTEXT.md` `D-05`..`D-08` & `03-UI-SPEC.md` §1, §3. |
| `admin/src/pages/ModerationQueuePage.tsx` | component | CRUD | First suggestion queue + submitter context + atomic promote/reject UI; follow `03-CONTEXT.md` `D-09`..`D-11` & `03-UI-SPEC.md` §1. |
| `admin/src/pages/AuditLogPage.tsx` | component | request-response | First read-only audit trail table with expandable `summaryJson`; follow `03-CONTEXT.md` `D-13` & `03-UI-SPEC.md` §1. |

---

## Metadata

**Analog search scope:** `backend/src/`, `backend/drizzle/`, `backend/Dockerfile`, `shared/src/`, `admin/`, `app/features/`, `app/components/`, `app/lib/`, `app/constants/`, root `package.json`, `tsconfig.json`, `vitest.config.ts` (all paths verified git-tracked via `git ls-files`)
**Files scanned:** 32
**Pattern extraction date:** 2026-11-25
