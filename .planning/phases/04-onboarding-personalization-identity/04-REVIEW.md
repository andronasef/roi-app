---
phase: 04-onboarding-personalization-identity
reviewed: 2026-11-26T00:00:00Z
depth: standard
files_reviewed: 48
files_reviewed_list:
  - app/app/_layout.tsx
  - app/app/index.tsx
  - app/app/leyaana/browse.tsx
  - app/app/leyaana/history.tsx
  - app/app/leyaana/index.tsx
  - app/app/settings.tsx
  - app/constants/app.ts
  - app/constants/db.ts
  - app/drizzle/0002_tiresome_mojo.sql
  - app/drizzle/meta/0002_snapshot.json
  - app/drizzle/meta/_journal.json
  - app/drizzle/migrations.js
  - app/features/db/__tests__/migrate.test.ts
  - app/features/db/__tests__/schema.test.ts
  - app/features/db/events.ts
  - app/features/db/schema.ts
  - app/features/google/__tests__/auth.test.ts
  - app/features/google/auth.ts
  - app/features/home/HomeScreen.tsx
  - app/features/home/__tests__/home.test.ts
  - app/features/leyaana/CopyVerseDialog.tsx
  - app/features/leyaana/LeyaanaScreen.tsx
  - app/features/leyaana/MarkdownBody.tsx
  - app/features/leyaana/PersonalItemDialog.tsx
  - app/features/leyaana/__tests__/assignments.test.ts
  - app/features/leyaana/__tests__/catalog-copy.test.ts
  - app/features/leyaana/__tests__/personal-items.test.ts
  - app/features/leyaana/assignments.ts
  - app/features/leyaana/catalog.ts
  - app/features/leyaana/copy.ts
  - app/features/leyaana/personal-items.ts
  - app/features/onboarding/OnboardingFlow.tsx
  - app/features/onboarding/__tests__/onboarding.test.ts
  - app/features/onboarding/starter-verses.ts
  - app/features/profile/__tests__/profile.test.ts
  - app/features/profile/context.tsx
  - app/features/profile/repository.ts
  - app/features/profile/ui-copy.ts
  - app/features/settings/SettingsScreen.tsx
  - app/features/settings/__tests__/settings.test.ts
  - app/features/settings/support.ts
  - app/features/sync/ContentGate.tsx
  - app/features/sync/__tests__/api.test.ts
  - app/features/sync/api.ts
  - app/locales/ar.json
  - app/package.json
  - app/services/storage.ts
  - bun.lock
findings:
  critical: 0
  warning: 4
  info: 7
  total: 11
  necessity: 0
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-11-26T00:00:00Z
**Depth:** standard
**Files Reviewed:** 48
**Status:** issues_found

## Summary

All 48 in-scope files were reviewed. Test files, `ar.json`, `bun.lock`, the drizzle snapshot, and the migration-journal files were read only for contract and consistency checks (journal ordering, `migrations.js` wiring, `package.json` dependencies for `expo-network`, `expo-clipboard`, `react-native-marked`, `google-signin`, `graphql-request`). The `ar.*` keys used in source all resolve.

**Prior review fixes (commit b059aa7) verified, none re-reported:**
- CR-01: `BrowseArticle.source` exists, is set to `'public'` in `loadBrowseItems` and `'personal'` in the `onPressItem` handler, and `handleToggleSelectedFav` and the modal star both use `article.source`. The fix holds.
- WR-01: `suggestLockRef`, `signInLockRef`, and `googleSignInLockRef` are set synchronously at entry and reset in `finally`. The fix holds.
- WR-02: `SettingsScreen.handleConfirmGoogleConnect` now requires `result.hasDriveScope` and otherwise reloads status and shows the notice. The fix holds.
- WR-03: `LeyaanaScreen` takes no props, and `headerRight` and `renderTabExtra` are gone.
- IN-01: `liveVerses` in `OnboardingFlow` is derived with `useMemo`.

No critical issues were found. Privacy invariants from the prior review still hold: no `offlineAccess` or `serverAuthCode`, telemetry events are static strings, and link and image rendering is disabled in `MarkdownBody`.

The five warnings are:
- The suggestion retry path swallows real errors.
- The suggestion sign-in requests a Drive scope that its consent copy does not mention.
- Personal plain-text items are treated as Markdown on copy and in the browse modal.
- Personal items are gated by the public-suggestion schema.
- The API base URL has no HTTPS enforcement even though a Google ID token is sent to it.

Necessity (category 4) was assessed using `necessity-review.md`. No finding met the evidence bar.

## Warnings

### WR-01: Suggestion token-refresh retry swallows real errors and re-sends the same stale token

**File:** `app/features/leyaana/PersonalItemDialog.tsx:163-191`
**Issue:** When the first `submitWithToken` fails with `unauthenticated`, the code calls `GoogleSignin.getTokens()` and retries inside a `try { ... } catch { /* fall through */ }`. This has two defects:
1. The `catch` covers the retry's `submitWithToken` too. If the retry fails for a non-auth reason (`daily_limit`, `rate_limited`, `validation`, network), that error is discarded and the user is pushed into the Google sign-in dialog at line 182. That is wrong and misleading, because the user is already signed in and the actual problem is a limit.
2. `getGoogleSessionToken()` already obtained its token via `getTokens()`, so the retry usually fetches the same cached ID token. Per the project stack notes, on Android `getTokens()` can return a stale value unless `signInSilently()` or `clearCachedAccessToken` runs first. The retry therefore burns a network round trip with an identical token and then falls to the sign-in dialog anyway.

The direct `GoogleSignin` import also bypasses the `features/google/auth.ts` abstraction, which is where `configure()` and error mapping live.

**Fix:**
```ts
if (err instanceof SuggestionSubmitError && err.code === 'unauthenticated') {
  const refreshed = await refreshGoogleIdToken(); // new helper in google/auth.ts: signInSilently() then getTokens()
  if (refreshed && refreshed !== session.idToken) {
    try {
      await submitWithToken(item, refreshed);
    } catch (retryErr) {
      if (
        retryErr instanceof SuggestionSubmitError &&
        retryErr.code === 'unauthenticated'
      ) {
        setSignInDialogItem(item);
      } else {
        setSuggestFeedback({
          type: 'error',
          message: mapSuggestionErrorMessage(retryErr, gender),
          itemId: item.id,
        });
      }
    }
    return;
  }
  setSignInDialogItem(item);
  return;
}
```

### ~~WR-02: Suggestion sign-in silently requests the Drive `appdata` scope its consent copy does not mention~~ — ACCEPTED (by design)

**Disposition:** Accepted by owner (2026-11-26). Requesting `drive.appdata` at the suggestion sign-in is intentional so the grant is already in place for the later Drive backup. Not counted in totals; excluded from `--fix`.

**File:** `app/features/google/auth.ts:56-62, 78-116` (called from `app/features/leyaana/PersonalItemDialog.tsx:210`; copy at `PersonalItemDialog.tsx:575-578`)
**Issue:** `SuggestSignInDialog` explains: "to review suggestions and prevent spam we need to sign in with Google, without uploading any other personal data." `handleConfirmSignInAndSubmit` calls `signInWithGoogleDriveScope()`. That function configures `scopes: [DRIVE_APPDATA_SCOPE]` and runs `addScopes` if the scope is missing. The user therefore sees a Drive-access consent screen that the explanation never mentioned, and the app takes a Drive grant it does not need for submitting a suggestion (only an ID token is needed). This contradicts the project constraint to request the scope after an explanatory screen. It is also a store-review and privacy-disclosure risk, because the privacy posture is "no network egress of personal content except explicit actions".

**Fix:** Add an identity-only variant (for example `signInWithGoogleIdentity()`) that signs in without `addScopes` and without the Drive scope in `configure`. Use it from `handleConfirmSignInAndSubmit`. Keep the Drive-scope path for Settings and Onboarding, where the dialog copy mentions backup.

### WR-03: Personal plain-text items are treated as Markdown and personalised on copy and in the browse modal

**File:** `app/features/leyaana/copy.ts:57-84`, used by `app/app/leyaana/browse.tsx:219-234, 424-432` and `app/features/leyaana/LeyaanaScreen.tsx:461-478, 943-948`
**Issue:** Personal items are explicitly plain text (`PersonalItemDialog` exposes no Markdown controls). Yet:
- `handleCopyPersonal` and `handleCopyPersonalItem` route through `formatArticleForCopy`, which runs `stripMarkdownForCopy` on the user's own text. Text such as `1. شكراً` or `- ربنا يبارك` at the start of a line, `*كلمة*`, `# ...` or `_x_` is silently altered in the clipboard output. The user's literal text is corrupted.
- The browse detail modal renders personal text through `MarkdownBody` (`browse.tsx:424`), while the same item in `PersonalItemsSection` renders it as plain `<Text>`. The same item looks different depending on where it is opened, and a typed `* item` turns into a bullet.
- The Favorites tab applies `stripMarkdownForCopy` to personal blessings and names for the same reason (`LeyaanaScreen.tsx:947`).

**Fix:** Carry the item source through the copy and render paths. For `source === 'personal'`, skip `stripMarkdownForCopy` in `formatArticleForCopy`, with a `plain: true` option or a dedicated `formatPersonalForCopy`. Render personal text in the modal and favorites with `<Text>` instead of `MarkdownBody`.

### WR-04: Local personal items are gated by the public-suggestion write schema

**File:** `app/features/leyaana/personal-items.ts:29-46`
**Issue:** `normalizeAndValidatePersonalInput` runs `submitSuggestionInputSchema.parse` on every create and update, so private, on-device notes obey rules meant for public moderated content (`shared/src/schemas.ts:19-26, 56-65`). The `UNSAFE_MARKDOWN` regex rejects any text with `http(s)://`, `www.`, an `@...` email pattern, `] [` / `]\s?[`, `![`, or an HTML-like `<a`. `hasOnlyAllowedBraceToken` rejects any `{` or `}`. A user who saves a gratitude-style blessing mentioning `www.` or `<3`, or writes `{x}`, gets the generic Arabic error "links, images and HTML are not allowed in the text" for data that never leaves the device. Suggest-time validation is already enforced by `toSuggestionInput` and by `api.submitSuggestion`'s client-side `safeParse`.

**Fix:** Validate local saves with a lenient schema (non-empty, max lengths, `kind`). Keep the strict `submitSuggestionInputSchema` only in `toSuggestionInput`, and surface a specific "this can't be suggested to everyone because it contains a link" message at suggest time.

### WR-05: No HTTPS enforcement on `API_BASE_URL` although a Google ID token is sent to it

**File:** `app/constants/app.ts:54-68` (consumed at `app/features/sync/api.ts:231-337`)
**Issue:** `resolveApiBaseUrl` accepts any non-empty `EXPO_PUBLIC_API_BASE_URL`. A production build configured with an `http://` URL (typo, staging value) would send `Authorization: Bearer <Google ID token>` and the user's suggestion text over cleartext. The production guard only handles the missing-variable case. The Android release cleartext policy blocks this today only by platform default, and iOS ATS is likewise a default.

**Fix:**
```ts
if (rawApiBaseUrl.length > 0) {
  const normalized = rawApiBaseUrl.replace(/\/+$/, '');
  if (process.env.NODE_ENV === 'production' && !normalized.startsWith('https://')) {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must use https:// in release builds');
  }
  return normalized;
}
```

## Info

### IN-01: Cancelled Google sign-in is reported as a failure, and onboarding telemetry ignores `hasDriveScope`

**File:** `app/features/settings/SettingsScreen.tsx:180-182`, `app/features/onboarding/OnboardingFlow.tsx:226-238`
**Issue:** Any non-success result, including `status: 'cancelled'`, shows "تعذر ربط حساب جوجل" in destructive colour, which is guilt-inducing for a user who simply dismissed the picker. Separately, `OnboardingFlow` fires `track('drive_backup_connected')` and completes onboarding on `status === 'success'` without checking `hasDriveScope`. That is the exact condition the Settings fix guards, so the event can over-count.
**Fix:** Branch on `result.status === 'cancelled'` and close the dialog with no notice. In onboarding, gate the `track` call on `result.hasDriveScope`.

### IN-02: Raw server or validation message surfaced in an Arabic-only UI

**File:** `app/features/leyaana/PersonalItemDialog.tsx:86-88`
**Issue:** `mapSuggestionErrorMessage` returns `err.message` for `validation`. That message can come from the server (`firstMessage` in `api.ts:139`), which is likely an English or technical string, rather than the local zod message.
**Fix:** Return the message only when it came from the local `safeParse` branch (distinguish with a flag or a separate code). Otherwise use `uiCopy('leyaanaSuggestSubmitError', gender)`.

### IN-03: Re-starring keeps the original `createdAt`, so "newest first" ordering is wrong

**File:** `app/features/leyaana/assignments.ts:182-188, 194-203`
**Issue:** The `onConflictDoUpdate` revive path updates only `updatedAt` and `deletedAt`. `listLiveFavoriteIds` and `listHydratedFavorites` order by `createdAt`, so a favorite that is un-starred and re-starred keeps its old position, contrary to the "newest-favorited first" docstring. The test at `assignments.test.ts:324-326` only asserts `toContain`, so it does not catch this.
**Fix:** Also set `createdAt: now` in the conflict `set`, or order by `updatedAt`.

### IN-04: DB writes run during render and are repeated on mount

**File:** `app/features/leyaana/LeyaanaScreen.tsx:183-197, 397-401`; `app/features/home/HomeScreen.tsx:93-111`
**Issue:** `loadLeyaanaSnapshot` is invoked inside `useMemo`. It calls `readOrCreateVerseSeed` and `getOrAssignPeriodVerse`, which insert rows, so there are writes during render. They are idempotent here (natural-key IDs, `onConflictDoUpdate`), but render-phase side effects are fragile. They will interact badly once Drive sync merges rows. `HomeScreen` runs `loadWeeklyVerse` three times on mount: the `useState` initializer, `useFocusEffect`, and the `[contentVersion]` effect.
**Fix:** Do the assign-and-seed step in a focus or effect hook and keep `useMemo` read-only. Drop the redundant `useEffect` in `HomeScreen`, since `useFocusEffect` already covers it.

### IN-05: Browse screen shows an empty-state card and personal results together

**File:** `app/app/leyaana/browse.tsx:302-343`
**Issue:** `PersonalItemsSection` is the `ListFooterComponent` and the "no matches" card is the `ListEmptyComponent`. A query that matches only personal items renders "no results" directly above matching personal items. A query that matches nothing renders "no results" plus a "no personal items yet" card.
**Fix:** Show `ListEmptyComponent` only when both `filteredItems` and `filteredPersonalItems` are empty, and move the empty-state card out of the list in that case.

### IN-06: `toggleHomeTileVisibility` returns the wrong message for `not_found`

**File:** `app/features/profile/repository.ts:249-255`
**Issue:** The `not_found` branch returns `LAST_VISIBLE_TOOL_ERROR` ("at least one tool must stay visible"), which is unrelated to a missing tile.
**Fix:** Use a distinct message, or an empty string so `HomeScreen`'s `result.message || LAST_VISIBLE_TOOL_ERROR` fallback does not mislead.

### IN-07: A successfully suggested item can be re-submitted indefinitely

**File:** `app/features/leyaana/PersonalItemDialog.tsx:109-122, 624-840`
**Issue:** After a successful `submitSuggestion`, nothing records that the item was suggested. The button stays active and the success text persists until the next suggestion. Repeat taps send duplicate pending suggestions and burn the user's daily limit.
**Fix:** Store a `suggestedAt` marker (or a settings-keyed set of IDs) and change the button label to "تم الإرسال", disabled until the item is edited.

---

_Reviewed: 2026-11-26T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
