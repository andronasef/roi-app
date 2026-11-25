# Phase 5: Intercession & Gratitude - Context

**Gathered:** 2026-11-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the **تشفع** (Intercession) and **دفتر الشكر** (Gratitude Notebook) tools end-to-end on mobile (`INT-01`..`INT-07`, `GRT-01`..`GRT-04`), enable their tiles on **أدواتك** Home alongside **ليا أنا** (`IMPLEMENTED_HOME_TOOLS`), wire the one-tap answered-prayer-to-gratitude link (`INT-07`), and implement the nightly gratitude reminder on `expo-notifications` (`GRT-02` / Phase 5 slice of `SET-02`..`SET-04`).

New capabilities belonging to later phases — Memorization (`حفظ الآيات`, Phase 6), Home "due today" counts (`HOME-04`, Phase 6), remaining tool reminders (`SET-02`..`SET-04` for review/prayer/weekly verse, Phase 6), home-screen widgets (`WDG-*`, Phase 7), Google Drive sync/restore (`SYNC-*`, Phase 8), coach marks/help (`HELP-*`, Phase 9), and biometric lock (`SET-05`, Phase 9) — remain out of scope for Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Intercession: Prayer Cards, Sorting & People Grouping (`INT-01`..`INT-05`)
- **D-01:** **Reference-aligned 2-tab layout (`الصلوات` | `الأشخاص`):** Follow `/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily/lib/features/intercede/ui/intercede_screen.dart` with two top tabs:
  - **الصلوات:** Active prayers checklist with a daily progress header (`فاضل {N} من {M}` / `خلصت كل صلوات النهاردة ✓`). When one or more prayers are pinned, the header counts pinned prayers; when none are pinned, it counts all active prayers (`countedPrayers()` pattern).
  - **الأشخاص:** Groups active prayers by person (`personName`) showing each person's active prayer count (`INT-03`), opening a person detail screen with `صليت لكلهم` (batch-log all active prayers for that person), individual prayer cards, and a collapsible `المكتمل ({N})` section.
- **D-02:** **5 sort modes with prayed-today sinking & pin priority (`INT-04`):** Support all five sorts from `daily`: `عشوائي` (daily-seeded stable hash per local day), `الأكتر إهمالاً` (never-prayed prayers first, then oldest `lastPrayedAt`), `الأقدم إضافة`, `الأحدث إضافة`, and `أبجدي` (using `normalizeArabic()`). Within active prayers, items not yet prayed today appear before items already prayed today, and pinned prayers stay at the top of the unprayed group.
- **D-03:** **Prayer card fields & Drizzle schema extension (`INT-01`):** — **Reversibility:** one-way — adding columns to `prayers` requires a Drizzle SQL migration (`app/drizzle/`) and updating `app/features/db/__tests__/migrate.test.ts` fixtures. Extend the existing `prayers` table in `app/features/db/schema.ts` with pin state (e.g., `pinned` / `pinnedAt`) and answer state (`answeredAt`, `outcome`) while keeping `syncCols()`, `body`, `personName`, `sinceLocalDate`, and append-only `prayerEvents` (`prayedAt`, `localDate`, optional `note`).
- **D-04:** **Optional note dialog on `صليت` (`INT-02`):** Match `daily`'s `askNote` pattern: tapping **«صليت»** on a prayer card (or **«صليت لكلهم»** on a person's page) opens a quick optional note dialog (user can leave it blank and confirm immediately) that inserts an append-only row into `prayer_events` and increments the card's prayed count.
- **D-05:** **Diacritic-insensitive prayer search (`INT-05`):** Search prayers using `normalizeArabic()` / `matches()` from `@roi/shared` across prayer text and person name.

### Answered Prayers & Gratitude Tie-In (`INT-06`, `INT-07`)
- **D-06:** **«اتستجابت» archive & reopen (`INT-06`):** Marking a prayer **«اتستجابت»** prompts for an optional outcome note (`النتيجة (اختياري)`) and moves it to the answered archive screen (accessible from the **تشفع** header, showing answered count, relative date, prayer count, and outcome). Users can also reopen an answered prayer (`رجّعها`) back to active.
- **D-07:** **One-tap answered-prayer → gratitude prefill (`INT-07`):** Tapping the one-tap gratitude action on an answered prayer navigates to **دفتر الشكر** with today's card pre-filled (appended as a new line if today already has gratitude text) so the user can review or edit it before autosave persists it.

### Gratitude Notebook (`دفتر الشكر`) & Monthly View (`GRT-01`, `GRT-03`, `GRT-04`)
- **D-08:** **Single-screen layout (today on top + month-grouped list below):** Opening **دفتر الشكر** shows today's gratitude card at the top, followed below by a single continuous scrollable list of filled past days grouped by month (no month-switching arrows, `GRT-03`), plus a **«ضيف ليوم فات»** date picker action to add or edit any past day (`GRT-04`). Empty days without entries are not shown in the list.
- **D-09:** **One card per day with multi-entry line appending & autosave (`GRT-01`):** — **Reversibility:** one-way — preserves the existing `gratitudeLines` unique `localDate` and `gratitudeId(localDate)` natural-key Drive merge contract in `app/features/db/schema.ts`. Keep one `gratitude_lines` row per local calendar day (`gratitudeId(localDate)`). Writing or tapping "أضف شكر تاني" / the answered-prayer link on a day that already has text appends a new line inside that same day's text card, and edits autosave automatically as the user types / leaves.
- **D-10:** **Animated expandable full-screen writing mode:** Today's gratitude card includes an expand control that smoothly animates (using `react-native-reanimated`) into a full-screen distraction-free writing canvas and collapses back cleanly.

### Nightly Reminder, Tool Settings & Home Enablement (`GRT-02`, `SET-02`..`SET-04`)
- **D-11:** **Tool settings in both tool header and global Settings:** Expose each tool's settings (default **تشفع** sort, **دفتر الشكر** nightly reminder toggle + time) both via a gear icon inside the tool's header and in the global **Settings** screen (`app/features/settings/`), persisted in syncable SQLite `settings` (or device-local MMKV for OS notification scheduling state as appropriate).
- **D-12:** **Opt-in nightly gratitude reminder (`GRT-02`, `SET-04`):** The nightly gratitude reminder defaults to **off** (with a default preset time of `21:00` / ٩:٠٠ مساءً when toggled on). Request OS notification permission (`expo-notifications`) only at the moment the user turns the reminder on, and schedule a gentle, generic, non-accusing Egyptian Arabic notification.
- **D-13:** **Enable Home tiles for Phase 5 tools:** Add `'intercession'` and `'gratitude'` to `IMPLEMENTED_HOME_TOOLS` in `app/features/profile/repository.ts` and wire their routes in `app/features/home/HomeScreen.tsx` so **أدواتك** displays **ليا أنا**, **تشفع**, and **دفتر الشكر** (while keeping **حفظ الآيات** hidden until Phase 6).

### Claude's Discretion
- Exact Drizzle migration `0003` column names on `prayers` (`pinnedAt` vs `isPinned` boolean/integer, `answeredAt`, `outcome`, and optional `note` on `prayerEvents` if needed for `D-04`) and updating `app/features/db/__tests__/migrate.test.ts` fixtures.
- Exact Reanimated shared-value / layout transition implementation for the expandable full-screen gratitude editor (`D-10`), adhering to RTL and `eslint-plugin-react-native-a11y` rules.
- Exact `expo-notifications` scheduling/rescheduling helper structure (designed cleanly so Phase 6 can add review, prayer, and weekly-verse reminders onto the same module).
- Exact Egyptian Arabic copy for empty states, generic nightly reminder text, and prayer outcome/gratitude prefill template.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — vision, 4-tool scope, Egyptian Arabic tone, privacy rules
- `.planning/REQUIREMENTS.md` — `INT-01`..`INT-07`, `GRT-01`..`GRT-04`, `SET-02`..`SET-04` (Phase 5 slice), `FND-03`, `FND-04`, `FND-06`, `FND-07`
- `.planning/ROADMAP.md` — Phase 5 goal, success criteria, and Cross-Phase Notes
- `.planning/STATE.md` — owner decisions (Arabic-Indic digits, sync-ready schema)
- `.claude/CLAUDE.md` — pinned mobile dependencies, RTL rules, accessibility & UI guidelines

### Shared & Mobile Code Contracts
- `app/features/db/schema.ts` — existing `prayers`, `prayerEvents`, `gratitudeLines`, `gratitudeId()`, `syncCols()`, `settings`
- `app/features/db/events.ts` & `app/features/db/__tests__/migrate.test.ts` — append-only event helpers and migration fixture tests
- `app/features/home/HomeScreen.tsx` & `app/features/profile/repository.ts` — `HOME_TOOL_META`, `IMPLEMENTED_HOME_TOOLS`
- `app/features/settings/` — global Settings grouped-card screen where tool settings also surface
- `shared/src/arabic.ts` — `normalizeArabic()`, `matches()`, `toArabicDigits()`, `formatArabicDate()`
- `shared/src/period.ts` — `localDateKey()`, `uuidv7` / `newId()`

### Owner Reference Implementations (External Repo)
- `/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily/lib/features/intercede/data/models.dart` — 5 `PrayerSort` modes, `countedPrayers()`, `openPrayers()` (prayed-today sinking + pinned priority), `answeredPrayers()`
- `/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily/lib/features/intercede/ui/intercede_screen.dart` — 2-tab **الصلوات** | **الأشخاص** layout, header actions (sort, search, answered), daily progress header
- `/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily/lib/features/intercede/ui/entity_page.dart` — person detail view, `صليت لكلهم`, active prayers, collapsible `المكتمل` with `رجّعها`
- `/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily/lib/features/intercede/ui/answered_page.dart` — answered prayers archive card layout (title, person, relative date, prayer count, outcome)
- `/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily/lib/features/intercede/ui/prayer_page.dart` — prayer detail & log history timeline
- `/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily/lib/features/intercede/ui/widgets/prayer_menu.dart` — prayer card menu (pin, edit, complete with optional outcome, delete)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **Database tables (`app/features/db/schema.ts`):** `prayers`, `prayerEvents`, and `gratitudeLines` (`gratitudeId(localDate)`) are already defined and migrated in Phase 1; `prayers` needs `pinned`/`answeredAt`/`outcome` columns added via a new Drizzle migration.
- **`@roi/shared` (`shared/src/`):** Exports `normalizeArabic()`, `matches()`, `toArabicDigits()`, `formatArabicDate()`, `localDateKey()`, and `newId()`.
- **UI & Animation stack (`app/package.json`):** `react-native-reanimated` (`4.7.1`), `react-native-gesture-handler`, `@rn-primitives/dialog`, `@rn-primitives/select`, and `lucide-react-native` are already installed.

### Established Patterns
- **Bun isolated linker (`bunfig.toml`):** `expo-notifications` (and `@react-native-community/datetimepicker` if used for time/date picking, or a custom/Reusables picker) must be declared in `app/package.json` and vetted if new packages are added.
- **Drizzle migrations & fixtures (`01-11`):** Every schema change in `app/features/db/schema.ts` requires `drizzle-kit generate` and updating `app/features/db/__tests__/migrate.test.ts`.
- **Append-only event counters (`FND-07`):** Prayer counts and `lastPrayedAt` derive from live (`deletedAt IS NULL`) rows in `prayer_events`.

### Integration Points
- **`app/features/profile/repository.ts` & `app/features/home/HomeScreen.tsx`:** Enable `'intercession'` and `'gratitude'` in `IMPLEMENTED_HOME_TOOLS` and route their tiles to the new `expo-router` screens.
- **`app/features/settings/`:** Add **تشفع** (default sort) and **دفتر الشكر** (nightly reminder toggle + time) sections alongside the in-tool gear sheets.

</code_context>

<specifics>
## Specific Ideas

- Follow `/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily/lib/features/intercede/` closely for **تشفع** tabs, sorting (`عشوائي`, `الأكتر إهمالاً`, `الأقدم`, `الأحدث`, `أبجدي`), `صليت` optional note dialog, `صليت لكلهم`, `اتستجابت` outcome modal + archive, and `رجّعها` reopen.
- In **دفتر الشكر**, allow multiple gratitude entries on the same day by appending new lines inside that day's single card, and include an expand button on today's card that animates smoothly into a full-screen writing view.
- On the one-tap answered-prayer → gratitude link (`INT-07`), open **دفتر الشكر** with today's card pre-filled/appended so the user can edit before autosaving.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Per roadmap boundaries: Home "due today" counts `HOME-04` and remaining tool reminders `SET-02`..`SET-04` ship in Phase 6; widgets in Phase 7; Google Drive sync in Phase 8; coach marks and biometric lock in Phase 9.)

</deferred>

---

*Phase: 5-Intercession & Gratitude*
*Context gathered: 2026-11-26*
