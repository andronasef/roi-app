---
phase: 03-admin-panel-moderation
fixed_at: 2026-11-25T20:20:00Z
review_path: .planning/phases/03-admin-panel-moderation/03-REVIEW.md
iteration: 1
findings_in_scope: 5
fixed: 3
skipped: 2
status: partial
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-11-25
**Source review:** .planning/phases/03-admin-panel-moderation/03-REVIEW.md
**Iteration:** 1

This report supersedes the earlier 03-REVIEW-FIX.md, which covered CR-01 and WR-01..06 of the previous review round. Finding IDs below refer to the current 03-REVIEW.md.

**Summary:**
- Findings in scope: 5 (Critical: 0, Warning: 5; `fix_scope: critical_warning`)
- Fixed: 3
- Skipped: 2 (both need a product or owner decision)

## Fixed Issues

### WR-01: Link/HTML rule on the read path

**Files modified:** `shared/src/schemas.ts`, `shared/src/__tests__/schemas.test.ts`
**Commit:** ffe68de
**Applied fix:** Split read and write schemas. The item, envelope and delta schemas (`verseItemSchema`, `nameOfGodItemSchema`, `blessingItemSchema`, snapshot and delta responses) now use a structural-only text shape (non-empty, max 5000, `{الاسم}`-only braces). `personalizedTextSchema` and `plainTextSchema` keep the link/HTML rule and remain the schemas used by admin mutations, accept and submit. A stored row or tombstone that violates the rule can no longer make `getContentDelta`, `rebuildAllSnapshots` or the mobile parse throw. A regression test covers the read path accepting legacy link text and the write path rejecting it. Existing rows are still served as stored. The production data was not scanned (no access). The review's optional one-off scan is not needed for correctness any more, but it would still be worth running to find legacy content that should be cleaned.

### WR-02: Reference-style links and bare URLs

**Files modified:** `shared/src/schemas.ts`, `shared/src/__tests__/schemas.test.ts`
**Commit:** 13a53c2
**Applied fix:** The write-side rule now also rejects reference links (`][`), reference definitions (`[x]: ...`, including the `<url>` form), bare `http(s)://` and `www.` URLs, and bare emails, in addition to inline links, images and raw HTML. I used a wider block-list rather than the full allow-list from the review. An allow-list would need a Markdown parser in shared and would also run on the seed. New tests cover the bypass strings and a few look-alike strings that must still pass (`[٢٣]`, `@` in prose). The seed content still validates. The stronger control the review mentions (disabling link and autolink handling in the mobile `react-native-marked` renderer) is a mobile-side change for a later phase. Content already stored is not re-checked, by design (see WR-01). Known side effect: `]` followed by `[` with optional whitespace is rejected, so two adjacent bracketed spans such as `[٢٣] [٢٤]` are blocked.

### WR-04: Content-conflict dead end

**Files modified:** `admin/src/pages/CatalogPage.tsx`, `admin/src/lib/i18n.ts`
**Commit:** 2435110
**Status:** fixed: requires human verification (logic change, no UI test added)
**Applied fix:** On `CONTENT_VERSION_CONFLICT` or `CONTENT_ALREADY_DELETED`, the route now awaits the catalog refetch and rebases `loaded.current.version` to the fresh version. The draft is kept and the next explicit Save overwrites the other admin's change, instead of conflicting forever. This also fixes the lost-response retry case. The Arabic and English `contentConflict` messages now say that saving again overwrites the other admin's edit, and that the admin should copy the draft and reopen the page to review the latest version first. This is the review's "minimum" option plus the overwrite path. A side-by-side diff view was not built. A deleted item still fails with `CONTENT_ALREADY_DELETED` on retry, as intended. The write of `loaded.current` during render was left as is, because it is idempotent.

## Skipped Issues

### WR-03: `{الاسم}` token still offered and accepted for names of God and blessings

**File:** `admin/src/components/editor/RichContentEditor.tsx:86`, `shared/src/schemas.ts` (`plainTextSchema`), `admin/src/components/editor/LivePreviewCard.tsx:73-75`
**Reason:** Skipped: the suggested fix contradicts documented product decisions and existing content, so it needs an owner decision. 03-CONTEXT.md D-04 specifies that names of God and blessings use the Tiptap editor "plus the atomic, draggable `{الاسم}` name chip". The seed file `backend/seed/initial-content.json` has `{الاسم}` in 9 of 12 names of God and 11 of 12 blessings. Making `plainTextSchema` reject braces would fail seeding and every existing item on edit. Hiding the chip button would stop admins adding the token to new items. The gender variant was removed in d607ee9, 1c1abe5 and 5a17fcd, but the token was not, and the "test name" preview control was hidden deliberately in 5a17fcd. The intended behavior is unclear. Either (a) names and blessings are still name-personalized, so the preview should substitute a name and the mobile app must personalize them, or (b) they are not, so the token must be stripped from the seed, the chip hidden and the schema tightened. No code was changed.
**Original issue:** The token is still offered, accepted and advertised (catalog badge) for kinds that are no longer personalized, so readers could see a literal `{الاسم}`.

### WR-05: `textFemale` removed from public GraphQL types with no deprecation window

**File:** `backend/src/content/content.resolver.ts:49-85`, `app/features/sync/api.ts:56-80`
**Reason:** Skipped: decision recorded, no code change, per the instruction not to reintroduce the field without a clearly safe path. A deprecated nullable `textFemale` that always resolves to `null` would technically be safe. I judged it speculative: the repo has no release tags, no store or EAS release config and no evidence of a shipped client. The only mobile consumer in the repo (`CONTENT_DELTA_QUERY`) was already updated in 1c1abe5. The old-client break is real only if a TestFlight or internal build with the old query exists. Rollout implication: the updated mobile build must ship with or before the backend change. An old build against the new backend gets `GRAPHQL_VALIDATION_FAILED` on the whole `contentDelta` query, verses included. If a pre-change build is out there, add `@Field(() => String, { nullable: true, deprecationReason: 'Removed; always null' }) textFemale?: string | null` to `NameOfGodDto` and `BlessingDto` for one release. That addition is safe because the field resolves to null when absent and old clients parse it as nullable.
**Original issue:** Removing the field outright breaks any mobile build whose delta query still selects it.

## Verification

- Where the gates ran: edits and per-fix checks ran in an isolated git worktree (`.claude/worktrees/rf-03-...`). The worktree borrowed the main checkout's `node_modules` through a link and copies of the small workspace `node_modules` directories. After fast-forwarding `main` to the fixes, the full suite was re-run in the main checkout, so the numbers below are reproducible there.
- Baseline before fixes: 41 files, 275 tests passing.
- After fixes (in the main checkout): `vitest run` runs the shared, backend, admin and app projects. 41 files, 277 tests, all passing (2 new tests).
- `npm run typecheck` (root, admin, app) was clean in the worktree after the last fix.
- Status of WR-04: type-checked and the existing admin suite passes, but there is no automated test for the conflict flow. It needs a manual check in the admin SPA with two sessions.

## Git

Three fix commits (ffe68de, 13a53c2, 2435110) were fast-forwarded onto `main`. The worktree, temp branch and recovery sentinel were cleaned up. `.planning/config.json`, `.planning/state.json` and `.impeccable/` were already modified or untracked before this run and were not touched.

---

_Fixed: 2026-11-25_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
