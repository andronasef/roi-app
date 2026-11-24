---
phase: 01-foundation-native-spike
plan: 11
subsystem: database-sync-schema
tags: [drizzle-sqlite, better-sqlite3, sync-cols, tombstones, append-only-events, fixtures]

requires:
  - phase: 01-foundation-native-spike
    provides: UUIDv7 + localDateKey from @roi/shared (01-04), baseline client/schema (01-07), Vitest @roi/app (01-10)
provides:
  - Six sync-ready SQLite tables (settings, prayers, prayer_events, mem_verses, review_events, gratitude_lines) built from syncCols()
  - Node-safe event and tombstone helpers (logPrayed, logReview, softDelete, prayedCount, reviewCount) and deviceClock
  - Single collapsed baseline migration (app/drizzle/0000_noisy_kulan_gath.sql) with zero schema drift
  - Frozen v1.sqlite fixture database and Node migration/schema/event test suites
affects: [01-14, 01-15, 01-16]

actuals:
  tasks: 3
  commits: 1
  plan_head_before: 5f80eae
  plan_head_after: 4f6663c

tech-stack:
  added: []
  patterns:
    - "Every user-data table includes SYNC_COLUMNS (id, created_at, updated_at, deleted_at) with epoch-ms integers and soft-delete tombstones"
    - "Event tables (*_events) carry an index on parent_id and deleted_at and omit foreign-key constraints so sync merge can arrive out of order"
    - "gratitudeId(localDate) produces deterministic 'shukr:<YYYY-MM-DD>' IDs"

key-files:
  created:
    - app/constants/db.ts
    - app/features/db/events.ts
    - app/features/db/__tests__/events.test.ts
    - app/features/db/__tests__/schema.test.ts
    - app/features/db/__tests__/migrate.test.ts
    - app/features/db/__tests__/fixtures/v1.sqlite
    - app/scripts/build-fixture.mjs
    - app/drizzle/0000_noisy_kulan_gath.sql
  modified:
    - app/features/db/schema.ts
    - app/features/db/client.ts
    - app/drizzle/meta/0000_snapshot.json
    - app/drizzle/meta/_journal.json
    - app/drizzle/migrations.js

key-decisions:
  - "No rebuild needed for better-sqlite3 under Node v26.13.0"
  - "Typed events.ts against Drizzle BaseSQLiteDatabase<'sync', unknown, typeof schema> with relative imports so both expo-sqlite and better-sqlite3 work under Node Vitest"

patterns-established:
  - "No Drizzle delete builder anywhere in app source (enforced statically in schema.test.ts)"

requirements-completed: [FND-06, FND-07]

coverage:
  - id: D1
    description: "Six sync-ready tables, append-only event counts, idempotent tombstones, zero hard-deletes"
    requirement: "FND-06, FND-07"
    verification:
      - kind: test
        ref: "bun run test -- --project @roi/app && bun run typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "Collapsed single baseline migration with no drift and frozen v1.sqlite fixture migration test"
    requirement: "FND-06"
    verification:
      - kind: test
        ref: "cd app && bun run db:generate 2>&1 | grep -q 'No schema changes' && bun run test -- --project @roi/app"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-11-25
status: complete
---

# Phase 1 Plan 11: Sync-Ready SQLite Schema, Events & Fixture DB Summary

**Completed the six-table sync-ready SQLite schema (`syncCols()`), append-only event helpers (`logPrayed`, `logReview`, `softDelete`, `prayedCount`, `reviewCount`), collapsed baseline migration, and frozen `v1.sqlite` migration test harness**

## Accomplishments
- Added `app/constants/db.ts` (`SYNC_COLUMNS`, `GRATITUDE_ID_PREFIX`, `EVENT_TABLE_SUFFIX`), expanded `app/features/db/schema.ts` to all 6 tables (`settings`, `prayers`, `prayer_events`, `mem_verses` with `fsrs` + `fsrs_model`, `review_events`, `gratitude_lines`), and exported `deviceClock` in `app/features/db/client.ts`.
- Implemented Node-safe `app/features/db/events.ts` and tests (`events.test.ts`, `schema.test.ts`, `migrate.test.ts`) passing under Node Vitest with `better-sqlite3`.
- Collapsed `app/drizzle/` to a single baseline migration (`0000_noisy_kulan_gath.sql`), verified second `db:generate` reports `No schema changes`, and generated frozen `app/features/db/__tests__/fixtures/v1.sqlite` via `app/scripts/build-fixture.mjs`.

## Next Phase Readiness
- Wave 11 (`01-14` dev spike screen) is unblocked for SQLite migration checks and settings persistence.

---
*Phase: 01-foundation-native-spike*
*Completed: 2026-11-25*
