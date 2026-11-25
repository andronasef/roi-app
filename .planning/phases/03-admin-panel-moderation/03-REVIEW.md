---
phase: 03-admin-panel-moderation
reviewed: 2026-11-25T00:00:00Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - admin/src/__tests__/item-editor.test.tsx
  - admin/src/components/auth/AuthProvider.tsx
  - admin/src/components/editor/LivePreviewCard.tsx
  - admin/src/components/layout/AdminShell.tsx
  - admin/src/lib/admin-api.ts
  - admin/src/lib/i18n.ts
  - admin/src/pages/CatalogPage.tsx
  - admin/src/pages/ItemEditorPage.tsx
  - app/features/sync/api.ts
  - app/features/sync/db-ops.ts
  - backend/drizzle/0002_easy_stellaris.sql
  - backend/drizzle/meta/_journal.json
  - backend/src/__tests__/admin-auth-audience.test.ts
  - backend/src/__tests__/admin-content.test.ts
  - backend/src/__tests__/admin-moderation.test.ts
  - backend/src/__tests__/config.test.ts
  - backend/src/__tests__/content-api.test.ts
  - backend/src/admin-auth/admin-auth.service.ts
  - backend/src/admin-content/admin-content.resolver.ts
  - backend/src/admin-content/admin-content.service.ts
  - backend/src/admin-moderation/admin-moderation.service.ts
  - backend/src/config/env.ts
  - backend/src/content/content.resolver.ts
  - backend/src/content/content.service.ts
  - backend/src/content/snapshot-builder.ts
  - backend/src/db/schema.ts
  - backend/src/main.ts
  - backend/src/scripts/seed.ts
  - backend/src/suggestions/suggestions.service.ts
  - shared/src/__tests__/schemas.test.ts
  - shared/src/index.ts
  - shared/src/schemas.ts
findings:
  critical: 0
  warning: 5
  info: 5
  total: 10
status: issues_found
---

# Phase 3: Code Review Report (incremental re-review)

**Reviewed:** 2026-11-25
**Depth:** standard
**Files Reviewed:** 32
**Status:** issues_found

This report supersedes the earlier 03-REVIEW.md (commit 535bf37). It covers the fixes in b20cbfb..1987ab9 and the `textFemale` removal in d607ee9, 1c1abe5 and 5a17fcd. Necessity assessment (#4100) was not performed. Nothing in the diff stood out as a candidate.

## Summary

The textFemale removal is clean on the backend. Every reference was removed from the Drizzle schema, GraphQL DTOs, snapshot builder, delta query, seed, moderation and the admin UI. Migration 0002 is safe: the dropped column is not indexed, so `ALTER TABLE ... DROP COLUMN` works on the SQLite bundled with better-sqlite3. The journal timestamps are monotonic. Zod objects strip unknown keys, so old snapshot files or deltas that still carry `textFemale` parse fine on mobile and backend. The mobile upsert no longer writes the column, and the column is nullable, so inserts still succeed.

The prior-finding fixes are mostly correct. The WR-03 fix is the problem. It put the new content rule into the shared item schemas, which are also parsed on the read path. It is also incomplete. Two further gaps remain from the textFemale removal. The `{الاسم}` token is still offered and accepted for content that is no longer personalized. The GraphQL field was removed with no deprecation window.

### Status of prior findings

| ID | Status | Notes |
|----|--------|-------|
| CR-01 | Fixed | `adminAudience()` is used and tested for both branches. Residual: IN-04 below. |
| WR-01 | Fixed, with a residual | `assertProductionConfig` runs at boot. The dev secret is now random per process. The NODE_ENV default is still `development`, so a deploy that omits it skips the check. The secret can no longer be forged, but `Secure` is still dropped. See IN-04. |
| WR-02 | Partially fixed (known) | The SPA half is correct. The cookie is still valid for 14 days with no server-side revocation. This is accepted as a follow-up in 03-REVIEW-FIX.md. It stays open. |
| WR-03 | Partially fixed, introduced regressions | See WR-01 and WR-02 below. |
| WR-04 | Fixed | Before/after are recorded. Accepts are filed under `suggestion`. Audit rows written before the fix still have `entity_type = verse/name_of_god/blessing` for `accept_suggestion`, so the `suggestion` filter misses them. This is cosmetic, see IN-05. |
| WR-05 | Fixed, with a UX dead-end | See WR-04 below. `expectedVersion` is optional, so callers that omit it still get last-writer-wins. The SPA always sends it. |
| WR-06 | Fixed | The try/catch is correct. The log is emitted and the committed result is returned. |
| IN-01..IN-03 | Unchanged, still open | Not in the fix scope. |

## Warnings

### WR-01: Link/HTML rule was added to the shared item schemas, which are also parsed on the read path, so one bad stored row breaks sync for everyone

**File:** `shared/src/schemas.ts:16-20, 47-53, 76-97`; parse sites at `backend/src/content/content.service.ts:118`, `backend/src/content/snapshot-builder.ts:75,120,141,161,231`, `app/features/sync/api.ts:169,194`, `app/features/sync/staging.ts:132`
**Issue:** `hasNoLinksImagesOrHtml` is a `.refine` on `personalizedTextSchema.text` and `.textFemale`. `verseItemSchema`, `plainTextSchema` and so `nameOfGodItemSchema` and `blessingItemSchema` inherit it. Those item schemas validate outbound data, not just admin input:
- `getContentDelta` runs `contentDeltaResponseSchema.parse` over every row with `version > since`, including soft-deleted tombstones.
- `rebuildAllSnapshots` runs `*ItemSchema.parse` per active row, then `snapshotEnvelopeSchema.parse`.
- Mobile re-parses the same schemas on download.

Any row already stored that violates the new rule makes the whole delta query and snapshot rebuild throw. Candidates are an item accepted before b657134, a tombstone, or a future seed edit. `SnapshotService.refreshIfStale` runs on every read, so a persistent failure turns every public snapshot request into a 500. A single bad item blocks content for all users, and mobile would also reject the envelope. The dev DB currently has no offending rows (checked), so this is latent, but the production data was not checked.
**Fix:** Keep the new rule on input schemas only. Split read and write schemas:
```ts
const writeText = (s) => s.refine(hasNoLinksImagesOrHtml, MARKDOWN_SUBSET_ERROR);
// item/envelope schemas (read path): no link refine
// personalizedTextSchema / plainTextSchema used by admin mutations, accept and submit: with the refine
```
Add a one-off check or migration that scans existing public rows (including tombstones) for the pattern before deploy.

### WR-02: WR-03 mitigation is incomplete, so reference-style links and bare URLs still reach the public renderer

**File:** `shared/src/schemas.ts:16-20`
**Issue:** The regex `/\]\(|!\[|<[a-z/!?]/i` only blocks inline links, images and tags. The doc comment claims "public content can never load or link remote resources", which is not true. Markdown that passes:
- `[click here][1]\n\n[1]: https://evil.example` is a reference-style link.
- A bare `https://evil.example` is a GFM autolink in marked-style renderers.
- `[x]:<https://...>` definitions.

`react-native-marked` renders these as tappable links. The admin preview uses a restricted parser, so the moderator sees the definition lines as literal text and may not recognize the risk. Images are blocked, so the tracking-pixel case is closed. The phishing link case is not.
**Fix:** Allow-list instead of block-list. Enforce the 6-construct subset the editor can produce. For example, reject `^\s*\[[^\]]+\]:`, `\]\[`, and `https?://|www\.` in `text`. Alternatively, disable link/autolink handling in the mobile `react-native-marked` renderer, which is the stronger control. Add tests for the bypass strings.

### WR-03: The `{الاسم}` token is still offered and accepted for names of God and blessings, which are no longer personalized

**File:** `admin/src/components/editor/RichContentEditor.tsx:86`; `shared/src/schemas.ts:61` (`plainTextSchema = personalizedTextSchema.pick({ text: true })`); `admin/src/components/editor/LivePreviewCard.tsx:73-75`
**Issue:** After the removal, names and blessings are "title + single text". The preview now renders `text` verbatim for them, so a literal `{الاسم}` is shown. But:
- The editor toolbar still shows the "insert name chip" button for `mode='rich'`.
- `plainTextSchema` inherits the brace-token refine, which explicitly allows `{الاسم}`.
- Accepting a user suggestion of kind name_of_god or blessing containing the token succeeds.

The admin can therefore publish text with the raw token. Nothing in the mobile app personalizes these kinds, since only the dev `torture.tsx` screen references `personalize`. Readers would see a literal `{الاسم}`. The catalog badge at `CatalogPage.tsx:193` also still advertises the token for these kinds.
**Fix:** Hide the chip button when `kind !== 'verse'`. Make `plainTextSchema.text` reject `NAME_TOKEN` (and every brace). Alternatively, decide that names and blessings may use it, and have mobile personalize them. Add a test for the chosen behavior.

### WR-04: A content-conflict error leaves the admin in a state where retrying can never succeed

**File:** `admin/src/pages/CatalogPage.tsx:249-295`
**Issue:** On `CONTENT_VERSION_CONFLICT` the SPA refetches the catalog and throws a message that says "review the latest version and try again". `loaded.current` keeps the original version on purpose, and `useForm`'s `defaultValues` do not update from the refetch either. Every retry sends the stale `expectedVersion` and conflicts again. The only escape is to leave the page, which discards the draft, and the message gives no hint of that. The ref is also written during render (`loaded.current = ...`), which is an anti-pattern, though it is idempotent here. A related edge case: if a save commits but the response is lost, the retry conflicts against the admin's own write.
**Fix:** After a conflict, show the fresh server text next to the draft and offer an explicit "overwrite with my draft" action. That action sets `loaded.current.version = freshItem.version` and resubmits. At minimum, change the message to say the draft must be copied out before reloading.

### WR-05: Removing `textFemale` from the public GraphQL types is a breaking change with no deprecation window

**File:** `backend/src/content/content.resolver.ts:49-85`; `app/features/sync/api.ts:56-80`
**Issue:** `NameOfGodDto.textFemale` and `BlessingDto.textFemale` were removed outright, and the admin input types dropped the field. Any mobile build that still selects `textFemale` in `CONTENT_DELTA_QUERY` now gets `GRAPHQL_VALIDATION_FAILED` for the entire `contentDelta` query, including verses. Delta sync then fails completely until the app is updated. If no build with the old query has shipped, this is moot. If a TestFlight or internal build exists, it is a hard break. The backend and the mobile app must be released in that order, which is not documented.
**Fix:** Either keep `textFemale` as a deprecated nullable field always returning `null` for one release (`@Field({ nullable: true, deprecationReason: '...' })`), or record in the phase notes that no pre-change client exists.

## Info

### IN-01: Mobile local schema, fixture builder and tests still carry `text_female` for names and blessings

**File:** `app/features/db/schema.ts:80`; `app/scripts/build-fixture.mjs:229,245`; `app/features/sync/__tests__/*.test.ts`
**Issue:** The shared column helper on mobile still defines `text_female` for all three tables. `db-ops.ts` no longer writes it. Existing local rows keep their old value forever, because the conflict `set` omits it, and the column is dead. This is harmless because the column is nullable. It is schema drift between shared zod, backend Drizzle and mobile.
**Fix:** Add a mobile migration dropping `text_female` from `names_of_god` and `blessings`. Update the fixture builder and test fixtures. Alternatively, leave a comment that the column is intentionally retained.

### IN-02: Migration 0002 destroys data silently, and snapshot files on disk still carry `textFemale` until the next mutation

**File:** `backend/drizzle/0002_easy_stellaris.sql`; `backend/src/content/snapshot.service.ts:36-60`
**Issue:** Any existing female variants for names and blessings are dropped with no backup and no `content_version` bump. `loadOrRebuild` reuses an on-disk snapshot when its `contentVersion` equals the DB. Snapshots written before the migration are therefore served verbatim, including the dead `textFemale` field, until the next admin mutation. Clients strip it, so there is no functional impact.
**Fix:** Optional. Delete the snapshot dir in the migration step, or bump the version once, so the first start rebuilds. Document the data loss in the CHANGELOG, per AGENTS.md.

### IN-03: Suggestion submit and accept schemas still accept `textFemale` for non-verse kinds and silently discard it

**File:** `shared/src/schemas.ts:124-128` (`submitSuggestionInputSchema`); `backend/src/admin-moderation/admin-moderation.resolver.ts:~58`; `backend/src/suggestions/suggestions.service.ts:75`; `admin/src/lib/admin-api.ts:16,27`
**Issue:** The null-out is applied in the services, not in the contract. The admin item types declare `textFemale: string | null` for all kinds, but names and blessings now return `undefined`. A client sending `textFemale` for a name suggestion gets no validation error. `CatalogPage.tsx:102,193,196` and `:278` still read the field for those kinds.
**Fix:** Make the schemas kind-aware, for example with a `superRefine` that rejects a non-null `textFemale` unless `kind === 'verse'`. Make `textFemale` optional in the admin item type for non-verse kinds.

### IN-04: `ADMIN_GOOGLE_CLIENT_ID` is still optional in production, so the admin audience falls back to the mobile client IDs

**File:** `backend/src/admin-auth/admin-auth.service.ts:68-72`; `backend/src/config/env.ts:74-79`
**Issue:** The CR-01 fix is correct, but when the override is unset, admin login accepts ID tokens minted for the mobile client IDs. `assertProductionConfig` checks only the JWT secret. The `NODE_ENV` default of `development` also lets a deploy that omits it bypass the boot check entirely.
**Fix:** In `assertProductionConfig`, require `ADMIN_GOOGLE_CLIENT_ID`. Consider requiring `NODE_ENV` explicitly in the Dockerfile or schema.

### IN-05: Historical audit rows use the old `entity_type` for accepted suggestions

**File:** `backend/src/admin-moderation/admin-moderation.service.ts:176-177`; `admin/src/pages/AuditLogPage.tsx`
**Issue:** `accept_suggestion` rows written before 55ddf08 have `entity_type` set to the content kind, with the content id as the entity. The `entityType=suggestion` filter returns only post-fix accepts.
**Fix:** One-off `UPDATE audit_log SET entity_type='suggestion'` is not possible without the suggestion id in the old rows. Pull it from `summary_json.suggestionId`, or accept the inconsistency and note it.

---

_Reviewed: 2026-11-25_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
