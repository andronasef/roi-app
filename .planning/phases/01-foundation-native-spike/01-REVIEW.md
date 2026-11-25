---
phase: 01-foundation-native-spike
reviewed: 2026-11-25T12:55:00Z
depth: standard
files_reviewed: 87
files_reviewed_list:
  - .gitignore
  - .node-version
  - admin/package.json
  - admin/src/__tests__/shared.test.ts
  - app/.gitignore
  - app/__tests__/guards.test.ts
  - app/app.config.js
  - app/app.json
  - app/app/(dev)/_layout.tsx
  - app/app/(dev)/spike.tsx
  - app/app/(dev)/torture.tsx
  - app/app/_layout.tsx
  - app/app/index.tsx
  - app/babel.config.js
  - app/components.json
  - app/components/ui/dialog.tsx
  - app/components/ui/icon.tsx
  - app/components/ui/native-only-animated-view.tsx
  - app/components/ui/select.tsx
  - app/components/ui/text.tsx
  - app/constants/app.ts
  - app/constants/db.ts
  - app/constants/spike.ts
  - app/constants/telemetry.ts
  - app/constants/theme.ts
  - app/drizzle.config.ts
  - app/drizzle/0000_noisy_kulan_gath.sql
  - app/drizzle/meta/0000_snapshot.json
  - app/drizzle/meta/_journal.json
  - app/drizzle/migrations.js
  - app/eslint.config.js
  - app/features/db/__tests__/events.test.ts
  - app/features/db/__tests__/migrate.test.ts
  - app/features/db/__tests__/schema.test.ts
  - app/features/db/client.ts
  - app/features/db/events.ts
  - app/features/db/schema.ts
  - app/features/scripture/scripture.tsx
  - app/features/spike/__tests__/runner.test.ts
  - app/features/spike/rows.tsx
  - app/features/spike/runner.ts
  - app/features/widgets/__tests__/widgets.test.ts
  - app/features/widgets/android/SpikeWidget.tsx
  - app/features/widgets/android/register.ts
  - app/features/widgets/android/task-handler.tsx
  - app/features/widgets/ios/RoiSpike.tsx
  - app/features/widgets/update.ios.ts
  - app/features/widgets/update.ts
  - app/firebase.json
  - app/global.css
  - app/hooks/use-theme-preference.ts
  - app/index.ts
  - app/lib/utils.ts
  - app/locales/ar.json
  - app/metro.config.js
  - app/nativewind-env.d.ts
  - app/package.json
  - app/plugins/with-firebase-configure.js
  - app/plugins/with-utf8-pods.js
  - app/plugins/with-xcode27-devlauncher.js
  - app/scripts/build-fixture.mjs
  - app/services/__tests__/telemetry.test.ts
  - app/services/storage.ts
  - app/services/telemetry-scrub.ts
  - app/services/telemetry.ts
  - app/tailwind.config.js
  - app/tsconfig.json
  - app/types/css.d.ts
  - backend/package.json
  - backend/src/__tests__/shared.test.ts
  - bunfig.toml
  - package.json
  - shared/package.json
  - shared/src/__tests__/arabic.test.ts
  - shared/src/__tests__/ids.test.ts
  - shared/src/__tests__/merge.test.ts
  - shared/src/__tests__/period.test.ts
  - shared/src/__tests__/schemas.test.ts
  - shared/src/arabic.ts
  - shared/src/fixtures.ts
  - shared/src/ids.ts
  - shared/src/index.ts
  - shared/src/merge.ts
  - shared/src/period.ts
  - shared/src/schemas.ts
  - tsconfig.json
  - vitest.config.ts
findings:
  critical: 0
  warning: 7
  info: 6
  total: 13
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-11-25
**Depth:** standard
**Files Reviewed:** 87
**Status:** issues_found

## Summary

The existing suite passes (`npx vitest run`: 14 files, 95 tests). Secrets (`google-services.json`, `GoogleService-Info.plist`, `.signing.env`, `key.jks`) are gitignored and not tracked, and a guard test enforces that. Firebase auto-collection is disabled in `firebase.json`, and `track()` passes no parameters. `scrubError` reduces messages to a closed set of codes. I found no critical security issues.

The real defects are mostly in logic that will carry forward into later phases:

- The sync merge tie-break is not convergent across devices.
- `personalize()` destroys paragraph breaks in rich text.
- The global error scrubber breaks dev-time error visibility.
- Spike or diagnostic data is written into sync-eligible tables.

No structural (fallow) findings were supplied for this run. I did not read `app/drizzle/meta/0000_snapshot.json` (generated). I only skimmed the `runner`, `ids`, `period` and `schemas` test files.

## Warnings

### WR-01: `mergeRecords` tie-break depends on object key order, so devices can diverge

**File:** `shared/src/merge.ts:18`
**Issue:** When `updatedAt` and tombstone state are equal, the winner is chosen with `JSON.stringify(a) >= JSON.stringify(b)`. `JSON.stringify` is key-order dependent. Local rows come from Drizzle (column order) and remote rows come from parsed Drive JSON, which may order keys differently.

Take two rows with the same id, the same `updatedAt` and different bodies. Device 1 compares its own local row's string against the remote row's string. Device 2 compares its local row's string against the other one, with its own key order. The strings can sort differently, so the two devices pick opposite winners and never converge. This breaks the commutativity and convergence that the tests claim. The tests pass only because both fixtures use identical key order, and `a.body` ties are never exercised with reordered keys.
**Fix:** Use an order-independent canonical comparison, or compare explicit fields. For example, build the key from sorted entries:
```ts
const canon = (r: SyncRow) =>
  JSON.stringify(Object.keys(r).sort().map((k) => [k, (r as Record<string, unknown>)[k]]));
return canon(a) >= canon(b) ? a : b;
```
Add a test with the same logical rows but different key order.

### WR-02: `personalize()` collapses newlines when the name is missing, corrupting Markdown articles

**File:** `shared/src/arabic.ts:79`
**Issue:** `.replace(/\s{2,}/g, ' ')` matches any run of whitespace, including `\n\n`. CLAUDE.md says names of God and blessings are Markdown-subset articles (paragraphs, lists, headings) rendered after `personalize`.

With no name, `"## عنوان\n\nيا {الاسم} سلام\n\n- نقطة"` becomes one line with all paragraph and list structure flattened. The behaviour also differs from the named path, which leaves newlines intact. The same happens with `trim()` on leading and trailing newlines. The test only covers single-line strings.
**Fix:** Collapse only horizontal whitespace, and tidy up around the removed token:
```ts
return raw.replaceAll(NAME_TOKEN, '').replace(/[ \t ]{2,}/g, ' ').trim();
```
Add a multi-paragraph test. Consider handling dangling punctuation, such as "يا ، الرب", as a separate content-design decision.

### WR-03: Global error scrubber also scrubs the dev red-box and any non-Crashlytics handler

**File:** `app/services/telemetry.ts:40-43`
**Issue:** `ErrorUtils.setGlobalHandler` wraps the whole previous handler chain, which includes React Native's default handler (red-box and console). Every uncaught error is replaced with `Error: E_UNCAUGHT` before any consumer sees it. In dev builds, and in any build where collection is off, developers lose the message and cannot debug thrown errors. The scrubbing only needs to protect data leaving the device.
**Fix:** Install the scrubber only when it matters, for example `if (!__DEV__)`. Alternatively, pass the original error to the previous handler when `__DEV__` is true. The spike's sentinel-error button is the intended manual check for scrubbing, so test it with a release build.

### WR-04: `build:android:apk` script applies `NODE_ENV=production` to `cd`, not to Gradle

**File:** `app/package.json:12`
**Issue:** `NODE_ENV=production cd android && ./gradlew assembleRelease` sets the variable only for the `cd` builtin. Gradle and the Metro/Expo bundling step run without `NODE_ENV=production`. The script claims to produce a production APK.
**Fix:**
```json
"build:android:apk": "cd android && NODE_ENV=production ./gradlew assembleRelease"
```

### WR-05: Spike and diagnostic data is written into the sync-eligible `settings` table

**File:** `app/features/spike/rows.tsx:84-96, 165-181`; `app/app/index.tsx:51-68`
**Issue:** The `settings` table is documented as "eligible for Drive sync". The spike writes `__spike_sqlite_probe__` and `spike_widget_count`, and the home screen writes `last_boot` on every launch. These are device-local diagnostics, not user settings.

When the Drive sync arrives, per-device values like `last_boot` will be merged by LWW across devices. A device will show another device's "last open" time, and probe rows will be uploaded. The probe rows are also never tombstoned.
**Fix:** Keep device-local diagnostics in MMKV, or add a `local_only` or `scope` column before sync lands. Remove the probe and boot-time rows once the spike is signed off.

### WR-06: Spike screen consent toggle and handlers have no error handling and can desync from native state

**File:** `app/app/(dev)/spike.tsx:78-94`
**Issue:** `handleToggleConsent` sets state first, then awaits `setTelemetryConsent`. If that rejects, it is an unhandled rejection (the call site uses `void`) and the switch shows "on" while collection remains off. The initial `consentEnabled` is hard-coded `false`, so it does not reflect the persisted native setting after a restart. `handleRerun` and `handleSendTestEvent` also lack try/catch, so a rejection leaves `running` stuck at `true`.
**Fix:** Wrap the calls in try/catch and set state after success. Read the real consent state on mount, or persist the user's choice in MMKV.

### WR-07: `with-xcode27-devlauncher` mutates `node_modules` in place

**File:** `app/plugins/with-xcode27-devlauncher.js:27-47`
**Issue:** The plugin rewrites a file inside an installed dependency at prebuild time. It is idempotent, but the effects have two problems:
- A dependency reinstall silently reverts it.
- Under bun's isolated linker, files are linked from the global cache. Depending on the platform's link mode (hardlink vs clonefile), an in-place write can mutate the shared cache copy for other projects.

The catch fallback for `require.resolve('expo-dev-launcher')` can also throw an unhandled error during prebuild. It returns `false` silently when the target string is missing, so a fix upstream or a version bump will quietly stop applying the patch with no log.
**Fix:** Use a `patch-package` or `bun patch` patch, or at least log when the patch is skipped. Delete the plugin when `expo-dev-client` is bumped past the issue.

## Info

### IN-01: Debug and diagnostic UI is reachable on the production home screen

**File:** `app/app/index.tsx:71-91`
**Issue:** The home screen renders "RTL: مفعّل / غير مفعّل" and "أول مرة / آخر فتح" unconditionally. These are spike diagnostics, not end-user copy. Only the dev links are gated by `DEV_TOOLS_ENABLED`. Also, setting `EXPO_PUBLIC_DEV_TOOLS=1` in a release build exposes the Crashlytics test-crash button (`app/features/spike/rows.tsx:206`).
**Fix:** Gate the diagnostic strings with `DEV_TOOLS_ENABLED`. Make sure release and EAS profiles never set `EXPO_PUBLIC_DEV_TOOLS`.

### IN-02: `PRAGMA foreign_keys = ON` has nothing to enforce

**File:** `app/features/db/client.ts:10`, `app/features/db/schema.ts`
**Category:** necessity
**Issue:** No table declares a foreign key; `prayer_events.prayer_id` and `review_events.mem_verse_id` are plain text columns. Sync merge can deliver children before parents, so FKs are arguably deliberate. In that case the pragma is dead configuration that suggests protection that does not exist. `logPrayed` and `logReview` can also write orphan events.
**Fix:** Either remove the pragma or document the no-FK-by-design decision. Confirm the parent exists in the writer helpers if integrity matters.

### IN-03: `softDelete` is a six-way switch that repeats the same update

**File:** `app/features/db/events.ts:80-127`
**Issue:** The six branches are identical except for the table. The switch has no default branch, so a table added to `SyncTable` but not to the switch silently no-ops at runtime if the type is widened or cast.
**Fix:** Collapse the branches into one generic update, since every sync table shares `id`, `deletedAt` and `updatedAt`, or add a `default: throw` and an exhaustiveness check.

### IN-04: Android widget handler swallows all errors and renders "٠"

**File:** `app/features/widgets/android/task-handler.tsx:20-22`
**Issue:** `catch { return 0 }` turns an unreadable or missing database into a displayed count of zero. The user cannot tell "no data" from "failure", and there is no log.
**Fix:** Return `null` on failure and render a placeholder. For the spike, `console.warn` the error code.

### IN-05: Duplicated defaults, hard-coded limits and unused dependency

**File:** `app/services/storage.ts:33-44`, `app/constants/theme.ts:31-33`, `app/package.json:58`
**Issue:**
- `getScriptureStep(fallback = 2)` and `stored > 4` hard-code values that should derive from `SCRIPTURE_SIZES.length` and `SCRIPTURE_STEP_DEFAULT` (which is 1). Currently the caller passes the default explicitly, but a second call site would get 2.
- `tailwindcss-animate` is installed but `tailwind.config.js` has `plugins: []`, so it is unused (the `animate-in` classes are web-only).
- `scripture.tsx` hard-codes slider tint colours, which ignore dark-mode theme tokens.

**Fix:** Derive the limits from the constants, remove the unused dependency, and read the tint colours from the theme.

### IN-06: Signing config parsing is fragile and fails with obscure errors

**File:** `app/app.config.js:15-27, 41-52`
**Issue:**
- `loadSigningEnv` does not strip quotes, so a quoted password keeps the quotes.
- Missing keys become empty strings, and Gradle then fails with an unhelpful keystore error instead of naming the missing variable.
- The `MYAPP_RELEASE_STORE_FILE` value is hard-coded and ignores the env file.
- The release password is written in plaintext to the generated `android/gradle.properties`. That directory is gitignored, so this is acceptable, but keep it that way.

**Fix:** Strip surrounding quotes, throw a clear error naming the missing key, and keep `/android` ignored.

---

_Reviewed: 2026-11-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
