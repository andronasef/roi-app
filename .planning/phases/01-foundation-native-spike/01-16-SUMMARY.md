---
phase: 01-foundation-native-spike
plan: 16
subsystem: release-spike-signoff
tags: [android-release, keytool, apksigner, amiri, firebase, ad-id, dev-gating, decisions]

requires:
  - phase: 01-foundation-native-spike
    provides: Dev-verified spike builds and `font: amiri` selection (01-15), post-review fixes WR-01..WR-07 (`313240d`)
provides:
  - Default Scripture font locked to `'amiri'` in `app/constants/theme.ts`
  - Owner-signed local Android release APK (`app/android/app/build/outputs/apk/release/app-release.apk`, verified via `apksigner`)
  - Static inspection of Android merged release manifest ad permissions and dev-route gating (`app/(dev)/_layout.tsx`)
  - Complete `.planning/phases/01-foundation-native-spike/01-SPIKE-DECISIONS.md` capturing all Phase 1 outcomes and Phase 2/9 carry-overs
affects: [02-content-backend-first-download, 04-onboarding-personalization-identity, 06-memorization-daily-loop, 07-widgets, 08-google-drive-backup-restore, 09-teaching-layers-store-release]

actuals:
  tasks: 2
  commits: 2
  plan_head_before: 6ba25ee
  plan_head_after: 313240d

key-files:
  created:
    - .planning/phases/01-foundation-native-spike/01-SPIKE-DECISIONS.md
    - .planning/phases/01-foundation-native-spike/01-16-SUMMARY.md
  modified:
    - app/constants/theme.ts
    - app/app.config.js
    - app/app.json
    - app/package.json
    - bun.lock

key-decisions:
  - "Applied `SCRIPTURE_FONT_DEFAULT = 'amiri'` in `app/constants/theme.ts` and validated with unit tests (14 files, 97 tests), `bun run typecheck`, and `expo lint --max-warnings 0`"
  - "Verified `app/android/app/build/outputs/apk/release/app-release.apk` is signed with the owner's `key.jks` (`CN=andrew nasef`, non-debug) via `apksigner verify --print-certs`"
  - "Documented Android merged release manifest `AD_ID` / `ACCESS_ADSERVICES_*` permissions for Phase 9 store disclosure or removal"
  - "Per owner instruction (2026-11-25), deferred all remaining live device Release checks, Firebase Release/Console triggers, iOS Release Simulator `otool -L`, and WR human checks to the end of Phase 2"

patterns-established:
  - "Local release builds use ASCII relative `MYAPP_RELEASE_STORE_FILE=../../key.jks` and `-Xmx4096m` Gradle heap in `app/app.config.js`"
  - "End-of-Phase-2 verification inherits Phase 1's on-device Release & Firebase Console verification queue alongside Phase 2 UAT"

requirements-completed: []

duration: 20min
completed: 2026-11-25
status: complete
---

# Phase 1 Plan 16: Release Builds & Spike Sign-Off Summary

**Applied `amiri` default font, produced owner-signed Android Release APK, recorded all settled architecture/stack outcomes in `01-SPIKE-DECISIONS.md`, and formally deferred remaining live Release/Firebase checks to end of Phase 2**

## Accomplishments

- **Font default locked:** `SCRIPTURE_FONT_DEFAULT` is set to `'amiri'` in `app/constants/theme.ts`; `bun run test` (14 files, 97 tests), `bun run typecheck`, and `cd app && bun run lint` all pass after all code-review fixes (`313240d`).
- **Local Android Release APK built & signer verified:** Built `app/android/app/build/outputs/apk/release/app-release.apk` with `@rnrepo/expo-config-plugin` (`f7946f6`), ASCII relative keystore path, and 4GB Gradle heap (`457a10a`). `apksigner verify --print-certs` confirmed Signer #1 is the owner's release key (`CN=andrew nasef`, not Android Debug).
- **Static release audits completed:**
  - Inspected `app/android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml` and recorded `com.google.android.gms.permission.AD_ID`, `ACCESS_ADSERVICES_ATTRIBUTION`, and `ACCESS_ADSERVICES_AD_ID` for Phase 9 Play Data Safety / stripping.
  - Verified dev-route gating via `DEV_TOOLS_ENABLED` (`__DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === '1'`) in `app/constants/app.ts` and redirect behavior in `app/app/(dev)/_layout.tsx` (omitting `app/eas.json` per the local-only build rule).
- **Decision record created:** Wrote `.planning/phases/01-foundation-native-spike/01-SPIKE-DECISIONS.md` covering all 10 required sections and Phase 2 / Phase 9 carry-overs.

## Deferred Checks (Moved to End of Phase 2)

Per owner instruction on **2026-11-25**, execution stopped before running live Release device checks and moved all remaining checks to the **end of Phase 2**:

1. **Android Release APK run (`RMX5106`):** Uninstall Debug APK, install `app/android/app/build/outputs/apk/release/app-release.apk`, run `roi://spike`, capture `RELEASE_RESULT android pass=N fail=0` from `adb logcat` (verifying Drizzle Release `.sql` migrations / Pitfall 14), plus Release Google Sign-In, widget, and Amiri torture screen sanity checks.
2. **iOS Release Simulator run (`iPhone 18 Pro`):** Build Xcode `Release` configuration locally with `EXPO_PUBLIC_DEV_TOOLS=1`, capture `RELEASE_RESULT ios pass=N fail=0`, and run `otool -L` on the Release binary to confirm `AdSupport` is not linked. *(No EAS remote build and no physical iPhone per `01-02-SUMMARY.md` override.)*
3. **Firebase Release telemetry & Crashlytics proof (`REL-01`, `WR-03`, `WR-06`):** Toggle telemetry consent ON, enable Android DebugView (`adb shell setprop debug.firebase.analytics.app com.increasinglabs.roi`), trigger `spike_test` event, trigger Test Crash + relaunch, trigger Sentinel Error (`throwSpikeSentinelError()`) + relaunch, and inspect Firebase Console to confirm `spike_test` arrives and Crashlytics records only `E_UNCAUGHT` with zero Arabic/sentinel text and zero user ID/properties.
4. **Code-review human checks (`01-REVIEW-FIX.md`):** Human verification for `WR-01` (`mergeRecords`), `WR-02` (`personalize()`), `WR-03` (release error scrubbing), and `WR-06` (consent persistence/error handling), plus final decision on `WR-05`'s `spike_widget_count` row cleanup.

## Gaps

- `FND-09` and `REL-01` have full code + unit-test + Debug-build proof (`01-14`, `01-15`), while their **Release-build and Firebase Console proof** (`RELEASE_RESULT` lines, trigger timestamps, `FND-09`/`REL-01` sign-off) remains open in the End-of-Phase-2 verification queue above.
- Physical iPhone interactive Google Sign-In and physical iOS home-screen widget placement/cold-start tap remain deferred until physical iOS hardware / Apple Developer provisioning (`01-15-SUMMARY.md`).

---
*Phase: 01-foundation-native-spike*
*Completed: 2026-11-25*
