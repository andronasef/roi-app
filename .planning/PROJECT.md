# روعي (Ro'i)

## What This Is

Ro'i is a personal spiritual-companion mobile app (iOS + Android, Arabic-only, Egyptian Christian audience) that gathers a user's life with God in one place — His word, their identity in Him, and their prayer — and turns scattered mental notes into daily habits with follow-up. It has four core tools: **ليا أنا** (identity: weekly/monthly verse, names of God, blessings, favorites), **حفظ الآيات** (spaced-repetition verse memorization), **تشفع** (intercession tracking), and **دفتر الشكر** (daily gratitude line). User data is entirely local; a small backend serves shared public content and moderated suggestions.

Name carries two meanings: **راعِيّ** ("The Lord is my shepherd") and **رُوعي** (my needs are looked after and remembered). The app is not the shepherd; it reminds you that you are shepherded.

Tagline: «كلمتك، وهويتك، وصلاتك… في مكان واحد، وحد بيرعاك وإنت جواه.»

## Core Value

**It remembers for you.** A busy, forgetful, God-loving person opens the app and it tells them what's due today (verses to review, who to pray for, tonight's gratitude line) — without guilt, without hunting through notes.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Onboarding: 3 screens (what Ro'i is + 4 tools; name + gender for personalization; pick first verse/name with a clear "later" option) — first win in the first minute
- [ ] Home grid ("أدواتك"): tile per tool; user can show/hide/reorder; choices persisted locally; one-time intro message; nest rule — new things are screens inside existing tools, not new tiles
- [ ] Per-tool teaching layers: first-run one-line purpose + 3–4 step coach marks (once), teaching empty states, and a permanent (?) button in each tool's app bar opening a detailed help page with FAQ shortcuts
- [ ] **ليا أنا**: weekly verse (same for everyone that week, scheduled by admin), monthly verse, names of God (rich-text article cards), blessings (first-person title + rich text + supporting verse), favorites ⭐ (local), long-press copy to share outside the app, user-added personal items (local) with optional "suggest to everyone"
- [ ] **حفظ الآيات**: stats (due today, in memorization, memorized, streak), daily review session, search + filters, add own verse, per-verse modes — Anki-style self-rated card (ts-fsrs), record & listen (expo-audio), reveal challenge (25%/50%), first-letter / full-word recall with progress bar
- [ ] **تشفع**: prayer cards (text, person, since-when, pin, "صليت"), people grouping with active prayer counts, sort (random, most neglected, oldest, newest, alphabetical), search, "اتستجابت" answered archive with outcome + count, gratitude tie-in
- [ ] **دفتر الشكر**: one dated line per day, gentle nightly notification, month-end view of all lines
- [ ] Widgets: one per tool on iOS and Android (shape/content per agreed design, tap deep-links into the right screen)
- [ ] Settings: global (dark mode, language [Arabic only initially], rate app, request help, WhatsApp contact) plus per-tool settings — ليا أنا: weekly-verse notification day/time; حفظ: review reminder time + daily new-verse cap; تشفع: reminder time + default sort; دفتر الشكر: nightly notification time
- [ ] Local notifications (expo-notifications) for review, prayer, gratitude, weekly verse
- [ ] Personalization engine: public content stored as `text` / `textFemale` / `{الاسم}` token; app composes per user's name and gender (female version if present, else shared)
- [ ] Offline-first content: first launch fetches public content (verses, names of God, blessings) into on-device SQLite; incremental sync via `contentVersion`; ship a small bundled fallback so first launch offline still works
- [ ] Backend (NestJS + GraphQL code-first + SQLite/Drizzle): public content API, in-memory cache invalidated on admin change, user suggestions as `pending` submissions (anonymous device ID + rate limiting), deployed via Docker on Dokploy with persistent SQLite volume
- [ ] Admin panel (small web frontend on the same GraphQL): Google sign-in with allowlisted admin emails (multiple admins from day one); add/edit verses, names, blessings with "same text for male/female" switch, side-by-side male/female fields, name-chip insertion (atomic, draggable, never shows raw token), live preview with test name + gender toggle; review/edit/accept/reject suggestions; schedule weekly/monthly verses; shared zod validation (both fields required when switch off; reject any token other than `{الاسم}`; warn if only one version has the name)
- [ ] One-time import of initial public content from the existing Sanity project into the new backend; further content added manually through the admin panel
- [ ] Privacy: everything private by default; nothing leaves the device except explicit user action (copy/share, suggest-to-all); sensitive names may use pseudonyms; Firebase Crashlytics/Analytics limited to generic events (never prayer text, names, or verse content); privacy policy and store privacy disclosures
- [ ] Tone: encouraging not accusing; Scripture text in standard Arabic (فصحى) verbatim; UI and help copy in warm, short Egyptian Arabic; RTL throughout
- [ ] Publish to App Store and Google Play (v1 is done when it ships to the stores)

### Out of Scope

- Cloud backup / sync of personal user data — deferred (local-only in v1); revisit as "save a copy of your data" ☁️ since local data loss on device change is a known risk
- Languages other than Arabic — deferred
- Gamified challenges (7 days gratitude etc.) — later idea 🌱
- New top-level tools/tiles — new features must nest as screens inside the four existing tools
- Mandatory video tutorials — explanations are text and in-context
- User accounts/login for end users — anonymous device ID only; admin Google login is for admins only

## Context

- Audience: Egyptian Arab Christians (church-going), not a specific denomination; names of God / blessings content is natural Arab-Christian content, no special framing. Users are busy, forgetful, warm toward God, put off by heavy formal-Arabic apps or ones that make them feel like failures.
- Five principles every screen must pass: personal, simple (one clear action), remembers for you, documents the journey, explains itself.
- Daily loop: morning widget → ليا أنا weekly verse → verse review session → "most neglected" person in تشفع → "صليت"; night: one gratitude line; weekly new verse + neglect review; monthly verse + full gratitude view.
- Verse text translation/copyright: owner states no copyright concern; not a blocker.
- Existing public content lives in Sanity; migrating it into the new backend is part of v1 (one-time import).
- Data sensitivity is high (people's names + personal prayer requests + user voice recordings), all stored locally on device.

## Constraints

- **Tech stack (mobile)**: Expo + expo-router, development build (not Expo Go, needed for Firebase); Drizzle + expo-sqlite; react-native-mmkv; NativeWind + React Native Reusables; Zustand; TanStack Query + graphql-request + GraphQL Codegen; react-hook-form + zod; expo-notifications (local); expo-audio; ts-fsrs; i18next + expo-localization (RTL); FlashList; Reanimated + Gesture Handler; safe-area-context + keyboard-controller; @react-native-firebase crashlytics + analytics; RNRepo (optional, beta) — chosen to match owner's stack and offline-first design
- **Tech stack (backend)**: NestJS + @nestjs/graphql code-first, SQLite + Drizzle (same ORM as mobile), in-memory public content cache keyed by `contentVersion`, Docker on Dokploy with persistent volume
- **Privacy**: all personal data local; no network egress of personal content except explicit actions — the data is among the most sensitive kinds
- **Platforms**: iOS and Android both required in v1, including widgets (native work needed)
- **Language**: Arabic only; RTL
- **Distribution**: App Store + Google Play review compliance (privacy policy, disclosures)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Exactly four core tools; everything else nests as screens inside them | Keeps the app simple and explainable; each tool answers a distinct question | — Pending |
| Four-layer explanation (onboarding → home message → first-run coach marks → persistent (?) help) | No screen should leave the user lost | — Pending |
| Local-first: all user data on device; backend only serves public content + suggestions | Highly sensitive data; offline use | — Pending |
| Backend + admin panel in v1 (full scope), multiple admins | Owner wants content and moderation managed from day one | — Pending |
| Widgets in v1 | Strongest retention mechanism; part of "present in your day" promise | — Pending |
| Initial content imported once from Sanity, then managed via admin panel | Reuse existing content without keeping Sanity | — Pending |
| Name/gender personalization via `text`/`textFemale`/`{الاسم}` with chip editor | Impossible to write the token wrong; one logic for admin and user-added content | — Pending |
| Reanimated + Gesture Handler instead of React Native Ease | Ease lacks gesture support | — Pending |
| Ship small bundled content fallback for first offline launch | Onboarding step 3 needs content before first sync | — Pending |
| "Most neglected" prayer sort as the key differentiator | Turns prayer from mood into fairness | — Pending |
| v1 = published on both stores | Owner's definition of done | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-11-24 after initialization*
