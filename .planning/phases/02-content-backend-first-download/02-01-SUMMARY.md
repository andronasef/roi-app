---
phase: 02-content-backend-first-download
plan: 01
subsystem: api
tags: [zod, nestjs, apollo, graphql, drizzle-orm, better-sqlite3, swc, vitest, typescript]

# Dependency graph
requires:
  - phase: 01-foundation-native-spike
    provides: "@roi/shared base workspace, syncRowSchema, personalizedTextSchema, static guards, bun isolated linker"
provides:
  - "@roi/shared Phase 2 content, snapshot envelope, delta, seed, and suggestion Zod contracts"
  - "Backend NestJS 12 / Apollo 5 / Drizzle / SQLite dependencies under bun isolated linker"
  - "Vitest unplugin-swc emitDecoratorMetadata config and backend tsconfig.json"
  - "Validated env loader (loadEnv) and ESM/CJS-safe root/path resolver (resolveBackendRoot, resolveBackendPath)"
affects:
  - 02-02
  - 02-03
  - 02-05
  - 02-07
  - 02-08
  - 03-admin-panel

# Actuals (#2632)
actuals:
  tokens: 6656
  tasks: 2
  commits: 2

plan_head_before: 3d9f8f710a8e92fdd025732dead54e0250e59177
plan_head_after: 9552f41299efe5ed4e02b13c96db92fccf5bf1b2
commits: 2

# Tech tracking
tech-stack:
  added:
    - "@nestjs/core@12.6.1"
    - "@nestjs/common@12.6.1"
    - "@nestjs/platform-express@12.6.1"
    - "@nestjs/config@12.1.1"
    - "@nestjs/graphql@14.2.1"
    - "@nestjs/apollo@14.2.1"
    - "@apollo/server@5.5.2"
    - "@as-integrations/express5@1.1.2"
    - "graphql@16.15.0"
    - "reflect-metadata@0.2.2"
    - "rxjs@7.8.2"
    - "class-validator@0.15.1"
    - "class-transformer@0.5.1"
    - "drizzle-orm@0.45.4"
    - "better-sqlite3@13.2.0"
    - "google-auth-library@11.3.4"
    - "@nestjs/throttler@6.8.0"
    - "helmet@8.3.0"
    - "@escape.tech/graphql-armor@3.2.0"
    - "zod@4.6.7"
    - "drizzle-kit@0.31.11"
    - "@types/better-sqlite3@9.6.0"
    - "@nestjs/testing@12.6.1"
    - "supertest@7.3.2"
    - "@types/supertest@7.2.1"
    - "unplugin-swc@2.0.0"
    - "@swc/core@1.16.22"
    - "esbuild@0.28.2"
    - "@types/node@^24"
  patterns:
    - "Shared Zod contracts in @roi/shared with extensionless imports and zero node:/expo/react-native dependencies"
    - "Vitest unplugin-swc plugin enabling NestJS emitDecoratorMetadata constructor DI under Node"
    - "ESM/CJS-safe resolveBackendRoot() probing BACKEND_ROOT, __dirname, import.meta.url, and cwd"

key-files:
  created:
    - backend/vitest.config.ts
    - backend/tsconfig.json
    - backend/src/config/env.ts
    - backend/src/config/paths.ts
    - backend/src/__tests__/config.test.ts
  modified:
    - shared/src/schemas.ts
    - shared/src/index.ts
    - shared/src/__tests__/schemas.test.ts
    - tsconfig.json
    - backend/package.json
    - bun.lock

key-decisions:
  - "Export both createSnapshotEnvelopeSchema factory and discriminated-union snapshotEnvelopeSchema from @roi/shared so per-type and union consumers share one contract"
  - "Configure root tsconfig.json typeRoots with ./backend/node_modules/@types and types: ['node'] so TypeScript 6.0 under Bun isolated linker resolves @types/node for backend/src"
  - "Order resolveBackendRoot() candidates to check __dirname/import.meta.url before join(cwd, 'backend') and cwd so monorepo-root package.json never shadows backend/"

patterns-established:
  - "Shared validation boundary: all content items, snapshots, deltas, suggestions, and seed files validate against @roi/shared schemas enforcing {الاسم}-only brace tokens"
  - "Dynamic env loading: loadEnv(rawEnv = process.env) validates PORT, NODE_ENV, DATA_DIR, ADMIN_ORIGINS, and GOOGLE_CLIENT_IDS without import-time singleton caching"

requirements-completed: [BE-01, BE-02, BE-03, BE-05, BE-07]

coverage:
  - id: D1
    description: "Extend @roi/shared with contentKindSchema, snapshotTypeSchema, verseItemSchema, nameOfGodItemSchema, blessingItemSchema, createSnapshotEnvelopeSchema, snapshotEnvelopeSchema, contentDeltaResponseSchema, submitSuggestionInputSchema, and seedContentFileSchema"
    requirement: "BE-01"
    verification:
      - kind: unit
        ref: "shared/src/__tests__/schemas.test.ts"
        status: pass
      - kind: unit
        ref: "backend/src/__tests__/config.test.ts#imports @roi/shared Phase 2 schemas cleanly in @roi/backend"
        status: pass
    human_judgment: false
  - id: D2
    description: "Install pinned NestJS 12 / Apollo 5 / Drizzle / SQLite stack under Bun isolated linker and configure Vitest SWC emitDecoratorMetadata"
    requirement: "BE-02"
    verification:
      - kind: unit
        ref: "backend/src/__tests__/config.test.ts#supports NestJS constructor DI with emitDecoratorMetadata under Vitest SWC"
        status: pass
    human_judgment: false
  - id: D3
    description: "Implement Zod-validated loadEnv() (PORT, NODE_ENV, DATA_DIR, ADMIN_ORIGINS, GOOGLE_CLIENT_IDS) and ESM/CJS resolveBackendRoot/resolveBackendPath"
    requirement: "BE-03"
    verification:
      - kind: unit
        ref: "backend/src/__tests__/config.test.ts#loadEnv() applies defaults including roi-app-515721 Google client IDs and empty ADMIN_ORIGINS"
        status: pass
      - kind: unit
        ref: "backend/src/__tests__/config.test.ts#resolveBackendRoot() resolves backend workspace root in Vitest ESM and honors BACKEND_ROOT override"
        status: pass
    human_judgment: false

# Metrics
duration: 4min
completed: 2026-11-25
status: complete
---

# Phase 02 Plan 01: Shared Contracts & Backend Foundation Summary

**Shared Phase 2 Zod contracts in `@roi/shared`, pinned NestJS 12 / Apollo 5 / Drizzle / SQLite stack with `unplugin-swc` Vitest DI support, Zod `loadEnv()`, and ESM/CJS `resolveBackendPath()`**

## Performance

- **Duration:** 4 min
- **Started:** 2026-11-25T12:45:50Z
- **Completed:** 2026-11-25T12:50:04Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Extended `shared/src/schemas.ts` and `shared/src/index.ts` with `contentKindSchema`, `snapshotTypeSchema`, `verseItemSchema`, `nameOfGodItemSchema`, `blessingItemSchema`, `createSnapshotEnvelopeSchema`, `snapshotEnvelopeSchema`, `contentDeltaResponseSchema`, `submitSuggestionInputSchema`, and `seedContentFileSchema` (enforcing `{الاسم}`-only brace tokens with Arabic errors and clean local seed fields without Sanity API metadata).
- Installed all pinned NestJS 12, Apollo Server 5, Drizzle ORM, `better-sqlite3`, `google-auth-library`, `@nestjs/throttler`, `helmet`, `@escape.tech/graphql-armor`, `zod`, `unplugin-swc`, `@swc/core`, and `esbuild` dependencies into `backend/` under Bun's isolated linker (`bunfig.toml` preserved) and configured `backend/vitest.config.ts`, `backend/tsconfig.json`, and root `tsconfig.json`.
- Built `backend/src/config/env.ts` (`loadEnv` with `ADMIN_ORIGINS` CSV allowlist and `roi-app-515721` `GOOGLE_CLIENT_IDS` defaults) and `backend/src/config/paths.ts` (`resolveBackendRoot` / `resolveBackendPath` across `BACKEND_ROOT`, `__dirname`, `import.meta.url`, and `cwd`).

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend @roi/shared content, seed, & suggestion schemas and update root TypeScript decorator flags** - `1284747` (feat)
2. **Task 2: Install backend stack under Vitest SWC and add validated env + ESM/CJS backend path resolver** - `9552f41` (feat)

## Files Created/Modified
- `shared/src/schemas.ts` - Phase 2 content, snapshot envelope, delta, suggestion, and seed Zod schemas and inferred types
- `shared/src/index.ts` - Re-exports all new schemas and inferred types
- `shared/src/__tests__/schemas.test.ts` - Unit tests for content kinds, snapshots, deltas, suggestion brace validation, and seed files (15 tests passing)
- `tsconfig.json` - Added `experimentalDecorators`, `emitDecoratorMetadata`, `typeRoots`, and `types: ["node"]`
- `backend/package.json` - Declared pinned backend runtime/dev dependencies and `db:generate`, `build`, `start:prod`, `seed`, `backup`, `restore` scripts
- `backend/vitest.config.ts` - Configured `unplugin-swc` (`swc.vite()`) with Bun runtime guard
- `backend/tsconfig.json` - Backend TypeScript config extending root settings with `types: ["node"]`
- `backend/src/config/env.ts` - Zod-validated `loadEnv()` and `DEFAULT_GOOGLE_CLIENT_IDS`
- `backend/src/config/paths.ts` - ESM + CJS + `BACKEND_ROOT` path resolver (`resolveBackendRoot`, `resolveBackendPath`)
- `backend/src/__tests__/config.test.ts` - Tests for NestJS DI under SWC, `@roi/shared` imports, `loadEnv()`, and `resolveBackendRoot()` (6 tests passing)
- `bun.lock` - Updated workspace lockfile for installed backend dependencies

## Decisions Made
- Exported both `createSnapshotEnvelopeSchema(itemSchema)` and a discriminated-union `snapshotEnvelopeSchema` from `@roi/shared` so callers validating either a specific type or any envelope share one definition.
- Kept `loadEnv()` pure without module-level caching so tests and runtime modules can evaluate env overrides dynamically.
- Probed `__dirname` and `import.meta.url` before `join(process.cwd(), 'backend')` and `process.cwd()` in `resolveBackendRoot()` so the monorepo root's `package.json` cannot shadow `backend/`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added `typeRoots` and `types: ["node"]` to root `tsconfig.json` for TypeScript 6.0 under Bun isolated linker**
- **Found during:** Task 2 (`bun run typecheck` verification)
- **Issue:** Root `tsconfig.json` includes `backend/src`, and under TypeScript 6.0 + `bunfig.toml` `linker = "isolated"`, `tsc -p tsconfig.json` could not locate `@types/node` inside `backend/node_modules/@types` (`TS2591` / `TS2304` on `node:fs`, `process`, `__dirname`).
- **Fix:** Added `"typeRoots": ["./node_modules/@types", "./backend/node_modules/@types"]` and `"types": ["node"]` to root `tsconfig.json`.
- **Files modified:** `tsconfig.json`
- **Verification:** `bun run typecheck` (`tsc -p tsconfig.json && tsc -p app/tsconfig.json`) and `tsc -p backend/tsconfig.json` exited with code 0.
- **Committed in:** `9552f41` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for root `bun run typecheck` to resolve isolated-linker `@types/node` in TypeScript 6.0. No scope creep.

## Issues Encountered
None beyond the isolated-linker `typeRoots` fix documented above.

## Package Audit Log (For End-of-Phase Consolidated Review)
Per `02-RESEARCH.md` Package Legitimacy Audit (`[SLOP]` count = 0) and owner autonomous execution instruction, the following `[SUS]` (`"too-new"`, November 2026 official releases with zero malicious postinstall scripts) packages were installed into `backend/package.json`:
- `@nestjs/core@12.6.1`, `@nestjs/common@12.6.1`, `@nestjs/platform-express@12.6.1`, `@nestjs/testing@12.6.1`
- `@nestjs/config@12.1.1`, `@nestjs/graphql@14.2.1`, `@nestjs/apollo@14.2.1`, `@apollo/server@5.5.2`
- `graphql@16.15.0`, `better-sqlite3@13.2.0`, `google-auth-library@11.3.4`, `@nestjs/throttler@6.8.0`
- `supertest@7.3.2`, `@swc/core@1.16.22`

## User Setup Required
None - no external service configuration required for this plan.

## Next Phase Readiness
- `@roi/shared` Phase 2 schemas and types are ready for `02-02` (mobile Drizzle schema) and `02-08` (backend Drizzle schema & seed CLI).
- `backend/` NestJS 12 / Apollo 5 / Drizzle runtime, SWC Vitest harness, `loadEnv()`, and `resolveBackendPath()` are ready for `02-08` and `02-03`.

## Self-Check: PASSED
- Verified all 10 source/config/test files and `02-01-SUMMARY.md` exist on disk.
- Verified task commits `1284747` and `9552f41` are ancestors of `HEAD`.
- Confirmed zero stub/TODO/FIXME markers in created/modified source files.
- Verified `bun run test` (15 files, 112 tests), `bun run test -- --project @roi/shared --project @roi/backend` (7 files, 73 tests), and `bun run typecheck` all exited 0 after final edits.

