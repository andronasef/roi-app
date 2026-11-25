---
phase: 01-foundation-native-spike
plan: 15
subsystem: native-spike-dev
tags: [ios-simulator, android, xcode, gradle, google-signin, widgets, fonts, icons]

requires:
  - phase: 01-foundation-native-spike
    provides: Dev spike screen (01-14), Google Cloud OAuth & local build setup (01-02), native plugins & Firebase configs (01-07)
provides:
  - Verified local iOS Simulator Debug build (`SPIKE_RESULT ios pass=8 fail=0`) on `iPhone 18 Pro` (iOS 27.0)
  - Verified local Android Debug APK (`SPIKE_RESULT android pass=8 fail=0`) on physical `realme RMX5106`
  - Owner-verified Google Sign-In, home-screen widget, Arabic typography torture screen, and `font: amiri` selection
  - UTF-8 CocoaPods & Xcode 27 DevLauncher config plugins plus Good Shepherd app icons
affects: [01-16]

actuals:
  tasks: 3
  commits: 2
  plan_head_before: 33eb5f4
  plan_head_after: 441a00f

key-files:
  created:
    - app/plugins/with-utf8-pods.js
    - app/plugins/with-xcode27-devlauncher.js
  modified:
    - app/app.json
    - app/assets/images/icon.png
    - app/assets/images/android-icon-foreground.png
    - app/assets/images/android-icon-background.png
    - app/assets/images/android-icon-monochrome.png
    - app/assets/images/splash-icon.png
    - app/assets/images/favicon.png

key-decisions:
  - "Added `app/plugins/with-utf8-pods.js` to coerce CocoaPods command output encoding to UTF-8 for the Arabic workspace directory name"
  - "Added `app/plugins/with-xcode27-devlauncher.js` to bump `compiler(>=6.4)` to `compiler(>=6.5)` in `expo-dev-launcher` `DevLauncherToolbar.swift` for Xcode 27.0 / iOS 27.0 SDK compatibility"
  - "Registered Gradle `app/android/app/debug.keystore` SHA-1 and Release `app/key.jks` SHA-1 Android OAuth clients in GCP `roi-app-515721` (since `01-02` originally bound `~/.android/debug.keystore`)"
  - "Owner selected `amiri` (`font: amiri`) as the default Scripture font (D-04)"
  - "Generated full-bleed `icon.png`, adaptive safe-zone foreground/background/monochrome Android icons, splash icon, and favicon from owner's Good Shepherd SVG, removing `ios.icon` override (`./assets/expo.icon`)"

patterns-established:
  - "Config plugin `withDangerousMod` patches third-party pod/Xcode SDK incompatibilities cleanly across `expo prebuild --clean` without altering pinned dependencies"

requirements-completed: [FND-01, FND-02, FND-09]

duration: 45min
completed: 2026-11-25
status: complete
---

# Phase 1 Plan 15: Local Native Development Builds & Spike Checkpoint Summary

**Built and verified local iOS Simulator (`iPhone 18 Pro`) and physical Android (`RMX5106`) development builds with `pass=8 fail=0` automated checks on both platforms, owner-verified Google Sign-In, widgets, Arabic typography, and `font: amiri` selection**

## Build Targets (Local-Only Override per 01-02)

- **iOS (Xcode local Simulator build):** `rway.app` built from `app/ios/rway.xcworkspace` (`Debug`, `iPhone 18 Pro` / iOS 27.0, derivedData `app/ios/build`) and launched via Metro (`http://localhost:8081`).
- **Android (Gradle local Debug APK):** `app/android/app/build/outputs/apk/debug/app-debug.apk` (`BUILD SUCCESSFUL`) installed onto physical `realme RMX5106` via ADB wireless debugging (`adb -t 2`).

## Automated Spike Results (Metro Logs)

- **iOS (`iPhone 18 Pro`):** `SPIKE_RESULT ios pass=8 fail=0`
- **Android (`RMX5106`):** `SPIKE_RESULT android pass=8 fail=0`

| Check | iOS (`iPhone 18 Pro`) | Android (`RMX5106`) | Notes |
|---|---|---|---|
| `rtl` | pass | pass | Forced RTL (`لغة الجهاز: en-US`) |
| `fonts` | pass | pass | Bundled Amiri, Scheherazade New, IBM Plex Sans Arabic |
| `mmkv` | pass | pass | Native MMKV read/write |
| `sqlite` | pass | pass | Baseline Drizzle migration + settings read/write |
| `reanimated` | pass | pass | UI runtime worklet probe |
| `fsrs` | pass | pass | `ts-fsrs` v6 scheduling on Hermes |
| `firebase` | pass | pass | `@react-native-firebase/app` initialized (`roi-app-9f7b2`) |
| `widget` | pass | pass | DB counter + native widget push (`expo-widgets` / `react-native-android-widget`) |

## Owner Checkpoint Results & Font Choice

- **Google Sign-In (`RMX5106`):** Passed (`سجلت صح بال debug ونفع!`) after adding `app/android/app/debug.keystore` Android OAuth client in GCP `roi-app-515721`; Release `app/key.jks` Android OAuth client (`Roi Android Release`) also created in GCP `roi-app-515721`.
- **Home-Screen Widget (`RMX5106`):** Verified working (`تمام، الودجت اللي هو تمام`).
- **Arabic Typography (`roi://torture`):** Verified clean RTL layout, tashkeel, Eastern Arabic digits (`١٢٣٤٥٦٧٨٩٠`), and all 5 slider sizes on both `iPhone 18 Pro` (screenshots) and `RMX5106`.
- **Uncaught Sentinel Error Scrubber (`RMX5106`):** Owner triggered `throwSpikeSentinelError()`; Metro logged `ERROR  [Error: E_UNCAUGHT]` with zero Arabic sentinel leakage.
- **Scripture Font Choice:** font: amiri

## Fixes & Deviations Applied

- **CocoaPods UTF-8 path fix (`4f66adc`):** Added `app/plugins/with-utf8-pods.js` after `pod install` failed with `UTF-8`/`ASCII-8BIT` mismatch inside `hermes-engine.podspec` due to the Arabic workspace directory (`روعي`).
- **Xcode 27.0 / iOS 27.0 SDK DevLauncher fix (`4f66adc`):** Added `app/plugins/with-xcode27-devlauncher.js` to bump `#if os(iOS) && compiler(>=6.4)` to `>=6.5` in `DevLauncherToolbar.swift` where `axisBehavior(.verticalPreferred)` is absent in iOS 27.0 SDK.
- **App Icons from Owner SVG (`441a00f`):** Generated full-bleed `icon.png` (`#FEEAC9`), safe-zone centered Android adaptive foreground/background/monochrome assets, splash icon, and favicon; removed `ios.icon` (`./assets/expo.icon`) override in `app/app.json`.

## Gaps / Local Scope Notes

- **No EAS / No Physical iPhone (`01-02` override):** Builds run locally via Xcode Simulator (`iPhone 18 Pro`) and Gradle (`RMX5106`) rather than EAS remote builds or a physical iPhone; iOS Google Sign-In interactive login and physical iOS home-screen widget tap are deferred until a physical iPhone/Apple Developer provisioning run.
- **Android Emulator (`Pixel_9`) `agent-device` timeout:** `agent-device` failed twice on `emulator-5554` (`Could not read process state for com.increasinglabs.roi` / `adb pidof did not answer`), so Android verification ran directly on the owner's physical `RMX5106`.

---
*Phase: 01-foundation-native-spike*
*Completed: 2026-11-25*
