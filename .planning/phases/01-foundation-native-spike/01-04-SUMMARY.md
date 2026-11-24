---
phase: 01-foundation-native-spike
plan: 04
subsystem: shared
tags: [uuidv7, period-keys, saturday-week, seeded-pick, lww-merge, zod, epoch-ms, tdd]

requires:
  - phase: 01-foundation-native-spike
    provides: Bun isolated-linker @roi/shared workspace with Arabic core, zod 4.6.7, and dev uuid 14.0.3 (01-03)
provides:
  - Pure-TS RFC 9562 uuidv7(now, rand) generator with injected randomness (D-11)
  - Local-part date/week/month keys (Saturday week start) and frozen FNV-1a + mulberry32 seededPick
  - Per-record LWW mergeRecords(local, remote, now) with tombstone tie-break and +24h clock clamp
  - Zod 4 syncRowSchema (integer epoch ms, D-12) and personalizedTextSchema ({الاسم}-only brace check)
  - Complete @roi/shared public index surface
affects: [01-05, 01-06, 01-11, 02-backend, 03-admin, 08-sync]

actuals:
  tokens: 4279
  tasks: 3
  commits: 6
  plan_head_before: 3893343f160136efaf6c22d02c4105b1a62d6d2a
  plan_head_after: 7cd0fb442e1c94bcd2e79946033a584a133e60a6

tech-stack:
  added: []
  patterns:
    - "Injected CSPRNG callback (rand: (n: number) => Uint8Array) in uuidv7 keeping @roi/shared crypto-free"
    - "Local calendar component arithmetic (new Date(y, m, d - offset)) for DST-safe Saturday-start weekKey"
    - "Frozen FNV-1a 32-bit UTF-16 hash + mulberry32 PRNG for deterministic weekly/monthly picks"
    - "Per-record LWW merge with +86_400_000 ms future-clock clamp, tombstone tie-win, and JSON.stringify total tie-break"

key-files:
  created:
    - shared/src/ids.ts
    - shared/src/__tests__/ids.test.ts
    - shared/src/period.ts
    - shared/src/__tests__/period.test.ts
    - shared/src/merge.ts
    - shared/src/__tests__/merge.test.ts
    - shared/src/schemas.ts
    - shared/src/__tests__/schemas.test.ts
  modified:
    - shared/src/index.ts

key-decisions:
  - "Strip NAME_TOKEN occurrences then test /[{}]/ in personalizedTextSchema so unclosed braces and non-{الاسم} tokens are rejected with an Arabic error message"
  - "Guard uuidv7 against negative or non-finite timestamps and <16-byte rand buffers with RangeError"

patterns-established:
  - "All 16 @roi/shared public symbols exported from shared/src/index.ts with zero Node/RN/uuid runtime imports"

requirements-completed: [FND-08]

coverage:
  - id: D1
    description: "Pure-TS RFC 9562 uuidv7(now, rand) with injected randomness cross-checked by uuid.validate/version"
    requirement: "FND-08"
    verification:
      - kind: unit
        ref: "shared/src/__tests__/ids.test.ts#uuidv7"
        status: pass
    human_judgment: false
  - id: D2
    description: "Local-part localDateKey, Saturday-start weekKey, monthKey, and frozen seededPick verified in Cairo and Los Angeles time zones"
    requirement: "FND-08"
    verification:
      - kind: unit
        ref: "bun run test:tz"
        status: pass
    human_judgment: false
  - id: D3
    description: "Commutative, idempotent, associative mergeRecords with tombstone tie-break and +1d future-clock clamp"
    requirement: "FND-08"
    verification:
      - kind: unit
        ref: "shared/src/__tests__/merge.test.ts#mergeRecords"
        status: pass
    human_judgment: false
  - id: D4
    description: "Zod 4 syncRowSchema (integer epoch ms) and personalizedTextSchema ({الاسم}-only brace token validation) exported from @roi/shared"
    requirement: "FND-08"
    verification:
      - kind: unit
        ref: "shared/src/__tests__/schemas.test.ts"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-11-24
status: complete
---

# Phase 1 Plan 04: @roi/shared Sync Primitives & Schemas Summary

**Completed `@roi/shared` with injected-randomness `uuidv7`, DST-safe Saturday-start period keys, frozen `seededPick`, per-record LWW `mergeRecords`, and Zod 4 epoch-ms/personalization schemas passing 54 Vitest tests across Cairo and Los Angeles time zones**

## Performance

- **Duration:** 3 min
- **Started:** 2026-11-24T20:29:49Z
- **Completed:** 2026-11-24T20:33:12Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Implemented `uuidv7(now, rand)` in `shared/src/ids.ts` following RFC 9562 layout without module-level state or runtime `uuid` dependency, cross-checked against `uuid` `validate`/`version` in tests.
- Implemented `localDateKey`, `weekKey` (defaulting to Saturday `weekStart = 6` via local component arithmetic), `monthKey`, and `seededPick` (32-bit FNV-1a + `mulberry32`) in `shared/src/period.ts`, verified identical in `Africa/Cairo` and `America/Los_Angeles` including US DST transition (`2026-11-01`) and year boundary (`2026-01-01`).
- Implemented `mergeRecords` in `shared/src/merge.ts` (commutative, idempotent, associative, tombstone tie-breaker, `JSON.stringify` deterministic tie-break, `+86_400_000` ms future-clock clamp) and `syncRowSchema`/`personalizedTextSchema` in `shared/src/schemas.ts`, and exported the full 16-symbol `@roi/shared` surface from `shared/src/index.ts`.

## TDD Cycles
- **Task 1 (`uuidv7`):**
  - **RED (`6e781e3`):** Added nil-UUID stub and 4 failing tests in `shared/src/__tests__/ids.test.ts`; validated with `gsd-tools check tdd-red-evidence` (`RED_EVIDENCE_OK`: 4/4 tests failed on version/prefix/uniqueness/variation assertions).
  - **GREEN (`c1ed3f8`):** Implemented 48-bit timestamp encoding + RFC 9562 v7/variant bit-setting in `shared/src/ids.ts`; all 31 tests and `tsc -p tsconfig.json` passed; tracer gate re-verified cleanly.
- **Task 2 (`period`):**
  - **RED (`563234f`):** Added stub `shared/src/period.ts` and 10 tests in `shared/src/__tests__/period.test.ts`; validated with `gsd-tools check tdd-red-evidence` (`RED_EVIDENCE_OK`: 9 target assertions failed as expected).
  - **GREEN (`057e24b`):** Implemented `localDateKey`, `weekKey`, `monthKey`, and FNV-1a + `mulberry32` `seededPick`; all 41 tests passed in both `Africa/Cairo` and `America/Los_Angeles`, hitting all three pinned index vectors (`8`, `9`, `1`).
- **Task 3 (`merge` & `schemas`):**
  - **RED (`ac757b3`):** Added permissive stubs and 13 tests across `merge.test.ts` (7 tests) and `schemas.test.ts` (6 tests); validated `schemas.test.ts` via `gsd-tools check tdd-red-evidence` (`RED_EVIDENCE_OK`, 4/4 invalid-input tests failed) and confirmed all 7 `merge.test.ts` tests failed on `AssertionError` via `vitest run`.
  - **GREEN (`7cd0fb4`):** Implemented `mergeRecords` and Zod 4 `syncRowSchema` / `personalizedTextSchema`; all 54 tests across 5 files passed under default, Cairo, and Los Angeles time zones and `tsc -p tsconfig.json` exited 0.

## Task Commits

Each task was committed atomically:

1. **Task 1 (RED): add failing tests for uuidv7** - `6e781e3` (test)
2. **Task 1 (GREEN): implement uuidv7 with injected randomness** - `c1ed3f8` (feat)
3. **Task 2 (RED): add failing tests for period keys and seededPick** - `563234f` (test)
4. **Task 2 (GREEN): implement local period keys and seededPick** - `057e24b` (feat)
5. **Task 3 (RED): add failing tests for mergeRecords and zod schemas** - `ac757b3` (test)
6. **Task 3 (GREEN): implement mergeRecords and zod schemas** - `7cd0fb4` (feat)

## Files Created/Modified
- `shared/src/ids.ts` - `uuidv7(now, rand)` with RFC 9562 v7 layout and input bounds checks
- `shared/src/__tests__/ids.test.ts` - 4 unit tests cross-checking `uuidv7` via `uuid` package
- `shared/src/period.ts` - `localDateKey`, `weekKey` (`weekStart = 6`), `monthKey`, and FNV-1a + `mulberry32` `seededPick`
- `shared/src/__tests__/period.test.ts` - 10 unit tests covering DST/year boundaries and frozen `seededPick` vectors
- `shared/src/merge.ts` - `SyncRow` interface and per-record LWW `mergeRecords` with +24h clock clamp
- `shared/src/__tests__/merge.test.ts` - 7 unit tests verifying commutativity, idempotency, associativity, tombstone ties, future clamping, and event union
- `shared/src/schemas.ts` - `syncRowSchema`, `personalizedTextSchema`, and inferred TS types
- `shared/src/__tests__/schemas.test.ts` - 6 unit tests covering integer epoch-ms enforcement and `{الاسم}`-only brace token validation
- `shared/src/index.ts` - Re-exports all 16 `@roi/shared` public symbols and supporting types

## Decisions Made
- Checked `!/[{}]/.test(value.replaceAll(NAME_TOKEN, ''))` in `personalizedTextSchema` so unclosed braces and nested `{{الاسم}}` are rejected alongside foreign `{name}`/`{الإسم}` tokens with an Arabic error message.
- Added finite non-negative `now` and 16-byte buffer length guards in `uuidv7` throwing `RangeError` instead of silently masking malformed inputs.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Vitest's `tap`/`tap-flat` reporter emits unindented multiline YAML lines when `toEqual` fails on arrays/objects in `merge.test.ts`, causing `gsd-tools check tdd-red-evidence` to flag `Malformed TAP` on `merge.test.ts`; verified `schemas.test.ts` with `tdd-red-evidence` (`RED_EVIDENCE_OK`) and verified all 7 `merge.test.ts` `AssertionError` failures directly via `vitest run`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `@roi/shared` exports the complete 16-symbol pure-TS surface (`normalizeArabic`, `matches`, `toArabicDigits`, `formatArabicDate`, `personalize`, `NAME_TOKEN`, `uuidv7`, `localDateKey`, `weekKey`, `monthKey`, `seededPick`, `mergeRecords`, `syncRowSchema`, `personalizedTextSchema`, `TORTURE_FIXTURES`, `SEARCH_CASES`) ready for consumer workspaces (`01-05`) and mobile/DB (`01-06`, `01-11`).
- `bun.lock`, root `package.json`, and `shared/package.json` remain unchanged.

---
*Phase: 01-foundation-native-spike*
*Completed: 2026-11-24*

## Self-Check: PASSED

- All 8 created files and 1 modified file verified present on disk (`[ -f ]`)
- All 6 task commits (`6e781e3`, `c1ed3f8`, `563234f`, `057e24b`, `ac757b3`, `7cd0fb4`) verified in `HEAD` history
- `bun run test`, `bun run test:tz`, and `bun run typecheck` all exited 0 (54/54 tests passing in default, `Africa/Cairo`, and `America/Los_Angeles`)
- `bun.lock`, `shared/package.json`, and `package.json` verified unchanged (`git diff --quiet`)
- All Task 1, Task 2, and Task 3 acceptance criteria verified passing
