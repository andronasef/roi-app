---
phase: 01-foundation-native-spike
plan: 01
subsystem: infra
tags: [package-legitimacy, identifiers, governance, owner-gate]

requires: []
provides:
  - Approved pinned package and CLI list for Phase 1
  - Fixed iOS bundleIdentifier, Android androidPackage, iOS App Group, URL scheme, and Arabic monthNames
affects: [01-02, 01-03, 01-04, 01-05, 01-06, 01-07, 01-09, 01-12, 01-13, 01-15]

actuals:
  tokens: 0
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Exact package pinning from approved Phase 1 table before any bun install"

key-files:
  created:
    - .planning/phases/01-foundation-native-spike/01-01-SUMMARY.md
  modified: []

key-decisions:
  - "Owner approved full Phase 1 package and CLI table (including recency-SUS packages and D-09 fallbacks)"
  - "Owner fixed bundleIdentifier and androidPackage to com.increasinglabs.roi (confirmed spelling with s)"
  - "Owner requested scaffolding app/ with create-expo-app latest default template first before running remaining plans"

patterns-established:
  - "Identifiers recorded verbatim in 01-01-SUMMARY.md as single source of truth for Firebase, Apple Developer, and app.json"

requirements-completed: [FND-09]

coverage:
  - id: D1
    description: "Batched package-legitimacy approval of all Phase 1 packages and CLIs before first bun install"
    requirement: "FND-09"
    verification:
      - kind: manual_procedural
        ref: "Owner approved batched package table in chat"
        status: pass
    human_judgment: true
    rationale: "Owner must verify npm package legitimacy and approve exact pins before any install runs"
  - id: D2
    description: "Fixed app identifiers (bundleIdentifier, androidPackage, appGroup, scheme) and 12 Arabic month names"
    requirement: "FND-09"
    verification:
      - kind: manual_procedural
        ref: "Owner confirmed com.increasinglabs.roi, group.com.increasinglabs.roi, roi, and Egyptian Gregorian monthNames"
        status: pass
    human_judgment: true
    rationale: "Identifiers are one-way values baked into Firebase, OAuth clients, Apple Developer, and store listings"

duration: 12min
completed: 2026-11-24
status: complete
---

# Phase 1 Plan 01: Owner Gate Summary

**Approved all Phase 1 pinned packages and CLIs, and fixed `com.increasinglabs.roi` identifiers and Egyptian Arabic month names**

## Performance

- **Duration:** 12 min
- **Started:** 2026-11-24T20:10:35Z
- **Completed:** 2026-11-24T20:23:30Z
- **Tasks:** 2
- **Files modified:** 1 (`.planning/phases/01-foundation-native-spike/01-01-SUMMARY.md`)

## Accomplishments

- Owner approved the entire Phase 1 package and CLI batch before any `bun install`, `bun add`, or `bunx` execution.
- Owner settled the permanent app identifiers (`com.increasinglabs.roi`) and confirmed the 12 Egyptian Gregorian month names for FND-03 date formatting.

## Identifiers

bundleIdentifier: com.increasinglabs.roi
androidPackage: com.increasinglabs.roi
appGroup: group.com.increasinglabs.roi
scheme: roi
monthNames: يناير، فبراير، مارس، أبريل، مايو، يونيو، يوليو، أغسطس، سبتمبر، أكتوبر، نوفمبر، ديسمبر

## Approved Packages

### Root, shared, and consumer skeletons (plans 01-03, 01-04, 01-05)
- `vitest`: `5.1.1`
- `typescript`: `~6.0.3`
- `zod`: `4.6.7`
- `uuid`: `14.0.3` (dev only, test cross-check)

### Mobile, Expo-tracked (`bunx expo install`, SDK 58 pins, plans 01-06 and 01-09)
- `expo`: `~58.0.26`
- `react`: `19.3.0`
- `react-native`: `0.88.1`
- `expo-router`: `~58.0.32`
- `expo-linking`: `~58.0.17`
- `expo-constants`: `~58.0.16`
- `expo-status-bar`: `~58.0.5`
- `expo-dev-client`: `~58.0.21`
- `expo-build-properties`: `~58.0.12`
- `expo-localization`: `~58.0.5`
- `expo-font`: `~58.0.12`
- `expo-sqlite`: `~58.0.18`
- `expo-crypto`: `~58.0.8`
- `expo-widgets`: `~58.0.29`
- `@expo/ui`: `~58.0.29`
- `react-native-reanimated`: `4.7.1`
- `react-native-worklets`: `0.13.0`
- `react-native-gesture-handler`: `~3.3.0`
- `react-native-screens`: `~4.30.1`
- `react-native-safe-area-context`: `~5.11.1`
- `react-native-svg`: `15.16.0`
- `react-native-mmkv`: `4.3.2`
- `react-native-nitro-modules`: `0.37.2`
- `@react-native-community/slider`: `5.2.1`
- `eslint-config-expo`: `~58.0.4` (dev)

### Mobile, exact pins with `bun add` (plan 01-06)
- `nativewind`: `4.2.7` (pulls `react-native-css-interop` `0.2.7`)
- `tailwindcss`: `3.4.19`
- `drizzle-orm`: `0.45.4`
- `@react-native-firebase/app`: `27.1.1`
- `@react-native-firebase/analytics`: `27.1.1`
- `@react-native-firebase/crashlytics`: `27.1.1`
- `@react-native-google-signin/google-signin`: `17.0.0`
- `react-native-android-widget`: `0.26.0`
- `ts-fsrs`: `6.0.1`
- `drizzle-kit`: `0.31.11` (dev)
- `babel-plugin-inline-import`: `3.0.0` (dev)
- `better-sqlite3`: `13.2.0` (dev)
- `eslint`: `9.39.5` (dev)
- `eslint-plugin-react-native-a11y`: `3.5.1` (dev)

### React Native Reusables smoke test (plan 01-09, re-pinned with `bun add`)
- `@rn-primitives/dialog`: `1.5.2`
- `@rn-primitives/select`: `1.5.2`
- `@rn-primitives/portal`: `1.5.3`
- `@rn-primitives/slot`: `1.5.2`
- `class-variance-authority`: `0.7.1`
- `clsx`: `2.1.1`
- `tailwind-merge`: `2.6.2`
- `tailwindcss-animate`: `1.0.7`
- `lucide-react-native`: `0.577.0`

### Executed with `bunx` at exact version (never added to `package.json`)
- `create-expo-app`: `5.0.0`
- `@react-native-reusables/cli`: `0.7.1`
- `eas-cli`: `27.11.0`

### D-09 fallbacks (approved now, installed only if a spike row fails after one retry in plan 01-15)
- `@bacons/apple-targets`: `5.0.0`
- `uniwind`: `1.14.0` with `tailwindcss`: `4.3.5` in `app/` only
- `ts-fsrs`: `5.4.2`

## Task Commits

1. **Task 1 & Task 2: Owner package approval and identifier selection** - recorded in `01-01-SUMMARY.md` (no code changes)

## Files Created/Modified
- `.planning/phases/01-foundation-native-spike/01-01-SUMMARY.md` - Approved package list and fixed identifier values

## Decisions Made
- Confirmed `com.increasinglabs.roi` (with `s` in `increasing`) as `bundleIdentifier` and `androidPackage`.
- Confirmed `group.com.increasinglabs.roi` as `appGroup`, `roi` as `scheme`, and the Egyptian Gregorian `monthNames`.
- Owner instructed scaffolding `app/` with the latest `create-expo-app` default template immediately after `01-01`.

## Deviations from Plan
- Owner requested initializing the Expo scaffold (`app/`) using the latest `create-expo-app` default template immediately after `01-01` (rather than waiting until plan `01-06` with `blank-typescript`).

## Issues Encountered
None.

## User Setup Required
None in this plan — Wave 2 (`01-02`) guides Apple Developer, Expo/EAS, and Firebase/Google Cloud console setup using these identifiers.

## Next Phase Readiness
- Wave 2 is now unblocked: `01-02` (human account/Firebase setup) and `01-03` (monorepo + `shared/` Arabic core) can proceed in parallel.

---
*Phase: 01-foundation-native-spike*
*Completed: 2026-11-24*
