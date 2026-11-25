# Phase 2: Content Backend & First Download - Research

**Researched:** 2026-11-25
**Domain:** NestJS 12 + Apollo Server 5 GraphQL backend, SQLite/Drizzle persistence & gzipped snapshots, Google ID token auth, Dokploy Docker ops, and Expo SDK 58 resumable offline-first download
**Confidence:** HIGH (stack, peer dependencies, repo constraints, and SQLite/NestJS/Expo patterns verified; operational Dokploy deployment & Release device checks depend on live environment execution)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

#### First Download & Offline Gate (`HOME-06`, `HOME-07`)
- **D-01:** **First-download progress UI:** Display a calm, warm progress bar with the current human-readable stage name (الآيات، أسماء الله، البركات) in Egyptian Arabic without technical numbers, byte counters, or percentages.
- **D-02:** **Resumable & transactional download:** Persist each downloaded content-type snapshot (`verses`, `names_of_god`, `blessings`) to a staging/checkpoint location as it completes. If connectivity drops or the user closes the app mid-download, auto-resume from the last completed section as soon as connectivity returns, alongside a manual "جرّب تاني" button. Never commit partial content into the active SQLite tables until all 3 content types have downloaded and verified together inside a single atomic SQLite transaction (if server `contentVersion` advances mid-batch, restart the batch cleanly).
- **D-03:** **Silent background delta sync (`BE-02`):** After the initial download completes, subsequent app opens work immediately offline and silently check for delta updates by sending `lastContentVersion` when online, throttled (e.g., max once every ~6 hours) with zero interruption or toast noise.
- **D-04:** **Offline first-launch screen & Phase 2 completion screen:**
  - When offline on a fresh install (no downloaded content yet), show a warm Egyptian Arabic message explaining internet is needed once to download the library (`"محتاجين إنترنت أول مرة بس عشان ننزّل لك مكتبة روعي، وبعدها كل حاجة شغالة أوفلاين"`) with a clear "جرّب تاني" button (`HOME-06`).
  - Once first download succeeds at the end of Phase 2 (before Phase 4 builds Onboarding & Home), land on a clean **"المكتبة جاهزة"** confirmation screen displaying the downloaded counts (الآيات، أسماء الله، البركات) in Arabic-Indic digits while preserving the existing theme switcher and dev spike link (`01-08`, `01-14`).

#### Seed Data & Sanity Deferral (`BE-07` Scope Override)
- **D-05:** **Skip Sanity API & Sanity schema work in Phase 2:** Owner explicitly instructed not to build Sanity API fetching, Sanity credentials wiring, or custom Sanity schema mapping in Phase 2; owner will export JSON from Sanity later and handle importing it separately after Phase 2. Phase 2 seeds and tests the backend/mobile flow using clean local Arabic seed/JSON fixture data (`@roi/shared` fixtures + local sample verses, names of God, blessings). *(Keep any generic JSON seed/import CLI idempotent with `--dry-run` + audit log entry if included for local testing, without Sanity dependencies.)*

#### Hosting, Hardening & Operations on Dokploy (`BE-04`, `BE-06`)
- **D-06:** **Flexible domains & CORS via environment variables:** Configure `API_BASE_URL` (mobile / client config) and `ADMIN_ORIGINS` (backend CORS allowlist) purely via environment variables so Dokploy temporary domains work immediately and final production domains swap in with a config change.
- **D-07:** **SQLite persistence & backup/restore verification:** Store backend SQLite DB and pre-built gzipped snapshots on a Docker persistent volume in Dokploy, include a safe SQLite online-backup & restore script (using SQLite backup API / `VACUUM INTO` compatible with WAL mode), and test an actual backup-and-restore drill before closing Phase 2 (structured cleanly to attach Dokploy Volume Backups / S3 later).
- **D-08:** **Uptime monitoring & health endpoint:** Expose a `/health` endpoint verifying SQLite readability and snapshot availability, ready to connect with a free external monitor such as UptimeRobot for email/Telegram downtime alerts (`BE-06`).
- **D-09:** **Dokploy Git deploy & production GraphQL lock:** Deploy directly from the Git repository to Dokploy using a `backend/` `Dockerfile`. Disable GraphQL Playground and introspection whenever `NODE_ENV=production` (`BE-04`), keeping them enabled only in local development.

#### Suggestion Auth, Validation & Rate Limits (`BE-03` Override)
- **D-10:** **Google-authenticated suggestions replacing anonymous device ID (`BE-03` override):** — **Reversibility:** costly — changes `suggestions` schema, GraphQL auth guard, and store privacy declarations (`REL-02`/`REL-03`). Only users signed in with Google may call `submitSuggestion`. The backend MUST verify the submitted Google ID token (using `roi-app-515721` client IDs) and store `googleSub` + `email` on the `pending` suggestion row so admins in Phase 3 can see who submitted it and prevent spam. Personal app data (prayers, gratitude, favorites, personal items, memorization) still NEVER leaves the device to our servers (`SYNC-07` intact).
- **D-11:** **Generous rate limit in Phase 2:** Enforce up to **10 suggestions per day per Google account** (`BE-03`/`BE-04`), without adding an account blocklist/ban system in Phase 2.
- **D-12:** **Suggestion payload & shared validation:** `submitSuggestion` supports all three content kinds (`verse`, `name_of_god`, `blessing`) using the unified fields (`kind`, `title`/`ref`, `text`, optional `textFemale` if applicable) validated against `personalizedTextSchema` from `@roi/shared` before persisting as `pending`.

#### Inherited Phase 1 Verification Queue (End of Phase 2)
- **D-13:** Before marking Phase 2 complete (`02-VERIFICATION.md` / UAT), also execute the Phase 1 Release & Firebase Console verification queue moved here by owner (`01-16-SUMMARY.md`, `01-VERIFICATION.md`): Android Release APK (`app-release.apk`) on `RMX5106`, local Xcode `Release` Simulator build (`iPhone 18 Pro`) + `otool -L` `AdSupport` check, Firebase Console Release triggers (`spike_test`, Test Crash, Sentinel `E_UNCAUGHT`), and `01-REVIEW-FIX.md` (`WR-01`, `WR-02`, `WR-03`, `WR-06`, `WR-05`) human checks.

### Claude's Discretion
- Exact SQLite/Drizzle backend table definitions (beyond `syncCols`/monotonic `contentVersion`/audit log/Google submitter columns), exact gzip snapshot binary/JSON envelope format, NestJS module layout, throttling windows per public read query, GraphQL depth/complexity thresholds, and Dokploy `Dockerfile` base image / multi-stage build details.

### Deferred Ideas (OUT OF SCOPE)
- **Sanity one-time data import (`BE-07` Sanity source):** Deferred outside Phase 2 implementation per owner instruction — owner will export JSON from Sanity separately and handle the one-time import after Phase 2.
- **Google Sign-In screen at end of Onboarding (`HOME-01` / `SYNC-01`):** Owner requested adding an optional, skippable "ادخول باستخدام Google" screen as the final step of Onboarding so signed-in users immediately have Drive sync and suggestion privileges ready -> **Phase 4 (Onboarding) & Phase 8 (Drive Sync)**.
- **Privacy Policy, Store Data Safety & Apple App Review Guideline 4.8 check (`REL-02`, `REL-03`):** Document Google `email`/`googleSub` retention when a user submits a suggestion, and verify whether Sign in with Apple / explanatory review notes are required for iOS -> **Phase 9**.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BE-01 | API serves public content (verses, names, blessings) from one pre-built gzipped snapshot per type, rebuilt only on admin change | Express raw/static snapshot route `/snapshots/:type` serving pre-compressed `.json.gz` buffers from persistent volume & memory cache, rebuilt only inside write/seed transactions (`node:zlib`) |
| BE-02 | One global monotonic `contentVersion`; clients send their last version and get deltas, including soft-delete tombstones | `content_meta` singleton + indexed `version` column on `verses`, `names_of_god`, `blessings`; GraphQL `contentDelta(sinceVersion)` returns active + tombstoned (`deletedAt !== null`) rows with `version > sinceVersion` |
| BE-03 | *(Overridden by D-10/D-11/D-12)* Google-authenticated users submit `pending` suggestions (`verse`, `name_of_god`, `blessing`) | `submitSuggestion` GraphQL mutation protected by `GoogleAuthGuard` (`google-auth-library` verifying `roi-app-515721` client IDs), Zod-validated via `@roi/shared`, storing `googleSub` + `email`, limited to 10/day per `googleSub` |
| BE-04 | Hardening: throttling (stricter on suggestions), zod validation, GraphQL depth/complexity limits, introspection off in production, CORS locked to admin origin, helmet, payload limits, trust proxy | `@nestjs/throttler` (`GqlThrottlerGuard`) + SQLite daily quota, custom `ZodValidationPipe`, `@escape.tech/graphql-armor`, `introspection: !isProd`, `graphiql: !isProd`, `ApolloServerPluginLandingPageDisabled()`, `helmet`, `ADMIN_ORIGINS` CORS, `useBodyParser('json', { limit: '100kb' })`, `app.set('trust proxy', 1)` |
| BE-05 | An audit log records every admin change | `audit_log` Drizzle table written inside the same SQLite transaction as every content mutation and JSON seed import |
| BE-06 | Deployed with Docker on Dokploy with a persistent volume, a tested backup and an uptime monitor | Multi-stage `backend/Dockerfile` (`node:24-slim`), named Docker volume mount for `/data`, `VACUUM INTO` online backup & restore scripts with WAL artifact cleanup drill, `/health` endpoint for UptimeRobot |
| BE-07 | *(Scoped by D-05)* Idempotent local JSON seed/import CLI with `--dry-run` (Sanity API/schema skipped) | Idempotent CLI validating local JSON fixture file against `@roi/shared` schemas, supporting `--dry-run` diff summary and transactional upsert + `audit_log` + snapshot rebuild |
| HOME-06 | First launch without internet shows a friendly screen with a retry button; after the first download everything works offline | `expo-network` (`useNetworkState` / `getNetworkStateAsync`) + offline gate showing Egyptian Arabic prompt & `"جرّب تاني"` button; once `lastContentVersion > 0`, app launches offline immediately and runs silent 6-hour throttled delta checks |
| HOME-07 | The first content download is resumable and applied transactionally | Stage each completed snapshot (`verses`, `names_of_god`, `blessings`) to `expo-file-system` staging directory (`Paths.document`) with manifest `contentVersion`; auto-resume on reconnect; restart batch on server `contentVersion` mismatch; commit all 3 tables + `sync_meta` in one atomic SQLite transaction |
| D-13 *(Inherited)* | Execute Phase 1 Release & Firebase Console verification queue at end of Phase 2 | Explicit end-of-phase Release verification plan covering `RMX5106` Release APK, Xcode `Release` Simulator + `otool -L`, Firebase Console triggers, and `01-REVIEW-FIX.md` checks |
</phase_requirements>

## Summary

Phase 2 delivers two tightly coupled halves: (1) a hardened **NestJS 12 + Apollo Server 5 (`@nestjs/graphql` 14) + Drizzle/SQLite** backend in `backend/` deployed via `Dockerfile` to Dokploy with a persistent named volume, pre-built gzipped per-type snapshots, monotonic `contentVersion` delta sync, Google-authenticated suggestion intake, and `VACUUM INTO` backup/restore tooling; and (2) the **Expo SDK 58 mobile first-download & offline gate** in `app/` that stages the three content-type snapshots resumably on disk, commits them atomically into SQLite, lands on the `"المكتبة جاهزة"` confirmation view, and silently checks for deltas every ~6 hours thereafter.

Inspecting the repository directly uncovered three load-bearing constraints that shape every plan in this phase. First, `@roi/shared` uses `"type": "module"`, `"exports": { ".": "./src/index.ts" }`, and extensionless relative imports (`./arabic`, `./schemas`) `[VERIFIED: shared/package.json:1-14, shared/src/index.ts:1-26]` so Metro, Vite, and Vitest consume it with zero build step (`D-02`). Because Node.js cannot execute extensionless TypeScript at runtime and NestJS DI requires `emitDecoratorMetadata`, `backend/` must compile TypeScript with `tsc` (`emitDecoratorMetadata: true`) and bundle local workspace sources (`backend/src` + `@roi/shared`) with `esbuild` (`--packages=external`, CJS output `dist/main.cjs`), while using `unplugin-swc` in `backend/vitest.config.ts` so Vitest runs Nest DI tests cleanly. Second, `app/features/db/__tests__/schema.test.ts` strictly enforces that **every** table exported from `app/features/db/schema.ts` includes `syncCols()` (`id`, `created_at`, `updated_at`, `deleted_at`) and **forbids** calling `db.delete(...)` or `tx.delete(...)` anywhere under `app/`, `features/`, `services/`, or `hooks/` `[VERIFIED: app/features/db/__tests__/schema.test.ts:45-97]`. Third, `app/__tests__/guards.test.ts` forbids physical Tailwind directional classes (`ml-`, `mr-`, `left-`, `right-`, etc.) and `offlineAccess`/`serverAuthCode` `[VERIFIED: app/__tests__/guards.test.ts:64-158]`. Staging downloads in `expo-file-system` (`Paths.document`) and upserting into `syncCols()`-compliant SQLite tables with `onConflictDoUpdate` preserves every Phase 1 invariant cleanly.

**Primary recommendation:** Build `backend/` on NestJS 12.6.1 + `@nestjs/graphql` 14.2.1 + `@apollo/server` 5.5.2 (pinned to `graphql@16.15.0`) + Drizzle `0.45.4` / `better-sqlite3@13.2.0` on a `node:24-slim` Docker image, serve pre-gzipped snapshots from Express alongside GraphQL delta/suggestion operations, and stage mobile first-downloads in `expo-file-system` before one atomic Drizzle SQLite transaction.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Pre-built gzipped snapshots (`BE-01`) | API / Backend (Express route + memory/volume cache) | Database / Storage (SQLite source rows) | Serving pre-compressed `.json.gz` files directly from Express bypasses GraphQL serialization overhead and avoids per-request gzip CPU |
| Monotonic `contentVersion` & delta queries (`BE-02`) | API / Backend (GraphQL `contentDelta`) | Database / Storage (`content_meta` + indexed `version`) | Backend owns the authoritative monotonic version counter incremented inside write transactions; mobile stores only its `lastContentVersion` cursor |
| Suggestion auth, validation & daily quota (`BE-03`) | API / Backend (`GoogleAuthGuard` + `ZodValidationPipe` + SQLite count) | Mobile Client (Google Sign-In ID token + shared Zod pre-check) | Google ID token cryptographic verification (`google-auth-library`) and 10/day/account enforcement cannot be trusted to the client |
| Security hardening & audit log (`BE-04`, `BE-05`) | API / Backend (Nest middleware, Armor, Throttler, `audit_log`) | Reverse Proxy (Dokploy Traefik TLS + `X-Forwarded-For`) | Backend owns CORS, Helmet, body limits, query limits, and transactional audit logging; Traefik terminates TLS (`trust proxy = 1`) |
| Persistence & backup/restore (`BE-06`) | Infrastructure / Storage (Dokploy named volume + `VACUUM INTO` scripts) | API / Backend (`/health` readiness probe) | Named Docker volumes survive container redeploys and integrate with Dokploy S3 volume backups; `/health` feeds UptimeRobot |
| Resumable staging & atomic commit (`HOME-06`, `HOME-07`) | Mobile Client (`expo-file-system` staging + `expo-network` + SQLite transaction) | API / Backend (consistent `contentVersion` in snapshot envelope) | Mobile owns staging checkpoints, connectivity auto-resume, version-mismatch restart, and all-or-nothing SQLite transaction commit |

## Standard Stack

### Core (Backend — `backend/`)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express` | `12.6.1` | HTTP server & DI container | Locked in `PROJECT.md`; Express 5 adapter (`express@5.3.0`) `[VERIFIED: npm view]` |
| `@nestjs/config` | `12.1.1` | Env-only configuration & validation | Official Nest config module `[VERIFIED: npm view]` |
| `@nestjs/graphql`, `@nestjs/apollo` | `14.2.1` | Code-first GraphQL API | Official Nest GraphQL driver for Apollo Server 5 `[VERIFIED: npm view]` |
| `@apollo/server` | `5.5.2` | GraphQL server runtime | Current Apollo 5 (`ApolloServerPluginLandingPageDisabled`) `[VERIFIED: npm view]` |
| `@as-integrations/express5` | `1.1.2` | Apollo Express 5 integration | Explicit peer dependency of `@nestjs/apollo@14.2.1` `[VERIFIED: npm view]` |
| `graphql` | `16.15.0` | GraphQL schema & execution | `@apollo/server@5.5.2` peers `^16.11.0`; `graphql-request@7.4.0` peers `14 - 16` (`17.1.0` breaks both) `[VERIFIED: npm view]` |
| `drizzle-orm` / `drizzle-kit` | `0.45.4` / `0.31.11` | SQLite ORM & migrations | Matches `app/package.json` (`0.45.4` / `0.31.11`) `[VERIFIED: app/package.json:29,67]` |
| `better-sqlite3` | `13.2.0` | Native SQLite driver | Matches `app/package.json` & root `trustedDependencies`; Linux glibc prebuilds for Node 24 `[VERIFIED: app/package.json:66, package.json:14]` |
| `google-auth-library` | `11.3.4` | Verify Google ID tokens | Official Google auth client supporting `audience: string[]` (`webClientId`, `iosClientId`) `[VERIFIED: npm view]` |
| `zod` | `4.6.7` | Input & seed schema validation | Matches `@roi/shared` (`4.6.7`); must be declared directly in `backend/package.json` under Bun isolated linker `[VERIFIED: shared/package.json:9]` |

### Supporting (Backend — `backend/`)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@nestjs/throttler` | `6.8.0` | IP/route rate limiting | Global & per-resolver GraphQL throttling via `GqlThrottlerGuard` `[VERIFIED: npm view]` |
| `@escape.tech/graphql-armor` | `3.2.0` | Depth, cost, alias, directive, token limits + field suggestion blocking | Spread `plugins` + `validationRules` into `ApolloDriverConfig` `[VERIFIED: npm view]` |
| `helmet` | `8.3.0` | HTTP security headers | `app.use(helmet(...))` (strict in prod; GraphiQL-compatible in dev) `[VERIFIED: npm view]` |
| `reflect-metadata`, `rxjs` | `0.2.2`, `7.8.2` | NestJS decorator metadata & observables | Required NestJS runtime peers `[VERIFIED: npm view]` |
| `class-validator`, `class-transformer` | `0.15.1`, `0.5.1` | `@nestjs/graphql@14.2.1` peer dependencies | Declare in `backend/package.json` for Bun isolated linker; use `ZodValidationPipe` for validation `[VERIFIED: npm view]` |
| `@types/better-sqlite3`, `@nestjs/testing`, `supertest`, `@types/supertest` | `9.6.0`, `12.6.1`, `7.3.2`, `7.2.1` | Backend dev types & HTTP/GraphQL integration testing | Vitest backend unit & supertest e2e suites `[VERIFIED: npm view]` |
| `unplugin-swc`, `@swc/core`, `esbuild` | `2.0.0`, `1.16.22`, `0.28.2` | Vitest `emitDecoratorMetadata` + Docker/prod bundling with `@roi/shared` | `unplugin-swc` in `backend/vitest.config.ts`; `tsc` + `esbuild` for `dist/main.cjs` `[VERIFIED: npm view]` |

### Core & Supporting (Mobile Additions — `app/`)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-network` | `~58.0.5` | Connectivity detection & live reconnect listener (`useNetworkState`, `getNetworkStateAsync`) | SDK 58 bundled native module `[VERIFIED: app/node_modules/expo/bundledNativeModules.json]` |
| `expo-file-system` | `~58.0.14` | Resumable snapshot staging (`File`, `Directory`, `Paths.document`) | SDK 58 bundled native module `[VERIFIED: app/node_modules/expo/bundledNativeModules.json]` |
| `graphql-request` | `7.4.0` | Typed GraphQL client for `contentDelta` & `submitSuggestion` | Locked in `PROJECT.md` (`"graphql": "14 - 16"`) `[VERIFIED: npm view]` |
| `graphql` | `16.15.0` | Required peer of `graphql-request@7.4.0` under isolated linker | Pin `16.15.0` matching backend `[VERIFIED: npm view]` |
| `@tanstack/react-query` | `5.108.4` | Client query cache & silent background delta trigger | Locked in `PROJECT.md` `[VERIFIED: npm view]` |
| `zod` | `4.6.7` | Direct mobile import for client-side snapshot validation | Matches `@roi/shared`; declare directly under isolated linker `[VERIFIED: shared/package.json:9]` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `node:24-slim` Docker base | `node:24-alpine` | Alpine uses `musl`, lacking `better-sqlite3` prebuilt binaries and requiring `python3`/`make`/`g++` in Dockerfile; `node:24-slim` uses `glibc` prebuilds directly |
| `tsc` + `esbuild` (`dist/main.cjs`) | `tsx` or `nest build` (plain `tsc`) | `tsx` drops `emitDecoratorMetadata`; plain `tsc` leaves `@roi/shared` pointing at `shared/src/index.ts` (extensionless TS) which Node rejects at runtime |
| Express raw `.json.gz` route (`node:zlib`) | GraphQL query for full library or `compression` middleware | GraphQL over-serializes 3 large snapshots on every client; `compression` re-compresses per request instead of serving pre-built immutable bytes |
| Custom `ZodValidationPipe` | `nestjs-zod@5.6.0` | `nestjs-zod` peer range stops at `@nestjs/common ^11` and does not declare Nest 12 support |
| `expo-file-system` staging | MMKV staging | Multi-MB Arabic JSON strings bloat MMKV's memory-mapped preference store; `File`/`Directory` keeps staging cleanly on disk |

**Installation:**
```bash
# Backend dependencies (in backend/)
cd backend && bun add @nestjs/core@12.6.1 @nestjs/common@12.6.1 @nestjs/platform-express@12.6.1 @nestjs/config@12.1.1 @nestjs/graphql@14.2.1 @nestjs/apollo@14.2.1 @apollo/server@5.5.2 @as-integrations/express5@1.1.2 graphql@16.15.0 reflect-metadata@0.2.2 rxjs@7.8.2 class-validator@0.15.1 class-transformer@0.5.1 drizzle-orm@0.45.4 better-sqlite3@13.2.0 google-auth-library@11.3.4 @nestjs/throttler@6.8.0 helmet@8.3.0 @escape.tech/graphql-armor@3.2.0 zod@4.6.7
cd backend && bun add -d drizzle-kit@0.31.11 @types/better-sqlite3@9.6.0 @nestjs/testing@12.6.1 supertest@7.3.2 @types/supertest@7.2.1 unplugin-swc@2.0.0 @swc/core@1.16.22 esbuild@0.28.2

# Mobile additions (in app/ — use npx expo install for SDK-tracked native packages)
cd app && npx expo install expo-network expo-file-system
cd app && bun add graphql@16.15.0 graphql-request@7.4.0 @tanstack/react-query@5.108.4 zod@4.6.7
```
*Note: After installing `expo-network` and `expo-file-system`, run native prebuild/rebuild (`expo prebuild` or `expo run:ios` / `expo run:android`) so native modules compile into the iOS and Android binaries.*

## Package Legitimacy Audit

Executed `node "$HOME/.cursor/gsd-core/bin/gsd-tools.cjs" query package-legitimacy check --ecosystem npm ...` and `npm view <pkg> version` / `scripts.postinstall` on `2026-11-25`:

| Package | Registry | Published | Weekly Downloads | Source Repo | Postinstall | Verdict | Disposition |
|---------|----------|-----------|-----------------|-------------|-------------|---------|-------------|
| `@nestjs/core` (`12.6.1`) | npm | 2026-11-25 | 25.2M/wk | github.com/nestjs/nest | none | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install |
| `@nestjs/common` (`12.6.1`) | npm | 2026-11-25 | 25.9M/wk | github.com/nestjs/nest | none | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install |
| `@nestjs/platform-express` (`12.6.1`) | npm | 2026-11-25 | 17.4M/wk | github.com/nestjs/nest | none | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install |
| `@nestjs/config` (`12.1.1`) | npm | 2026-11-06 | 12.8M/wk | github.com/nestjs/config | none | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install |
| `@nestjs/graphql` (`14.2.1`) | npm | 2026-11-13 | 2.1M/wk | github.com/nestjs/graphql | none | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install |
| `@nestjs/apollo` (`14.2.1`) | npm | 2026-11-13 | 1.7M/wk | github.com/nestjs/graphql | none | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install |
| `@apollo/server` (`5.5.2`) | npm | 2026-11-11 | 4.1M/wk | github.com/apollographql/apollo-server | none | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install |
| `@as-integrations/express5` (`1.1.2`) | npm | 2025-07-17 | 1.7M/wk | github.com/apollo-server-integrations/apollo-server-integration-express5 | none | `[OK]` | Approved |
| `graphql` (`16.15.0` pinned; latest `17.1.0`) | npm | 2026-11-04 | 74.3M/wk | github.com/graphql/graphql-js | none | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install |
| `reflect-metadata` (`0.2.2`) | npm | 2024-03-29 | 68.4M/wk | github.com/rbuckton/reflect-metadata | none | `[OK]` | Approved |
| `rxjs` (`7.8.2`) | npm | 2025-02-22 | 147.9M/wk | github.com/reactivex/rxjs | none | `[OK]` | Approved |
| `class-validator` (`0.15.1`) | npm | 2026-02-26 | 18.1M/wk | github.com/typestack/class-validator | none | `[OK]` | Approved |
| `class-transformer` (`0.5.1`) | npm | 2021-11-22 | 18.2M/wk | github.com/typestack/class-transformer | none | `[OK]` | Approved |
| `drizzle-orm` (`0.45.4`) | npm | 2026-10-08 | 48.7M/wk | github.com/drizzle-team/drizzle-orm | none | `[OK]` | Approved |
| `drizzle-kit` (`0.31.11`) | npm | 2026-09-21 | 40.8M/wk | github.com/drizzle-team/drizzle-orm | none | `[OK]` | Approved |
| `better-sqlite3` (`13.2.0`) | npm | 2026-11-14 | 16.8M/wk | github.com/WiseLibs/better-sqlite3 | none | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install (already in `app/` & root `trustedDependencies`) |
| `@types/better-sqlite3` (`9.6.0`) | npm | 2026-08-01 | 8.1M/wk | github.com/DefinitelyTyped/DefinitelyTyped | none | `[OK]` | Approved |
| `google-auth-library` (`11.3.4`) | npm | 2026-11-09 | 146.4M/wk | github.com/googleapis/google-cloud-node | none | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install |
| `@nestjs/throttler` (`6.8.0`) | npm | 2026-11-16 | 6.7M/wk | github.com/nestjs/throttler | none | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install |
| `helmet` (`8.3.0`) | npm | 2026-07-12 | 23.4M/wk | github.com/helmetjs/helmet | none | `[OK]` | Approved |
| `@escape.tech/graphql-armor` (`3.2.0`) | npm | 2025-12-29 | 430.9K/wk | github.com/Escape-Technologies/graphql-armor | none | `[OK]` | Approved |
| `@nestjs/testing` (`12.6.1`) | npm | 2026-11-25 | 15.5M/wk | github.com/nestjs/nest | none | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install |
| `supertest` (`7.3.2`) | npm | 2026-11-07 | 26.6M/wk | github.com/ladjs/supertest | none | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install |
| `@types/supertest` (`7.2.1`) | npm | 2026-07-14 | 22.9M/wk | github.com/DefinitelyTyped/DefinitelyTyped | none | `[OK]` | Approved |
| `zod` (`4.6.7`) | npm | 2026-10-12 | 467.6M/wk | github.com/colinhacks/zod | none | `[OK]` | Approved |
| `unplugin-swc` (`2.0.0`) | npm | 2026-09-21 | 4.4M/wk | github.com/unplugin/unplugin-swc | none | `[OK]` | Approved |
| `@swc/core` (`1.16.22`) | npm | 2026-11-05 | 61.5M/wk | github.com/swc-project/swc | `node postinstall.js` *(platform binary loader)* | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install |
| `esbuild` (`0.28.2`) | npm | 2026-08-08 | 439.7M/wk | github.com/evanw/esbuild | `node install.js` *(official binary check)* | `[OK]` | Approved (verify `install.js` is standard binary install) |
| `expo-network` (`~58.0.5`) | npm | 2026-11-11 | 4.3M/wk | github.com/expo/expo | none | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install |
| `expo-file-system` (`~58.0.14`) | npm | 2026-11-17 | 17.4M/wk | github.com/expo/expo | none | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install |
| `graphql-request` (`7.4.0`) | npm | 2025-12-12 | 13.0M/wk | github.com/graffle-js/graffle | none | `[OK]` | Approved |
| `@tanstack/react-query` (`5.108.4`) | npm | 2026-11-23 | 90.7M/wk | github.com/TanStack/query | none | `[SUS]` *(too-new)* | Flagged — planner adds `checkpoint:human-verify` before install |

**Packages removed due to `[SLOP]` verdict:** none
**Packages flagged as suspicious `[SUS]`:** `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/config`, `@nestjs/graphql`, `@nestjs/apollo`, `@apollo/server`, `graphql`, `better-sqlite3`, `google-auth-library`, `@nestjs/throttler`, `@nestjs/testing`, `supertest`, `@swc/core`, `expo-network`, `expo-file-system`, `@tanstack/react-query` — all flagged solely with `"too-new"` due to November 2026 patch releases on well-known official packages (consistent with Phase 1's `01-01-SUMMARY.md` batched owner approval). Planner must insert a single batched `checkpoint:human-verify` gate before installing them.

*(Note: `@nestjs/cli@12.0.15` was also checked (`[SUS]` too-new, 12.7M/wk) and is not required when using `tsc` + `esbuild` for the backend build.)*

## Architecture Patterns

### System Architecture Diagram

```
Mobile App (Expo SDK 58)                        Dokploy (Traefik HTTPS) -> Backend Container (Node 24 + NestJS 12)
────────────────────────────────────────────    ──────────────────────────────────────────────────────────────────
[Boot: useMigrations(db)]                       [Boot: Drizzle migrate + snapshot verify/rebuild + load memory cache]
   │
   ▼
[Check sync_meta.lastContentVersion]
   ├─ (== 0: Fresh Install) ──► [expo-network check]
   │                               ├─ Offline ──► [Offline Screen ("جرّب تاني")]
   │                               └─ Online ───► Sequential Fetch (no custom Accept-Encoding):
   │                                                1. GET /snapshots/verses       ──► [Buffer / .json.gz cache]
   │                                                2. GET /snapshots/names_of_god ──► [Buffer / .json.gz cache]
   │                                                3. GET /snapshots/blessings    ──► [Buffer / .json.gz cache]
   │                                              Validate Zod + check uniform contentVersion:
   │                                                ├─ Version changed mid-batch ──► Clear staging & restart
   │                                                ├─ Drop/close mid-batch ───────► Resume from manifest stage
   │                                                └─ All 3 staged at same V ─────► Atomic SQLite TX:
   │                                                                                 upsert 3 tables + sync_meta(V)
   │                                                                                 then delete staging dir
   │                                              ──► Render "المكتبة جاهزة" + counts (Arabic-Indic)
   │
   └─ (> 0: Ready Offline) ───► Render Immediately Offline
                                  └─ Background (throttled ≥6h, online):
                                       POST /graphql contentDelta(sinceVersion) ──► [GqlThrottler + Armor]
                                         └─ Version > local ──► Atomic SQLite TX (upserts + deletedAt tombstones)

Suggestion Flow (signed-in Google user):
[Google ID Token] ──► POST /graphql submitSuggestion (Authorization: Bearer)
                        ──► [GqlThrottler + GoogleAuthGuard (roi-app-515721) + ZodValidationPipe + SQLite 10/day check]
                        ──► Insert suggestions (status='pending', googleSub, email)

Seed / Admin Write Flow:
[JSON Seed CLI --file / --dry-run] ──► Validate @roi/shared ──► Single SQLite TX:
                                                                 upsert rows + bump content_meta.content_version
                                                                 + insert audit_log
                                                                 ──► Atomic write .json.gz.tmp -> rename -> swap memory cache
```

### Recommended Project Structure

```
shared/src/
├── schemas.ts                  # Extend with contentKindSchema, content item schemas, submitSuggestionInputSchema
└── index.ts                    # Export new schemas & types

backend/
├── Dockerfile                  # Multi-stage node:24-slim + bun install + tsc/esbuild + non-root runtime
├── drizzle.config.ts           # SQLite drizzle config pointing at backend/src/db/schema.ts
├── drizzle/                    # Generated backend SQLite migrations
├── seed/
│   └── initial-content.json    # Clean local Arabic verses (incl. TORTURE_FIXTURES), names of God, blessings
├── scripts/
│   └── build.mjs               # Runs tsc (emitDecoratorMetadata) + esbuild CJS bundle (dist/main.cjs, cli, scripts)
├── vitest.config.ts            # unplugin-swc plugin so NestJS DI works in Vitest
└── src/
    ├── main.ts                 # Bootstrap NestExpressApplication: trust proxy, helmet, CORS, 100kb limit, shutdown hooks
    ├── app.module.ts           # ConfigModule, ThrottlerModule, GraphQLModule (ApolloDriver + Armor), domain modules
    ├── config/env.ts           # Zod-validated env config (PORT, DATA_DIR, ADMIN_ORIGINS, GOOGLE_CLIENT_IDS, etc.)
    ├── db/
    │   ├── schema.ts           # content_meta, verses, names_of_god, blessings, suggestions, audit_log
    │   ├── client.ts           # better-sqlite3 WAL + busy_timeout=5000 + foreign_keys=ON + migrate()
    │   └── drizzle.module.ts   # Global Nest module providing SQLITE_DB + DRIZZLE_DB
    ├── common/
    │   ├── zod-validation.pipe.ts
    │   ├── gql-throttler.guard.ts
    │   └── google-auth.guard.ts
    ├── content/
    │   ├── snapshot.service.ts # Pre-built gzipped snapshots on disk + memory cache + atomic rename
    │   ├── snapshot.controller.ts # GET /snapshots/:type (gzipped response, ETag, X-Content-Version)
    │   ├── content.service.ts  # Delta query + transactional version bump + audit log helper
    │   └── content.resolver.ts # GraphQL Query contentDelta(sinceVersion)
    ├── suggestions/
    │   ├── suggestions.service.ts # Daily 10/account SQLite quota + insert pending row
    │   └── suggestions.resolver.ts # GraphQL Mutation submitSuggestion (GoogleAuthGuard + ZodValidationPipe)
    ├── health/
    │   └── health.controller.ts # GET /health (@SkipThrottle) checking SQLite + snapshot availability
    └── scripts/
        ├── seed.ts             # Idempotent JSON seed CLI (--file, --dry-run) + audit_log + snapshot rebuild
        ├── backup.ts           # Online VACUUM INTO + PRAGMA integrity_check verification
        └── restore.ts          # Integrity-checked restore + remove stale -wal/-shm files

app/
├── constants/
│   ├── app.ts                  # Add API_BASE_URL from EXPO_PUBLIC_API_BASE_URL
│   └── sync.ts                 # Content types, stage labels (الآيات، أسماء الله، البركات), 6h throttle constant
├── features/
│   ├── db/
│   │   ├── schema.ts           # Add syncCols()-compliant public content tables + sync_meta
│   │   └── __tests__/migrate.test.ts # Update table list + add v2 migration fixture test
│   └── sync/
│       ├── api.ts              # Snapshot fetch + GraphQL client (graphql-request)
│       ├── staging.ts          # expo-file-system File/Directory/Paths checkpoint manager
│       ├── first-download.ts   # Resumable state machine, mid-batch version check, atomic SQLite commit
│       ├── delta-sync.ts       # Silent 6h throttled delta sync applying upserts & tombstones
│       ├── ContentGate.tsx     # Offline retry screen + calm Arabic stage progress bar (routes /(dev)/* bypassable)
│       └── LibraryReadyView.tsx # "المكتبة جاهزة" confirmation card with Arabic-Indic counts
└── locales/ar.json             # Egyptian Arabic offline/progress/ready strings
```

### Pattern 1: Transactional Content Mutation + Snapshot Rebuild (Backend)
**What:** Every content write (seed import in Phase 2, admin CRUD / suggestion acceptance in Phase 3) executes inside a single `better-sqlite3` synchronous transaction: increment `content_meta.content_version`, upsert/soft-delete rows with that `version`, and write `audit_log`. Snapshot `.json.gz` files and the in-memory cache are rebuilt immediately after commit via write-temp-then-rename.
**When to use:** Any operation that modifies `verses`, `names_of_god`, or `blessings`.

### Pattern 2: Monorepo Build for NestJS + `@roi/shared` without Breaking Zero-Build Source Consumption
**What:** Keep `shared/package.json` `"exports": { ".": "./src/index.ts" }` untouched so `app/`, `admin/`, `tsc`, and `vitest` continue consuming `@roi/shared` directly from source TypeScript (`D-02`). For `backend/` runtime (`node dist/main.cjs`), run `tsc -p tsconfig.build.json` (`emitDecoratorMetadata: true`, `experimentalDecorators: true`, compiling `backend/src` + `shared/src` to `.build-tsc/`) followed by `esbuild` (`bundle: true`, `platform: 'node'`, `format: 'cjs'`, `packages: 'external'`, aliasing `@roi/shared` to `.build-tsc/shared/src/index.js`).
**When to use:** Both local `bun run build` and `backend/Dockerfile` production build.

### Pattern 3: Resumable Staging + Atomic SQLite Commit (Mobile)
**What:** Persist each completed content-type snapshot as a validated JSON file inside `new Directory(Paths.document, 'content-staging')` alongside `manifest.json` (`{ contentVersion, completed }`). On launch or network reconnect (`useNetworkState`), resume only missing types. If a fetched snapshot's `contentVersion` differs from `manifest.contentVersion`, delete the staging directory and restart cleanly from `verses`. Once all 3 match, write all rows + `sync_meta` inside one synchronous Drizzle `db.transaction(...)` and then delete the staging directory.
**When to use:** Initial download (`HOME-06`, `HOME-07`, `D-01`, `D-02`).

### Anti-Patterns to Avoid
- **Manually setting `Accept-Encoding: gzip` in React Native `fetch`:** OkHttp on Android disables transparent decompression when callers explicitly pass `Accept-Encoding: gzip`, causing `response.json()` to choke on raw binary gzip bytes `[CITED: github.com/facebook/react-native]`. Let `NSURLSession` / `OkHttp` negotiate `Accept-Encoding` automatically, and on Express serve `.json.gz` with `Content-Encoding: gzip` when `req.acceptsEncodings('gzip')` is truthy (with `zlib.gunzipSync` fallback for plain clients without `Accept-Encoding`).
- **Calling `db.delete()` or `tx.delete()` in `app/`:** Violates `app/features/db/__tests__/schema.test.ts:83-97` `[VERIFIED: app/features/db/__tests__/schema.test.ts:83-97]`. Public content tables use `deletedAt` tombstones via `onConflictDoUpdate`; staging files live in `expo-file-system` (`Directory.delete()`), not SQLite.
- **Using `@nestjs/throttler` alone for the 10/day suggestion cap (`D-11`):** In-memory throttler counters wipe on every container restart/redeploy and key by IP by default. Enforce the 10/day/Google-account quota with a durable indexed `COUNT(*)` query on `suggestions (google_sub, created_at)`.
- **Using bind mounts (`./data:/data`) in Dokploy:** Dokploy's automated S3 Volume Backups exclude bind mounts and require Docker Named Volumes `[CITED: docs.dokploy.com]`.
- **Running `restore` without deleting `-wal` / `-shm`:** Leaving stale `-wal` or `-shm` files beside a restored `.sqlite` file corrupts or replays old WAL frames on reopen `[CITED: sqlite.org]`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Google ID token signature/cert/expiry verification | Manual JWT decode or JWKS fetch | `google-auth-library` (`OAuth2Client.verifyIdToken`) | Handles Google cert rotation, caching, `iss`/`exp`/`aud` array validation (`webClientId`, `iosClientId`) |
| GraphQL DoS protection (depth, cost, aliases, directives, tokens) | Custom AST visitor | `@escape.tech/graphql-armor` (`ApolloArmor`) | Covers 6 attack vectors including `blockFieldSuggestions` in one maintained Apollo 5 plugin |
| HTTP security headers | Custom header middleware | `helmet` | Sets CSP, HSTS, X-Content-Type-Options, etc., with safe defaults |
| SQLite online backup in WAL mode | `fs.copyFileSync` on live `.sqlite` | `VACUUM INTO` via `better-sqlite3` | `cp` on an active WAL DB misses uncheckpointed WAL frames and risks torn pages; `VACUUM INTO` produces a compacted, consistent single file |
| Connectivity detection & reconnect listener | Polling `/health` on an interval | `expo-network` (`useNetworkState`, `getNetworkStateAsync`) | Native OS reachability callbacks without burning battery or throttling `/health` |
| Arabic text normalization & `{الاسم}` validation | New backend/mobile validators | `@roi/shared` (`personalizedTextSchema`, `syncRowSchema`, `uuidv7`) | Single source of truth already tested across workspaces (`FND-08`) |

**Key insight:** In SQLite WAL mode + NestJS GraphQL + React Native networking, the sharpest edge cases (torn file copies, unvalidated GraphQL AST abuse, OkHttp gzip header interception, and NestJS DI metadata loss under esbuild/Vitest) are all eliminated by using the standard primitives above exactly as documented.

## Common Pitfalls

### Pitfall 1: `schema.test.ts` and `migrate.test.ts` Failing on New Mobile Tables
**What goes wrong:** Adding public content tables (`verses`, `names_of_god`, `blessings`) or a `sync_meta` table to `app/features/db/schema.ts` breaks Phase 1's automated test suite.
**Why it happens:** `app/features/db/__tests__/schema.test.ts:45-67` requires EVERY `SQLiteTable` exported from `schema.ts` to have `id` (text PK), `created_at` (notNull), `updated_at` (notNull), `deleted_at` (nullable), and lines `83-97` fail if `db.delete(` or `tx.delete(` appears anywhere in `app/`, `features/`, `services/`, or `hooks/`. Furthermore, `migrate.test.ts:106-113` asserts the exact list of table names in an empty migrated DB `[VERIFIED: app/features/db/__tests__/schema.test.ts:45-97, app/features/db/__tests__/migrate.test.ts:106-113]`.
**How to avoid:** Build every table in `app/features/db/schema.ts` with `...syncCols()` (which public content tables already want for `deletedAt` tombstones!), store download staging in `expo-file-system` (never `db.delete`), update `migrate.test.ts`'s expected table list, and add a new fixture test for Phase 2 migrations.
**Warning signs:** `bun run test` failing in `schema.test.ts` or `migrate.test.ts`.

### Pitfall 2: NestJS Dependency Injection Failing Under Vitest or Bundled Node Runtime
**What goes wrong:** `NestJS` throws `UnknownDependenciesException` / `Cannot read properties of undefined` in Vitest tests, or Node fails at boot with `ERR_UNKNOWN_FILE_EXTENSION` / missing `./arabic` module inside `@roi/shared`.
**Why it happens:** Vitest uses `esbuild` by default, which strips TypeScript types without emitting `design:paramtypes` (`emitDecoratorMetadata`) `[CITED: docs.nestjs.com]`. Meanwhile, `@roi/shared` exports `./src/index.ts` with extensionless imports for Metro/Vite `[VERIFIED: shared/package.json:5-7, shared/src/index.ts:1-26]`, which Node.js cannot execute directly.
**How to avoid:** Configure `backend/vitest.config.ts` with `unplugin-swc` (`swc.vite()`), and build `backend/dist/main.cjs` via two-step `tsc` (`emitDecoratorMetadata: true`) → `esbuild` (`--packages=external`, bundling `@roi/shared`).
**Warning signs:** Services injected as `undefined` in constructor under Vitest, or `ERR_MODULE_NOT_FOUND` on `shared/src/arabic` when running `node dist/...`.

### Pitfall 3: `graphql@17` or `nestjs-zod` Breaking Bun Isolated Install
**What goes wrong:** Installing `graphql@latest` (`17.1.0`) or `nestjs-zod` causes peer dependency conflicts or runtime errors in `@apollo/server@5.5.2` and `graphql-request@7.4.0`.
**Why it happens:** `@apollo/server@5.5.2` peers `"graphql": "^16.11.0"` and `graphql-request@7.4.0` peers `"graphql": "14 - 16"` `[VERIFIED: npm view]`, while `nestjs-zod@5.6.0` stops at `@nestjs/common ^11`.
**How to avoid:** Explicitly pin `graphql@16.15.0` in both `backend/package.json` and `app/package.json`, declare `@as-integrations/express5`, `class-validator`, `class-transformer`, `reflect-metadata`, and `zod` directly in `backend/package.json`, and use a ~15-line `ZodValidationPipe`.

### Pitfall 4: Android OkHttp Double-Gzip / Raw Binary Snapshot Failure
**What goes wrong:** Mobile `fetch()` receives raw compressed gzip bytes on Android, causing `JSON.parse` / `response.json()` to throw `SyntaxError: JSON Parse error: Unexpected character`.
**Why it happens:** Passing `Accept-Encoding: gzip` explicitly in React Native `fetch` tells OkHttp the caller will decompress the stream itself, bypassing automatic decompression `[CITED: github.com/facebook/react-native]`.
**How to avoid:** Never set `Accept-Encoding` manually in mobile `fetch` calls. On Express, check `req.acceptsEncodings('gzip')`: send the pre-compressed `.json.gz` `Buffer` with `Content-Encoding: gzip` + `Vary: Accept-Encoding` when accepted, and decompress via `zlib.gunzipSync` otherwise. Test against real `RMX5106` Android and `iPhone 18 Pro` Simulator.

### Pitfall 5: `trust proxy` Omission Behind Dokploy Traefik
**What goes wrong:** One abusive client triggers `@nestjs/throttler` for ALL users across the entire app.
**Why it happens:** Inside Dokploy, Traefik forwards requests to the backend container; without `app.set('trust proxy', 1)`, `req.ip` is always Traefik's container IP, so every user shares one rate-limit bucket `[CITED: docs.nestjs.com]`.
**How to avoid:** Call `app.set('trust proxy', 1)` in `backend/src/main.ts` before listening, and override `getRequestResponse` in `GqlThrottlerGuard`.

### Pitfall 6: `@nestjs/graphql` v14 Production Lock & Helmet CSP in Dev
**What goes wrong:** Either GraphiQL/introspection stays reachable in production (`BE-04`), or Helmet's strict default CSP blocks GraphiQL assets in local development.
**Why it happens:** `@nestjs/graphql` v14 replaces the deprecated `playground` option with `graphiql`, and `helmet()` defaults to strict `script-src 'self'` CSP `[CITED: docs.nestjs.com]`.
**How to avoid:** Set `introspection: !isProd`, `graphiql: !isProd`, `includeStacktraceInErrorResponses: !isProd`, and append `ApolloServerPluginLandingPageDisabled()` when `isProd` (`NODE_ENV === 'production'`). Apply `helmet()` unconditionally in prod and `{ contentSecurityPolicy: false }` only when `!isProd`.

### Pitfall 7: `ContentGate` Blocking `(dev)` Spike/Torture Deep Links (`D-13`)
**What goes wrong:** Running the deferred Phase 1 Release `roi://spike` or `roi://torture` check (`D-13`) on a fresh install or offline device gets intercepted by the Phase 2 offline gate.
**Why it happens:** Putting an unconditional gate in `app/app/_layout.tsx` blocks navigation to `/(dev)/spike` and `/(dev)/torture`.
**How to avoid:** When `DEV_TOOLS_ENABLED` is true and the active route segment is `(dev)` (`useSegments()[0] === '(dev)'`), let `(dev)` screens render normally without waiting for first content download.

## Code Examples

### Backend: Hardened NestJS 12 + Apollo 5 + Armor Setup
```typescript
// Source: docs.nestjs.com/graphql/quick-start, docs.nestjs.com/security/helmet, escape.tech/graphql-armor
import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloArmor } from '@escape.tech/graphql-armor';

const isProd = process.env.NODE_ENV === 'production';

const armor = new ApolloArmor({
  maxDepth: { enabled: true, n: 6, ignoreIntrospection: !isProd },
  costLimit: { enabled: true, maxCost: 5000 },
  maxAliases: { enabled: true, n: 5 },
  maxDirectives: { enabled: true, n: 5 },
  maxTokens: { enabled: true, n: 500 },
  blockFieldSuggestions: { enabled: true },
});
const protection = armor.protect();

// Inside AppModule imports:
GraphQLModule.forRoot<ApolloDriverConfig>({
  driver: ApolloDriver,
  autoSchemaFile: true,
  sortSchema: true,
  graphiql: !isProd,
  introspection: !isProd,
  includeStacktraceInErrorResponses: !isProd,
  context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
  validationRules: [...protection.validationRules],
  plugins: [
    ...protection.plugins,
    ...(isProd ? [ApolloServerPluginLandingPageDisabled()] : []),
  ],
});
```

### Backend: `GqlThrottlerGuard`, `GoogleAuthGuard`, and `ZodValidationPipe`
```typescript
// Source: docs.nestjs.com/security/rate-limiting & googleapis/google-auth-library-nodejs
@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  protected getRequestResponse(context: ExecutionContext) {
    if (context.getType<string>() === 'graphql') {
      const ctx = GqlExecutionContext.create(context).getContext();
      return { req: ctx.req, res: ctx.res };
    }
    const http = context.switchToHttp();
    return { req: http.getRequest(), res: http.getResponse() };
  }
}

// Google ID token verification supporting roi-app-515721 web + iOS client IDs:
const ticket = await this.oauthClient.verifyIdToken({
  idToken,
  audience: this.allowedClientIds, // [GOOGLE_OAUTH.webClientId, GOOGLE_OAUTH.iosClientId]
});
const payload = ticket.getPayload();
if (!payload || !payload.email_verified || !payload.sub || !payload.email) {
  throw new UnauthorizedException('GOOGLE_TOKEN_INVALID');
}
```

### Backend: SQLite WAL Initialization & `VACUUM INTO` Online Backup
```typescript
// Source: orm.drizzle.team & sqlite.org/lang_vacuum.html#vacuum_into
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');
sqlite.pragma('foreign_keys = ON');
const db = drizzle(sqlite, { schema });
migrate(db, { migrationsFolder });

// Online WAL-safe backup (targetPath must not already exist):
const escapedPath = targetPath.replaceAll("'", "''");
sqlite.exec(`VACUUM INTO '${escapedPath}'`);
const verifyDb = new Database(targetPath, { readonly: true });
const integrity = verifyDb.pragma('integrity_check', { simple: true });
verifyDb.close();
if (integrity !== 'ok') throw new Error(`Backup integrity failed: ${String(integrity)}`);
```

### Mobile: `expo-file-system` Staging & `expo-network` Connectivity
```typescript
// Source: docs.expo.dev/versions/latest/sdk/filesystem & sdk/network
import { Directory, File, Paths } from 'expo-file-system';
import * as Network from 'expo-network';

const state = await Network.getNetworkStateAsync();
const isOnline = Boolean(state.isConnected) && state.isInternetReachable !== false;

const stagingDir = new Directory(Paths.document, 'content-staging');
if (!stagingDir.exists) {
  stagingDir.create({ intermediates: true });
}
const versesFile = new File(stagingDir, 'verses.json');
await versesFile.write(JSON.stringify(items));
// On version mismatch or after atomic SQLite commit completes:
if (stagingDir.exists) {
  stagingDir.delete();
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `playground: true/false` in `@nestjs/graphql` | `graphiql: boolean` (`playground` is deprecated alias) | `@nestjs/graphql` v14 | Use `graphiql: !isProd` + `ApolloServerPluginLandingPageDisabled()` |
| `apollo-server-express` | `@apollo/server` 5 + `@as-integrations/express5` | Apollo Server 5 / Nest 12 | Express 5 middleware compatibility |
| `FileSystem.writeAsStringAsync` (`expo-file-system`) | Object-oriented `File`, `Directory`, `Paths` classes | Expo SDK 54–58 | Cleaner sync/async API; legacy methods moved to `expo-file-system/legacy` |
| `@react-native-community/netinfo` | `expo-network` (`useNetworkState`, `getNetworkStateAsync`) | Expo SDK 52–58 | Official Expo-maintained hook & async API with zero extra third-party config |

**Deprecated/outdated:**
- `graphql-playground`: Removed in `@nestjs/graphql` v14.
- `graphql-depth-limit`: Unmaintained (2018); replaced by `@escape.tech/graphql-armor`.
- `nestjs-zod@5.6.0`: Does not support `@nestjs/core@12`.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Dokploy deployment target, temporary/production domain URLs, and UptimeRobot credentials will be configured by the owner during Phase 2 deployment tasks | Architecture / Environment | Backend builds and tests locally, while live deploy/uptime tasks pause at human checkpoint until owner provisions Dokploy app & domain |
| A2 | `node:24-slim` (`bun` + `tsc` + `esbuild` CJS bundle) handles all NestJS 12 + `@nestjs/apollo` 14 imports cleanly with `packages: 'external'` | Standard Stack / Pattern 2 | Verified conceptually via package exports; must be confirmed with a `docker build` + `docker run` smoke test calling `/health` and `/graphql` before Dokploy deploy |
| A3 | `expo-network` `isInternetReachable` can momentarily return `null` on cold boot before OS probe finishes (`isInternetReachable !== false` treats `isConnected && null` optimistically and lets the `fetch` fail/retry cleanly) | Code Examples | If `=== true` were required strictly, cold-start on Android could falsely show offline for 1–2s; using `isConnected && isInternetReachable !== false` avoids false negatives while `fetch` timeout handles captive portals |
| A4 | Physical `RMX5106` Android device and `iPhone 18 Pro` Xcode Simulator are available locally for Phase 2 + inherited Phase 1 Release verification (`D-13`) | Phase Requirements / D-13 | End-of-phase Release verification blocks if `RMX5106` is disconnected |

## Open Questions

1. **Public content schema fields beyond Phase 2 (`verses`, `names_of_god`, `blessings`):**
   - What we know: Phase 2 stores `verses` (`id`, `ref`, `text`, `textFemale`, `version`, `syncCols`), `names_of_god` (`id`, `name`/`title`, `text`, `textFemale`, `version`, `syncCols`), and `blessings` (`id`, `title`, `text`, `textFemale`, `verseRef`, `version`, `syncCols`). Phase 4 (`ME-04`, `ME-05`) reads them as rich-text Markdown cards.
   - What's unclear: Exact display ordering / `sortOrder` or `category` optional metadata that Sanity JSON export might later include.
   - Recommendation: Include nullable `sortOrder` (`integer`) and `tags` (`text` JSON array, nullable) columns now on the backend and mobile content tables so Phase 4 and later Sanity JSON imports don't require a schema migration just for ordering.

2. **Mobile `API_BASE_URL` configuration across local dev & Dokploy (`D-06`):**
   - What we know: `D-06` mandates env-var configuration (`API_BASE_URL` / `ADMIN_ORIGINS`). In Expo, `EXPO_PUBLIC_API_BASE_URL` is bundled at build time.
   - What's unclear: Whether local Release APK testing on `RMX5106` (`D-13`) will point at the live Dokploy HTTPS URL (recommended!) or local dev server.
   - Recommendation: Point `EXPO_PUBLIC_API_BASE_URL` at the deployed Dokploy HTTPS endpoint for Release APK / Simulator verification (`BE-06` + `HOME-06` + `HOME-07`), and document `.env.local` / `adb reverse tcp:3000 tcp:3000` for local backend dev.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend build/runtime & Vitest | ✓ | `v26.13.0` (`>=24`) | — |
| Bun | Workspace package install & scripts | ✓ | `1.4.2` | — |
| Docker CLI | Local `Dockerfile` verification (`BE-06`) | ✓ | `29.8.2` | — |
| Dokploy instance & domain | Live deployment (`BE-06`, `D-06`..`D-09`) | External | — | Checkpoint for owner Dokploy setup |
| UptimeRobot | Downtime alerting (`BE-08`, `D-08`) | External | — | Checkpoint for owner monitor hookup |
| Android `RMX5106` & Xcode Simulator | Mobile build + inherited `D-13` Release checks | External/Local | Checked in Phase 1 (`iPhone 18 Pro` / `RMX5106`) | Re-verify device connection at verification |

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | `google-auth-library` `OAuth2Client.verifyIdToken` (`audience: [webClientId, iosClientId]`, `email_verified === true`) on `submitSuggestion` (`D-10`) |
| V3 Session Management | no *(stateless per-request ID token in Phase 2; admin JWT added in Phase 3)* | `Authorization: Bearer <googleIdToken>` header verified per mutation call |
| V4 Access Control | yes | `GoogleAuthGuard` required on `submitSuggestion`; public reads (`contentDelta`, `/snapshots/:type`, `/health`) are strictly read-only |
| V5 Input Validation | yes | `ZodValidationPipe` backed by `@roi/shared` (`personalizedTextSchema`, `kind` enum, `sinceVersion >= 1`, field max lengths); `@escape.tech/graphql-armor`; `100kb` JSON body limit |
| V6 Cryptography | yes | Official `google-auth-library` RSA/JWKS verification; Node `crypto` via `@roi/shared` `uuidv7`; TLS via Dokploy Traefik |

### Known Threat Patterns for NestJS + Apollo 5 + SQLite

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Suggestion spam / quota bypass via IP rotation | Denial of Service / Tampering | Durable SQLite 10/day/Google-account count on `(google_sub, created_at)` + `@nestjs/throttler` (`GqlThrottlerGuard`) + `app.set('trust proxy', 1)` |
| GraphQL deep nesting, alias batching, cost exhaustion | Denial of Service | `@escape.tech/graphql-armor` (`maxDepth: 6`, `costLimit`, `maxAliases: 5`, `maxDirectives: 5`, `maxTokens: 500`, `blockFieldSuggestions`) |
| Production schema discovery | Information Disclosure | `introspection: false`, `graphiql: false`, `ApolloServerPluginLandingPageDisabled()`, `includeStacktraceInErrorResponses: false` when `NODE_ENV=production` |
| Unauthorized browser cross-origin calls | Elevation of Privilege / CSRF | `enableCors` strictly allowlisting `ADMIN_ORIGINS` env var (deny-all if empty in prod); `helmet()` headers |
| SQL injection | Tampering | Drizzle ORM parameterized queries everywhere; `VACUUM INTO` path escaped & derived strictly from server config/timestamp |
| Malformed `{token}` injection in suggestions | Tampering / Injection | Validate `text` and `textFemale` with `personalizedTextSchema` from `@roi/shared` rejecting any `{...}` other than `{الاسم}` |

## Sources

### Primary (HIGH confidence)
- In-repo verified files: `package.json`, `bunfig.toml`, `backend/package.json`, `shared/package.json`, `shared/src/schemas.ts`, `shared/src/index.ts`, `app/package.json`, `app/constants/app.ts`, `app/features/db/schema.ts`, `app/features/db/__tests__/schema.test.ts`, `app/features/db/__tests__/migrate.test.ts`, `app/__tests__/guards.test.ts`, `app/app/_layout.tsx`, `app/app/index.tsx`, `app/node_modules/expo/bundledNativeModules.json`, `.planning/config.json`
- npm registry (`npm view` & `gsd-tools query package-legitimacy check`) on `2026-11-25` for all 32 candidate packages

### Secondary (MEDIUM confidence)
- NestJS official docs (`docs.nestjs.com`) — GraphQL v14 `graphiql` & `introspection`, `GqlExecutionContext` + `ThrottlerGuard`, `useBodyParser`, `trust proxy`, `helmet`, Vitest `unplugin-swc` (`emitDecoratorMetadata`)
- Apollo Server 5 docs (`apollographql.com`) — `ApolloServerPluginLandingPageDisabled` (`@apollo/server/plugin/disabled`)
- Escape GraphQL Armor (`escape.tech`) — `ApolloArmor` options (`maxDepth`, `costLimit`, `maxAliases`, `maxDirectives`, `maxTokens`, `blockFieldSuggestions`)
- Google Auth Library (`github.com/googleapis/google-auth-library-nodejs`) — `OAuth2Client.verifyIdToken` `audience: string[]`
- Expo SDK 58 docs (`docs.expo.dev`) — `expo-file-system` (`File`, `Directory`, `Paths`), `expo-network` (`useNetworkState`, `getNetworkStateAsync`)
- SQLite official docs (`sqlite.org`) & Dokploy docs (`docs.dokploy.com`) — `VACUUM INTO` in WAL mode, `-wal`/`-shm` cleanup on restore, named Docker volumes for volume backups
- React Native networking (`github.com/facebook/react-native`) — Android OkHttp `Accept-Encoding: gzip` manual-header gotcha

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every version, peer dependency, and postinstall script verified directly against npm and `bundledNativeModules.json`
- Architecture: HIGH — aligns directly with Phase 1's tested Drizzle/MMKV/static-guard contracts and `02-CONTEXT.md`
- Pitfalls: HIGH — critical repo guards (`schema.test.ts`, `guards.test.ts`), NestJS/SWC DI metadata, and OkHttp gzip behaviors verified directly

**Research date:** 2026-11-25
**Valid until:** 2026-12-25 (30 days; stable core stack)
