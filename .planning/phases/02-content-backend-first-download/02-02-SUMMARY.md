---
phase: 02-content-backend-first-download
plan: 02
subsystem: database
tags: [drizzle-orm, sqlite, better-sqlite3, migrations, soft-delete, fixtures, vitest]

# Dependency graph
requires:
  - phase: 01-foundation-native-spike
    provides: "syncCols(), SYNC_COLUMNS, hard-delete static guard, Drizzle Expo migrations, v1.sqlite fixture pattern"
provides:
  - "Mobile SQLite tables: verses, names_of_god, blessings, and sync_meta with syncCols() and CONTENT_SYNC_META_ID"
  - "Drizzle migration 0001_hard_risque.sql with zero pending schema drift"
  - "Frozen v2.sqlite migration fixture and v1/v2 + 10-table + tombstone upsert migration tests"
affects:
  - 02-05
  - 02-06
  - 02-07
  - 04-onboarding-home
  - 05-daily-bread
  - 08-drive-sync

# Actuals (#2632)
actuals:
  tokens: 8248
  tasks: 2
  commits: 2

plan_head_before: a76cf463768e98226d1494cdbc7be5791abce243
plan_head_after: 07ccfa14f1b7883fb020985fae50bb812298a9cb
commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared unexported publicContentCols() helper composing syncCols() + text/textFemale/version/sortOrder/tagsJson across public library tables"
    - "Idempotent public content upserts and deletedAt tombstones via onConflictDoUpdate without Drizzle .delete()"

key-files:
  created:
    - app/drizzle/0001_hard_risque.sql
    - app/drizzle/meta/0001_snapshot.json
    - app/features/db/__tests__/fixtures/v2.sqlite
  modified:
    - app/features/db/schema.ts
    - app/features/db/__tests__/schema.test.ts
    - app/features/db/__tests__/migrate.test.ts
    - app/scripts/build-fixture.mjs
    - app/drizzle/meta/_journal.json
    - app/drizzle/migrations.js

key-decisions:
  - "Extract unexported publicContentCols() helper in app/features/db/schema.ts to share syncCols() + common public content columns across verses, names_of_god, and blessings without altering exported SQLiteTable enumeration"
  - "Key sync_meta via syncCols().id = CONTENT_SYNC_META_ID ('content_sync') with no redundant key column"

patterns-established:
  - "Every mobile SQLite table including local sync_meta spreads syncCols() and passes schema.test.ts soft-delete and column guards"
  - "Fixture migrations test both v1.sqlite -> v2 upgrade path and v2.sqlite baseline continuously"

requirements-completed: [HOME-07]

coverage:
  - id: D1
    description: "Add syncCols()-compliant verses, names_of_god, blessings, and sync_meta tables plus CONTENT_SYNC_META_ID to app/features/db/schema.ts and update schema.test.ts"
    requirement: "HOME-07"
    verification:
      - kind: unit
        ref: "app/features/db/__tests__/schema.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Generate Drizzle migration 0001_hard_risque.sql with zero pending schema drift"
    requirement: "HOME-07"
    verification:
      - kind: integration
        ref: "cd app && bun run db:generate 2>&1 | grep -q 'No schema changes'"
        status: pass
    human_judgment: false
  - id: D3
    description: "Build frozen v2.sqlite fixture (no -wal/-shm) and verify v1->v2 upgrade, 10-table empty DB initialization, and onConflictDoUpdate tombstones in migrate.test.ts"
    requirement: "HOME-07"
    verification:
      - kind: integration
        ref: "app/features/db/__tests__/migrate.test.ts"
        status: pass
    human_judgment: false

# Metrics
duration: 2min
completed: 2026-11-25
status: complete
---

# Phase 02 Plan 02: Mobile Public Content Schema & v2 Migration Fixture Summary

**`syncCols()`-compliant `verses`, `names_of_god`, `blessings`, and `sync_meta` SQLite tables, Drizzle migration `0001_hard_risque.sql`, and `v1`/`v2` migration fixture verification**

## Performance

- **Duration:** 2 min
- **Started:** 2026-11-25T12:51:47Z
- **Completed:** 2026-11-25T12:53:57Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Extended `app/features/db/schema.ts` with `verses`, `namesOfGod` (`names_of_god`), `blessings`, and `syncMeta` (`sync_meta`) tables—each spreading `...syncCols()`—plus `CONTENT_SYNC_META_ID = 'content_sync'`, version indexes, and `verses_live_order_idx` (`deleted_at`, `sort_order`).
- Generated Drizzle migration `app/drizzle/0001_hard_risque.sql`, `app/drizzle/meta/0001_snapshot.json`, updated `_journal.json` and `migrations.js`, and confirmed `db:generate` reports `'No schema changes'`.
- Extended `app/scripts/build-fixture.mjs` and generated `app/features/db/__tests__/fixtures/v2.sqlite` (`journal_mode = DELETE`, zero `-wal`/`-shm` artifacts), and updated `app/features/db/__tests__/migrate.test.ts` to verify `v1 -> v2` upgrades, `v2` content/sync_meta survival, 10-table empty DB initialization, and `onConflictDoUpdate` tombstone behavior.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add syncCols()-compliant public content & sync_meta tables and generate Drizzle migration** - `d6d0e30` (feat)
2. **Task 2: Update migrate.test.ts for 10 tables and build frozen v2.sqlite fixture** - `07ccfa1` (test)

## Files Created/Modified
- `app/features/db/schema.ts` - Added `CONTENT_SYNC_META_ID`, `publicContentCols()`, `verses`, `namesOfGod`, `blessings`, and `syncMeta`
- `app/features/db/__tests__/schema.test.ts` - Updated table count assertion (`>= 10`), explicit exports check, and `CONTENT_SYNC_META_ID` check (14 tests passing)
- `app/drizzle/0001_hard_risque.sql` - Generated SQLite DDL migration for the 4 new tables and indexes
- `app/drizzle/meta/0001_snapshot.json` - Drizzle schema snapshot for migration `0001`
- `app/drizzle/meta/_journal.json` - Registered migration `0001_hard_risque`
- `app/drizzle/migrations.js` - Exported `m0001` in Expo migration bundle
- `app/scripts/build-fixture.mjs` - Populates sample `verses` (live + tombstoned), `names_of_god`, `blessings`, and `sync_meta` rows when building `v2`
- `app/features/db/__tests__/fixtures/v2.sqlite` - Frozen Phase 2 SQLite fixture database (`journal_mode = DELETE`, no `-wal`/`-shm`)
- `app/features/db/__tests__/migrate.test.ts` - Expanded `it.each(['v1', 'v2'])`, 10-table empty DB assertion, and `onConflictDoUpdate` tombstone test (4 tests passing)

## Decisions Made
- Extracted an unexported `publicContentCols()` helper in `app/features/db/schema.ts` to share `...syncCols()` plus `text`, `textFemale`, `version`, `sortOrder`, and `tagsJson` across `verses`, `namesOfGod`, and `blessings` without affecting `schema.test.ts`'s exported `SQLiteTable` enumeration.
- Keyed `sync_meta` directly on `syncCols().id = CONTENT_SYNC_META_ID` (`'content_sync'`) without a redundant key column.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Mobile SQLite tables (`verses`, `names_of_god`, `blessings`, `sync_meta`) and `0001_hard_risque.sql` are ready for `02-05` / `02-06` / `02-07` resumable first-download, atomic SQLite transaction commit, and silent 6-hour delta sync.

## Self-Check: PASSED
- Verified all 9 created/modified files exist on disk and `v2.sqlite` has no `-wal` or `-shm` sidecar files.
- Verified task commits `d6d0e30` and `07ccfa1` are ancestors of `HEAD`.
- Confirmed zero stub/TODO/FIXME markers in modified source/test files.
- Verified `cd app && bun run db:generate 2>&1 | grep -q 'No schema changes'`, `bun run test -- --project @roi/app` (7 files, 43 tests), and `bun run typecheck` all exited 0 after final edits.
