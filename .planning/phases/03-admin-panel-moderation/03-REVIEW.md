---
phase: 03-admin-panel-moderation
reviewed: 2026-11-25T00:00:00Z
depth: standard
files_reviewed: 38
files_reviewed_list:
  - backend/src/main.ts
  - backend/src/app.module.ts
  - backend/src/config/env.ts
  - backend/src/config/paths.ts
  - backend/src/db/schema.ts
  - backend/src/content/content.module.ts
  - backend/src/content/snapshot-builder.ts
  - backend/src/admin-auth/admin-auth.guard.ts
  - backend/src/admin-auth/admin-auth.module.ts
  - backend/src/admin-auth/admin-auth.resolver.ts
  - backend/src/admin-auth/admin-auth.service.ts
  - backend/src/admin-content/admin-content.module.ts
  - backend/src/admin-content/admin-content.resolver.ts
  - backend/src/admin-content/admin-content.service.ts
  - backend/src/admin-audit/admin-audit.module.ts
  - backend/src/admin-audit/admin-audit.resolver.ts
  - backend/src/admin-moderation/admin-moderation.module.ts
  - backend/src/admin-moderation/admin-moderation.resolver.ts
  - backend/src/admin-moderation/admin-moderation.service.ts
  - backend/drizzle/0001_admin_suggestions_note.sql
  - backend/Dockerfile
  - backend/Dockerfile.dockerignore
  - admin/index.html
  - admin/vite.config.ts
  - admin/src/main.tsx
  - admin/src/lib/graphql.ts
  - admin/src/lib/admin-api.ts
  - admin/src/lib/validation.ts
  - admin/src/lib/markdown-serializer.ts
  - admin/src/components/auth/AuthProvider.tsx
  - admin/src/components/auth/ReauthModal.tsx
  - admin/src/components/editor/LivePreviewCard.tsx
  - admin/src/components/editor/RichContentEditor.tsx
  - admin/src/components/layout/AdminShell.tsx
  - admin/src/pages/AuditLogPage.tsx
  - admin/src/pages/CatalogPage.tsx
  - admin/src/pages/ItemEditorPage.tsx
  - admin/src/pages/LoginPage.tsx
  - admin/src/pages/ModerationQueuePage.tsx
  - admin/src/pages/SuggestionReviewPage.tsx
findings:
  critical: 1
  warning: 6
  info: 3
  total: 10
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-11-25
**Depth:** standard
**Files Reviewed:** 38 (UI primitives under `admin/src/components/ui/`, tests, fonts, lockfiles and generated drizzle meta were skipped)
**Status:** issues_found

## Summary

The core security design holds up. Every admin resolver is behind `AdminAuthGuard`. The guard requires the `x-roi-admin: 1` header plus an HS256 cookie JWT that is re-checked against the allowlist on each request. The cookie is `httpOnly` and `SameSite=Lax`, and `Secure` in production. CORS is origin-allowlisted, and Apollo's CSRF prevention is on by default. The admin SPA renders suggestion text only as React text nodes. There is no `dangerouslySetInnerHTML` and the preview uses a whitelist renderer. All queries go through Drizzle with bound parameters. The 409 moderation guard is correct: a conditional `UPDATE ... WHERE status='pending'` inside an IMMEDIATE transaction, and the version bump rolls back on conflict.

The review found one real functional defect in admin login audience handling. It also found several hardening and integrity gaps, mostly around the dev-secret fallback, session revocation, unvalidated Markdown reaching public content, and audit-log completeness.

## Critical Issues

### CR-01: `ADMIN_GOOGLE_CLIENT_ID` is advertised to the SPA but never used as the ID-token audience

**File:** `backend/src/admin-auth/admin-auth.service.ts:74` and `:105`
**Issue:** `getPublicGoogleClientId()` returns `ADMIN_GOOGLE_CLIENT_ID ?? GOOGLE_CLIENT_IDS[0]`. The SPA uses that value to initialise Google Identity Services, so the minted ID token has `aud` equal to that client ID. `authenticateGoogleIdToken()` verifies against `this.env.GOOGLE_CLIENT_IDS` only (line 105). `ADMIN_GOOGLE_CLIENT_ID` is not part of that list unless the operator duplicates it.
- When the operator sets a dedicated web client ID in `ADMIN_GOOGLE_CLIENT_ID`, which is the only reason the override exists (the tests use `web-client-override...`), every login fails with `GOOGLE_TOKEN_INVALID`.
- When it is unset, the SPA falls back to `GOOGLE_CLIENT_IDS[0]`. The defaults in `env.ts` are the mobile iOS/Android clients, and GIS web sign-in with a mobile client ID does not work.
- Separately, the admin login accepts ID tokens minted for any of the mobile client IDs. The audience should be the admin client alone.

**Fix:**
```ts
// admin-auth.service.ts
private adminAudience(): string[] {
  return this.env.ADMIN_GOOGLE_CLIENT_ID
    ? [this.env.ADMIN_GOOGLE_CLIENT_ID]
    : [...this.env.GOOGLE_CLIENT_IDS];
}
// in authenticateGoogleIdToken
const ticket = await this.oauthClient.verifyIdToken({ idToken, audience: this.adminAudience() });
```
Add a test where the token `aud` is `ADMIN_GOOGLE_CLIENT_ID` and one where it is a mobile client ID with the override set.

## Warnings

### WR-01: Hard-coded JWT signing secret is used whenever `NODE_ENV !== 'production'`, and the failure is deferred to login time

**File:** `backend/src/admin-auth/admin-auth.service.ts:21`, `:182-191`; `backend/src/config/env.ts:26`
**Issue:** `NODE_ENV` defaults to `development`. If a deploy forgets the variable (Dokploy env override, a different base image), `Secure` is dropped from the cookie. Session JWTs are then signed with the public constant `roi-dev-only-admin-jwt-secret-not-for-production`, so anyone who reads the repo can forge an admin session for any allowlisted email, because the guard only checks `sub`, `email` and `typ`. In production, a missing or short secret is only detected when someone attempts a login (`ServiceUnavailableException`), not at boot.
**Fix:** Fail fast at startup and make the insecure fallback opt-in.
```ts
// env.ts: refine on the schema
.superRefine((e, ctx) => {
  if (e.NODE_ENV === 'production' && (e.ADMIN_JWT_SECRET?.length ?? 0) < 32) {
    ctx.addIssue({ code: 'custom', path: ['ADMIN_JWT_SECRET'], message: 'required (>=32 chars) in production' });
  }
})
```
Also use `NODE_ENV === 'test' | 'development'` explicitly for the fallback, and generate a random per-process secret in dev instead of a constant.

### WR-02: Sessions cannot be revoked, and a failed logout leaves a live cookie while the UI shows "signed out"

**File:** `backend/src/admin-auth/admin-auth.resolver.ts:77` (`adminLogout`); `admin/src/components/auth/AuthProvider.tsx:158-164`; `admin/src/components/layout/AdminShell.tsx:87-90`
**Issue:**
1. `adminLogout` only clears the cookie in the caller's browser. The JWT stays valid for 14 days, and a copied cookie keeps working after logout. The only revocation path is removing the email from `ADMIN_EMAILS` and restarting.
2. The SPA `logout()` uses `try/finally` with no `catch`. If the request fails, `setUser(null)` still runs but the cookie remains valid. The rejection is unhandled in `AdminShell`, which also skips `queryClient.clear()`, so cached admin data (suggester emails) stays in memory. On the next boot, `adminMe` succeeds and silently signs the admin back in.

D-02 sets the 14-day lifetime, so that is not flagged. Having no server-side kill switch is the gap, and PROJECT.md asks for "short-lived sessions".
**Fix:** Add a `jti` plus an in-memory or SQLite denylist (or a `session_epoch` in `content_meta` that logout and a "sign out everywhere" action bump) and check it in `verifySessionToken`. In the SPA, wrap `logout` in try/catch, surface an error toast, and call `queryClient.clear()` in a `finally`.

### WR-03: Accepted suggestion text is stored verbatim with no Markdown-subset enforcement, so links and images can reach the mobile renderer

**File:** `backend/src/admin-moderation/admin-moderation.service.ts:206` (`text: input.text`); `shared/src/schemas.ts` `personalizedTextSchema`; `admin/src/components/editor/RichContentEditor.tsx:122-128`
**Issue:** The only server-side content check is `hasOnlyAllowedBraceToken` plus length. Public content is rendered on mobile with `react-native-marked`, which renders full Markdown, including `[x](https://evil)` links and `![](https://tracker)` images (a tracking pixel in every user's app, which conflicts with the privacy constraint). The editor's `onChange` only fires on user edits. If an admin opens a suggestion and clicks Accept without touching the text, the raw suggester-controlled string goes straight into the public tables. The admin preview parses it through a restricted subset parser, so it shows the link as literal text and the admin may not notice. This is stored-content injection from an untrusted submitter into a widely distributed content channel.
**Fix:** Enforce the subset in the shared schema used by both the suggestion submit and admin mutations. Reject (or strip) `[..](..)`, `![..](..)`, raw HTML (`<`), backticks and `---` or `1.` block syntax in `text` and `textFemale`. In the SPA, normalise the initial value through `serializeDocToContent(parseContentToDoc(...))` before submit so the payload always matches what the admin saw.

### WR-04: Audit log lacks before/after data, and accepted suggestions are filed under the wrong entity type

**File:** `backend/src/admin-content/admin-content.service.ts:~175-465` (`summarize` callbacks); `backend/src/admin-moderation/admin-moderation.service.ts:176`; `admin/src/pages/AuditLogPage.tsx:15-16`
**Issue:**
- STACK.md specifies an audit log of "who, what, before/after". Updates record only `{ref}` or `{title}`, and soft-delete records only `{kind,id}`. Text edits to public content (the sensitive path) are not reconstructable, which weakens the integrity guarantee.
- `accept_suggestion` is written with `entityType: input.kind` and `entityId: newItemId`, while `reject_suggestion` uses `entityType: 'suggestion'`. The UI offers an `entityType=suggestion` filter that therefore returns rejects but never accepts. The suggestion ID is only inside `summaryJson`.

**Fix:** In update `mutate`, capture `existing` and return `{ before: {ref,text,textFemale}, after: {...} }` in `summaryJson` (cap the size). Write accept entries as `entityType: 'suggestion'`, `entityId: id`, with `newItemId` and `kind` in the summary, or add both rows.

### WR-05: Content edits are last-writer-wins, and soft-deleted items can be edited

**File:** `backend/src/admin-content/admin-content.service.ts` `updateVerse` / `updateNameOfGod` / `updateBlessing`; `admin/src/lib/admin-api.ts:152-165`
**Issue:** The moderation path has a 409 guard, but updates have no precondition. Two admins editing the same item silently overwrite each other (the form is loaded from a cached list). `update*` also does not check `deletedAt`, so an edit to a soft-deleted item bumps its `version` and `updatedAt` while it stays hidden. That generates delta noise and an audit entry for an item clients see as deleted.
**Fix:** Accept an `expectedVersion` argument, and throw `ConflictException('CONTENT_VERSION_CONFLICT')` when `existing.version !== expectedVersion`. Reject updates to deleted rows with `CONTENT_ALREADY_DELETED`. Reuse the SPA's existing conflict banner.

### WR-06: Post-commit snapshot rebuild failure reports an error for a mutation that committed, which invites duplicate creates

**File:** `backend/src/content/content.service.ts:181-183` (called from every admin mutation)
**Issue:** `applyContentMutation` commits the transaction and then calls `snapshotService.refreshCache()` synchronously. If the rebuild throws (disk full, permission error on `DATA_DIR`), the GraphQL call returns an error even though the row and audit entry are committed. The admin's natural retry of `createVerse` / `acceptSuggestion` then creates a duplicate (create) or a spurious 409 (accept). `getSnapshot` self-heals on the next read, so the data is fine but the API response is wrong.
**Fix:** Wrap the refresh in try/catch, log the error, and return the committed result, since `refreshIfStale` already repairs the cache lazily.
```ts
try { this.snapshotService.refreshCache(nowMs); } catch (err) { this.logger.error('snapshot refresh failed; will lazily rebuild', err); }
```

## Info

### IN-01: Admin `index.html` and unhashed fonts are served `immutable` for one year

**File:** `backend/src/main.ts:85-90`
**Issue:** `useStaticAssets(..., { maxAge: '1y', immutable: true, index: false })` also serves an explicit `/admin/index.html` request and the unhashed `/admin/fonts/*.ttf` with a one-year immutable cache. Vite-hashed `assets/*` suits that policy. The others don't. A direct visit to `/admin/index.html` pins a stale shell that references deleted chunks.
**Fix:** Use `setHeaders` to apply `immutable` only under `/assets/`, and `no-cache` otherwise. Alternatively, 404 `/admin/index.html` explicitly.

### IN-02: Login error classification maps every non-allowlist failure to "session expired"

**File:** `admin/src/components/auth/AuthProvider.tsx:88-94`
**Issue:** `classify()` returns `'invalid'` for any `AdminApiError` that is not `NETWORK`, including 429 (throttled, 15 per minute) and 503 `ADMIN_AUTH_MISCONFIGURED`. The operator sees "session expired" for a server misconfiguration or rate limit. `ReauthModal`'s GIS `onError={() => undefined}` also swallows popup/FedCM failures with no feedback.
**Fix:** Add `'throttled'` and `'server'` kinds (`code === 'TOO_MANY_REQUESTS'`, status >= 500), and show a message from `onError`.

### IN-03: `adminLogin` and `adminLogout` skip the `x-roi-admin` CSRF header check

**File:** `backend/src/admin-auth/admin-auth.resolver.ts:55-79`
**Issue:** Both are intentionally unguarded. Apollo `csrfPrevention` (on by default) already rejects non-preflighted cross-site requests, so this is not exploitable today. It becomes a login-CSRF or forced-logout vector if csrfPrevention is ever disabled or batching is turned on. The header is not enforced as a defence in depth on these two operations.
**Fix:** Optional. Check the `x-roi-admin` header in a tiny `CsrfHeaderGuard` and apply it to both mutations (the SPA already sends it on every request).

---

_Reviewed: 2026-11-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
