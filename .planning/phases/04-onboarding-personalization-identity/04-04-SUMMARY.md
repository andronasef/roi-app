---
phase: 04-onboarding-personalization-identity
plan: 04
subsystem: auth
tags: [onboarding, google-signin, drive-appdata, rtl, arabic, personalization, favorites]

requires:
  - phase: 04-onboarding-personalization-identity
    provides: ProfileProvider, uiCopy, MMKV onboarding_completed flag, and favorites toggleFavorite helper (04-02, 04-03)
  - phase: 02-content-backend-first-download
    provides: ContentGate and downloaded public verses table
provides:
  - On-device Google Sign-In helper requesting drive.appdata scope and idToken without backend token-exchange flags
  - Onboarding starter-verse picker, diacritic-insensitive search, and required name/gender validation helpers
  - 3-screen RTL OnboardingFlow with ⭐ first-win favorites and skippable Google Sign-In dialog
  - MMKV onboarding_completed state gate in app/app/index.tsx routing completed users straight to HomeScreen
affects: [04-06, 04-07, 08-drive-sync]

actuals:
  tokens: 12983
  tasks: 2
  commits: 2
  plan_head_before: a2058746e5b471ac56333f5a533c4e7350caf885
  plan_head_after: 09d0e85c7703fcdea7dad7d7ba042fc55943b903
commits: 2

tech-stack:
  added: []
  patterns:
    - "On-device Google Sign-In with drive.appdata scope and idToken extraction, never passing offlineAccess or serverAuthCode"
    - "Deterministic starter-verse batching prioritizing personalized verses first and diacritic-insensitive Arabic search via matches()"
    - "State-gated OnboardingFlow inside app/app/index.tsx on MMKV onboarding_completed to prevent back-stack leaks"

key-files:
  created:
    - app/features/google/auth.ts
    - app/features/google/__tests__/auth.test.ts
    - app/features/onboarding/starter-verses.ts
    - app/features/onboarding/__tests__/onboarding.test.ts
    - app/features/onboarding/OnboardingFlow.tsx
  modified:
    - app/app/index.tsx

key-decisions:
  - "Exposed requestGoogleDriveScopeUpgrade alongside signInWithGoogleDriveScope and getGoogleSessionToken so Settings and Suggestion flows can upgrade or inspect drive.appdata without duplicating GoogleSignin configuration."
  - "Narrowed SignInSilentlyResponse explicitly via isNoSavedCredentialFoundResponse and type === 'success' because @react-native-google-signin/google-signin's isSuccessResponse helper narrows SignInResponse only."

patterns-established:
  - "All Google Sign-In helpers live in app/features/google/auth.ts with relative imports so Vitest and Metro resolve identically."
  - "Onboarding completion is state-gated at app/app/index.tsx before rendering HomeScreen so completed users cannot navigate back into Onboarding."

requirements-completed: [HOME-01, HOME-02, PERS-01, PERS-04]

coverage:
  - id: D1
    description: "Google Sign-In helper requests drive.appdata upfront, retrieves idToken cleanly, and handles cancellation/failure without trapping"
    verification:
      - kind: unit
        ref: "app/features/google/__tests__/auth.test.ts#configures iosClientId, webClientId, and drive.appdata scope without backend token-exchange flags"
        status: pass
      - kind: unit
        ref: "app/features/google/__tests__/auth.test.ts#signs in with drive.appdata scope, upgrades scope if missing, and handles cancellation or failure safely"
        status: pass
      - kind: unit
        ref: "app/features/google/__tests__/auth.test.ts#restores silent session tokens, reports unauthenticated when absent, and upgrades drive scope in Settings"
        status: pass
    human_judgment: false
  - id: D2
    description: "Starter-verse picker, Arabic search, identity validation, and SQLite favorites first-win round-trip"
    requirements: [HOME-01, HOME-02, PERS-01, PERS-04]
    verification:
      - kind: unit
        ref: "app/features/onboarding/__tests__/onboarding.test.ts#validates required name and gender and trims valid names cleanly"
        status: pass
      - kind: unit
        ref: "app/features/onboarding/__tests__/onboarding.test.ts#picks 3-5 live starter verses deterministically per shuffle batch and prioritizes personalized verses"
        status: pass
      - kind: unit
        ref: "app/features/onboarding/__tests__/onboarding.test.ts#filters starter verses across personalized text and ref with diacritic-insensitive Arabic matching"
        status: pass
      - kind: unit
        ref: "app/features/onboarding/__tests__/onboarding.test.ts#persists onboarding profile to SQLite settings and records first-win favorite ⭐ round-trip"
        status: pass
      - kind: unit
        ref: "app/features/onboarding/__tests__/onboarding.test.ts#wires 3-screen OnboardingFlow and MMKV state-gated root index route"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-11-25
status: complete
---

# Phase 04 Plan 04: 3-Screen RTL Onboarding, Starter Verses & Google Sign-In (`drive.appdata`) Summary

**Implemented the reusable on-device Google Sign-In helper (`drive.appdata` + `idToken`), starter-verse picker/search/validation module, 3-screen RTL `OnboardingFlow` with ⭐ first-win favorites and skippable Google Sign-In, and MMKV state-gating in `app/app/index.tsx`**

## Performance

- **Duration:** 3 min
- **Started:** 2026-11-25T21:07:59Z
- **Completed:** 2026-11-25T21:11:02Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created `app/features/google/auth.ts` exporting `DRIVE_APPDATA_SCOPE`, `configureGoogleSignIn`, `signInWithGoogleDriveScope`, `requestGoogleDriveScopeUpgrade`, `getGoogleSessionToken`, and `getGoogleAccountStatus`, keeping all tokens on-device and never calling `signOut()` on normal sign-in.
- Created `app/features/onboarding/starter-verses.ts` exporting `validateOnboardingIdentity`, `pickStarterVerses`, and `filterStarterVerses` using `@roi/shared`'s `personalize()` and `matches()` plus gender-aware `uiCopy`.
- Built `app/features/onboarding/OnboardingFlow.tsx` with all 3 RTL screens: Screen 1 (**عن روعي** + 4 core tools), Screen 2 (**عرفنا بنفسك** required name + `ولد`/`بنت` selector persisted to SQLite `settings`), and Screen 3 (**اختار أول آية** with search, `"آيات تانية"` shuffle, ⭐ `toggleFavorite` first win firing `track('first_win_reached')`, Reusables `Dialog` explaining `drive.appdata`, `"استمر باستخدام جوجل"`, and `"استمر بدون تسجيل"`).
- State-gated `app/app/index.tsx` on MMKV `getOnboardingCompleted()` so first-run users enter `<OnboardingFlow />` and completed users land directly on `<HomeScreen />` with zero back-stack leakage.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Google Sign-In (drive.appdata + idToken) helper and starter-verse picker/search module** - `8ef9dce` (feat)
2. **Task 2: Build 3-screen OnboardingFlow and state-gate app/app/index.tsx on MMKV onboarding_completed** - `09d0e85` (feat)

## Files Created/Modified
- `app/features/google/auth.ts` - Google Sign-In configuration, `drive.appdata` scope consent/upgrade, silent session token restore, and account status helper.
- `app/features/google/__tests__/auth.test.ts` - Vitest unit suite mocking `@react-native-google-signin/google-signin` and `react-native` `Platform`.
- `app/features/onboarding/starter-verses.ts` - Required name/gender validation, deterministic personalized-first starter verse batching, and diacritic-insensitive Arabic verse search.
- `app/features/onboarding/__tests__/onboarding.test.ts` - Vitest unit suite covering identity validation, starter verse picking/filtering, SQLite `favorites` round-trip, and `OnboardingFlow`/`index.tsx` wiring.
- `app/features/onboarding/OnboardingFlow.tsx` - 3-screen RTL Onboarding component with Reusables `Dialog` for skippable `drive.appdata` Google Sign-In.
- `app/app/index.tsx` - Root `/` entry gated on MMKV `getOnboardingCompleted()`.

## Decisions Made
- Exported `requestGoogleDriveScopeUpgrade` alongside `signInWithGoogleDriveScope` and `getGoogleSessionToken` in `app/features/google/auth.ts` so Settings (`04-06`) and Suggestions (`04-07`) share one consistent module.
- Narrowed `SignInSilentlyResponse` with `isNoSavedCredentialFoundResponse(silent)` and `silent.type === 'success'` because `@react-native-google-signin/google-signin`'s `isSuccessResponse` narrows `SignInResponse` only.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed SignInSilentlyResponse TypeScript narrowing in auth.ts**
- **Found during:** Task 2 verification (`bun run typecheck`)
- **Issue:** `isSuccessResponse(silent)` in `@react-native-google-signin/google-signin` expects `SignInResponse` rather than `SignInSilentlyResponse`.
- **Fix:** Replaced `isSuccessResponse(silent)` with `!isNoSavedCredentialFoundResponse(silent) && silent.type === 'success'` (and `silent.type !== 'success'` in `getGoogleSessionToken`).
- **Files modified:** `app/features/google/auth.ts`
- **Commit:** `09d0e85`

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required beyond existing `GOOGLE_OAUTH` client IDs.

## Next Phase Readiness
- `app/features/google/auth.ts` is ready for Settings (`04-06`) and public suggestion submission (`04-07`).
- `OnboardingFlow` and root MMKV `onboarding_completed` gating are verified and ready for end-of-phase simulator/device smoke testing.

## Self-Check: PASSED
- Verified all 6 created/modified files exist on disk.
- Verified commits `8ef9dce` and `09d0e85` are ancestors of `HEAD`.
- Verified `bun run test -- --project @roi/app --project @roi/shared` (21 files / 156 tests passed), `bun run typecheck` (passed), and `cd app && bun run lint` (passed with 0 warnings).

---
*Phase: 04-onboarding-personalization-identity*
*Completed: 2026-11-25*
