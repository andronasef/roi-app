---
phase: 02-content-backend-first-download
plan: 04
subsystem: sync
tags: [expo-network, expo-file-system, graphql-request, react-query, zod, sqlite, drizzle-orm, vitest]

# Dependency graph
requires:
  - phase: 02-content-backend-first-download
    provides: "@roi/shared snapshot/delta Zod schemas (02-01) and syncCols()-compliant mobile public content tables + sync_meta (02-02)"
provides:
  - "Mobile sync constants (CONTENT_STAGES, DELTA_SYNC_THROTTLE_MS, STAGING_DIR_NAME, STAGING_MANIFEST_FILE) and API_BASE_URL from EXPO_PUBLIC_API_BASE_URL"
  - "Validated snapshot REST + GraphQL contentDelta client (createSyncApiClient) omitting manual Accept-Encoding headers"
  - "expo-file-system checkpoint staging store (createExpoStagingStore)"
  - "Resumable 3-stage first-download orchestrator with mid-batch version-mismatch restart and atomic SQLite commit (runFirstDownload, readSyncState, readLibraryCounts)"
  - "Silent 6-hour throttled background delta sync with soft-delete tombstones (runDeltaSyncIfDue)"
affects:
  - 02-05
  - 02-06
  - 02-07
  - 04-onboarding-home
  - 05-daily-bread

# Actuals (#2632)
actuals:
  tokens: 13500
  tasks: 3
  commits: 3

plan_head_before: 16f530df877491e3fa237954bf29a0ac42398f1a
plan_head_after: dcf5e11c38f88a63a6c572b3ee71c22852c76b
commits: 3

# Tech tracking
tech-stack:
  added:
    - "expo-network@~58.0.5"
    - "expo-file-system@~58.0.14"
    - "graphql@16.15.0"
    - "graphql-request@7.4.0"
    - "@tanstack/react-query@5.108.4"
    - "zod@4.6.7"
  patterns:
    - "Fetch snapshots without manual Accept-Encoding headers so Android OkHttp handles gzip decompression transparently"
    - "Disk staging via SDK 58 expo-file-system Directory/File/Paths.document isolated from SQLite until all 3 stages match contentVersion"
    - "Shared synchronous upsertContentBatch/upsertSyncMeta helpers applying deletedAt tombstones via onConflictDoUpdate without db.delete()/tx.delete()"

key-files:
  created:
    - app/constants/sync.ts
    - app/features/sync/api.ts
    - app/features/sync/staging.ts
    - app/features/sync/db-ops.ts
    - app/features/sync/first-download.ts
    - app/features/sync/delta-sync.ts
    - app/features/sync/__tests__/api.test.ts
    - app/features/sync/__tests__/first-download.test.ts
    - app/features/sync/__tests__/delta-sync.test.ts
  modified:
    - app/package.json
    - app/constants/app.ts
    - bun.lock

key-decisions:
  - "Extract shared upsertContentBatch and upsertSyncMeta helpers into app/features/sync/db-ops.ts so first-download and delta-sync share one transactional SQLite write path"
  - "Guard __DEV__ with typeof __DEV__ !== 'undefined' and use relative ../app.json in app/constants/app.ts so constants resolve cleanly in both Metro and Node/Vitest"

patterns-established:
  - "All mobile sync modules accept injectable SyncDatabase, Clock, SyncApiClient, and StagingStore interfaces for deterministic Vitest testing against migrated SQLite"
  - "Stage files write and validate before updating manifest.json, and staging clears only after synchronous db.transaction completes"

requirements-completed: [BE-02, HOME-06, HOME-07]

coverage:
  - id: D1
    description: "Resolve API_BASE_URL from EXPO_PUBLIC_API_BASE_URL, export sync constants, and implement snapshot + contentDelta API client without manual Accept-Encoding headers"
    requirement: "HOME-06"
    verification:
      - kind: unit
        ref: "app/features/sync/__tests__/api.test.ts"
        status: pass
      - kind: other
        ref: "cd app && bunx expo install --check"
        status: pass
    human_judgment: false
  - id: D2
    description: "Implement expo-file-system staging store and resumable 3-stage first-download orchestrator with mid-batch version-mismatch restart and atomic SQLite transaction"
    requirement: "HOME-07"
    verification:
      - kind: integration
        ref: "app/features/sync/__tests__/first-download.test.ts"
        status: pass
      - kind: unit
        ref: "app/features/db/__tests__/schema.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Implement 6-hour throttled silent background delta sync applying inserts, updates, and deletedAt tombstones transactionally without db.delete()"
    requirement: "BE-02"
    verification:
      - kind: integration
        ref: "app/features/sync/__tests__/delta-sync.test.ts"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-11-25
status: complete
---

# Phase 02 Plan 04: Mobile Sync Engine Summary

**Resumable `expo-file-system` snapshot staging, atomic 3-table SQLite first-download orchestrator, and silent 6-hour throttled GraphQL delta sync with soft-delete tombstones**

## Performance

- **Duration:** 5 min
- **Started:** 2026-11-25T13:00:44Z
- **Completed:** 2026-11-25T13:05:59Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Installed pinned mobile sync packages (`expo-network`, `expo-file-system`, `graphql@16.15.0`, `graphql-request@7.4.0`, `@tanstack/react-query@5.108.4`, `zod@4.6.7`) in `app/`, verified with `bunx expo install --check`, and implemented `API_BASE_URL`, `app/constants/sync.ts`, and `createSyncApiClient` (`fetchSnapshot` + `fetchContentDelta` without manual `Accept-Encoding` headers).
- Built `createExpoStagingStore` (`Directory`, `File`, `Paths.document`) and `runFirstDownload` (`readSyncState`, `readLibraryCounts`) with per-stage disk checkpointing, stage-3 drop resume, mid-batch `contentVersion` mismatch reset/restart from `verses`, and single-transaction SQLite commit with rollback safety.
- Built `runDeltaSyncIfDue` enforcing initial-download guard, offline skip, 6-hour throttle (`DELTA_SYNC_THROTTLE_MS`), quiet `{ status: 'failed' }` error handling, and atomic `onConflictDoUpdate` application of inserts, updates, and `deletedAt` tombstones without `db.delete()`/`tx.delete()`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install mobile sync packages, add sync/API constants, and implement snapshot + GraphQL API client** - `fa4a92e` (feat)
2. **Task 2: Build expo-file-system staging store and resumable transactional first-download orchestrator** - `33cffe5` (feat)
3. **Task 3: Implement silent 6-hour throttled background delta sync with soft-delete tombstones** - `dcf5e11` (feat)

## Files Created/Modified
- `app/package.json` - Added `expo-network`, `expo-file-system`, `graphql@16.15.0`, `graphql-request@7.4.0`, `@tanstack/react-query@5.108.4`, `zod@4.6.7`
- `bun.lock` - Updated workspace lockfile for mobile sync dependencies
- `app/constants/app.ts` - Exported `API_BASE_URL` from `EXPO_PUBLIC_API_BASE_URL` and made `app.json` + `__DEV__` Node/Vitest-safe
- `app/constants/sync.ts` - Exported `CONTENT_STAGES`, `DELTA_SYNC_THROTTLE_MS`, `STAGING_DIR_NAME`, `STAGING_MANIFEST_FILE`, `SYNC_REQUEST_TIMEOUT_MS`
- `app/features/sync/api.ts` - Implemented `createSyncApiClient` (`fetchSnapshot`, `fetchContentDelta`) with 15s `AbortController` timeouts and `@roi/shared` Zod validation
- `app/features/sync/staging.ts` - Implemented `createExpoStagingStore` backed by SDK 58 `expo-file-system` `Directory`/`File`/`Paths.document`
- `app/features/sync/db-ops.ts` - Extracted shared `upsertContentBatch` and `upsertSyncMeta` transactional SQLite upsert helpers
- `app/features/sync/first-download.ts` - Implemented `readSyncState`, `readLibraryCounts`, and `runFirstDownload` resumable/atomic engine
- `app/features/sync/delta-sync.ts` - Implemented `runDeltaSyncIfDue` 6-hour throttled background delta sync
- `app/features/sync/__tests__/api.test.ts` - Verified sync constants, omitted `Accept-Encoding` headers, schema rejection, and GraphQL `contentDelta` validation (4 tests)
- `app/features/sync/__tests__/first-download.test.ts` - Verified happy path commit, stage-3 drop resume, mid-batch version bump restart, and SQLite transaction rollback against migrated SQLite (4 tests)
- `app/features/sync/__tests__/delta-sync.test.ts` - Verified uninitialized/offline/5h59m skips, 6h trigger, upserts + `deletedAt` tombstones, and quiet network failure against migrated SQLite (5 tests)

## Decisions Made
- Extracted `upsertContentBatch` and `upsertSyncMeta` into `app/features/sync/db-ops.ts` so `first-download.ts` and `delta-sync.ts` share a single `onConflictDoUpdate` write path without duplicating Drizzle column mappings.
- Updated `app/constants/app.ts` to use `../app.json` and `typeof __DEV__ !== 'undefined' && __DEV__` so `API_BASE_URL` and `DEV_TOOLS_ENABLED` remain identical under Expo/Metro while importing cleanly in Node/Vitest.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Made `app/constants/app.ts` Node/Vitest-importable (`../app.json` and guarded `__DEV__`)**
- **Found during:** Task 1 (`app/features/sync/__tests__/api.test.ts` execution)
- **Issue:** Importing `API_BASE_URL` from `app/constants/app.ts` inside Vitest threw `Cannot find package '@/app.json'` and `ReferenceError: __DEV__ is not defined` because Vitest runs in Node without Expo's `@/` path alias or `__DEV__` global.
- **Fix:** Switched `import appConfig from '@/app.json'` to `import appConfig from '../app.json'` and guarded `__DEV__` as `(typeof __DEV__ !== 'undefined' && __DEV__) || process.env.EXPO_PUBLIC_DEV_TOOLS === '1'`, keeping all `guards.test.ts` assertions intact.
- **Files modified:** `app/constants/app.ts`
- **Verification:** `bun run test -- --project @roi/app` (including `guards.test.ts` and `api.test.ts`), `bun run typecheck`, and `cd app && bun run lint` all exited 0.
- **Committed in:** `fa4a92e` (part of Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for Vitest compatibility when testing `app/features/sync/api.ts` without altering Metro/Expo runtime behavior. No scope creep.

## Issues Encountered
- Initial `api.test.ts` assertion checked `expect(url).toBe(...)` directly, whereas `graphql-request` passes a `URL` instance to `fetchImpl`; updated the test assertion to `expect(String(url)).toBe(...)`.

## Package Audit Log (For End-of-Phase Consolidated Review)
Per `02-RESEARCH.md` Package Legitimacy Audit (`[SLOP]` count = 0) and autonomous execution instruction, the following `[SUS]` (`"too-new"`, November 2026 official releases with zero malicious postinstall scripts) packages were installed into `app/package.json`:
- `expo-network@~58.0.5` (`58.0.5` resolved)
- `expo-file-system@~58.0.14` (`58.0.14` resolved)
- `graphql@16.15.0`
- `@tanstack/react-query@5.108.4`

(`graphql-request@7.4.0` and `zod@4.6.7` were rated `[OK]` in `02-RESEARCH.md`.)

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `app/features/sync/` provides the complete headless sync engine (`createSyncApiClient`, `createExpoStagingStore`, `runFirstDownload`, `runDeltaSyncIfDue`, `readSyncState`, `readLibraryCounts`) ready for UI wiring in `ContentGate.tsx`, `LibraryReadyView.tsx`, and `app/app/_layout.tsx` (`02-05`).
- Note: native prebuild/rebuild (`expo prebuild` / `expo run:ios` / `expo run:android`) will be needed when verifying `expo-network` and `expo-file-system` on native binaries later in Phase 2.

## Self-Check: PASSED
- Verified all 11 created/modified source/config/test files and `02-04-SUMMARY.md` exist on disk.
- Verified task commits `fa4a92e`, `33cffe5`, and `dcf5e11` are ancestors of `HEAD`.
- Confirmed zero stub/TODO/FIXME markers in created/modified files.
- Verified `cd app && bunx expo install --check`, `bun run test -- --project @roi/app` (10 files, 56 tests), `bun run typecheck`, and `cd app && bun run lint` all exited 0 after final edits.
