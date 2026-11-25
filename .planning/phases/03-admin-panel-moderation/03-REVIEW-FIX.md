---
phase: 03-admin-panel-moderation
fixed_at: 2026-11-25T19:10:00+02:00
review_path: .planning/phases/03-admin-panel-moderation/03-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-11-25
**Source review:** .planning/phases/03-admin-panel-moderation/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (CR-01, WR-01..WR-06; Info findings excluded)
- Fixed: 7 (WR-02 and WR-03 are partial, see below)
- Skipped: 0

**Verification:** run in the main checkout (`use_worktrees` bypassed per orchestrator instruction). `bun run test` passes (41 files, 275 tests). `bun run typecheck` passes.

## Fixed Issues

### CR-01: `ADMIN_GOOGLE_CLIENT_ID` never used as ID-token audience

**Files modified:** `backend/src/admin-auth/admin-auth.service.ts`, `backend/src/__tests__/admin-auth-audience.test.ts` (new)
**Commit:** b20cbfb
**Applied fix:** Added `adminAudience()`. It returns `[ADMIN_GOOGLE_CLIENT_ID]` when set, otherwise `GOOGLE_CLIENT_IDS`. `authenticateGoogleIdToken` now verifies against it. Added a unit test for both cases.
**Status:** fixed: requires human verification (auth logic; confirm a real GIS login against the deployed web client ID).

### WR-01: Hard-coded JWT secret / deferred failure

**Files modified:** `backend/src/config/env.ts`, `backend/src/main.ts`, `backend/src/admin-auth/admin-auth.service.ts`, `backend/src/__tests__/config.test.ts`
**Commit:** bed56c4
**Applied fix:** Added `assertProductionConfig(env)`, called from `bootstrap()`. It throws at boot when `NODE_ENV=production` and `ADMIN_JWT_SECRET` is shorter than 32 chars. The public constant is replaced by a per-process random secret for non-production. The check lives in `bootstrap()` rather than the zod schema so existing integration tests that boot production apps without a secret keep working. The login-time `ADMIN_AUTH_MISCONFIGURED` guard stays as a second line of defence. Note: in non-production, admin sessions no longer survive a backend restart unless `ADMIN_JWT_SECRET` is set.
**Status:** fixed: requires human verification (the `NODE_ENV` default is still `development`, so a deploy that omits it still runs the non-production path, though it can no longer be forged).

### WR-02: Sessions cannot be revoked / failed logout shows "signed out" (partial)

**Files modified:** `admin/src/components/auth/AuthProvider.tsx`, `admin/src/components/layout/AdminShell.tsx`
**Commit:** f591104
**Applied fix:** SPA half only. `logout()` clears local state only after the server confirms. On failure the user stays signed in and `AdminShell` shows an error toast. `queryClient.clear()` runs only after a successful logout.
**Not done:** server-side revocation (`jti` denylist or session epoch). It needs a persistent store, so a new table and drizzle migration, and the 14-day lifetime is a D-02 decision. An in-memory denylist would be lost on restart and give false assurance. Recommend a follow-up plan.
**Status:** fixed: requires human verification (partial).

### WR-03: Unvalidated Markdown reaching public content

**Files modified:** `shared/src/schemas.ts`, `shared/src/__tests__/schemas.test.ts`
**Commit:** 657134d
**Applied fix:** `personalizedTextSchema` now rejects Markdown links `](`, images `![`, and raw HTML tags `<x` in `text` and `textFemale`. It applies to suggestion submit, admin create/update and accept. Blockquotes and a bare `<` are still allowed. Test added.
**Not done:** SPA pre-submit normalisation. It cannot strip links, and the server now rejects them, so the admin sees the validation error instead of a silent publish. Existing pending suggestions containing links can no longer be accepted as-is.
**Status:** fixed: requires human verification (regex heuristic; confirm no legitimate seed or Arabic content trips it. The full suite, including seed tests, passes).

### WR-04: Audit log lacks before/after; accepts under wrong entity

**Files modified:** `backend/src/admin-content/admin-content.service.ts`, `backend/src/admin-moderation/admin-moderation.service.ts`, `backend/src/__tests__/admin-content.test.ts`, `backend/src/__tests__/admin-moderation.test.ts`
**Commit:** 55ddf08
**Applied fix:** Updates now write `before` and `after` (ref/title, verseRef, text, textFemale) into `summaryJson`. No schema change, since `summaryJson` is free-form text and the fields are already length-capped by the shared schema. `accept_suggestion` is now logged with `entityType: 'suggestion'` and `entityId: <suggestionId>`. `newItemId` and `kind` remain in the summary. Soft-delete/restore summaries are unchanged (state toggle, nothing to diff).
**Status:** fixed

### WR-05: Last-writer-wins edits and edits to soft-deleted items

**Files modified:** `backend/src/admin-content/admin-content.service.ts`, `backend/src/admin-content/admin-content.resolver.ts`, `backend/src/__tests__/admin-content.test.ts`, `admin/src/lib/admin-api.ts`, `admin/src/lib/i18n.ts`, `admin/src/pages/CatalogPage.tsx`
**Commit:** 11f162c
**Applied fix:** `updateVerse`, `updateNameOfGod` and `updateBlessing` take an optional `expectedVersion: Int`. They throw `ConflictException('CONTENT_VERSION_CONFLICT')` on mismatch. They always throw `CONTENT_ALREADY_DELETED` for soft-deleted rows. The argument is optional, so existing clients keep working. The SPA sends the version the form was first loaded from (held in a ref, so a post-conflict refetch cannot silently rebase the draft). It shows a localized conflict message (ar/en) and refetches the list.
**Status:** fixed: requires human verification (concurrency logic).

### WR-06: Post-commit snapshot rebuild failure reports error

**Files modified:** `backend/src/content/content.service.ts`, `backend/src/__tests__/admin-content.test.ts`
**Commit:** 1987ab9
**Applied fix:** `refreshCache` after commit is wrapped in try/catch and logged. The mutation returns its committed result, and `SnapshotService.refreshIfStale` rebuilds on the next read. Test simulates a rebuild failure and checks the mutation succeeds and the snapshot heals.
**Status:** fixed

---

_Fixed: 2026-11-25_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
