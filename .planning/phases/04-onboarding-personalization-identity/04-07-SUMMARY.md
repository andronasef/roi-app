---
phase: 04-onboarding-personalization-identity
plan: 07
subsystem: ui
tags: [personal-items, suggestions, graphql, google-signin, sqlite, tombstones, rtl]

requires:
  - phase: 04-onboarding-personalization-identity
    provides: ProfileProvider and uiCopy (04-03), Google drive.appdata auth helpers (04-04), LeyaanaScreen slots & favorites hydration (04-05)
  - phase: 02-content-backend-first-download
    provides: SyncApiClient and backend submitSuggestion GraphQL mutation
provides:
  - SyncApiClient.submitSuggestion with Bearer idToken, client-side submitSuggestionInputSchema validation, and typed SuggestionSubmitError mapping
  - Local personal_items CRUD (createPersonalItem, updatePersonalItem, deletePersonalItem with linked favorite tombstone, listPersonalItems, toSuggestionInput)
  - PersonalItemDialog, DeletePersonalItemDialog, SuggestSignInDialog, PersonalItemsSection, and usePersonalSuggestion wired into LeyaanaScreen and /leyaana/browse
affects: [08-drive-sync]

actuals:
  tasks: 2
  commits: 2
  plan_head_before: 9218152f20f5301203d1daee051f2ed408aa5846
  plan_head_after: 17aa76a5205e0a25a6707a60e71b7c682b274957

tech-stack:
  added: []
  patterns:
    - "Shared usePersonalSuggestion hook + PersonalItemsSection component so LeyaanaScreen and /leyaana/browse share connectivity check, inline Google Sign-In, and calm 401/429/400 error handling without duplication"
    - "Tombstone both personal_items and linked fav:personal:<kind>:<id> rows via softDelete without calling Drizzle .delete()"

key-files:
  created:
    - app/features/leyaana/personal-items.ts
    - app/features/leyaana/__tests__/personal-items.test.ts
    - app/features/leyaana/PersonalItemDialog.tsx
  modified:
    - app/features/sync/api.ts
    - app/features/sync/__tests__/api.test.ts
    - app/features/leyaana/LeyaanaScreen.tsx
    - app/app/leyaana/browse.tsx

decisions:
  - "Extracted shared PersonalItemsSection and usePersonalSuggestion hook in PersonalItemDialog.tsx so LeyaanaScreen and browse.tsx reuse identical CRUD, copy, favorite, and submitSuggestion flows."
  - "Validated all personal item creates/updates client-side with submitSuggestionInputSchema so brace tokens and unsafe Markdown are rejected before local persistence or network submission."

patterns-established:
  - "All personal_items CRUD helpers live in app/features/leyaana/personal-items.ts with relative imports for Node/Vitest compatibility."

requirements-completed: [ME-08, ME-09]

duration: 4min
completed: 2026-11-25
status: complete
---

# Phase 04 Plan 07: Personal Items & Public Suggestions Summary

**Implemented local `personal_items` CRUD with linked-favorite tombstones (`app/features/leyaana/personal-items.ts`), `SyncApiClient.submitSuggestion` with Bearer Google ID-token auth and typed error mapping (`app/features/sync/api.ts`), and `PersonalItemDialog` / `DeletePersonalItemDialog` / `SuggestSignInDialog` wired into `LeyaanaScreen` and `/leyaana/browse`.**

## Accomplishments

- **Task 1 (`0c39a19`):** Added `submitSuggestion` to `SyncApiClient` (`app/features/sync/api.ts`) with pre-flight `submitSuggestionInputSchema` validation, `Authorization: Bearer <idToken>` header, and `SuggestionSubmitError` mapping (`unauthenticated`, `daily_limit`, `rate_limited`, `validation`, `network`). Implemented `createPersonalItem`, `updatePersonalItem`, `deletePersonalItem` (tombstoning both `personal_items` and `favorites`), `listPersonalItems`, and `toSuggestionInput` in `app/features/leyaana/personal-items.ts`. Verified with unit tests in `app/features/sync/__tests__/api.test.ts` (7 tests) and `app/features/leyaana/__tests__/personal-items.test.ts` (4 tests).
- **Task 2 (`17aa76a`):** Created `app/features/leyaana/PersonalItemDialog.tsx` with plain-text `PersonalItemDialog` (no `{الاسم}` or Markdown syntax exposed), `DeletePersonalItemDialog` (`حذف العنصر الشخصي`), `SuggestSignInDialog` (explaining *"عشان نراجع الاقتراحات ونمنع السبام"*), `PersonalItemsSection`, and `usePersonalSuggestion`. Wired into `app/features/leyaana/LeyaanaScreen.tsx` and `app/app/leyaana/browse.tsx`.

## Verification

- `bun run test -- --project @roi/app --project @roi/shared` — 24 test files, 171 tests passed.
- `bun run typecheck` — passed (`tsconfig.json`, `admin/tsconfig.json`, `app/tsconfig.json`).
- `cd app && bun run lint` — passed (`expo lint --max-warnings 0`).

## Deviations from Plan

None — plan executed as specified.

## Next Phase Readiness

Phase 4 (`04-onboarding-personalization-identity`) is complete across all 7 plans (`HOME-01`..`HOME-03`, `HOME-05`, `PERS-01`..`PERS-04`, `ME-01`..`ME-09`, `SET-01`).
