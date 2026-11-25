---
phase: 02-content-backend-first-download
plan: 05
subsystem: api
tags: [nestjs, express, helmet, cors, google-auth-library, zod, graphql, throttler, sqlite, supertest]

# Dependency graph
requires:
  - phase: 02-content-backend-first-download
    plan: 03
    provides: "AppModule, DrizzleModule (BACKEND_ENV/SQLITE_DB/DRIZZLE_DB), GqlThrottlerGuard, and Apollo HTTP 429 error mapping"
provides:
  - "Hardened Express/NestJS bootstrap (configureApp, isMainEntrypoint, bootstrap) with CJS/ESM entrypoint guard"
  - "Google ID token authentication guard (GoogleAuthGuard, GOOGLE_OAUTH_CLIENT, GoogleUser) verifying roi-app-515721 audiences"
  - "Reusable ZodValidationPipe surfacing @roi/shared Arabic validation errors on BadRequestException"
  - "Durable 10/UTC-day per-Google-account SQLite quota and pending suggestion persistence (SuggestionsService)"
  - "GraphQL Mutation submitSuggestion wired with GoogleAuthGuard, ZodValidationPipe, and 10/min per-IP @Throttle burst cap"
affects:
  - 02-07
  - 03-admin-panel

# Actuals (#2632)
actuals:
  tokens: 10908
  tasks: 3
  commits: 3

plan_head_before: e15bd402bc5c69bb9b62bf7a6f436b085ff19157
plan_head_after: 205624b620485b3c8e96c881b8d47721892701bb
commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CJS-and-ESM-safe isMainEntrypoint() guard checking process.env.VITEST, require.main === module, and import.meta.url fallback"
    - "Two-tier rate limiting on submitSuggestion: 10/min per-IP @Throttle burst cap + durable SQLite 10/UTC-day per-googleSub transaction"
    - "CORS origin callback allowing empty Origin (native mobile clients) while strictly matching browser Origins against ADMIN_ORIGINS"

key-files:
  created:
    - backend/src/main.ts
    - backend/src/common/zod-validation.pipe.ts
    - backend/src/common/google-auth.guard.ts
    - backend/src/suggestions/suggestions.service.ts
    - backend/src/suggestions/suggestions.resolver.ts
    - backend/src/__tests__/hardening.test.ts
    - backend/src/__tests__/suggestions-unit.test.ts
    - backend/src/__tests__/suggestions.test.ts
  modified:
    - backend/src/app.module.ts

key-decisions:
  - "Wrap SuggestionsService COUNT(*) check and pending row INSERT inside a synchronous better-sqlite3 transaction to prevent concurrent quota races"
  - "Isolate 10/min per-IP @Throttle burst cap tests from 10/day googleSub SQLite quota tests using distinct X-Forwarded-For client IPs and separate TestingModule instances"
  - "Reuse existing AppModule formatError + Apollo 429 HTTP status plugin so DAILY_SUGGESTION_LIMIT_REACHED (HttpStatus.TOO_MANY_REQUESTS) emits HTTP 429 and TOO_MANY_REQUESTS uniformly"

patterns-established:
  - "Google ID token auth boundary: GoogleAuthGuard verifies signature, audience (GOOGLE_CLIENT_IDS), and email_verified === true before attaching req.googleUser"
  - "Zod pipe boundary: ZodValidationPipe passes error.issues[0].message into BadRequestException.message so GraphQL clients receive Arabic validation errors"

requirements-completed: [BE-03, BE-04]

coverage:
  - id: D1
    description: "Configure Express/NestJS bootstrap with trust proxy=1, Helmet CSP in production, strict ADMIN_ORIGINS CORS, 100kb JSON body limit, shutdown hooks, and CJS/ESM entrypoint guard"
    requirement: "BE-04"
    verification:
      - kind: integration
        ref: "backend/src/__tests__/hardening.test.ts"
        status: pass
    human_judgment: false
  - id: D2
    description: "Reject missing, malformed, unverified-email, or wrong-audience Google ID tokens via GoogleAuthGuard before hitting service logic"
    requirement: "BE-03"
    verification:
      - kind: unit
        ref: "backend/src/__tests__/suggestions-unit.test.ts#GoogleAuthGuard verifies Bearer token against GOOGLE_CLIENT_IDS and requires email_verified=true"
        status: pass
      - kind: integration
        ref: "backend/src/__tests__/suggestions.test.ts#rejects missing/invalid/unverified Google tokens, validates @roi/shared brace rules, and persists pending verse/name_of_god/blessing rows"
        status: pass
    human_judgment: false
  - id: D3
    description: "Persist pending verse, name_of_god, and blessing suggestions validated by @roi/shared submitSuggestionInputSchema with googleSub, email, durable 10/day SQLite quota, and 10/min per-IP burst cap"
    requirement: "BE-03"
    verification:
      - kind: unit
        ref: "backend/src/__tests__/suggestions-unit.test.ts#SuggestionsService enforces 10/UTC-day quota per googleSub and persists pending rows"
        status: pass
      - kind: integration
        ref: "backend/src/__tests__/suggestions.test.ts"
        status: pass
    human_judgment: false

# Metrics
duration: 5min
completed: 2026-11-25
status: complete
---

# Phase 02 Plan 05: HTTP Hardening & Google-Authenticated Suggestions Summary

**Hardened Express/NestJS bootstrap (`configureApp` with CJS/ESM entrypoint guard, `trust proxy=1`, Helmet CSP, `ADMIN_ORIGINS` CORS, `100kb` JSON limit) and Google-authenticated `submitSuggestion` GraphQL mutation with `@roi/shared` Zod Arabic validation, 10/UTC-day SQLite quota, and 10/min per-IP burst throttling**

## Performance

- **Duration:** 5 min
- **Started:** 2026-11-25T13:22:58Z
- **Completed:** 2026-11-25T13:27:39Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Created `backend/src/main.ts` exporting `configureApp`, `isMainEntrypoint`, and `bootstrap` with a CJS-and-ESM-safe entrypoint guard (`process.env.VITEST !== 'true'`, `require.main === module`, and `import.meta.url` ESM fallback), plus `backend/src/__tests__/hardening.test.ts` verifying Helmet CSP, `ADMIN_ORIGINS` CORS, `100kb` payload limit (`413`), production GraphQL lock, `ApolloArmor` depth/alias limits, and `trust proxy = 1` IP isolation.
- Built `ZodValidationPipe` (`backend/src/common/zod-validation.pipe.ts`), `GoogleAuthGuard` (`backend/src/common/google-auth.guard.ts` verifying `GOOGLE_CLIENT_IDS` and `email_verified === true`), and `SuggestionsService` (`backend/src/suggestions/suggestions.service.ts` enforcing a transactional `DAILY_SUGGESTION_LIMIT = 10` per UTC day per `googleSub` in SQLite).
- Wired `SuggestionsResolver` (`submitSuggestion` with `SubmitSuggestionInput`, `SuggestionReceiptDto`, `@UseGuards(GoogleAuthGuard)`, `@Throttle({ default: { ttl: 60_000, limit: 10 } })`, and `ZodValidationPipe(submitSuggestionInputSchema)`) into `AppModule`, verified with Supertest across auth/validation, restart-persistent 10/day quota, and per-IP burst isolation in `suggestions.test.ts`.

## Task Commits

Each task was committed atomically:

1. **Task 1: Add hardened Express bootstrap (main.ts) with CJS/ESM guard and security hardening suite (BE-04, D-06, D-09)** - `55ad693` (feat)
2. **Task 2: Build GoogleAuthGuard, ZodValidationPipe, and SuggestionsService with 10/day SQLite quota** - `b85b0e1` (feat)
3. **Task 3: Wire SuggestionsResolver into AppModule and verify auth, validation, 10/day quota, and IP burst isolation with Supertest** - `205624b` (feat)

## Files Created/Modified
- `backend/src/main.ts` - Hardened Express/NestJS bootstrap (`configureApp`, `isMainEntrypoint`, `bootstrap`)
- `backend/src/common/zod-validation.pipe.ts` - NestJS `PipeTransform` surfacing Zod Arabic validation messages
- `backend/src/common/google-auth.guard.ts` - Google ID token Bearer verifier guard (`GOOGLE_OAUTH_CLIENT`, `GoogleUser`)
- `backend/src/suggestions/suggestions.service.ts` - Transactional `DAILY_SUGGESTION_LIMIT = 10` UTC-day SQLite quota and pending row insert
- `backend/src/suggestions/suggestions.resolver.ts` - GraphQL `submitSuggestion` mutation (`SubmitSuggestionInput`, `SuggestionReceiptDto`)
- `backend/src/app.module.ts` - Registered `GOOGLE_OAUTH_CLIENT`, `GoogleAuthGuard`, `SuggestionsService`, and `SuggestionsResolver`
- `backend/src/__tests__/hardening.test.ts` - Supertest HTTP & GraphQL hardening regression suite (3 tests passing)
- `backend/src/__tests__/suggestions-unit.test.ts` - Unit tests for `ZodValidationPipe`, `GoogleAuthGuard`, and `SuggestionsService` (3 tests passing)
- `backend/src/__tests__/suggestions.test.ts` - Supertest GraphQL `submitSuggestion` auth, validation, durable 10/day quota, and IP burst isolation suite (3 tests passing)

## Decisions Made
- Wrapped the `COUNT(*)` quota check and `INSERT` inside `this.sqlite.transaction(...)` in `SuggestionsService` so concurrent submissions for the same `googleSub` cannot race past the 10/day limit.
- Added `backend/src/__tests__/suggestions-unit.test.ts` alongside `suggestions.test.ts` to test `ZodValidationPipe`, `GoogleAuthGuard`, and `SuggestionsService` in isolation (including UTC day rollover) while keeping Supertest GraphQL end-to-end coverage in `suggestions.test.ts`.
- Isolated the 10/min per-IP `@Throttle` burst cap from the 10/day `googleSub` SQLite quota tests in `suggestions.test.ts` via distinct `X-Forwarded-For` IPs and separate `TestingModule` instances.

## Deviations from Plan
None - plan executed cleanly as specified (with `suggestions-unit.test.ts` added for Task 2 unit-level TDD isolation alongside Task 3's `suggestions.test.ts`).

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `main.ts`, `AppModule`, `GoogleAuthGuard`, `ZodValidationPipe`, and `submitSuggestion` are ready for `02-07` (`backend/scripts/build.mjs` CJS bundle `dist/main.cjs`, `Dockerfile`, and Dokploy deployment).

## Self-Check: PASSED
- Verified all 9 created/modified source & test files and `02-05-SUMMARY.md` exist on disk.
- Verified task commits `55ad693`, `b85b0e1`, and `205624b` are ancestors of `HEAD`.
- Verified `bun run test -- --project @roi/backend` (8 files, 26 tests), `hardening.test.ts` (3 tests), `suggestions.test.ts` (3 tests), `bun run typecheck`, and `npx tsc -p backend/tsconfig.json` all exited 0 cleanly.
- Verified zero stub/TODO/FIXME markers across all created/modified files.

---
*Phase: 02-content-backend-first-download*
*Completed: 2026-11-25*
