---
phase: 03-admin-panel-moderation
verified: 2026-11-25T19:30:00+02:00
status: human_needed
score: 5/5 must-haves verified
covered_files:
  - ".planning/phases/03-admin-panel-moderation/03-01-PLAN.md"
  - ".planning/phases/03-admin-panel-moderation/03-01-SUMMARY.md"
  - ".planning/phases/03-admin-panel-moderation/03-02-PLAN.md"
  - ".planning/phases/03-admin-panel-moderation/03-02-SUMMARY.md"
  - ".planning/phases/03-admin-panel-moderation/03-03-PLAN.md"
  - ".planning/phases/03-admin-panel-moderation/03-03-SUMMARY.md"
  - ".planning/phases/03-admin-panel-moderation/03-04-PLAN.md"
  - ".planning/phases/03-admin-panel-moderation/03-04-SUMMARY.md"
  - ".planning/phases/03-admin-panel-moderation/03-05-PLAN.md"
  - ".planning/phases/03-admin-panel-moderation/03-05-SUMMARY.md"
  - ".planning/phases/03-admin-panel-moderation/03-06-PLAN.md"
  - ".planning/phases/03-admin-panel-moderation/03-06-SUMMARY.md"
  - ".planning/phases/03-admin-panel-moderation/03-07-PLAN.md"
  - ".planning/phases/03-admin-panel-moderation/03-07-SUMMARY.md"
  - ".planning/phases/03-admin-panel-moderation/03-08-PLAN.md"
  - ".planning/phases/03-admin-panel-moderation/03-08-SUMMARY.md"
  - ".planning/phases/03-admin-panel-moderation/03-09-PLAN.md"
  - ".planning/phases/03-admin-panel-moderation/03-09-SUMMARY.md"
  - "admin/src/components/editor/LivePreviewCard.tsx"
  - "admin/src/components/editor/NameTokenExtension.ts"
  - "admin/src/components/editor/RichContentEditor.tsx"
  - "admin/src/pages/ItemEditorPage.tsx"
  - "backend/Dockerfile"
  - "backend/src/admin-auth/admin-auth.guard.ts"
  - "backend/src/admin-auth/admin-auth.service.ts"
  - "backend/src/admin-content/admin-content.service.ts"
  - "backend/src/admin-moderation/admin-moderation.service.ts"
  - "backend/src/main.ts"
  - "shared/src/schemas.ts"
covered_digest: "v4:sha256:b4c6199795cf4772f584bb267a10d127b5a1b42037138dd0e2f1449a7a865b04"
behavior_unverified: 0
overrides_applied: 1
overrides:
  - must_have: "The session expires after a short time (ROADMAP SC1)"
    reason: "Owner explicitly chose a 14-day HttpOnly cookie session (03-CONTEXT D-02, 'owner refinement of ADM-01'). Implemented as specified and covered by a test."
    accepted_by: "owner (03-CONTEXT D-02)"
    accepted_at: "2026-11-25T00:00:00Z"
human_verification:
  - test: "Real Google sign-in against the deployed web client ID, with the production CSP"
    expected: "GIS button renders and the popup completes under the production Helmet CSP. An allowlisted account reaches the panel. A non-allowlisted account sees the refusal copy. The cookie is HttpOnly and Secure."
    why_human: "Needs real Google, the real OAuth client and a production NODE_ENV. Tests mock the verifier. The CSP directives follow Google's documented set but were never exercised against live GIS. The review fix for CR-01 (admin ID-token audience) also needs this check."
  - test: "RTL chip drag in the Tiptap editor (admin set to Arabic and to English)"
    expected: "Dragging the name chip mid-sentence in the RTL editor repositions it. Undo/redo works. The chip never shows raw {الاسم}. Pasting plain text containing {الاسم} produces a chip. Backspace deletes the chip atomically."
    why_human: "jsdom has no layout or real drag-and-drop. Plan 03-09 tags this as a backstop item (verification: backstop), so it needs explicit human evidence."
  - test: "Male/female live preview against the edit form, in a real browser"
    expected: "Switching the gender toggle and the test name updates the preview. An empty name shows the neutral form. Arabic diacritics are not clipped. Long multi-paragraph content scrolls inside the bounded preview."
    why_human: "Visual and layout fidelity. The logic is verified (personalize() from @roi/shared), but the claim that it renders exactly what a phone shows can only be confirmed visually. The mobile renderer is not built until Phase 4."
  - test: "Docker image build and Dokploy boot (backend/Dockerfile)"
    expected: "The image builds. The container serves /admin, /graphql and /health on one origin. Data persists on the /data volume."
    why_human: "Docker was not run during verification. The Dockerfile was reviewed statically and the Vite admin build was run on its own."
---

# Phase 3: Admin Panel & Moderation Verification Report

**Phase Goal:** As a content owner, I want to add and moderate verses, names and blessings in a safe admin panel, so that the app's content stays correct without code changes.
**Verified:** 2026-11-25
**Status:** human_needed
**Re-verification:** No, initial verification

All five roadmap success criteria are backed by code and passing tests. The only open items are checks that need a real browser or real Google sign-in. No gaps were found.

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin signs in with Google. Only allowlisted emails are admitted (several admins at once). Others are refused. The session expires. | ✓ VERIFIED, with an override on "short" | `AdminAuthService.authenticateGoogleIdToken` (`backend/src/admin-auth/admin-auth.service.ts`) verifies the ID token, requires `email_verified === true`, then does a case-insensitive trimmed check against the `ADMIN_EMAILS` set, otherwise throws `ForbiddenException('ADMIN_EMAIL_NOT_ALLOWLISTED')`. `verifySessionToken` re-checks the allowlist on every request, so removing an admin invalidates their cookie. The JWT is HS256 with a 14-day expiry. `AdminAuthGuard` requires the `x-roi-admin: 1` header and the cookie. Every admin resolver uses `@UseGuards(AdminAuthGuard)`. Tests in `admin-auth.test.ts` cover multi-admin, 403, forged cookie and removed-admin cases. The 14-day lifetime is the owner's D-02 decision (override recorded above). CR-01 is fixed: the audience is `ADMIN_GOOGLE_CLIENT_ID`. |
| 2 | Admin can add, edit and soft-delete a verse, name of God and blessing. The change reaches a phone on its next sync. | ✓ VERIFIED | `AdminContentResolver` and `AdminContentService` provide create/update/softDelete/restore for all three kinds. Every write goes through `ContentService.applyContentMutation()`, which bumps `contentVersion`, writes `audit_log` in the same transaction, then refreshes the snapshot. Soft-deleted rows keep `deletedAt` and a new `version`, so `contentDelta` returns them to phones as tombstones. `admin-content.test.ts` covers CRUD for all three kinds plus a `contentDelta` assertion at version 8. |
| 3 | The same-text switch shows one field when on. When off, male and female fields sit side by side and both are required. The name goes in through a draggable chip and the raw `{الاسم}` token is never shown. | ✓ VERIFIED for logic. Drag needs a human check. | `ItemEditorPage.tsx` renders one editor when `sameForBoth` is on and a 2-column grid when off. `createContentFormSchema` requires non-empty `textFemale` when the switch is off. The switch-on state keeps the hidden draft and sends `textFemale: null` on save. `NameTokenNode` is `inline`, `atom`, `draggable`, and its React view renders a pill labelled `chipDisplayLabel`, not the token. `renderText` and the serializer map it to `NAME_TOKEN` only in storage. A paste rule and `handlePaste` convert pasted `{الاسم}` into a chip. Tests: `chip-editor.test.tsx`, `item-editor.test.tsx`, `markdown-serializer.test.ts`. |
| 4 | A live preview with a test name and gender toggle renders what a phone would show. Validation rejects any token other than `{الاسم}` and warns on a one-sided name. | ✓ VERIFIED for logic. Visual parity needs a human check. | `LivePreviewCard` calls `personalize()` from `@roi/shared` directly and renders safe React elements with no `dangerouslySetInnerHTML` (grep found none). It has a test-name input, a neutral-clear button and an M/F toggle. The server-side `personalizedTextSchema` (shared) is applied in every create/update/accept resolver through `ZodValidationPipe`. The client form uses the same schema. `hasOneSidedNameToken` drives a non-blocking warning banner. WR-03 added rejection of links, images and raw HTML. |
| 5 | Admin opens a suggestion, edits it, then accepts it (it joins public content) or rejects it (it leaves the queue). | ✓ VERIFIED | `AdminModerationService.acceptSuggestion` runs inside `applyContentMutation`. It guards on `status = 'pending'` and throws 409 `SUGGESTION_ALREADY_MODERATED` when `changes !== 1`. It inserts the edited item into the right table with `nextVersion`. `rejectSuggestion` is an IMMEDIATE transaction with the same guard, an optional note and an audit row. `SuggestionReviewPage` reuses `ItemEditorWorkspace` and shows the submitter counts. Tests cover submitter counts, accept, reject with note, and double-accept, accept-after-reject and double-reject. |

**Score:** 5/5 truths verified (0 present but behavior-unverified). Truths 3 and 4 still have browser-only parts, listed under Human Verification.

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `backend/src/admin-auth/*` (service, guard, resolver, module) | ✓ VERIFIED | Substantive and wired. Guard is applied to `adminMe` and to every other admin resolver. |
| `backend/src/admin-content/*`, `admin-moderation/*`, `admin-audit/*` | ✓ VERIFIED | Resolvers are guarded and zod-validated. Services delegate to `applyContentMutation`. |
| `backend/src/config/env.ts`, `config/paths.ts`, `main.ts` | ✓ VERIFIED | `assertProductionConfig` runs in `bootstrap()`. `resolveAdminDistDir` feeds `mountAdminSpa`. |
| `backend/Dockerfile` | ✓ VERIFIED statically | Multi-stage. It builds admin, copies only `admin/dist` into the runner, and runs as `node`. |
| `backend/drizzle/0001_*.sql`, `db/schema.ts` | ✓ VERIFIED | `moderationNote` and the status index exist (exercised by the moderation tests). |
| `admin/src/components/ui/*` (14 primitives) | ✓ VERIFIED | Present and typechecked. Grep for physical `ml/mr/pl/pr/left/right/text-left/text-right` utilities found none. |
| `admin/src/lib/{graphql,i18n,admin-api,markdown-serializer,validation}.ts` | ✓ VERIFIED | The client sends `credentials: 'include'` and `x-roi-admin: 1`, with one retry after re-auth. |
| `admin/src/components/auth/*`, `layout/AdminShell.tsx`, `pages/*` | ✓ VERIFIED | All present and wired. `localStorage` holds only the UI language, never tokens or secrets. |
| `admin/src/components/editor/*` | ✓ VERIFIED | `NameTokenExtension`, `NameChipView`, `RichContentEditor` and `LivePreviewCard` are wired into `ItemEditorPage`. |
| `admin/public/fonts/*.ttf` | ✓ VERIFIED | Four fonts are self-hosted. No Google Fonts or CDN reference in `index.html` or `index.css`. |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| `admin/src/lib/graphql.ts` | `AdminAuthGuard` | ✓ WIRED | Same header name `x-roi-admin` and the same cookie transport. |
| `AdminAuthModule` | `AppModule` | ✓ WIRED | The module test runs through the real app module. |
| `AdminContentService`, `AdminModerationService` | `ContentService.applyContentMutation` | ✓ WIRED | Accept, create, update and delete all go through it. |
| `RichContentEditor` | `markdown-serializer` | ✓ WIRED | Hydrate on mount, serialize on update. |
| `LivePreviewCard` | `@roi/shared` `personalize` | ✓ WIRED | Imported and called. |
| `CatalogPage` | `@roi/shared` `matches` | ✓ WIRED | Verified by `catalog.test.tsx`. |
| `SuggestionReviewPage` | `ItemEditorWorkspace` | ✓ WIRED | `ItemEditorWorkspace` is exported as an alias of `ItemEditorPage`. |
| `main.ts` | `resolveAdminDistDir` | ✓ WIRED | Mounts `/admin` and the `/admin/{*splat}` fallback. Dotted paths fall through to 404. |

### Data-Flow Trace (Level 4)

| Artifact | Data | Source | Real data | Status |
|----------|------|--------|-----------|--------|
| `CatalogPage` | verses / names / blessings lists | `adminVerses`, `adminNamesOfGod`, `adminBlessings` GraphQL, Drizzle `select` | Yes | ✓ FLOWING |
| `ModerationQueuePage` / `SuggestionReviewPage` | suggestions with submitter counts | `adminSuggestions`, grouped counts from the `suggestions` table | Yes | ✓ FLOWING |
| `AuditLogPage` | audit rows | `adminAuditLogs`, Drizzle `select` on `audit_log` | Yes | ✓ FLOWING |
| `LivePreviewCard` | personalized text | live form state through `personalize()` | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Full test suite | `bun run test` | 41 files, 275 tests passed. The `snapshot refresh failed` log is the intentional WR-06 failure-injection test. | ✓ PASS |
| Typecheck (shared/backend, admin, app) | `bun run typecheck` | No errors. | ✓ PASS |
| Admin production build | `vite build` into the scratchpad directory | Built in about 0.3 s, with `index.html`, `assets/` and `fonts/`. Only a chunk-size warning (about 1 MB). | ✓ PASS |

### Probe Execution

No probes are declared in the phase plans, and no `scripts/*/tests/probe-*.sh` exist. Step 7c was skipped.

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| ADM-01 | Google sign-in, allowlist, multiple admins, short-lived session | ✓ SATISFIED | Truth 1. The 14-day lifetime is the D-02 override. |
| ADM-02 | Add, edit and soft-delete verses, names and blessings | ✓ SATISFIED | Truth 2. |
| ADM-03 | Same-text switch, with both fields required when off | ✓ SATISFIED | Truth 3. |
| ADM-04 | Atomic, draggable chip with no raw token | ✓ SATISFIED in code. Drag feel is a human item. | Truth 3. |
| ADM-05 | Live preview with test name and gender toggle | ✓ SATISFIED in code. Visual check is a human item. | Truth 4. |
| ADM-06 | Reject any token other than `{الاسم}`, and warn on a one-sided name | ✓ SATISFIED | Truth 4. |
| ADM-07 | Review, edit, accept or reject suggestions | ✓ SATISFIED | Truth 5. |

Orphaned requirements: none. REQUIREMENTS.md maps exactly ADM-01..07 to Phase 3.

**Bookkeeping warning:** REQUIREMENTS.md still shows ADM-02..ADM-07 as unchecked and "Pending" (lines 132-137 and 195-200). Only ADM-01 is marked complete. The code satisfies all seven, so the traceability table needs updating. This is a documentation gap, not a code gap.

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| (phase files) | No TBD/FIXME/XXX/TODO/HACK markers in the phase source | n/a | None |
| `backend/src/main.ts:85-90` (IN-01, open) | Static assets served `immutable` for 1 year, including unhashed `/admin/fonts/*` and a direct `/admin/index.html` | ⚠️ Warning | A stale shell can be pinned for a direct visit to `/admin/index.html`. The SPA routes use the `no-cache` fallback, so normal navigation is unaffected. |
| `admin/src/components/auth/AuthProvider.tsx` (IN-02, open) | Login errors such as 429 and 503 show "session expired" | ⚠️ Warning | Poor diagnostics when the operator is throttled or the server is misconfigured. |
| `backend/src/admin-auth/admin-auth.resolver.ts` (IN-03, open) | `adminLogin` and `adminLogout` do not check `x-roi-admin` | ℹ️ Info | Apollo `csrfPrevention` covers it today. |
| Session revocation (WR-02, partly fixed) | There is no server-side revocation. A stolen cookie stays valid until its 14-day expiry, or until the email is removed from `ADMIN_EMAILS` and the backend restarts. | ⚠️ Warning | This is a known follow-up (a `jti` denylist or session epoch needs a table). It is not a must-have, and removing the allowlist entry gives an emergency revoke. |

No blocker anti-patterns were found. CR-01 and WR-01 through WR-06 are fixed in code, confirmed by reading the fixed code and by the new or updated tests.

### Human Verification Required

#### 1. Live Google sign-in under the production CSP
**Test:** Deploy with `NODE_ENV=production`, `ADMIN_GOOGLE_CLIENT_ID`, `ADMIN_EMAILS` and a 32+ character `ADMIN_JWT_SECRET`. Sign in with an allowlisted account and with a non-allowlisted one.
**Expected:** The GIS button and popup work under the CSP. The allowlisted account lands in the panel. The other account sees the refusal. The cookie is `HttpOnly; Secure; SameSite=Lax`. Mid-edit expiry triggers silent re-auth, or the modal with the form state kept.
**Why human:** Needs real Google and a production environment. The CR-01 audience fix cannot be proven with a mocked verifier.

#### 2. RTL chip drag in the editor
**Test:** In Arabic mode and in English mode, drag the chip mid-sentence, undo and redo, paste text containing `{الاسم}`, and backspace over the chip. Copy between the male and female fields.
**Expected:** The chip moves and is removed atomically. It is always a pill and never raw braces.
**Why human:** jsdom cannot do real drag-and-drop or RTL layout. Plan 03-09 marks this as a backstop item.

#### 3. M/F live preview
**Test:** Toggle gender and edit the test name for a verse, a name of God and a blessing, including one with a supporting verse and a one-sided-name warning.
**Expected:** The text matches what the mobile app will show, diacritics are not clipped, and the preview scrolls inside its bounds.
**Why human:** Visual fidelity. The mobile renderer arrives in Phase 4.

#### 4. Container build and boot
**Test:** `docker build -f backend/Dockerfile .`, then run it with a `/data` volume and visit `/admin`, `/graphql` and `/health`.
**Expected:** One origin serves all three and the data persists.
**Why human:** Docker was not run in this verification.

### Gaps Summary

There are no gaps. Every roadmap success criterion has substantive, wired and data-connected implementation evidence. Tests (275) and typecheck pass, and the admin SPA builds. The status is `human_needed` because live Google sign-in, real drag-and-drop in RTL, visual preview fidelity and the Docker build cannot be checked from the codebase alone. Follow-ups that are not blockers:
- Update the ADM-02..07 checkboxes and traceability rows in REQUIREMENTS.md.
- Add server-side session revocation (WR-02).
- Fix the cache headers (IN-01) and the login error classification (IN-02).

---

_Verified: 2026-11-25_
_Verifier: Claude (gsd-verifier)_
