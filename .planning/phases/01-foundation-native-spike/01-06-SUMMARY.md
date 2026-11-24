---
phase: 01-foundation-native-spike
plan: 06
subsystem: mobile-infra
tags: [expo-sdk-58, metro, babel, bun-isolated, rtl, eslint, react-native-a11y, shared]

requires:
  - phase: 01-foundation-native-spike
    provides: Approved pinned Phase 1 package table and identifiers (01-01) and @roi/shared source TS consumer pattern (01-05)
provides:
  - "@roi/app Expo SDK 58 workspace linked to @roi/shared via workspace:* under bun isolated linker"
  - "Exact approved Phase 1 dependency pins in app/package.json and bun.lock"
  - "Static app/app.json with forced RTL (forcesRTL: true), Arabic bundle metadata, and com.increasinglabs.roi identifiers"
  - "iOS and Android Metro bundle exports resolving @roi/shared directly from source TypeScript"
  - "Zero-warning accessibility lint enforcement via eslint-config-expo and eslint-plugin-react-native-a11y"
affects: [01-07, 01-08, 01-09, 01-10, 01-11, 01-12, 01-13, 01-14, 01-15, 01-16]

actuals:
  tokens: 13146
  tasks: 2
  commits: 2
  plan_head_before: 3309b5f039e129f3ea72258e75852c36b8776062
  plan_head_after: bd6f3bc9fd8c150e133c9ee17393b1438eaeaacb

tech-stack:
  added:
    - "expo ~58.0.26, react 19.3.0, react-native 0.88.1"
    - "expo-router ~58.0.32, expo-linking ~58.0.17, expo-constants ~58.0.16, expo-status-bar ~58.0.5, expo-dev-client ~58.0.21"
    - "expo-build-properties ~58.0.12, expo-localization ~58.0.5, expo-font ~58.0.12, expo-sqlite ~58.0.18, expo-crypto ~58.0.8"
    - "expo-widgets ~58.0.29, @expo/ui ~58.0.29, react-native-android-widget 0.26.0"
    - "react-native-reanimated 4.7.1, react-native-worklets 0.13.0, react-native-gesture-handler ~3.3.0, react-native-screens ~4.30.1, react-native-safe-area-context ~5.11.1, react-native-svg 15.16.0"
    - "react-native-mmkv 4.3.2, react-native-nitro-modules 0.37.2"
    - "nativewind 4.2.7, tailwindcss 3.4.19, drizzle-orm 0.45.4, drizzle-kit 0.31.11, better-sqlite3 13.2.0, babel-plugin-inline-import 3.0.0"
    - "@react-native-firebase/app, /analytics, /crashlytics 27.1.1, @react-native-google-signin/google-signin 17.0.0, ts-fsrs 6.0.1"
    - "eslint 9.39.5, eslint-config-expo ~58.0.4, eslint-plugin-react-native-a11y 3.5.1"
  patterns:
    - "Resolve babel-preset-expo from expo's package directory in app/babel.config.js so @babel/core works under bun linker = isolated without hoisting"
    - "Metro default config extended only with sql sourceExts (letting Expo manage monorepo watchFolders/nodeModulesPaths)"
    - "Accessibility lint enforces all react-native-a11y rules at warn (except has-accessibility-hint: off) with --max-warnings 0"

key-files:
  created:
    - app/babel.config.js
    - app/metro.config.js
    - app/index.ts
    - app/app/_layout.tsx
    - app/app/index.tsx
    - app/eslint.config.js
  modified:
    - package.json
    - bun.lock
    - app/package.json
    - app/app.json
    - app/tsconfig.json
    - app/.gitignore

key-decisions:
  - "Resolved babel-preset-expo via require.resolve('babel-preset-expo', { paths: [expoDir] }) in app/babel.config.js rather than hoisting or adding a redundant direct dependency, keeping bun linker = isolated intact"
  - "Tightened react-native-mmkv and react-native-nitro-modules in app/package.json from caret ranges emitted by expo install to exact 4.3.2 and 0.37.2 pins matching 01-01-SUMMARY.md"
  - "Reverted the 5 bare plugin entries auto-appended by expo install in app/app.json so only expo-router and expo-localization (forcesRTL: true) remain until plan 01-07 configures native plugins"

patterns-established:
  - "Root typecheck runs both tsc -p tsconfig.json and tsc -p app/tsconfig.json"
  - "app/tsconfig.json maps @/* to ./* and excludes __tests__, scripts, drizzle, and dist"

requirements-completed: [FND-01, FND-08]

coverage:
  - id: D1
    description: "Expo SDK 58 app in app/ wired into bun isolated workspace with exact approved 01-01 pins, bundling iOS and Android while consuming @roi/shared from source TS"
    requirement: "FND-08"
    verification:
      - kind: other
        ref: "cd app && bunx expo install --check && bunx expo export --platform ios --output-dir dist/ios && bunx expo export --platform android --output-dir dist/android && cd .. && bun run typecheck && bun run test"
        status: pass
    human_judgment: false
  - id: D2
    description: "Forced RTL (forcesRTL: true) and Arabic bundle metadata configured in app/app.json and rendered on home screen via I18nManager.isRTL"
    requirement: "FND-01"
    verification:
      - kind: other
        ref: "grep -cE '\"forcesRTL\": ?true' app/app.json && grep -c '@roi/shared' app/app/index.tsx"
        status: pass
    human_judgment: false
  - id: D3
    description: "Accessibility lint configured with eslint-config-expo and eslint-plugin-react-native-a11y passing at zero warnings"
    requirement: "FND-01"
    verification:
      - kind: other
        ref: "cd app && bun run lint"
        status: pass
    human_judgment: false

duration: 7min
completed: 2026-11-24
status: complete
---

# Phase 1 Plan 06: Expo App Scaffold, Approved Pins & A11y Lint Summary

**Wired pre-scaffolded `@roi/app` (Expo SDK 58) into the Bun isolated workspace with exact `01-01` dependency pins, forced Arabic RTL (`forcesRTL: true`), Metro/Babel source resolution of `@roi/shared` for iOS and Android bundles, and zero-warning `react-native-a11y` lint**

## Performance

- **Duration:** 7 min
- **Started:** 2026-11-24T20:37:42Z
- **Completed:** 2026-11-24T20:44:15Z
- **Tasks:** 2
- **Files modified:** 12 (plus 17 template boilerplate files removed from `app/`)

## Accomplishments
- Reconciled the pre-scaffolded `app/` (`create-expo-app@5.0.0`) directory into `@roi/app`: removed template boilerplate (`app/src/`, `app/scripts/`, `app/README.md`, `app/LICENSE`), kept `app/assets/`, hardened `app/.gitignore` against signing/Firebase secrets and native build outputs, and linked `@roi/shared: workspace:*` in root `package.json`.
- Installed every Expo-tracked SDK 58 dependency via `bunx expo install` and every exact non-Expo dependency via `bun add --exact`, verifying every resolved version matches `01-01-SUMMARY.md` and `bunx expo install --check` passes cleanly.
- Configured `app/app.json` with `com.increasinglabs.roi`, `roi` scheme, Arabic `CFBundleDevelopmentRegion`/`CFBundleLocalizations`, `allowBackup: false`, and `expo-localization` (`supportsRTL: true`, `forcesRTL: true`), plus `app/app/_layout.tsx` and `app/app/index.tsx` consuming `formatArabicDate` and `toArabicDigits` from `@roi/shared`.
- Configured `app/eslint.config.js` with `eslint-config-expo/flat` and all `eslint-plugin-react-native-a11y` rules at `warn` (except `has-accessibility-hint: off`) so `expo lint --max-warnings 0` exits 0.

## Task Commits

Each task was committed atomically:

1. **Task 1: Tracer - Expo app scaffold, approved pins, forced RTL and home screen consuming @roi/shared** - `d962ff7` (feat)
2. **Task 2: Accessibility lint setup with react-native-a11y at zero warnings** - `bd6f3bc` (chore)

## Files Created/Modified
- `package.json` - Added `"app"` to `workspaces` and extended `typecheck` to run `tsc -p app/tsconfig.json`
- `bun.lock` - Locked all `@roi/app` Expo SDK 58 and exact-pin dependencies under `linker = isolated`
- `app/package.json` - Set `@roi/app`, `main: "index.ts"`, `@roi/shared: "workspace:*"`, scripts, and exact `01-01` approved pins
- `app/app.json` - Configured `روعي` / `roi`, `com.increasinglabs.roi`, Arabic iOS plist metadata, `allowBackup: false`, and `forcesRTL: true`
- `app/babel.config.js` - Configured `babel-preset-expo` (resolved from `expo`'s package path) and `inline-import` for `.sql`
- `app/metro.config.js` - Extended Expo default Metro config with `.sql` in `resolver.sourceExts`
- `app/tsconfig.json` - Configured strict TypeScript with `@/* -> ./*` path mapping and exclusions for `__tests__`, `scripts`, `drizzle`, `dist`
- `app/.gitignore` - Added `.signing.env`, `*.keystore`, `google-services.json`, and `GoogleService-Info.plist`
- `app/index.ts` - Minimal `expo-router/entry` entrypoint
- `app/app/_layout.tsx` - Root `expo-router` `Stack` with `headerShown: false`
- `app/app/index.tsx` - Home screen displaying `روعي`, `I18nManager.isRTL`, and `formatArabicDate` / `toArabicDigits` from `@roi/shared`
- `app/eslint.config.js` - `eslint-config-expo/flat` plus `react-native-a11y` rules at `warn` (`has-accessibility-hint` off)

## Decisions Made
- Resolved `babel-preset-expo` via `require.resolve('babel-preset-expo', { paths: [expoDir] })` in `app/babel.config.js` so Metro/Babel succeeds under `linker = isolated` without falling back to `linker = hoisted`.
- Pinned `react-native-mmkv` (`4.3.2`) and `react-native-nitro-modules` (`0.37.2`) without carets in `app/package.json` to match `01-01-SUMMARY.md` exact pins.
- Kept `app/app.json` plugins scoped to `expo-router` and `expo-localization` (reversing the bare plugin entries auto-added by `expo install`), leaving native integration plugin configuration to plan `01-07`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adapted pre-scaffolded `app/` instead of re-running `create-expo-app`**
- **Found during:** Task 1
- **Issue:** Per owner instruction in `01-01-SUMMARY.md`, `app/` was already scaffolded with `create-expo-app@5.0.0` (`default@sdk-58` template) containing `app/src/`, `app/scripts/`, `app/README.md`, `app/LICENSE`, and extra template-only dependencies.
- **Fix:** Removed template boilerplate (`app/src/`, `app/scripts/`, `app/README.md`, `app/LICENSE`), kept `app/assets/` and `app/.gitignore` (adding missing secret patterns), and reconciled `app/package.json` to approved `01-01` packages plus template `@types/react` (`~19.3.0`) and `typescript` (`~6.0.3`).
- **Files modified:** `app/package.json`, `app/tsconfig.json`, `app/.gitignore`, `app/app.json`, `app/app/_layout.tsx`, `app/app/index.tsx`
- **Verification:** `bunx expo install --check`, iOS/Android `expo export`, `bun run typecheck`, `bun run test` all exited 0.
- **Committed in:** `d962ff7` (Task 1 commit)

**2. [Rule 3 - Blocking] Resolved `babel-preset-expo` from `expo` directory under `linker = isolated`**
- **Found during:** Task 1 (`bunx expo export --platform ios`)
- **Issue:** Under Bun's `linker = isolated`, `@babel/core` could not locate `'babel-preset-expo'` by bare name because `babel-preset-expo` is linked inside `expo`'s `.bun` store directory rather than `app/node_modules/`.
- **Fix:** Updated `app/babel.config.js` to resolve `babel-preset-expo` using `{ paths: [path.dirname(require.resolve('expo/package.json'))] }`.
- **Files modified:** `app/babel.config.js`
- **Verification:** `bunx expo export --platform ios --output-dir dist/ios` (1233 modules) and `--platform android --output-dir dist/android` (1371 modules) both bundled cleanly with exit 0.
- **Committed in:** `d962ff7` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both adaptations were required by the pre-scaffolded `app/` directory and Bun's isolated linker; no scope creep and zero workarounds that weaken isolation.

## Issues Encountered
- `bunx expo install` printed the expected `incorrect peer dependency "eslint@9.39.5"` warning from `eslint-plugin-react-native-a11y@3.5.1` (`^8`) and auto-appended 5 bare plugin strings to `app/app.json`; accepted the peer warning per plan and restored `app/app.json` plugins to `expo-router` + `expo-localization` for plan `01-07`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- `@roi/app` joins the isolated monorepo cleanly, passes `expo install --check`, bundles for iOS and Android while importing `@roi/shared`, and enforces `react-native-a11y` at zero warnings.
- Ready for `01-07-PLAN.md` (native config plugins, EAS profiles, and baseline SQLite schema/migrations).

---
*Phase: 01-foundation-native-spike*
*Completed: 2026-11-24*

## Self-Check: PASSED

- All 6 created files (`app/babel.config.js`, `app/metro.config.js`, `app/index.ts`, `app/app/_layout.tsx`, `app/app/index.tsx`, `app/eslint.config.js`) and 4 modified `app/` config files verified present on disk (`[ -f ]`)
- Both atomic task commits (`d962ff7`, `bd6f3bc`) verified in `HEAD` history via `git merge-base --is-ancestor`
- `cd app && bunx expo install --check`, `bun run lint` (`--max-warnings 0`), `bunx expo export --platform ios --output-dir dist/ios` (1233 modules), `bunx expo export --platform android --output-dir dist/android` (1371 modules), `bun run typecheck`, and `bun run test` (7 files, 58/58 tests) all exited 0 after final edits
- All Task 1 and Task 2 acceptance criteria verified passing
