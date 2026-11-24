---
phase: 01-foundation-native-spike
plan: 02
subsystem: auth
tags: [firebase, google-oauth, local-builds, crashlytics, analytics]

requires:
  - phase: 01-foundation-native-spike
    provides: Fixed identifiers (com.increasinglabs.roi, group.com.increasinglabs.roi) from 01-01-SUMMARY.md
provides:
  - Out-of-repo Firebase config paths (GOOGLE_SERVICES_PLIST, GOOGLE_SERVICES_JSON) for Analytics and Crashlytics
  - Google Cloud Console OAuth 2.0 Client IDs (Web, iOS, Android Debug) and External Testing consent screen without Firebase Auth or EAS
affects: [01-07, 01-12, 01-14, 01-15, 01-16]

actuals:
  tokens: 0
  tasks: 2
  commits: 1

tech-stack:
  added: []
  patterns:
    - "Local-only native builds via Xcode (iOS Simulator) and Gradle (Android), no EAS"
    - "Google OAuth 2.0 clients managed directly in Google Cloud Console without enabling Firebase Auth"

key-files:
  created:
    - .planning/phases/01-foundation-native-spike/01-02-SUMMARY.md
  modified: []

key-decisions:
  - "Owner opted out of EAS completely; iOS runs locally via Xcode/iOS Simulator (no physical iPhone available) and Android builds locally via Gradle"
  - "Owner opted out of Firebase Auth; OAuth consent screen and Web/iOS/Android OAuth Client IDs created directly in Google Cloud Console (project roi-app-515721)"
  - "Firebase project roi-app-9f7b2 remains on Spark plan with Analytics and Crashlytics enabled"

patterns-established:
  - "Use iosUrlScheme + iosClientId + webClientId directly from Google Cloud Console OAuth clients rather than Firebase Auth REVERSED_CLIENT_ID"

requirements-completed: [FND-09, REL-01]

coverage:
  - id: D1
    description: "Local build targets and Xcode/Android tooling ready without EAS (iOS Simulator + local Android)"
    requirement: "FND-09"
    verification:
      - kind: manual_procedural
        ref: "Local Xcode + iOS Simulator (iPhone 18 Pro) and Android debug keystore verified"
        status: pass
    human_judgment: true
    rationale: "No physical iPhone available and owner builds locally without EAS"
  - id: D2
    description: "Firebase Analytics + Crashlytics project (roi-app-9f7b2) and Google Cloud Console OAuth clients (roi-app-515721)"
    requirement: "REL-01"
    verification:
      - kind: automated_ui
        ref: "plutil/jq metadata check on out-of-repo Firebase configs + Cua browser setup of OAuth consent & 3 clients"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-11-24
status: complete
---

# Phase 1 Plan 02: Firebase & Google Cloud OAuth Setup Summary

**Configured Firebase Analytics/Crashlytics (`roi-app-9f7b2`) and Google Cloud Console OAuth clients (`roi-app-515721`) for Web, iOS, and Android Debug without EAS or Firebase Auth**

## Performance

- **Duration:** 20 min
- **Started:** 2026-11-24T20:45:00Z
- **Completed:** 2026-11-24T23:16:34Z
- **Tasks:** 2
- **Files modified:** 1 (`.planning/phases/01-foundation-native-spike/01-02-SUMMARY.md`)

## Accomplishments

- Verified downloaded Firebase config files outside the repository matching `com.increasinglabs.roi`, with zero secrets tracked by git.
- Automated Google Auth Platform setup via Cua Driver in Edge for project `roi-app-515721`: External OAuth consent screen (Testing mode with owner test user), Web OAuth client, iOS OAuth client (`com.increasinglabs.roi`), and Android Debug OAuth client (`com.increasinglabs.roi` bound to local `~/.android/debug.keystore`).
- Verified Firebase Analytics and Crashlytics are enabled on Spark plan project `roi-app-9f7b2`.

## Configuration Metadata (Non-Secret)

GOOGLE_SERVICES_PLIST: /Users/andrew/Downloads/GoogleService-Info.plist
GOOGLE_SERVICES_JSON: /Users/andrew/Downloads/google-services.json
FIREBASE_PROJECT_ID: roi-app-9f7b2
OAUTH_GCP_PROJECT_ID: roi-app-515721
GOOGLE_WEB_CLIENT_ID: 23662840492-h4j3v57k9dpm0suqa61qpkv7qh78qq9v.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID: 23662840492-laqcbt3hkft72a3mu0ofcokeskr7sr7a.apps.googleusercontent.com
GOOGLE_IOS_URL_SCHEME: com.googleusercontent.apps.23662840492-laqcbt3hkft72a3mu0ofcokeskr7sr7a
GOOGLE_ANDROID_DEBUG_CLIENT_ID: 23662840492-l6k9q45ljab0hjl34ed63mb85nprt6eq.apps.googleusercontent.com
BUILD_MODE: local-only (no EAS; iOS Simulator via Xcode + local Android via Gradle)

## Verification Checks

- `plutil -extract BUNDLE_ID raw /Users/andrew/Downloads/GoogleService-Info.plist` -> `com.increasinglabs.roi`
- `jq '.client[0].client_info.android_client_info.package_name' /Users/andrew/Downloads/google-services.json` -> `com.increasinglabs.roi`
- `git ls-files -- '*google-services.json' '*GoogleService-Info.plist'` -> empty (`GIT_CLEAN_OK`)

## Deviations from Plan

- **No EAS:** Owner does not use EAS. Skipped `eas-cli login`, `eas device:create`, and EAS secret file variables; plans `01-07`, `01-15`, and `01-16` use local Xcode + Gradle builds directly.
- **No Physical iPhone:** Owner does not have a physical iPhone; iOS builds will run on the local iOS Simulator (`iPhone 18 Pro`, iOS 27.0) instead of an ad-hoc registered iPhone.
- **No Firebase Auth:** Owner opted out of enabling Firebase Auth; OAuth consent screen and Web/iOS/Android Debug OAuth clients were created directly in Google Cloud Console (`roi-app-515721`), so `iosUrlScheme`, `iosClientId`, and `webClientId` are configured explicitly without `REVERSED_CLIENT_ID` from `GoogleService-Info.plist`.

## Issues Encountered

- `cua-driver` `browser_prepare` refused on Edge (`browser_wrong_target_refused`), so the Google Cloud Console & Firebase Console UI steps were driven reliably via `get_window_state` + `run_steps` accessibility actions.

## User Setup Required

- When building the Android release APK in `01-16`, add the release `key.jks` SHA-1 as an Android OAuth client in Google Cloud Console (`roi-app-515721`) and confirm Analytics data sharing / Google signals settings in Google Analytics if desired.
- If/when testing on a physical iPhone later (TestFlight/App Store), register App Group `group.com.increasinglabs.roi` and App ID `com.increasinglabs.roi` in Apple Developer portal.

## Next Phase Readiness

- Wave 6 (`01-07`: Drizzle baseline migration, native config plugins, Firebase config copy, and `expo prebuild`) is now unblocked.

---
*Phase: 01-foundation-native-spike*
*Completed: 2026-11-24*
