---
phase: 03-admin-panel-moderation
plan: 02
subsystem: auth
tags: [nestjs, jwt, google-auth, httpOnly-cookie, csrf, drizzle, sqlite]

requires:
  - phase: 02-content-backend-first-download
    provides: NestJS + Apollo GraphQL backend, Drizzle SQLite WAL schema, GoogleAuthGuard OAuth2Client pattern
  - phase: 03-admin-panel-moderation
    plan: 01
    provides: Owner-approved pinned dependencies (@nestjs/jwt@12.0.5, cookie-parser@1.4.7, @types/cookie-parser@1.4.10)
provides:
  - Drizzle migration 0001 adding suggestions.moderation_note and suggestions_status_created_idx
  - Validated envSchema fields ADMIN_EMAILS, ADMIN_JWT_SECRET, ADMIN_GOOGLE_CLIENT_ID
  - AdminAuthModule with 14-day HttpOnly SameSite=Lax cookie sessions, ADMIN_EMAILS allowlist, and x-roi-admin CSRF guard
  - Shared GOOGLE_OAUTH_CLIENT provider exported from AdminAuthModule for both AdminAuthService and GoogleAuthGuard
  - Reusable admin-test-helpers.ts for Phase 3 backend integration tests
affects: [03-03, 03-04, 03-05, 03-06, 03-07, 03-08, 03-09]

actuals:
  tokens: 18265
  tasks: 2
  commits: 2

commits: 2
plan_head_before: ac57f274e7adee8e900958e71ff29a86604a946e
plan_head_after: c8a998218e79c0b25d61eaab341244f8dd738864

tech-stack:
  added:
    - "@nestjs/jwt@12.0.5"
    - "cookie-parser@1.4.7"
    - "@types/cookie-parser@1.4.10"
  patterns:
    - "14-day HS256 HttpOnly SameSite=Lax session cookie (roi_admin_session) with x-roi-admin: 1 CSRF header"
    - "Structural CookieResponse/AdminCookieOptions interfaces avoiding direct express dependency under Bun isolated linker"
    - "Single exported GOOGLE_OAUTH_CLIENT provider in AdminAuthModule shared across AppModule and AdminAuthModule"

key-files:
  created:
    - backend/drizzle/0001_admin_suggestions_note.sql
    - backend/drizzle/meta/0001_snapshot.json
    - backend/src/admin-auth/admin-auth.service.ts
    - backend/src/admin-auth/admin-auth.guard.ts
    - backend/src/admin-auth/admin-auth.resolver.ts
    - backend/src/admin-auth/admin-auth.module.ts
    - backend/src/__tests__/admin-test-helpers.ts
    - backend/src/__tests__/admin-auth.test.ts
  modified:
    - backend/package.json
    - bun.lock
    - backend/src/db/schema.ts
    - backend/drizzle/meta/_journal.json
    - backend/src/config/env.ts
    - backend/src/main.ts
    - backend/src/app.module.ts
    - backend/src/__tests__/config.test.ts
    - backend/src/__tests__/db.test.ts

key-decisions:
  - "Defined structural AdminCookieOptions and CookieResponse interfaces instead of importing express types directly, matching SnapshotController under Bun's isolated linker."
  - "Left ADMIN_EMAILS defaulting to [] and ADMIN_JWT_SECRET optional in envSchema while failing closed (ServiceUnavailableException ADMIN_AUTH_MISCONFIGURED) in AdminAuthService when NODE_ENV === 'production' and ADMIN_JWT_SECRET is missing or < 32 chars."

patterns-established:
  - "Admin resolvers guard every privileged operation with @UseGuards(AdminAuthGuard), which enforces x-roi-admin: 1, verifies roi_admin_session HS256 JWT + typ: 'roi_admin', and re-checks ADMIN_EMAILS on every request."
  - "Test suites override GOOGLE_OAUTH_CLIENT on AppModule via createAdminTestApp() in backend/src/__tests__/admin-test-helpers.ts."

requirements-completed: [ADM-01]

coverage:
  - id: D1
    description: "Drizzle migration 0001 adds nullable suggestions.moderation_note and suggestions_status_created_idx with zero pending schema drift"
    verification:
      - kind: integration
        ref: "backend/src/__tests__/db.test.ts#opens WAL SQLite database, runs migrations, and seeds singleton content_meta row"
        status: pass
      - kind: other
        ref: "cd backend && bun run db:generate 2>&1 | grep -q 'No schema changes'"
        status: pass
    human_judgment: false
  - id: D2
    description: "envSchema parses ADMIN_EMAILS (lowercase trimmed array defaulting to []), optional ADMIN_JWT_SECRET, and optional ADMIN_GOOGLE_CLIENT_ID without breaking Phase 2 boot tests"
    verification:
      - kind: unit
        ref: "backend/src/__tests__/config.test.ts#loadEnv() parses comma-separated ADMIN_ORIGINS, ADMIN_EMAILS, GOOGLE_CLIENT_IDS, PORT, DATA_DIR, and admin auth fields"
        status: pass
      - kind: integration
        ref: "backend/src/__tests__/hardening.test.ts#enforces Helmet CSP, strict ADMIN_ORIGINS CORS, 100kb cap, production GraphQL lock, ApolloArmor, and trust proxy=1 IP isolation"
        status: pass
    human_judgment: false
  - id: D3
    description: "adminLogin verifies Google ID tokens against ADMIN_EMAILS (multi-admin, case-insensitive) and mints a 14-day HttpOnly SameSite=Lax cookie; non-allowlisted and unverified tokens are rejected"
    requirement: ADM-01
    verification:
      - kind: integration
        ref: "backend/src/__tests__/admin-auth.test.ts#authenticates multiple allowlisted admins (case-insensitive), mints 14d HttpOnly SameSite=Lax cookie, enforces CSRF header, and clears cookie on logout"
        status: pass
      - kind: integration
        ref: "backend/src/__tests__/admin-auth.test.ts#rejects non-allowlisted emails (403 FORBIDDEN), unverified/invalid tokens (401 UNAUTHENTICATED), and forged/revoked cookies"
        status: pass
    human_judgment: false
  - id: D4
    description: "AdminAuthGuard enforces x-roi-admin: 1 CSRF header, validates session cookie, re-checks ADMIN_EMAILS on every request, and fails closed in production when ADMIN_JWT_SECRET is missing or < 32 chars"
    requirement: ADM-01
    verification:
      - kind: integration
        ref: "backend/src/__tests__/admin-auth.test.ts#fails closed in production when ADMIN_JWT_SECRET is missing or < 32 chars, and sets Secure flag when valid"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-11-25
status: complete
---

# Phase 03 Plan 02: Drizzle Migration 0001 & Admin Cookie Auth Summary

**Drizzle migration `0001` (`moderation_note` + `suggestions_status_created_idx`) and `AdminAuthModule` delivering Google-allowlisted 14-day `HttpOnly` `SameSite=Lax` cookie sessions with `x-roi-admin: 1` CSRF protection and production fail-closed secret enforcement**

## Performance

- **Duration:** 4 min (264s)
- **Started:** 2026-11-25T16:06:03Z
- **Completed:** 2026-11-25T16:10:27Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments
- Installed owner-approved backend dependencies (`@nestjs/jwt@12.0.5`, `cookie-parser@1.4.7`, `@types/cookie-parser@1.4.10`) and generated Drizzle migration `0001_admin_suggestions_note.sql` adding `suggestions.moderation_note` and `suggestions_status_created_idx`.
- Extended `envSchema` in `backend/src/config/env.ts` to parse `ADMIN_EMAILS`, `ADMIN_JWT_SECRET`, and `ADMIN_GOOGLE_CLIENT_ID` while keeping `ADMIN_EMAILS: []` and `ADMIN_JWT_SECRET` optional so Phase 2 tests boot unchanged.
- Built `AdminAuthModule` (`AdminAuthService`, `AdminAuthGuard`, `AdminAuthResolver`), moved the single `GOOGLE_OAUTH_CLIENT` provider into `AdminAuthModule` (exported to `AppModule`), wired `cookieParser()` and CORS `credentials: true` + `X-Roi-Admin` header in `backend/src/main.ts`, and verified all 10 backend test suites (35 tests), `tsc` typecheck, and `backend` CJS build.

## Task Commits

Each task was committed atomically:

1. **Task 1: Install backend auth dependencies, generate Drizzle migration 0001, and extend envSchema** - `91b83e6` (feat)
2. **Task 2: Build AdminAuthModule (14-day httpOnly cookie, allowlist, CSRF guard) and wire cookieParser + CORS** - `c8a9982` (feat)

## Files Created/Modified
- `backend/package.json` & `bun.lock` - Pinned `@nestjs/jwt@12.0.5`, `cookie-parser@1.4.7`, and `@types/cookie-parser@1.4.10`.
- `backend/src/db/schema.ts` - Added `moderationNote` column and `suggestions_status_created_idx` on `suggestions`.
- `backend/drizzle/0001_admin_suggestions_note.sql`, `backend/drizzle/meta/_journal.json`, `backend/drizzle/meta/0001_snapshot.json` - Generated SQLite migration `0001` with zero schema drift.
- `backend/src/config/env.ts` - Added `ADMIN_EMAILS`, `ADMIN_JWT_SECRET`, and `ADMIN_GOOGLE_CLIENT_ID` parsing.
- `backend/src/admin-auth/admin-auth.service.ts` - Google ID token verification, `ADMIN_EMAILS` allowlist, 14-day HS256 JWT mint/verify, cookie option helpers, and production secret fail-closed check.
- `backend/src/admin-auth/admin-auth.guard.ts` - GraphQL/HTTP guard checking `x-roi-admin: 1` header and `roi_admin_session` cookie.
- `backend/src/admin-auth/admin-auth.resolver.ts` - `adminPublicConfig`, `adminMe`, `adminLogin`, and `adminLogout` GraphQL operations.
- `backend/src/admin-auth/admin-auth.module.ts` - Module registering `JwtModule.register({})` and exporting `GOOGLE_OAUTH_CLIENT`, `AdminAuthService`, `AdminAuthGuard`, `AdminAuthResolver`.
- `backend/src/main.ts` - Mounted `cookieParser()` and updated CORS with `credentials: true` and `allowedHeaders` including `X-Roi-Admin`.
- `backend/src/app.module.ts` - Imported `AdminAuthModule` and removed duplicate `GOOGLE_OAUTH_CLIENT` provider.
- `backend/src/__tests__/admin-test-helpers.ts` - Added `createAdminTestApp()`, `createStubAdminGoogleVerifier()`, `extractCookieHeader()`, and `extractSessionCookie()`.
- `backend/src/__tests__/admin-auth.test.ts` - Integration tests covering `adminPublicConfig`, multi-admin login, cookie flags, CSRF header, non-allowlisted `403`, unverified/invalid `401`, revocation on restart, logout, and production weak/missing secret fail-closed check.
- `backend/src/__tests__/config.test.ts` & `backend/src/__tests__/db.test.ts` - Added unit/integration coverage for new env fields, `moderationNote`, and `suggestions_status_created_idx`.

## Decisions Made
- Used structural `AdminCookieOptions` and `CookieResponse` interfaces in `admin-auth.service.ts` and `admin-auth.resolver.ts` rather than importing `express` types directly, because Bun's isolated linker keeps `express` transitive under `@nestjs/platform-express` (matching `SnapshotController`).
- Kept `ADMIN_JWT_SECRET` optional in `envSchema` and enforced the 32-character minimum in `AdminAuthService.getSigningSecret()` when `NODE_ENV === 'production'`, preserving Phase 2 `hardening.test.ts` compatibility.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Replaced direct `express` type imports with structural cookie interfaces**
- **Found during:** Task 2 (`bun run typecheck`)
- **Issue:** `tsc` reported `TS2307: Cannot find module 'express'` in `admin-auth.service.ts` and `admin-auth.resolver.ts` because `express` and `@types/express` are transitive dependencies under Bun's isolated linker.
- **Fix:** Defined local structural `AdminCookieOptions` and `CookieResponse` interfaces (matching `SnapshotController` pattern) instead of importing `express` types.
- **Files modified:** `backend/src/admin-auth/admin-auth.service.ts`, `backend/src/admin-auth/admin-auth.resolver.ts`
- **Verification:** `bun run typecheck` and `bun run --cwd backend build` both exited 0.
- **Committed in:** `c8a9982` (part of Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for strict TypeScript compilation under Bun isolated linker without adding unapproved packages. No scope creep.

## Issues Encountered
None.

## User Setup Required

Production Dokploy environment variables noted in `03-02-PLAN.md`:
- `ADMIN_EMAILS`: Comma-separated list of authorized owner Google email addresses.
- `ADMIN_JWT_SECRET`: Random 32+ character secret (`openssl rand -hex 32`) for signing 14-day `httpOnly` admin cookies.

## Next Phase Readiness
- Plan `03-03` (Admin Content CRUD, Suggestion Moderation, Audit Log & `/admin` static serving) can now import `AdminAuthModule` / `AdminAuthGuard` and query `suggestions.moderationNote` using `suggestions_status_created_idx`.
- Plan `03-04` (Admin SPA scaffold & auth flow) can call `adminPublicConfig`, `adminLogin`, `adminMe`, and `adminLogout` with `credentials: 'include'` and `x-roi-admin: 1`.

---
*Phase: 03-admin-panel-moderation*
*Completed: 2026-11-25*

## Self-Check: PASSED

- Verified all created artifacts and modified files exist on disk.
- Verified task commits `91b83e6` and `c8a9982` are ancestors of `HEAD`.
