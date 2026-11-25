---
phase: 04-onboarding-personalization-identity
plan: 03
subsystem: ui
tags: [profile, sqlite, mmkv, home, rtl, arabic, personalization, context]

requires:
  - phase: 04-onboarding-personalization-identity
    provides: Drizzle 0002 verse_assignments and settings schema + getOrAssignPeriodVerse engine (04-02-SUMMARY.md)
  - phase: 02-content-backend-first-download
    provides: ContentGate, delta sync, and local public verses table
provides:
  - Extended SETTINGS_KEYS, Phase 4 ROUTES, and SUPPORT_URLS in app/constants/app.ts
  - Syncable SQLite profile, 4-tool home_tiles, and verse_seed repository with last-visible guard
  - Gender-aware Egyptian Arabic uiCopy dictionary across Onboarding, Home, Leyaana, and Settings
  - Reactive ProfileProvider and useProfile hook hydrated from SQLite settings
  - Personalized أدواتك HomeScreen with MMKV intro card, weekly verse peek, and inline tile editor
  - ContentRefreshContext and useContentVersion hook in ContentGate for silent 6h delta refresh
affects: [04-04, 04-05, 04-06, 04-07, 05-memorization, 06-intercession-gratitude, 08-drive-sync]

actuals:
  tokens: 16059
  tasks: 2
  commits: 2
plan_head_before: 758c9433c0e783aba5ed186ff9f131934977bf2b
plan_head_after: 6f5e167958e7dd1570e4568adb025288dbf2bd4f
commits: 2

tech-stack:
  added: []
  patterns:
    - "Syncable SQLite settings JSON (user_profile, home_tiles, verse_seed) validated with Zod safeParse and safe canonical defaults"
    - "Device-local MMKV flags (onboarding_completed, home_intro_dismissed) separated from syncable SQLite preferences"
    - "Monotonic ContentRefreshContext tick emitted by ContentGate on first-download and delta-sync updates"

key-files:
  created:
    - app/features/profile/repository.ts
    - app/features/profile/ui-copy.ts
    - app/features/profile/context.tsx
    - app/features/profile/__tests__/profile.test.ts
    - app/features/home/HomeScreen.tsx
    - app/features/home/__tests__/home.test.ts
  modified:
    - app/constants/app.ts
    - app/locales/ar.json
    - app/services/storage.ts
    - app/features/sync/ContentGate.tsx
    - app/app/_layout.tsx
    - app/app/index.tsx

key-decisions:
  - "Persist all 4 canonical home_tiles entries in SQLite settings while filtering rendered Home tiles via IMPLEMENTED_HOME_TOOLS (['leyaana']) so Phase 5-6 tools stay hidden until implemented."
  - "Track a monotonic contentVersionTick in ContentGate (incremented on first-download completion and delta sync 'updated') so mounted Home and Leyaana screens refresh SQLite reads without restarting."

patterns-established:
  - "All gender-aware second-person UI copy resolves through uiCopy(key, gender) with safe male/neutral fallback."
  - "Testable mobile feature modules (profile/*, storage.ts, ContentGate.tsx, HomeScreen.tsx) use relative imports so Vitest runs cleanly under Node without @/ path aliases."

requirements-completed: [HOME-03, HOME-05, PERS-02, PERS-03, PERS-04]

coverage:
  - id: D1
    description: "Syncable SQLite settings persistence for user_profile, 4-tool home_tiles, and verse_seed with Zod validation and last-visible tool guard"
    requirement: HOME-03
    verification:
      - kind: unit
        ref: "app/features/profile/__tests__/profile.test.ts#returns default profile when unset, persists updates to SQLite settings, and recovers from corrupted JSON"
        status: pass
      - kind: unit
        ref: "app/features/profile/__tests__/profile.test.ts#returns all 4 canonical home tiles, guards hiding the last visible implemented tool, and persists toggles and reorders"
        status: pass
      - kind: unit
        ref: "app/features/home/__tests__/home.test.ts#blocks hiding the last visible implemented tool with exact Arabic notice and persists deterministic reorders"
        status: pass
    human_judgment: false
  - id: D2
    description: "Gender-aware Egyptian Arabic uiCopy dictionary and neutral personalize() fallback across Onboarding, Home, Leyaana, and Settings"
    requirements: [PERS-02, PERS-03, PERS-04]
    verification:
      - kind: unit
        ref: "app/features/profile/__tests__/profile.test.ts#resolves distinct Egyptian Arabic gender phrasing across Onboarding, Home, Leyaana, and Settings and neutral personalize fallback"
        status: pass
    human_judgment: false
  - id: D3
    description: "One-time MMKV home_intro_dismissed card, hidden Phase 5-6 tools, inline أدواتك editor, and ContentRefreshContext"
    requirements: [HOME-03, HOME-05]
    verification:
      - kind: unit
        ref: "app/features/home/__tests__/home.test.ts#returns only visible implemented tools sorted by order while preserving all 4 tool entries in SQLite settings"
        status: pass
      - kind: unit
        ref: "app/features/home/__tests__/home.test.ts#persists device-local onboarding_completed and home_intro_dismissed flags in MMKV"
        status: pass
      - kind: unit
        ref: "app/features/home/__tests__/home.test.ts#exports ContentRefreshContext/useContentVersion and wires intro card, edit mode, and Arabic strings"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-11-25
status: complete
---

# Phase 04 Plan 03: Personalized Home (أدواتك), Profile Context, Gender-Aware UI Copy & ContentRefreshContext Summary

**Implemented the syncable SQLite profile/tile repository, gender-aware Egyptian Arabic `uiCopy` dictionary, reactive `ProfileProvider`, MMKV onboarding/intro flags, `ContentRefreshContext`, and the personalized **أدواتك** `HomeScreen` with weekly verse peek and inline tile customization**

## Performance

- **Duration:** 4 min
- **Started:** 2026-11-25T23:02:05+02:00
- **Completed:** 2026-11-25T23:06:17+02:00
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Extended `app/constants/app.ts` with `SETTINGS_KEYS` (`USER_PROFILE`, `HOME_TILES`, `VERSE_SEED`), Phase 4 `ROUTES` (`/settings`, `/leyaana`, `/leyaana/history`, `/leyaana/browse`), and `SUPPORT_URLS` with `EXPO_PUBLIC_*` overrides and Increasing Labs defaults.
- Built `app/features/profile/repository.ts` with Zod-validated JSON persistence for `user_profile`, all 4 canonical `home_tiles`, and `verse_seed`, plus `getVisibleHomeTools`, `toggleHomeTileVisibility` (blocking hiding the last visible implemented tool with `"لازم تفضل أداة واحدة ظاهرة على الأقل في الشاشة الرئيسية"`), and deterministic `moveHomeTile`.
- Created `app/features/profile/ui-copy.ts` (`uiCopy(key, gender)`) covering gender-aware second-person Egyptian Arabic strings across Onboarding, Home, **ليا أنا**, and Settings, and wired reactive `ProfileProvider` / `useProfile` inside `ContentGate` in `app/app/_layout.tsx`.
- Added MMKV device-local helpers (`getOnboardingCompleted`, `setOnboardingCompleted`, `getHomeIntroDismissed`, `setHomeIntroDismissed`) in `app/services/storage.ts`, Phase 4 Arabic strings in `app/locales/ar.json`, and `ContentRefreshContext` / `useContentVersion` in `app/features/sync/ContentGate.tsx`.
- Built `app/features/home/HomeScreen.tsx` and wired it at `app/app/index.tsx` with gender-aware greeting, settings gear, one-time dismissible MMKV intro card, weekly verse peek subscribed to `useFocusEffect` and `useContentVersion()`, **ليا أنا** tile (hiding unbuilt Phase 5–6 tools), inline **«تعديل الأدوات»** / **«حفظ الترتيب»** editor, and preserved `DEV_TOOLS_ENABLED` dev links.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end "Personalized Home" tracer slice (constants, profile repo, uiCopy, ProfileProvider, HomeScreen, root wiring)** - `08f0f0a` (feat)
2. **Task 2: Complete HomeScreen (one-time MMKV intro card, hidden Phase 5-6 tools, inline tile edit mode), ContentRefreshContext, and ar.json** - `6f5e167` (feat)

## Files Created/Modified
- `app/constants/app.ts` - Extended `SETTINGS_KEYS`, `ROUTES`, and `SUPPORT_URLS`.
- `app/features/profile/repository.ts` - SQLite `settings` persistence for profile, 4-tool Home tile configs, and `verse_seed` plus visibility/reorder helpers.
- `app/features/profile/ui-copy.ts` - Gender-aware Egyptian Arabic UI copy dictionary (`uiCopy`).
- `app/features/profile/context.tsx` - Reactive `ProfileProvider` and `useProfile()` hook.
- `app/features/profile/__tests__/profile.test.ts` - Unit tests for SQLite profile/tile/seed persistence, last-visible guard, `uiCopy`, and `personalize()` fallback.
- `app/features/home/HomeScreen.tsx` - Personalized **أدواتك** Home screen with intro card, weekly verse peek, and inline tile editor.
- `app/features/home/__tests__/home.test.ts` - Unit tests for `getVisibleHomeTools`, last-visible guard, reordering, MMKV flags, `ContentRefreshContext`, and Arabic strings.
- `app/services/storage.ts` - Added `ONBOARDING_COMPLETED` and `HOME_INTRO_DISMISSED` MMKV helpers and relative import for Vitest compatibility.
- `app/features/sync/ContentGate.tsx` - Exported `ContentRefreshContext` and `useContentVersion()` updated on first download and delta updates.
- `app/locales/ar.json` - Added Phase 4 Egyptian Arabic strings.
- `app/app/_layout.tsx` - Wrapped `<Stack />` with `<ProfileProvider>` inside `<ContentGate>`.
- `app/app/index.tsx` - Replaced `LibraryReadyView` placeholder with `<HomeScreen />`.

## Decisions Made
- Filtered visible Home tiles via `IMPLEMENTED_HOME_TOOLS` (`new Set(['leyaana'])`) while persisting all 4 tool entries (`leyaana`, `memorize`, `intercession`, `gratitude`) in SQLite `settings`.
- Switched `app/services/storage.ts` import from `@/constants/theme` to `../constants/theme` so Vitest resolves MMKV helpers cleanly alongside Metro.

## Deviations from Plan
None — plan executed as specified (minor Vitest relative-import alignment in `app/services/storage.ts` matching `ContentGate.tsx`).

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- `ProfileProvider`, `uiCopy`, `SETTINGS_KEYS`, `ROUTES`, `SUPPORT_URLS`, MMKV onboarding/intro flags, and `ContentRefreshContext` are ready for Wave 4/5 plans (`04-04` Onboarding, `04-05`/`04-06` **ليا أنا**, and `04-07` Settings).

## Self-Check: PASSED
- Verified all 12 created/modified files exist on disk.
- Verified commits `08f0f0a` and `6f5e167` are ancestors of `HEAD`.
- Verified `bun run test -- --project @roi/app --project @roi/shared` (19 files / 148 tests passed), `bun run typecheck` (passed), and `cd app && bun run lint` (passed with 0 warnings).

---
*Phase: 04-onboarding-personalization-identity*
*Completed: 2026-11-25*
