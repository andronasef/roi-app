---
phase: 04-onboarding-personalization-identity
plan: 06
subsystem: ui
tags: [settings, theme, scripture-size, profile, google-signin, linking, share, arabic-indic, rtl]

requires:
  - phase: 04-onboarding-personalization-identity
    provides: ProfileProvider and uiCopy (04-03), Google drive.appdata auth helpers (04-04)
  - phase: 01-foundation-native-spike
    provides: useThemePreference and ScriptureSizeSlider / <Scripture>
provides:
  - Safe https-only external support URL opener, Share payload builder, Arabic-Indic app version formatter, and Settings profile validator
  - Grouped-card SettingsScreen covering appearance, Scripture sizing, reactive profile edits, Google drive.appdata connect, and support/WhatsApp links
  - Expo Router /settings route wired from HomeScreen gear button
affects: [08-drive-sync]

actuals:
  tokens: 7992
  tasks: 2
  commits: 2
  plan_head_before: 4803d190e27e78d067162be266c8055b2f5131ee
  plan_head_after: 9218152f20f5301203d1daee051f2ed408aa5846
commits: 2

tech-stack:
  added: []
  patterns:
    - "Restrict external support URL launches to https:// via new URL() parsing and canOpenURL/openURL try/catch wrapper"
    - "Use ref-based concurrency guards on async Google connect, Share.share, and external URL launches"

key-files:
  created:
    - app/features/settings/support.ts
    - app/features/settings/SettingsScreen.tsx
    - app/features/settings/__tests__/settings.test.ts
    - app/app/settings.tsx
  modified: []

decisions:
  - "Route ربط حساب جوجل through requestGoogleDriveScopeUpgrade when already signed in without drive.appdata and signInWithGoogleDriveScope otherwise so both new sign-ins and scope upgrades succeed cleanly."
  - "Guard Share.share, openSupportUrl, and Google connect triggers with ref locks alongside disabled states to prevent duplicate OS dialogs or sign-in prompts on rapid taps."

patterns-established:
  - "All Settings support helpers live in app/features/settings/support.ts with relative imports so Vitest runs under Node without @/ aliases."

requirements-completed: [SET-01, PERS-01, PERS-04]

coverage:
  - id: D1
    description: "Arabic-Indic app version formatter, share message builder, https-only external URL launcher, and profile input validator"
    requirements: [SET-01, PERS-01]
    verification:
      - kind: unit
        ref: "app/features/settings/__tests__/settings.test.ts#formats app version with Arabic-Indic digits"
        status: pass
      - kind: unit
        ref: "app/features/settings/__tests__/settings.test.ts#allows only https URLs, checks canOpenURL, and handles failures without throwing"
        status: pass
      - kind: unit
        ref: "app/features/settings/__tests__/settings.test.ts#builds a share message containing app name, tagline, and share URL"
        status: pass
      - kind: unit
        ref: "app/features/settings/__tests__/settings.test.ts#validates settings profile name and trims valid input cleanly"
        status: pass
    human_judgment: false
  - id: D2
    description: "Grouped-card SettingsScreen and /settings route wiring appearance, Scripture size, profile refresh, Google connect, and support links with zero PII telemetry"
    requirements: [SET-01, PERS-01, PERS-04]
    verification:
      - kind: unit
        ref: "app/features/settings/__tests__/settings.test.ts#wires SettingsScreen grouped cards, /settings route, and keeps PII off telemetry"
        status: pass
      - kind: static
        ref: "app/__tests__/guards.test.ts"
        status: pass
      - kind: typecheck
        ref: "bun run typecheck"
        status: pass
      - kind: lint
        ref: "cd app && bun run lint"
        status: pass
    human_judgment: false

duration: 3min
completed: 2026-11-25
status: complete
---

# Phase 04 Plan 06: Global Settings (Grouped Cards, Profile Edit, Google Connect & Support) Summary

**Implemented the grouped-card Global Settings screen (`app/features/settings/SettingsScreen.tsx`), safe `https://` support/share/Arabic-Indic version helpers (`app/features/settings/support.ts`), and `/settings` Expo Router route (`app/app/settings.tsx`)**

## Performance

- **Duration:** 3 min
- **Started:** 2026-11-25T21:18:46Z
- **Completed:** 2026-11-25T21:20:55Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments
- Created `app/features/settings/support.ts` exporting `formatAppVersionLabel`, `buildShareMessage`, `validateSettingsProfile`, and `openSupportUrl` (strictly allowlisting `https:` URLs and handling `canOpenURL`/`openURL` failures gracefully without throwing).
- Added unit and wiring coverage in `app/features/settings/__tests__/settings.test.ts` testing Arabic-Indic version formatting, URL scheme allowlisting, error recovery, share payload formatting, profile validation, screen/route wiring, and PII telemetry exclusion (`T-04-09`, `T-04-10`).
- Built `app/features/settings/SettingsScreen.tsx` and `app/app/settings.tsx` with **المظهر والقراءة** (`useThemePreference` + `ScriptureSizeSlider` + 1-line `<Scripture>` preview), **حسابك** (reactive `name`/`gender` save via `ProfileProvider` + `drive.appdata` Google Sign-In dialog via `signInWithGoogleDriveScope`/`requestGoogleDriveScopeUpgrade`), **المساعدة والتواصل** (`Share.share`, Rate, Help form, WhatsApp), and the Arabic-Indic About footer.

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Settings support helpers (Arabic-Indic version, Share payload, safe external URL launcher) and unit tests** - `a402595` (feat)
2. **Task 2: Build grouped-card SettingsScreen and /settings route** - `9218152` (feat)

## Files Created/Modified
- `app/features/settings/support.ts` - Arabic-Indic version formatter, share message builder, profile save validation, and https-only `openSupportUrl` helper.
- `app/features/settings/__tests__/settings.test.ts` - Vitest suite for support helpers, SettingsScreen wiring, and privacy telemetry checks.
- `app/features/settings/SettingsScreen.tsx` - Grouped-card Global Settings screen (`المظهر والقراءة`, `حسابك`, `المساعدة والتواصل`, About footer).
- `app/app/settings.tsx` - Expo Router `/settings` screen rendering `<SettingsScreen />`.

## Decisions Made
- Routed **«ربط حساب جوجل»** through `requestGoogleDriveScopeUpgrade()` when already signed in without `drive.appdata`, and `signInWithGoogleDriveScope()` otherwise, so both fresh sign-in and incremental scope upgrade work seamlessly.
- Added ref-based concurrency guards on Google connect, `Share.share`, and `openSupportUrl` actions alongside disabled button states to prevent duplicate OS prompts on rapid taps.

## Deviations from Plan
None — plan executed as specified.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Global Settings (`/settings`) is complete and wired to Home's settings gear button, `ProfileProvider`, `useThemePreference`, `ScriptureSizeProvider`, and `app/features/google/auth.ts`.
- Ready for Plan `04-07` (Personal items & `"اقترح للكل"` public suggestions) and end-of-phase verification.

## Self-Check: PASSED
- Verified all 4 created files exist on disk (`app/features/settings/support.ts`, `app/features/settings/__tests__/settings.test.ts`, `app/features/settings/SettingsScreen.tsx`, `app/app/settings.tsx`).
- Verified commits `a402595` and `9218152` are ancestors of `HEAD`.
- Verified `bun run test -- --project @roi/app --project @roi/shared` (23 files / 164 tests passed), `bun run typecheck` (passed), and `cd app && bun run lint` (passed with 0 warnings).

---
*Phase: 04-onboarding-personalization-identity*
*Completed: 2026-11-25*
