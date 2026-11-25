---
phase: 03-admin-panel-moderation
plan: 06
subsystem: ui
tags: [react, google-identity, graphql-request, auth, csrf, rtl, i18n, react-router]

requires:
  - phase: 03-admin-panel-moderation
    plan: 05
    provides: Warm-paper UI primitives (Dialog dismissible=false, Card, Button, Badge, Skeleton, Toaster) and i18n copy
provides:
  - Credentialed admin GraphQL client (credentials include + x-roi-admin CSRF header) with one-shot 401 re-auth retry
  - AuthProvider with boot session check, silent GIS renewal, deduped 401 handling and sibling ReauthModal
  - LoginPage with inline allowlist 403 refusal copy and boot Skeleton
  - Bilingual AR/EN AdminShell (logical CSS only) with contentVersion pill, pending badge, email and sign out
  - main.tsx provider tree and BrowserRouter basename /admin with placeholder routes for plan 03-08
affects: [03-07, 03-08, 03-09]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2

commits: 2
plan_head_before: ee9e1bb1c95e9cfda5383bb4645fc264640eba0d
plan_head_after: 0f7f656a988703b65ab62e8f3d9a161b8bcdaba2

tech-stack:
  added: []
  patterns:
    - "executeAdminGraphQL(doc, vars, {reauth}) wraps graphql-request; auth bootstrap calls pass reauth:false so they never trigger re-auth"
    - "ReauthModal rendered as a sibling of children inside AuthProvider so page/editor state never unmounts"

key-files:
  created:
    - admin/src/lib/graphql.ts
    - admin/src/components/auth/ReauthModal.tsx
    - admin/src/components/auth/AuthProvider.tsx
    - admin/src/components/layout/AdminShell.tsx
    - admin/src/pages/LoginPage.tsx
    - admin/src/main.tsx
    - admin/src/__tests__/auth-reauth.test.tsx
  modified: []

key-decisions:
  - "Session cookie is httpOnly and never visible to JS; the only localStorage key is the UI language (T-03-11)"
  - "Allowlist refusal detected from the GraphQL message/originalError (ADMIN_EMAIL_NOT_ALLOWLISTED) since Nest maps ForbiddenException to code FORBIDDEN with HTTP 200"
  - "ReauthModal is non-dismissible (per plan); recovery is signing in, or reloading the page"

patterns-established:
  - "AuthProvider exposes useAuth(); pages gate on user, AdminShell is a layout route using Outlet"

requirements-completed: [ADM-01]

duration: 15min
completed: 2026-11-25
status: complete
---

# Phase 03 Plan 06: Admin Auth Gate and Bilingual Shell Summary

**Credentialed GraphQL client with x-roi-admin CSRF header, Google Sign-In AuthProvider with silent-GIS then in-page modal 401 recovery that preserves editor state, and a logical-CSS AR/EN AdminShell**

## Accomplishments
- `graphql.ts`: `GraphQLClient` with `credentials: 'include'` and `x-roi-admin: 1`; `AdminApiError` (code/status, `isUnauthenticated`, `isAllowlistRefusal`); `executeAdminGraphQL` retries once after the registered unauthorized handler succeeds; `fetchAdminPublicConfig`, `adminMeQuery`, `adminLoginMutation`, `adminLogoutMutation`.
- `AuthProvider`: boots config + `adminMe`, wraps in `GoogleOAuthProvider`, dedupes concurrent 401s on one promise, tries silent `google.accounts.id.prompt` (2.5 s timeout), then opens `ReauthModal` as a sibling of `children`.
- `AdminShell`/`LoginPage`/`main.tsx`: AR/EN shell (`dir`/`lang`, `border-s-4` active nav, Arabic-Indic digits via `formatNumber`), skeleton/loading states, router with placeholders.
- 5 new tests (credential headers, allowlist 403 copy, dir/digit toggle, modal re-auth with state preserved and single mount, silent GIS renewal). Admin suite 20/20, `bun run typecheck` and `bun run --cwd admin build` pass.

## Task Commits
1. **Task 1: GraphQL client, ReauthModal, AuthProvider** - `f9f3421`
2. **Task 2: AdminShell, LoginPage, main.tsx, tests** - `0f7f656`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] graphql-request rejects relative endpoint URLs**
- **Found during:** Task 2 (tests failed with `Invalid URL`)
- **Issue:** `new GraphQLClient('/graphql')` throws because graphql-request calls `new URL(url)`; this would also fail in a real browser.
- **Fix:** Build the endpoint as `new URL('/graphql', window.location.origin).href` (still same-origin; Vite proxy in dev).
- **Files modified:** admin/src/lib/graphql.ts
- **Commit:** 0f7f656

**2. [Rule 3 - Blocking] `GoogleLogin` has no `locale` prop in the installed typings**
- **Fix:** Dropped it; button language follows the browser.
- **Commit:** f9f3421

**Total deviations:** 2 auto-fixed, no scope change.

## Known Stubs

| File | Reason |
|------|--------|
| admin/src/main.tsx | Route elements for verses/names/blessings/suggestions/audit-log are placeholder headings, intentionally replaced by plan 03-08 |

## Threat Flags

None. No new network surface beyond the plan's threat model; no new packages installed.

## Notes
- Real Google GIS silent renewal (FedCM/One Tap) cannot be exercised under jsdom; it is covered with a stubbed `window.google` and should be smoke-tested in a browser once a Google client ID is configured.
- Backend contentVersion and pending-count queries (`adminContentVersion`, `adminSuggestions(status:"pending")`) are consumed by AdminShell as-is.

## Self-Check: PASSED

- All 7 files exist on disk; commits `f9f3421` and `0f7f656` are ancestors of HEAD.
- Zero physical directional Tailwind classes, `tracking-*`, `dangerouslySetInnerHTML` in new files; only localStorage use is the language key via i18n.
