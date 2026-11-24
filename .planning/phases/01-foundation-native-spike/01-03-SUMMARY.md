---
phase: 01-foundation-native-spike
plan: 03
subsystem: shared
tags: [bun-workspaces, isolated-linker, vitest, typescript, arabic, normalization, personalize, zod]

requires:
  - phase: 01-foundation-native-spike
    provides: Approved pinned package batch (vitest 5.1.1, typescript ~6.0.3, zod 4.6.7, uuid 14.0.3) and Egyptian monthNames
provides:
  - Bun isolated-linker workspace root with Vitest Node-only guard and strict ES2023 TypeScript config
  - Pure source-TS @roi/shared package (no build step) exporting Arabic search, digits, dates, personalize, and torture fixtures
  - Committed bun.lock containing vitest, typescript, zod, and uuid pins for downstream plans
affects: [01-04, 01-05, 01-06, 01-10, 01-11, 01-13]

actuals:
  tokens: 3591
  tasks: 2
  commits: 3
  plan_head_before: 9a54d95a2c01df300806bd17327b67b4dd1922a6
  plan_head_after: abe4eda9c84a9e787afa21d54e608c8530b4b307

tech-stack:
  added:
    - typescript@~6.0.3
    - vitest@5.1.1
    - zod@4.6.7
    - uuid@14.0.3
  patterns:
    - "Bun isolated linker (bunfig.toml) with explicit workspaces list"
    - "Source-TS workspace package exports ('.': './src/index.ts') with no build step"
    - "Platform-free Arabic normalization using explicit Unicode code-point ranges (no \\p{}, no Intl)"
    - "Vitest projects config enforcing real Node execution (throws if process.versions.bun is set)"

key-files:
  created:
    - bunfig.toml
    - package.json
    - bun.lock
    - .node-version
    - .gitignore
    - tsconfig.json
    - vitest.config.ts
    - shared/package.json
    - shared/src/index.ts
    - shared/src/arabic.ts
    - shared/src/fixtures.ts
    - shared/src/__tests__/arabic.test.ts
  modified: []

key-decisions:
  - "Kept root workspaces as ['shared'] (leaving pre-scaffolded app/ out until plan 01-06)"
  - "Applied toArabicDigits only to day and year in formatArabicDate so custom 12-month tables are preserved verbatim"

patterns-established:
  - "Root tsconfig.json restricts shared/src to lib: ['ES2023'] with strict + noUncheckedIndexedAccess and no DOM/Node types"
  - "test:tz runs @roi/shared sequentially under TZ=Africa/Cairo and TZ=America/Los_Angeles"

requirements-completed: [FND-03, FND-04, FND-08]

coverage:
  - id: D1
    description: "Bun isolated-linker workspace root and pure source-TS @roi/shared package with Vitest under real Node"
    requirement: "FND-08"
    verification:
      - kind: unit
        ref: "bun install && bun run test && bun run typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "normalizeArabic(), matches(), TORTURE_FIXTURES, and SEARCH_CASES ignoring diacritics, variants (أ/ا/إ/آ/ٱ, ة/ه, ى/ي), bidi marks, and Arabic/Persian/Latin digits"
    requirement: "FND-04"
    verification:
      - kind: unit
        ref: "shared/src/__tests__/arabic.test.ts#matches"
        status: pass
    human_judgment: false
  - id: D3
    description: "toArabicDigits() and local-part formatArabicDate() with Egyptian Arabic month names passing in Africa/Cairo and America/Los_Angeles"
    requirement: "FND-03"
    verification:
      - kind: unit
        ref: "bun run test:tz"
        status: pass
    human_judgment: false
  - id: D4
    description: "personalize() substituting NAME_TOKEN with literal $& handling, female text selection/fallback, and clean missing-name stripping"
    requirement: "FND-08"
    verification:
      - kind: unit
        ref: "shared/src/__tests__/arabic.test.ts#personalize"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-11-24
status: complete
---

# Phase 1 Plan 03: Bun Workspace & @roi/shared Arabic Core Summary

**Bun isolated-linker monorepo root and pure source-TS `@roi/shared` Arabic search, digits/dates, `personalize()`, and torture fixtures passing 27 Vitest tests under real Node across Cairo and Los Angeles time zones**

## Performance

- **Duration:** 3 min
- **Started:** 2026-11-24T20:25:07Z
- **Completed:** 2026-11-24T20:28:16Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Set up the root bun-workspace configuration (`bunfig.toml` with `linker = "isolated"`, `package.json`, `.node-version`, `.gitignore`, strict ES2023 `tsconfig.json`, and `vitest.config.ts` with a `process.versions.bun` Node-only guard) and committed `bun.lock` with approved pins (`vitest@5.1.1`, `typescript@6.0.3`, `zod@4.6.7`, `uuid@14.0.3`).
- Implemented `normalizeArabic()`, `matches()`, `TORTURE_FIXTURES` (10 cases), and `SEARCH_CASES` (11 cases) using explicit Unicode code-point ranges with no platform imports, `\p{}`, or `Intl` dependencies.
- Implemented `NAME_TOKEN`, `EGYPTIAN_MONTHS`, `toArabicDigits()`, local-date `formatArabicDate()`, and `personalize()` via RED -> GREEN TDD, verified under `TZ=Africa/Cairo` and `TZ=America/Los_Angeles`.

## TDD Cycle (Task 2)
- **RED:** Added 8 failing tests in `shared/src/__tests__/arabic.test.ts` covering `toArabicDigits`, `formatArabicDate`, `NAME_TOKEN`, and `personalize` (`e134f4e`). Verified via `vitest run --reporter=tap` + `gsd-tools check tdd-red-evidence` (`RED_EVIDENCE_OK`: 19 existing tests passed, 8 target tests failed with `AssertionError: expected undefined to be ...`).
- **GREEN:** Implemented `NAME_TOKEN`, `EGYPTIAN_MONTHS`, `toArabicDigits`, `formatArabicDate`, and `personalize` in `shared/src/arabic.ts`, exported them from `shared/src/index.ts`, and updated `shared/src/__tests__/arabic.test.ts` to static typed imports (`abe4eda`). All 27 tests passed in both `Africa/Cairo` and `America/Los_Angeles` and `tsc -p tsconfig.json` exited 0.
- **REFACTOR:** No refactoring changes required.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer - workspace + shared normalizeArabic and torture fixtures tested under Node** - `5d723c9` (feat)
2. **Task 2 (RED): add failing tests for Arabic digits, dates, and personalize** - `e134f4e` (test)
3. **Task 2 (GREEN): implement Arabic digits, dates, and personalize** - `abe4eda` (feat)

## Files Created/Modified
- `bunfig.toml` - Configures bun `linker = "isolated"`
- `package.json` - Root `roi` workspace (`shared`), Node >=24 engine, `better-sqlite3` trusted dependency, `test`/`test:tz`/`typecheck` scripts, and pinned `typescript`/`vitest`
- `bun.lock` - Committed lockfile for root and `@roi/shared` packages
- `.node-version` - Pins Node 24
- `.gitignore` - Ignores `node_modules/`, `.tmp/`, `dist/`, `coverage/`, `.expo/`, secrets, keystores, and Firebase config files
- `tsconfig.json` - Strict ES2023-only TypeScript config scoped to `shared/src`
- `vitest.config.ts` - Configures `test.projects: ['shared']` and rejects execution under Bun runtime
- `shared/package.json` - `@roi/shared` exporting `./src/index.ts`, with `zod@4.6.7` and dev `uuid@14.0.3`
- `shared/src/arabic.ts` - `normalizeArabic`, `matches`, `NAME_TOKEN`, `EGYPTIAN_MONTHS`, `toArabicDigits`, `formatArabicDate`, `personalize`
- `shared/src/fixtures.ts` - `TORTURE_FIXTURES` and `SEARCH_CASES`
- `shared/src/index.ts` - Public source-TS exports for `@roi/shared`
- `shared/src/__tests__/arabic.test.ts` - 27 unit tests covering Arabic normalization, search, digits, dates, and personalization

## Decisions Made
- Kept root `package.json` `workspaces` as `["shared"]` (leaving pre-scaffolded `app/` untouched until plan `01-06`).
- Formatted only day and year via `toArabicDigits` inside `formatArabicDate` so custom 12-month arrays containing digits or custom labels are preserved verbatim.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Initial GREEN run had 1 test assertion mismatch on custom month table `'شهر1'` because `toArabicDigits` was applied to the entire formatted date string rather than only the numeric day and year parts; scoped `toArabicDigits` to `date.getDate()` and `date.getFullYear()` and all 27 tests passed.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Plan `01-04` can now add `uuidv7`, period keys, seeded pick, `mergeRecords`, and Zod schemas to `shared/src/` without touching root config or `bun.lock` (`zod` and `uuid` are already installed).
- Plan `01-05` can wire `backend/` and `admin/` workspaces into root `package.json`, `tsconfig.json`, and `vitest.config.ts`.

---
*Phase: 01-foundation-native-spike*
*Completed: 2026-11-24*

## Self-Check: PASSED

- All 12 created files verified present on disk (`[ -f ]`)
- All 3 task commits (`5d723c9`, `e134f4e`, `abe4eda`) verified in HEAD history
- `bun run test`, `bun run test:tz`, and `bun run typecheck` all exited 0 (27/27 tests passing in Cairo and Los Angeles)
- All Task 1 & Task 2 acceptance criteria verified passing
