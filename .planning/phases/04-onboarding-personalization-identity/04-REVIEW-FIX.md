---
phase: 04-onboarding-personalization-identity
fixed_at: 2026-11-26T00:20:00Z
review_path: /Users/andrew/Documents/Work/Dev/Projects/Personalss/روعي/.planning/phases/04-onboarding-personalization-identity/04-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 4
skipped: 1
status: partial
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-11-26T00:20:00Z
**Source review:** `.planning/phases/04-onboarding-personalization-identity/04-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 5 (WR-01..WR-05; the review header says 4 but WR-02 is struck through and WR-05 was listed in the body)
- Fixed: 4
- Skipped: 1 (WR-02, accepted by owner)

Info findings (IN-01..IN-07) are out of scope for `critical_warning` and remain in REVIEW.md.

## Fixed Issues

### WR-01: Suggestion token-refresh retry swallows real errors and re-sends the same stale token

**Files modified:** `app/features/google/auth.ts`, `app/features/leyaana/PersonalItemDialog.tsx`
**Commit:** a57bcaf
**Applied fix:** Added `refreshGoogleIdToken()` to `features/google/auth.ts` (calls `configureGoogleSignIn()`, so the Drive-scope configuration is unchanged; then `signInSilently()` and `getTokens()`). `PersonalItemDialog` no longer imports `GoogleSignin` directly. The retry now runs only when the refreshed token differs from the one that was rejected. A retry failure with `unauthenticated` opens the sign-in dialog. Any other retry failure (`daily_limit`, `rate_limited`, validation, network) shows its real message through `mapSuggestionErrorMessage`. The Drive-scope sign-in path used by the sign-in dialog is untouched. Status: fixed: requires human verification (token-refresh logic; needs a real-device check of Android `signInSilently()` returning a fresh ID token).

### WR-03: Personal plain-text items are treated as Markdown on copy and in the browse modal

**Files modified:** `app/features/leyaana/copy.ts`, `app/app/leyaana/browse.tsx`, `app/features/leyaana/LeyaanaScreen.tsx`, `app/features/leyaana/__tests__/catalog-copy.test.ts`
**Commit:** 6d10be7
**Applied fix:** `formatArticleForCopy` takes an optional `{ plain }` flag. When set, the text is copied verbatim, with no Markdown stripping and no personalization. All personal copy paths pass it: browse copy, browse personal copy, `handleCopyPersonalItem`, and the Favorites tab when `source === 'personal'`. The browse detail modal and the Favorites list render personal text as plain `<Text>` instead of `MarkdownBody` or `stripMarkdownForCopy`. Added a test that Markdown-looking personal text is copied unchanged. Status: fixed: requires human verification (copy and render behavior).

### WR-04: Local personal items are gated by the public-suggestion write schema

**Files modified:** `app/features/leyaana/personal-items.ts`, `app/features/leyaana/PersonalItemDialog.tsx`, `app/features/leyaana/__tests__/personal-items.test.ts`
**Commit:** 71d9ba0
**Applied fix:** Local create and update now validate with a lenient zod schema (kind, title 1-200, text 1-5000, optional verseRef 1-200). The strict `submitSuggestionInputSchema` is applied only in `toSuggestionInput`, at suggest time. A `ZodError` raised at suggest time is mapped to a specific Arabic message saying the text contains links or disallowed symbols and cannot be suggested to everyone, instead of the generic submit error. Tests were split: local save accepts links and braces; `toSuggestionInput` rejects them. Status: fixed: requires human verification (validation logic).

### WR-05: No HTTPS enforcement on `API_BASE_URL`

**Files modified:** `app/constants/app.ts`
**Commit:** b5ea343
**Applied fix:** `resolveApiBaseUrl` throws when `NODE_ENV === 'production'` and the configured `EXPO_PUBLIC_API_BASE_URL` does not start with `https://`. Dev and test behavior is unchanged.

## Skipped Issues

### WR-02: Suggestion sign-in silently requests the Drive `appdata` scope its consent copy does not mention

**File:** `app/features/google/auth.ts:56-62, 78-116`
**Reason:** skipped: accepted by owner (by design). The `drive.appdata` grant at suggestion sign-in is intentional, so it is already in place for the later Drive backup. REVIEW.md already marks it ACCEPTED, and it was not changed. WR-01's retry stays on the Drive-scope path; no identity-only sign-in was added.
**Original issue:** The suggestion sign-in requests Drive scope that the consent explanation does not mention.

## Verification

Run in the main checkout after fast-forwarding `main` to the fix commits. The fixer's isolated worktree had no `node_modules`, so per-fix Tier 2 checks were not possible there. Per-fix verification there was Tier 1 only (re-read of the edited regions), and the full gates were run afterwards in the main checkout. The numbers below are reproducible from the main checkout.

- `bunx tsc -p app/tsconfig.json`: exit 0, no errors.
- `bun run test` (vitest, all projects): 49 files, 316 tests passed. The app-only run (`bun run test -- app`) passed 19 files and 105 tests. The backend suite logs a stack trace during one test, but all of its tests pass.
- `bun run lint` in `app/` (`expo lint --max-warnings 0`): clean.

## Notes

- The worktree, its temp branch, and the recovery sentinel were cleaned up (`main` was fast-forwarded to b5ea343 first).
- Unrelated uncommitted changes were left untouched and never staged: `app/tsconfig.json`, `.planning/config.json`, `.planning/state.json`, `backend/data/*`, `.impeccable/`, and the untracked phase docs.
- Commits used `git commit` directly with explicit file paths, not `gsd_run query commit`.

---

_Fixed: 2026-11-26T00:20:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
