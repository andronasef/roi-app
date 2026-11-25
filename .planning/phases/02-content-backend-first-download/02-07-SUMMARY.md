---
phase: 02-content-backend-first-download
plan: 07
subsystem: infra
tags: [sqlite, vacuum-into, backup, restore, esbuild, tsc, docker, node24, dokploy, uptimerobot]

requires:
  - phase: 02-content-backend-first-download
    provides: Hardened NestJS/Apollo API & database module (`02-02`, `02-03`, `02-05`), mobile sync & UI gate (`02-04`, `02-06`), idempotent seed CLI (`02-08`)
provides:
  - WAL-safe `VACUUM INTO` online SQLite backup CLI (`runBackup`) and integrity-verified restore CLI (`runRestore`) in `backend/src/scripts/`
  - Two-step `tsc` (`emitDecoratorMetadata`) + `esbuild` CJS bundle pipeline (`backend/tsconfig.build.json`, `backend/scripts/build.mjs`) emitting `dist/{main,seed,backup,restore}.cjs`
  - Multi-stage `node:24-slim` + `bun` Docker image (`backend/Dockerfile`, `backend/Dockerfile.dockerignore`) preserving isolated-linker symlinks and running as non-root `USER node` against `/data`
  - Production operations & Dokploy/UptimeRobot runbook plus consolidated End-of-Phase human verification batch (`.planning/phases/02-content-backend-first-download/02-OPS-DEPLOY-RUNBOOK.md`)
affects: [03-admin-panel, 09-teaching-layers-store-release]

actuals:
  tasks: 3
  commits: 2
  plan_head_before: e62b311
  plan_head_after: pending

key-files:
  created:
    - backend/src/scripts/backup.ts
    - backend/src/scripts/restore.ts
    - backend/src/__tests__/backup-restore.test.ts
    - backend/tsconfig.build.json
    - backend/scripts/build.mjs
    - backend/Dockerfile
    - backend/Dockerfile.dockerignore
    - .planning/phases/02-content-backend-first-download/02-OPS-DEPLOY-RUNBOOK.md
    - .planning/phases/02-content-backend-first-download/02-07-SUMMARY.md
  modified:
    - .planning/STATE.md

key-decisions:
  - "Compiled backend via `tsc -p tsconfig.build.json` (`emitDecoratorMetadata`) before bundling with `esbuild` (`packages: 'external'` + `@roi/shared` onResolve plugin) so NestJS GraphQL `design:paramtypes` metadata and `@roi/shared` extensionless imports stay intact in CJS"
  - "Preserved Bun isolated-linker symlinks in `backend/Dockerfile` by copying both `/app/node_modules` (containing `.bun/`) and `/app/backend/node_modules` from the Node-24+Bun `prod-deps` stage into `runner`"
  - "Used `VACUUM INTO` + `PRAGMA integrity_check` for online WAL-safe backups and atomic temp-copy + `-wal`/`-shm` sidecar unlink on restore"

patterns-established:
  - "Backend production bundles emit to `backend/dist/*.cjs` via two-stage `tsc` + `esbuild` without requiring runtime TypeScript compilation"
  - "Dokploy deployments mount a named Docker volume at `/data` (not a bind mount) so scheduled S3 backups and `backup.cjs` snapshots operate natively"

requirements-completed: [BE-04, BE-06]

duration: 20min
completed: 2026-11-25
status: complete
---

# Phase 2 Plan 07: Backend Production Packaging, Persistence & Operations Runbook Summary

**Shipped WAL-safe `VACUUM INTO` backup/restore scripts, the `tsc` (`emitDecoratorMetadata`) + `esbuild` CJS bundling pipeline, the multi-stage `node:24-slim` Docker image verified end-to-end against `/data`, and the consolidated Dokploy/UptimeRobot & End-of-Phase verification runbook**

## Accomplishments

- **Task 1 (`682b198`):** Implemented `runBackup` (`backend/src/scripts/backup.ts`) with `VACUUM INTO`, `PRAGMA integrity_check`, and retention pruning, `runRestore` (`backend/src/scripts/restore.ts`) with pre-restore integrity verification, atomic replacement, and stale `-wal`/`-shm` cleanup, and verified via live WAL drill in `backend/src/__tests__/backup-restore.test.ts`.
- **Task 2:** Created `backend/tsconfig.build.json`, `backend/scripts/build.mjs`, `backend/Dockerfile`, and `backend/Dockerfile.dockerignore`; verified `dist/{main,seed,backup,restore}.cjs` preserve `design:paramtypes`, built `roi-backend:smoke`, seeded `/data` (`38` rows, `contentVersion: 1`), backed up via `dist/backup.cjs` (`114688` bytes), confirmed `/health` (`"snapshotsReady":true`), `/snapshots/verses` (`"ps23-1"`), `contentDelta`, and confirmed `{ __schema { queryType { name } } }` is blocked in `NODE_ENV=production`.
- **Task 3:** Published `.planning/phases/02-content-backend-first-download/02-OPS-DEPLOY-RUNBOOK.md` (Dokploy setup, named `/data` volume, `DOMAIN_SWAP`, UptimeRobot monitor, `[SUS]` package transparency, and the consolidated End-of-Phase human verification batch including deferred Phase 1 checks).

## Verification Checks

- `bun run test` -> **26 test files, 158 tests passed** (`@roi/shared`, `@roi/backend`, `@roi/app`, `@roi/admin`).
- `bun run typecheck` -> **PASS** (`tsc -p tsconfig.json && tsc -p app/tsconfig.json`).
- `cd app && bun run lint` (`expo lint --max-warnings 0`) -> **PASS**.
- `cd app && bunx expo export --platform ios --output-dir dist/ios && bunx expo export --platform android --output-dir dist/android` -> **PASS** (`4116` Android modules exported).
- `apksigner verify --print-certs app/android/app/build/outputs/apk/release/app-release.apk` -> confirmed `V2 Signer: certificate DN: CN=andrew nasef, OU=fanqish, O=fanqish, L=menia, ST=menia, C=eg`.
- Docker container smoke test (`roi-backend:smoke` + `roi-smoke-data` volume) -> **PASS** (`seed.cjs`, `backup.cjs`, `HEALTH_OK`, `SNAPSHOT_OK`, `DELTA_OK`, `INTROSPECTION_BLOCKED_OK`).

## Next Phase Readiness

- All 8 plans of Phase 02 (`02-01`..`02-08`) are implemented and verified automatically.
- Ready for the consolidated End-of-Phase human verification batch documented in `.planning/phases/02-content-backend-first-download/02-OPS-DEPLOY-RUNBOOK.md` (Dokploy deploy + UptimeRobot + live mobile first-download/offline + Phase 1 deferred Release/Firebase checks).

---
*Phase: 02-content-backend-first-download*
*Completed: 2026-11-25*
