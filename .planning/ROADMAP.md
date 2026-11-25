# Roadmap: روعي (Ro'i)

## Overview

Ro'i goes from an unproven native stack to two store-published apps in seven phases. Phase 1 proves the hard, expensive-to-retrofit parts on real phones: forced-RTL Arabic, a sync-ready local schema, a shared logic package and every native integration (Firebase, Google Sign-In, MMKV, both widget systems). Phases 2 and 3 stand up the content backend, the one-time Sanity import and the admin panel, so the first launch has real content to download. Phases 4 to 6 deliver the four tools end to end: identity (ليا أنا) with onboarding and personalization, intercession (تشفع) with gratitude (دفتر الشكر), then memorization (حفظ الآيات) with the daily "what's due today" loop that is the core value, plus a home-screen widget per tool. Phase 7 adds Google Drive backup and the teaching layers, and takes the app through store review to publication.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation & Native Spike** - RTL Arabic on real phones, sync-ready schema, shared package, all native integrations proven together *(Release & Firebase Console checks deferred to end of Phase 2)*
- [ ] **Phase 2: Content Backend & First Download** - Deployed backend, Sanity import, and a resumable first content download that then works offline
- [ ] **Phase 3: Admin Panel & Moderation** - Google-gated admin to author content with the name-chip editor and review user suggestions
- [x] **Phase 4: Onboarding, Personalization & Identity** - Onboarding, name/gender personalization, Home grid, Settings and the full ليا أنا tool (completed 2026-11-26)
- [ ] **Phase 5: Intercession & Gratitude** - تشفع prayer cards with "most neglected" sorting, and the دفتر الشكر daily gratitude line
- [ ] **Phase 6: Memorization, Daily Loop & Widgets** - حفظ الآيات spaced-repetition tool, Home "due today" counts, per-tool reminders, and one privacy-safe deep-linking widget per tool on iOS and Android
- [ ] **Phase 7: Drive Backup, Teaching Layers & Store Release** - Opt-in Drive backup/restore and export, coach marks and help pages, biometric lock, privacy disclosures and publication on both stores

## Phase Details

### Phase 1: Foundation & Native Spike

**Goal:** As a solo owner, I want to run an Arabic RTL app on real phones with a sync-ready database and proven native integrations, so that feature work never rests on guesses.
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: FND-01, FND-02, FND-03, FND-04, FND-05, FND-06, FND-07, FND-08, FND-09, REL-01
**Success Criteria** (what must be TRUE):
  1. On a real iPhone and a real Android phone set to English, the app launches in forced RTL Arabic; Scripture shows correct tashkeel in the bundled font at a size the user can change, numbers and dates use Arabic-Indic digits, and light/dark mode switches.
  2. One EAS development build and one release build run on both phones with Firebase, Google Sign-In, MMKV, an iOS widget, an Android widget and the pinned Reanimated stack all working together, and a spike screen shows each integration passing.
  3. Typing a search without diacritics, or with a different letter variant (أ/ا/إ، ة/ه، ى/ي), still finds the matching Arabic fixture text on the torture-fixtures screen.
  4. Every user-data table has a client UUID plus `createdAt`, `updatedAt` and `deletedAt`; deleting a record leaves a tombstone; "prayed" and "review" counts are computed from append-only event rows; a fixture-database migration test passes.
  5. One shared package (zod schemas, `personalize()`, `normalizeArabic()`, period/seed logic, `merge()`) is imported by the app, backend and admin workspaces with passing unit tests, and a test crash plus a test analytics event reach Firebase using only a closed list of generic events with no personal content.

**Plans**: 16/16 plans executed *(Release & Firebase Console checks moved to end of Phase 2)*

Plans:
**Wave 1**
- [x] 01-01-PLAN.md — Package legitimacy gate and permanent identifiers (bundle id, package, scheme, App Group)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 01-02-PLAN.md — Owner accounts: Apple, Expo and phones, Firebase apps and config files
- [x] 01-03-PLAN.md — bun workspaces (shared, backend, admin) and @roi/shared Arabic module + fixtures

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 01-04-PLAN.md — @roi/shared sync primitives (UUIDv7, period keys, seeded pick, merge, zod schemas)

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 01-05-PLAN.md — Backend and admin workspace consumer smoke tests for @roi/shared

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 01-06-PLAN.md — Expo SDK 58 app scaffold, pinned deps, forced RTL, and accessibility lint

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 01-07-PLAN.md — Drizzle baseline SQLite boot, native config plugins, dynamic signing, EAS profiles, prebuild

**Wave 7** *(blocked on Wave 6 completion)*
- [x] 01-08-PLAN.md — NativeWind warm paper theme tokens, MMKV preferences, and light/dark/system switch

**Wave 8** *(blocked on Wave 7 completion)*
- [x] 01-09-PLAN.md — Bundled fonts, 5-step Scripture size slider, and Reusables Dialog & Select

**Wave 9** *(blocked on Wave 8 completion)*
- [x] 01-10-PLAN.md — Dev-gated torture-fixtures screen with Arabic search and static guard tests

**Wave 10** *(blocked on Wave 9 completion)*
- [x] 01-11-PLAN.md — Sync-ready Drizzle schema, append-only event tables, baseline migration, fixture DB test
- [x] 01-12-PLAN.md — Privacy-first telemetry choke point and global error scrubber
- [x] 01-13-PLAN.md — Android and iOS spike widgets with deep links

**Wave 11** *(blocked on Wave 10 completion)*
- [x] 01-14-PLAN.md — Dev-only spike screen, automatic runner, and manual/widget rows

**Wave 12** *(blocked on Wave 11 completion)*
- [x] 01-15-PLAN.md — Local development builds (iOS Simulator + RMX5106), D-01/D-09 verification, Scripture font chosen (`amiri`)

**Wave 13** *(blocked on Wave 12 completion)*
- [x] 01-16-PLAN.md — Font default, owner-signed release APK, spike decision note (Release & Firebase triggers moved to end of Phase 2)

**UI hint**: yes

### Phase 2: Content Backend & First Download

**Goal:** As a new user, I want to download the app's content once from a reliable backend and then use it fully offline, so that I can use Ro'i anywhere.
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: BE-01, BE-02, BE-03, BE-04, BE-05, BE-06, BE-07, HOME-06, HOME-07
**Success Criteria** (what must be TRUE):
  1. A fresh install with internet downloads the full library (verses, names of God, blessings) from the deployed backend; the download can be interrupted and resumed, ends fully applied or not at all, and afterwards the app launches and shows content in airplane mode.
  2. A fresh install without internet shows a friendly Arabic "turn on the internet to download your content" screen, and its retry button starts the download once the connection returns.
  3. After content changes on the server, a phone that already synced receives only the changed, new and deleted items (including soft-delete tombstones) by sending its last `contentVersion`, and never re-downloads the whole library.
  4. The owner can run the Sanity import with a dry run, then run it for real, and re-running it produces no duplicates; every content change, including the import, writes an audit-log entry.
  5. The production backend runs on Dokploy with a persistent volume, a restore from backup has been tested, an uptime monitor alerts the owner, public endpoints are throttled with introspection off and CORS locked, and a suggestion submitted with a signed anonymous device ID is stored as `pending` and rate-limited.

**Plans**: TBD
- [x] 02-01-PLAN.md
- [x] 02-02-PLAN.md
- [x] 02-03-PLAN.md
- [x] 02-04-PLAN.md
- [x] 02-05-PLAN.md
- [x] 02-06-PLAN.md
- [x] 02-07-PLAN.md
- [x] 02-08-PLAN.md

**UI hint**: yes
**Inherited End-of-Phase Verification (from Phase 1, moved per owner 2026-11-25):** Run Android Release APK (`app-release.apk`) & local Xcode Release Simulator `RELEASE_RESULT` checks, Firebase Console Release triggers (`spike_test`, Test Crash, Sentinel `E_UNCAUGHT` scrub), iOS `otool -L` `AdSupport` check, and `01-REVIEW-FIX.md` (`WR-01`, `WR-02`, `WR-03`, `WR-06`) human verification at Phase 2 sign-off.

### Phase 3: Admin Panel & Moderation

**Goal:** As a content owner, I want to add and moderate verses, names and blessings in a safe admin panel, so that the app's content stays correct without code changes.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: ADM-01, ADM-02, ADM-03, ADM-04, ADM-05, ADM-06, ADM-07
**Success Criteria** (what must be TRUE):
  1. An admin signs in with Google and reaches the panel only if their email is on the allowlist (several admins work side by side); any other Google account is refused, and the session expires after a short time.
  2. An admin can add, edit and soft-delete a verse, a name of God and a blessing, and the change reaches a phone on its next content sync.
  3. With "same text for male/female" on, one field shows; turned off, male and female fields appear side by side and both are required; the admin inserts the user's name with a draggable chip and never sees the raw `{الاسم}` token.
  4. A live preview with a test name and a gender toggle renders exactly what a phone would show; validation rejects any token other than `{الاسم}` and warns when only one version contains the name.
  5. An admin opens a suggestion sent from a phone, edits it, then accepts it (it joins public content) or rejects it (it leaves the queue).

**Plans:** 9/9 plans executed

Plans:
**Wave 1**
- [x] 03-01-PLAN.md — Package legitimacy gate (blocking owner approval for Phase 3 npm dependencies)

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 03-02-PLAN.md — Drizzle migration 0001 and backend Google-allowlisted 14-day httpOnly cookie auth
- [x] 03-04-PLAN.md — Admin SPA scaffold, split TS/Vitest, Tailwind 4 warm-paper theme, self-hosted Arabic fonts, and bilingual i18n

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 03-03-PLAN.md — Backend ContentModule extraction, admin content CRUD, suggestion moderation queue, and audit log GraphQL API
- [x] 03-05-PLAN.md — Warm-paper Tailwind 4 logical-CSS UI component primitives in admin/src/components/ui/

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 03-06-PLAN.md — Credentialed GraphQL client, GIS AuthProvider + non-clearing ReauthModal, LoginPage, and bilingual AdminShell
- [x] 03-07-PLAN.md — Tiptap 3 atomic {الاسم} chip editor, Markdown-subset serializer, validation, and live preview

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 03-08-PLAN.md — Catalog management, suggestion moderation queue UI, and read-only audit log page

**Wave 6** *(blocked on Wave 5 completion)*
- [x] 03-09-PLAN.md — Express 5 /admin static serving, GIS Helmet CSP, multi-stage Dockerfile, and smoke verification

**UI hint**: yes

### Phase 4: Onboarding, Personalization & Identity

**Goal:** As a new user, I want to set my name, get my own weekly verse and read names of God and blessings written for me, so that the app feels personal from the first minute.
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: HOME-01, HOME-02, HOME-03, HOME-05, PERS-01, PERS-02, PERS-03, PERS-04, ME-01, ME-02, ME-03, ME-04, ME-05, ME-06, ME-07, ME-08, ME-09, SET-01
**Success Criteria** (what must be TRUE):
  1. After the content download, a new user sees three onboarding screens (what Ro'i is, name and gender, pick a first verse or choose "later") and reaches Home with a first win already saved within the first minute.
  2. Content and UI strings show the user's name and the female form where one exists, fall back to a neutral form when no name is set, and update everywhere after the user changes name or gender in Settings.
  3. Home shows a tile per tool; the user can show, hide and reorder tiles, the choice survives a restart, a one-time intro message explains the screen, and Settings offers dark mode, rate app, request help and WhatsApp contact.
  4. In ليا أنا the user sees a weekly verse (Saturday to Friday) and a monthly verse that stay the same on every reopen, never repeat one already received, and stay in history after the content is edited.
  5. The user reads names of God and blessings as rich-text cards, favorites any item with ⭐ and sees all favorites, long-presses to copy an item with its reference, adds personal items, and can suggest one to everyone.

**Plans:** 7/7 plans complete

Plans:
**Wave 1**
- [x] 04-01-PLAN.md — Package legitimacy gate for react-native-marked@8.3.4 and expo-clipboard@~58.0.4

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 04-02-PLAN.md — Install approved packages, Drizzle 0002 migration, expo prebuild, and non-repeat verse assignment engine

**Wave 3** *(blocked on Wave 2 completion)*
- [x] 04-03-PLAN.md — Tracer slice: personalization engine, ProfileProvider, uiCopy, ContentRefreshContext, and Home (أدواتك)

**Wave 4** *(blocked on Wave 3 completion)*
- [x] 04-04-PLAN.md — 3-screen Onboarding flow, first-win starter verses, and skippable drive.appdata Google Sign-In
- [x] 04-05-PLAN.md — ليا أنا 4-tab reader, السجل history, Names/Blessings RTL Markdown cards, Favorites ⭐, and recipient-aware copy

**Wave 5** *(blocked on Wave 4 completion)*
- [x] 04-06-PLAN.md — Global Settings screen (theme, Scripture size, editable name/gender, Google connect, Share/Rate/Help/WhatsApp)
- [x] 04-07-PLAN.md — Local personal items CRUD across all 3 kinds and Google-authenticated public suggestions (submitSuggestion)

**UI hint**: yes

### Phase 5: Intercession & Gratitude

**Goal:** As a busy believer, I want to record who I pray for and one thing I'm thankful for each day, so that I never forget either and can see my journey.
**Mode:** mvp
**Depends on**: Phase 4
**Requirements**: INT-01, INT-02, INT-03, INT-04, INT-05, INT-06, INT-07, GRT-01, GRT-02, GRT-03, GRT-04
**Success Criteria** (what must be TRUE):
  1. In تشفع the user creates a prayer card (text, person, since-when), pins it, taps "صليت", and sees that card's prayed count go up.
  2. The user groups prayers by person with each person's active prayer count, sorts by random, most neglected, oldest, newest or alphabetical, sets a default sort, and searches prayers.
  3. The user marks a prayer "اتستجابت" with an outcome, browses the answered archive with counts, and taps once to turn it into a gratitude line.
  4. In دفتر الشكر the user writes one dated line per day, adds or edits lines for past days, and views all lines of a month.
  5. The user picks a time and receives a gentle nightly gratitude reminder that is generic and never accusing.

**Plans**: TBD
**UI hint**: yes

### Phase 6: Memorization, Daily Loop & Widgets

**Goal:** As a forgetful believer, I want to run a daily verse-review session, see what is due today on Home, and add a home-screen widget per tool, so that the app remembers for me without guilt and is present in my day without opening it.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: MEM-01, MEM-02, MEM-03, MEM-04, MEM-05, MEM-06, MEM-07, MEM-08, MEM-09, MEM-10, HOME-04, SET-02, SET-03, SET-04, WDG-01, WDG-02, WDG-03, WDG-04, WDG-05
**Success Criteria** (what must be TRUE):
  1. In حفظ الآيات the user sees stats (due today, in memorization, memorized, streak), adds their own verse or picks one from the library, sets a daily new-verse cap, and searches and filters their verses.
  2. The user runs a daily review session, rating each card with four buttons; a verse counts as memorized at 30 days or more of stability or when the user marks it manually, and a missed day never shames the streak.
  3. The user practices with the reveal challenge (25% / 50%) and first-letter or full-word recall with a progress bar on Arabic letters, and records and plays back their own recitation.
  4. Home shows today's counts (verses to review, prayers waiting, tonight's gratitude) so the user sees what is due without opening each tool.
  5. Reminders for review, prayer, gratitude and the weekly verse fire at the times the user set in each tool's settings, with generic text by default.
  6. On iOS and Android the user adds a widget for each of the four tools and sees real content in each.
  7. Tapping any widget opens the right screen in the app, from a cold start and from the background.
  8. After the user taps "صليت", finishes a review or saves a gratitude line, the matching widget shows the new state without a manual refresh.
  9. By default widgets show only counts and neutral copy; names and prayer text appear only after the user opts in.

**Plans**: TBD
**UI hint**: yes

### Phase 7: Drive Backup, Teaching Layers & Store Release

**Goal:** As a user, I want to back up my data to my own Google Drive, have each tool explain itself, and download Ro'i from the store, so that changing devices never loses my prayers or verses, I'm never lost, and I trust it with private prayers.
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05, SYNC-06, SYNC-07, SET-06, HELP-01, HELP-02, HELP-03, SET-05, REL-02, REL-03, REL-04, REL-05
**Success Criteria** (what must be TRUE):
  1. After the user's first win, the app offers Google sign-in and a Drive permission with a plain explanation of why; the user can skip it and offer it again from Settings.
  2. The user's data and recordings appear only in the hidden app-data folder of their own Drive, and a network inspection shows nothing personal sent to our servers.
  3. On app open the app syncs by pulling, merging, then pushing; edits made on two devices both survive, a deleted record stays deleted, prayer counts add up from events, and a fresh empty device never overwrites the backup.
  4. On a new phone, the user signs in, sees a preview of what will be restored, and then gets their verses, prayers, gratitude lines, recordings and settings back.
  5. Background sync runs roughly daily when the OS allows it, and the user can export all their data as a file from Settings at any time.
  6. The first time the user opens each tool they see a one-line purpose and 3-4 coach marks that render correctly in RTL on both platforms; every tool has a teaching empty state and a permanent (?) button opening a help page with FAQ shortcuts.
  7. The user can turn on a biometric app lock in Settings, and the app asks for Face ID, fingerprint or the phone passcode whenever it is opened or returns from the background.
  8. A public privacy policy and the App Store and Google Play privacy disclosures are published and match what each SDK actually collects.
  9. On a build installed from the stores' own testing tracks, Google sign-in works with the OAuth consent screen set to "In production".
  10. The app passes App Review and Google Play review and a user can download and use it from both stores.

**Plans**: TBD
**UI hint**: yes

## Cross-Phase Notes

- **Parallel work:** Phase 3 needs only Phase 2, so it can run alongside Phases 4 and 5. Inside Phase 6, widgets and memorization can be planned as separate waves; inside Phase 7, Drive backup and teaching layers are independent of each other.
- **Where cross-tool requirements sit:** HOME-04 and SET-02 to SET-04 complete only when all four tools exist, so they are mapped to Phase 6. Earlier tool phases still ship their own slice (for example the nightly gratitude reminder in Phase 5) on the shared notification planner.
- **Phase 4 is the heaviest phase** (18 requirements) because onboarding's "pick a first verse" needs the ليا أنا content and favorites to exist. Split it with `/gsd-phase` if planning shows it is too large.
- **First launch needs internet,** so backend uptime and the Sanity import with production content are release gates for Phase 7.
- **Play 12-tester / 14-day clock:** start closed testing with a stable internal build at the end of Phase 6, so the 14 days have elapsed before Phase 7 needs them.
- **Research before planning (`/gsd-plan-phase --research-phase N`):** Phase 1 (native stack spike), Phase 3 (Tiptap chip editor and Markdown round-trip), Phase 6 (iOS widget RTL and deep links, Android bitmap sizing), Phase 7 (headless sign-in, Drive file layout, RTL coach marks, current store guidelines).
- **Decisions to settle inside a phase:** iOS widget library, `expo-widgets` or `@bacons/apple-targets` (Phase 1 spike); whether weekly and monthly verse pools are the whole library or a flagged subset (Phase 4); audio length cap and Wi-Fi-only recording sync (Phases 6 and 7); Drive file layout, one shared file or one per device (Phase 7).

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Native Spike | 16/16 | Complete *(Release checks deferred to Ph 2)* | 2026-11-25 |
| 2. Content Backend & First Download | 7/8 | In Progress | - |
| 3. Admin Panel & Moderation | 9/9 | In Progress | - |
| 4. Onboarding, Personalization & Identity | 7/7 | Complete    | 2026-11-26 |
| 5. Intercession & Gratitude | 0/TBD | Not started | - |
| 6. Memorization, Daily Loop & Widgets | 0/TBD | Not started | - |
| 7. Drive Backup, Teaching Layers & Store Release | 0/TBD | Not started | - |
