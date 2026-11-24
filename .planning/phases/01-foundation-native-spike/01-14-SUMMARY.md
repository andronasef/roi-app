---
phase: 01-foundation-native-spike
plan: 14
subsystem: spike-screen
tags: [spike, runner, rtl, fonts, mmkv, sqlite, worklets, ts-fsrs, firebase, google-signin, widgets]

requires:
  - phase: 01-foundation-native-spike
    provides: Sync-ready DB (01-11), telemetry choke point (01-12), Android & iOS spike widgets (01-13)
provides:
  - Import-free spike constants (SPIKE_LOG_PREFIX, SPIKE_CHECK_TIMEOUT_MS) in app/constants/spike.ts
  - Pure sequential timeout-guarded check runner and summaryLine() in app/features/spike/runner.ts
  - Automatic checks (rtl, fonts, mmkv, sqlite, reanimated, fsrs, firebase, widget) and manual actions in app/features/spike/rows.tsx
  - Dev-only spike route (app/app/(dev)/spike.tsx) with summary testID, SPIKE_RESULT logging, manual controls, and from=widget banner
affects: [01-15, 01-16]

actuals:
  tasks: 3
  commits: 1
  plan_head_before: 84c4bb5
  plan_head_after: d82885b

tech-stack:
  added:
    - "react-native-css-interop@0.2.7"
  patterns:
    - "Sequential timeout-guarded check runner emitting single-line SPIKE_RESULT <platform> pass=N fail=M both to console.log and summary Text testID"
    - "Widget spike row writes incremented counter to settings before calling pushSpikeWidget so Android headless handler and pushed render match"
    - "Google Sign-In row configures iosClientId + webClientId from GOOGLE_OAUTH without offlineAccess, serverAuthCode, or extra scopes, and always signs out in finally"

key-files:
  created:
    - app/constants/spike.ts
    - app/features/spike/runner.ts
    - app/features/spike/rows.tsx
    - app/features/spike/__tests__/runner.test.ts
    - app/app/(dev)/spike.tsx
  modified:
    - app/locales/ar.json
    - app/app/index.tsx
    - app/package.json
    - bun.lock

key-decisions:
  - "Pinned pre-approved react-native-css-interop@0.2.7 directly in app/package.json (D-01 isolated-linker peer declaration) after Android Metro export resolved update.ts under bun isolated linker"
  - "Passed GOOGLE_OAUTH.iosClientId and GOOGLE_OAUTH.webClientId from app/constants/app.ts to GoogleSignin.configure because GoogleService-Info.plist omits CLIENT_ID with Firebase Auth disabled"

patterns-established:
  - "Spike screen runs checks via async useEffect cleanup flag so react-hooks/set-state-in-effect passes with zero warnings"

requirements-completed: [FND-09, REL-01]

coverage:
  - id: D1
    description: "Tested sequential spike check runner with timeout and summaryLine format"
    requirement: "FND-09"
    verification:
      - kind: test
        ref: "bun run test -- --project @roi/app"
        status: pass
    human_judgment: false
  - id: D2
    description: "Dev-only spike screen with 8 automatic integration checks, manual telemetry/Google Sign-In/widget rows, and from=widget banner"
    requirement: "FND-09, REL-01"
    verification:
      - kind: other
        ref: "cd app && bunx expo export --platform ios --output-dir dist/ios && bunx expo export --platform android --output-dir dist/android && bun run lint && cd .. && bun run typecheck"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-11-25
status: complete
---

# Phase 1 Plan 14: Dev-Only Spike Screen & Integration Runner Summary

**Built the dev-only `/(dev)/spike` screen with a tested timeout-guarded runner (`SPIKE_RESULT`), 8 automatic native checks (`rtl`, `fonts`, `mmkv`, `sqlite`, `reanimated`, `fsrs`, `firebase`, `widget`), manual telemetry/Google Sign-In/widget rows, and the `from=widget` deep-link banner**

## Accomplishments
- Created `app/constants/spike.ts` and `app/features/spike/runner.ts` (`runChecks`, `summaryLine`) with unit tests in `app/features/spike/__tests__/runner.test.ts` (4/4 passing).
- Implemented all 8 automatic native checks and manual handlers (`toggleTelemetryConsent`, `sendSpikeTestEvent`, `triggerSpikeTestCrash`, `throwSpikeSentinelError`, `runGoogleSignInCheck`) in `app/features/spike/rows.tsx`.
- Built `app/app/(dev)/spike.tsx` with `testID={summaryLine(...)}`, `useLocalSearchParams` `from=widget` banner (`فُتح من الودجت`), accessible manual rows, and a home dev link in `app/app/index.tsx`.
- Pinned `react-native-css-interop@0.2.7` in `app/package.json` (approved in `01-01-SUMMARY.md`) so Android Metro bundling under `bun` isolated linker resolves `update.ts` cleanly.

## Deviations from Plan
- Declared `react-native-css-interop@0.2.7` directly in `app/package.json` per the D-01 isolated-linker peer rule (`01-15-PLAN.md` Task 2) to fix Android Metro resolution on `app/features/widgets/update.ts`.

## Next Phase Readiness
- Wave 12 (`01-15`: native development builds on iOS Simulator + Android phone and spike verification) is unblocked.

---
*Phase: 01-foundation-native-spike*
*Completed: 2026-11-25*
