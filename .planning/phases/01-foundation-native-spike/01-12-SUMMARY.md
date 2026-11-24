---
phase: 01-foundation-native-spike
plan: 12
subsystem: privacy-telemetry
tags: [firebase, analytics, crashlytics, error-scrubber, privacy, rel-01]

requires:
  - phase: 01-foundation-native-spike
    provides: Firebase import isolation guard test (01-10) and app startup layout (01-09)
provides:
  - Closed parameterless event tuple (ALLOWED_EVENTS), ERROR_CODES, and PRAYER_SENTINEL in app/constants/telemetry.ts
  - Pure scrubError() in app/services/telemetry-scrub.ts stripping all non-allowlisted error messages and preserving stack frames
  - Single @react-native-firebase/* importer in app/services/telemetry.ts (track, reportError, setTelemetryConsent, telemetryStatus, testCrash, installGlobalErrorScrubber)
  - Auto-collection and screen reporting disabled in app/firebase.json
  - Startup scrubber and migration error code reporting in app/app/_layout.tsx
affects: [01-14, 01-15, 01-16]

actuals:
  tasks: 2
  commits: 1
  plan_head_before: 5f80eae
  plan_head_after: b33a191

tech-stack:
  added: []
  patterns:
    - "All @react-native-firebase/* imports confined exclusively to app/services/telemetry.ts using modular v27 APIs"
    - "ErrorUtils global handler wrapped idempotently after Crashlytics initialization so uncaught JS errors lose free-text messages"

key-files:
  created:
    - app/constants/telemetry.ts
    - app/services/telemetry-scrub.ts
    - app/services/telemetry.ts
    - app/services/__tests__/telemetry.test.ts
    - app/firebase.json
  modified:
    - app/app/_layout.tsx

key-decisions:
  - "Disabled google_analytics_adid_collection_enabled and analytics_default_allow_ad_personalization_signals in app/firebase.json after verifying both in @react-native-firebase/app/firebase-schema.json, analytics/android/build.gradle, and app/ios_config.sh"

patterns-established:
  - "Telemetry track() accepts only AllowedEvent union and passes zero parameters to logEvent"

requirements-completed: [REL-01]

coverage:
  - id: D1
    description: "Global error scrubber strips uncaught error messages including multi-line sentinels and installs at app startup"
    requirement: "REL-01"
    verification:
      - kind: test
        ref: "bun run test -- --project @roi/app && bun run typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "Closed parameterless event list, consent off by default in firebase.json, and migration error reported by code"
    requirement: "REL-01"
    verification:
      - kind: test
        ref: "bun run test -- --project @roi/app && cd app && bunx expo export --platform ios --output-dir dist/01-12/ios && bunx expo export --platform android --output-dir dist/01-12/android && bun run lint"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-11-25
status: complete
---

# Phase 1 Plan 12: Privacy-First Telemetry & Global Error Scrubber Summary

**Built the privacy-first Firebase telemetry choke point (`services/telemetry.ts`), pure message-stripping `scrubError()`, default-off `app/firebase.json`, and startup scrubber + `E_MIGRATION` reporting in `_layout.tsx`**

## Accomplishments
- Created `app/constants/telemetry.ts` (`ERROR_CODES`, `PRAYER_SENTINEL`, `ALLOWED_EVENTS`), `app/services/telemetry-scrub.ts`, and `app/services/telemetry.ts` (sole `@react-native-firebase/*` importer using RNFB 27 modular APIs).
- Created `app/firebase.json` disabling `analytics_auto_collection_enabled`, `crashlytics_auto_collection_enabled`, `google_analytics_automatic_screen_reporting_enabled`, `google_analytics_adid_collection_enabled`, and `analytics_default_allow_ad_personalization_signals`.
- Wired `installGlobalErrorScrubber()` and `reportError(ERROR_CODES.E_MIGRATION)` into `app/app/_layout.tsx` and added `app/services/__tests__/telemetry.test.ts` (7/7 passing).

## Next Phase Readiness
- Wave 11 (`01-14` dev spike screen) is unblocked for Firebase status, consent, event, crash, and sentinel rows.

---
*Phase: 01-foundation-native-spike*
*Completed: 2026-11-25*
