---
phase: 02-content-backend-first-download
plan: 06
subsystem: ui
tags: [react-native, nativewind, reanimated, expo-network, expo-router, react-query, rtl, vitest]

# Dependency graph
requires:
  - phase: 02-content-backend-first-download
    provides: "Resumable 3-stage first-download engine, silent 6-hour delta sync, and library count queries from 02-04"
provides:
  - "Egyptian Arabic 02-UI-SPEC.md copywriting strings in app/locales/ar.json"
  - "Parameterless telemetry events first_download_started and first_download_completed in ALLOWED_EVENTS"
  - "ContentGate root wrapper with offline gate, Reanimated 3-stage progress bar, auto-resume, silent 6h delta trigger, and DEV_TOOLS_ENABLED (dev) bypass"
  - "LibraryReadyView home view with Arabic-Indic counts, preserved theme switcher, and DEV_TOOLS_ENABLED nav links"
  - "Root _layout.tsx QueryClientProvider + ContentGate wiring and index.tsx LibraryReadyView wiring"
affects:
  - 02-07
  - 04-onboarding-home
  - 05-daily-bread

# Actuals (#2632)
actuals:
  tokens: 8679
  tasks: 2
  commits: 2

plan_head_before: 2cfdf7b82427c53d3ff80a04b0105f30fec1a54e
plan_head_after: c6bbb34c891178027bec6934a724d48206bf771a
commits: 2

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure gate-state helpers (shouldBypassContentGate, deriveGateMode, getStageLabel, getStageProgressFraction) exported from ContentGate.tsx for Node/Vitest verification"
    - "Flexbox flex-row progress bar track with Reanimated ReduceMotion.System width timing expanding from logical start edge in forced RTL without left-*/right-*"
    - "useNetworkState + getNetworkStateAsync connectivity observation interrupting active requests promptly on drop to retain disk staging and auto-resume on reconnect"

key-files:
  created:
    - app/features/sync/ContentGate.tsx
    - app/features/sync/LibraryReadyView.tsx
    - app/features/sync/__tests__/content-gate.test.ts
  modified:
    - app/locales/ar.json
    - app/constants/telemetry.ts
    - app/app/_layout.tsx
    - app/app/index.tsx

key-decisions:
  - "Used relative internal imports inside ContentGate.tsx so Vitest Node tests can mock RN/Expo modules directly without @/ alias loader errors while staying Metro-compatible"
  - "Interrupted in-flight fetchSnapshot requests via AbortController when useNetworkState detects an offline transition so paused state + auto-resume notice surface immediately instead of waiting for the 15s request timeout"

patterns-established:
  - "ContentGate bypasses only when DEV_TOOLS_ENABLED && segments[0] === '(dev)' so roi://spike and roi://torture remain reachable offline"
  - "All Phase 2 UI components enforce logical RTL Tailwind utilities, MAX_FONT_SIZE_MULTIPLIER=1.3 on headings/counts, min-h-[44px] min-w-[44px] touch targets, and zero percentages/byte counters"

requirements-completed: [HOME-06, HOME-07]

coverage:
  - id: D1
    description: "Egyptian Arabic copywriting strings in app/locales/ar.json and parameterless download telemetry events in ALLOWED_EVENTS"
    requirement: "HOME-06"
    verification:
      - kind: unit
        ref: "app/features/sync/__tests__/content-gate.test.ts"
        status: pass
      - kind: unit
        ref: "app/services/__tests__/telemetry.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "ContentGate pure state derivation (ready, offline_empty, downloading, paused, error), 3-stage calm label mapping, (dev) bypass, and _layout.tsx QueryClientProvider + ContentGate wiring"
    requirement: "HOME-07"
    verification:
      - kind: unit
        ref: "app/features/sync/__tests__/content-gate.test.ts"
        status: pass
      - kind: unit
        ref: "app/__tests__/guards.test.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "LibraryReadyView Arabic-Indic counts, theme switcher, dev links, RTL accessibility lint, TypeScript, and iOS/Android Expo bundle exports"
    requirement: "HOME-06"
    verification:
      - kind: other
        ref: "cd app && bun run lint && bunx expo export --platform ios --output-dir dist/ios && bunx expo export --platform android --output-dir dist/android"
        status: pass
    human_judgment: false
  - id: D4
    description: "Arabic copy in Offline Gate, download progress, and LibraryReadyView wraps cleanly at maxFontSizeMultiplier=1.3 without clipping or horizontal overflow on iPhone 18 Pro Simulator and RMX5106"
    requirement: "HOME-07"
    verification: []
    human_judgment: true
    rationale: "Visual RTL layout, font scaling wrap behavior, and live connectivity drop/resume UX require physical/simulator device inspection in 02-07"

# Metrics
duration: 5min
completed: 2026-11-25
status: complete
---

# Phase 02 Plan 06: Mobile First-Download Gate & Ready Screen Summary

**Egyptian Arabic offline gate, Reanimated 3-stage resumable download progress (`ContentGate`), silent 6h delta sync trigger, `(dev)` deep-link bypass, and `"المكتبة جاهزة"` ready screen (`LibraryReadyView`) verified across Vitest, ESLint a11y, TypeScript, and iOS/Android Expo exports**

## Performance

- **Duration:** 5 min
- **Started:** 2026-11-25T13:16:24Z
- **Completed:** 2026-11-25T13:21:25Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Added the 14 `02-UI-SPEC.md` Egyptian Arabic strings (`offlineGateTitle`, `offlineGateBody`, `retryButton`, `downloadingTitle`, stage labels, pause/error notices, and `"المكتبة جاهزة"` labels) to `app/locales/ar.json` with zero percentages, byte counters, or technical strings, and registered parameterless `first_download_started` / `first_download_completed` events in `app/constants/telemetry.ts`.
- Built `app/features/sync/ContentGate.tsx` with `shouldBypassContentGate` (`D-13`), `deriveGateMode`, `getStageLabel`, `getStageProgressFraction`, Reanimated `ReduceMotion.System` logical-`start` progress bar, `expo-network` auto-resume and prompt offline abort-to-`paused`, and silent background 6-hour delta sync (`runDeltaSyncIfDue`), and wired `<QueryClientProvider>` + `<ContentGate>` inside `app/app/_layout.tsx` behind `useMigrations`.
- Built `app/features/sync/LibraryReadyView.tsx` showing `"المكتبة جاهزة"` with `CheckCircle2`, Arabic-Indic counts via `toArabicDigits()`, preserved Phase 1 theme switcher (`نظام` / `فاتح` / `داكن`), and `DEV_TOOLS_ENABLED` dev links, wired into `app/app/index.tsx` and verified with `expo lint --max-warnings 0`, `tsc`, `vitest`, and `expo export` for both iOS and Android.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Egyptian Arabic copy, telemetry allowlist events, build ContentGate with Reanimated progress + (dev) bypass, and wire _layout.tsx** - `80a551b` (feat)
2. **Task 2: Build LibraryReadyView ("المكتبة جاهزة") with Arabic-Indic counts and wire app/app/index.tsx + Expo bundle verify** - `c6bbb34` (feat)

## Files Created/Modified
- `app/locales/ar.json` - Added exact `02-UI-SPEC.md` Egyptian Arabic strings for Offline Gate, 3 download stages, pause/error notices, and `"المكتبة جاهزة"` counts
- `app/constants/telemetry.ts` - Added `'first_download_started'` and `'first_download_completed'` to `ALLOWED_EVENTS`
- `app/features/sync/ContentGate.tsx` - Implemented first-launch offline gate, Reanimated 3-stage progress bar, `useNetworkState` auto-resume, silent 6h delta sync trigger, and `(dev)` bypass
- `app/features/sync/LibraryReadyView.tsx` - Implemented `"المكتبة جاهزة"` screen with Arabic-Indic library counts, theme switcher, and `DEV_TOOLS_ENABLED` dev links
- `app/app/_layout.tsx` - Wrapped `<Stack />` inside `<QueryClientProvider>` and `<ContentGate>` after `useMigrations` succeeds
- `app/app/index.tsx` - Rendered `<LibraryReadyView />` as the root home screen
- `app/features/sync/__tests__/content-gate.test.ts` - Added 6 unit tests covering `shouldBypassContentGate`, `deriveGateMode`, stage label/fraction mapping, exact `ar.json` strings, telemetry events, and `_layout.tsx` wiring

## Decisions Made
- Used relative internal imports inside `ContentGate.tsx` so Vitest Node tests can mock React Native/Expo dependencies and import pure state helpers directly from `ContentGate.tsx` without `@/` alias resolution failures.
- Aborted active snapshot HTTP requests when `useNetworkState` reports an offline transition so the UI enters `'paused'` immediately with the auto-resume notice instead of hanging until the 15s request timeout.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 2 mobile UI (`ContentGate` + `LibraryReadyView`) is wired and cleanly exports for iOS and Android.
- Ready for `02-07` end-to-end integration and device/simulator visual verification (including the `long-text` `maxFontSizeMultiplier={1.3}` wrap check and live offline/resume testing).

---
*Phase: 02-content-backend-first-download*
*Completed: 2026-11-25*

## Self-Check: PASSED
- Verified all 7 created/modified source files and `02-06-SUMMARY.md` exist on disk.
- Verified task commits `80a551b` and `c6bbb34` are ancestors of `HEAD`.
- Verified `bun run test -- --project @roi/app` (11 files, 62 tests), `bun run typecheck`, `cd app && bun run lint` (`expo lint --max-warnings 0`), `bunx expo export --platform ios --output-dir dist/ios`, and `bunx expo export --platform android --output-dir dist/android` all exited 0 after final edits.
