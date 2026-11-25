---
phase: 02-content-backend-first-download
plan: 03
subsystem: api
tags: [nestjs, apollo-server, graphql, graphql-armor, throttler, gzip, sqlite, drizzle-orm, supertest]

# Dependency graph
requires:
  - phase: 02-content-backend-first-download
    plan: 01
    provides: "@roi/shared Phase 2 Zod contracts, loadEnv(), resolveBackendPath(), and SWC Vitest harness"
  - phase: 02-content-backend-first-download
    plan: 08
    provides: "Backend Drizzle SQLite schema, openBackendDatabase(), rebuildAllSnapshots(), and readSnapshotFromDisk()"
provides:
  - "NestJS @Global() DrizzleModule providing dynamic loadEnv() BACKEND_ENV, SQLITE_DB, and DRIZZLE_DB"
  - "In-memory + volume-backed gzipped snapshot cache (SnapshotService) and GET /snapshots/:type Express endpoint (BE-01)"
  - "Monotonic GraphQL Query contentDelta(sinceVersion) with tombstones and transactional applyContentMutation helper (BE-02)"
  - "Readiness endpoint GET /health with @SkipThrottle() probing SQLite SELECT 1 and snapshot availability (BE-06, D-08)"
  - "Hardened AppModule with GraphQLModule.forRootAsync, ApolloArmor, GqlThrottlerGuard, and NODE_ENV=production GraphQL lock (BE-04, D-09)"
affects:
  - 02-05
  - 02-07
  - 03-admin-panel

# Actuals (#2632)
actuals:
  tokens: 8727
  tasks: 2
  commits: 2

plan_head_before: 4ecd49a94a7adfb6a0dbeec8ccb030d3c4ecf8d0
plan_head_after: 8b906128777d883ef7e2276d48bea6bb92bbccdb
commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GraphQLModule.forRootAsync useFactory evaluating loadEnv() and ApolloArmor dynamically at module init"
    - "Pre-compressed .json.gz Buffer serving on GET /snapshots/:type with req.acceptsEncodings('gzip') and gunzipSync fallback"
    - "GqlThrottlerGuard extending ThrottlerGuard with GqlExecutionContext + Apollo plugin preserving HTTP 429 status"
    - "Float GraphQL fields for epoch-ms UTC timestamps (createdAt, updatedAt, deletedAt) exceeding 32-bit Int range"

key-files:
  created:
    - backend/src/db/drizzle.module.ts
    - backend/src/content/snapshot.service.ts
    - backend/src/content/snapshot.controller.ts
    - backend/src/health/health.controller.ts
    - backend/src/common/gql-throttler.guard.ts
    - backend/src/content/content.service.ts
    - backend/src/content/content.resolver.ts
    - backend/src/app.module.ts
    - backend/src/__tests__/content-api.test.ts
  modified:
    - backend/src/content/snapshot-builder.ts

key-decisions:
  - "Use @Field(() => Float) for createdAt, updatedAt, and deletedAt in GraphQL DTOs because epoch-ms UTC timestamps exceed 32-bit signed GraphQL Int"
  - "Set preserveHttpStatusForExecutionErrors: false and add an Apollo willSendResponse plugin + formatError mapping so GqlThrottlerGuard preserves HTTP 429 and TOO_MANY_REQUESTS on throttled GraphQL responses without noisy ExceptionsHandler logs"
  - "Export and reuse parseTagsJson from snapshot-builder.ts inside ContentService to avoid duplicating tag deserialization"
  - "Use @escape.tech/graphql-armor blockFieldSuggestion option (singular, matching v3.2.0 GraphQLArmorConfig) inside GraphQLModule.forRootAsync"

patterns-established:
  - "Transactional content write helper: ContentService.applyContentMutation increments content_meta.content_version, inserts audit_log inside SQLite transaction, and calls SnapshotService.refreshCache() after commit"
  - "Health response contract: GET /health returns { ok: true, status: 'ok', contentVersion, snapshotsReady: true } or 503 ServiceUnavailableException"

requirements-completed: [BE-01, BE-02, BE-04, BE-06]

coverage:
  - id: D1
    description: "Serve pre-built gzipped per-type snapshots at GET /snapshots/:type from memory/disk cache with gunzip fallback when gzip Accept-Encoding is omitted"
    requirement: "BE-01"
    verification:
      - kind: integration
        ref: "backend/src/__tests__/content-api.test.ts#serves /health, gzipped & gunzipped /snapshots/:type, and monotonic contentDelta with tombstones"
        status: pass
    human_judgment: false
  - id: D2
    description: "Serve monotonic GraphQL contentDelta(sinceVersion) returning changed/added rows and deletedAt tombstones where version > sinceVersion"
    requirement: "BE-02"
    verification:
      - kind: integration
        ref: "backend/src/__tests__/content-api.test.ts#serves /health, gzipped & gunzipped /snapshots/:type, and monotonic contentDelta with tombstones"
        status: pass
    human_judgment: false
  - id: D3
    description: "Verify SQLite SELECT 1 and snapshot readiness on GET /health with @SkipThrottle() and 503 failure behavior"
    requirement: "BE-06"
    verification:
      - kind: integration
        ref: "backend/src/__tests__/content-api.test.ts#rebuilds missing snapshots on boot for empty DATA_DIR, enforces ApolloArmor maxAliases, and returns 503 on /health when SQLite fails"
        status: pass
    human_judgment: false
  - id: D4
    description: "Enforce GqlThrottlerGuard (HTTP 429), ApolloArmor query limits, and NODE_ENV=production introspection/GraphiQL lock in AppModule"
    requirement: "BE-04"
    verification:
      - kind: integration
        ref: "backend/src/__tests__/content-api.test.ts#enforces GqlThrottlerGuard (HTTP 429) on GraphQL while @SkipThrottle() keeps /health accessible, and disables introspection in production"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-11-25
status: complete
---

# Phase 02 Plan 03: NestJS HTTP Snapshots, GraphQL Delta Sync, Health & Hardening Summary

**NestJS 12 + Apollo Server 5 read API serving pre-built `.json.gz` snapshots (`GET /snapshots/:type`), monotonic `contentDelta(sinceVersion)` with tombstones, `@SkipThrottle()` `GET /health` probe, and `ApolloArmor` + `GqlThrottlerGuard` + production GraphQL lock**

## Performance

- **Duration:** 8 min
- **Started:** 2026-11-25T13:07:23Z
- **Completed:** 2026-11-25T13:15:00Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Built `@Global()` `DrizzleModule` (`BACKEND_ENV` via dynamic `loadEnv()`, `SQLITE_DB`, `DRIZZLE_DB` using `resolveBackendPath('drizzle')` with `OnModuleDestroy` close), `SnapshotService` (`OnModuleInit` disk load + `rebuildAllSnapshots` fallback), `SnapshotController` (`GET /snapshots/:type` with `ETag`, `Cache-Control`, `Vary: Accept-Encoding`, `X-Content-Version`, pre-built gzip buffer / `gunzipSync` fallback), and `@SkipThrottle()` `HealthController` (`GET /health`).
- Built `ContentService` (`getCurrentVersion`, `getContentDelta` with `deletedAt` tombstones, transactional `applyContentMutation` helper for Phase 3), `ContentResolver` (`contentDelta(sinceVersion)` with Zod non-negative integer check and `Float` epoch-ms DTO fields), and `GqlThrottlerGuard` registered globally via `APP_GUARD`.
- Configured `AppModule` with `GraphQLModule.forRootAsync` dynamically evaluating `loadEnv()`, `ApolloArmor` (`maxDepth: 6`, `costLimit: 5000`, `maxAliases: 5`, `maxDirectives: 5`, `maxTokens: 500`, `blockFieldSuggestion: true`), `ApolloServerPluginLandingPageDisabled()`, and production introspection/GraphiQL/stacktrace locking, verified end-to-end with Supertest in `content-api.test.ts`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Wire DrizzleModule, SnapshotService/Controller, HealthController, and AppModule with /snapshots/:type + /health** - `5058c24` (feat)
2. **Task 2: Implement monotonic contentDelta GraphQL query with tombstones and GqlThrottlerGuard (BE-02, BE-04)** - `8b90612` (feat)

## Files Created/Modified
- `backend/src/db/drizzle.module.ts` - Global Nest module exporting `BACKEND_ENV`, `SQLITE_DB`, and `DRIZZLE_DB`
- `backend/src/content/snapshot.service.ts` - In-memory + disk `.json.gz` snapshot cache with `OnModuleInit` load/rebuild and `refreshCache()`
- `backend/src/content/snapshot.controller.ts` - `GET /snapshots/:type` Express route serving gzipped or gunzipped JSON with `ETag` and `X-Content-Version`
- `backend/src/health/health.controller.ts` - `@SkipThrottle()` `GET /health` endpoint probing SQLite `SELECT 1` and snapshot readiness
- `backend/src/common/gql-throttler.guard.ts` - `ThrottlerGuard` subclass extracting `{ req, res }` from `GqlExecutionContext`
- `backend/src/content/content.service.ts` - `getCurrentVersion()`, `getContentDelta(sinceVersion)` with tombstones, and transactional `applyContentMutation()`
- `backend/src/content/content.resolver.ts` - `VerseDto`, `NameOfGodDto`, `BlessingDto`, `ContentDeltaDto`, and `ContentResolver.contentDelta`
- `backend/src/app.module.ts` - Root NestJS module wiring `ConfigModule`, `ThrottlerModule`, `DrizzleModule`, `GraphQLModule.forRootAsync` + `ApolloArmor`, and `GqlThrottlerGuard`
- `backend/src/content/snapshot-builder.ts` - Exported `parseTagsJson` helper for reuse in `ContentService`
- `backend/src/__tests__/content-api.test.ts` - End-to-end Supertest integration suite covering `/health`, `/snapshots/:type`, `contentDelta` tombstones, `GqlThrottlerGuard` HTTP 429, `ApolloArmor`, and `NODE_ENV=production` lock (3 tests passing)

## Decisions Made
- Used `@Field(() => Float)` for `createdAt`, `updatedAt`, and `deletedAt` in `content.resolver.ts` because epoch-ms UTC timestamps exceed GraphQL 32-bit signed `Int`.
- Configured `preserveHttpStatusForExecutionErrors: false` alongside an Apollo `willSendResponse` plugin and `formatError` mapping in `AppModule` so `GqlThrottlerGuard` emits HTTP `429` with `extensions.code = 'TOO_MANY_REQUESTS'` on GraphQL rate-limit rejections while retaining standard `ThrottlerException` handling.
- Exported `parseTagsJson` from `snapshot-builder.ts` so `ContentService` reuses the exact tag deserialization helper without duplication.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ApolloArmor `blockFieldSuggestion` property name**
- **Found during:** Task 1 (`bun run typecheck`)
- **Issue:** `@escape.tech/graphql-armor@3.2.0` `GraphQLArmorConfig` uses singular `blockFieldSuggestion` rather than `blockFieldSuggestions` (`TS2561`).
- **Fix:** Updated `backend/src/app.module.ts` to `blockFieldSuggestion: { enabled: true }`.
- **Files modified:** `backend/src/app.module.ts`
- **Verification:** `bun run typecheck` exited 0 cleanly.
- **Committed in:** `5058c24` (Task 1 commit)

**2. [Rule 1 - Bug] Preserved HTTP 429 status on GraphQL throttled responses in Apollo 5**
- **Found during:** Task 2 (`content-api.test.ts`)
- **Issue:** `@nestjs/apollo@14.2.1` enables `preserveHttpStatusForExecutionErrors` by default, resetting `ThrottlerException` HTTP status from 429 to 200 and mapping its code to `INTERNAL_SERVER_ERROR`.
- **Fix:** Set `preserveHttpStatusForExecutionErrors: false`, normalized `extensions.code = 'TOO_MANY_REQUESTS'` in `formatError`, and added `createThrottlerHttpStatusPlugin()` in `backend/src/app.module.ts` to set `response.http.status = 429` when `extensions.status === 429`.
- **Files modified:** `backend/src/app.module.ts`
- **Verification:** `content-api.test.ts` verified HTTP 429 and `TOO_MANY_REQUESTS` on GraphQL throttling while `/health` stayed 200.
- **Committed in:** `8b90612` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for TypeScript correctness and HTTP 429 GraphQL throttling behavior. No scope creep.

## Issues Encountered
None beyond the two auto-fixed issues above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `AppModule`, `DrizzleModule`, `SnapshotService`, `ContentService`, and `GqlThrottlerGuard` are ready for `02-05` (`main.ts` HTTP bootstrap, `hardening.test.ts`, and `submitSuggestion` resolver/service) and `02-07` (`Dockerfile` + CJS bundle build).

## Self-Check: PASSED
- Verified all 9 created files, 1 modified file, and `02-03-SUMMARY.md` exist on disk.
- Verified task commits `5058c24` and `8b90612` are ancestors of `HEAD`.
- Confirmed zero stub/TODO/FIXME markers across created/modified files.
- Verified `bun run test -- --project @roi/backend backend/src/__tests__/content-api.test.ts` (3 tests), `bun run test -- --project @roi/backend` (5 files, 17 tests), `bun run typecheck`, and `tsc -p backend/tsconfig.json` all exited 0 cleanly.

---
*Phase: 02-content-backend-first-download*
*Completed: 2026-11-25*
