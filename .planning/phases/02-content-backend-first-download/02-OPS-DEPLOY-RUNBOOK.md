# Phase 2 Operations, Deployment & End-of-Phase Verification Runbook

This runbook documents production deployment of `@roi/backend` on Dokploy (`BE-06`, `D-06`..`D-09`) and the consolidated End-of-Phase human verification batch (`D-13`, including Phase 1's deferred Release/Firebase items and `02-RESEARCH.md` `[SUS]` package transparency).

---

## 1. Dokploy Git Deployment (`BE-06`, `D-06`, `D-09`)

### Service & Build Settings
- **Build Type:** `Dockerfile`
- **Build Context:** `.` (monorepo root, required so `backend/Dockerfile` can copy root `package.json`, `bunfig.toml`, `bun.lock`, `tsconfig.json`, and `shared/`)
- **Dockerfile Path:** `backend/Dockerfile` *(BuildKit automatically reads `backend/Dockerfile.dockerignore`)*
- **Runtime Port:** `3000` (`HEALTHCHECK` polls `http://127.0.0.1:3000/health`)

### Persistent Storage (Named Volume Only)
- Mount a **Named Docker Volume** (for example `roi-backend-data`) at `/data`.
- **Do NOT use a host bind mount:** Dokploy's scheduled S3 Volume Backups only back up Docker named volumes natively.

### Required Environment Variables
Validated at startup by `backend/src/config/env.ts`:

| Variable | Example / Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Required. Disables GraphQL introspection and enables production HTTP hardening (`helmet`, CORS restriction, throttling). |
| `PORT` | `3000` | HTTP listen port exposed by the container. |
| `DATA_DIR` | `/data` | Directory holding `roi-content.sqlite` (`-wal`/`-shm`) and generated snapshot files. |
| `ADMIN_ORIGINS` | `https://admin.example.com` | Comma-separated origin allowlist for CORS on admin mutations (empty denies cross-origin writes). |
| `GOOGLE_CLIENT_IDS` | *(optional override)* | Comma-separated GCP OAuth client IDs for `GoogleAuthGuard` (defaults to Web + iOS client IDs in GCP `roi-app-515721`). |

### Initial Seed & Backup / Restore Commands
Run inside the running container (`/app/backend`, running as non-root `node`):

1. **Dry-run verify seed bundle:**
   ```sh
   node dist/seed.cjs --dry-run
   ```
2. **Execute initial idempotent seed & build initial gzipped snapshots:**
   ```sh
   node dist/seed.cjs
   ```
3. **Online WAL-safe backup (Dokploy Scheduled Task / Cron):**
   ```sh
   node dist/backup.cjs --db /data/roi-content.sqlite --out "/data/backups/roi-$(date +%Y%m%d-%H%M%S).sqlite" --keep 7
   ```
   Uses `VACUUM INTO` + `PRAGMA integrity_check` (`D-07`) without stopping the API container.
4. **Disaster-recovery restore (stop API container first, or run via temporary container mounting the volume):**
   ```sh
   node dist/restore.cjs --backup /data/backups/<verified-backup>.sqlite --db /data/roi-content.sqlite
   ```
   Verifies backup `PRAGMA integrity_check === 'ok'`, atomically replaces `roi-content.sqlite`, and removes stale `-wal`/`-shm` sidecars before starting the API container again.
   **Version lineage:** a restore rewinds `content_version` to the backup's value. The mobile delta sync detects a client that is ahead of the server and re-runs the first download, but edits made after the restore reuse version numbers other clients may already hold, so keep restores rare and finish them before accepting new admin edits.

---

## 2. Domain Swap (`D-06`)

To switch from a staging/nip.io URL to the permanent production domain without changing backend source code:
1. Update `ADMIN_ORIGINS` in Dokploy service environment variables to the new admin origin(s) and redeploy/restart the container.
2. Point the mobile app's `EXPO_PUBLIC_API_BASE_URL` environment variable to `https://<new-domain>` for subsequent mobile builds (`app/services/api.ts`).
3. Update the UptimeRobot target URL below to match the new domain.

---

## 3. UptimeRobot Health Monitor (`D-08`, `BE-06`)

Configure one HTTPS monitor in **UptimeRobot**:
- **Monitor Type:** HTTP(s) — Keyword
- **URL:** `https://<dokploy-domain>/health`
- **Monitoring Interval:** `5 minutes`
- **Keyword Check:** **Keyword Exists** → `"snapshotsReady":true`
- **Alert Contacts:** Wire email and/or Telegram notification contact so downtime or snapshot readiness failures alert immediately.

---

## 4. End-of-Phase Consolidated Human Verification Batch (`D-13`)

### A. Package Legitimacy Audit Transparency (`[SUS]` `"too-new"` Official Nov 2026 Releases)
Per `02-RESEARCH.md`, **zero `[SLOP]` packages** exist. The following official first-party packages were flagged `[SUS]` solely due to November 2026 release timestamps (`02-01` & `02-04`, exact-pinned in `package.json` and `bun.lock`):
- **Backend runtime (`backend/package.json`):** `@nestjs/core@12.6.1`, `@nestjs/common@12.6.1`, `@nestjs/platform-express@12.6.1`, `@nestjs/config@12.1.1`, `@nestjs/graphql@14.2.1`, `@nestjs/apollo@14.2.1`, `@apollo/server@5.5.2`, `graphql@16.15.0`, `better-sqlite3@13.2.0`, `google-auth-library@11.3.4`, `@nestjs/throttler@6.8.0`
- **Backend dev/test (`backend/package.json`):** `@nestjs/testing@12.6.1`, `supertest@7.3.2`, `@swc/core@1.16.22` (`postinstall.js` platform binary loader)
- **Mobile (`app/package.json`):** `expo-network@~58.0.5`, `expo-file-system@~58.0.14`, `@tanstack/react-query@5.108.4`

### B. Live Backend & Phase 2 Mobile First-Download / Offline Flow (`BE-06`, `HOME-06`, `HOME-07`)
1. Deploy `backend/Dockerfile` to Dokploy with named volume `/data`, run `node dist/seed.cjs`, and verify `curl -sf https://<dokploy-domain>/health` returns `"snapshotsReady":true`.
2. Attach UptimeRobot keyword monitor (`"snapshotsReady":true`) and confirm first green check.
3. Build/run the mobile app pointed at `EXPO_PUBLIC_API_BASE_URL=https://<dokploy-domain>`:
   - **Cold launch (`HOME-06`):** Confirm Arabic loading gate appears, downloads `verses`, `names_of_god`, and `blessings` snapshots, shows Arabic-Indic counts, and transitions cleanly into `LibraryReadyView`.
   - **Interrupt & resume (`BE-06`):** Kill the app mid-download or toggle network off and back on; confirm retry resumes cleanly without partial/corrupt SQLite state.
   - **Offline airplane mode (`HOME-07`):** Enable Airplane Mode and relaunch; confirm the library opens immediately with zero network errors and displays cached counts.
   - **Silent 6-hour delta sync:** Verify background `contentDelta` sync updates modified/tombstoned rows without blocking UI.

### C. Inherited Phase 1 Release & Firebase Verification (`01-VERIFICATION.md`, `01-REVIEW-FIX.md`)
1. **Android Release APK (`RMX5106`):** Install latest `app/android/app/build/outputs/apk/release/app-release.apk` (owner-signed via `app/key.jks`), open `roi://spike`, confirm `RELEASE_RESULT android pass=8 fail=0` in `adb logcat` (verifying Drizzle `.sql` release migrations), Google Sign-In with Release OAuth client, home-screen widget update + tap banner, and Amiri 5-step sizing on `roi://torture`.
2. **iOS Release Simulator (`iPhone 18 Pro`):** Build local Xcode `Release` configuration with `EXPO_PUBLIC_DEV_TOOLS=1`, capture `RELEASE_RESULT ios pass=8 fail=0` from element tree/console, and run `otool -L` on the Release app binary to confirm `AdSupport.framework` is not linked.
3. **Firebase Release Telemetry & Scrubbing (`REL-01`, `WR-03`, `WR-06`):** Enable consent switch (persists via MMKV), enable Android DebugView (`adb shell setprop debug.firebase.analytics.app com.increasinglabs.roi`), send `spike_test`, trigger Test Crash + relaunch, trigger Sentinel Error (`throwSpikeSentinelError()`) + relaunch, and confirm in Firebase Console (`Events`/`DebugView` + `Crashlytics`) that Crashlytics shows only `E_UNCAUGHT` with zero Arabic/sentinel text and zero user ID/properties.
4. **Code-review logic & policy checks (`01-REVIEW-FIX.md`):** Confirm `WR-01` (`mergeRecords` key-order invariance), `WR-02` (`personalize()` newline preservation), `WR-03` (release-only scrubber), `WR-06` (consent persistence/error rollback), and `WR-05` (`spike_widget_count` cleanup at sign-off).
