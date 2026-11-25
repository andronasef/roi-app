---
phase: 01-foundation-native-spike
fixed_at: 2026-11-25T13:20:00Z
review_path: /Users/andrew/Documents/Work/Dev/Projects/Personalss/روعي/.planning/phases/01-foundation-native-spike/01-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 1: Code Review Fix Report

**Fixed at:** 2026-11-25
**Source review:** .planning/phases/01-foundation-native-spike/01-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (fix_scope `critical_warning`; IN-01..IN-06 out of scope, remain in REVIEW.md)
- Fixed: 7
- Skipped: 0

**Verification:** run in the main checkout after the isolated worktree was fast-forwarded into `main` (the worktree has no `node_modules`). `npx vitest run`: 14 files, 97 tests, all pass (was 95 before; +2 new tests). `npx tsc --noEmit -p app/tsconfig.json`: clean. `expo lint --max-warnings 0` in `app/`: clean.

## Fixed Issues

### WR-01: `mergeRecords` tie-break depends on object key order

**Files modified:** `shared/src/merge.ts`, `shared/src/__tests__/merge.test.ts`
**Commit:** 735953a
**Status:** fixed: requires human verification (logic change)
**Applied fix:** Tie-break now compares a canonical JSON string with object keys sorted at every depth. Added a test where two devices hold the same logical rows in opposite key orders. I confirmed it fails against the old code and passes with the fix.

### WR-02: `personalize()` collapses newlines when the name is missing

**Files modified:** `shared/src/arabic.ts`, `shared/src/__tests__/arabic.test.ts`
**Commit:** 622fe9b
**Status:** fixed: requires human verification (logic change)
**Applied fix:** Whitespace collapse now only matches horizontal whitespace (`[ \t ]{2,}`), so paragraph and list breaks survive. Added a multi-paragraph test. Dangling punctuation such as "يا ، الرب" is left as a content-design decision, as the review noted.

### WR-03: Global error scrubber also scrubs the dev red-box

**Files modified:** `app/services/telemetry.ts`
**Commit:** e76685e
**Status:** fixed: requires human verification (logic change)
**Applied fix:** The handler passes the original error to the previous handler when `__DEV__` is true. Release builds still scrub to error codes. The scrubber is still installed in dev, so Crashlytics handler setup is unchanged. Verify scrubbing with the spike sentinel-error button in a release build.

### WR-04: `build:android:apk` applies `NODE_ENV=production` to `cd`

**Files modified:** `app/package.json`
**Commit:** d31a674
**Applied fix:** Script is now `cd android && NODE_ENV=production ./gradlew assembleRelease`.

### WR-05: Spike and diagnostic data written into sync-eligible `settings` table

**Files modified:** `app/app/index.tsx`, `app/services/storage.ts`, `app/constants/app.ts`, `app/features/spike/rows.tsx`
**Commits:** aa2ca46, c4d5a2b
**Applied fix:**
- `last_boot` moved to MMKV (`diag.last_boot`), and the unused `SETTINGS_KEYS.LAST_BOOT` was removed.
- The SQLite probe row is tombstoned after readback. A hard delete was rejected by the repo's `no .delete()` guard test, which is how that was caught.
- `spike_widget_count` stays in SQLite on purpose. The Android widget reads it from SQLite in a headless task, which is what the spike proves. It is now documented in `constants/app.ts` as a device-local diagnostic to exclude from sync or delete at spike sign-off.

### WR-06: Spike consent toggle and handlers have no error handling

**Files modified:** `app/app/(dev)/spike.tsx`, `app/features/spike/rows.tsx`, `app/services/storage.ts`
**Commit:** 7244c39
**Status:** fixed: requires human verification (state handling)
**Applied fix:** Consent state is set only after the native call succeeds, and the UI reverts to the persisted value on failure. The choice is persisted in MMKV (`pref.telemetry_consent`) and read on mount. `handleRerun` uses try/finally so `running` cannot stick. `handleSendTestEvent` has a try/catch.

### WR-07: `with-xcode27-devlauncher` mutates `node_modules` in place

**Files modified:** `app/plugins/with-xcode27-devlauncher.js`
**Commit:** 2ef65a0
**Applied fix:** Partial, by design. The `require.resolve` fallback chain is now wrapped so it cannot throw during prebuild, and every skip path logs a warning (including "already patched" and "upstream changed, remove this plugin"). I did not move to `bun patch` or `patch-package`, because that is a build-pipeline change to a working native build and needs a prebuild and Xcode run to verify. The in-place write against the bun cache remains a known risk. Delete the plugin when `expo-dev-client` is bumped past the issue.

---

_Fixed: 2026-11-25_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
