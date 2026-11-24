# Roadmap: روعي (Ro'i)

## Overview

Ro'i goes from an unproven native stack to two store-published apps in nine phases. Phase 1 proves the hard, expensive-to-retrofit parts on real phones: forced-RTL Arabic, a sync-ready local schema, a shared logic package and every native integration (Firebase, Google Sign-In, MMKV, both widget systems). Phases 2 and 3 stand up the content backend, the one-time Sanity import and the admin panel, so the first launch has real content to download. Phases 4 to 6 deliver the four tools end to end: identity (ليا أنا) with onboarding and personalization, intercession (تشفع) with gratitude (دفتر الشكر), then memorization (حفظ الآيات) with the daily "what's due today" loop that is the core value. Phases 7 and 8 add widgets and Google Drive backup, which are independent of each other. Phase 9 adds the teaching layers and takes the app through store review to publication.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Native Spike** - RTL Arabic on real phones, sync-ready schema, shared package, all native integrations proven together
- [ ] **Phase 2: Content Backend & First Download** - Deployed backend, Sanity import, and a resumable first content download that then works offline
- [ ] **Phase 3: Admin Panel & Moderation** - Google-gated admin to author content with the name-chip editor and review user suggestions
- [ ] **Phase 4: Onboarding, Personalization & Identity** - Onboarding, name/gender personalization, Home grid, Settings and the full ليا أنا tool
- [ ] **Phase 5: Intercession & Gratitude** - تشفع prayer cards with "most neglected" sorting, and the دفتر الشكر daily gratitude line
- [ ] **Phase 6: Memorization & the Daily Loop** - حفظ الآيات spaced-repetition tool, Home "due today" counts and per-tool reminders
- [ ] **Phase 7: Widgets** - One privacy-safe widget per tool on iOS and Android that deep-links into the app
- [ ] **Phase 8: Google Drive Backup & Restore** - Opt-in backup to the user's own Drive, restore on a new device, and manual export
- [ ] **Phase 9: Teaching Layers & Store Release** - Coach marks and help pages, biometric lock, privacy disclosures and publication on both stores

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
**Plans**: 8 plans

Plans:
- [ ] 01-01-PLAN.md — Package legitimacy gate and permanent identifiers (bundle id, package, scheme, App Group)
- [ ] 01-02-PLAN.md — Owner accounts: Apple, Expo and phones, Firebase apps and config files
- [ ] 01-03-PLAN.md — bun workspaces (app, backend, admin, shared) and the tested @roi/shared package
- [ ] 01-04-PLAN.md — Expo app scaffold: forced RTL, NativeWind tokens, fonts, torture screen, guard tests
- [ ] 01-05-PLAN.md — Sync-ready Drizzle schema, event tables, baseline migration and fixture migration test
- [ ] 01-06-PLAN.md — Telemetry choke point with scrubber, spike screen, iOS and Android spike widgets
- [ ] 01-07-PLAN.md — EAS development builds on real phones, every spike row passing, Scripture font chosen
- [ ] 01-08-PLAN.md — Release builds, Firebase crash and event proof, spike decision note
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
**UI hint**: yes

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
**Plans**: TBD
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
**Plans**: TBD
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

### Phase 6: Memorization & the Daily Loop
**Goal:** As a forgetful believer, I want to run a daily verse-review session and see what is due today on Home, so that the app remembers for me without guilt.
**Mode:** mvp
**Depends on**: Phase 5
**Requirements**: MEM-01, MEM-02, MEM-03, MEM-04, MEM-05, MEM-06, MEM-07, MEM-08, MEM-09, MEM-10, HOME-04, SET-02, SET-03, SET-04
**Success Criteria** (what must be TRUE):
  1. In حفظ الآيات the user sees stats (due today, in memorization, memorized, streak), adds their own verse or picks one from the library, sets a daily new-verse cap, and searches and filters their verses.
  2. The user runs a daily review session, rating each card with four buttons; a verse counts as memorized at 30 days or more of stability or when the user marks it manually, and a missed day never shames the streak.
  3. The user practices with the reveal challenge (25% / 50%) and first-letter or full-word recall with a progress bar on Arabic letters, and records and plays back their own recitation.
  4. Home shows today's counts (verses to review, prayers waiting, tonight's gratitude) so the user sees what is due without opening each tool.
  5. Reminders for review, prayer, gratitude and the weekly verse fire at the times the user set in each tool's settings, with generic text by default.
**Plans**: TBD
**UI hint**: yes

### Phase 7: Widgets
**Goal:** As a user, I want to add a home-screen widget per tool that opens the right screen, so that Ro'i is present in my day without opening the app.
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: WDG-01, WDG-02, WDG-03, WDG-04, WDG-05
**Success Criteria** (what must be TRUE):
  1. On iOS the user adds a widget for each of the four tools and sees real content in each.
  2. On Android the user adds a widget for each of the four tools and sees real content in each.
  3. Tapping any widget opens the right screen in the app, from a cold start and from the background.
  4. After the user taps "صليت", finishes a review or saves a gratitude line, the matching widget shows the new state without a manual refresh.
  5. By default widgets show only counts and neutral copy; names and prayer text appear only after the user opts in.
**Plans**: TBD
**UI hint**: yes

### Phase 8: Google Drive Backup & Restore
**Goal:** As a user, I want to back up my data to my own Google Drive and restore it on a new phone, so that changing devices never loses my prayers or verses.
**Mode:** mvp
**Depends on**: Phase 6
**Requirements**: SYNC-01, SYNC-02, SYNC-03, SYNC-04, SYNC-05, SYNC-06, SYNC-07, SET-06
**Success Criteria** (what must be TRUE):
  1. After the user's first win, the app offers Google sign-in and a Drive permission with a plain explanation of why; the user can skip it and offer it again from Settings.
  2. The user's data and recordings appear only in the hidden app-data folder of their own Drive, and a network inspection shows nothing personal sent to our servers.
  3. On app open the app syncs by pulling, merging, then pushing; edits made on two devices both survive, a deleted record stays deleted, prayer counts add up from events, and a fresh empty device never overwrites the backup.
  4. On a new phone, the user signs in, sees a preview of what will be restored, and then gets their verses, prayers, gratitude lines, recordings and settings back.
  5. Background sync runs roughly daily when the OS allows it, and the user can export all their data as a file from Settings at any time.
**Plans**: TBD
**UI hint**: yes

### Phase 9: Teaching Layers & Store Release
**Goal:** As a new user, I want to download Ro'i from the store and have each tool explain itself, so that I'm never lost and I trust it with private prayers.
**Mode:** mvp
**Depends on**: Phase 7, Phase 8
**Requirements**: HELP-01, HELP-02, HELP-03, SET-05, REL-02, REL-03, REL-04, REL-05
**Success Criteria** (what must be TRUE):
  1. The first time the user opens each tool they see a one-line purpose and 3-4 coach marks that render correctly in RTL on both platforms; every tool has a teaching empty state and a permanent (?) button opening a help page with FAQ shortcuts.
  2. The user can turn on a biometric app lock in Settings, and the app asks for Face ID, fingerprint or the phone passcode whenever it is opened or returns from the background.
  3. A public privacy policy and the App Store and Google Play privacy disclosures are published and match what each SDK actually collects.
  4. On a build installed from the stores' own testing tracks, Google sign-in works with the OAuth consent screen set to "In production".
  5. The app passes App Review and Google Play review and a user can download and use it from both stores.
**Plans**: TBD
**UI hint**: yes

## Cross-Phase Notes

- **Parallel work:** Phase 3 needs only Phase 2, so it can run alongside Phases 4 and 5. Phases 7 and 8 both need only Phase 6 and are independent of each other.
- **Where cross-tool requirements sit:** HOME-04 and SET-02 to SET-04 complete only when all four tools exist, so they are mapped to Phase 6. Earlier tool phases still ship their own slice (for example the nightly gratitude reminder in Phase 5) on the shared notification planner.
- **Phase 4 is the heaviest phase** (18 requirements) because onboarding's "pick a first verse" needs the ليا أنا content and favorites to exist. Split it with `/gsd-phase` if planning shows it is too large.
- **First launch needs internet,** so backend uptime and the Sanity import with production content are release gates for Phase 9.
- **Play 12-tester / 14-day clock:** start closed testing with a stable internal build at the end of Phase 6, so the 14 days have elapsed before Phase 9 needs them.
- **Research before planning (`/gsd-plan-phase --research-phase N`):** Phase 1 (native stack spike), Phase 3 (Tiptap chip editor and Markdown round-trip), Phase 7 (iOS widget RTL and deep links, Android bitmap sizing), Phase 8 (headless sign-in, Drive file layout), Phase 9 (RTL coach marks, current store guidelines).
- **Decisions to settle inside a phase:** iOS widget library, `expo-widgets` or `@bacons/apple-targets` (Phase 1 spike); whether weekly and monthly verse pools are the whole library or a flagged subset (Phase 4); audio length cap and Wi-Fi-only recording sync (Phases 6 and 8); Drive file layout, one shared file or one per device (Phase 8).

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Native Spike | 0/8 | Not started | - |
| 2. Content Backend & First Download | 0/TBD | Not started | - |
| 3. Admin Panel & Moderation | 0/TBD | Not started | - |
| 4. Onboarding, Personalization & Identity | 0/TBD | Not started | - |
| 5. Intercession & Gratitude | 0/TBD | Not started | - |
| 6. Memorization & the Daily Loop | 0/TBD | Not started | - |
| 7. Widgets | 0/TBD | Not started | - |
| 8. Google Drive Backup & Restore | 0/TBD | Not started | - |
| 9. Teaching Layers & Store Release | 0/TBD | Not started | - |
