# Phase 3: Admin Panel & Moderation - Context

**Gathered:** 2026-11-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the Google-allowlisted web admin panel (`admin/`) and its supporting admin GraphQL APIs and static serving in `backend/` so multiple content owners can securely sign in, author/edit/soft-delete/restore public library items (verses, names of God, blessings) with the atomic `{الاسم}` chip editor and live personalization preview, inspect the audit log, and moderate user-submitted suggestions (`ADM-01`..`ADM-07`, `BE-05`). New mobile app tools or end-user features belong in Phases 4–9.

</domain>

<decisions>
## Implementation Decisions

### Admin Auth, Allowlist & Session Lifecycle (`ADM-01`)
- **D-01:** **Env-only admin allowlist (`ADMIN_EMAILS`):** Configure authorized admin Google emails via a comma-separated `ADMIN_EMAILS` environment variable (case-insensitive trimmed compare; multiple admins supported concurrently). Backend verifies Google ID tokens via `google-auth-library` (`email_verified === true` and `email` in `ADMIN_EMAILS`) and rejects any non-allowlisted Google account. Adding or removing admins is an env update + restart in Dokploy.
- **D-02:** **14-day `httpOnly` cookie session (owner refinement of `ADM-01`):** — **Reversibility:** costly — changes backend admin session transport, cookie/CSRF settings, and admin SPA request credentials. On valid allowlisted Google Sign-In, the backend mints a signed `HttpOnly`, `SameSite=Lax`, `Secure` (in production) session cookie valid for **14 days**, requiring Google re-login after 14 days. Protect admin mutations against CSRF (e.g., Apollo CSRF prevention / required custom request header).
- **D-03:** **Mid-edit expiry protection:** If the admin session expires or returns `401` while editing content, attempt silent Google GIS re-authentication first and fall back to an in-page Google Sign-In modal without leaving the form or clearing state so unsaved edits are preserved.

### Rich-Text Chip Editor, Validation & Live Preview (`ADM-02`..`ADM-06`)
- **D-04:** **Content-type editor & Markdown scope:**
  - **Verses (`verses`):** Plain text editor (no Markdown formatting marks) with the atomic, draggable `{الاسم}` name chip.
  - **Names of God (`names_of_god`) & Blessings (`blessings`):** Tiptap rich-text editor outputting the Markdown subset consumed by mobile (`react-native-marked`): **Bold, Italic, H2/H3 headings, Bullet list, Blockquote**, plus the atomic, draggable `{الاسم}` name chip (admin never sees raw `{الاسم}`; pasting `{الاسم}` converts into a chip).
- **D-05:** **Male/female toggle & non-destructive hiding (`ADM-03`):** When "same text for male/female" is ON, show a single `text` field; when OFF, show male (`text`) and female (`textFemale`) editors side by side and require both. Flipping the toggle back ON hides the female field non-destructively in client state during editing and persists `textFemale: null` only on Save.
- **D-06:** **Shared validation & one-sided name warning (`ADM-06`):** Validate all payloads with `personalizedTextSchema` from `@roi/shared` on both client and server (rejecting any `{…}` brace token other than `{الاسم}`). When both male and female texts exist and only one contains `{الاسم}`, show a **non-blocking amber warning banner** while allowing the admin to save intentionally.
- **D-07:** **Live preview (`ADM-05`):** Show a live mobile-accurate preview beside the editor with a test name input (including empty-name neutral fallback) and male/female gender toggle, powered directly by `personalize()` from `@roi/shared`.
- **D-08:** **Minimal v1 editor fields:** Keep content forms minimal — expose `ref` (verses), `title` (names/blessings), `verseRef` (optional for blessings), `text`, and `textFemale`; hide `tags` and `sortOrder` from the v1 admin editor UI and leave them `null`.

### Suggestion Moderation Queue & Promotion Flow (`ADM-07`)
- **D-09:** **Edit-in-full-editor & atomic promotion:** Opening a suggestion loads its fields (`kind`, `title`/`ref`, `text`, `textFemale`, `verseRef`) into the full chip/Markdown/preview editor. Clicking **"Accept & Publish"** executes a single backend SQLite transaction that inserts the new public item into `verses` / `names_of_god` / `blessings`, updates the suggestion to `accepted`, increments `contentMeta.contentVersion`, writes an `audit_log` row, and calls `SnapshotService.refreshCache()`.
- **D-10:** **Queue tabs & rejection flow:** Provide `Pending`, `Accepted`, and `Rejected` tabs in the moderation queue. Rejecting a suggestion is a one-click action with an optional internal note (stored in `audit_log` / suggestion metadata), immediately removing the item from `Pending`.
- **D-11:** **Submitter context & concurrent moderation guard:** Show the submitter's `email`, submission timestamp, and historical counts (accepted / rejected / pending) while reviewing a suggestion. Guard Accept and Reject transitions on `status === 'pending'` inside the SQLite transaction so two admins working concurrently cannot accept or reject the same suggestion twice.

### Admin UI Language, Catalog Management & Deployment (`ADM-02`, `BE-05`)
- **D-12:** **Bilingual UI toggle with locked RTL content fields:** Provide an Arabic / English UI language switcher for admin navigation, labels, and buttons with clean typography for both languages (`dir="rtl"` in Arabic mode, `dir="ltr"` in English mode using Tailwind logical utilities `ms-*`, `ps-*`, `text-start`). Keep all **content editor fields and live previews strictly `dir="rtl"`** regardless of the UI shell language so Arabic text and tashkeel never break.
- **D-13:** **Catalog search, soft-delete restore & audit log UI (`ADM-02`, `BE-05`):** Each content catalog list supports diacritic-insensitive search (`normalizeArabic()` / `matches()` from `@roi/shared`) and an **Active / Deleted** filter with a **Restore** action on soft-deleted items (clears `deletedAt`, bumps `contentVersion`, refreshes snapshots, writes `audit_log`). Include a read-only **Audit Log** page displaying `actorEmail`, `action`, `entityType`, `entityId`, `contentVersion`, summary, and timestamp.
- **D-14:** **Single-container deployment from NestJS (`admin/` served at `/admin`):** — **Reversibility:** costly — affects `Dockerfile`, NestJS static serving / SPA fallback, and origin/OAuth configuration. Build `admin/` as static assets served directly from the `backend/` NestJS container under `/admin` (same origin as the API, eliminating cross-site cookie issues on Dokploy). Preserve `ADMIN_ORIGINS` CORS support for local Vite development (`http://localhost:5173`).

### Claude's Discretion
- Admin session JWT signing secret env var naming (`ADMIN_JWT_SECRET`) and token payload claims, exact shadcn/ui component set and layout structure, `@tiptap/markdown` vs a hand-written ProseMirror-JSON ⇄ Markdown-subset serializer (if early-release `@tiptap/markdown` has RTL or chip round-trip issues), exact `audit_log` summary formatting, and whether optional rejection notes are stored only in `audit_log.summaryJson` or also as a nullable column on `suggestions`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — vision, admin panel scope, backend/admin stack constraints
- `.planning/REQUIREMENTS.md` — `ADM-01`..`ADM-07`, `BE-05`
- `.planning/ROADMAP.md` — Phase 3 goal and success criteria
- `.planning/STATE.md` — active decisions and project state
- `.claude/CLAUDE.md` — pinned versions (Vite 8, React 19, Tailwind 4, `@react-oauth/google`, Tiptap 3, `google-auth-library`, `@nestjs/jwt`) and Tiptap chip/drag pitfalls (§5)

### Prior Phase Decisions
- `.planning/phases/01-foundation-native-spike/01-CONTEXT.md` — `bun` isolated linker (`D-01`), pure-TS `@roi/shared` (`D-02`), Vitest (`D-03`), UUIDv7 & epoch-ms UTC conventions (`D-11`, `D-12`)
- `.planning/phases/02-content-backend-first-download/02-CONTEXT.md` — `BE-01`..`BE-06` backend snapshot/version/audit design and `D-10` Google-authenticated `suggestions` storing `googleSub` + `email`

### Shared & Backend Code Contracts
- `shared/src/schemas.ts` — `personalizedTextSchema`, `verseItemSchema`, `nameOfGodItemSchema`, `blessingItemSchema`, `contentKindSchema`
- `shared/src/arabic.ts` — `NAME_TOKEN`, `personalize()`, `normalizeArabic()`, `matches()`, `toArabicDigits()`, `formatArabicDate()`
- `backend/src/db/schema.ts` — `contentMeta`, `verses`, `namesOfGod`, `blessings`, `suggestions`, `auditLog`
- `backend/src/content/snapshot.service.ts` — `SnapshotService.refreshCache()` called on admin content mutations
- `backend/src/common/google-auth.guard.ts` — existing `OAuth2Client` Google ID token verification pattern
- `backend/src/config/env.ts` — `envSchema` (`ADMIN_ORIGINS`, `GOOGLE_CLIENT_IDS`)
- `backend/src/main.ts` — Helmet, CORS, trust proxy, body limit configuration
- `admin/package.json` — workspace shell consuming `@roi/shared`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`@roi/shared` (`shared/src/`):** Exports `personalizedTextSchema`, `personalize()`, `NAME_TOKEN` (`'{الاسم}'`), `normalizeArabic()`, `matches()`, `uuidv7()`. Both `backend/` and `admin/` already depend on `"@roi/shared": "workspace:*"`.
- **`backend/src/content/snapshot.service.ts`:** `SnapshotService.refreshCache()` already rebuilds all three `.json.gz` snapshots from SQLite and updates the in-memory cache synchronously.
- **`backend/src/common/google-auth.guard.ts`:** Already sets up `OAuth2Client` (`google-auth-library`) and validates `email_verified === true`, `sub`, and `email` against `env.GOOGLE_CLIENT_IDS`.
- **`backend/src/db/schema.ts`:** Already defines `contentMeta`, `verses`, `namesOfGod`, `blessings`, `suggestions` (including `googleSub` and `email`), and `auditLog` (`actorEmail`, `action`, `entityType`, `entityId`, `contentVersion`, `summaryJson`, `createdAt`).

### Established Patterns
- **Bun isolated linker (`bunfig.toml`):** `admin/` keeps Tailwind 4 (`@tailwindcss/vite`) isolated from `app/`'s Tailwind 3; every direct dependency of `admin/` or `backend/` must be declared in its own `package.json`.
- **Transactional SQLite writes (`SuggestionsService`, `seed.ts`):** All mutations that touch public content must run inside a synchronous `better-sqlite3` transaction bumping `contentMeta.contentVersion`, inserting an `audit_log` row, and then calling `SnapshotService.refreshCache()`.
- **Zod validation (`ZodValidationPipe`):** Backend GraphQL arguments validate directly against Zod schemas rather than `class-validator`.

### Integration Points
- **`backend/src/app.module.ts` & `backend/src/main.ts`:** Needs admin auth/session module (Google token exchange → 14-day `httpOnly` cookie + `ADMIN_EMAILS` allowlist guard), admin content & moderation GraphQL resolvers, audit log query, and static serving of built `admin/` SPA at `/admin`.
- **`backend/Dockerfile`:** Needs multi-stage build step compiling `admin/` (`vite build`) into the backend runtime image for single-container Dokploy deployment (`D-14`).
- **`admin/`:** Currently contains only `package.json` and `src/__tests__/shared.test.ts`; needs full Vite + React 19 + Tailwind 4 + shadcn/ui + Tiptap 3 + `@react-oauth/google` + `@tanstack/react-query` + `graphql-request` app.

</code_context>

<specifics>
## Specific Ideas

- Bilingual UI toggle (Arabic / English) with clean font pairing for both languages, while keeping Arabic content inputs and live previews locked to `dir="rtl"` so English UI mode never breaks Arabic layout.
- 14-day persisted `httpOnly` cookie session so admins aren't logged out on refreshes or short breaks, paired with silent GIS re-auth + in-page modal fallback if expired mid-edit.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (`tags` and `sortOrder` editor UI fields were intentionally omitted from v1 forms per `D-08` and remain `null` in the schema until needed.)

</deferred>

---

*Phase: 3-Admin Panel & Moderation*
*Context gathered: 2026-11-25*
