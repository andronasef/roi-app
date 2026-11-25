# Phase 5: Intercession & Gratitude - Research

**Researched:** 2026-11-26
**Domain:** React Native / Expo SDK 58 offline-first local SQLite (Drizzle), Arabic RTL UI, Reanimated 4 expandable editor, `expo-notifications` local scheduling
**Confidence:** HIGH

## User Constraints

> Copied verbatim from `.planning/phases/05-intercession-gratitude/05-CONTEXT.md`.

### Locked Decisions
- **D-01:** **Reference-aligned 2-tab layout (`الصلوات` | `الأشخاص`):** Follow `/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily/lib/features/intercede/ui/intercede_screen.dart` with two top tabs:
  - **الصلوات:** Active prayers checklist with a daily progress header (`فاضل {N} من {M}` / `خلصت كل صلوات النهاردة ✓`). When one or more prayers are pinned, the header counts pinned prayers; when none are pinned, it counts all active prayers (`countedPrayers()` pattern).
  - **الأشخاص:** Groups active prayers by person (`personName`) showing each person's active prayer count (`INT-03`), opening a person detail screen with `صليت لكلهم` (batch-log all active prayers for that person), individual prayer cards, and a collapsible `المكتمل ({N})` section.
- **D-02:** **5 sort modes with prayed-today sinking & pin priority (`INT-04`):** Support all five sorts from `daily`: `عشوائي` (daily-seeded stable hash per local day), `الأكتر إهمالاً` (never-prayed prayers first, then oldest `lastPrayedAt`), `الأقدم إضافة`, `الأحدث إضافة`, and `أبجدي` (using `normalizeArabic()`). Within active prayers, items not yet prayed today appear before items already prayed today, and pinned prayers stay at the top of the unprayed group.
- **D-03:** **Prayer card fields & Drizzle schema extension (`INT-01`):** — **Reversibility:** one-way — adding columns to `prayers` requires a Drizzle SQL migration (`app/drizzle/`) and updating `app/features/db/__tests__/migrate.test.ts` fixtures. Extend the existing `prayers` table in `app/features/db/schema.ts` with pin state (e.g., `pinned` / `pinnedAt`) and answer state (`answeredAt`, `outcome`) while keeping `syncCols()`, `body`, `personName`, `sinceLocalDate`, and append-only `prayerEvents` (`prayedAt`, `localDate`, optional `note`).
- **D-04:** **Optional note dialog on `صليت` (`INT-02`):** Match `daily`'s `askNote` pattern: tapping **«صليت»** on a prayer card (or **«صليت لكلهم»** on a person's page) opens a quick optional note dialog (user can leave it blank and confirm immediately) that inserts an append-only row into `prayer_events` and increments the card's prayed count.
- **D-05:** **Diacritic-insensitive prayer search (`INT-05`):** Search prayers using `normalizeArabic()` / `matches()` from `@roi/shared` across prayer text and person name.
- **D-06:** **«اتستجابت» archive & reopen (`INT-06`):** Marking a prayer **«اتستجابت»** prompts for an optional outcome note (`النتيجة (اختياري)`) and moves it to the answered archive screen (accessible from the **تشفع** header, showing answered count, relative date, prayer count, and outcome). Users can also reopen an answered prayer (`رجّعها`) back to active.
- **D-07:** **One-tap answered-prayer → gratitude prefill (`INT-07`):** Tapping the one-tap gratitude action on an answered prayer navigates to **دفتر الشكر** with today's card pre-filled (appended as a new line if today already has gratitude text) so the user can review or edit it before autosave persists it.
- **D-08:** **Single-screen layout (today on top + month-grouped list below):** Opening **دفتر الشكر** shows today's gratitude card at the top, followed below by a single continuous scrollable list of filled past days grouped by month (no month-switching arrows, `GRT-03`), plus a **«ضيف ليوم فات»** date picker action to add or edit any past day (`GRT-04`). Empty days without entries are not shown in the list.
- **D-09:** **One card per day with multi-entry line appending & autosave (`GRT-01`):** — **Reversibility:** one-way — preserves the existing `gratitudeLines` unique `localDate` and `gratitudeId(localDate)` natural-key Drive merge contract in `app/features/db/schema.ts`. Keep one `gratitude_lines` row per local calendar day (`gratitudeId(localDate)`). Writing or tapping "أضف شكر تاني" / the answered-prayer link on a day that already has text appends a new line inside that same day's text card, and edits autosave automatically as the user types / leaves.
- **D-10:** **Animated expandable full-screen writing mode:** Today's gratitude card includes an expand control that smoothly animates (using `react-native-reanimated`) into a full-screen distraction-free writing canvas and collapses back cleanly.
- **D-11:** **Tool settings in both tool header and global Settings:** Expose each tool's settings (default **تشفع** sort, **دفتر الشكر** nightly reminder toggle + time) both via a gear icon inside the tool's header and in the global **Settings** screen (`app/features/settings/`), persisted in syncable SQLite `settings` (or device-local MMKV for OS notification scheduling state as appropriate).
- **D-12:** **Opt-in nightly gratitude reminder (`GRT-02`, `SET-04`):** The nightly gratitude reminder defaults to **off** (with a default preset time of `21:00` / ٩:٠٠ مساءً when toggled on). Request OS notification permission (`expo-notifications`) only at the moment the user turns the reminder on, and schedule a gentle, generic, non-accusing Egyptian Arabic notification.
- **D-13:** **Enable Home tiles for Phase 5 tools:** Add `'intercession'` and `'gratitude'` to `IMPLEMENTED_HOME_TOOLS` in `app/features/profile/repository.ts` and wire their routes in `app/features/home/HomeScreen.tsx` so **أدواتك** displays **ليا أنا**, **تشفع**, and **دفتر الشكر** (while keeping **حفظ الآيات** hidden until Phase 6).

### Claude's Discretion
- Exact Drizzle migration `0003` column names on `prayers` (`pinnedAt` vs `isPinned` boolean/integer, `answeredAt`, `outcome`, and optional `note` on `prayerEvents` if needed for `D-04`) and updating `app/features/db/__tests__/migrate.test.ts` fixtures.
- Exact Reanimated shared-value / layout transition implementation for the expandable full-screen gratitude editor (`D-10`), adhering to RTL and `eslint-plugin-react-native-a11y` rules.
- Exact `expo-notifications` scheduling/rescheduling helper structure (designed cleanly so Phase 6 can add review, prayer, and weekly-verse reminders onto the same module).
- Exact Egyptian Arabic copy for empty states, generic nightly reminder text, and prayer outcome/gratitude prefill template.

### Deferred Ideas (OUT OF SCOPE)
- Home "due today" counts (`HOME-04`) and remaining tool reminders (`SET-02`..`SET-04` for review/prayer/weekly verse) — Phase 6
- Home-screen widgets (`WDG-*`) — Phase 7
- Google Drive sync/restore (`SYNC-*`) — Phase 8
- Coach marks/help (`HELP-*`) and biometric lock (`SET-05`) — Phase 9

## Project Constraints (from CLAUDE.md)

Extracted from `.claude/CLAUDE.md` [VERIFIED: .claude/CLAUDE.md:15-95]:
- **Pinned mobile versions:** Always install Expo-tracked packages via `npx expo install <pkg>` — never hand-pick `latest`. Keep `nativewind@4.2.7`, `tailwindcss@3.4.19`, `drizzle-orm@0.45.4` / `drizzle-kit@0.31.11`, `react-native-reanimated@4.7.1` + `react-native-worklets@0.13.0`, `typescript@~6.0.3`.
- **RTL & Arabic-only:** App runs in forced RTL (`forcesRTL: true`) with Arabic-only UI and Arabic-Indic digits (`toArabicDigits()`, `formatArabicDate()`). Use Tailwind logical utilities (`text-start`, `ms-*`, `ps-*`).
- **Privacy & Telemetry:** All personal data (prayer text, person names, gratitude lines) stays strictly local on device. Never log prayer text, names, or gratitude text to Firebase Analytics or Crashlytics; use `track('prayer_logged')` / `track('gratitude_saved')` only [VERIFIED: app/constants/telemetry.ts:11-21].
- **Soft deletes & append-only events:** Every user-data table uses `syncCols()` (`id`, `created_at`, `updated_at`, `deleted_at`). Calling Drizzle `.delete()` in `app/{app,features,services,hooks}` is forbidden and enforced by unit test [VERIFIED: app/features/db/__tests__/schema.test.ts:95-109].
- **Accessibility lint gate:** `app/package.json` runs `expo lint --max-warnings 0` with `eslint-plugin-react-native-a11y` rules set to `'warn'` (except `has-accessibility-hint: 'off'`) [VERIFIED: app/eslint.config.js:6-18]. Every interactive element must have valid `accessibilityRole` and `accessibilityLabel` (and `accessibilityState` where applicable).
- **Test runner:** Run Vitest via `bun run test` (Node 24), never `bun test` [VERIFIED: vitest.config.ts:3-7].

## Summary

Phase 5 delivers **تشفع** (Intercession) and **دفتر الشكر** (Gratitude Notebook) on top of the existing Phase 1–4 mobile foundation. The core SQLite tables (`prayers`, `prayer_events`, `gratitude_lines`, `settings`) already exist in `app/features/db/schema.ts`, and `@roi/shared` already provides `normalizeArabic()`, `matches()`, `toArabicDigits()`, `formatArabicDate()`, `localDateKey()`, `monthKey()`, `seededPick()`, and `uuidv7()`.

The work breaks cleanly into four technical areas: (1) a Drizzle `0003` migration extending `prayers` (`pinned_at`, `answered_at`, `outcome`) and `prayer_events` (`note`) plus updating `migrate.test.ts`; (2) pure-TypeScript domain repositories for Intercession (5 sort modes, `countedPrayers()`, person grouping, batch logging, archive/reopen) and Gratitude (natural-key `gratitudeId(localDate)` upsert/soft-delete recovery, line appending, month grouping); (3) Expo Router screens and Reanimated 4 expandable editor adhering to RTL and `react-native-a11y`; and (4) `expo-notifications` (`~58.1.9`) opt-in daily reminder scheduling designed as a reusable scheduler module for Phase 6.

**Primary recommendation:** Keep all sorting, grouping, and date-key logic in pure functions under `app/features/intercession/` and `app/features/gratitude/` (unit-tested in Vitest with `better-sqlite3`), use a pure-JS Arabic-Indic time/date picker modal (avoiding an extra native dependency), and add `expo-notifications` (`~58.1.9`) via `npx expo install expo-notifications` with an Android notification channel and `SchedulableTriggerInputTypes.DAILY`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Prayer & Gratitude persistence, soft deletes, append-only logs | Database / Storage (`expo-sqlite` + Drizzle) | Browser / Client (repository layer) | Offline-first local ownership; sync-ready schema with `syncCols()` and `gratitudeId(localDate)` |
| 5-mode sorting, daily-seeded random hash, Arabic search, month grouping | Browser / Client (pure TS repository functions) | — | Fast synchronous reads over local SQLite; deterministic and Vitest-testable in Node |
| Expandable gratitude canvas & 2-tab Intercession UI | Browser / Client (React Native + Reanimated 4) | — | Native 60fps UI thread animation and RTL layout |
| Nightly gratitude reminder scheduling & permissions | Browser / Client (`expo-notifications` + MMKV/SQLite) | OS Notification Scheduler | Permission & OS schedule ID are device-local; reminder enabled/time preference is syncable |
| Home tool enablement (`IMPLEMENTED_HOME_TOOLS`) | Browser / Client (`profile/repository.ts` + `HomeScreen.tsx`) | Database / Storage (`settings`) | Reveals `'intercession'` and `'gratitude'` tiles while preserving existing `home_tiles` order |

## Standard Stack

### Core (Already Installed in `app/package.json`)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `drizzle-orm` / `drizzle-kit` | `0.45.4` / `0.31.11` | Local SQLite schema, queries, SQL migrations | Pinned in `app/package.json` [VERIFIED: app/package.json:29,74] |
| `expo-sqlite` | `~58.0.18` | On-device WAL SQLite database | Installed and configured in `app/features/db/client.ts` [VERIFIED: app/package.json:42] |
| `react-native-reanimated` | `4.7.1` | Smooth expandable full-screen gratitude editor | Pinned to SDK 58 with `react-native-worklets@0.13.0` [VERIFIED: app/package.json:57,61] |
| `react-native-mmkv` | `4.3.2` | Device-local OS notification schedule ID / permission flag | Installed in `app/services/storage.ts` [VERIFIED: app/package.json:55] |
| `@rn-primitives/dialog` / `select` | `1.5.2` | Accessible RTL dialogs & sort/settings menus | Installed in `app/components/ui/` [VERIFIED: app/package.json:22,24] |
| `lucide-react-native` | `0.577.0` | Icons (pin, search, sort, archive, expand, gear) | Installed in `app/package.json:47` |

### New Package for Phase 5
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-notifications` | `~58.1.9` | Local daily gratitude reminder (`GRT-02`) | Required by `D-12`; pinned by Expo SDK 58 `bundledNativeModules.json` [VERIFIED: app/node_modules/expo/bundledNativeModules.json] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Pure-JS Arabic-Indic date/time picker modal | `@react-native-community/datetimepicker` (`9.2.1`) | Pure-JS modal using `@rn-primitives/dialog` + steppers/lists guarantees Arabic-Indic digits, forced RTL alignment, dark/light theme matching, and avoids adding another native module + EAS/Xcode rebuild risk. Use pure-JS modal. |

**Installation:**
```bash
cd app && npx expo install expo-notifications
```
*(After installing `expo-notifications`, add `"expo-notifications"` to `app/app.json` `"plugins"` if custom sound/icon config is needed, and run `expo prebuild` / rebuild the dev client before testing notifications on device/simulator.)*

## Package Legitimacy Audit

Checked via `gsd-tools query package-legitimacy check --ecosystem npm expo-notifications` and `npm view`:

| Package | Registry | Age / Last Publish | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|--------------------|-----------|-------------|---------|-------------|
| `expo-notifications` | npm | `58.1.9` (2026-11-11) | 10,018,092/wk | `https://github.com/expo/expo.git` | `[SUS]` (`too-new` flag on recent patch) | Flagged — official Expo SDK 58 package (`bundledNativeModules.json` pins `~58.1.9`, `postinstall: null`); planner adds `checkpoint:human-verify` on device notification test |

**Packages removed due to `[SLOP]` verdict:** none
**Packages flagged as suspicious `[SUS]`:** `expo-notifications` (flagged solely because `58.1.9` was published within 30 days on `2026-11-11`; verified official `expo/expo` monorepo package with 10M+ weekly downloads and no `postinstall` script).

## Architecture Patterns

### System Architecture Diagram

```
  HomeScreen (أدواتك)
     ├──► /intercession (تشفع: 2 tabs الصلوات | الأشخاص)
     │       ├── Header: Sort menu, Search toggle, Archive (/intercession/answered), Gear (Settings sheet)
     │       ├── Tab 1 (الصلوات): countedPrayers() progress header + sorted active PrayerCards
     │       │      └── Tap "صليت" ──► Optional Note Dialog ──► logPrayed() ──► prayer_events (INSERT)
     │       ├── Tab 2 (الأشخاص): grouped by personName + active count
     │       │      └── /intercession/person?name=... ──► "صليت لكلهم" (batch logPrayed) + active + المكتمل (رجّعها)
     │       ├── /intercession/prayer?id=... ──► Prayer detail + prayer_events timeline
     │       └── /intercession/answered ──► Answered archive + "اتستجابت" outcome + 1-tap "اكتب في دفتر الشكر"
     │                                                                              │
     │                                                                              ▼ (prefill param)
     └──► /gratitude (دفتر الشكر) ◄─────────────────────────────────────────────────┘
             ├── Header: "ضيف ليوم فات" (past-date picker) + Gear (Reminder toggle & time)
             ├── Today Card (gratitudeId(today)): TextInput + "أضف شكر تاني" + Expand button (Reanimated full-screen)
             │      └── Debounced / onBlur autosave ──► upsertGratitudeLine() ──► gratitude_lines (UPSERT / softDelete if empty)
             └── Past Entries List: filled days grouped by YYYY-MM (EGYPTIAN_MONTHS + Arabic-Indic year)
                    └── Tap past card ──► Edit in place / modal ──► upsertGratitudeLine()

  Notifications Module (app/features/notifications/scheduler.ts)
     └── Toggle ON ──► requestPermissionsAsync() ──► Android channel + scheduleNotificationAsync(DAILY, hour, minute)
```

### Recommended Project Structure
```
app/
├── app/
│   ├── intercession/
│   │   ├── index.tsx          # Main تشفع screen (2 tabs)
│   │   ├── person.tsx         # Person detail (صليت لكلهم + المكتمل)
│   │   ├── prayer.tsx         # Prayer detail & event log timeline
│   │   └── answered.tsx       # Answered archive + 1-tap gratitude link
│   └── gratitude.tsx          # دفتر الشكر single-screen + full-screen expandable editor
├── features/
│   ├── db/
│   │   ├── schema.ts          # Extend prayers (pinnedAt, answeredAt, outcome) + prayerEvents (note)
│   │   └── events.ts          # Extend logPrayed(db, clock, prayerId, note?)
│   ├── intercession/
│   │   ├── models.ts          # PrayerSort, countedPrayers, sortPrayers, groupPrayersByPerson, dailyRank
│   │   ├── repository.ts      # CRUD, pin, logPrayed, logBatchPrayed, markAnswered, reopenPrayer, search
│   │   └── __tests__/         # Unit + SQLite repository tests
│   ├── gratitude/
│   │   ├── models.ts          # groupGratitudeByMonth, appendGratitudeLine, formatAnsweredPrefill
│   │   ├── repository.ts      # upsertGratitudeLine, soft-delete on empty, listLiveGratitude
│   │   └── __tests__/         # Unit + SQLite repository tests
│   └── notifications/
│       ├── scheduler.ts       # Generic local reminder scheduler (Phase 5: gratitude; Phase 6-ready)
│       └── __tests__/         # Unit tests mocking expo-notifications
```

### Pattern 1: Drizzle Schema Extension (`0003`)
**What:** Extend `prayers` and `prayerEvents` in `app/features/db/schema.ts` while keeping `syncCols()` intact.
- On `prayers` [VERIFIED: app/features/db/schema.ts:22-27]:
  Currently:
  ```ts
  export const prayers = sqliteTable('prayers', {
    ...syncCols(),
    body: text('body').notNull(),
    personName: text('person_name'),
    sinceLocalDate: text('since_local_date'),
  });
  ```
  Add:
  - `pinnedAt: integer('pinned_at')` (nullable epoch ms; `pinnedAt !== null` means pinned, and preserves pin timestamp for Drive LWW sync)
  - `answeredAt: integer('answered_at')` (nullable epoch ms; `answeredAt !== null` means answered/archived)
  - `outcome: text('outcome')` (nullable string for `النتيجة (اختياري)`)
- On `prayerEvents` [VERIFIED: app/features/db/schema.ts:30-39]:
  Add `note: text('note')` (nullable string for `D-04` optional note dialog).
- Run `bun --cwd app db:generate` (or `npx drizzle-kit generate`) to generate `app/drizzle/0003_*.sql` and update `app/drizzle/migrations.js` and `_journal.json`.

### Pattern 2: Daily-Seeded Random & 5-Mode Prayer Sort (`D-02`)
**What:** Match `daily/lib/features/intercede/data/models.dart:117-176` exactly:
1. Partition active (`answeredAt === null && deletedAt === null`) prayers into **not prayed today** (`lastPrayedLocalDate !== todayKey`) and **prayed today** (`lastPrayedLocalDate === todayKey`).
2. Within **prayed today**, sort by `lastPrayedAt` descending (most recently prayed first), tie-break by `id`.
3. Within **not prayed today**, sort pinned (`pinnedAt !== null`) before unpinned.
4. Within each pin group, apply the selected `PrayerSort`:
   - `'random'` (`عشوائي`): FNV-1a 32-bit hash of `${todayKey}:${prayer.id}` ascending.
   - `'neglected'` (`الأكتر إهمالاً`): `lastPrayedAt === null` first, then oldest `lastPrayedAt` ascending.
   - `'oldest'` (`الأقدم إضافة`): `(sinceLocalDate ?? localDateKey(createdAt))` ascending.
   - `'newest'` (`الأحدث إضافة`): `(sinceLocalDate ?? localDateKey(createdAt))` descending.
   - `'alphabetical'` (`أبجدي`): `normalizeArabic(prayer.body)` `.localeCompare` / string comparison ascending.
5. `countedPrayers(active)` returns pinned prayers if any active prayer is pinned, otherwise all active prayers.

### Pattern 3: `gratitude_lines` Natural-Key Upsert & Tombstone Recovery (`D-09`)
**What:** `gratitudeLines` has `localDate: text('local_date').notNull().unique()` and `id = gratitudeId(localDate)` (`'shukr:' + localDate`) [VERIFIED: app/features/db/schema.ts:63-72].
- When saving non-empty text for `localDate`: use `.insert(gratitudeLines).values(...).onConflictDoUpdate({ target: gratitudeLines.id, set: { body, updatedAt: now, deletedAt: null } })`. Using `onConflictDoUpdate` on `id` (or `localDate`) cleanly revives a previously soft-deleted row for that date without hitting a SQLite `UNIQUE constraint failed: gratitude_lines.local_date` error.
- When the user clears all text for a day (`body.trim() === ''`), call `softDelete(db, clock, gratitudeLines, gratitudeId(localDate))` so empty days are tombstoned and excluded from the past-days list (`D-08`).

### Pattern 4: Reanimated 4 Expandable Full-Screen Gratitude Editor (`D-10`)
**What:** Render the expanded editor as an overlay `<Animated.View>` (or `Modal` / `Portal` with Reanimated `useSharedValue` + `withTiming` / `withSpring` on `opacity` and `transform: [{ translateY }, { scale }]`, `KeyboardAvoidingView`, and `SafeAreaView`) triggered from today's gratitude card. Both collapsed card and expanded overlay bind to the same controlled `todayText` state so typing and autosave remain continuous with zero cursor/text loss.

### Pattern 5: `expo-notifications` Opt-In Daily Reminder (`D-12`)
**What:**
- Default state: `{ enabled: false, hour: 21, minute: 0 }` (٩:٠٠ مساءً).
- Do **not** request notification permissions on app launch or screen open.
- Only when the user toggles the reminder **ON**:
  1. Call `Notifications.getPermissionsAsync()`, and if not granted, `Notifications.requestPermissionsAsync()`.
  2. On Android, call `Notifications.setNotificationChannelAsync('daily-reminders', { name: 'التذكيرات اليومية', importance: Notifications.AndroidImportance.DEFAULT })` [CITED: docs.expo.dev].
  3. Cancel any prior gratitude notification ID stored in MMKV (`cancelScheduledNotificationAsync(prevId)`).
  4. Schedule with `trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: 'daily-reminders' }` [CITED: docs.expo.dev].
- When toggled **OFF**, cancel the stored notification ID and clear it from MMKV.
- Copy must be generic and non-accusing (e.g., title: `'روعي'`, body: `'لحظة هدوء قبل ما تنام — تحب تكتب سطر شكر النهاردة؟'`), never mentioning streaks, missed days, or user content (`SET-04`).

### Anti-Patterns to Avoid
- **Calling `db.delete(...)`:** Forbidden by `schema.test.ts` [VERIFIED: app/features/db/__tests__/schema.test.ts:95-109]. Always use `softDelete()` or set `deletedAt`.
- **Storing `prayedCount` or `lastPrayedAt` as columns on `prayers`:** Violates `FND-07` (counters must derive from live `prayer_events` rows). Compute via SQL `COUNT` / `MAX(prayed_at)` or in-memory aggregation over live `prayer_events`.
- **Using `Intl.DateTimeFormat` for Arabic dates:** Hermes compatibility issue noted in `shared/src/arabic.ts:1` [VERIFIED: shared/src/arabic.ts:1]. Always use `formatArabicDate()`, `EGYPTIAN_MONTHS`, and `toArabicDigits()` from `@roi/shared`.
- **Sharing `gratitude_lines` across multiple rows per day:** Violates `D-09` and the unique `local_date` constraint in `schema.ts`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Arabic diacritic/variant search | Custom regex normalizer | `normalizeArabic()`, `matches()` from `@roi/shared` | Already handles tashkeel, bidi controls, أ/إ/آ/ا, ة/ه, ى/ي, and Arabic-Indic digits [VERIFIED: shared/src/arabic.ts:33-55] |
| Arabic-Indic numbers & dates | Custom digit mapper | `toArabicDigits()`, `formatArabicDate()`, `EGYPTIAN_MONTHS` from `@roi/shared` | Hermes-safe and consistent across app [VERIFIED: shared/src/arabic.ts:58-70] |
| Local calendar day / month keys | `toISOString().slice(0, 10)` | `localDateKey()`, `monthKey()` from `@roi/shared` | `toISOString()` uses UTC and shifts dates near midnight in Cairo (`UTC+2`/`+3`) [VERIFIED: shared/src/period.ts:2-18] |
| UUIDv7 generation | `Math.random()` IDs | `uuidv7(clock.now(), clock.rand)` from `@roi/shared` | Time-ordered, deterministic in tests via injected `Clock` [VERIFIED: app/features/db/events.ts:19-22,46] |

## Common Pitfalls

### Pitfall 1: UTC vs Local Date Mismatch Near Midnight
**What goes wrong:** Using `new Date().toISOString().slice(0, 10)` causes prayers logged or gratitude written between 00:00–02:00 Cairo time to land on yesterday's UTC date.
**How to avoid:** Always use `localDateKey(new Date(now))` and `monthKey(new Date(now))` from `@roi/shared` [VERIFIED: shared/src/period.ts:2-18].

### Pitfall 2: `gratitude_lines` Unique Constraint on Soft-Deleted Row
**What goes wrong:** If a user clears a day's gratitude (soft-deleting the row) and later writes on that same `localDate` with a plain `.insert()`, SQLite throws `UNIQUE constraint failed: gratitude_lines.local_date`.
**How to avoid:** Always use `.onConflictDoUpdate({ target: gratitudeLines.id, set: { body, updatedAt: now, deletedAt: null } })` keyed by `gratitudeId(localDate)`.

### Pitfall 3: `migrate.test.ts` Fixture Drift After `0003` Migration
**What goes wrong:** `app/features/db/__tests__/migrate.test.ts` checks `v1.sqlite` and `v2.sqlite` fixtures and `readJournalEntryCount()` [VERIFIED: app/features/db/__tests__/migrate.test.ts:26-34]. Adding `0003` without regenerating via `drizzle-kit generate` or without verifying existing fixtures migrate cleanly breaks the DB test suite.
**How to avoid:** Generate `0003` via `drizzle-kit generate`, add a `v3.sqlite` fixture (or assert new `prayers`/`prayer_events` columns in `migrate.test.ts`), and run `bun run test`.

### Pitfall 4: `eslint-plugin-react-native-a11y` Zero-Warning Gate
**What goes wrong:** `expo lint --max-warnings 0` fails on any `Pressable`, `Switch`, or custom button missing `accessibilityRole` or `accessibilityLabel` [VERIFIED: app/package.json:10, app/eslint.config.js:10-17].
**How to avoid:** Include `accessibilityRole`, `accessibilityLabel`, and `accessibilityState` on every interactive element, and run `bun --cwd app lint` before completing tasks.

### Pitfall 5: Expo SDK 58 `expo-notifications` Foreground Behavior
**What goes wrong:** In Expo SDK 58, foreground notifications are shown by default [CITED: docs.expo.dev]. If a user is actively inside the app at 21:00, an unexpected banner may appear unless `setNotificationHandler` is configured intentionally.
**How to avoid:** Configure `Notifications.setNotificationHandler(...)` explicitly in `app/features/notifications/scheduler.ts` and test on a real dev build (scheduled notifications are unreliable on iOS Simulator).

## Code Examples

### `logPrayed` Extension in `app/features/db/events.ts`
```ts
// Based on existing app/features/db/events.ts:40-59
export function logPrayed(
  db: SyncDatabase,
  clock: Clock,
  prayerId: string,
  note?: string | null,
): string {
  const now = clock.now();
  const id = uuidv7(now, clock.rand);
  const trimmedNote = note?.trim() ? note.trim() : null;
  db.insert(prayerEvents)
    .values({
      id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      prayerId,
      prayedAt: now,
      localDate: localDateKey(new Date(now)),
      note: trimmedNote,
    })
    .run();
  return id;
}
```

### `expo-notifications` Daily Trigger (`app/features/notifications/scheduler.ts`)
```ts
// Source: docs.expo.dev (Expo SDK 58)
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const GRATITUDE_CHANNEL_ID = 'daily-reminders';

export async function ensureReminderPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleDailyGratitudeReminder(
  hour: number,
  minute: number,
  previousNotificationId?: string | null,
): Promise<string> {
  if (previousNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(previousNotificationId).catch(() => {});
  }
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(GRATITUDE_CHANNEL_ID, {
      name: 'التذكيرات اليومية',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }
  return Notifications.scheduleNotificationAsync({
    content: {
      title: 'روعي',
      body: 'لحظة هدوء قبل ما تنام — تحب تكتب سطر شكر النهاردة؟',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: GRATITUDE_CHANNEL_ID,
    },
  });
}
```

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `expo-notifications` `~58.1.9` builds cleanly with existing `useFrameworks: "dynamic"` + Firebase SPM setup in `app/app.json` | Standard Stack | Native build step may need pod/gradle refresh; caught immediately during dev-client rebuild |
| A2 | Adding `note` column to `prayer_events` and `pinned_at`, `answered_at`, `outcome` to `prayers` is compatible with Phase 8 Drive merge | Architecture Patterns | Low — all columns are nullable and additive on existing `syncCols()` tables |

## Open Questions (RESOLVED)

1. **Person entity vs `personName` string on `prayers`:**
   - What we know: `app/features/db/schema.ts:25` stores `personName: text('person_name')` directly on `prayers` (no separate `entities` table).
   - What's unclear: Whether renaming a person in the `الأشخاص` tab should update `personName` across all live prayers for that person.
   - **RESOLVED:** Group live prayers by normalized `personName` (`personName?.trim() || 'عام'`). Individual prayer edit updates `personName` on the prayer row; batch person-rename in `الأشخاص` is not needed for v1 (deferrable without schema change).

## Environment Availability

Step 2.6: SKIPPED (no external CLI services beyond the project's existing Node 24 / Bun / Expo toolchain; `expo-notifications` is installed via `npx expo install`).

## Security Domain

`security_enforcement` is enabled (`true` in `.planning/config.json`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Local-only tools in Phase 5; no auth |
| V3 Session Management | no | Local-only tools in Phase 5 |
| V4 Access Control | no | Single-user local device DB |
| V5 Input Validation | yes | Zod schemas for prayer text, person name, outcome, gratitude text, and reminder `{ enabled, hour, minute }` settings |
| V6 Cryptography | no | Uses existing `expo-crypto` CSPRNG via `deviceClock` |

### Known Threat Patterns for Local Mobile Storage & Telemetry

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Sensitive prayer/gratitude text leaking to analytics/crash reports | Information Disclosure | Only emit closed `ALLOWED_EVENTS` (`'prayer_logged'`, `'gratitude_saved'`) with zero parameters; `scrubError()` scrubs uncaught errors in release builds [VERIFIED: app/services/telemetry-scrub.ts:11-32] |
| Notification lock-screen privacy leak | Information Disclosure | `GRT-02` / `SET-04`: notification body is strictly generic (`لحظة هدوء قبل ما تنام...`) and never embeds prayer/gratitude content |

## Sources

### Primary (HIGH confidence)
- In-repo files read this session: `.claude/CLAUDE.md`, `app/features/db/schema.ts`, `app/features/db/events.ts`, `app/features/db/__tests__/schema.test.ts`, `app/features/db/__tests__/migrate.test.ts`, `app/features/profile/repository.ts`, `app/features/home/HomeScreen.tsx`, `app/constants/app.ts`, `app/constants/telemetry.ts`, `app/services/storage.ts`, `app/services/telemetry.ts`, `app/eslint.config.js`, `shared/src/arabic.ts`, `shared/src/period.ts`.
- Owner reference repo read this session: `/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily/lib/features/intercede/{data/models.dart,ui/intercede_screen.dart,ui/entity_page.dart,ui/answered_page.dart,ui/prayer_page.dart,ui/widgets/prayer_menu.dart}`.
- `app/node_modules/expo/bundledNativeModules.json` — Expo SDK 58 pinned `expo-notifications: ~58.1.9`.
- Official Expo Docs (`docs.expo.dev`) — `SchedulableTriggerInputTypes.DAILY`, `setNotificationChannelAsync`, SDK 58 foreground notification behavior.

### Secondary (MEDIUM confidence)
- `gsd-tools query package-legitimacy check` & `npm view` — verified `expo-notifications@58.1.9` (10M+ weekly downloads, `postinstall: null`, `expo/expo` repo).

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core packages already installed in `app/package.json`; `expo-notifications@~58.1.9` verified in SDK 58 `bundledNativeModules.json`
- Architecture: HIGH — existing `schema.ts`, `events.ts`, `shared/src/*`, and `daily` Dart reference provide exact contracts
- Pitfalls: HIGH — verified against `schema.test.ts`, `migrate.test.ts`, `eslint.config.js`, and Hermes/SQLite constraints

**Research date:** 2026-11-26
**Valid until:** 2026-12-26 (30 days; stable Expo SDK 58 stack)
