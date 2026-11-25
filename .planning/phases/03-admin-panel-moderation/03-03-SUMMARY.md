---
phase: 03-admin-panel-moderation
plan: 03
subsystem: api
tags: [nestjs, graphql, drizzle, sqlite, zod, moderation, audit-log, snapshots]

requires:
  - phase: 02-content-backend-first-download
    provides: ContentService.applyContentMutation(), SnapshotService, Drizzle WAL SQLite schema, @roi/shared personalizedTextSchema
  - phase: 03-admin-panel-moderation
    plan: 02
    provides: AdminAuthModule, AdminAuthGuard (cookie + x-roi-admin CSRF), suggestions.moderationNote, admin-test-helpers.ts
provides:
  - ContentModule exporting SnapshotService and ContentService cleanly to AppModule and admin modules
  - AdminContentModule with AdminAuthGuard-protected CRUD, soft-delete, restore, and Zod (@roi/shared) validation
  - AdminAuditModule with paginated read-only adminAuditLogs query filterable by action and entityType
  - AdminModerationModule with submitter historical counts, atomic acceptSuggestion promotion, rejectSuggestion with optional note, and 409 CONFLICT concurrency guard
  - AppModule GraphQL formatError mapping for HTTP 404/409/429/503 status codes
affects: [03-07, 03-08, 03-09]

actuals:
  tokens: 24367
  tasks: 2
  commits: 2

commits: 2
plan_head_before: d991842c93df39cdd43fcb71bf5bc3da9b1bb001
plan_head_after: 4da30b309097932ca490e2304307ff9259efe95f

tech-stack:
  added: []
  patterns:
    - "ContentModule encapsulates SnapshotController, SnapshotService, ContentService, and ContentResolver and exports SnapshotService + ContentService"
    - "All public content writes (create/update/softDelete/restore/acceptSuggestion) delegate to ContentService.applyContentMutation() for atomic version bump, audit_log write, and snapshot refresh"
    - "Conditional SQLite UPDATE ... WHERE id = ? AND status = 'pending' inside IMMEDIATE transaction prevents concurrent double-accept or double-reject (409 CONFLICT)"
    - "AppModule formatError maps HTTP status codes 404/409/429/503 from Nest HttpExceptions to GraphQL extensions.code (NOT_FOUND, CONFLICT, TOO_MANY_REQUESTS, SERVICE_UNAVAILABLE)"

key-files:
  created:
    - backend/src/content/content.module.ts
    - backend/src/admin-content/admin-content.service.ts
    - backend/src/admin-content/admin-content.resolver.ts
    - backend/src/admin-content/admin-content.module.ts
    - backend/src/admin-audit/admin-audit.resolver.ts
    - backend/src/admin-audit/admin-audit.module.ts
    - backend/src/admin-moderation/admin-moderation.service.ts
    - backend/src/admin-moderation/admin-moderation.resolver.ts
    - backend/src/admin-moderation/admin-moderation.module.ts
    - backend/src/__tests__/admin-content.test.ts
    - backend/src/__tests__/admin-moderation.test.ts
  modified:
    - backend/src/content/snapshot-builder.ts
    - backend/src/app.module.ts

key-decisions:
  - "Returned Boolean from softDeleteContent and restoreContent mutations rather than a GraphQL union across three content DTOs, keeping client mutation handling uniform."
  - "Added HTTP status-to-GraphQL code mapping (404 -> NOT_FOUND, 409 -> CONFLICT, 429 -> TOO_MANY_REQUESTS, 503 -> SERVICE_UNAVAILABLE) in AppModule formatError because @nestjs/apollo defaults non-400/401/403/422 HttpExceptions to INTERNAL_SERVER_ERROR."
  - "Normalized empty/whitespace optional verseRef and reject note strings to null before validation/persistence."

patterns-established:
  - "Admin resolvers guard all queries/mutations at class level with @UseGuards(AdminAuthGuard) and validate inputs with ZodValidationPipe backed by @roi/shared personalizedTextSchema."
  - "Rejecting suggestions uses sqlite.transaction().immediate() without incrementing contentVersion or refreshing snapshots, while writing audit_log at current contentVersion."

requirements-completed: [ADM-02, ADM-06, ADM-07]

duration: 7min
completed: 2026-11-25
status: complete
---

# Phase 03 Plan 03: Admin Content CRUD, Audit Log & Suggestion Moderation Backend Summary

**`ContentModule`, `AdminContentModule`, `AdminAuditModule`, and `AdminModerationModule` delivering authenticated GraphQL catalog CRUD, soft-delete/restore, read-only audit logs, and race-safe atomic suggestion promotion/rejection**

## Performance

- **Duration:** 7 min
- **Started:** 2026-11-25T16:18:00Z
- **Completed:** 2026-11-25T16:25:00Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Extracted `ContentModule` (`backend/src/content/content.module.ts`) exporting `SnapshotService` and `ContentService`, and wired `ContentModule`, `AdminContentModule`, `AdminAuditModule`, and `AdminModerationModule` into `AppModule`.
- Implemented `AdminContentService` and `AdminContentResolver` with `@UseGuards(AdminAuthGuard)`, `@roi/shared` `personalizedTextSchema` validation via `ZodValidationPipe`, whitespace-to-`null` coercion on optional `verseRef`, `Active`/`Deleted`/`All` filtering, and delegation of every write (`create*`, `update*`, `softDeleteContent`, `restoreContent`) to `ContentService.applyContentMutation()`.
- Implemented `AdminAuditResolver` exposing paginated, filterable `adminAuditLogs(action, entityType, limit, offset)` ordered descending by `createdAt`.
- Implemented `AdminModerationService` and `AdminModerationResolver` with historical per-`googleSub` submitter stats (`pendingCount`, `acceptedCount`, `rejectedCount`), atomic edit-and-publish `acceptSuggestion` via `ContentService.applyContentMutation()`, one-click `rejectSuggestion` with optional `moderationNote`, and `status === 'pending'` SQLite `IMMEDIATE` transaction guards throwing `409 CONFLICT` (`SUGGESTION_ALREADY_MODERATED`) on concurrent moderation attempts.

## Task Commits

Each task was committed atomically:

1. **Task 1: Extract ContentModule and implement AdminContentModule and AdminAuditModule** - `9077e9a` (feat)
2. **Task 2: Implement AdminModerationModule with submitter stats, atomic Accept & Publish, Reject, and concurrency guard** - `4da30b3` (feat)

## Files Created/Modified
- `backend/src/content/content.module.ts` - Explicit NestJS module exporting `SnapshotService` and `ContentService`.
- `backend/src/content/snapshot-builder.ts` - Exported `compareContentOrder` for reuse in `AdminContentService`.
- `backend/src/admin-content/admin-content.service.ts` - Catalog list, create, update, soft-delete, and restore logic delegating writes to `ContentService.applyContentMutation()`.
- `backend/src/admin-content/admin-content.resolver.ts` - `AdminAuthGuard`-protected queries/mutations and GraphQL `@InputType()` definitions with `ZodValidationPipe`.
- `backend/src/admin-content/admin-content.module.ts` - Imports `[ContentModule, AdminAuthModule]`.
- `backend/src/admin-audit/admin-audit.resolver.ts` & `backend/src/admin-audit/admin-audit.module.ts` - Read-only `adminAuditLogs` query protected by `AdminAuthGuard`.
- `backend/src/admin-moderation/admin-moderation.service.ts` - Submitter stats aggregation, `acceptSuggestion` inside `applyContentMutation`, `rejectSuggestion` inside `sqlite.transaction().immediate()`, and `409` concurrency guard.
- `backend/src/admin-moderation/admin-moderation.resolver.ts` & `backend/src/admin-moderation/admin-moderation.module.ts` - `adminSuggestions`, `adminSuggestion`, `acceptSuggestion`, and `rejectSuggestion` GraphQL endpoints.
- `backend/src/app.module.ts` - Wired new modules, removed direct `Content*`/`Snapshot*` declarations, and mapped HTTP 404/409/429/503 status codes in `formatError`.
- `backend/src/__tests__/admin-content.test.ts` - Integration tests for auth/CSRF, brace validation, `verseRef` coercion, CRUD, soft-delete/restore, `contentDelta`, snapshots, and `adminAuditLogs`.
- `backend/src/__tests__/admin-moderation.test.ts` - Integration tests for submitter counts, atomic promotion, rejection notes, and concurrent double-accept/double-reject/accept-after-reject `409 CONFLICT` races.

## Decisions Made
- Mapped HTTP status codes `404`, `409`, `429`, and `503` in `AppModule`'s GraphQL `formatError` via `HTTP_STATUS_ERROR_CODES` so `NotFoundException` and `ConflictException` surface `NOT_FOUND` and `CONFLICT` instead of `@nestjs/apollo`'s default `INTERNAL_SERVER_ERROR`.
- Returned `Boolean` from `softDeleteContent` and `restoreContent` mutations to avoid GraphQL union boilerplate across the three content entity DTOs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Mapped HTTP 404/409/503 error codes in `AppModule` `formatError`**
- **Found during:** Task 2 (`admin-moderation.test.ts` verification)
- **Issue:** `@nestjs/apollo` only maps HTTP 400, 401, 403, and 422 automatically; `ConflictException` (409) and `NotFoundException` (404) defaulted to `extensions.code = 'INTERNAL_SERVER_ERROR'`.
- **Fix:** Extended `AppModule`'s `formatError` with `HTTP_STATUS_ERROR_CODES` mapping `404 -> NOT_FOUND`, `409 -> CONFLICT`, `429 -> TOO_MANY_REQUESTS`, and `503 -> SERVICE_UNAVAILABLE`.
- **Files modified:** `backend/src/app.module.ts`
- **Verification:** `bun run test -- --project @roi/backend` (12/12 files, 41/41 tests passing), `bun run typecheck`, and `bun run --cwd backend build` all exited 0.
- **Committed in:** `4da30b3` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Necessary for GraphQL clients and integration tests to receive `CONFLICT` and `NOT_FOUND` codes as specified. No scope creep.

## Issues Encountered
None.

## Next Phase Readiness
- Admin frontend plans (`03-07`, `03-08`) can now consume `adminVerses`, `adminNamesOfGod`, `adminBlessings`, `adminContentVersion`, `create*`/`update*`, `softDeleteContent`, `restoreContent`, `adminAuditLogs`, `adminSuggestions`, `adminSuggestion`, `acceptSuggestion`, and `rejectSuggestion`.

---
*Phase: 03-admin-panel-moderation*
*Completed: 2026-11-25*

## Self-Check: PASSED

- Verified all created files and modified files exist on disk.
- Verified task commits `9077e9a` and `4da30b3` are ancestors of `HEAD`.
