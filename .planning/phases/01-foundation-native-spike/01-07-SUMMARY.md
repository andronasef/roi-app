---
phase: 01-foundation-native-spike
plan: 07
subsystem: database-native-config
tags: [drizzle-sqlite, expo-prebuild, firebase, google-signin-spm, expo-widgets, react-native-android-widget, rtl]

requires:
  - phase: 01-foundation-native-spike
    provides: Permanent identifiers (01-01), out-of-repo Firebase configs and Google Cloud OAuth clients without EAS/Firebase Auth (01-02), and Expo SDK 58 app workspace (01-06)
provides:
  - App constants (SCHEME, DB_NAME, SETTINGS_KEYS, ROUTES, GOOGLE_OAUTH) and Arabic locale strings (app/locales/ar.json)
  - Drizzle syncCols() helper, settings table, baseline migration (app/drizzle/), and WAL expo-sqlite client
  - Root migration gate (useMigrations) and LAST_BOOT read/upsert in Arabic-Indic digits on home screen
  - Prebuild-verified native plugin composition (with-firebase-configure, dynamic frameworks, forced RTL, RNFB 27, SPM Google Sign-In with explicit iosUrlScheme, expo-widgets, react-native-android-widget)
  - Local Android release signing hook in app/app.config.js gated on .signing.env + key.jks (no EAS)
affects: [01-08, 01-09, 01-10, 01-11, 01-12, 01-13, 01-14, 01-15, 01-16]

actuals:
  tokens: 4021
  tasks: 2
  commits: 2
  plan_head_before: bde4f46cd27d402070d2fc384de90f85f208088c
  plan_head_after: 4a1ec6845d468cae3e818b8a4506dc4499c83adc

tech-stack:
  added: []
  patterns:
    - "Drizzle expo-sqlite synchronous query in lazy useState initializer + side-effect upsert in useEffect to avoid react-hooks/set-state-in-effect"
    - "Local-only Android release signing in app.config.js when both .signing.env and key.jks exist (no EAS)"
    - "Explicit Google Sign-In iosUrlScheme in app.json alongside iosDependencyManager: spm since Firebase Auth is disabled"

key-files:
  created:
    - app/constants/app.ts
    - app/locales/ar.json
    - app/drizzle.config.ts
    - app/drizzle/0000_conscious_hercules.sql
    - app/drizzle/meta/0000_snapshot.json
    - app/drizzle/meta/_journal.json
    - app/drizzle/migrations.js
    - app/features/db/schema.ts
    - app/features/db/client.ts
    - app/app.config.js
    - app/plugins/with-firebase-configure.js
  modified:
    - app/app/_layout.tsx
    - app/app/index.tsx
    - app/app.json

key-decisions:
  - "Omitted app/eas.json and EAS file-variable overrides per owner local-build override from 01-02-SUMMARY.md"
  - "Configured @react-native-google-signin/google-signin with both iosDependencyManager: 'spm' and explicit iosUrlScheme, and exported GOOGLE_OAUTH (webClientId, iosClientId) in app/constants/app.ts"
  - "Configured @react-native-firebase/analytics with { ios: { withoutAdIdSupport: true } } matching the installed PluginConfigTypeIos schema"
  - "Used lazy useState(readPreviousBootMs) in app/app/index.tsx so synchronous Drizzle read executes before the mount upsert and satisfies react-hooks/set-state-in-effect"

patterns-established:
  - "syncCols() returns id (text PK), createdAt, updatedAt, deletedAt (integer epoch ms UTC)"
  - "Config plugin order: expo-router -> ./plugins/with-firebase-configure -> expo-build-properties -> expo-localization -> @react-native-firebase/* -> @react-native-google-signin/google-signin -> expo-widgets -> react-native-android-widget"

requirements-completed: [FND-01, FND-06]

coverage:
  - id: D1
    description: "Drizzle syncCols() + settings table, baseline migration generated, useMigrations on launch, and LAST_BOOT read/upsert displayed in Arabic-Indic digits"
    requirement: "FND-06"
    verification:
      - kind: other
        ref: "cd app && bunx expo export --platform ios --output-dir dist/ios && bunx expo export --platform android --output-dir dist/android && bun run lint && cd .. && bun run typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "Prebuild-verified native plugin composition (FirebaseApp.configure(), App Group group.com.increasinglabs.roi, Arabic locale, iosUrlScheme, allowBackup=false, supportsRtl=true, Android widget receiver)"
    requirement: "FND-01"
    verification:
      - kind: other
        ref: "cd app && CI=1 bunx expo prebuild --clean --no-install && grep checks on ios/ and android/ && bunx expo export --platform ios --output-dir dist/ios && bun run lint && cd .. && bun run typecheck && bun run test"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-11-24
status: complete
---

# Phase 1 Plan 07: Baseline SQLite Boot, Native Config Plugins & Prebuild Summary

**Wired Drizzle baseline SQLite migrations (`syncCols()`, `settings`, `LAST_BOOT`) and composed all Phase 1 native config plugins (`with-firebase-configure`, dynamic frameworks, forced RTL, RNFB 27, SPM Google Sign-In with `iosUrlScheme`, `expo-widgets`, `react-native-android-widget`) verified via `expo prebuild --clean --no-install`**

## Performance

- **Duration:** 4 min
- **Started:** 2026-11-24T23:17:18Z
- **Completed:** 2026-11-24T23:20:35Z
- **Tasks:** 2
- **Files modified:** 14 (11 created, 3 modified; plus 2 gitignored Firebase config files copied)

## Accomplishments
- Created `app/constants/app.ts` (`SCHEME` from `app.json`, `DB_NAME`, `SETTINGS_KEYS.LAST_BOOT`, `ROUTES`, `GOOGLE_OAUTH`) and `app/locales/ar.json`.
- Defined `syncCols()` and `settings` in `app/features/db/schema.ts`, generated the baseline Expo SQLite migration (`app/drizzle/`), initialized WAL + foreign keys in `app/features/db/client.ts`, wired `useMigrations` in `app/app/_layout.tsx`, and implemented `LAST_BOOT` read/upsert with Arabic-Indic date/time display in `app/app/index.tsx`.
- Copied `GoogleService-Info.plist` and `google-services.json` from `/Users/andrew/Downloads/` into `app/` (verified gitignored via `git check-ignore -q`), created `app/plugins/with-firebase-configure.js` and `app/app.config.js` (with `.signing.env` + `key.jks` gated `withAndroidReleaseSigning`), and configured all native plugins in `app/app.json`.
- Confirmed `@react-native-firebase/analytics` accepts `{ "ios": { "withoutAdIdSupport": true } }` in `plugin/build/pluginConfig.d.ts`, `expo-widgets` requires `description` on each `WidgetConfig` and uses `enableAndroid: false`, and `react-native-android-widget` accepts `{ widgets: [...] }` without `fonts` (deferred to `01-09`).
- Verified `CI=1 bunx expo prebuild --clean --no-install` generates `FirebaseApp.configure()` in `AppDelegate.swift`, `group.com.increasinglabs.roi` in both entitlements files, `<string>ar</string>` and `com.googleusercontent.apps.23662840492-laqcbt3hkft72a3mu0ofcokeskr7sr7a` in `Info.plist`, `ios.useFrameworks: "dynamic"` in `Podfile.properties.json`, `$RNGoogleSigninDependencyManager = 'spm'` in `Podfile`, and `android:allowBackup="false"`, `android:supportsRtl="true"`, and `.widget.RoiSpike` receiver in `AndroidManifest.xml`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Constants, Arabic strings, Drizzle syncCols schema, baseline migration and LAST_BOOT home read/write** - `3c6c0f1` (feat)
2. **Task 2: Native-integration plugins, Firebase files, dynamic config with local signing; prebuild proves composition** - `4a1ec68` (feat)

## Files Created/Modified
- `app/constants/app.ts` - App constants (`SCHEME`, `DB_NAME`, `SETTINGS_KEYS`, `ROUTES`, `GOOGLE_OAUTH`)
- `app/locales/ar.json` - Arabic UI strings for boot/RTL/migration error states
- `app/drizzle.config.ts` - Drizzle Kit config (`dialect: 'sqlite'`, `driver: 'expo'`)
- `app/drizzle/` - Generated baseline SQL migration (`0000_conscious_hercules.sql`), snapshot, journal, and `migrations.js`
- `app/features/db/schema.ts` - Pure `syncCols()` helper and `settings` SQLite table
- `app/features/db/client.ts` - `expo-sqlite` database client with WAL and foreign keys enabled
- `app/app/_layout.tsx` - `useMigrations` launch gate rendering Arabic error or `Stack`
- `app/app/index.tsx` - Reads previous `LAST_BOOT`, upserts `Date.now()`, displays Arabic-Indic date/time and RTL status
- `app/plugins/with-firebase-configure.js` - Inserts `FirebaseApp.configure()` before `ReactNativeDelegate()` in SDK 58 `AppDelegate.swift`
- `app/app.json` - Static Expo config with relative Firebase files and full plugin chain
- `app/app.config.js` - Applies `withAndroidReleaseSigning` only when `.signing.env` and `key.jks` both exist

## Decisions Made
- **No EAS (`app/eas.json` omitted):** Followed owner override from `01-02-SUMMARY.md`; builds run locally via Xcode and Gradle, so `eas.json` and `GOOGLE_SERVICES_PLIST`/`GOOGLE_SERVICES_JSON` env overrides were not added.
- **Explicit Google Sign-In `iosUrlScheme`:** Added `iosUrlScheme: "com.googleusercontent.apps.23662840492-laqcbt3hkft72a3mu0ofcokeskr7sr7a"` alongside `iosDependencyManager: "spm"` in `app/app.json` and exported `GOOGLE_OAUTH` in `app/constants/app.ts` since Firebase Auth is disabled and `GoogleService-Info.plist` has no `REVERSED_CLIENT_ID`.
- **Analytics plugin option:** Installed `@react-native-firebase/analytics@27.1.1` exposes `ios.withoutAdIdSupport`, configured as `{ "ios": { "withoutAdIdSupport": true } }`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Avoided `react-hooks/set-state-in-effect` ESLint error in `app/app/index.tsx`**
- **Found during:** Task 1 (`bun run lint`)
- **Issue:** Calling `setPreviousBootMs` synchronously inside `useEffect` triggered `react-hooks/set-state-in-effect` in `eslint-config-expo`.
- **Fix:** Moved the synchronous Drizzle `readPreviousBootMs()` call into `useState<number | null>(readPreviousBootMs)` and kept only the `db.insert(settings)...onConflictDoUpdate` side effect inside `useEffect(..., [])`.
- **Files modified:** `app/app/index.tsx`
- **Verification:** `bun run lint` (`expo lint --max-warnings 0`), both `expo export` commands, and `bun run typecheck` exited 0.
- **Committed in:** `3c6c0f1` (Task 1 commit)

### Owner-Directed Overrides Applied

- Omitted `app/eas.json` and EAS file-variable overrides in `app/app.config.js` (per `01-02-SUMMARY.md` local-only build decision).
- Added explicit `iosUrlScheme` to `@react-native-google-signin/google-signin` in `app/app.json` and `GOOGLE_OAUTH` to `app/constants/app.ts` (per `01-02-SUMMARY.md` no-Firebase-Auth decision).

---

**Total deviations:** 1 auto-fixed (Rule 1 lint/effect ordering fix), plus 2 owner-directed overrides from `01-02-SUMMARY.md`.
**Impact on plan:** Cleaner mount behavior without cascading renders, and native config matches local-only Xcode/Gradle + GCP OAuth setup.

## Issues Encountered
None.

## User Setup Required
None - Firebase files were copied from `/Users/andrew/Downloads/` and verified gitignored.

## Next Phase Readiness
- SQLite baseline migrations and all Phase 1 native config plugins compose cleanly in `expo prebuild --clean --no-install`.
- Ready for `01-08-PLAN.md` (NativeWind warm paper theme tokens, MMKV preferences, and light/dark/system switch).

---
*Phase: 01-foundation-native-spike*
*Completed: 2026-11-24*

## Self-Check: PASSED

- All 11 created repository files, 3 modified files, and 2 gitignored Firebase config files (`app/GoogleService-Info.plist`, `app/google-services.json`) verified present on disk (`[ -f ]`).
- Both atomic task commits (`3c6c0f1`, `4a1ec68`) verified in `HEAD` history via `git merge-base --is-ancestor`.
- `CI=1 bunx expo prebuild --clean --no-install`, native grep checks (`FirebaseApp.configure()`, `group.com.increasinglabs.roi`, `<string>ar</string>`, `com.googleusercontent.apps.23662840492-laqcbt3hkft72a3mu0ofcokeskr7sr7a`, `ios.useFrameworks: "dynamic"`, `$RNGoogleSigninDependencyManager = 'spm'`, `android:allowBackup="false"`, `android:supportsRtl="true"`, `.widget.RoiSpike`), `expo export`, `expo lint --max-warnings 0`, `bun run typecheck`, and `bun run test` (7 files, 58/58 tests) all exited 0 after final edits.
