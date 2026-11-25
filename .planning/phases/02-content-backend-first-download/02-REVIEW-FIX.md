---
phase: 02-content-backend-first-download
fixed_at: 2026-11-25T14:41:00Z
review_path: .planning/phases/02-content-backend-first-download/02-REVIEW.md
iteration: 1
findings_in_scope: 13
fixed: 13
skipped: 0
status: all_fixed
---

# Phase 2: Code Review Fix Report

**Fixed at:** 2026-11-25T14:41:00Z
**Source review:** .planning/phases/02-content-backend-first-download/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 13 (fix_scope: all)
- Fixed: 13
- Skipped: 0

**Verification:** Per-fix checks (project `tsc -p`, targeted vitest) ran inside the isolated worktree, which had the main checkout's `node_modules` symlinked in (unlinked, not deleted, before teardown). After the fast-forward onto `main`, the full suite (`vitest run`: 26 files, 164 tests) and both typechecks (`tsc -p tsconfig.json`, `tsc -p app/tsconfig.json`) were re-run in the main checkout and pass. New regression tests were added for CR-01, CR-02, WR-02, WR-04, WR-05, IN-03 and IN-04.

## Fixed Issues

### CR-01: Seeding a running server leaves it serving stale (empty, v0) snapshots

**Files modified:** `backend/src/content/snapshot.service.ts`, `backend/src/__tests__/content-api.test.ts`
**Commit:** 8274e61
**Applied fix:** `getSnapshot()` and `areSnapshotsReady()` now compare the cached `contentVersion` to the DB version and rebuild the cache on drift, so an out-of-process `seed`/`restore` is picked up without a restart. Regression test seeds a second DB handle after boot and asserts the endpoint flips from v0 to v1.
**Deviation:** The review also suggested making `areSnapshotsReady()` require `contentVersion > 0` (503 for v0). Not applied: an existing test (`content-api.test.ts`, empty DATA_DIR) deliberately expects 200 and a v0 envelope on an unseeded DB, and a 503 health check would also leave a fresh Dokploy deploy unhealthy until seeded. CR-02 makes the client treat v0 as a failed download instead.

### CR-02: Mobile gate loops forever when the server returns a v0 library

**Files modified:** `app/features/sync/first-download.ts`, `app/features/sync/__tests__/first-download.test.ts`
**Commit:** 8ee1dd0
**Applied fix:** `runFirstDownload` clears staging and throws when the uniform snapshot version is `<= 0`, so `startDownload` lands in `'error'` (manual retry) instead of restarting immediately.

### WR-01: Seed and `applyContentMutation` race on `content_version` across processes

**Files modified:** `backend/src/scripts/seed.ts`, `backend/src/content/content.service.ts`
**Commit:** aae2739
**Status:** fixed: requires human verification (concurrency logic)
**Applied fix:** Both transactions now run with `.immediate()` (write lock taken up front). `ContentService` already read the version inside the transaction. The seed computes its plan from reads outside the transaction, so it re-reads `content_version` under the lock and aborts with a "re-run the seed" error if it changed (seed is idempotent), rather than restructuring the whole plan computation.

### WR-02: A corrupt or schema-incompatible snapshot file crashes the server on boot

**Files modified:** `backend/src/content/snapshot.service.ts`, `backend/src/__tests__/content-api.test.ts`
**Commit:** 379d952
**Applied fix:** `readSnapshotFromDisk` is wrapped in try/catch in `loadOrRebuild`; a failure triggers a rebuild. Test writes a non-gzip file and asserts a normal 200 snapshot.

### WR-03: Release builds silently fall back to `http://localhost:3000`

**Files modified:** `app/constants/app.ts`
**Commit:** e83ad67
**Applied fix:** `API_BASE_URL` throws when `EXPO_PUBLIC_API_BASE_URL` is empty and `process.env.NODE_ENV === 'production'`; dev and test keep the localhost fallback. (`NODE_ENV` was used instead of `__DEV__` because `__DEV__` is undefined under vitest.)

### WR-04: Restoring an older backup regresses `contentVersion` and strands clients

**Files modified:** `app/features/sync/delta-sync.ts`, `app/features/sync/ContentGate.tsx`, `app/features/sync/__tests__/delta-sync.test.ts`, `backend/src/scripts/restore.ts`, `.planning/phases/02-content-backend-first-download/02-OPS-DEPLOY-RUNBOOK.md`
**Commit:** 6ec79ee
**Status:** fixed: requires human verification (sync state logic)
**Applied fix:** The review's stated minimum. When `delta.contentVersion < lastContentVersion`, delta sync rewinds the local cursor to 0 and returns `{ status: 'reset' }`; the gate sets `lastContentVersion` to 0, which re-triggers the first download (upserts only, no local deletes). `restore.ts` prints a reminder to stderr and the runbook documents the version-lineage caveat.
**Not done:** Server-side prevention (bumping versions after restore). Edits made after a restore still reuse version numbers other clients may hold, and the existing restore test asserts byte-identical `content_meta`. This remains a documented operational limitation.

### WR-05: Delta sync can reject unhandled and is only attempted once per mount

**Files modified:** `app/features/sync/delta-sync.ts`, `app/features/sync/ContentGate.tsx`, `app/features/sync/__tests__/delta-sync.test.ts`
**Commit:** 39ff8a4
**Applied fix:** `readSyncState` moved inside a try (returns `{ status: 'failed' }`), the gate call has a `.catch`, and an `AppState` `'active'` listener re-arms the check (the 6h throttle still gates the network call).

### WR-06: Possible hot retry loop when the network hook and `getNetworkStateAsync` disagree

**Files modified:** `app/features/sync/ContentGate.tsx`
**Commit:** bcc0463
**Status:** fixed: requires human verification (effect/state logic; no component-level test exists)
**Applied fix:** A `resumeOnOnlineRef` is armed only on a hook-reported offline-to-online edge and cleared when a download starts. The auto-start effect resumes from `'paused'` only when armed.

### IN-01: `hideSchemaDetailsFromClientErrors` not set

**Files modified:** `backend/src/app.module.ts`
**Commit:** 04441f2
**Applied fix:** Added `hideSchemaDetailsFromClientErrors: isProd` to the Apollo driver config. Note this masks GraphQL schema/validation details; the hand-parsed `sinceVersion` path that leaked a raw `ZodError` message is now handled by the validation pipe (IN-02).

### IN-02: Duplicate `sinceVersion` validation

**Files modified:** `backend/src/content/content.resolver.ts`, `backend/src/content/content.service.ts`
**Commit:** cea4c5e
**Applied fix:** Validation lives only in `ZodValidationPipe` on the resolver arg; the duplicate schema and parse in the service and the hand-rolled check in the resolver were removed.
**Deviation:** `applyContentMutation` was kept as intentionally forward-looking (the admin phase is its consumer, WR-01 hardens it, and it has test coverage).

### IN-03: Suggestion daily quota is refunded when a row is soft-deleted

**Files modified:** `backend/src/suggestions/suggestions.service.ts`, `backend/src/__tests__/suggestions-unit.test.ts`
**Commit:** 20ffefb
**Applied fix:** Dropped the `deleted_at IS NULL` filter from the quota count; test soft-deletes rows and confirms the limit still holds.

### IN-04: Delta throttle never recovers from a future `lastCheckedAt`

**Files modified:** `app/features/sync/delta-sync.ts`, `app/features/sync/__tests__/delta-sync.test.ts`
**Commit:** cb33fab
**Applied fix:** Throttle applies only when `now >= lastCheckedAt`; a future timestamp counts as due.

### IN-05: Unused client dependency and provider (necessity)

**Files modified:** `app/app/_layout.tsx`, `app/features/sync/__tests__/content-gate.test.ts`, `app/package.json`, `bun.lock`
**Commit:** 3ef4d14
**Status:** fixed: requires human verification (removes code)
**Applied fix:** Removed `QueryClientProvider`, the `QueryClient`, the `@tanstack/react-query` dependency and its lockfile entries (`bun install --lockfile-only`, only the 5 expected lines changed). The layout test no longer asserts the provider. Re-add it when the first `useQuery` consumer lands (CLAUDE.md still lists TanStack Query as the intended stack). The runbook's historical `[SUS]` package list still names the package; left as an audit record.

## Skipped Issues

None.

---

_Fixed: 2026-11-25T14:41:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
