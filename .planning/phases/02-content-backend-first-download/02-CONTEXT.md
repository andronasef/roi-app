# Phase 2: Content Backend & First Download - Context

**Gathered:** 2026-11-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up the NestJS + `@nestjs/graphql` + Drizzle/SQLite backend in `backend/` with pre-built gzipped snapshots per content type (`BE-01`), global monotonic `contentVersion` delta sync with tombstones (`BE-02`), Google-authenticated `pending` suggestions (`BE-03`, updated per owner decision), API hardening & audit log (`BE-04`, `BE-05`), Docker + Dokploy deployment with persistent volume, tested backup/restore, and `/health` uptime monitoring (`BE-06`), plus the mobile resumable transactional first-download & offline gate (`HOME-06`, `HOME-07`).

Per owner decision during discussion (`2026-11-25`), **Sanity-specific integration (`BE-07` Sanity API/schema)** is excluded from Phase 2 implementation; Phase 2 uses clean local seed/JSON fixtures (with an optional local `--dry-run` JSON seed script) and the owner will export JSON from Sanity separately later.

Additionally, **Phase 2 end-of-phase verification inherits the remaining Phase 1 Release & Firebase checks** moved per owner request (`2026-11-25`) — see `.planning/phases/01-foundation-native-spike/01-VERIFICATION.md` and `01-SPIKE-DECISIONS.md`.

</domain>

<decisions>
## Implementation Decisions

### First Download & Offline Gate (`HOME-06`, `HOME-07`)
- **D-01:** **First-download progress UI:** Display a calm, warm progress bar with the current human-readable stage name (الآيات، أسماء الله، البركات) in Egyptian Arabic without technical numbers, byte counters, or percentages.
- **D-02:** **Resumable & transactional download:** Persist each downloaded content-type snapshot (`verses`, `names_of_god`, `blessings`) to a staging/checkpoint location as it completes. If connectivity drops or the user closes the app mid-download, auto-resume from the last completed section as soon as connectivity returns, alongside a manual "جرّب تاني" button. Never commit partial content into the active SQLite tables until all 3 content types have downloaded and verified together inside a single atomic SQLite transaction (if server `contentVersion` advances mid-batch, restart the batch cleanly).
- **D-03:** **Silent background delta sync (`BE-02`):** After the initial download completes, subsequent app opens work immediately offline and silently check for delta updates by sending `lastContentVersion` when online, throttled (e.g., max once every ~6 hours) with zero interruption or toast noise.
- **D-04:** **Offline first-launch screen & Phase 2 completion screen:**
  - When offline on a fresh install (no downloaded content yet), show a warm Egyptian Arabic message explaining internet is needed once to download the library (`"محتاجين إنترنت أول مرة بس عشان ننزّل لك مكتبة روعي، وبعدها كل حاجة شغالة أوفلاين"`) with a clear "جرّب تاني" button (`HOME-06`).
  - Once first download succeeds at the end of Phase 2 (before Phase 4 builds Onboarding & Home), land on a clean **"المكتبة جاهزة"** confirmation screen displaying the downloaded counts (الآيات، أسماء الله، البركات) in Arabic-Indic digits while preserving the existing theme switcher and dev spike link (`01-08`, `01-14`).

### Seed Data & Sanity Deferral (`BE-07` Scope Override)
- **D-05:** **Skip Sanity API & Sanity schema work in Phase 2:** Owner explicitly instructed not to build Sanity API fetching, Sanity credentials wiring, or custom Sanity schema mapping in Phase 2; owner will export JSON from Sanity later and handle importing it separately after Phase 2. Phase 2 seeds and tests the backend/mobile flow using clean local Arabic seed/JSON fixture data (`@roi/shared` fixtures + local sample verses, names of God, blessings). *(Keep any generic JSON seed/import CLI idempotent with `--dry-run` + audit log entry if included for local testing, without Sanity dependencies.)*

### Hosting, Hardening & Operations on Dokploy (`BE-04`, `BE-06`)
- **D-06:** **Flexible domains & CORS via environment variables:** Configure `API_BASE_URL` (mobile / client config) and `ADMIN_ORIGINS` (backend CORS allowlist) purely via environment variables so Dokploy temporary domains work immediately and final production domains swap in with a config change.
- **D-07:** **SQLite persistence & backup/restore verification:** Store backend SQLite DB and pre-built gzipped snapshots on a Docker persistent volume in Dokploy, include a safe SQLite online-backup & restore script (using SQLite backup API / `VACUUM INTO` compatible with WAL mode), and test an actual backup-and-restore drill before closing Phase 2 (structured cleanly to attach Dokploy Volume Backups / S3 later).
- **D-08:** **Uptime monitoring & health endpoint:** Expose a `/health` endpoint verifying SQLite readability and snapshot availability, ready to connect with a free external monitor such as UptimeRobot for email/Telegram downtime alerts (`BE-06`).
- **D-09:** **Dokploy Git deploy & production GraphQL lock:** Deploy directly from the Git repository to Dokploy using a `backend/` `Dockerfile`. Disable GraphQL Playground and introspection whenever `NODE_ENV=production` (`BE-04`), keeping them enabled only in local development.

### Suggestion Auth, Validation & Rate Limits (`BE-03` Override)
- **D-10:** **Google-authenticated suggestions replacing anonymous device ID (`BE-03` override):** — **Reversibility:** costly — changes `suggestions` schema, GraphQL auth guard, and store privacy declarations (`REL-02`/`REL-03`). Only users signed in with Google may call `submitSuggestion`. The backend MUST verify the submitted Google ID token (using `roi-app-515721` client IDs) and store `googleSub` + `email` on the `pending` suggestion row so admins in Phase 3 can see who submitted it and prevent spam. Personal app data (prayers, gratitude, favorites, personal items, memorization) still NEVER leaves the device to our servers (`SYNC-07` intact).
- **D-11:** **Generous rate limit in Phase 2:** Enforce up to **10 suggestions per day per Google account** (`BE-03`/`BE-04`), without adding an account blocklist/ban system in Phase 2.
- **D-12:** **Suggestion payload & shared validation:** `submitSuggestion` supports all three content kinds (`verse`, `name_of_god`, `blessing`) using the unified fields (`kind`, `title`/`ref`, `text`, optional `textFemale` if applicable) validated against `personalizedTextSchema` from `@roi/shared` before persisting as `pending`.

### Inherited Phase 1 Verification Queue (End of Phase 2)
- **D-13:** Before marking Phase 2 complete (`02-VERIFICATION.md` / UAT), also execute the Phase 1 Release & Firebase Console verification queue moved here by owner (`01-16-SUMMARY.md`, `01-VERIFICATION.md`): Android Release APK (`app-release.apk`) on `RMX5106`, local Xcode `Release` Simulator build (`iPhone 18 Pro`) + `otool -L` `AdSupport` check, Firebase Console Release triggers (`spike_test`, Test Crash, Sentinel `E_UNCAUGHT`), and `01-REVIEW-FIX.md` (`WR-01`, `WR-02`, `WR-03`, `WR-06`, `WR-05`) human checks.

### Claude's Discretion
- Exact SQLite/Drizzle backend table definitions (beyond `syncCols`/monotonic `contentVersion`/audit log/Google submitter columns), exact gzip snapshot binary/JSON envelope format, NestJS module layout, throttling windows per public read query, GraphQL depth/complexity thresholds, and Dokploy `Dockerfile` base image / multi-stage build details.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — vision, constraints, privacy rules, backend & mobile stack specs
- `.planning/REQUIREMENTS.md` — `BE-01`..`BE-07`, `HOME-06`, `HOME-07`, `FND-06`, `FND-08`, `REL-01`..`REL-03`
- `.planning/ROADMAP.md` — Phase 2 goal, success criteria, and inherited Phase 1 verification note
- `.planning/STATE.md` — owner decisions (Saturday week start, Arabic-Indic digits) and active pending todos

### Phase 1 Foundation Decisions & Code Contracts
- `.planning/phases/01-foundation-native-spike/01-CONTEXT.md` — `D-01`..`D-14` monorepo, `@roi/shared`, UUIDv7, epoch-ms UTC, Drizzle migration fixture rules
- `.planning/phases/01-foundation-native-spike/01-SPIKE-DECISIONS.md` — settled stack outcomes (`bun` isolated linker, `amiri`, Google OAuth without Firebase Auth, `AD_ID`, dev-route gating, Phase 2 carry-over checks)
- `.planning/phases/01-foundation-native-spike/01-VERIFICATION.md` — exact list of Phase 1 Release checks inherited by Phase 2 end-of-phase verification
- `.planning/phases/01-foundation-native-spike/01-01-SUMMARY.md` & `01-02-SUMMARY.md` — `com.increasinglabs.roi`, `roi-app-515721` Google Cloud OAuth Client IDs, no-EAS / no-physical-iPhone constraints

### Shared & Mobile Contracts
- `shared/src/schemas.ts` — `syncRowSchema`, `personalizedTextSchema` (enforcing `{الاسم}`-only brace token)
- `shared/src/index.ts` — shared exports consumed by `backend` and `app` under `bun` isolated linker
- `app/features/db/schema.ts` — mobile Drizzle schema (`syncCols`, user tables; public content + sync state tables connect here)
- `app/app/_layout.tsx` & `app/app/index.tsx` — root migration gate (`useMigrations`) and current home landing screen
- `app/constants/app.ts` — `GOOGLE_OAUTH`, `ROUTES`, `SCHEME`
- `backend/package.json` — current `@roi/shared` workspace setup

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`@roi/shared` (`shared/src/`):** Already exports `syncRowSchema`, `personalizedTextSchema`, `normalizeArabic()`, `matches()`, `toArabicDigits()`, `formatArabicDate()`, `newId()` (UUIDv7), `TORTURE_FIXTURES`. Backend (`backend/package.json`) and Mobile (`app/package.json`) already consume it via `"@roi/shared": "workspace:*"` with zero build step.
- **`app/features/db/client.ts` & `app/app/_layout.tsx`:** Root `useMigrations(db, migrations)` gate and WAL-mode `expo-sqlite` client are already in place; public content tables and atomic first-download state plug cleanly behind/after the migration gate.
- **`app/constants/app.ts` (`GOOGLE_OAUTH`):** Already holds `webClientId` and `iosClientId` for GCP project `roi-app-515721`, usable for verifying Google ID tokens on the backend (`D-10`).
- **Warm paper theme & `<Scripture>` (`app/global.css`, `app/features/scripture/scripture.tsx`):** Phase 2 offline gate and progress screen reuse these existing NativeWind tokens and RTL-safe components directly.

### Established Patterns
- **Bun isolated linker (`bunfig.toml`):** Any new runtime/plugin dependency needed directly by `backend/` or `app/` (especially NestJS/GraphQL/Drizzle/Zod/upload/crypto adapters) must be explicitly declared in that workspace's `package.json`.
- **Drizzle migrations & fixtures (`D-14`, `01-11`):** Every schema change in `app/features/db/` updates Drizzle migrations (`app/drizzle/`) and checked-in SQLite migration fixture tests (`app/features/db/__tests__/migrate.test.ts`).
- **No-EAS / Local builds (`01-02`, `01-15`, `01-16`):** Mobile verification builds run locally via Xcode Simulator (`iPhone 18 Pro`) and Gradle APK (`RMX5106`).

### Integration Points
- **`backend/`:** Currently only a workspace shell (`backend/package.json` + `shared.test.ts` smoke test). Needs NestJS + `@nestjs/graphql` + Drizzle SQLite + Docker + Dokploy setup.
- **`app/app/_layout.tsx` & `app/app/index.tsx`:** Needs first-download gate (offline retry vs resumable download progress) before/above normal app entry, landing on the `"المكتبة جاهزة"` summary view for Phase 2.
- **`app/services/telemetry.ts`:** Telemetry stays strictly opt-in and parameterless on `ALLOWED_EVENTS` (may add generic non-PII download lifecycle events only if allowlisted; never log content or user info).

</code_context>

<specifics>
## Specific Ideas

- Offline screen tone should be reassuring and distinctly Egyptian Arabic (`"محتاجين إنترنت أول مرة بس عشان ننزّل لك مكتبة روعي، وبعدها كل حاجة شغالة أوفلاين"` + `"جرّب تاني"`).
- Resumable download progress UI shows stage names (`الآيات`, `أسماء الله`, `البركات`) cleanly rather than raw byte counts.
- Suggestions (`submitSuggestion`) require a verified Google Account and store the submitter's Google account with the suggestion rather than anonymous device IDs (`D-10`).

</specific>

<deferred>
## Deferred Ideas

- **Sanity one-time data import (`BE-07` Sanity source):** Deferred outside Phase 2 implementation per owner instruction — owner will export JSON from Sanity separately and handle the one-time import after Phase 2.
- **Google Sign-In screen at end of Onboarding (`HOME-01` / `SYNC-01`):** Owner requested adding an optional, skippable "ادخول باستخدام Google" screen as the final step of Onboarding so signed-in users immediately have Drive sync and suggestion privileges ready -> **Phase 4 (Onboarding) & Phase 8 (Drive Sync)**.
- **Privacy Policy, Store Data Safety & Apple App Review Guideline 4.8 check (`REL-02`, `REL-03`):** Document Google `email`/`googleSub` retention when a user submits a suggestion, and verify whether Sign in with Apple / explanatory review notes are required for iOS -> **Phase 9**.

</deferred>

---

*Phase: 02-content-backend-first-download*
*Context gathered: 2026-11-25*
