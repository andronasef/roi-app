# Requirements: روعي (Ro'i)

**Defined:** 2026-11-24
**Core Value:** It remembers for you — the app tells you what's due today, without guilt.

## Owner decisions applied

- Week starts **Saturday**. Digits: **Arabic-Indic (١٢٣)** everywhere.
- A verse is "memorized" when its FSRS stability / interval reaches **30 days or more**, **or** the user marks it manually.
- Google sign-in / Drive is offered **after the user's first win**, not on the first screen. It stays skippable and re-offerable from Settings.
- Added to v1 from research: **manual data export** and **biometric app lock**.

## v1 Requirements

### Foundation & Platform (FND)

- [ ] **FND-01**: App runs in forced RTL with Arabic-only UI, regardless of the phone's language
- [ ] **FND-02**: Scripture renders with correct tashkeel using a bundled font; the user can change the font size
- [ ] **FND-03**: All numbers and dates show in Arabic-Indic digits
- [ ] **FND-04**: User can search in Arabic ignoring diacritics and letter variants (أ/ا/إ، ة/ه، ى/ي)
- [ ] **FND-05**: User can switch between light and dark mode
- [ ] **FND-06**: Every user-data table has a client UUID, `createdAt`, `updatedAt` and `deletedAt`; deletes are soft
- [ ] **FND-07**: Counters (prayed, reviews) are derived from append-only event rows
- [x] **FND-08**: One shared package holds zod schemas, `personalize()`, `normalizeArabic()`, period/seed logic and the merge function, used by app, backend and admin
- [ ] **FND-09**: A real-device build proves the native stack together (Firebase, Google Sign-In, MMKV, both widget systems, Reanimated pins) before feature work depends on it

### Onboarding & Home (HOME)

- [ ] **HOME-01**: First launch shows 3 onboarding screens (what Ro'i is; name + gender; pick a first verse or "later")
- [ ] **HOME-02**: User reaches a first win (a verse, a prayer card or a gratitude line saved) within the first minute
- [ ] **HOME-03**: Home shows a tile per tool; the user can show, hide and reorder tiles, and the choice persists
- [ ] **HOME-04**: Home shows what is due today as counts (verses to review, prayers waiting, tonight's gratitude)
- [ ] **HOME-05**: A one-time intro message explains the home screen
- [ ] **HOME-06**: First launch without internet shows a friendly screen with a retry button; after the first download everything works offline
- [ ] **HOME-07**: The first content download is resumable and applied transactionally

### Personalization (PERS)

- [ ] **PERS-01**: User enters name and gender; both can be changed later in Settings
- [ ] **PERS-02**: Content renders from `text` / `textFemale` / `{الاسم}` using the one shared `personalize()` function
- [ ] **PERS-03**: When the name is missing, the content falls back to a neutral form
- [ ] **PERS-04**: UI strings are also gender-aware

### ليا أنا (ME)

- [ ] **ME-01**: User sees a weekly verse picked pseudo-randomly from their own seed, stable for the whole week (Saturday to Friday), never repeating a verse they already got
- [ ] **ME-02**: User sees a monthly verse with the same rules for the month
- [ ] **ME-03**: Past assignments are saved, so history survives content edits
- [ ] **ME-04**: User can read names of God as rich-text article cards
- [ ] **ME-05**: User can read blessings (first-person title, rich text, supporting verse)
- [ ] **ME-06**: User can favorite any item with ⭐ and see all favorites
- [ ] **ME-07**: User can long-press to copy any item, with its reference, to share outside the app
- [ ] **ME-08**: User can add personal items locally
- [ ] **ME-09**: User can optionally suggest a personal item to everyone

### حفظ الآيات (MEM)

- [ ] **MEM-01**: User sees stats: due today, in memorization, memorized, streak
- [ ] **MEM-02**: User can add their own verse, or pick one from the library
- [ ] **MEM-03**: User can run a daily review session and rate each card with four FSRS buttons
- [ ] **MEM-04**: User can set a daily new-verse cap
- [ ] **MEM-05**: User can search and filter verses
- [ ] **MEM-06**: User can use reveal challenge (25% / 50%)
- [ ] **MEM-07**: User can use first-letter and full-word recall with a progress bar, on Arabic graphemes
- [ ] **MEM-08**: User can record and play back their own recitation
- [ ] **MEM-09**: A verse counts as memorized by the rule above, and the user can mark it manually
- [ ] **MEM-10**: The streak is forgiving and never shames the user for a missed day

### تشفع (INT)

- [ ] **INT-01**: User can create a prayer card (text, person, since-when) and pin it
- [ ] **INT-02**: User can tap "صليت" to record a prayer
- [ ] **INT-03**: User can group by person and see each person's active prayer count
- [ ] **INT-04**: User can sort by random, most neglected, oldest, newest or alphabetical, with a default sort setting
- [ ] **INT-05**: User can search prayers
- [ ] **INT-06**: User can mark a prayer "اتستجابت" with an outcome, and browse the archive with counts
- [ ] **INT-07**: An answered prayer offers a one-tap link to a gratitude line

### دفتر الشكر (GRT)

- [ ] **GRT-01**: User can write one dated line per day
- [ ] **GRT-02**: User can get a gentle nightly reminder at a time they choose
- [ ] **GRT-03**: User can view all lines of a month
- [ ] **GRT-04**: User can add or edit lines for past days

### Widgets (WDG)

- [ ] **WDG-01**: User can add a widget per tool on iOS
- [ ] **WDG-02**: User can add a widget per tool on Android
- [ ] **WDG-03**: Tapping a widget opens the right screen
- [ ] **WDG-04**: The app pushes fresh widget snapshots after every relevant change
- [ ] **WDG-05**: Widgets show privacy-safe content by default; names and prayer text are opt-in

### Settings & Notifications (SET)

- [ ] **SET-01**: Global settings: dark mode, rate app, request help, WhatsApp contact
- [ ] **SET-02**: Per-tool settings as listed in PROJECT.md (weekly-verse day/time; review time and new-verse cap; prayer reminder time and default sort; gratitude time)
- [ ] **SET-03**: Local notifications fire for review, prayer, gratitude and the weekly verse
- [ ] **SET-04**: Notification text is generic by default
- [ ] **SET-05**: User can turn on a biometric app lock
- [ ] **SET-06**: User can export all their data manually as a file

### Help & Teaching (HELP)

- [ ] **HELP-01**: Each tool shows a one-line purpose and 3–4 coach marks once
- [ ] **HELP-02**: Each tool has teaching empty states
- [ ] **HELP-03**: Each tool has a permanent (?) button opening a detailed help page with FAQ shortcuts

### Google Drive Sync (SYNC)

- [ ] **SYNC-01**: After the first win, the app offers Google sign-in and a Drive permission with a plain explanation; the user can skip and re-offer it from Settings
- [ ] **SYNC-02**: Data and recordings are saved only to the user's hidden `drive.appdata` folder
- [ ] **SYNC-03**: Sync runs pull, merge, push on app open; an empty device never overwrites a backup
- [ ] **SYNC-04**: Merge is per-record last-write-wins with tombstones; counters merge from event rows
- [ ] **SYNC-05**: User can restore everything on a new device after signing in, with a preview first
- [ ] **SYNC-06**: Background sync runs roughly daily as a best-effort bonus
- [ ] **SYNC-07**: Nothing personal is ever sent to our servers

### Backend (BE)

- [ ] **BE-01**: API serves public content (verses, names, blessings) from one pre-built gzipped snapshot per type, rebuilt only on admin change
- [ ] **BE-02**: One global monotonic `contentVersion`; clients send their last version and get deltas, including soft-delete tombstones
- [ ] **BE-03**: Users can submit suggestions as `pending` with a signed anonymous device ID
- [ ] **BE-04**: Hardening: throttling (stricter on suggestions), zod validation, GraphQL depth/complexity limits, introspection off in production, CORS locked to the admin origin, helmet, payload limits, trust proxy
- [ ] **BE-05**: An audit log records every admin change
- [ ] **BE-06**: Deployed with Docker on Dokploy with a persistent volume, a tested backup and an uptime monitor
- [ ] **BE-07**: A one-time idempotent import loads the initial content from Sanity, with a dry run

### Admin Panel (ADM)

- [ ] **ADM-01**: Admin signs in with Google; only allowlisted emails get in (multiple admins), with a short-lived session
- [ ] **ADM-02**: Admin can add, edit and soft-delete verses, names of God and blessings
- [ ] **ADM-03**: A "same text for male/female" switch shows side-by-side fields when off; both are required when off
- [ ] **ADM-04**: Admin inserts `{الاسم}` through an atomic, draggable chip and never sees the raw token
- [ ] **ADM-05**: Admin sees a live preview with a test name and gender toggle
- [ ] **ADM-06**: Validation rejects any token other than `{الاسم}` and warns when only one version has the name
- [ ] **ADM-07**: Admin can review, edit, accept or reject suggestions

### Privacy & Release (REL)

- [ ] **REL-01**: Analytics uses a closed list of generic events and never logs prayer text, names or verse content; crash reports are scrubbed
- [ ] **REL-02**: A privacy policy and store privacy disclosures are published, matching each SDK's real data use
- [ ] **REL-03**: The app passes App Review and Google Play review (review notes, privacy manifests, Play 12-tester / 14-day rule)
- [ ] **REL-04**: The Google OAuth consent screen is "In production" and verified on a store-installed build
- [ ] **REL-05**: The app ships on both stores

## v2 Requirements

- **TODAY-01**: One unified "today" line on Home that merges review, most-neglected person and gratitude
- **MEM-V2-01**: Suspend a verse, undo a rating, and a hard review cap with gentle catch-up
- **INT-V2-01**: Pause a prayer card without archiving it
- **SHARE-01**: Share an item as an image card
- **INT-V2-02**: Prayer anniversary reminder
- **WDG-V2-01**: Widget quick actions
- **SET-V2-01**: Hide streaks setting
- **I18N-01**: Languages other than Arabic
- **SYNC-V2-01**: iCloud or other sync providers
- **GAME-01**: Gamified challenges (7 days of gratitude etc.)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Syncing personal data to our servers | Data is among the most sensitive kinds; only the user's own Drive |
| Admin scheduling of weekly/monthly verses | Dropped; each user is assigned automatically |
| New top-level tools or tiles | New features nest inside the four tools |
| End-user accounts | Anonymous device ID only; admin login is for admins |
| Mandatory video tutorials | Explanations stay text and in context |
| Loss-aversion streaks, social features, a full Bible reader, Agpeya, AI features, ads | Against the tone and scope of the app |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FND-01 | Phase 1 | Pending |
| FND-02 | Phase 1 | Pending |
| FND-03 | Phase 1 | Pending |
| FND-04 | Phase 1 | Pending |
| FND-05 | Phase 1 | Pending |
| FND-06 | Phase 1 | Pending |
| FND-07 | Phase 1 | Pending |
| FND-08 | Phase 1 | Complete |
| FND-09 | Phase 1 | Pending |
| REL-01 | Phase 1 | Pending |
| BE-01 | Phase 2 | Pending |
| BE-02 | Phase 2 | Pending |
| BE-03 | Phase 2 | Pending |
| BE-04 | Phase 2 | Pending |
| BE-05 | Phase 2 | Pending |
| BE-06 | Phase 2 | Pending |
| BE-07 | Phase 2 | Pending |
| HOME-06 | Phase 2 | Pending |
| HOME-07 | Phase 2 | Pending |
| ADM-01 | Phase 3 | Pending |
| ADM-02 | Phase 3 | Pending |
| ADM-03 | Phase 3 | Pending |
| ADM-04 | Phase 3 | Pending |
| ADM-05 | Phase 3 | Pending |
| ADM-06 | Phase 3 | Pending |
| ADM-07 | Phase 3 | Pending |
| HOME-01 | Phase 4 | Pending |
| HOME-02 | Phase 4 | Pending |
| HOME-03 | Phase 4 | Pending |
| HOME-05 | Phase 4 | Pending |
| PERS-01 | Phase 4 | Pending |
| PERS-02 | Phase 4 | Pending |
| PERS-03 | Phase 4 | Pending |
| PERS-04 | Phase 4 | Pending |
| ME-01 | Phase 4 | Pending |
| ME-02 | Phase 4 | Pending |
| ME-03 | Phase 4 | Pending |
| ME-04 | Phase 4 | Pending |
| ME-05 | Phase 4 | Pending |
| ME-06 | Phase 4 | Pending |
| ME-07 | Phase 4 | Pending |
| ME-08 | Phase 4 | Pending |
| ME-09 | Phase 4 | Pending |
| SET-01 | Phase 4 | Pending |
| INT-01 | Phase 5 | Pending |
| INT-02 | Phase 5 | Pending |
| INT-03 | Phase 5 | Pending |
| INT-04 | Phase 5 | Pending |
| INT-05 | Phase 5 | Pending |
| INT-06 | Phase 5 | Pending |
| INT-07 | Phase 5 | Pending |
| GRT-01 | Phase 5 | Pending |
| GRT-02 | Phase 5 | Pending |
| GRT-03 | Phase 5 | Pending |
| GRT-04 | Phase 5 | Pending |
| MEM-01 | Phase 6 | Pending |
| MEM-02 | Phase 6 | Pending |
| MEM-03 | Phase 6 | Pending |
| MEM-04 | Phase 6 | Pending |
| MEM-05 | Phase 6 | Pending |
| MEM-06 | Phase 6 | Pending |
| MEM-07 | Phase 6 | Pending |
| MEM-08 | Phase 6 | Pending |
| MEM-09 | Phase 6 | Pending |
| MEM-10 | Phase 6 | Pending |
| HOME-04 | Phase 6 | Pending |
| SET-02 | Phase 6 | Pending |
| SET-03 | Phase 6 | Pending |
| SET-04 | Phase 6 | Pending |
| WDG-01 | Phase 7 | Pending |
| WDG-02 | Phase 7 | Pending |
| WDG-03 | Phase 7 | Pending |
| WDG-04 | Phase 7 | Pending |
| WDG-05 | Phase 7 | Pending |
| SYNC-01 | Phase 8 | Pending |
| SYNC-02 | Phase 8 | Pending |
| SYNC-03 | Phase 8 | Pending |
| SYNC-04 | Phase 8 | Pending |
| SYNC-05 | Phase 8 | Pending |
| SYNC-06 | Phase 8 | Pending |
| SYNC-07 | Phase 8 | Pending |
| SET-06 | Phase 8 | Pending |
| HELP-01 | Phase 9 | Pending |
| HELP-02 | Phase 9 | Pending |
| HELP-03 | Phase 9 | Pending |
| SET-05 | Phase 9 | Pending |
| REL-02 | Phase 9 | Pending |
| REL-03 | Phase 9 | Pending |
| REL-04 | Phase 9 | Pending |
| REL-05 | Phase 9 | Pending |

**Coverage:** v1 requirements: 90 total. Mapped to phases: 90 (100%). Unmapped: 0.

---
*Requirements defined: 2026-11-24*
