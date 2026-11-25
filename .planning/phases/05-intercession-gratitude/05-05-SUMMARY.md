---
phase: 05-intercession-gratitude
plan: 05
subsystem: ui
tags: [gratitude, expo-notifications, reanimated, drizzle, sqlite, rtl, arabic]
requires:
  - phase: 05-intercession-gratitude
    provides: expo-notifications, SETTINGS_KEYS.GRATITUDE_REMINDER, MMKV notification id helpers, ArabicPickers, gendered UI copy (05-02)
  - phase: 05-intercession-gratitude
    provides: Home tile for دفتر الشكر routed to /gratitude (05-03)
provides:
  - gratitudeId(localDate) natural-key repository (upsert, soft-delete on blank, revival)
  - Pure-TS gratitude models (month grouping, append line, answered-prayer prefill, reminder schema)
  - Opt-in daily reminder scheduler (permission requested only when toggled ON, static generic copy)
  - ExpandableGratitudeEditor (Reanimated 4 full-screen writing overlay)
  - GratitudeScreen and /gratitude route
affects:
  - 05-04-PLAN.md (answered archive navigates to /gratitude?prefill=... using formatAnsweredPrefill)
  - 05-06-PLAN.md (Settings can reuse getGratitudeReminderSettings / syncGratitudeReminderSchedule)
tech-stack:
  added: []
  patterns:
    - Debounced (400ms) + onBlur + unmount-flush autosave through a ref holding the latest text
    - Natural-key upsert with onConflictDoUpdate keyed on id to revive tombstoned rows
key-files:
  created:
    - app/features/gratitude/models.ts
    - app/features/gratitude/repository.ts
    - app/features/gratitude/ExpandableGratitudeEditor.tsx
    - app/features/gratitude/GratitudeScreen.tsx
    - app/features/gratitude/__tests__/gratitude.test.ts
    - app/features/notifications/scheduler.ts
    - app/features/notifications/__tests__/scheduler.test.ts
    - app/app/gratitude.tsx
  modified: []
key-decisions:
  - "Answered-prayer prefill is merged into today's card without an immediate write; it persists on the next edit, blur or leaving the screen (D-07 review-before-save)"
  - "Expanded editor is mounted on demand and animates in only (260ms, ReduceMotion.System); collapse unmounts immediately after flushing the save"
  - "syncGratitudeReminderSchedule returns {ok:false, reason:'permission_denied'} and cancels any stored schedule instead of throwing; the screen reverts the switch and shows the gender-aware denied copy"
patterns-established:
  - "Reminder scheduler owns the foreground notification handler at module load (SDK 58 shows foreground notifications by default)"
requirements-completed:
  - INT-07
  - GRT-01
  - GRT-02
  - GRT-03
  - GRT-04
status: complete
commits: 2
plan_head_before: eb7ee34c09e7bb677cf4d1e013f6240ebb0c5f38
plan_head_after: d699a67507943527da314120b92ba0e0d306a412
actuals:
  tokens: 11000
  tasks: 2
  commits: 2
duration: 20min
completed: 2026-11-26
---

# Phase 05 Plan 05: دفتر الشكر (Gratitude Notebook) and Nightly Reminder Summary

Full gratitude journaling feature: one row per local day keyed by `gratitudeId(localDate)` (soft-deleted when cleared, revived on re-write), a today card with debounced autosave and a Reanimated 4 full-screen editor, month-grouped past entries with past-day entry/edit, answered-prayer prefill, and an opt-in nightly reminder that stays OFF (21:00 preset) and only asks for OS permission when toggled ON.

## Accomplishments

- `app/features/gratitude/models.ts`: `gratitudeReminderSchema`, `DEFAULT_GRATITUDE_REMINDER`, `appendGratitudeLine`, `formatAnsweredPrefill`, `groupGratitudeByMonth` (excludes today, blank and tombstoned rows; newest month and day first; labels via `EGYPTIAN_MONTHS` + `toArabicDigits`).
- `app/features/gratitude/repository.ts`: `upsertGratitudeLine` (`onConflictDoUpdate` on `id`, `softDelete` on blank, `track('gratitude_saved')` with zero parameters), `listLiveGratitude`, `getGratitudeLineByDate`, reminder settings get/set under `SETTINGS_KEYS.GRATITUDE_REMINDER` (corrupt JSON falls back to defaults).
- `app/features/notifications/scheduler.ts`: explicit foreground handler, `ensureReminderPermissions`, `scheduleDailyGratitudeReminder` (Android channel + `DAILY` trigger), `cancelGratitudeReminder`, `syncGratitudeReminderSchedule` (disabled: cancel only, no permission prompt). Title/body are static generic copy.
- `ExpandableGratitudeEditor`, `GratitudeScreen` and `app/app/gratitude.tsx` route per `05-UI-SPEC.md` section 4. The Home tile and Homepage Editor registration (`HOME_TOOL_IDS`, `IMPLEMENTED_HOME_TOOLS`, route) already existed from 05-03, so the project rule on tool registration is satisfied.

## Task Commits

1. **Task 1: Gratitude models/repository and notifications scheduler with unit tests** - `d0af13a` (feat)
2. **Task 2: ExpandableGratitudeEditor, GratitudeScreen, /gratitude route** - `d699a67` (feat)

## Verification Results

- `bun run test -- --project @roi/app app/features/gratitude/__tests__/gratitude.test.ts app/features/notifications/__tests__/scheduler.test.ts`: 11/11 passed
- `bun run test` (full workspace): 52 files, 334/334 passed
- `bun run typecheck`: passed
- `cd app && bun run lint` (`expo lint --max-warnings 0`): passed, 0 warnings

## Deviations from Plan

**1. [Rule 3 - Blocking] Worktree was based on a stale commit and had no `node_modules`**
- **Found during:** startup
- **Issue:** The worktree HEAD (`27ef70f`) was 51 commits behind `main` and lacked the phase 04/05 files, including this plan. It also had no installed dependencies.
- **Fix:** Fast-forwarded the (clean, commit-less) worktree branch to `main` (`eb7ee34`) with `git merge --ff-only main`, then ran `bun install --frozen-lockfile`. No new packages were added and the lockfile is unchanged.
- **Commit:** none (no code change)

**2. Commit ledger file could not be written by the sandbox**
- The `.git/worktrees/.../gsd-plan-head-before-05-05` write was refused by the worktree guard, so `plan_head_before` was taken from `git rev-parse HEAD` at start (`eb7ee34`). Measured commit count `git rev-list --count eb7ee34..d699a67` = 2.

## Notes for Downstream Plans

- `/gratitude?prefill=<text>` is the contract for 05-04's answered archive: build the text with `formatAnsweredPrefill(body, personName, outcome)` from `app/features/gratitude/models.ts` and pass it as the `prefill` param.
- The global Settings screen is not touched here; `getGratitudeReminderSettings` / `setGratitudeReminderSettings` / `syncGratitudeReminderSchedule` are ready for it (D-11).
- Scheduled notifications are unreliable on the iOS Simulator; the daily reminder needs a real-device check (not performed in this plan).

## Known Stubs

None.

## Threat Flags

None. T-05-06 (static generic notification copy), T-05-07 (`track('gratitude_saved')` with no parameters, asserted in tests) and T-05-08 (`onConflictDoUpdate` revival, asserted in tests) are all mitigated as planned.

## Self-Check: PASSED

- All 8 created files exist on disk.
- Commits `d0af13a` and `d699a67` are ancestors of `HEAD`.
