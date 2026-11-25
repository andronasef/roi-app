---
phase: 03-admin-panel-moderation
plan: 08
subsystem: ui
tags: [react, tanstack-query, graphql-request, react-router, rtl, moderation, audit-log]

requires:
  - phase: 03-admin-panel-moderation
    plan: 03
    provides: adminVerses/NamesOfGod/Blessings, create/update, softDeleteContent/restoreContent, adminAuditLogs, adminSuggestions/acceptSuggestion/rejectSuggestion (409 CONFLICT)
  - phase: 03-admin-panel-moderation
    plan: 06
    provides: executeAdminGraphQL, AdminShell (contentVersion pill, pending badge), I18nProvider
  - phase: 03-admin-panel-moderation
    plan: 07
    provides: ItemEditorPage / ItemEditorWorkspace, LivePreviewCard
provides:
  - admin-api.ts typed GraphQL documents and TanStack Query hooks (catalog, content CRUD, soft-delete/restore, audit log, suggestions, accept/reject)
  - CatalogPage (Verses / Names of God / Blessings) and ItemEditorRoute (create + edit by id)
  - AuditLogPage, ModerationQueuePage, SuggestionReviewPage mounted in main.tsx
affects: [03-09]

actuals:
  tokens: 26000
  tasks: 2
  commits: 2

commits: 2
plan_head_before: e3c2434ae320da010404204dc49fff645f1e4417
plan_head_after: f163475146cf5fbd6ef6f04a63743d62c5af39ef

tech-stack:
  added: []
  patterns:
    - "KIND_CONFIG table generates every per-kind GraphQL document, so verses / names / blessings cannot drift"
    - "Catalog fetches status 'all' once and splits Active/Deleted and searches client-side with matches()"
    - "Every write invalidates adminCatalog, adminContentVersion, adminSuggestions and adminAuditLogs, keeping the AdminShell version pill and Pending badge live"
    - "Accept and Reject share one lock (status !== pending || either mutation in flight) so they cannot race (T-03-15)"

key-files:
  created:
    - admin/src/lib/admin-api.ts
    - admin/src/pages/CatalogPage.tsx
    - admin/src/pages/AuditLogPage.tsx
    - admin/src/pages/ModerationQueuePage.tsx
    - admin/src/pages/SuggestionReviewPage.tsx
    - admin/src/__tests__/catalog.test.tsx
    - admin/src/__tests__/moderation-queue.test.tsx
    - admin/src/__tests__/graphql-mock.tsx
  modified:
    - admin/src/main.tsx
    - admin/src/lib/i18n.ts
    - admin/src/pages/ItemEditorPage.tsx

key-decisions:
  - "Catalog uses one status 'all' query and filters Active/Deleted client-side; edit routes find the item in the same cached list (no single-item query exists on the backend)"
  - "Audit log shows the newest 200 rows (backend max page) with fixed action/entity filter lists; offset paging deferred (ponytail comment in code)"
  - "Pending list query key is ['adminSuggestions','list',status], distinct from the shell's ['adminSuggestions','pending'] (which caches only ids)"

patterns-established:
  - "Shared EmptyState / ErrorBanner / SkeletonRows live in CatalogPage.tsx; ConflictBanner / RejectDialog in ModerationQueuePage.tsx"

requirements-completed: [ADM-02, ADM-07]

duration: 20min
completed: 2026-11-25
status: complete
---

# Phase 03 Plan 08: Catalog, Audit Log and Moderation Screens Summary

**Typed admin-api hooks plus catalog (matches() search, soft-delete/restore), read-only audit log, and a moderation queue/review flow with submitter context, edit-and-accept, one-click reject and an explicit 409 conflict banner**

## Accomplishments
- `admin-api.ts`: per-kind documents from one config table, hooks for list/save/soft-delete/restore/audit/suggestions/accept/reject, `isModerationConflict()` (CONFLICT code, status 409 or SUGGESTION_ALREADY_MODERATED).
- `CatalogPage`: diacritic/hamza-insensitive search across ref/title/verseRef/text/textFemale, Active/Deleted tabs, soft-delete AlertDialog, one-click Restore, `line-clamp-2` RTL cells, name-chip and dual-gender badges, skeleton, empty/search-empty states, retry banner, Arabic-Indic counts in ar.
- `ItemEditorRoute`: create and edit (loads by id from the cached catalog, redirects on unknown id), saves through the right create/update mutation.
- `AuditLogPage`: action/entityType filters, action badges, expandable `summaryJson` rendered only as escaped text in a wrapped `<pre>` (T-03-16).
- `ModerationQueuePage`: Pending/Accepted/Rejected tabs, calm zero pending count, moderationNote on rejected rows, Review link, one-click Reject with optional note.
- `SuggestionReviewPage`: Submitter Context card (email, timestamp, accepted/rejected/pending counts), full editor + live preview, Accept & Publish and Reject; 409 shows the documented banner, refetches status and locks both actions.
- Tests: 16 new (catalog 9, moderation 7). Admin suite 94/94; `bun run typecheck` and `bun run --cwd admin build` pass.

## Task Commits
1. **Task 1: admin-api, CatalogPage, AuditLogPage, routes** - `73898e6`
2. **Task 2: ModerationQueuePage, SuggestionReviewPage** - `f163475`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] `submitDisabled` prop on ItemEditorPage**
- **Issue:** The review page must block Accept when the suggestion is no longer pending or Reject is in flight (T-03-15); the editor had no way to disable its Save button.
- **Fix:** Added optional `submitDisabled` to `ItemEditorPage` (not in the plan's file list).
- **Commit:** 73898e6

**2. [Scope note] Extra files and i18n keys**
- `admin/src/__tests__/graphql-mock.tsx` (shared fetch-stub/render helper) added to avoid duplicating it across both test files.
- i18n additions in both languages: `cta.reviewSuggestion`, `catalog.searchLabel`, `catalog.itemCount`, `moderation.emptyOther`, `moderation.suggestion`.

**3. [Scope note] TDD commits**
- Tests and implementation landed in one commit per task (same as 03-07).

**Total deviations:** 1 auto-fixed, 2 notes; no new packages, no backend changes.

## Known Stubs
None.

## Threat Flags
None. T-03-15 mitigated (shared lock, in-flight disable, explicit conflict banner, tested); T-03-16 mitigated (escaped text, tested with an `<img onerror>` payload); T-03-SC: no packages added.

## Notes
- Accepted/Rejected empty tabs reuse the pending-queue body text under a neutral heading (`moderation.emptyOther`); UI-SPEC only defines the Pending empty state.
- Real-browser smoke test still needed for the whole flow (Google sign-in, RTL layout, chip drag); jsdom covers logic only. Backend behavior for 409 mapping relies on plan 03-03's `formatError` mapping.

## Self-Check: PASSED

- All 8 created files exist on disk; commits `73898e6` and `f163475` are ancestors of HEAD; `git rev-list --count` from the plan base = 2.
