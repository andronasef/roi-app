---
phase: 02-content-backend-first-download
plan: 08
subsystem: database
tags: [drizzle-orm, better-sqlite3, sqlite, wal, gzip, seed-cli, audit-log, zod]

# Dependency graph
requires:
  - phase: 02-content-backend-first-download
    plan: 01
    provides: "@roi/shared seed/snapshot/delta Zod contracts, loadEnv(), resolveBackendPath(), and SWC Vitest harness"
provides:
  - "Backend SQLite Drizzle schema (content_meta, verses, names_of_god, blessings, suggestions, audit_log) with generated migrations"
  - "openBackendDatabase() WAL-mode SQLite initializer resolving migrations across ESM Vitest and CJS bundles"
  - "Local Arabic seed fixture (backend/seed/initial-content.json) without Sanity dependencies (D-05)"
  - "Atomic .json.gz snapshot builder and disk reader (rebuildAllSnapshots, readSnapshotFromDisk)"
  - "Idempotent --dry-run seed CLI (runSeed) with transactional version bumps and audit_log entries"
affects:
  - 02-03
  - 02-04
  - 02-05
  - 02-06
  - 03-admin-panel

# Actuals (#2632)
actuals:
  tokens: 19185
  tasks: 2
  commits: 2

plan_head_before: 88eb4c81adcb82dcc0c99b1e4c7aa0c5cb2dbd4f
plan_head_after: 89ae134ddf4631a48f236d01ff035d4b21e91b8b
commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Backend WAL SQLite initialization via openBackendDatabase() with resolveBackendPath('drizzle') across ESM and CJS"
    - "Atomic .json.gz snapshot generation writing <type>.json.gz.tmp before renameSync inside DATA_DIR/snapshots"
    - "Idempotent diff-based seed transaction bumping content_meta.contentVersion and recording audit_log before snapshot rebuild"

key-files:
  created:
    - backend/drizzle.config.ts
    - backend/src/db/schema.ts
    - backend/src/db/client.ts
    - backend/drizzle/0000_supreme_prowler.sql
    - backend/drizzle/meta/_journal.json
    - backend/drizzle/meta/0000_snapshot.json
    - backend/seed/initial-content.json
    - backend/src/content/snapshot-builder.ts
    - backend/src/scripts/seed.ts
    - backend/src/__tests__/db.test.ts
    - backend/src/__tests__/seed.test.ts
  modified: []

key-decisions:
  - "Pass nowMs and node:crypto randomBytes into @roi/shared uuidv7() for deterministic audit_log ID generation inside seed transactions"
  - "Guard seed CLI entrypoint using VITEST env check, require.main === module for compiled CJS, and import.meta.url fallback for ESM"
  - "Bundle @roi/shared via esbuild --alias when producing standalone dist/seed.cjs so extensionless TS imports resolve cleanly in Node CJS"

patterns-established:
  - "Backend content write boundary: validate via @roi/shared schemas before opening SQLite transaction, bump content_meta.contentVersion, write audit_log, then atomically rebuild .json.gz snapshots"
  - "Active snapshot filtering: exclude tombstones (deletedAt !== null) from .json.gz snapshots while keeping all tombstones in SQLite for delta sync"

requirements-completed: [BE-01, BE-05, BE-07]

coverage:
  - id: D1
    description: "Backend Drizzle SQLite schema (content_meta, verses, names_of_god, blessings, suggestions with (google_sub, created_at) index, audit_log), WAL client, and initial migrations with zero drift"
    requirement: "BE-05"
    verification:
      - kind: unit
        ref: "backend/src/__tests__/db.test.ts"
        status: pass
      - kind: other
        ref: "cd backend && bun run db:generate 2>&1 | grep -q 'No schema changes'"
        status: pass
    human_judgment: false
  - id: D2
    description: "Local Arabic JSON seed fixture (TORTURE_FIXTURES + 14 verses, 12 namesOfGod, 12 blessings, zero Sanity dependencies), atomic .json.gz snapshot builder, and idempotent --dry-run seed CLI"
    requirement: "BE-01"
    verification:
      - kind: unit
        ref: "backend/src/__tests__/seed.test.ts"
        status: pass
      - kind: other
        ref: "DATA_DIR=<tmp> node backend/dist/seed.cjs --dry-run && DATA_DIR=<tmp> node backend/dist/seed.cjs"
        status: pass
    human_judgment: false
  - id: D3
    description: "Transactional audit_log recording ('seed_import') and idempotent re-run skipping version bumps when no items change"
    requirement: "BE-07"
    verification:
      - kind: unit
        ref: "backend/src/__tests__/seed.test.ts#seeds atomically, logs audit_log, builds valid .json.gz snapshots, stays idempotent, and bumps version on edits"
        status: pass
    human_judgment: false

# Metrics
duration: 4min
completed: 2026-11-25
status: complete
---

# Phase 02 Plan 08: Backend Drizzle SQLite Schema, Snapshots & Seed CLI Summary

**Backend SQLite Drizzle schema (`content_meta`, `verses`, `names_of_god`, `blessings`, `suggestions`, `audit_log`), WAL database initializer, atomic `.json.gz` snapshot builder, and idempotent `--dry-run` local Arabic seed CLI with zero Sanity dependencies**

## Performance

- **Duration:** 4 min
- **Started:** 2026-11-25T12:55:19Z
- **Completed:** 2026-11-25T12:59:39Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Defined `backend/drizzle.config.ts`, `backend/src/db/schema.ts`, and `backend/src/db/client.ts` (`openBackendDatabase`) enabling WAL mode, `busy_timeout = 5000`, `foreign_keys = ON`, Drizzle migration resolution via `resolveBackendPath('drizzle')`, and singleton `content_meta` initialization, plus generated `backend/drizzle/0000_supreme_prowler.sql` with zero schema drift.
- Created `backend/seed/initial-content.json` containing all 10 `TORTURE_FIXTURES` verses (plus 4 more verses, 14 total), 12 `namesOfGod` Markdown cards, and 12 `blessings` cards passing `@roi/shared`'s `seedContentFileSchema` with zero Sanity API fields or credentials (`D-05`).
- Built `backend/src/content/snapshot-builder.ts` (`rebuildAllSnapshots`, `readSnapshotFromDisk`) producing atomic `<type>.json.gz` envelopes excluding tombstones, and `backend/src/scripts/seed.ts` (`runSeed` + CJS/ESM-safe CLI entrypoint) supporting `--dry-run`, idempotent diff detection, `audit_log` entries, and snapshot rebuilds.

## Task Commits

Each task was committed atomically:

1. **Task 1: Define backend SQLite Drizzle schema, WAL client, and generate initial migration** - `59b5444` (feat)
2. **Task 2: Create local Arabic JSON seed fixture, snapshot builder, and idempotent --dry-run seed CLI (D-05, BE-05, BE-07)** - `89ae134` (feat)

## Files Created/Modified
- `backend/drizzle.config.ts` - Drizzle Kit SQLite configuration targeting `./src/db/schema.ts` and `./drizzle`
- `backend/src/db/schema.ts` - `contentMeta`, `verses`, `namesOfGod`, `blessings`, `suggestions` (with `(googleSub, createdAt)` index), and `auditLog` tables
- `backend/src/db/client.ts` - `openBackendDatabase()` WAL initializer resolving migrations via `resolveBackendPath('drizzle')`
- `backend/drizzle/0000_supreme_prowler.sql` - Initial backend SQLite migration DDL
- `backend/drizzle/meta/_journal.json` - Drizzle migration journal
- `backend/drizzle/meta/0000_snapshot.json` - Drizzle migration schema snapshot
- `backend/seed/initial-content.json` - Local Arabic seed dataset (`14` verses, `12` namesOfGod, `12` blessings)
- `backend/src/content/snapshot-builder.ts` - `rebuildAllSnapshots()` atomic `.json.gz.tmp` -> `.json.gz` writer and `readSnapshotFromDisk()` validator
- `backend/src/scripts/seed.ts` - Idempotent JSON seed CLI (`runSeed`) with `--dry-run`, `--file`, `audit_log`, and ESM/CJS entrypoint guard
- `backend/src/__tests__/db.test.ts` - Unit tests for WAL pragmas, migrations, indexes, `content_meta`, and `suggestions` defaults (2 tests passing)
- `backend/src/__tests__/seed.test.ts` - Unit tests for `initial-content.json`, `--dry-run`, atomic seeding, `audit_log`, idempotency, version bumps, and tombstone exclusion (4 tests passing)

## Decisions Made
- Supplied explicit `(nowMs, randomBytes)` arguments to `uuidv7` from `@roi/shared` inside `seed.ts` so `audit_log` row IDs match the deterministic timestamped UUIDv7 helper across tests and CLI runs.
- Guarded CLI auto-execution in `seed.ts` using `process.env.VITEST !== 'true'`, `require.main === module` in CJS, and `import.meta.url` comparison only in ESM so importing `runSeed` in Vitest never executes `main()`, while running compiled `dist/seed.cjs` executes cleanly.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Initial test run for `seed.test.ts` caught that `@roi/shared`'s `uuidv7(now, rand)` requires explicit `(nowMs, randomBytes)` parameters; updated `seed.ts` before completing Task 2.
- Verified standalone `esbuild` CJS execution (`dist/seed.cjs`) requires aliasing `@roi/shared` to `./shared/src/index.ts` (matching `02-PATTERNS.md`'s build pattern) because `shared/src/` uses extensionless TypeScript imports.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `backend/src/db/schema.ts`, `openBackendDatabase()`, `rebuildAllSnapshots()`, `readSnapshotFromDisk()`, and `backend/seed/initial-content.json` are ready for `02-03` / `02-04` / `02-05` NestJS modules (`DrizzleModule`, `SnapshotService`, `ContentService`, `SuggestionsService`) and `02-06` Docker + backup/restore scripts.

## Self-Check: PASSED
- Verified all 11 created files exist on disk.
- Verified task commits `59b5444` and `89ae134` are ancestors of `HEAD`.
- Confirmed zero stub/TODO/FIXME markers across created files.
- Verified `cd backend && bun run db:generate 2>&1 | grep -q 'No schema changes'`, `bun run test -- --project @roi/backend` (4 files, 14 tests), `bun run typecheck`, and compiled CJS `seed.cjs` smoke execution all passed cleanly.

---
*Phase: 02-content-backend-first-download*
*Completed: 2026-11-25*
