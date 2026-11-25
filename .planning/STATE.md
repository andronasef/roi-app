---
gsd_state_version: "1.0"
current_phase: 02
current_phase_name: content-backend-first-download
status: planning
stopped_at: Completed 02-06-PLAN.md
last_updated: "2026-11-25T13:21:57.038Z"
last_activity: 2026-11-25
last_activity_desc: Phase 01 closed (01-16-SUMMARY, 01-SPIKE-DECISIONS, remaining Release checks moved to end of Phase 2)
state_head: c6bbb34c891178027bec6934a724d48206bf771a
progress:
  total_phases: 9
  completed_phases: 1
  total_plans: 24
  completed_plans: 22
  percent: 11
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-11-24)

**Core value:** It remembers for you. A busy, forgetful, God-loving person opens the app and it tells them what's due today (verses to review, who to pray for, tonight's gratitude) without guilt.
**Current focus:** Phase 02 — Content Backend & First Download

## Current Position

Phase: 02 (content-backend-first-download) — IN PROGRESS
Plan: 7 of 8
Status: Executing plan 02-01
Last activity: 2026-11-25 — Closed Phase 01 (deferred Release/Firebase checks to end of Phase 2)

Progress: [█░░░░░░░░░] 11%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: -
- Total execution time: 0.0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 01 P03 | 3 min | 2 tasks | 12 files |
| Phase 01 P04 | 3 min | 3 tasks | 9 files |
| Phase 01 P05 | 2 min | 2 tasks | 8 files |
| Phase 01 P06 | 7 min | 2 tasks | 12 files |
| Phase 01 P07 | 4 min | 2 tasks | 14 files |
| Phase 01 P08 | 8 min | 2 tasks | 13 files |
| Phase 01 P09 | 6 min | 2 tasks | 25 files |
| Phase 01 P10 | 5 min | 2 tasks | 7 files |
| Phase 01 P11 | 3 min | 3 tasks | 13 files |
| Phase 01 P12 | 3 min | 2 tasks | 6 files |
| Phase 01 P13 | 3 min | 2 tasks | 9 files |
| Phase 01 P14 | 5 min | 3 tasks | 9 files |
| Phase 02 P01 | 4 min | 2 tasks | 11 files |
| Phase 02 P02 | 2min | 2 tasks | 9 files |
| Phase 02 P08 | 4min | 2 tasks | 11 files |
| Phase 02 P04 | 5 min | 3 tasks | 12 files |
| Phase 02-content-backend-first-download P03 | 8min | 2 tasks | 10 files |
| Phase 02-content-backend-first-download P06 | 5min | 2 tasks | 7 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Phase 1 carries the real-device native spike (FND-09) and the sync-ready schema (UUID, timestamps, tombstones, event rows) so nothing is retrofitted later
- [Roadmap]: Backend, admin, widgets and Drive stay as separate phases; Phase 3 can run in parallel with Phases 4-5, and Phases 7 and 8 are independent
- [Roadmap]: Mobile first-download client (HOME-06/07) ships with the backend in Phase 2 so that phase ends in a user-visible result
- [Roadmap]: HOME-04 and SET-02..04 map to Phase 6, where all four tools exist
- [Owner]: Week starts Saturday; Arabic-Indic digits; "memorized" = 30+ days stability or manual mark; Drive offered after first win; app lock and manual export are in v1
- [Phase 01]: Selected `'amiri'` (`SCRIPTURE_FONT_DEFAULT = 'amiri'`) in `app/constants/theme.ts`; no EAS / no physical iPhone (`01-02`, `01-15`, `01-16`)
- [Phase 02]: Exported createSnapshotEnvelopeSchema factory and discriminated-union snapshotEnvelopeSchema from @roi/shared; configured root tsconfig.json typeRoots for isolated-linker @types/node
- [Phase 02]: Extract unexported publicContentCols() helper in app/features/db/schema.ts to share syncCols() + common public content columns across verses, names_of_god, and blessings
- [Phase 02]: Key sync_meta via syncCols().id = CONTENT_SYNC_META_ID ('content_sync') with no redundant key column
- [Phase 02]: Pass nowMs and node:crypto randomBytes into @roi/shared uuidv7() for deterministic audit_log IDs in seed transactions
- [Phase 02]: Guard seed CLI entrypoint with VITEST check, require.main === module for CJS, and import.meta.url fallback for ESM
- [Phase 02]: Extract shared upsertContentBatch and upsertSyncMeta helpers into app/features/sync/db-ops.ts so first-download and delta-sync share one transactional SQLite write path
- [Phase 02]: Guard __DEV__ with typeof check and use relative ../app.json in app/constants/app.ts so constants resolve cleanly in both Metro and Node/Vitest
- [Phase 02-content-backend-first-download]: Use GraphQL Float for epoch-ms timestamps in ContentDelta DTOs and preserve HTTP 429 status for GqlThrottlerGuard via Apollo willSendResponse plugin + formatError
- [Phase 02-content-backend-first-download]: Use relative imports in ContentGate.tsx for Vitest compatibility and abort active snapshot fetches on offline transition

### Pending Todos

- [Phase 2 End-of-Phase]: Install `app/android/app/build/outputs/apk/release/app-release.apk` on `RMX5106` & run `RELEASE_RESULT android` + Google Sign-In/widget/torture release checks
- [Phase 2 End-of-Phase]: Build local Xcode `Release` on `iPhone 18 Pro` Simulator (`EXPO_PUBLIC_DEV_TOOLS=1`), capture `RELEASE_RESULT ios`, and run `otool -L` `AdSupport` check
- [Phase 2 End-of-Phase]: Run Firebase Release triggers (consent switch, `spike_test` in DebugView/Realtime, Test Crash + relaunch, Sentinel `E_UNCAUGHT` scrub + relaunch) and confirm in Firebase Console
- [Phase 2 End-of-Phase]: Complete human verification of `01-REVIEW-FIX.md` (`WR-01`, `WR-02`, `WR-03`, `WR-06`, and `WR-05` cleanup decision)

### Blockers/Concerns

- [Phase 1 / Carried to Phase 2 End]: `FND-09` Release run, `REL-01` Release Crashlytics console proof, and `AD_ID` / `AdSupport` audit open until end-of-Phase-2 Release pass (see `01-SPIKE-DECISIONS.md` & `01-VERIFICATION.md`)
- [Phase 1 / Hardware]: Physical iPhone Google Sign-In interactive flow and physical iOS widget cold-start tap deferred until physical iOS hardware / Apple Developer provisioning
- [Phase 2]: First launch needs internet, so backend uptime and production content are release gates
- [Phase 6]: Start the Play 12-tester / 14-day closed-testing clock at the end of this phase
- [Phase 8]: Drive file layout (one shared file vs one per device) and headless background sign-in are open research items

## Deferred Items

Items acknowledged and deferred at milestone close, most recent first:

| Category | Item | Status | Deferred At | Milestone |
|----------|------|--------|-------------|-----------|
| *(none)* | | | | |

## Session Continuity

Last session: 2026-11-25T13:21:56.910Z
Stopped at: Completed 02-06-PLAN.md
Resume file: None
