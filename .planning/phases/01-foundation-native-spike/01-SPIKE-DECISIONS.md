# Phase 1: Native Spike Decisions

**Settled:** 2026-11-25
**Plans covered:** `01-01` through `01-16`
**Build model:** Local Xcode Simulator + local Gradle builds only (no EAS per owner decision in `01-02-SUMMARY.md`)

---

## Scripture font

- **Outcome:** Selected **`amiri`** (`Amiri-Regular.ttf`, `Amiri-Bold.ttf`) as the default Scripture font (`SCRIPTURE_FONT_DEFAULT = 'amiri'` in `app/constants/theme.ts`), while keeping `scheherazade` bundled as the secondary candidate and `IBMPlexSansArabic` (`Regular`, `Medium`, `Bold`) as the UI font.
- **Evidence:** Owner side-by-side comparison on `roi://torture` across `iPhone 18 Pro` Simulator and physical `realme RMX5106` (`01-15-SUMMARY.md`, `01-09-SUMMARY.md`). Both `Amiri` and `Scheherazade New` render diacritics cleanly; `Amiri` matched the owner's visual preference.
- **5-step sizing & contrast:** `SCRIPTURE_SIZES = [18, 20, 23, 27, 32]` stored in MMKV via `ScriptureSizeProvider` (`01-09-SUMMARY.md`).
- **What later phases must do:** Use `<Scripture>` (from `app/features/scripture/scripture.tsx`) for all verse/Scripture display so user size preference and `amiri` rendering apply consistently across Phase 4 (ليا أنا) and Phase 6 (حفظ الآيات).

## Workspace linker

- **Outcome:** Kept **Bun isolated linker** (`bunfig.toml` with `linker = "isolated"` and explicit `workspaces: ["shared", "backend", "admin", "app"]` in root `package.json`), consuming `@roi/shared` directly from source TypeScript with no build step (`D-01`, `D-02`).
- **Evidence:** All 4 workspaces install cleanly (`01-03`, `01-05`, `01-06`). Metro and TypeScript resolve `@roi/shared` directly; Vitest (`14 files, 97 tests`) runs on real Node via `bun run test`, and `tsc` runs cleanly across root and `app/`.
- **Isolated-linker mitigations applied:**
  1. `app/babel.config.js` resolves `babel-preset-expo` via `require.resolve('babel-preset-expo', { paths: [expoDir] })` so `@babel/core` works without hoisting (`01-06-SUMMARY.md`).
  2. `react-native-css-interop@0.2.7` was declared directly in `app/package.json` so Android Metro bundling resolves `update.ts` (`01-14-SUMMARY.md`).
- **What later phases must do:** Any new transitive Babel/Metro runtime plugin required by an app package must be declared explicitly in that workspace's `package.json` rather than relaxing `linker = "isolated"`.

## Styling

- **Outcome:** Kept **NativeWind `4.2.7`** (`tailwindcss@3.4.19`) + **React Native Reusables** (`@rn-primitives/dialog`, `@rn-primitives/select`, `@rn-primitives/portal`, `class-variance-authority`, `lucide-react-native`), using warm-paper HSL CSS variables in `app/global.css` (`:root` and `.dark:root`, `darkMode: 'class'`). Fallback to Uniwind `1.14.0` was not needed.
- **Evidence:** Light/dark/system switching via MMKV + `colorScheme.set()` and Reusables Dialog & Select bundled and rendered on both `iPhone 18 Pro` and `RMX5106` Debug builds (`01-08-SUMMARY.md`, `01-09-SUMMARY.md`, `01-15-SUMMARY.md`).
- **RTL adjustments:** All owned UI components under `app/components/ui/` use logical RTL utilities (`start`/`end`/`ps`/`pe`/`ms`/`me`/`text-start`) and omit `tracking-*` classes that break Arabic letter joining (`01-09-SUMMARY.md`).
- **What later phases must do:** Keep all color tokens in `app/global.css`, never re-introduce `left`/`right`/`ml`/`mr`/`tracking-*` utilities in UI components, and honor the Phase 1 warm-paper palette.

## Widgets

- **Outcome:** Kept **`expo-widgets` (`58.0.29`) + `@expo/ui` (`58.0.29`)** for iOS (`app/features/widgets/ios/RoiSpike.tsx`, `appGroup: group.com.increasinglabs.roi`) and **`react-native-android-widget` (`0.26.0`)** for Android (`app/features/widgets/android/SpikeWidget.tsx` + headless SQLite handler registered before `expo-router/entry` in `app/index.ts`). Fallback to `@bacons/apple-targets` was not needed in Debug.
- **Evidence:** Both platforms exposed unified `pushSpikeWidget(count)` (`update.ts` / `update.ios.ts`), passed automated `widget` spike checks on both Debug builds, and Android home-screen widget rendering + SQLite count update was verified by the owner on `RMX5106` (`01-13-SUMMARY.md`, `01-15-SUMMARY.md`).
- **Open items (deferred):**
  - iOS widget trailing layout uses `@expo/ui/swift-ui` `environment('locale', 'ar')` + `VStack(alignment: 'trailing')`; physical iPhone home-screen widget placement & cold-start deep-link tap (`roi://spike?from=widget`) could not run without a physical iPhone (`01-15-SUMMARY.md`) and remains open for physical device testing / Phase 7.
  - Android Release APK widget check moved to end of Phase 2.
- **What later phases must do:** Phase 7 will expand the four privacy-safe per-tool widgets on top of this split `update.ts` / `update.ios.ts` pattern; remove or keep device-local `SETTINGS_KEYS.SPIKE_WIDGET` excluded from Google Drive sync in Phase 8 (`01-REVIEW-FIX.md` `WR-05`).

## Scheduler

- **Outcome:** Kept **`ts-fsrs` (`6.0.1`)** running on Hermes. Fallback to `ts-fsrs` `5.4.2` was not needed.
- **Evidence:** Automated `fsrs` probe check in `app/features/spike/rows.tsx` passed on both `iPhone 18 Pro` (iOS 27.0) and `RMX5106` (Android) Debug builds (`01-14-SUMMARY.md`, `01-15-SUMMARY.md`).
- **What later phases must do:** Phase 6 (حفظ الآيات) implements daily card scheduling directly on `ts-fsrs` `6.0.1` storing serialized card JSON and `fsrsModel` in `mem_verses` (`app/features/db/schema.ts`).

## RTL

- **Outcome:** Kept **`expo-localization` (`supportsRTL: true`, `forcesRTL: true`)** plus `CFBundleDevelopmentRegion: "ar"` in `app/app.json` (`01-06`, `01-07`). No JS layout-flip fallback needed.
- **Evidence:** `I18nManager.isRTL === true` passed automated `rtl` check and rendered `roi://torture` cleanly on English-locale (`en-US`) `iPhone 18 Pro` and physical `RMX5106` (`01-15-SUMMARY.md`).
- **What later phases must do:** All new screens/components must stay logical-RTL (`start`/`end`) and assume `I18nManager.isRTL === true` from boot.

## Google Sign-In

- **Outcome:** **`@react-native-google-signin/google-signin` (`17.0.0`)** configured via `iosDependencyManager: 'spm'` + explicit `iosUrlScheme` in `app/app.json`, coexisting cleanly with `@react-native-firebase/*` `27.1.1` (`dynamic` frameworks via `expo-build-properties`), and using Google Cloud Console project `roi-app-515721` OAuth clients (`GOOGLE_OAUTH.webClientId` + `iosClientId` in `app/constants/app.ts`) **without Firebase Auth**.
- **Evidence:** Prebuild + Xcode 27.0 SPM build succeeded (`01-07-SUMMARY.md`, `01-15-SUMMARY.md`). Interactive Android Debug Sign-In passed on `RMX5106` (`01-15-SUMMARY.md`) after registering `app/android/app/debug.keystore` SHA-1 in GCP `roi-app-515721`; Release `app/key.jks` Android OAuth client was also created in GCP `roi-app-515721`.
- **Open items (deferred):** Android Release Sign-In (`RMX5106`) deferred to end of Phase 2; physical iOS interactive Google Sign-In + Release `SceneDelegate` callback test deferred until physical iPhone / Apple Developer provisioning.
- **What later phases must do:** Phase 8 (`SYNC-01..06`) reuses `GOOGLE_OAUTH` from `app/constants/app.ts` with `drive.appdata` scope. Phase 3 (`ADM-01`) uses Google Sign-In on the admin web panel against the same backend allowlist.

## Advertising ID

- **Outcome (partial inspection completed; iOS binary check deferred):**
  - **Firebase SDK settings (`app/firebase.json`):** `google_analytics_adid_collection_enabled: false` and `analytics_default_allow_ad_personalization_signals: false` (`01-12-SUMMARY.md`), plus `withoutAdIdSupport: true` on `@react-native-firebase/analytics` in `app/app.json`.
  - **Android merged release manifest finding:** Inspecting `app/android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml` shows Play Services / Firebase transitive manifests still merge:
    - `com.google.android.gms.permission.AD_ID`
    - `android.permission.ACCESS_ADSERVICES_ATTRIBUTION`
    - `android.permission.ACCESS_ADSERVICES_AD_ID`
  - **iOS `AdSupport` `otool -L` check:** Deferred to end of Phase 2 alongside local Xcode `Release` Simulator build (`no-EAS` rule).
- **What later phases must do:** At end of Phase 2 / before Phase 9 store submission (`REL-02`, `REL-03`), either add `<uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove"/>` (and AdServices removals if unneeded) via a config plugin or accurately declare Advertising ID / Analytics usage in Google Play Data Safety, and verify `AdSupport` absence on iOS via `otool -L`.

## Dev route gating

- **Outcome:** **Verified in code.** Because `app/eas.json` was omitted under the owner's local-only build rule (`01-02-SUMMARY.md`, `01-07-SUMMARY.md`), gating relies directly on environment variables at bundle time:
  - `DEV_TOOLS_ENABLED` in `app/constants/app.ts` evaluates to `__DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === '1'`.
  - `app/app/(dev)/_layout.tsx` immediately renders `<Redirect href={ROUTES.home} />` whenever `!DEV_TOOLS_ENABLED`.
  - `app/app/index.tsx` hides the `(dev)` links (`/(dev)/torture`, `/(dev)/spike`) unless `DEV_TOOLS_ENABLED` is true.
- **Phase 9 carry-over (`REL-03`):** Production store builds (local Xcode Archive & Gradle `assembleRelease`) MUST NOT set `EXPO_PUBLIC_DEV_TOOLS=1`, AND Phase 9 should either strip `app/app/(dev)/` routes completely or verify via release testing that `/(dev)/spike` and `/(dev)/torture` are unreachable in store builds.

## Fallbacks and gaps

- **No EAS / No physical iPhone override (`01-02`):** Replaced all EAS remote builds with local Xcode Simulator (`iPhone 18 Pro`, iOS 27.0) and local Gradle builds (`RMX5106`).
- **Local Xcode/macOS build plugins added (`4f66adc`):**
  - `app/plugins/with-utf8-pods.js` coerces CocoaPods encodings to UTF-8 because the workspace directory contains Arabic characters (`روعي`).
  - `app/plugins/with-xcode27-devlauncher.js` patches `DevLauncherToolbar.swift` (`compiler(>=6.4)` -> `compiler(>=6.5)`) for Xcode 27.0 SDK compatibility; updated in `2ef65a0` (`WR-07`) to warn and skip gracefully rather than throw on upstream changes (remove when `expo-dev-client` fixes upstream).
- **Android release keystore path (`457a10a`):** `app/app.config.js` sets `MYAPP_RELEASE_STORE_FILE=../../key.jks` (ASCII relative path) because `gradle.properties` uses ISO-8859-1 encoding and cannot encode Arabic parent folder names, and bumps `org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m`.
- **Remaining Phase 1 checks explicitly deferred to End of Phase 2 (per owner instruction 2026-11-25):**
  1. **Android Release APK verification on `RMX5106`:** Install `app/android/app/build/outputs/apk/release/app-release.apk` (already confirmed signed with owner `key.jks`, `CN=andrew nasef`, non-debug via `apksigner`), run `roi://spike`, capture `RELEASE_RESULT android pass=N fail=0` from `adb logcat` (verifying Drizzle SQLite migrations in Release / Pitfall 14), plus manual Google Sign-In, widget, and Amiri torture screen checks.
  2. **iOS Release Simulator verification (`iPhone 18 Pro`):** Build Xcode `Release` configuration locally with `EXPO_PUBLIC_DEV_TOOLS=1`, capture `RELEASE_RESULT ios pass=N fail=0` from the device element tree/console, and run `otool -L` to confirm `AdSupport` is absent.
  3. **Firebase Release telemetry + Crashlytics proof (`REL-01`, `WR-03`, `WR-06`):** On release builds, enable consent switch (confirm MMKV persistence `pref.telemetry_consent`), send `spike_test` event (with Android DebugView enabled), trigger Test Crash + relaunch, trigger Sentinel Error + relaunch, and verify in Firebase Console that DebugView/Realtime received `spike_test` and Crashlytics shows `E_UNCAUGHT` with zero Arabic/sentinel text and zero user ID/properties.
  4. **Code-review human checks (`01-REVIEW-FIX.md`):** Human verification of `WR-01` (`mergeRecords`), `WR-02` (`personalize()`), `WR-03` (release error scrubbing), and `WR-06` (consent toggle/persistence), plus deciding `WR-05`'s `spike_widget_count` cleanup at spike sign-off.
  5. **Physical iPhone gaps (deferred until hardware/Apple provisioning):** Physical iOS Google Sign-In interactive login, physical iPhone home-screen widget tap from cold start, and iOS TestFlight/Archive build.
