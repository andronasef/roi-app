# Phase 4: Onboarding, Personalization & Identity - Research

**Researched:** 2026-11-25
**Domain:** Expo SDK 58 / React Native 0.88 mobile UI, local SQLite (Drizzle) + MMKV persistence, RTL Egyptian Arabic personalization, Markdown rendering, Google Sign-In (`drive.appdata` + `submitSuggestion`)
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** **3-screen onboarding flow:** Once `ContentGate` completes the initial library download, new users walk through three screens:
  1. **Screen 1:** What Ro'i is and an overview of the 4 core tools.
  2. **Screen 2:** Name and gender (`ولد` / `بنت`) — **both required** on Screen 2 so Ro'i feels personal from minute one (`PERS-01`, `PERS-04`).
  3. **Screen 3:** Curated 3–5 personalized starter verses (with shuffle and search options) where tapping a verse stars it to **Favorites ⭐** right on the card as the user's first win (`HOME-02`), plus finish actions at the bottom: a primary **«استمر باستخدام جوجل»** button and a small **«استمر بدون تسجيل»** text link underneath it (allowing users who don't pick a verse before finishing to proceed cleanly as "later").
- **D-02:** **Onboarding Google Sign-In requests `drive.appdata` upfront:** — **Reversibility:** costly — changes the OAuth scopes requested at initial sign-in and governs whether Phase 8 needs an extra consent prompt. Tapping **«استمر باستخدام جوجل»** on Screen 3 shows a plain explanation (suggesting items to everyone now and preparing private Drive backup in their hidden app folder later) and requests Google Sign-In together with the `drive.appdata` scope. Cancelling or failing sign-in never traps the user — they can continue with **«استمر بدون تسجيل»** or connect later from Settings (`SYNC-01`).
- **D-03:** **Gender-aware UI & neutral fallback:** All user-facing Arabic UI strings across Onboarding, Home, **ليا أنا**, and Settings adapt to the user's chosen gender (`PERS-04`), while all public content renders through `@roi/shared`'s `personalize()` (`text` / `textFemale` / `{الاسم}` with neutral fallback if name is ever empty, `PERS-02`, `PERS-03`).
- **D-04:** **Syncable SQLite `settings` vs. device-local MMKV:** — **Reversibility:** one-way — profile and Home tile keys stored in the syncable SQLite `settings` table become part of the Phase 8 Drive merge contract and Drizzle schema fixtures (`D-14`). Store user profile (`name`, `gender`) and Home tile visibility/order in the syncable SQLite `settings` table so future Drive restore brings them back, while keeping device-local UI state (`onboarding_completed`, `home_intro_dismissed`, theme, Scripture font size) in MMKV (`app/services/storage.ts`).
- **D-05:** **Home screen top layout & one-time intro:** Above the **أدواتك** grid, show a gender-aware personalized greeting with the user's name, a one-time dismissible intro card explaining **أدواتك** (`HOME-05`, permanently dismissed in MMKV once closed), and a compact weekly-verse peek that opens **ليا أنا**.
- **D-06:** **Hide unbuilt Phase 5–6 tools until implemented:** In Phase 4, Home renders only the **ليا أنا** tile (hiding **حفظ الآيات**, **تشفع**, and **دفتر الشكر** until their phases ship) while building the underlying visibility + order model in SQLite `settings` for all 4 tools.
- **D-07:** **Inline edit mode ("تعديل") for tile customization:** A subtle **«تعديل»** control next to **أدواتك** toggles inline edit mode on the Home grid with show/hide switches and move up/down controls (`HOME-03`), preventing the user from hiding the last visible tool.
- **D-08:** **Single shared verses library (no weekly/monthly tags):** Settling the `ROADMAP.md` Phase 4 open decision per owner direction and reference implementation (`/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily/lib/features/leyaana/data/daily_pick.dart`), verses have no weekly or monthly tag — every live verse in SQLite `verses` is eligible for both **آية الأسبوع** (Saturday–Friday via `weekKey`) and **آية الشهر** (`monthKey`).
- **D-09:** **Persisted assignment history (`ME-03`):** — **Reversibility:** one-way — assignment history rows persist in local SQLite (`D-14` migration fixtures) and survive future content edits and sync. Store each assigned weekly and monthly verse in a dedicated SQLite table including a snapshot of the verse reference/text (`ref`, `text`, `textFemale`) alongside `verseId` and period key so **السجل** stays intact even if the public verse is later edited or soft-deleted.
- **D-10:** **4-tab navigation & calm daily cards:** **ليا أنا** uses 4 top tabs matching `daily`'s tab feel plus Favorites: **الآيات | أسماء الله | البركات | المفضلة**.
  - **الآيات:** Shows the current weekly verse and monthly verse cards plus a **«السجل»** entry to view past assigned verses.
  - **أسماء الله** & **البركات:** Each tab highlights one calm daily/featured card (deterministic per local day) alongside a **«تصفح الكل»** button that opens a searchable list of compact cards (title + optional supporting `verseRef` + ⭐ toggle) where tapping any card opens the full rich-text card view (Markdown subset via `react-native-marked`).
  - **المفضلة:** Dedicated Favorites ⭐ tab listing all starred items across verses, Names of God, and Blessings.
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope. (Per Phase 2/5/6/7/8/9 roadmap boundaries: unbuilt Phase 5–6 tool tiles stay hidden on Home until their phases are implemented, and actual Drive upload/merge/restore executes in Phase 8 using the `drive.appdata` consent optionally granted during Phase 4 onboarding or Settings.)
</user_constraints>

## Project Constraints (from CLAUDE.md)

Extracted from [CLAUDE.md](file:///Users/andrew/Documents/Work/Dev/Projects/Personalss/%D8%B1%D9%88%D8%B9%D9%8A/.claude/CLAUDE.md) and verified against existing guards:

1. **Pinned Expo SDK 58 / NativeWind 4 / Bun Isolated Linker (`bunfig.toml`):**
   - Always use `bunx expo install <pkg>` for Expo-tracked packages so SDK 58 pins match `react-native@0.88.1` / `react@19.3.0`. Never upgrade `nativewind@4.2.7`, `tailwindcss@3.4.19`, `graphql@16.15.0`, `typescript@~6.0.3`, or `reanimated@4.7.1`/`worklets@0.13.0` [VERIFIED: `.claude/CLAUDE.md:35-38`, `app/package.json:47-63`].
   - Under `bunfig.toml` isolated linker, every direct import in `app/` must be listed in `app/package.json`.
   - `app/` uses Tailwind 3 (`3.4.19`); `admin/` uses Tailwind 4 (`4.3.5`). Enforced by `app/__tests__/guards.test.ts:79-109` [VERIFIED: `app/__tests__/guards.test.ts:79-109`].
2. **Forced RTL & Arabic-Only Rules:**
   - Forced RTL (`expo-localization` `forcesRTL: true`) and Arabic-only UI (`app/app.json:53-57`).
   - Only logical Tailwind classes (`start-*`, `end-*`, `ps-*`, `pe-*`, `ms-*`, `me-*`, `text-start`, `border-s-*`, `border-e-*`). Static guard forbids `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`, `border-l-`, `border-r-`, `tracking-` [VERIFIED: `app/__tests__/guards.test.ts:64-77`]:
     ```ts
     /(?:^|[\s'"`])(ml-|mr-|pl-|pr-|left-|right-|text-left\b|text-right\b|border-l-|border-r-|tracking-)/
     ```
   - Forbidden props enforced by static guard (`app/__tests__/guards.test.ts:141-158`): `offlineAccess`, `serverAuthCode`, `setUserId`, `setUserProperty`, and `allowFontScaling={false}` [VERIFIED: `app/__tests__/guards.test.ts:141-158`].
   - `eslint-plugin-react-native-a11y` (`3.5.1`) is enabled as `warn` with `--max-warnings 0` on `bun --cwd app run lint` [VERIFIED: `app/eslint.config.js:11-16`, `app/package.json:10`].
   - `Amiri` (`FONT_FAMILIES.scripture.amiri`) is the default `<Scripture>` font (`SCRIPTURE_FONT_DEFAULT = 'amiri'`) [VERIFIED: `app/constants/theme.ts:29`]. All numbers and dates use `toArabicDigits()` and `formatArabicDate()` from `@roi/shared`.
3. **Sync-Ready SQLite Schema & Soft-Delete Guards:**
   - Every table exported from `app/features/db/schema.ts` MUST spread `syncCols()` (`id`, `created_at`, `updated_at`, `deleted_at` — `id` text primary key, `created_at`/`updated_at` NOT NULL integer epoch ms, `deleted_at` nullable integer) [VERIFIED: `app/features/db/schema.ts:8-13`, `app/features/db/__tests__/schema.test.ts:49-71`].
   - Hard `.delete(` calls on `db` or `tx` are forbidden in `app/{app,features,services,hooks}` [VERIFIED: `app/features/db/__tests__/schema.test.ts:87-101`].
   - Adding tables requires `drizzle-kit generate` (`app/drizzle/0002_*.sql`), updating `app/features/db/__tests__/migrate.test.ts` (including the table list check at `migrate.test.ts:137-148`), and verifying `v1.sqlite` and `v2.sqlite` fixtures migrate cleanly without data loss.
4. **Privacy & Telemetry Boundary:**
   - `@react-native-firebase/*` may ONLY be imported in `app/services/telemetry.ts` [VERIFIED: `app/__tests__/guards.test.ts:47-62`].
   - `track()` accepts only `AllowedEvent` (`app/constants/telemetry.ts:11-21`). Never log user name, gender, verse text, or personal items to Firebase Analytics or Crashlytics.
   - No `offlineAccess` or `serverAuthCode` in Google Sign-In (`app/__tests__/guards.test.ts:147-148`).
   - All personal data stays local; the only Phase 4 network egress for user-authored content is the explicit **"اقترح للكل"** (`submitSuggestion`) GraphQL mutation authenticated by Google ID token [VERIFIED: `.claude/CLAUDE.md:19`, `backend/src/suggestions/suggestions.resolver.ts:64-77`].
5. **Test Runner Constraint:**
   - Vitest MUST run under real Node (`bun run test` / `npx vitest run`), never `bun --bun` or `bun test` [VERIFIED: `vitest.config.ts:3-7`].

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HOME-01 | First launch shows 3 onboarding screens (what Ro'i is; name + gender; pick a first verse or "later") | `app/app/index.tsx` routes based on MMKV `onboarding_completed` inside `ContentGate`; 3-screen `OnboardingFlow` under `app/features/onboarding/` |
| HOME-02 | User reaches a first win (a verse, a prayer card or a gratitude line saved) within the first minute | Onboarding Screen 3 renders 3–5 personalized starter verses from SQLite `verses` with immediate ⭐ insert into `favorites` (or clean skip via `"استمر بدون تسجيل"` / `"استمر باستخدام جوجل"`) |
| HOME-03 | Home shows a tile per tool; the user can show, hide and reorder tiles, and the choice persists | Syncable SQLite `settings` JSON key for 4-tool config (`leyaana`, `memorize`, `intercession`, `gratitude`) with visibility + order; Phase 4 Home renders only `leyaana` in UI (`D-06`), edit mode guards last visible tool (`D-07`) |
| HOME-05 | A one-time intro message explains the home screen | Device-local MMKV flag `pref.home_intro_dismissed` (`app/services/storage.ts`) drives dismissible intro card above **أدواتك** |
| PERS-01 | User enters name and gender; both can be changed later in Settings | Required on Onboarding Screen 2, stored in syncable SQLite `settings` (`profile`), editable in Settings `حسابك` with reactive refresh via shared profile context/store |
| PERS-02 | Content renders from `text` / `textFemale` / `{الاسم}` using the one shared `personalize()` function | `@roi/shared` `personalize(item, profile)` (`shared/src/arabic.ts:73-80`) applied across starter verses, Home peek, **ليا أنا** cards, History, Favorites, and recipient copy |
| PERS-03 | When the name is missing, the content falls back to a neutral form | `personalize()` strips `NAME_TOKEN` (`{الاسم}`) and collapses whitespace when `profile.name?.trim()` is empty (`shared/src/arabic.ts:75-79`) |
| PERS-04 | UI strings are also gender-aware | Typed `uiCopy(key, gender)` helper over `app/locales/ar.json` / typed gender dictionary returning male/female Egyptian Arabic phrasing (`04-UI-SPEC.md:106`) |
| ME-01 | User sees a weekly verse picked pseudo-randomly from their own seed, stable for the whole week (Saturday to Friday), never repeating a verse they already got | `weekKey(now, 6)` (`shared/src/period.ts:10-13`) + `seededPick()` (`shared/src/period.ts:37-43`) over live `verses` excluding seen `verseId`s from `verse_assignments`; persisted on first read for that `weekKey` |
| ME-02 | User sees a monthly verse with the same rules for the month | `monthKey(now)` (`shared/src/period.ts:16-18`) + `seededPick()` sharing the seen-set from `verse_assignments` so weekly and monthly don't repeat until pool exhausts |
| ME-03 | Past assignments are saved, so history survives content edits | `verse_assignments` SQLite table stores `verseId`, `periodType`, `periodKey`, `ref`, `text`, `textFemale`, `assignedAt` with `syncCols()`; **السجل** reads snapshots and applies current `personalize()` |
| ME-04 | User can read names of God as rich-text article cards | Daily deterministic pick via `seededPick(liveNames, \`name_of_god:\${localDateKey(now)}\`)` + `"تصفح كل الأسماء"` (`matches()` search) + full card rendered with `react-native-marked` `useMarkdown` + custom RTL `Renderer` |
| ME-05 | User can read blessings (first-person title, rich text, supporting verse) | Daily deterministic pick via `seededPick(liveBlessings, \`blessing:\${localDateKey(now)}\`)` + optional `verseRef` pill + `"تصفح كل البركات"` + `react-native-marked` `useMarkdown` |
| ME-06 | User can favorite any item with ⭐ and see all favorites | `favorites` SQLite table (`syncCols()` + `itemKind`, `itemId`, `itemSource`) with deterministic natural key `fav:${source}:${kind}:${itemId}` so star/unstar toggles cleanly via upsert/soft-delete; **المفضلة** tab joins public + personal items |
| ME-07 | User can long-press to copy any item, with its reference, to share outside the app | Card `onLongPress` + Copy button (`expo-clipboard` `setStringAsync`); plain-text Markdown strip for Names/Blessings; `"الآية دي ليك ولا هتبعتها لحد؟"` dialog for personalized verses (`{الاسم}` or `textFemale`) + `"اتنسخت"` toast |
| ME-08 | User can add personal items locally | `personal_items` SQLite table (`syncCols()` + `kind`, `title`, `text`, `verseRef`) for `verse` / `name_of_god` / `blessing`; plain-text create/edit modal + `حذف العنصر الشخصي` soft-delete confirmation |
| ME-09 | User can optionally suggest a personal item to everyone | `"اقترح للكل"` calls GraphQL `submitSuggestion(input)` (`backend/src/suggestions/suggestions.resolver.ts:67-77`) with `Authorization: Bearer <idToken>`; prompts inline Google Sign-In when unauthenticated (`D-12`) |
| SET-01 | Global settings: dark mode, rate app, request help, WhatsApp contact | `SettingsScreen` (`app/app/settings.tsx`) grouped cards: theme (`useThemePreference`), `ScriptureSizeSlider`, profile (`name`/`gender`), Google account connect/status (`drive.appdata`), Share (`Share.share`), Rate/Support/WhatsApp (`expo-linking` + `tarneemna-app` `values.dart` defaults) |
</phase_requirements>

## Summary

Phase 4 transforms the post-download `LibraryReadyView` placeholder into Ro'i's real first-run experience, personalized Home (**أدواتك**), Global Settings, and the complete **ليا أنا** tool. Almost all underlying infrastructure already exists from Phases 1–3: `@roi/shared` already exports `personalize()`, `normalizeArabic()`, `matches()`, `toArabicDigits()`, `formatArabicDate()`, `localDateKey()`, `weekKey()` (Saturday-start), `monthKey()`, `seededPick()`, `uuidv7()`, `mergeRecords()`, and `submitSuggestionInputSchema`; `app/` already has `ScriptureSizeProvider`, `useThemePreference`, Reusables `Dialog`/`Select`/`Text`/`Icon`, `ContentGate`, `drizzle-orm` + `expo-sqlite` WAL, `react-native-mmkv`, and `@react-native-google-signin/google-signin@17.0.0`; and `backend/` already exposes the Google-ID-token-authenticated `submitSuggestion` GraphQL mutation with `GoogleAuthGuard` and 10/day quota enforcement.

Two external npm packages are needed in `app/package.json` for Phase 4:
1. **`react-native-marked@8.3.4`** (`[SUS]` — `too-new` only because `8.3.4` was published `2026-11-04`, while package history dates to `2022-08-28`, `307k` weekly downloads, pure JS, `postinstall: null`, uses already-installed `react-native-svg@15.16.0`). Because `gsd-tools` flagged it `SUS`, the planner MUST insert a blocking `checkpoint:human-verify` task before installing it (matching `01-01` and `03-01`). Also, `<Markdown>` renders a `FlatList` by default and defaults `blockquote` to physical `borderLeftWidth`/`paddingLeft` — Phase 4 MUST use its `useMarkdown()` hook with a custom `Renderer` subclass and logical `borderStartWidth`/`paddingStart` + explicit `IBMPlexSansArabic-*` font families instead of `<Markdown>`.
2. **`expo-clipboard@~58.0.4`** (`[OK]` — official Expo SDK 58 module, `7.5M/wk`, `postinstall: null`) for `Clipboard.setStringAsync` (`ME-07`). **Crucial native-build note:** `expo-clipboard` is NOT yet in `app/package.json`, `app/ios/Podfile.lock`, or `app/android/settings.gradle`, so adding it requires re-running `expo prebuild` and rebuilding the native dev-client binaries on iOS Simulator and Android (whereas `Share.share` from `react-native` and `expo-linking` `~58.0.17` are already compiled in).

Three architectural decisions govern Phase 4 cleanly:
- **Schema extension (`0002` migration):** Add three syncable tables to `app/features/db/schema.ts` — `verse_assignments`, `favorites`, and `personal_items` — all spreading `syncCols()`, using deterministic natural keys for `verse_assignments` (`assign:${periodType}:${periodKey}`) and `favorites` (`fav:${source}:${kind}:${itemId}`) so toggles/re-picks stay idempotent and compatible with Phase 8 `mergeRecords()`, plus `uuidv7` for `personal_items`. Store `profile` (`name`, `gender`) and 4-tool `home_tiles` JSON in the existing syncable `settings` table, and store device-local flags (`onboarding_completed`, `home_intro_dismissed`) in MMKV (`app/services/storage.ts`).
- **Reactive profile & content state:** Because changing `name`/`gender` in Settings must refresh Home, **ليا أنا**, History, and Favorites immediately (`PERS-01`, `PERS-04`), wrap the authenticated app shell (inside `ContentGate`) in a lightweight `ProfileProvider` / `AppPrefsProvider` backed by SQLite `settings` (or Zustand store hydrated from SQLite on mount and updated synchronously on save) plus `useFocusEffect` reloads for SQLite library/history reads after silent 6h delta syncs.
- **Google Sign-In & `submitSuggestion` alignment:** `app/features/spike/rows.tsx` already configures `@react-native-google-signin/google-signin@17.0.0` with `GOOGLE_OAUTH.iosClientId` and `GOOGLE_OAUTH.webClientId` (which matches `backend/src/config/env.ts` `DEFAULT_GOOGLE_CLIENT_IDS`!). Never pass `offlineAccess` or `serverAuthCode` (`guards.test.ts` forbids them). Use `scopes: ['https://www.googleapis.com/auth/drive.appdata']` (or `addScopes`) when connecting on Onboarding Screen 3 / Settings (`D-02`), and attach `Authorization: Bearer ${idToken}` (from `signIn()` or `getTokens().idToken`) to the `submitSuggestion` GraphQL mutation in `app/features/sync/api.ts`.

**Primary recommendation:** Split Phase 4 into focused plans: (1) human package gate for `react-native-marked@8.3.4` + install `expo-clipboard@~58.0.4` & native rebuild, (2) Drizzle `0002` schema/migration (`verse_assignments`, `favorites`, `personal_items`) + profile/tile/MMKV services + gender-aware `uiCopy` + `ProfileProvider`, (3) root routing + 3-screen Onboarding + Google Sign-In (`drive.appdata`), (4) Home (**أدواتك**) + Global Settings (`SET-01`), and (5) full **ليا أنا** 4-tab tool (`ME-01`..`ME-09`) + `submitSuggestion` client integration.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| First-run Onboarding routing & 3-screen flow | Mobile Client (`app/app/` & `app/features/onboarding/`) | Local Storage (MMKV + SQLite `settings`/`favorites`) | Offline-first post-`ContentGate`; writes profile to syncable SQLite and `onboarding_completed` to MMKV |
| Personalization (`personalize()`) & gender-aware UI | Shared Logic (`@roi/shared`) + Mobile UI (`uiCopy`) | — | Single source of truth for `{الاسم}` / `textFemale` / neutral fallback (`FND-08`) |
| Weekly/Monthly deterministic non-repeat verse selection & history | Mobile Data Layer (`app/features/leyaana/`) + Local SQLite (`verse_assignments`) | Shared (`@roi/shared` `weekKey`, `monthKey`, `seededPick`) | Persists snapshots locally so history survives content edits (`ME-03`) and syncs in Phase 8 |
| Names of God & Blessings rich-text rendering + search | Mobile UI (`react-native-marked` `useMarkdown` + `@roi/shared` `matches`) | Local SQLite (`names_of_god`, `blessings`) | Pure client rendering of downloaded Markdown subset with links/images stripped (`D-10`) |
| Favorites ⭐ & Local Personal Items | Local SQLite (`favorites`, `personal_items`) | — | Syncable local tables with soft deletes (`deletedAt`), zero network egress (`FND-06`) |
| Public Suggestion submission (`اقترح للكل`) | Mobile API Client (`app/features/sync/api.ts`) + Backend GraphQL (`SuggestionsResolver`) | Google Sign-In (`@react-native-google-signin/google-signin`) | Verified Google ID token `Bearer` header validated by `GoogleAuthGuard` against `DEFAULT_GOOGLE_CLIENT_IDS` |
| Home Grid (`أدواتك`) & Global Settings (`SET-01`) | Mobile UI + SQLite `settings` + MMKV | OS Intents (`Share.share`, `expo-linking`) | Syncable tile/profile settings in SQLite; device theme/font/intro flags in MMKV; external store/WhatsApp/support via OS URLs |

## Standard Stack

### Core (Already Installed in `app/package.json`)
| Library | Version | Purpose | Status in Repo |
|---------|---------|---------|----------------|
| `expo` / `react-native` / `react` | `~58.0.26` / `0.88.1` / `19.3.0` | Mobile runtime | Installed [VERIFIED: `app/package.json:30,48-49`] |
| `expo-router` | `~58.0.32` | File-based navigation (`Stack`, `Link`, `useRouter`, `useFocusEffect`) | Installed [VERIFIED: `app/package.json:40`] |
| `drizzle-orm` / `expo-sqlite` | `0.45.4` / `~58.0.18` | Sync-ready SQLite persistence & migrations | Installed [VERIFIED: `app/package.json:29,41`] |
| `react-native-mmkv` | `4.3.2` | Device-local preferences (`onboarding_completed`, `home_intro_dismissed`, theme, scripture size) | Installed [VERIFIED: `app/package.json:53`] |
| `@react-native-google-signin/google-signin` | `17.0.0` | Google Sign-In + `drive.appdata` scope + `idToken` for `submitSuggestion` | Installed [VERIFIED: `app/package.json:21`] |
| `graphql-request` / `graphql` / `zod` | `7.4.0` / `16.15.0` / `4.6.7` | Typed GraphQL client (`submitSuggestion`) & payload validation | Installed [VERIFIED: `app/package.json:44-45,64`] |
| `nativewind` / `tailwindcss` | `4.2.7` / `3.4.19` | Warm-paper styling (`global.css`) with logical RTL utilities | Installed [VERIFIED: `app/package.json:47,61`] |
| `@rn-primitives/dialog`, `select`, `portal`, `slot` | `1.5.2` / `1.5.3` | Modals (copy prompt, personal item form, delete confirm, Google Sign-In explanation) | Installed [VERIFIED: `app/package.json:22-25`] |
| `lucide-react-native` / `react-native-svg` | `0.577.0` / `15.16.0` | Icons + SVG peer dependency for `react-native-marked` | Installed [VERIFIED: `app/package.json:46,58`] |
| `expo-linking` / `expo-constants` / `expo-network` / `expo-crypto` | `~58.0.17` / `~58.0.16` / `~58.0.5` / `~58.0.8` | External URLs (WhatsApp, Rate, Help), app version, offline detection, UUIDv7 CSPRNG | Installed [VERIFIED: `app/package.json:32-33,37,39`] |

### New Dependencies Required in Phase 4 (`app/package.json`)
| Library | Version | Purpose | Why Standard / Legitimacy |
|---------|---------|---------|---------------------------|
| `react-native-marked` [WARNING: flagged as suspicious — verify before using.] | `8.3.4` | Rich-text Markdown subset rendering for **أسماء الله** and **البركات** (`ME-04`, `ME-05`, `D-10`) | Pure JS (`dist/commonjs` + `dist/module`, zero native code); exports `useMarkdown` hook + `Renderer` class; peers `react-native-svg >=12.3.0` (`15.16.0` already installed). Flagged `SUS` (`too-new`, `8.3.4` published `2026-11-04`, created `2022-08-28`, `307,316` weekly downloads, `postinstall: null`) — **requires `checkpoint:human-verify` before install.** [VERIFIED: `npm view`, tarball `.d.ts`] |
| `expo-clipboard` | `~58.0.4` | System clipboard copy (`Clipboard.setStringAsync`) for long-press & button copy (`ME-07`, `D-13`) | Official Expo SDK 58 package (`7.5M/wk`, `postinstall: null`, verdict `[OK]`). Native module (`NOT_IN_NATIVE_BUILD` currently) — **requires `expo prebuild` + native dev-client rebuild after install.** [VERIFIED: `npm view`, `gsd-tools`, `docs.expo.dev`] |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `expo-clipboard@~58.0.4` | Deprecated `Clipboard` from `react-native` (`Libraries/Components/Clipboard/Clipboard.js`) | `RCTClipboard` / `ClipboardModule` still exists in `react-native@0.88.1` core [VERIFIED: `app/node_modules/react-native/index.js:243-250`] and avoids a native rebuild, **but** emits a deprecation warning, is slated for removal, and `.claude/CLAUDE.md:94` specifies `expo-clipboard@~58.0.4`. Use `expo-clipboard@~58.0.4` and rebuild dev clients (or keep `Clipboard` adapter isolated in one file if ever swapped). |
| `react-native-marked` `<Markdown>` (`FlatList`) | `react-native-marked` `useMarkdown()` hook + `Renderer` subclass | `<Markdown>` wraps output in a `FlatList`, which throws nested-VirtualizedList warnings inside `ScrollView` / `Dialog` and interferes with card `onLongPress`. `useMarkdown()` returns `ReactNode[]` directly [VERIFIED: tarball `hooks/useMarkdown.d.ts:18`]. |
| `react-native-share` / `expo-sharing` | `Share.share({ message })` from `react-native` core | `Share.share` is already built into React Native `0.88.1` (`SET-01` `"شارك التطبيق"` shares a text message + URL; `expo-sharing` is only for sharing local files and is not needed until Phase 8 manual export). Zero extra dependency or rebuild for sharing. |

**Installation (after Wave 1 human verification checkpoint):**
```bash
bun --cwd app add react-native-marked@8.3.4
bunx --cwd app expo install expo-clipboard
```
*(Because `expo-clipboard` includes native iOS/Android code, run `bun --cwd app run prebuild:android` / `npx expo prebuild` and rebuild iOS Simulator + Android dev client after installing it.)*

## Package Legitimacy Audit

> Audited 2026-11-25 via `gsd-tools.cjs query package-legitimacy check --ecosystem npm react-native-marked expo-clipboard` and `npm view` / tarball inspection.

| Package | Registry | Age | Downloads | Source Repo | Postinstall | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|-------------|---------|-------------|
| `react-native-marked` (`8.3.4`) | npm | First published `2022-08-28` (`8.3.4` on `2026-11-04`, <30d) | 307,316/wk | `git+https://github.com/gmsgowtham/react-native-marked.git` | `none` | `[SUS]` (`too-new` release) | Flagged — planner MUST insert `checkpoint:human-verify` before `bun add` |
| `expo-clipboard` (`58.0.4`) | npm | Expo monorepo (`58.0.4` on `2026-10-21`) | 7,501,175/wk | `https://github.com/expo/expo.git` | `none` | `[OK]` | Approved |

**Transitive dependencies of `react-native-marked@8.3.4` checked (`npm view <pkg> scripts.postinstall`):** `marked@18.1.3`, `svg-parser@2.1.0`, `html-entities@2.6.0`, `github-slugger@2.0.0`, `@jsamr/counter-style@2.0.2`, `@jsamr/react-native-li@2.3.1`, `react-native-reanimated-table@0.0.2` — all have `postinstall: none` [VERIFIED: command output].

**Packages removed due to `[SLOP]` verdict:** none.
**Packages flagged as suspicious `[SUS]`:** `react-native-marked@8.3.4` — planner must add a `checkpoint:human-verify` task before installing.

## Architecture Patterns

### System Architecture Diagram

```
App Launch (app/app/_layout.tsx)
  └─► useMigrations(db, migrations) ──► ScriptureSizeProvider ──► ContentGate
        │                                                           │ (lastContentVersion > 0)
        │                                                           ▼
        │                                              ProfileProvider (hydrates from SQLite settings)
        │                                                           │
        ▼                                                           ▼
   [MMKV onboarding_completed?] ──false──► Onboarding Flow (3 screens)
        │                                    ├─ Screen 1: Ro'i & 4 tools
        │                                    ├─ Screen 2: Name + Gender (SQLite settings)
        │                                    └─ Screen 3: Starter verses ⭐ (SQLite favorites)
        │                                         + Optional Google Sign-In (drive.appdata)
        │                                         ──► sets MMKV onboarding_completed=true
        ▼ true
   Home Screen ("أدواتك", app/app/index.tsx)
     ├─ Gender-aware greeting + Settings gear ──► /settings (SET-01)
     ├─ Dismissible intro card (MMKV home_intro_dismissed)
     ├─ Weekly verse peek (SQLite verse_assignments + personalize())
     └─ "أدواتك" grid (SQLite home_tiles; Phase 4 shows ليا أنا only; inline "تعديل")
          │
          ▼ tap
   "ليا أنا" Tool (4 tabs: الآيات | أسماء الله | البركات | المفضلة)
     ├─ الآيات: weekly (weekKey) + monthly (monthKey) deterministic non-repeat picks
     │          stored as snapshots in SQLite verse_assignments ──► السجل history view
     ├─ أسماء الله / البركات: daily seededPick (localDateKey) + "تصفح الكل" (matches())
     │          + rich-text view (react-native-marked useMarkdown + RTL Renderer)
     ├─ المفضلة: all starred items (SQLite favorites joined w/ public + personal_items)
     ├─ Personal items (SQLite personal_items CRUD across all 3 kinds)
     │          └─ "اقترح للكل" ──► [online? & Google idToken?] ──► GraphQL submitSuggestion
     └─ Long-press / Copy button ──► [verse w/ personalization?]
                                        ├─ Yes: "الآية دي ليك ولا هتبعتها لحد؟" ──► personalize()
                                        └─ No / Name / Blessing: stripMarkdown() + expo-clipboard
```

### Recommended Project Structure

```
app/
├── app/
│   ├── _layout.tsx                  # Wrap Stack in ProfileProvider inside ContentGate
│   ├── index.tsx                    # Gate on MMKV onboarding_completed -> Onboarding or HomeScreen
│   ├── onboarding.tsx               # 3-screen Onboarding flow (gestureBack / hardware back guarded)
│   ├── settings.tsx                 # Global Settings screen (SET-01)
│   ├── leyaana/
│   │   ├── index.tsx                # 4-tab ليا أنا screen (الآيات | أسماء الله | البركات | المفضلة)
│   │   ├── history.tsx              # السجل (past weekly & monthly verse_assignments)
│   │   └── browse.tsx               # تصفح الكل (searchable Names of God / Blessings list + detail modal)
│   └── (dev)/                       # Preserved DEV_TOOLS_ENABLED routes
├── constants/
│   ├── app.ts                       # Add ROUTES.onboarding, ROUTES.settings, ROUTES.leyaana*, SUPPORT_URLS
│   ├── db.ts                        # Add FAVORITE_ID_PREFIX, ASSIGNMENT_ID_PREFIX, SETTINGS_KEYS
│   └── telemetry.ts                 # Existing ALLOWED_EVENTS ('onboarding_completed', 'first_win_reached', ...)
├── features/
│   ├── db/
│   │   ├── schema.ts                # Add verseAssignments, favorites, personalItems tables (+ syncCols)
│   │   ├── events.ts                # Extend SyncTable union & softDelete for new tables
│   │   └── __tests__/               # Update migrate.test.ts + schema.test.ts + new CRUD tests
│   ├── profile/
│   │   ├── repository.ts            # Read/write profile (name, gender) & home_tiles in SQLite settings
│   │   ├── context.tsx              # ProfileProvider + useProfile() reactive context
│   │   └── ui-copy.ts               # Gender-aware uiCopy(key, gender) helper (PERS-04)
│   ├── google/
│   │   └── auth.ts                  # GoogleSignin helper (drive.appdata, idToken extraction, error mapping)
│   ├── onboarding/
│   │   └── OnboardingFlow.tsx       # 3-step onboarding UI + starter verse picker + Google Sign-In dialog
│   ├── home/
│   │   └── HomeScreen.tsx           # Greeting, intro card, weekly peek, أدواتك tile grid + edit mode
│   ├── leyaana/
│   │   ├── assignments.ts           # Weekly/monthly non-repeat assignment + shared seen-set + history
│   │   ├── catalog.ts               # Daily Name/Blessing seededPick, search (matches), Favorites & Personal CRUD
│   │   ├── copy.ts                  # stripMarkdown + formatForCopy + recipient-aware compose
│   │   ├── MarkdownBody.tsx         # useMarkdown() + custom RTL warm-paper Renderer (no FlatList)
│   │   ├── PersonalItemDialog.tsx   # Create/edit plain-text personal item + delete confirm + suggest trigger
│   │   ├── CopyVerseDialog.tsx      # "الآية دي ليك ولا هتبعتها لحد؟" dialog
│   │   └── LeyaanaScreen.tsx        # 4-tab container + Toast ("اتنسخت")
│   ├── settings/
│   │   └── SettingsScreen.tsx       # Grouped cards (المظهر والقراءة, حسابك, المساعدة والتواصل, About)
│   └── sync/
│       └── api.ts                   # Extend SyncApiClient with submitSuggestion(input, idToken)
└── services/
    └── storage.ts                   # Add ONBOARDING_COMPLETED & HOME_INTRO_DISMISSED MMKV helpers
```

### Pattern 1: Exact Drizzle Schema & Deterministic Keys (`0002` Migration)

Existing tables in `app/features/db/schema.ts:8-13` use `syncCols()` [VERIFIED: `app/features/db/schema.ts:8-13`]:
```ts
export const syncCols = () => ({
  id: text(ID_COL).primaryKey(),
  createdAt: integer(CREATED_AT_COL).notNull(),
  updatedAt: integer(UPDATED_AT_COL).notNull(),
  deletedAt: integer(DELETED_AT_COL),
});
```
And `gratitudeLines` uses a deterministic natural-key ID (`shukr:2026-11-24`) so two devices merge cleanly via `mergeRecords()` (`shared/src/merge.ts:31-44`) [VERIFIED: `app/features/db/schema.ts:70-72`].

Apply the same pattern to Phase 4 tables:
1. **`verseAssignments` (`verse_assignments`)**:
   - `id`: deterministic `assign:${periodType}:${periodKey}` (e.g. `assign:weekly:2026-11-21`, `assign:monthly:2026-11`) — guarantees at most one assignment per period across restarts and future Drive merges.
   - Columns: `...syncCols()`, `periodType: text('period_type').notNull()` (`'weekly' | 'monthly'`), `periodKey: text('period_key').notNull()`, `verseId: text('verse_id').notNull()`, `ref: text('ref').notNull()`, `text: text('text').notNull()`, `textFemale: text('text_female')`, `assignedAt: integer('assigned_at').notNull()`.
   - Index: `index('verse_assignments_period_idx').on(t.periodType, t.periodKey, t.deletedAt)`.
   - **Important (`PERS-01` + `ME-03`):** Store raw `text` and `textFemale` (with `{الاسم}` unrendered!), NOT pre-personalized strings. At display time, call `personalize(assignment, currentProfile)` so history survives content edits/soft-deletes **and** immediately reflects name/gender changes in Settings.
2. **`favorites` (`favorites`)**:
   - `id`: deterministic `fav:${itemSource}:${itemKind}:${itemId}` (e.g. `fav:public:verse:<uuid>` or `fav:personal:blessing:<uuid>`).
   - Columns: `...syncCols()`, `itemKind: text('item_kind').notNull()` (`'verse' | 'name_of_god' | 'blessing'`), `itemSource: text('item_source').notNull()` (`'public' | 'personal'`), `itemId: text('item_id').notNull()`.
   - Index: `index('favorites_live_created_idx').on(t.deletedAt, t.createdAt)`.
   - Toggling ⭐: if live row exists, call `softDelete` (`deletedAt = now, updatedAt = now`); if missing or tombstoned, `.insert(favorites).values({...}).onConflictDoUpdate({ target: favorites.id, set: { updatedAt: now, deletedAt: null } })`. Never call `db.delete(...)` (`schema.test.ts:87-101` forbids it).
3. **`personalItems` (`personal_items`)**:
   - `id`: `uuidv7(now, clock.rand)` (user-created items).
   - Columns: `...syncCols()`, `kind: text('kind').notNull()` (`'verse' | 'name_of_god' | 'blessing'`), `title: text('title').notNull()` (stores `ref` for `'verse'`, `title` for `'name_of_god'`/`'blessing'`, aligning 1:1 with `submitSuggestionInputSchema` in `shared/src/schemas.ts:136-140`), `text: text('text').notNull()`, `verseRef: text('verse_ref')`.
   - Index: `index('personal_items_kind_live_idx').on(t.kind, t.deletedAt, t.createdAt)`.

### Pattern 2: Syncable SQLite `settings` vs Device-Local MMKV (`D-04`)

In `app/features/db/schema.ts:16-19`, `settings` is a key-value table with `id` (text PK), `value` (text), and `syncCols()` [VERIFIED: `app/features/db/schema.ts:16-19`]:
```ts
export const settings = sqliteTable('settings', {
  ...syncCols(),
  value: text('value').notNull(),
});
```
And `app/constants/app.ts:11-13` defines `SETTINGS_KEYS`:
```ts
export const SETTINGS_KEYS = {
  SPIKE_WIDGET: 'spike_widget_count',
} as const;
```
Extend `SETTINGS_KEYS` for syncable Phase 4 settings stored as Zod-validated JSON in SQLite `settings`:
- `USER_PROFILE: 'user_profile'` → `{ name: string; gender: 'male' | 'female' }`
- `HOME_TILES: 'home_tiles'` → array of 4 tool configs (`leyaana`, `memorize`, `intercession`, `gratitude`) with `{ id, visible, order }`, defaulting all 4 to `visible: true` in canonical order `[leyaana, memorize, intercession, gratitude]` while Phase 4 Home filters rendered tiles to `IMPLEMENTED_HOME_TOOLS = new Set(['leyaana'])` (`D-06`).

Keep device-local flags in `app/services/storage.ts` (`STORAGE_KEYS` [VERIFIED: `app/services/storage.ts:11-17`]):
- `ONBOARDING_COMPLETED: 'pref.onboarding_completed'` (`boolean`)
- `HOME_INTRO_DISMISSED: 'pref.home_intro_dismissed'` (`boolean`)

### Pattern 3: Weekly & Monthly Deterministic Non-Repeat Verse Selection (`ME-01`..`ME-03`, `D-08`..`D-09`)

From `@roi/shared` (`shared/src/period.ts:10-43`) [VERIFIED: `shared/src/period.ts:10-43`]:
- `weekKey(d, weekStart = 6)` returns Saturday-start `YYYY-MM-DD` (verified by `shared/src/__tests__/period.test.ts:13-24`).
- `monthKey(d)` returns `YYYY-MM`.
- `localDateKey(d)` returns `YYYY-MM-DD`.
- `seededPick(items, seed)` deterministically picks one item via FNV-1a + mulberry32.

**User seed (`ME-01`):** Generate or read a stable per-install seed (e.g., `deviceSeed` stored in SQLite `settings` or MMKV on first assignment, or derived once via `uuidv7` — storing `verse_seed` in SQLite `settings` lets Drive backup preserve the seed too!). Wait: even simpler, if `verse_assignments` persists the chosen verse on first read for `periodKey`, the choice stays 100% stable on every reopen (`ME-01`, `ME-02`) AND survives library growth (`verses` added by admin later won't shift the current week's verse!).
Algorithm for `getOrAssignPeriodVerse(db, clock, periodType: 'weekly' | 'monthly', now: Date)`:
1. Compute `key = periodType === 'weekly' ? weekKey(now) : monthKey(now)` and `id = "assign:${periodType}:${key}"`.
2. Query `verse_assignments` by `id` (where `deletedAt IS NULL`). If found, return it immediately!
3. Otherwise, query all live `verses` (`deletedAt IS NULL`, ordered deterministically by `sortOrder` / `id`). If empty, return `null`.
4. Query all previously assigned `verseId`s across BOTH `'weekly'` and `'monthly'` in `verse_assignments` (`deletedAt IS NULL`) to build `seenIds` (shared cycle per Claude's Discretion in `04-CONTEXT.md`).
   -Wait: to support multi-cycle resets cleanly without losing old history rows (`ME-03`), determine the unseen pool since the **last cycle reset** (or compare counts: if `liveVerses.filter(v => !seenIds.has(v.id))` is non-empty, use that unseen subset; if empty, all live verses have been seen at least once — compute how many times each `verseId` appears in `verse_assignments` and take the minimum-count tier `minCount`! That naturally cycles through the entire library fairly before repeating any verse, WITHOUT deleting or hiding any history rows!).
5. Pick deterministically with `seededPick(candidates, "${userSeed}:${periodType}:${key}")`.
6. Insert snapshot into `verse_assignments` (`onConflictDoNothing` / `onConflictDoUpdate` on `id`), then return the persisted row.

### Pattern 4: Rich-Text Markdown Rendering (`react-native-marked` without `FlatList`)

Verified from `react-native-marked@8.3.4` TypeScript declarations (`useMarkdown.d.ts:6-18`, `Renderer.d.ts:10-39`, `theme/styles.js:53-58`):
- Use `useMarkdown(personalizedMarkdown, { colorScheme, renderer, styles })` which returns `ReactNode[]` rendered inside a plain `<View className="gap-1">`. Never use default `<Markdown>` inside a `ScrollView` or `Dialog` because `<Markdown>` mounts a `FlatList`.
- Subclass `Renderer` (`new RoiMarkdownRenderer({ selectable: true })`):
  - Override `blockquote(children, styles)` to render a logical RTL `<View className="my-2 border-s-2 border-accent bg-muted/40 ps-4 pe-3 py-2 rounded-e-lg">` (fixing `theme/styles.js:53-58`'s hardcoded `borderLeftWidth` / `paddingLeft`!).
  - Override `heading(text, styles)` to enforce `maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}` (`1.3`) and `IBMPlexSansArabic-Bold` (`20px`, `lineHeight: 28`).
  - Override `link(children)` to return plain text (`getTextNode(children, styles)`) and `image()` / `linkImage()` to return `null` as defense-in-depth alongside `shared/src/schemas.ts`'s write-side `UNSAFE_MARKDOWN` check (`03-CONTEXT.md` D-08).
- Pass `styles` (`MarkedStyles`) mapping `text`, `strong`, `em`, `li`, `h1`..`h3` explicitly to `FONT_FAMILIES.ui.regular` / `FONT_FAMILIES.ui.bold` (`writingDirection: 'rtl'`) and warm-paper hex colors matching `app/global.css` light/dark tokens (since `react-native-marked` styles take RN `TextStyle`/`ViewStyle` objects, not Tailwind classes).
- Also write a pure `stripMarkdownForCopy(md: string): string` helper (and unit-test it!) for `ME-07` copy on Names of God & Blessings (`# `, `**`, `*`, `_`, `> `, `- `, `` ` ``, collapsing extra blank lines cleanly).

### Pattern 5: Google Sign-In (`drive.appdata` + `idToken`) & `submitSuggestion` Contract

Verified from `backend/src/suggestions/suggestions.resolver.ts:27-78`, `backend/src/common/google-auth.guard.ts:58-96`, `backend/src/config/env.ts:7-10`, and `app/node_modules/@react-native-google-signin/google-signin/lib/typescript/src/`:
1. **OAuth Client IDs match backend (`backend/src/config/env.ts:7-10` & `app/constants/app.ts:29-34`):**
   - `webClientId`: `'23662840492-h4j3v57k9dpm0suqa61qpkv7qh78qq9v.apps.googleusercontent.com'`
   - `iosClientId`: `'23662840492-laqcbt3hkft72a3mu0ofcokeskr7sr7a.apps.googleusercontent.com'`
2. **Configuring & Signing In (NO `offlineAccess`, NO `serverAuthCode`):**
   - `GoogleSignin.configure({ iosClientId: GOOGLE_OAUTH.iosClientId, webClientId: GOOGLE_OAUTH.webClientId, scopes: ['https://www.googleapis.com/auth/drive.appdata'] })`.
   - On Android: `await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })`.
   - Call `await GoogleSignin.signIn()`, check `isSuccessResponse(response)`.
   - Extract `idToken`: `response.data.idToken ?? (await GoogleSignin.getTokens()).idToken`.
   - If the user signed in earlier without `drive.appdata` (or re-offers from Settings), check `currentUser.scopes.includes('https://www.googleapis.com/auth/drive.appdata')` and call `await GoogleSignin.addScopes({ scopes: ['https://www.googleapis.com/auth/drive.appdata'] })` if needed!
   - When user cancels (`isCancelledResponse(response)` or `isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED`) or play services / network fails, return a structured result `{ status: 'cancelled' | 'error' }` — never throw uncaught and never trap the user (`D-02`, `D-12`).
3. **GraphQL `submitSuggestion` exact wire contract (`backend/src/suggestions/suggestions.resolver.ts:17-77`, `backend/src/__tests__/suggestions.test.ts:17-26`):**
   - Mutation document:
     ```graphql
     mutation SubmitSuggestion($input: SubmitSuggestionInput!) {
       submitSuggestion(input: $input) {
         id
         status
         createdAt
         remainingToday
       }
     }
     ```
   - `input` validated client-side and server-side by `submitSuggestionInputSchema` (`shared/src/schemas.ts:136-140`):
     `{ kind: 'verse' | 'name_of_god' | 'blessing', title: string, text: string, textFemale?: string | null, verseRef?: string | null }` (note: for `'verse'`, `title` holds the verse reference `ref`).
   - HTTP Header: `Authorization: Bearer ${idToken}` (`backend/src/common/google-auth.guard.ts:60-63`).
   - Error codes handled gracefully in UI:
     - `401` / GraphQL `UNAUTHENTICATED`: refresh token via `GoogleSignin.getTokens()` or prompt re-sign-in.
     - `429` / GraphQL `TOO_MANY_REQUESTS`: distinguish `DAILY_SUGGESTION_LIMIT_REACHED` (10/day quota reached) vs burst throttling and show calm Egyptian Arabic message.
     - `400` / GraphQL `BAD_REQUEST`: Zod Arabic validation message.
     - Network/offline error: calm offline message (`04-UI-SPEC.md:129`).

### Pattern 6: Settings URLs & App Version (`SET-01`, `D-14`)

From `/Users/andrew/Documents/Work/Dev/Projects/Personalss/tarneemna-app/lib/core/values.dart:8-16` [VERIFIED: `values.dart:8-16`]:
```dart
static const String whatsapp = "https://wa.me/increasinglabs";
static const String rate = "https://promote.increasinglabs.com/l/tarneemna";
static const String share = rate;
static const String support = "https://forms.gle/DGKYCQwtfdtGcnTH6";
```
For Ro'i, place `SUPPORT_URLS` in `app/constants/app.ts` with `EXPO_PUBLIC_*` overrides and Increasing Labs defaults (`whatsapp: 'https://wa.me/increasinglabs'`, `rate: process.env.EXPO_PUBLIC_RATE_URL?.trim() || 'https://promote.increasinglabs.com/l/roi'`, `share: process.env.EXPO_PUBLIC_SHARE_URL?.trim() || 'https://promote.increasinglabs.com/l/roi'`, `support: process.env.EXPO_PUBLIC_SUPPORT_URL?.trim() || 'https://forms.gle/DGKYCQwtfdtGcnTH6'`).
- Read app version from `Constants.expoConfig?.version ?? appConfig.expo.version` (`0.1.0` formatted via `toArabicDigits(version)`).
- Use `Share.share({ message: ... })` from `react-native` for `"شارك التطبيق"`, and `Linking.openURL(url)` from `expo-linking` (wrapped in `try/catch` / `canOpenURL` fallback) for `"قيّم التطبيق"`, `"اطلب مساعدة"`, and `"تواصل عبر واتساب"`.

### Anti-Patterns to Avoid
- **Never use `@/` path aliases inside pure/DB/API files imported by Vitest tests** (`app/` has no `vitest.config.ts` resolving `@/`, so Vitest throws `Cannot find package '@/...'`). Follow `ContentGate.tsx`, `api.ts`, and `db-ops.ts` by using relative imports (`../../constants/...`) in testable logic modules (`STATE.md:102`).
- **Never call `db.delete(...)` or `tx.delete(...)`** — `app/features/db/__tests__/schema.test.ts:87-101` fails the test suite. Always tombstone via `deletedAt`.
- **Never use physical Tailwind direction classes (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`, `border-l-*`, `border-r-*`) or `tracking-*` or `allowFontScaling={false}`** — `app/__tests__/guards.test.ts` fails immediately.
- **Never use `offlineAccess` or `serverAuthCode` in `GoogleSignin.configure()`** — `app/__tests__/guards.test.ts:141-158` fails immediately.
- **Never call `GoogleSignin.signOut()` after onboarding/settings/suggestion sign-in** (only the dev spike does that in `finally`).
- **Never log user name, gender, personal items, verse text, or email via `track()` or `reportError()`** (`REL-01`).
- **Never forget `maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}` on `Heading` / `Display` text** (`04-UI-SPEC.md:78`).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Arabic text personalization & neutral fallback | Custom `{الاسم}` regex or gender switcher | `personalize(item, profile)` from `@roi/shared` | Already handles `textFemale`, `NAME_TOKEN`, whitespace collapse, and empty-name neutral fallback (`shared/src/arabic.ts:73-80`) |
| Arabic search normalization | Custom diacritic/alef stripper | `matches(haystack, query)` from `@roi/shared` | Hermes-safe explicit code-point normalization of tashkeel, bidi marks, alef/ta-marbuta/ya, and Arabic-Indic digits (`shared/src/arabic.ts:33-55`) |
| Arabic-Indic numerals & Egyptian dates | `toLocaleDateString('ar-EG')` | `toArabicDigits()`, `formatArabicDate()`, `EGYPTIAN_MONTHS` from `@roi/shared` | Consistent offline formatting across Hermes/iOS/Android without `Intl` locale discrepancies (`shared/src/arabic.ts:58-70`) |
| Week/Month period keys & PRNG | Custom date math or `Math.random()` | `weekKey(d, 6)`, `monthKey(d)`, `localDateKey(d)`, `seededPick(items, seed)` from `@roi/shared` | Saturday-start DST-safe local calendar math (`shared/src/period.ts:2-43`) |
| Rich-text Markdown parsing | Custom regex-to-`<Text>` parser | `react-native-marked` (`useMarkdown` + `Renderer` subclass) | Handles nested bold/italic/headings/lists/blockquotes cleanly (`D-10`) |
| Suggestion input validation | Ad-hoc form length/token checks | `submitSuggestionInputSchema` from `@roi/shared` | Identical `{الاسم}` and `UNSAFE_MARKDOWN` rules enforced by backend (`shared/src/schemas.ts:136-140`) |
| Modals & Selects | Custom `Modal` + portal overlays | `@/components/ui/dialog` and `@/components/ui/select` | Already verified in RTL on iOS/Android in Phase 1 (`01-09`) |
| Scripture rendering & sizing | Raw `<Text style={{ fontFamily: 'Amiri-Regular' }}>` | `<Scripture>` and `<ScriptureSizeSlider>` (`@/features/scripture/scripture`) | Hooks into `ScriptureSizeProvider` (5 steps `[18, 20, 23, 27, 32]`, `1.8` line-height, `rtl`) |

## Common Pitfalls

### Pitfall 1: Nested `FlatList` inside `ScrollView` via `react-native-marked` `<Markdown>`
- **What goes wrong:** Default `<Markdown>` from `react-native-marked` renders a vertical `FlatList`. Embedding it inside a `ScrollView` (e.g., on the Names/Blessings tab or inside a detail `Dialog`) triggers React Native's VirtualizedList nesting error and breaks card `onLongPress` propagation.
- **How to avoid:** Use `useMarkdown(value, { renderer, styles, colorScheme })` from `react-native-marked` and map the returned `ReactNode[]` inside a `<View className="gap-1">`.
- **Warning signs:** Console warning `"VirtualizedLists should never be nested inside plain ScrollViews"`.

### Pitfall 2: `react-native-marked` Default Physical `borderLeftWidth` & Missing Font Family on Android
- **What goes wrong:** `react-native-marked/dist/commonjs/theme/styles.js:53-58` sets `borderLeftColor`, `paddingLeft`, and `borderLeftWidth` on `blockquote`, which renders on the **trailing** side in RTL Arabic; and setting `fontWeight: 'bold'` without `fontFamily: 'IBMPlexSansArabic-Bold'` falls back to system font on Android.
- **How to avoid:** Subclass `Renderer` (`blockquote`, `heading`) to use logical Tailwind classes (`border-s-2 border-accent ps-4 pe-3 py-2 bg-muted/40`) and pass explicit `fontFamily: FONT_FAMILIES.ui.regular` / `FONT_FAMILIES.ui.bold` + `writingDirection: 'rtl'` in `MarkedStyles`.

### Pitfall 3: Adding `expo-clipboard` Without Native Rebuild
- **What goes wrong:** `expo-clipboard@~58.0.4` is not currently in `app/package.json`, `app/ios/Podfile.lock`, or `app/android/settings.gradle` (`NOT_IN_NATIVE_BUILD`). Running Metro against existing Phase 1 dev clients after `expo install expo-clipboard` will throw `"Cannot find native module 'ExpoClipboard'"`.
- **How to avoid:** After installing `expo-clipboard` (and `react-native-marked`), run `expo prebuild` and rebuild the iOS Simulator + Android dev client binaries before on-device testing.

### Pitfall 4: Vitest `@/` Path Alias Failure in `app/`
- **What goes wrong:** `app/` has no `vitest.config.ts` alias for `@/`, so importing any module that uses `@/constants/...` in a Vitest unit test fails (`Cannot find package '@/...'`).
- **How to avoid:** Use relative imports (`../../constants/app`, `../db/schema`) in all non-screen business/DB/API modules (`features/*/*.ts`, `services/*.ts`), matching `app/features/sync/ContentGate.tsx` and `app/features/sync/api.ts`.

### Pitfall 5: `migrate.test.ts` Hardcoded 10-Table Assertion & `schema.test.ts` Soft-Delete Guard
- **What goes wrong:** `app/features/db/__tests__/migrate.test.ts:137-148` asserts `expect(tableRows.map((r) => r.name)).toEqual([...10 tables...])`. Adding `verse_assignments`, `favorites`, and `personal_items` will fail `migrate.test.ts` unless updated. Also, any missing `syncCols()` column or `.delete()` call fails `schema.test.ts`.
- **How to avoid:** Generate `0002_*.sql` with `bun --cwd app run db:generate`, update the expected sorted table list in `migrate.test.ts` to all 13 tables, keep `v1.sqlite` and `v2.sqlite` frozen (testing upgrade paths to `0002`), and optionally add a `v3.sqlite` fixture via `app/scripts/build-fixture.mjs`.

### Pitfall 6: Hardware/Gesture Back from Onboarding Back Into `/` or Re-Showing Onboarding
- **What goes wrong:** If Onboarding is a separate Expo Router screen (`/onboarding`) navigated via `router.push`, Android hardware back or iOS swipe-back could pop back to `/` before `onboarding_completed` is `true`.
- **How to avoid:** Either render Onboarding inline inside `app/app/index.tsx` when `!onboardingCompleted` (simplest — zero back-stack edge case, instant transition to `<HomeScreen />` when `completeOnboarding()` flips state!) OR use `router.replace('/onboarding')` with `gestureEnabled: false` + Android `BackHandler` blocking exit to `/`. Rendering state-driven inside `app/index.tsx` eliminates back-stack bugs completely.

### Pitfall 7: Silent 6h Delta Sync Updating SQLite Behind Stale React State
- **What goes wrong:** `ContentGate` runs `runDeltaSyncIfDue` silently in the background (`app/features/sync/ContentGate.tsx:226-247`) without invalidating React state in `HomeScreen` or `LeyaanaScreen`.
- **How to avoid:** Re-query SQLite in `useFocusEffect` (matching `LibraryReadyView.tsx:40-44`) AND optionally emit a lightweight content-refresh counter from `ContentGate` when `runDeltaSyncIfDue` returns `status === 'updated'` so open screens reflect newly synced verses/names/blessings immediately.

### Pitfall 8: `GoogleSignin.configure` Without `webClientId` or Missing `idToken` on Second Flow
- **What goes wrong:** `GoogleSignin.signIn()` returns `idToken: null` unless `webClientId` is passed to `GoogleSignin.configure()`. Also, if a user connected on Onboarding Screen 3 (`drive.appdata`), then opens **ليا أنا** in a later session and taps **"اقترح للكل"**, `GoogleSignin.getCurrentUser()` may be `null` in memory until `signInSilently()` runs, or `getTokens()` is needed for a fresh `idToken`.
- **How to avoid:** Centralize a `configureGoogleSignIn()` helper in `app/features/google/auth.ts` passing both `iosClientId` and `webClientId` + `scopes: ['https://www.googleapis.com/auth/drive.appdata']`. Before calling `submitSuggestion`, check `getCurrentUser()` / `signInSilently()` -> `getTokens()` to obtain a fresh `idToken`, and only prompt interactive `signIn()` if no active Google session exists (`isNoSavedCredentialFoundResponse` or `SIGN_IN_REQUIRED`).

## Code Examples

### 1. Personalized Verse & Neutral Fallback (`@roi/shared`)
```ts
// Source: shared/src/arabic.ts:72-80 (verified in repo)
import { personalize } from '@roi/shared';

const rendered = personalize(
  { text: verse.text, textFemale: verse.textFemale },
  { name: profile.name, gender: profile.gender },
);
// If profile.name is empty, personalize() strips {الاسم} and collapses extra spaces cleanly.
```

### 2. Custom RTL Markdown Body (`react-native-marked` + Warm Paper)
```tsx
// Source: verified from react-native-marked@8.3.4 hooks/useMarkdown.d.ts & lib/Renderer.d.ts
import type { ReactNode } from 'react';
import { Text, View, type TextStyle } from 'react-native';
import { Renderer, useMarkdown, type MarkedStyles } from 'react-native-marked';

class RoiMarkdownRenderer extends Renderer {
  override blockquote(children: ReactNode[]): ReactNode {
    return (
      <View
        key={this.getKey()}
        className="my-2 rounded-e-lg border-s-2 border-accent bg-muted/40 py-2 pe-3 ps-4"
      >
        {children}
      </View>
    );
  }

  override heading(text: string | ReactNode[], styles?: TextStyle): ReactNode {
    return (
      <Text
        key={this.getKey()}
        selectable
        maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
        style={styles}
      >
        {text}
      </Text>
    );
  }

  override link(children: string | ReactNode[], _href: string, styles?: TextStyle): ReactNode {
    return this.text(children, styles);
  }

  override image(): ReactNode {
    return null;
  }
}
```

### 3. `submitSuggestion` GraphQL Request (`app/features/sync/api.ts`)
```ts
// Source: verified against backend/src/suggestions/suggestions.resolver.ts:27-77 & backend/src/common/google-auth.guard.ts:58-96
const SUBMIT_SUGGESTION_MUTATION = /* GraphQL */ `
  mutation SubmitSuggestion($input: SubmitSuggestionInput!) {
    submitSuggestion(input: $input) {
      id
      status
      createdAt
      remainingToday
    }
  }
`;

// Request:
const validated = submitSuggestionInputSchema.parse(input);
const result = await graphqlClient.request<
  { submitSuggestion: SuggestionReceipt },
  { input: SubmitSuggestionInput }
>({
  document: SUBMIT_SUGGESTION_MUTATION,
  variables: { input: validated },
  requestHeaders: { Authorization: `Bearer ${idToken}` },
  signal: requestSignal,
});
```

### 4. Deterministic Favorite Toggle & Soft Delete (`app/features/db/events.ts` pattern)
```ts
// Source: pattern from app/features/db/schema.ts:70-72 & app/features/db/events.ts:80-127
export function favoriteId(source: 'public' | 'personal', kind: ContentKind, itemId: string): string {
  return `fav:${source}:${kind}:${itemId}`;
}

export function toggleFavorite(
  db: SyncDatabase,
  clock: Clock,
  input: { source: 'public' | 'personal'; kind: ContentKind; itemId: string },
): boolean {
  const id = favoriteId(input.source, input.kind, input.itemId);
  const now = clock.now();
  const existing = db.select().from(favorites).where(eq(favorites.id, id)).get();
  if (existing && existing.deletedAt === null) {
    db.update(favorites)
      .set({ deletedAt: now, updatedAt: now })
      .where(and(eq(favorites.id, id), isNull(favorites.deletedAt)))
      .run();
    return false;
  }
  db.insert(favorites)
    .values({
      id,
      itemKind: input.kind,
      itemSource: input.source,
      itemId: input.itemId,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: favorites.id,
      set: { updatedAt: now, deletedAt: null },
    })
    .run();
  return true;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Clipboard` from `react-native` core | `expo-clipboard` (`Clipboard.setStringAsync`) | Expo SDK 50+ / RN deprecation | Async API, Android 13+ sensitive preview options; requires native prebuild/rebuild |
| `@react-native-google-signin/google-signin` v12 `{ user, idToken }` flat response | v17 discriminated response `isSuccessResponse(res)` (`res.data.idToken`, `res.data.user`) | v13–v17 | Checked directly against installed `types.d.ts` & `functions.d.ts` in `app/node_modules/` |
| Daily-pick hash modulus (`hash % items.length`) in `daily` | Persisted `verse_assignments` snapshot + shared seen-set | Ro'i Phase 4 (`ME-01`..`ME-03`) | Prevents repeats across weekly/monthly slots and protects history from content edits/deletes |

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `react-native-marked@8.3.4` renders Arabic RTL paragraphs, bold, italic, and lists cleanly under `IBMPlexSansArabic-*` on iOS 26 / Android RN 0.88 | Standard Stack / Common Pitfalls | Minor visual tweaks to `MarkedStyles` (`writingDirection: 'rtl'`, `textAlign: 'left'` / `'auto'`) during device QA; fallback is adjusting custom `Renderer` methods |
| A2 | Ro'i store rate URL (`https://promote.increasinglabs.com/l/roi`) and Google Form support URL (`https://forms.gle/DGKYCQwtfdtGcnTH6`) are the intended defaults until store IDs exist | Architecture Patterns (Pattern 6) | Easy config update in `app/constants/app.ts` / `EXPO_PUBLIC_*` env vars |
| A3 | `GoogleSignin.configure({ scopes: ['https://www.googleapis.com/auth/drive.appdata'] })` + `signIn()` on iOS/Android returns both `idToken` and `drive.appdata` consent in one prompt when `webClientId` + `iosClientId` are set | Architecture Patterns (Pattern 5) | If iOS/Android separates incremental scopes, calling `addScopes({ scopes: ['https://www.googleapis.com/auth/drive.appdata'] })` immediately after `signIn()` handles it cleanly |

## Open Questions

1. **Native dev-client rebuild timing for `expo-clipboard@~58.0.4`:**
   - What we know: `expo-clipboard@~58.0.4` is `[OK]` and not yet in `app/ios/Podfile.lock` or `app/android/settings.gradle`. `react-native`'s legacy `Clipboard` module IS compiled into RN 0.88.1 (`RCTClipboard` / `ClipboardModule`) with a deprecation warning.
   - Recommendation: Install `expo-clipboard@~58.0.4` per `.claude/CLAUDE.md:94` and include a native prebuild + simulator/device rebuild step in the Phase 4 verification plan (so the clipboard module is cleanly tested on real simulator/device).

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Vitest (`vitest.config.ts`), `drizzle-kit`, `build-fixture.mjs` | ✓ | `v26.13.0` | — |
| Bun | Workspace package installs & scripts | ✓ | `1.4.2` | — |
| Xcode CLI (`xcrun`) | iOS Simulator rebuild for `expo-clipboard` | ✓ | installed | — |
| Android ADB (`adb`) | Android dev-client rebuild & device verification | ✓ | installed | — |

## Security Domain

> `security_enforcement` is enabled (`true` in `.planning/config.json`).

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Google Sign-In (`@react-native-google-signin/google-signin@17.0.0`) with `webClientId`/`iosClientId`, NO `offlineAccess`/`serverAuthCode`; `Authorization: Bearer <idToken>` verified server-side by `GoogleAuthGuard` (`OAuth2Client.verifyIdToken`) |
| V3 Session Management | yes | Native Google Play Services / Keychain session (`signInSilently`, `getTokens`); zero custom token storage in AsyncStorage/telemetry |
| V4 Access Control | yes | Personal SQLite tables never leave device except explicit `submitSuggestion` mutation (`SYNC-07`); `drive.appdata` scope restricted to hidden app folder (`D-02`) |
| V5 Input Validation | yes | `submitSuggestionInputSchema` (`@roi/shared`) validates personal items & suggestions (brace token `{الاسم}` only, rejects Markdown links/images/HTML); backend re-validates via `ZodValidationPipe` |
| V6 Cryptography | no | UUIDv7 uses `expo-crypto` `getRandomBytes` via `deviceClock.rand` (`app/features/db/client.ts:17`) |

### Known Threat Patterns for Mobile + GraphQL

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious Markdown links/HTML in public or personal items | Tampering / Spoofing | Write-side `UNSAFE_MARKDOWN` check in `@roi/shared` + custom `Renderer` disabling `link`/`image` in `react-native-marked` |
| PII leakage in Firebase Analytics / Crashlytics | Information Disclosure | `app/__tests__/guards.test.ts` restricts `@react-native-firebase/*` to `app/services/telemetry.ts`; closed `ALLOWED_EVENTS` allowlist; `scrubError` strips arbitrary error messages |
| Suggestion spam / quota bypass | Denial of Service / Tampering | Backend `GoogleAuthGuard` + `10/min` IP `@Throttle` + `10/UTC-day` `googleSub` SQLite quota (`backend/src/suggestions/suggestions.service.ts:43-62`) |
| Hard-delete breaking future Drive sync tombstones | Tampering / Data Loss | `app/features/db/__tests__/schema.test.ts:87-101` forbids `.delete()` calls; all tables use `deletedAt` tombstones |

## Sources

### Primary (HIGH confidence)
- Repository source files read directly: `app/package.json`, `app/constants/app.ts`, `app/constants/theme.ts`, `app/constants/telemetry.ts`, `app/constants/db.ts`, `app/features/db/schema.ts`, `app/features/db/client.ts`, `app/features/db/events.ts`, `app/features/db/__tests__/migrate.test.ts`, `app/features/db/__tests__/schema.test.ts`, `app/scripts/build-fixture.mjs`, `app/__tests__/guards.test.ts`, `app/eslint.config.js`, `app/app/_layout.tsx`, `app/app/index.tsx`, `app/features/sync/ContentGate.tsx`, `app/features/sync/LibraryReadyView.tsx`, `app/features/sync/api.ts`, `app/features/spike/rows.tsx`, `app/services/storage.ts`, `app/services/telemetry.ts`, `app/features/scripture/scripture.tsx`, `app/components/ui/dialog.tsx`, `app/components/ui/select.tsx`, `app/global.css`, `shared/src/arabic.ts`, `shared/src/period.ts`, `shared/src/schemas.ts`, `shared/src/merge.ts`, `backend/src/suggestions/suggestions.resolver.ts`, `backend/src/suggestions/suggestions.service.ts`, `backend/src/common/google-auth.guard.ts`, `backend/src/config/env.ts`, `backend/src/__tests__/suggestions.test.ts`
- Installed package declarations: `app/node_modules/@react-native-google-signin/google-signin/lib/typescript/src/{types,functions,signIn/GoogleSignin,errors/errorCodes}.d.ts`
- Published npm tarball inspection (`react-native-marked@8.3.4`): `dist/typescript/{index,lib/Markdown,lib/types,lib/Renderer,hooks/useMarkdown,theme/types}.d.ts` and `dist/commonjs/{lib/Renderer,theme/styles}.js`
- Reference implementations: `/Users/andrew/Documents/Work/Dev/Projects/Personalss/daily/lib/features/leyaana/{data/daily_pick.dart,data/repository.dart,ui/leyaana_screen.dart}` and `/Users/andrew/Documents/Work/Dev/Projects/Personalss/tarneemna-app/lib/{features/settings/presentation/screens/settings_screen.dart,core/values.dart}`
- `gsd-tools.cjs query package-legitimacy check` & `npm view` for `react-native-marked@8.3.4` and `expo-clipboard@58.0.4`

### Secondary (MEDIUM confidence)
- [Expo Clipboard Docs (`docs.expo.dev`)](https://docs.expo.dev) — `setStringAsync` API verified via WebSearch
- [React Native Google Sign-In Docs (`react-native-google-signin.github.io`)](https://react-native-google-signin.github.io) — `idToken`, `drive.appdata`, `addScopes` verified alongside installed `.d.ts`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — every existing package verified in `app/package.json` and `node_modules`; both new packages audited with `gsd-tools` and `npm view` (`react-native-marked` tarball `.d.ts` inspected directly)
- Architecture: HIGH — all Drizzle, MMKV, `@roi/shared`, GoogleAuthGuard, and `submitSuggestion` contracts verified directly against live code
- Pitfalls: HIGH — RTL blockquote bug in `react-native-marked`, FlatList nesting, Vitest `@/` alias restriction, `schema.test.ts` / `migrate.test.ts` / `guards.test.ts` guards, and `expo-clipboard` native rebuild requirement all directly observed

**Note on Validation Architecture:** Skipped per `.planning/config.json` (`"nyquist_validation": false`). Baseline test suite (`npx vitest run --project @roi/app --project @roi/shared`) passes `16` files / `134` tests.

**Research date:** 2026-11-25
**Valid until:** 2026-12-25 (30 days; pinned Expo SDK 58 stack)
