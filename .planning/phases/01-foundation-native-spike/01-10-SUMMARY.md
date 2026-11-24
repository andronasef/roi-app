---
phase: 01-foundation-native-spike
plan: 10
subsystem: dev-torture-guards
tags: [rtl, arabic-search, torture-fixtures, vitest, static-guards, dev-gate]

requires:
  - phase: 01-foundation-native-spike
    provides: Shared Arabic module + fixtures (01-03), bundled fonts + Scripture slider + Reusables Dialog & Select (01-09)
provides:
  - Dev-gated (dev) layout redirecting to home unless __DEV__ or EXPO_PUBLIC_DEV_TOOLS === '1'
  - Torture-fixtures screen (app/app/(dev)/torture.tsx) with Arabic search, font candidate switch, D-06 slider, digits/date, Dialog and Select
  - Vitest @roi/app project registration in root vitest.config.ts
  - Static repository guard suite in app/__tests__/guards.test.ts
affects: [01-11, 01-12, 01-13, 01-14, 01-15, 01-16]

actuals:
  tasks: 2
  commits: 2
  plan_head_before: 273e11e
  plan_head_after: 53b329f

tech-stack:
  added: []
  patterns:
    - "DEV_TOOLS_ENABLED = __DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === '1' inlineable gate"
    - "Static repository guards enforced in Node Vitest for Firebase isolation, RTL classes, Tailwind 3 isolation, shared purity, auth privacy flags, and secret tracking"

key-files:
  created:
    - app/app/(dev)/_layout.tsx
    - app/app/(dev)/torture.tsx
    - app/__tests__/guards.test.ts
  modified:
    - app/constants/app.ts
    - app/locales/ar.json
    - app/app/index.tsx
    - vitest.config.ts

key-decisions:
  - "Exposed dev torture screen at ROUTES.torture ('/torture') under the (dev) Expo Router route group"
  - "Anchored Tailwind major-version isolation checks in app/package.json (major 3) and admin/package.json (isolated until Tailwind 4 is declared)"

patterns-established:
  - "All dev-only routes live under app/app/(dev)/ guarded by DEV_TOOLS_ENABLED"

requirements-completed: [FND-03, FND-04]

coverage:
  - id: D1
    description: "Dev-gated torture screen filters TORTURE_FIXTURES with Arabic search, toggles fonts, scales Scripture, formats Arabic-Indic digits/dates, and exercises Dialog/Select"
    requirement: "FND-03, FND-04"
    verification:
      - kind: other
        ref: "cd app && bunx expo export --platform ios --output-dir dist/ios && bunx expo export --platform android --output-dir dist/android && bun run lint && cd .. && bun run typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "@roi/app registered in Vitest and static repository guard tests pass"
    requirement: "FND-03, FND-04"
    verification:
      - kind: test
        ref: "bun run test -- --project @roi/app && bun run test && bun run typecheck"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-11-25
status: complete
---

# Phase 1 Plan 10: Torture Screen & Static Repository Guards Summary

**Built the dev-gated Arabic torture-fixtures screen (`/(dev)/torture`), added a dev-only link on home, registered `@roi/app` in Vitest, and added the 7-test static guard suite**

## Performance

- **Duration:** 5 min
- **Completed:** 2026-11-25
- **Tasks:** 2
- **Files modified:** 7 (3 created, 4 modified)

## Accomplishments
- Added `DEV_TOOLS_ENABLED`, `SAMPLE_NAME` (`مريم`), and `ROUTES.torture` in `app/constants/app.ts`, gated `app/app/(dev)/_layout.tsx`, and added a dev-only link from `app/app/index.tsx`.
- Built `app/app/(dev)/torture.tsx` featuring Arabic search (`matches` from `@roi/shared`), `personalize()` sample, `Amiri` and `Scheherazade New` candidate switch + bold samples, `ScriptureSizeSlider`, `toArabicDigits(1234567890)` + `formatArabicDate(new Date())`, and Reusables `Dialog` + `Select`.
- Registered `'app'` in root `vitest.config.ts` and created `app/__tests__/guards.test.ts` enforcing Firebase import isolation, zero physical-direction/tracking classes, Tailwind 3 vs admin isolation, `@roi/shared` purity, `(dev)` route gating, zero `offlineAccess`/`serverAuthCode`/`setUserId`/`setUserProperty`/`allowFontScaling={false}`, and zero tracked secrets.

## Task Commits

1. **Task 1: Tracer - dev gate and torture-fixtures screen** - `628324e` (feat)
2. **Task 2: Register @roi/app in Vitest and add static guard tests** - `53b329f` (test)

## Deviations from Plan
None.

## Next Phase Readiness
- Wave 10 (`01-11` DB schema/migrations/fixture, `01-12` telemetry/scrubber, `01-13` Android/iOS widgets) is unblocked and ready to run in parallel.

---
*Phase: 01-foundation-native-spike*
*Completed: 2026-11-25*
