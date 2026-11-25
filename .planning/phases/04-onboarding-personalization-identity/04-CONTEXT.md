# Phase 4: Onboarding, Personalization & Identity - Context

**Gathered:** 2026-11-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the first-run 3-screen onboarding flow with a first win in the first minute and an optional skippable Google Sign-In on Screen 3 (`HOME-01`, `HOME-02`, Phase 2 deferred Google Sign-In), name and gender personalization across both public content and Egyptian Arabic UI strings (`PERS-01`..`PERS-04`), the customizable **أدواتك** Home grid with a one-time intro message (`HOME-03`, `HOME-05`), global Settings (`SET-01`), and the full **ليا أنا** tool (`ME-01`..`ME-09`: weekly & monthly verses with saved non-repeat history, Names of God, Blessings, local favorites ⭐, recipient-aware long-press copy, local personal items, and Google-authenticated public suggestions).

New capabilities belonging to later phases — Intercession (`تشفع`), Gratitude (`دفتر الشكر`), Memorization (`حفظ الآيات`), Home "due today" counts (`HOME-04`), per-tool notification settings (`SET-02`..`SET-04`), home-screen widgets (`WDG-*`), full Google Drive backup/restore (`SYNC-02`..`SYNC-06`), coach marks/help (`HELP-*`), and biometric lock (`SET-05`) — remain out of scope for Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Onboarding & Google Sign-In (`HOME-01`, `HOME-02`, `PERS-01`, Phase 2 Deferred Note)
- **D-01:** **3-screen onboarding flow:** Once `ContentGate` completes the initial library download, new users walk through three screens:
  1. **Screen 1:** What Ro'i is and an overview of the 4 core tools.
  2. **Screen 2:** Name and gender (`ولد` / `بنت`) — **both required** on Screen 2 so Ro'i feels personal from minute one (`PERS-01`, `PERS-04`).
  3. **Screen 3:** Curated 3–5 personalized starter verses (with shuffle and search options) where tapping a verse stars it to **Favorites ⭐** right on the card as the user's first win (`HOME-02`), plus finish actions at the bottom: a primary **«استمر باستخدام جوجل»** button and a small **«استمر بدون تسجيل»** text link underneath it (allowing users who don't pick a verse before finishing to proceed cleanly as "later").
- **D-02:** **Onboarding Google Sign-In requests `drive.appdata` upfront:** — **Reversibility:** costly — changes the OAuth scopes requested at initial sign-in and governs whether Phase 8 needs an extra consent prompt. Tapping **«استمر باستخدام جوجل»** on Screen 3 shows a plain explanation (suggesting items to everyone now and preparing private Drive backup in their hidden app folder later) and requests Google Sign-In together with the `drive.appdata` scope. Cancelling or failing sign-in never traps the user — they can continue with **«استمر بدون تسجيل»** or connect later from Settings (`SYNC-01`).

### Personalization & Data Placement (`PERS-01`..`PERS-04`, `HOME-03`)
- **D-03:** **Gender-aware UI & neutral fallback:** All user-facing Arabic UI strings across Onboarding, Home, **ليا أنا**, and Settings adapt to the user's chosen gender (`PERS-04`), while all public content renders through `@roi/shared`'s `personalize()` (`text` / `textFemale` / `{الاسم}` with neutral fallback if name is ever empty, `PERS-02`, `PERS-03`).
- **D-04:** **Syncable SQLite `settings` vs. device-local MMKV:** — **Reversibility:** one-way — profile and Home tile keys stored in the syncable SQLite `settings` table become part of the Phase 8 Drive merge contract and Drizzle schema fixtures (`D-14`). Store user profile (`name`, `gender`) and Home tile visibility/order in the syncable SQLite `settings` table so future Drive restore brings them back, while keeping device-local UI state (`onboarding_completed`, `home_intro_dismissed`, theme, Scripture font size) in MMKV (`app/services/storage.ts`).

### Home Grid ("أدواتك") & Unbuilt Tools (`HOME-03`, `HOME-05`)
- **D-05:** **Home screen top layout & one-time intro:** Above the **أدواتك** grid, show a gender-aware personalized greeting with the user's name, a one-time dismissible intro card explaining **أدواتك** (`HOME-05`, permanently dismissed in MMKV once closed), and a compact weekly-verse peek that opens **ليا أنا**.
- **D-06:** **Hide unbuilt Phase 5–6 tools until implemented:** In Phase 4, Home renders only the **ليا أنا** tile (hiding **حفظ الآيات**, **تشفع**, and **دفتر الشكر** until their phases ship) while building the underlying visibility + order model in SQLite `settings` for all 4 tools.
- **D-07:** **Inline edit mode ("تعديل") for tile customization:** A subtle **«تعديل»** control next to **أدواتك** toggles inline edit mode on the Home grid with show/hide switches and move up/down controls (`HOME-03`), preventing the user from hiding the last visible tool.

### ليا أنا Structure, Verse Pools & History (`ME-01`..`ME-06`)
- **D-08:** **Single shared verses library (no weekly/monthly tags):** Settling the `ROADMAP.md` Phase 4 open decision per owner direction and reference implementation (`/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily/lib/features/leyaana/data/daily_pick.dart`), verses have no weekly or monthly tag — every live verse in SQLite `verses` is eligible for both **آية الأسبوع** (Saturday–Friday via `weekKey`) and **آية الشهر** (`monthKey`).
- **D-09:** **Persisted assignment history (`ME-03`):** — **Reversibility:** one-way — assignment history rows persist in local SQLite (`D-14` migration fixtures) and survive future content edits and sync. Store each assigned weekly and monthly verse in a dedicated SQLite table including a snapshot of the verse reference/text (`ref`, `text`, `textFemale`) alongside `verseId` and period key so **السجل** stays intact even if the public verse is later edited or soft-deleted.
- **D-10:** **4-tab navigation & calm daily cards:** **ليا أنا** uses 4 top tabs matching `daily`'s tab feel plus Favorites: **الآيات | أسماء الله | البركات | المفضلة**.
  - **الآيات:** Shows the current weekly verse and monthly verse cards plus a **«السجل»** entry to view past assigned verses.
  - **أسماء الله** & **البركات:** Each tab highlights one calm daily/featured card (deterministic per local day) alongside a **«تصفح الكل»** button that opens a searchable list of compact cards (title + optional supporting `verseRef` + ⭐ toggle) where tapping any card opens the full rich-text card view (Markdown subset via `react-native-marked`).
  - **المفضلة:** Dedicated Favorites ⭐ tab listing all starred items across verses, Names of God, and Blessings.

### Personal Items, Recipient-Aware Copy & Global Settings (`ME-07`..`ME-09`, `SET-01`)
- **D-11:** **Local personal items for all 3 kinds (`ME-08`):** Users can create, edit, and soft-delete local personal items across all three kinds (**آية**, **اسم من أسماء الله**, **بركة**) using simple plain-text fields (matching Phase 2's `submitSuggestionInputSchema`: `kind`, `title`/`ref`, `text`, optional `verseRef` for blessings) without exposing raw `{الاسم}` tokens or Markdown syntax.
- **D-12:** **Inline Google Sign-In for "اقترح للكل" (`ME-09`):** When tapping **«اقترح للكل»** on a personal item while not signed into Google, explain why in plain Egyptian Arabic (*"عشان نراجع الاقتراحات ونمنع السبام"*) and prompt Google Sign-In inline right there; if offline, show a calm offline notice; when signed in, call `submitSuggestion` from Phase 2.
- **D-13:** **Recipient-aware verse copy (`ME-07`):** Long-pressing any card (or tapping a subtle copy icon on the card) copies the item with its reference and shows a calm `"اتنسخت"` toast.
  - For **Names of God & Blessings:** copy the displayed personalized text (with Markdown formatting stripped cleanly) plus title and supporting verse reference if present.
  - For **Verses with personalization (`{الاسم}` or male/female variant):** first ask **«الآية دي ليك ولا هتبعتها لحد؟»** (`ليا أنا` vs. `هبعتها لحد`). Choosing `ليا أنا` copies immediately with the user's own profile; choosing `هبعتها لحد` asks recipient gender (`ولد` / `بنت`) and optional recipient name, previews/composes via `personalize()`, and copies the personalized verse + reference. (Verses with no `{الاسم}` and no gender variant copy directly.)
- **D-14:** **Global Settings layout & support links (`SET-01`):** A gear icon in the Home header opens **Settings**, modeled on the grouped-card pattern in `tarneemna-app` (`settings_screen.dart` & `values.dart`):
  - **المظهر والقراءة:** Theme mode (`تلقائي` / `فاتح` / `داكن` via `useThemePreference`) and Scripture 5-step font size slider (reusing `ScriptureSizeProvider`).
  - **حسابك:** Edit name & gender (`PERS-01`, immediately refreshing personalized content and UI everywhere) and Google account status / **«ربط حساب جوجل»** (`SYNC-01` re-offer).
  - **المساعدة والتواصل:** Share app, Rate app (`SET-01`), Request help form (`SET-01`), Contact via WhatsApp (`https://wa.me/increasinglabs`, `SET-01`), plus an About footer showing app name and version.

### Claude's Discretion
- **Weekly & monthly shared seen-history:** Track assigned `verseId`s across both weekly and monthly slots in a shared seen-set (so a verse received as weekly is not repeated as monthly until every live verse in the pool has been assigned, then reset the cycle cleanly).
- **Exact Drizzle table names/columns** for `verse_assignments`, `favorites`, and `personal_items` (must follow `syncCols()`, UUIDv7, UTC epoch-ms, and `D-14` migration fixture tests), exact Markdown styling for `react-native-marked` under the warm paper light/dark palette, exact copy/wording for gender-aware UI strings (`PERS-04`), and whether Ro'i's rate/support URLs live in `app/constants/app.ts` with `EXPO_PUBLIC_*` overrides alongside Increasing Labs defaults from `tarneemna-app/lib/core/values.dart`.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project & Requirements
- `.planning/PROJECT.md` — vision, 4-tool scope, Egyptian Arabic tone, privacy rules
- `.planning/REQUIREMENTS.md` — `HOME-01`..`HOME-03`, `HOME-05`, `PERS-01`..`PERS-04`, `ME-01`..`ME-09`, `SET-01`
- `.planning/ROADMAP.md` — Phase 4 goal, success criteria, and Cross-Phase Notes
- `.planning/STATE.md` — owner decisions (Saturday week start, Arabic-Indic digits)
- `.claude/CLAUDE.md` — pinned mobile dependencies, RTL rules, UI/typography guidelines

### Prior Phase Decisions
- `.planning/phases/01-foundation-native-spike/01-CONTEXT.md` — `D-01`..`D-14` (`Amiri` font, 5-step Scripture slider, warm paper theme, UUIDv7, UTC epoch-ms, migration fixture tests)
- `.planning/phases/02-content-backend-first-download/02-CONTEXT.md` — `D-01`..`D-12` (`ContentGate`, 6h delta sync, Google-authenticated `submitSuggestion`, deferred Onboarding Google Sign-In note)
- `.planning/phases/03-admin-panel-moderation/03-CONTEXT.md` — `D-04`, `D-08` (verses plain text vs. Names/Blessings Markdown subset for `react-native-marked`; `tags` and `sortOrder` `null` in v1)

### Shared & Mobile Code Contracts
- `shared/src/arabic.ts` — `NAME_TOKEN`, `personalize()`, `normalizeArabic()`, `matches()`, `toArabicDigits()`, `formatArabicDate()`
- `shared/src/period.ts` — `localDateKey()`, `weekKey()` (Saturday start), `monthKey()`, `seededPick()`
- `shared/src/schemas.ts` — `verseItemSchema`, `nameOfGodItemSchema`, `blessingItemSchema`, `submitSuggestionInputSchema`, `personalizedTextSchema`
- `app/features/db/schema.ts` — `syncCols()`, `settings`, `verses`, `namesOfGod`, `blessings`
- `app/app/_layout.tsx` & `app/app/index.tsx` — root `useMigrations` + `ScriptureSizeProvider` + `ContentGate` entry
- `app/features/sync/LibraryReadyView.tsx` — current Home placeholder replaced/integrated by Phase 4 Home (preserve `DEV_TOOLS_ENABLED` dev links)
- `app/services/storage.ts` — MMKV preferences (`theme`, `scripture_step`, `scripture_font`)
- `app/constants/app.ts` & `app/constants/theme.ts` — `GOOGLE_OAUTH`, `ROUTES`, `DEV_TOOLS_ENABLED`, `FONT_FAMILIES`, `SCRIPTURE_SIZES`
- `app/locales/ar.json` — existing Egyptian Arabic string table

### Owner Reference Implementations (External Repos)
- `/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily/lib/features/leyaana/data/daily_pick.dart` — un-tagged shared pool deterministic pick logic
- `/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily/lib/features/leyaana/data/repository.dart` — Leyaana content loading & personalization pattern
- `/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily/lib/features/leyaana/ui/leyaana_screen.dart` — calm rounded-card Leyaana tabs (`الآيات`, `أسماء الله`, `البركات`) and long-press copy vibe
- `/Users/andrew/Documents/Work/Dev/Projects/Personalss/tarneemna-app/lib/features/settings/presentation/screens/settings_screen.dart` — grouped-card Settings UI structure
- `/Users/andrew/Documents/Work/Dev/Projects/Personalss/tarneemna-app/lib/core/values.dart` — Increasing Labs support/rate/WhatsApp URLs (`wa.me/increasinglabs`, support form, promote link pattern)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`@roi/shared` (`shared/src/`):** Already exports `personalize()`, `NAME_TOKEN`, `normalizeArabic()`, `matches()`, `toArabicDigits()`, `formatArabicDate()`, `weekKey()`, `monthKey()`, `localDateKey()`, `seededPick()`, `newId()`, and `submitSuggestionInputSchema`.
- **Theme, Typography & Primitives (`app/constants/theme.ts`, `app/features/scripture/scripture.tsx`, `app/hooks/use-theme-preference.ts`, `app/components/ui/`):** `ScriptureSizeProvider` (5-step `Amiri` sizing), `useThemePreference` (`system`/`light`/`dark`), and `@rn-primitives` `Dialog` / `Select` / `Text` / `Icon` are already installed and verified.
- **SQLite + Drizzle (`app/features/db/schema.ts`, `app/features/db/client.ts`):** `syncCols()`, `settings`, `verses`, `namesOfGod`, `blessings`, and `syncMeta` already exist with WAL mode and root `useMigrations` gating.
- **Google Sign-In & Sync Client (`app/constants/app.ts`, `app/features/sync/api.ts`):** `@react-native-google-signin/google-signin` (`17.0.0`) and `graphql-request` client are already configured with `GOOGLE_OAUTH.webClientId` / `iosClientId` and `API_BASE_URL`.

### Established Patterns
- **Bun isolated linker (`bunfig.toml`):** Any new mobile packages (such as `react-native-marked` for `ME-04`/`ME-05` Markdown rendering or `expo-clipboard` / `expo-linking` if needed) must be declared directly in `app/package.json` and vetted against the project's package rules.
- **Drizzle migrations & fixtures (`01-11`, `D-14`):** Adding local user tables (`verse_assignments`, `favorites`, `personal_items`) requires generating Drizzle SQL migrations (`app/drizzle/`) and updating checked-in SQLite fixture tests (`app/features/db/__tests__/migrate.test.ts`).
- **Accessibility & RTL (`app/eslint.config.js`, `app/app/_layout.tsx`):** `eslint-plugin-react-native-a11y` enforces accessible touch targets (`>= 44pt`) and roles; all UI uses logical RTL styling and `MAX_FONT_SIZE_MULTIPLIER`.
- **Privacy telemetry (`app/services/telemetry.ts`):** `track()` only accepts allowlisted generic event names — never log user name, gender, verse text, or personal items.

### Integration Points
- **`app/app/index.tsx` & `app/features/sync/ContentGate.tsx`:** After `ContentGate` passes (`lastContentVersion > 0`), root navigation must route first-time users (no `onboarding_completed` flag in MMKV) into Onboarding and returning users to Home (`أدواتك`), preserving `DEV_TOOLS_ENABLED` links to `/(dev)/spike` and `/(dev)/torture`.
- **Backend `submitSuggestion` GraphQL mutation (`backend/`):** Already accepts `submitSuggestionInputSchema` authenticated with a verified Google ID token (`D-10` in Phase 2); Phase 4's **"اقترح للكل"** action calls it directly.

</code_context>

<specifics>
## Specific Ideas

- On Onboarding Screen 3, place a primary **«استمر باستخدام جوجل»** button with a smaller **«استمر بدون تسجيل»** text link directly beneath it (owner wording: *"ممكن في اخر واحده (التالته) يكون فييها استمر باستخدام جوجل button او استمر بدون تسجيل صغيره تحتها نص بس"*).
- Follow `/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily` for the un-tagged shared verse pool and calm **ليا أنا** card/tab vibe, enhanced in Ro'i with persisted non-repeat weekly/monthly history (`ME-03`) and `Favorites ⭐` (`ME-06`).
- On verse copy, ask **«الآية دي ليك ولا هتبعتها لحد؟»** and if sending to someone else, ask recipient gender (`ولد` / `بنت`) and optional name before composing and copying (`ME-07`).
- Model Settings on `/Users/andrew/Documents/Work/Dev/Projects/Personalss/tarneemna-app/lib/features/settings/presentation/screens/settings_screen.dart` and `values.dart` (`wa.me/increasinglabs`, rate/share, support form).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. (Per Phase 2/5/6/7/8/9 roadmap boundaries: unbuilt Phase 5–6 tool tiles stay hidden on Home until their phases are implemented, and actual Drive upload/merge/restore executes in Phase 8 using the `drive.appdata` consent optionally granted during Phase 4 onboarding or Settings.)

</deferred>

---

*Phase: 4-Onboarding, Personalization & Identity*
*Context gathered: 2026-11-25*
