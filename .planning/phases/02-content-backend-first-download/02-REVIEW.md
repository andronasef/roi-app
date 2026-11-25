---
phase: 02-content-backend-first-download
reviewed: 2026-11-25T00:00:00Z
depth: standard
files_reviewed: 71
files_reviewed_list:
  - app/app/_layout.tsx
  - app/app/index.tsx
  - app/constants/app.ts
  - app/constants/sync.ts
  - app/constants/telemetry.ts
  - app/drizzle/0001_hard_risque.sql
  - app/drizzle/meta/0001_snapshot.json
  - app/drizzle/meta/_journal.json
  - app/drizzle/migrations.js
  - app/features/db/__tests__/migrate.test.ts
  - app/features/db/__tests__/schema.test.ts
  - app/features/db/schema.ts
  - app/features/sync/ContentGate.tsx
  - app/features/sync/LibraryReadyView.tsx
  - app/features/sync/__tests__/api.test.ts
  - app/features/sync/__tests__/content-gate.test.ts
  - app/features/sync/__tests__/delta-sync.test.ts
  - app/features/sync/__tests__/first-download.test.ts
  - app/features/sync/api.ts
  - app/features/sync/db-ops.ts
  - app/features/sync/delta-sync.ts
  - app/features/sync/first-download.ts
  - app/features/sync/staging.ts
  - app/locales/ar.json
  - app/package.json
  - app/scripts/build-fixture.mjs
  - backend/Dockerfile
  - backend/Dockerfile.dockerignore
  - backend/drizzle.config.ts
  - backend/drizzle/0000_supreme_prowler.sql
  - backend/drizzle/meta/0000_snapshot.json
  - backend/drizzle/meta/_journal.json
  - backend/package.json
  - backend/scripts/build.mjs
  - backend/seed/initial-content.json
  - backend/src/__tests__/backup-restore.test.ts
  - backend/src/__tests__/config.test.ts
  - backend/src/__tests__/content-api.test.ts
  - backend/src/__tests__/db.test.ts
  - backend/src/__tests__/hardening.test.ts
  - backend/src/__tests__/seed.test.ts
  - backend/src/__tests__/suggestions-unit.test.ts
  - backend/src/__tests__/suggestions.test.ts
  - backend/src/app.module.ts
  - backend/src/common/google-auth.guard.ts
  - backend/src/common/gql-throttler.guard.ts
  - backend/src/common/zod-validation.pipe.ts
  - backend/src/config/env.ts
  - backend/src/config/paths.ts
  - backend/src/content/content.resolver.ts
  - backend/src/content/content.service.ts
  - backend/src/content/snapshot-builder.ts
  - backend/src/content/snapshot.controller.ts
  - backend/src/content/snapshot.service.ts
  - backend/src/db/client.ts
  - backend/src/db/drizzle.module.ts
  - backend/src/db/schema.ts
  - backend/src/health/health.controller.ts
  - backend/src/main.ts
  - backend/src/scripts/backup.ts
  - backend/src/scripts/restore.ts
  - backend/src/scripts/seed.ts
  - backend/src/suggestions/suggestions.resolver.ts
  - backend/src/suggestions/suggestions.service.ts
  - backend/tsconfig.build.json
  - backend/tsconfig.json
  - backend/vitest.config.ts
  - shared/src/__tests__/schemas.test.ts
  - shared/src/index.ts
  - shared/src/schemas.ts
  - tsconfig.json
findings:
  critical: 2
  warning: 6
  info: 5
  total: 13
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-11-25
**Depth:** standard
**Files Reviewed:** 71
**Status:** issues_found

## Summary

Backend (NestJS/Drizzle/snapshots), the shared zod contracts and the mobile first-download/delta-sync stack were read in full. Test files were skimmed for reliability only. Generated drizzle meta/migrations and the seed JSON got a light consistency check. Migrations match their schemas, the seed JSON has unique ids and valid brace tokens, and all locale keys used by the UI exist.

The main problem is a deployment-path defect: the runbook's seed procedure leaves the running API serving empty version-0 snapshots, and the mobile gate loops forever when it receives one (CR-01, CR-02). Other concerns are the seed/mutation transaction race, a startup crash on a bad snapshot file, restore-time version regression that strands clients, and a release-build fallback to `http://localhost:3000`.

No structural findings were provided.

## Critical Issues

### CR-01: Seeding a running server leaves it serving stale (empty, v0) snapshots

**File:** `backend/src/scripts/seed.ts:355-356`, `backend/src/content/snapshot.service.ts:24-63`
**Issue:** `OPS-DEPLOY-RUNBOOK.md` (section B.1) says to deploy the container and then run `node dist/seed.cjs` inside it. On first boot `SnapshotService.onModuleInit` finds an empty DB (version 0), builds empty v0 snapshots, and caches them in memory. `/health` reports `snapshotsReady: true`. The seed is a separate OS process. It bumps the DB to v1 and rewrites the `.json.gz` files on disk, but it cannot touch the server's in-memory `cache`. `GET /snapshots/:type` keeps returning the empty v0 envelopes until the container restarts. `/health` (which reads the DB version) and the delta query (which reads the DB) report v1 while the snapshot endpoint serves v0. The runbook's own health check cannot detect this. The same drift occurs after any out-of-process write (`seed`, `restore`).
**Fix:** Make the snapshot endpoint authoritative from disk or detect version drift. Smallest fix is to check the DB version when serving:
```ts
// snapshot.service.ts
getSnapshot(type: SnapshotType): SnapshotArtifact {
  if (this.cache.get(type)?.contentVersion !== this.getDbContentVersion()) {
    this.refreshCache(); // DB is the source of truth; seed/restore may have run out-of-process
  }
  const cached = this.cache.get(type);
  if (cached) return cached;
  throw new ServiceUnavailableException(`Snapshot for '${type}' is not ready`);
}
```
Also make `areSnapshotsReady()` require `contentVersion === dbVersion` and `> 0`. Update the runbook to seed before the first start, or restart after seeding, until this is fixed.

### CR-02: Mobile gate loops forever (and hammers the API) when the server returns a v0 library

**File:** `app/features/sync/ContentGate.tsx:141-157, 206-213`; `app/features/sync/first-download.ts:205-221`; `app/features/sync/delta-sync.ts:38`
**Issue:** The gate treats `lastContentVersion > 0` as "library ready". If the server snapshots have `contentVersion === 0` (unseeded server or the CR-01 state), `runFirstDownload` commits `last_content_version = 0` and returns `contentVersion: 0`. `startDownload` then sets `lastContentVersion` to 0 and `downloadStatus` to `'idle'`. The auto-start effect (`downloadStatus === 'idle' && isOnline && lastContentVersion === 0`) fires again immediately. Result: an unbounded loop of 3 snapshot requests per iteration, repeated `first_download_completed` telemetry, and constant staging writes. It only stops when the global throttler (60/min/IP) returns 429. Every installed client does this simultaneously against a fresh deployment. `resolveVerifiedStagedStages` also discards manifests with `contentVersion <= 0`, so no state ever progresses.
**Fix:** Treat an empty/v0 library as a failed download, not success:
```ts
// first-download.ts, before the transaction
if (uniformVersion <= 0) {
  await staging.clear();
  throw new Error('Server library is not published yet (contentVersion 0).');
}
```
The catch block in `startDownload` then lands in `'error'` (manual retry) instead of looping. Consider also making the server return 503 for v0 snapshots (see CR-01 fix).

## Warnings

### WR-01: Seed and `applyContentMutation` race on `content_version` across processes

**File:** `backend/src/scripts/seed.ts:163-174, 261-353`; `backend/src/content/content.service.ts:141-143`
**Issue:** `seed.ts` reads `currentVersion` and all existing rows before opening the transaction, and computes `nextVersion = currentVersion + 1` from that stale read. The transaction itself is a deferred `better-sqlite3` transaction. If the live server commits a mutation between the read and the write, the seed overwrites `content_version` with a value that was already used (or lower than the real one). Two different content states then share one version number, and clients that already hold that version never receive the delta. `ContentService.applyContentMutation` has the same read-then-write inside a deferred transaction. When two processes are involved (server plus CLI seed), SQLite fails the read-to-write upgrade with `SQLITE_BUSY_SNAPSHOT`, and `busy_timeout` does not retry that case.
**Fix:** Use `BEGIN IMMEDIATE` and read the version inside the transaction.
```ts
const applyTx = sqlite.transaction(() => {
  const current = /* re-read content_meta here */;
  const nextVersion = current + 1;
  // recompute plans using nextVersion, then write
});
applyTx.immediate();
```
Do the same for `executeTx.immediate()` in `ContentService`.

### WR-02: A corrupt or schema-incompatible snapshot file crashes the server on boot

**File:** `backend/src/content/snapshot-builder.ts:232-233`; `backend/src/content/snapshot.service.ts:42-49`
**Issue:** `loadOrRebuild` calls `readSnapshotFromDisk`, which does `gunzipSync`, `JSON.parse` and `snapshotEnvelopeSchema.parse` without a guard. Any truncated/corrupt gzip file, or any tightening of the shared zod schema (shared by mobile and backend), throws from `onModuleInit`. The app fails to start even though the DB is intact and a rebuild would fix it. The snapshots are derived data and should be self-healing.
**Fix:**
```ts
let artifact: SnapshotArtifact | null = null;
try { artifact = readSnapshotFromDisk(this.env.DATA_DIR, type); } catch { /* corrupt: rebuild */ }
if (!artifact || artifact.contentVersion !== dbVersion) { needsRebuild = true; break; }
```

### WR-03: Release builds silently fall back to `http://localhost:3000`

**File:** `app/constants/app.ts:36-42`
**Issue:** If `EXPO_PUBLIC_API_BASE_URL` is unset at bundle time (an easy omission in an EAS/local release build), the app targets cleartext `localhost`. On a device this never reaches the backend, and iOS ATS / Android cleartext policy block it. Every user lands on the "error / retry" gate forever and the app is unusable. `localhost` is also wrong for the Android emulator (`10.0.2.2`).
**Fix:** Fail fast outside development.
```ts
export const API_BASE_URL = rawApiBaseUrl.length > 0
  ? rawApiBaseUrl.replace(/\/+$/, '')
  : __DEV__ ? 'http://localhost:3000'
  : (() => { throw new Error('EXPO_PUBLIC_API_BASE_URL is required for release builds'); })();
```

### WR-04: Restoring an older backup regresses `contentVersion` and permanently strands existing clients

**File:** `backend/src/scripts/restore.ts:41-83`; `app/features/sync/delta-sync.ts:60-76`
**Issue:** The version counter is monotonic only within one DB lineage. After a disaster-recovery restore from backup v7 when clients are at v9, new admin edits reuse v8, v9, ... Clients at v9 request `version > 9` and never see the re-issued v8/v9 content. A client that is ahead of the server (`delta.contentVersion <= lastContentVersion`) takes the "up_to_date" branch with no signal that anything is wrong. Restore also does not verify that the API is stopped, so running it against a live DB corrupts the open WAL.
**Fix:** Document a mandatory post-restore step, or implement one. For example, after restore bump `content_version` to `max(backup.version, lastKnownVersion) + 1` and touch all rows, or add an `epoch` to `content_meta` that makes clients do a full re-download when it changes. At minimum, have the delta client detect `delta.contentVersion < lastContentVersion` and trigger a first-download reset.

### WR-05: Delta sync can reject unhandled and is only attempted once per mount

**File:** `app/features/sync/delta-sync.ts:37`; `app/features/sync/ContentGate.tsx:216-230`
**Issue:** `readSyncState(db)` runs outside the `try` in `runDeltaSyncIfDue`. The gate calls it as `void runDeltaSyncIfDue(...)` with no `.catch`, so a DB error becomes an unhandled promise rejection (the docstring says it "never throws"). Separately, `deltaCheckedThisOnlineRef` is reset only on going offline, so a user who keeps the app open or backgrounded for days never gets another check. Content delivery depends on app restart, not foreground.
**Fix:** Move `readSyncState` inside a try (or `.catch(() => {})` at the call site). Re-arm the check on `AppState` change to `'active'` and let the 6h throttle gate it.

### WR-06: Possible hot retry loop when the network hook and `getNetworkStateAsync` disagree

**File:** `app/features/sync/ContentGate.tsx:158-163, 206-213`
**Issue:** On failure, `onlineAfterFailure` is recomputed from `getNetworkStateAsync`. If that says offline while `useNetworkState` still reports online (stale state, captive portal with `isInternetReachable === false` on one path only), status becomes `'paused'`. The auto-start effect starts again immediately because `isOnline` (hook) is still true. This repeats each time a request fails (up to 15 s each) until the hook catches up.
**Fix:** Do not auto-restart from `'paused'` unless `isOnline` transitioned from false to true (track with a ref). Alternatively let `'paused'` wait for a hook-driven offline-to-online edge.

## Info

### IN-01: `hideSchemaDetailsFromClientErrors` not set although the project hardening spec requires it

**File:** `backend/src/app.module.ts:67-93`
**Issue:** CLAUDE.md lists `hideSchemaDetailsFromClientErrors: true` among the production GraphQL settings. Only graphql-armor's `blockFieldSuggestion` is configured. Non-`HttpException` errors (e.g. a `ZodError` from `getContentDelta`) are returned to clients with their raw messages.
**Fix:** Add `hideSchemaDetailsFromClientErrors: isProd` to the Apollo driver config.

### IN-02: Duplicate `sinceVersion` validation and unused generality in `ContentService`

**File:** `backend/src/content/content.resolver.ts:6, 133-139`; `backend/src/content/content.service.ts:20, 61, 135-187`
**Issue:** The same non-negative integer schema is declared and parsed in both the resolver and the service. The resolver does it by hand although `ZodValidationPipe` exists. `applyContentMutation` has no caller outside its test (the admin phase does not exist yet).
**Fix:** Keep validation in one place (the pipe on the resolver arg). Defer `applyContentMutation` until its first real consumer, or note it as intentionally forward-looking.

### IN-03: Suggestion daily quota is refunded when a row is soft-deleted

**File:** `backend/src/suggestions/suggestions.service.ts:47-53`
**Issue:** The quota query counts only `deleted_at IS NULL`. Once admin moderation soft-deletes (rejects) suggestions, the author regains quota the same day, so a spammer can get unlimited submissions from one account as long as the admin keeps rejecting.
**Fix:** Count all rows for the day regardless of `deleted_at`, or key the quota off `createdAt` and `googleSub` only.

### IN-04: Delta throttle never recovers from a future `lastCheckedAt`

**File:** `app/features/sync/delta-sync.ts:46-49`
**Issue:** `now - lastCheckedAt < throttleMs` is true for any negative difference. If the device clock was ever set forward (then corrected), `lastCheckedAt` stays in the future and delta sync is skipped until real time catches up.
**Fix:** Treat `now < lastCheckedAt` as due: `if (now >= lastCheckedAt && now - lastCheckedAt < throttleMs)`.

### IN-05: Unused client dependency and provider

**File:** `app/app/_layout.tsx:4, 25, 55`; `app/package.json`
**Issue:** `@tanstack/react-query` was added and `QueryClientProvider` wraps the tree, but nothing in the app uses `useQuery`/`useMutation` (the sync code calls `graphql-request` directly). Dead dependency plus an extra provider on the startup path.
**Fix:** Remove until a consumer exists, or move the sync calls onto it. (Category: necessity - generality without instantiation.)

---

_Reviewed: 2026-11-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
