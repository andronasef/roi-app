---
phase: 04-onboarding-personalization-identity
plan: 02
subsystem: database
tags: [drizzle, sqlite, migrations, expo-clipboard, react-native-marked, leyaana, favorites]

requires:
  - phase: 04-onboarding-personalization-identity
    provides: Owner-approved react-native-marked@8.3.4 and expo-clipboard@~58.0.4 package manifest (04-01-SUMMARY.md)
  - phase: 02-content-backend-first-download
    provides: Public content tables (verses, names_of_god, blessings) and sync_meta schema
provides:
  - Installed react-native-marked@8.3.4 and expo-clipboard@~58.0.4 with native expo prebuild autolinking
  - Drizzle 0002 migration adding syncable verse_assignments, favorites, and personal_items tables
  - Deterministic weekly/monthly non-repeat verse assignment engine with snapshot history and favorite tombstone helpers
affects: [04-03, 04-04, 04-05, 04-06, 04-07, 08-drive-sync]

actuals:
  tokens: 12772
  tasks: 2
  commits: 2
plan_head_before: 57413fc31919aede4da8b607cfcd4c89c1f0c740
plan_head_after: 52bd24b1d4c0c9a221674623e9fe049347782b1e
commits: 2

tech-stack:
  added: [react-native-marked@8.3.4, expo-clipboard@~58.0.4]
  patterns:
    - "Minimum-count tier non-repeat cycle across weekly and monthly verse_assignments slots"
    - "Snapshot ref/text/textFemale persistence in verse_assignments surviving public content edits and soft-deletes"
    - "Deterministic favorite IDs (fav:${source}:${kind}:${itemId}) with onConflictDoUpdate revival and softDelete tombstoning"

key-files:
  created:
    - app/drizzle/0002_tiresome_mojo.sql
    - app/drizzle/meta/0002_snapshot.json
    - app/features/leyaana/assignments.ts
    - app/features/leyaana/__tests__/assignments.test.ts
  modified:
    - app/package.json
    - bun.lock
    - app/constants/db.ts
    - app/features/db/schema.ts
    - app/features/db/events.ts
    - app/features/db/__tests__/migrate.test.ts
    - app/features/db/__tests__/schema.test.ts
    - app/drizzle/meta/_journal.json
    - app/drizzle/migrations.js

key-decisions:
  - "Track shared seen-counts per verseId across both weekly and monthly verse_assignments and select from the minimum-count live tier so the pool resets cleanly without deleting history rows."
  - "Reuse softDelete(db, clock, favorites, id) inside toggleFavorite for unstarring and onConflictDoUpdate for reviving tombstoned favorites."

patterns-established:
  - "Use relative imports in app/features/leyaana/*.ts so Vitest runs cleanly without @/ path aliases."
  - "All Phase 4 local user tables spread syncCols() and enforce soft-delete tombstones via schema.test.ts."

requirements-completed: [ME-01, ME-02, ME-03]

coverage:
  - id: D1
    description: "react-native-marked@8.3.4 and expo-clipboard@~58.0.4 pinned in app/package.json and autolinked via expo prebuild --clean --no-install"
    verification:
      - kind: other
        ref: "cd app && CI=1 bunx expo prebuild --clean --no-install"
        status: pass
    human_judgment: false
  - id: D2
    description: "Drizzle migration 0002 adds syncable verse_assignments, favorites, and personal_items tables and upgrades v1/v2 fixtures cleanly to 13 tables"
    verification:
      - kind: unit
        ref: "app/features/db/__tests__/migrate.test.ts#migrates copied fixture %s to latest while keeping all rows, tombstones, and events intact"
        status: pass
      - kind: unit
        ref: "app/features/db/__tests__/schema.test.ts#defines all thirteen Phase 1, Phase 2, and Phase 4 tables"
        status: pass
    human_judgment: false
  - id: D3
    description: "Weekly (Saturday-start weekKey) and monthly (monthKey) deterministic non-repeat verse assignment engine with shared cycle reset and snapshot durability"
    requirement: ME-01
    verification:
      - kind: unit
        ref: "app/features/leyaana/__tests__/assignments.test.ts#returns null when live verses pool is empty and stays stable Saturday through Friday"
        status: pass
      - kind: unit
        ref: "app/features/leyaana/__tests__/assignments.test.ts#shares seen history across weekly and monthly slots and resets cleanly after exhausting pool"
        status: pass
    human_judgment: false
  - id: D4
    description: "Monthly deterministic non-repeat verse selection sharing the seen pool with weekly assignments"
    requirement: ME-02
    verification:
      - kind: unit
        ref: "app/features/leyaana/__tests__/assignments.test.ts#shares seen history across weekly and monthly slots and resets cleanly after exhausting pool"
        status: pass
    human_judgment: false
  - id: D5
    description: "Persisted verse_assignments snapshots preserve historical ref, text, and textFemale across public verse edits and soft-deletes, plus deterministic favorite toggles"
    requirement: ME-03
    verification:
      - kind: unit
        ref: "app/features/leyaana/__tests__/assignments.test.ts#snapshots ref, text, and textFemale so history survives source verse edits and soft deletes"
        status: pass
      - kind: unit
        ref: "app/features/leyaana/__tests__/assignments.test.ts#toggles favorites with deterministic IDs, tombstones on unstar, and revives on conflict"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-11-25
status: complete
---

# Phase 04 Plan 02: Schema 0002, Packages & Verse Assignment Engine Summary

**Installed `react-native-marked@8.3.4` and `expo-clipboard@~58.0.4` with native prebuild, generated Drizzle `0002` migration (`verse_assignments`, `favorites`, `personal_items`), and implemented the Saturday-start weekly/monthly non-repeat verse assignment engine and favorite helpers**

## Performance

- **Duration:** 3 min
- **Started:** 2026-11-25T22:58:17+02:00
- **Completed:** 2026-11-25T23:01:00+02:00
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Pinned `react-native-marked@8.3.4` and `expo-clipboard@~58.0.4` in `app/package.json`, updated `bun.lock`, and ran `CI=1 bunx expo prebuild --clean --no-install` so native `app/ios` and `app/android` autolink `expo-clipboard`.
- Extended `app/constants/db.ts`, `app/features/db/schema.ts`, and `app/features/db/events.ts` with `verseAssignments`, `favorites`, and `personalItems` (all spreading `syncCols()` with soft-delete tombstones) and generated Drizzle `0002_tiresome_mojo.sql`.
- Implemented `assignmentId`, `getOrAssignPeriodVerse`, `listVerseHistory`, `favoriteId`, `toggleFavorite`, and `listLiveFavoriteIds` in `app/features/leyaana/assignments.ts` with full Vitest coverage in `app/features/leyaana/__tests__/assignments.test.ts`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install approved packages, generate Drizzle 0002 migration (verse_assignments, favorites, personal_items), and run expo prebuild** - `25efa75` (feat)
2. **Task 2: Implement deterministic non-repeat weekly/monthly verse assignment engine and favorites toggle helpers** - `52bd24b` (feat)

## Files Created/Modified
- `app/package.json` - Added `react-native-marked@8.3.4` and `expo-clipboard@~58.0.4`.
- `bun.lock` - Updated lockfile for new packages.
- `app/constants/db.ts` - Added `FAVORITE_ID_PREFIX` (`fav:`) and `ASSIGNMENT_ID_PREFIX` (`assign:`).
- `app/features/db/schema.ts` - Added `verseAssignments`, `favorites`, and `personalItems` syncable tables and indexes.
- `app/features/db/events.ts` - Extended `SyncTable` union and `softDelete` switch for the 3 new tables.
- `app/drizzle/0002_tiresome_mojo.sql`, `app/drizzle/meta/0002_snapshot.json`, `app/drizzle/meta/_journal.json`, `app/drizzle/migrations.js` - Generated Drizzle 0002 migration artifacts.
- `app/features/db/__tests__/migrate.test.ts` - Updated empty-DB schema table expectation to all 13 sorted tables.
- `app/features/db/__tests__/schema.test.ts` - Verified all 13 schema tables expose `syncCols()` and zero hard `.delete()` calls exist.
- `app/features/leyaana/assignments.ts` - Weekly/monthly deterministic non-repeat verse assignment engine, snapshot history query, and deterministic favorite toggles.
- `app/features/leyaana/__tests__/assignments.test.ts` - Unit tests for empty pool, Saturday-start week stability, shared weekly/monthly cycle reset, snapshot durability, and favorite tombstones.

## Decisions Made
- Tracked per-verse assignment counts across both `weekly` and `monthly` rows in `verse_assignments` and picked from the minimum-count tier of live `verses`, allowing clean cycle resets without deleting or hiding history rows.
- Reused `softDelete(db, clock, favorites, id)` from `app/features/db/events.ts` when unstarring and `onConflictDoUpdate` when re-starring.

## Deviations from Plan
None — plan executed exactly as written. (Note: `bunx --cwd app` treats `--cwd` as invalid before package name, so `cd app && CI=1 bunx expo prebuild --clean --no-install` and `cd app && bun run lint` were used in `app/`.)

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Drizzle `0002` syncable schema, approved native dependencies, and `assignments.ts` primitives are ready for Wave 3 plans (`04-03`..`04-07`).
- Native dev-client rebuild for `expo-clipboard` will run during end-of-phase device verification as planned.

## Self-Check: PASSED
- Verified all 13 created/modified files exist on disk.
- Verified commits `25efa75` and `52bd24b` are ancestors of `HEAD`.
- Verified `cd app && bun run db:generate 2>&1 | grep -q 'No schema changes'`, `bun run test -- --project @roi/app` (12 files / 73 tests passed), `bun run typecheck` (passed), and `cd app && bun run lint` (passed with 0 warnings).

---
*Phase: 04-onboarding-personalization-identity*
*Completed: 2026-11-25*
