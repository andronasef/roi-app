---
phase: 01-foundation-native-spike
plan: 05
subsystem: infra
tags: [bun-workspaces, isolated-linker, vitest, typescript, monorepo, shared]

requires:
  - phase: 01-foundation-native-spike
    provides: Bun isolated-linker monorepo root (01-03) and complete 16-symbol @roi/shared surface (01-04)
provides:
  - "@roi/backend workspace skeleton linked to @roi/shared via workspace:*"
  - "@roi/admin workspace skeleton linked to @roi/shared via workspace:* with zero Vite/Tailwind packages"
  - "Full-surface Vitest + tsc proof that backend and admin consume @roi/shared directly from source TypeScript under real Node"
affects: [01-06, 02-backend, 03-admin]

actuals:
  tokens: 1860
  tasks: 2
  commits: 4
  plan_head_before: f7b1277e13a0645d441db02de769593b48c55350
  plan_head_after: 80f1a0cc13bc7aadd009bbc994c132d197a94ce7

tech-stack:
  added: []
  patterns:
    - "Workspace consumers declare \"@roi/shared\": \"workspace:*\" only and resolve source TS directly through bun isolated symlinks"
    - "Root tsconfig.json and vitest.config.ts enumerate consumer workspaces explicitly as each joins the monorepo"

key-files:
  created:
    - backend/package.json
    - backend/src/__tests__/shared.test.ts
    - admin/package.json
    - admin/src/__tests__/shared.test.ts
  modified:
    - package.json
    - bun.lock
    - tsconfig.json
    - vitest.config.ts

key-decisions:
  - "Kept backend/ and admin/ free of Nest, Vite, and Tailwind dependencies in Phase 1 (only @roi/shared workspace:*), leaving app/ excluded from root workspaces until plan 01-06"

patterns-established:
  - "Every workspace consumer includes a Vitest smoke test exercising all runtime @roi/shared exports under real Node and root strict tsc"

requirements-completed: [FND-08]

coverage:
  - id: D1
    description: "@roi/backend joins the bun isolated monorepo via workspace:* and executes every @roi/shared runtime export from source TS under Vitest and tsc"
    requirement: "FND-08"
    verification:
      - kind: unit
        ref: "backend/src/__tests__/shared.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "@roi/admin joins the bun isolated monorepo via workspace:* (without Vite or Tailwind) and executes every @roi/shared runtime export from source TS under Vitest and tsc"
    requirement: "FND-08"
    verification:
      - kind: unit
        ref: "admin/src/__tests__/shared.test.ts"
        status: pass
    human_judgment: false

duration: 2min
completed: 2026-11-24
status: complete
---

# Phase 1 Plan 05: Backend & Admin @roi/shared Consumers Summary

**Linked `@roi/backend` and `@roi/admin` workspace skeletons to `@roi/shared` via `workspace:*` under Bun's isolated linker, proving all runtime exports execute directly from source TypeScript under Vitest (58/58 tests) and `tsc`**

## Performance

- **Duration:** 2 min
- **Started:** 2026-11-24T20:34:26Z
- **Completed:** 2026-11-24T20:36:36Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added `backend/` (`@roi/backend`) and `admin/` (`@roi/admin`) workspace skeletons depending exclusively on `"@roi/shared": "workspace:*"` with zero external packages installed (preserving Tailwind separation and leaving `app/` untouched for plan `01-06`).
- Registered `backend` and `admin` in root `package.json` `workspaces`, `tsconfig.json` `include`, and `vitest.config.ts` `test.projects`, and updated `bun.lock` cleanly via `bun install`.
- Added full-surface smoke tests in `backend/src/__tests__/shared.test.ts` and `admin/src/__tests__/shared.test.ts` importing and calling every runtime export of `@roi/shared` (`NAME_TOKEN`, `EGYPTIAN_MONTHS`, `normalizeArabic`, `matches`, `toArabicDigits`, `formatArabicDate`, `personalize`, `TORTURE_FIXTURES`, `SEARCH_CASES`, `uuidv7`, `localDateKey`, `weekKey`, `monthKey`, `seededPick`, `mergeRecords`, `syncRowSchema.parse`, `personalizedTextSchema.parse`).

## TDD Cycles
- **Task 1 (Tracer — `@roi/backend`):**
  - **RED (`dd8eba6`):** Created `backend/package.json` without the `@roi/shared` dependency, registered `backend` in `vitest.config.ts`, and added `backend/src/__tests__/shared.test.ts`; `bun run test` failed with `Error: Cannot find package '@roi/shared'` as expected under Bun's isolated linker.
  - **GREEN (`d93145d`):** Added `"@roi/shared": "workspace:*"` to `backend/package.json`, added `"backend"` to `package.json` `workspaces` and `"backend/src"` to `tsconfig.json`, and ran `bun install`; `bun run test` (56/56 across `@roi/shared` and `@roi/backend`) and `bun run typecheck` exited 0.
- **Task 2 (`@roi/admin`):**
  - **RED (`86052a7`):** Created `admin/package.json` without the `@roi/shared` dependency, registered `admin` in `vitest.config.ts`, and added `admin/src/__tests__/shared.test.ts`; `bun run test` failed on `@roi/admin` with `Error: Cannot find package '@roi/shared'`.
  - **GREEN (`80f1a0c`):** Added `"@roi/shared": "workspace:*"` to `admin/package.json`, added `"admin"` to `package.json` `workspaces` and `"admin/src"` to `tsconfig.json`, and ran `bun install`; `bun run test` (58/58 across `@roi/shared`, `@roi/backend`, and `@roi/admin`), `bun run test:tz`, and `bun run typecheck` all exited 0.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): add failing @roi/shared smoke test for backend** - `dd8eba6` (test)
2. **Task 1 (GREEN): link backend workspace to @roi/shared** - `d93145d` (feat)
3. **Task 2 (RED): add failing @roi/shared smoke test for admin** - `86052a7` (test)
4. **Task 2 (GREEN): link admin workspace to @roi/shared** - `80f1a0c` (feat)

## Files Created/Modified
- `backend/package.json` - `@roi/backend` workspace manifest depending on `@roi/shared: workspace:*`
- `backend/src/__tests__/shared.test.ts` - Full-surface `@roi/shared` runtime import and call proof for backend
- `admin/package.json` - `@roi/admin` workspace manifest depending on `@roi/shared: workspace:*` (no Vite/Tailwind)
- `admin/src/__tests__/shared.test.ts` - Full-surface `@roi/shared` runtime import and call proof for admin
- `package.json` - Added `backend` and `admin` to root `workspaces`
- `bun.lock` - Updated workspace lockfile links via `bun install`
- `tsconfig.json` - Added `backend/src` and `admin/src` to `include`
- `vitest.config.ts` - Appended `backend` and `admin` to `test.projects`

## Decisions Made
- Kept `backend/` and `admin/` free of Nest, Vite, and Tailwind packages in Phase 1 and left pre-scaffolded `app/` untouched until plan `01-06`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Both `@roi/backend` and `@roi/admin` consume `@roi/shared` directly from source TypeScript under Vitest and strict `tsc`, leaving Phases 2 and 3 ready to add NestJS and Vite/Tailwind 4 cleanly.
- Ready for plan `01-06` to bring `app/` into the workspace.

---
*Phase: 01-foundation-native-spike*
*Completed: 2026-11-24*

## Self-Check: PASSED

- All 4 created files and 4 modified files verified present on disk (`[ -f ]`)
- All 4 task commits (`dd8eba6`, `d93145d`, `86052a7`, `80f1a0c`) verified in `HEAD` history
- `bun install`, `bun run test` (7 files, 58/58 tests across `@roi/shared`, `@roi/backend`, `@roi/admin`), `bun run test:tz` (54/54 in `Africa/Cairo` and `America/Los_Angeles`), and `bun run typecheck` all exited 0
- `app/` directory verified untouched and zero external packages added to `bun.lock`
- All Task 1 and Task 2 acceptance criteria verified passing
