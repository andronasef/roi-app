# Feature Research

**Domain:** Arabic-only Christian devotional companion (Scripture memorization + intercessory prayer list + gratitude journal + identity verses), local-first, iOS + Android, with widgets
**Researched:** 2026-11-24
**Confidence:** MEDIUM (competitor facts come from App Store listings and vendor pages, which are self-reported. SRS and streak-design conclusions are HIGH, from Anki/FSRS docs and several independent design write-ups. Arabic/Egyptian-user expectations are MEDIUM, inferred from Arabic Bible and Agpeya app listings, because no user research on this exact audience was found.)

## How to read this

PROJECT.md already specifies most of the right features. This file does three things:

1. Classifies each planned feature as table stakes, differentiator, or anti-feature, with complexity.
2. Lists **gaps**: things the domain treats as table stakes that PROJECT.md does not yet mention (marked **GAP**).
3. Gives dependencies and an MVP cut for roadmap ordering.

Complexity: LOW is under about 1 day, MEDIUM is about 1-4 days, HIGH is a week or more or has native or platform risk.

## Competitive landscape (what exists)

| Product | Category | What it does | What it does not do |
|---------|----------|--------------|---------------------|
| Remember Me (Poimena, free, open source) | Verse memorization | Flashcards, first-letter, typing, fill-in-blank, audio recording, 48 languages | Its own listing and its comparison page disagree on whether it has a true SRS algorithm (verify before copying its claims). No prayer or gratitude. Not Arabic-first |
| Fighter Verses (paid ~$5 plus packs) | Verse memorization | 1000+ preloaded verses, fixed review tiers (daily, weekly, monthly, biannual) | No adaptive scheduling. Dated UX. iCloud-only sync reported by a competitor |
| The Bible Memory App (Millennial Apps) | Verse memorization | Spaced repetition, speech recognition, groups (9,000+), audio recorder, custom review schedules behind PRO | Social and paywall heavy. Not Arabic |
| Verses | Verse memorization | Progress rings, clean UI | Prayer and gratitude absent |
| PrayerMate | Prayer list | Lists, categories, cycling through items, reminders, feeds from organizations, answered-prayer threading, share groups | Reviewers report occasional crashes and flaky groups. No "neglect" signal. Not Arabic |
| Echo Prayer | Prayer list | Lists, reminders, private group sharing, optional premium | Smaller user base than PrayerMate |
| Prayer journal apps (Prayer Tracker, My Prayer Room, PrayerList Pro, Answered List, Pray 4 Today) | Prayer list | Mark prayed, count per card, streak, answered history, shuffle, random "Focus Today" set, anniversary reminder one year after an answer (Answered List) | **None found surfaces "least recently prayed" prayers.** Random/shuffle exists, neglect-aware ordering does not (MEDIUM, from a thin search) |
| YouVersion | Bible reader plus VOTD | Verse of the Day, plans, audio, streaks widget, social | Not a memorization or intercession tool. Huge. Ro'i must not compete as a reader |
| Arabic Bible apps (ArabBible, Nafoora, "Arabic Bible", Arabic-English Audio Bible) | Arabic Scripture reading | Full Bible text, side-by-side translations, search, audio, font size, VOTD, offline dictionary | No memorization, prayer tracking, or personal layer. Reviews ask for background audio and cleaner indexes |
| Coptic/Agpeya apps (Agpeya, Coptic Agpeya, COAST Agpeya "spiritual tracker", Coptic Prayers) | Liturgical prayer | Agpeya text in Arabic/English/Coptic, Arabic audio that plays with the screen locked, up to 7 hour reminders, streaks and progress tracking, font and reading-mode customization, offline | Liturgical, not personal. Nothing for identity, memorization, or intercession |

**Key market read (MEDIUM):** Three separate categories exist (memorize, intercede, read/pray liturgy). No Arabic-first product combines memorization with an intercession list and a "remembers for you" daily loop. Egyptian users already expect offline use, Arabic audio, adjustable fonts, and reminders from Agpeya/Bible apps. The unmet need is personal and daily, not "more content".

## Feature Landscape

### Table Stakes (Users Expect These)

Missing any of these makes the product feel broken or untrustworthy.

#### Cross-cutting

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Full RTL layout, correct Arabic shaping and mixed-direction handling | Every Arabic app has it. Mirrored icons and chevrons, correct text alignment, numerals in RTL runs | MEDIUM | Already planned. Test mixed content (Latin names, digits, `{الاسم}` composed text) and bidi punctuation |
| Readable Arabic typography with adjustable font size | Nafoora and other Arabic Bible apps ship font-size settings. Older users read Scripture daily | LOW | **GAP**: add font-size setting (at least app-wide plus verse text). Pick one good Arabic font and bundle it |
| Verse text with tashkeel (diacritics) shown correctly, and optional hide/show | Scripture in فصحى is often fully vowelled. Rendering that clips diacritics looks careless | LOW-MEDIUM | **GAP**: needs a font with correct stacking. Decide the content standard in the admin panel |
| Diacritic- and letter-variant-insensitive search | Users type "الرب" and expect to find "اَلرَّبُّ". Alef/hamza forms, ya/alef-maqsura, ta-marbuta/ha. Without normalization, search "doesn't work" | MEDIUM | **GAP**: store a normalized search column alongside display text (client SQLite). Applies to verse search, prayer search, name search |
| Offline use after first sync | Agpeya apps highlight offline as a core benefit | MEDIUM | Already planned. The first-launch-requires-internet decision is a deliberate friction point, so the offline screen must be friendly with retry |
| Local reminders at user-chosen times, per tool | Agpeya apps offer up to seven reminders. Every prayer app has them | MEDIUM | Already planned. Needs a permission-ask moment tied to value (see Onboarding) |
| Dark mode | Baseline expectation. Night gratitude and prayer use cases | LOW | Already planned |
| Backup and restore of personal data | Losing years of prayers and gratitude lines on a phone change is the worst failure | HIGH | Already planned via Drive `drive.appdata`. Also see **GAP**: manual export (file or text) as an escape hatch independent of Google |
| Privacy by default plus visible reassurance | Names and prayer requests are the most sensitive data a user has | LOW | Already a principle. Surface it in onboarding and Settings in one plain sentence |
| Help / explanation always reachable | Faith-app users are not necessarily tech-savvy | LOW | Already planned as 4-layer teaching |
| Home-screen widget(s) | VOTD widgets are everywhere (many standalone apps exist for only that). YouVersion ships a streaks widget | HIGH | Already planned, native work on both platforms. Deep link into the right screen |

#### حفظ الآيات (memorization)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Add own verse plus a curated pool to start from | Every memory app has preloaded verses (Fighter Verses 1000+) and custom add | LOW-MEDIUM | Already planned. Pool comes from the Sanity import |
| Verse-by-verse card with reference and text, reveal/hide | Core flashcard interaction | LOW | Already planned |
| Multiple recall modes: first-letter, fill-in/full-word, reveal 25/50% | Remember Me ships first-letter, typing, fill-in-blank. Users expect more than one way | MEDIUM-HIGH | Already planned. **Arabic risk**: "first letter" with tashkeel, hamza carriers, and lam-alef ligature. Tokenize on normalized text, display original |
| Self-rated spaced repetition (Again/Hard/Good/Easy) | Anki-style is the accepted standard for serious memorizers | MEDIUM | ts-fsrs. See "SRS UX decisions" below |
| Due-today count and a daily session | The "what do I do now" answer. Core to the "remembers for you" value | LOW-MEDIUM | Already planned |
| Progress stats: due, learning, memorized, streak | Verses uses rings, others use counts. Users need to see progress | LOW | Already planned. See streak guidance |
| Audio recording and playback of your own voice | Remember Me and Bible Memory App (PRO) both ship it | MEDIUM | Already planned (expo-audio). Recordings are sensitive and go to Drive. **GAP**: playback should work with screen locked/background and respect silent mode sensibly |
| Daily new-verse cap | Prevents overload, which causes quits | LOW | Already planned |

#### تشفع (intercession)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Prayer cards tied to a person, with date started | Basic data model of every prayer-list app | LOW | Already planned |
| "Mark as prayed" with count/last-prayed | My Prayer Room shows the count per card. PrayerList Pro marks prayed | LOW | Already planned ("صليت") |
| Group by person/category with search | PrayerMate and Echo group into lists | LOW-MEDIUM | Already planned |
| Answered prayers archive | Nearly every prayer journal has "answered". It is the emotional payoff | LOW-MEDIUM | Already planned with outcome note and count |
| Edit, pin, and delete | Basics | LOW | Pin is planned. **GAP**: pause/"rest" a card (stop surfacing without marking answered) and undo delete |
| Shuffle/random order | Shuffle and random "focus" sets exist in competitors | LOW | Already planned as a sort mode |
| Reminder to pray | Standard | LOW | Already planned |

#### دفتر الشكر (gratitude)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| One short entry per day, dated | The category premise | LOW | Already planned |
| Gentle evening reminder | Gratitude journals live and die on the nightly nudge | LOW | Already planned |
| Browse past entries (month view) | The "documents the journey" payoff | LOW | Already planned |
| Edit today's entry / add a late entry for yesterday | Users forget and want to backfill without guilt | LOW | **GAP**: allow backfill for a recent day (the planned "one line per day" rule should not block it) |

#### ليا أنا (identity)

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Verse of the week/month, stable once shown | VOTD is the most universal Scripture-app feature | MEDIUM | Already planned. Deterministic seed plus a local "already received" ledger |
| Favorites | Standard | LOW | Already planned |
| Copy/share text with reference | WhatsApp sharing is how Arabic Christian content spreads | LOW | Already planned (long-press copy). **GAP**: always append the reference. Consider "share as image" (see differentiators) |

#### Onboarding / first run

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Short onboarding ending in a first win | Faith apps (Hallow, Abide, YouVersion, and similar) lead with a calming first action. Retention is decided on day 1. Note: I could not retrieve their onboarding specifics, so this is general app-onboarding guidance, not a verified teardown | LOW-MEDIUM | Already planned (3 screens) |
| Ask permissions in context, not at launch | Standard mobile practice. A notification ask before any value is shown is mostly declined | LOW | See Onboarding notes below |

### Differentiators (Competitive Advantage)

These align with the Core Value ("it remembers for you, without guilt").

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **"Most neglected" prayer sort and daily surfacing** | Turns prayer from mood into fairness. **No competitor found with least-recently-prayed ordering**; the closest are random shuffle and a count per card | MEDIUM | Needs `lastPrayedAt` plus `prayCount` per card. Make it the default sort and the widget's feed. Keep the framing warm: "من فاضل نصلي له" rather than "you neglected X". See neglect design notes below |
| **One "today" view across all four tools** | The "tell me what's due" promise. Competitors are single-purpose | MEDIUM | **GAP** vs PROJECT.md, which has a home grid of tools but no unified "اليوم" summary. Recommend a thin top card or line on Home ("٣ آيات للمراجعة، ٢ للصلاة، دفتر الشكر الليلة"), not a new tile (nest rule) |
| Gender- and name-aware personalized content (`text` / `textFemale` / `{الاسم}`) | Arabic is gendered. Most apps address everyone in masculine. Speaking to her as "she" is a real felt difference | MEDIUM | Already planned. Strong Arabic-specific differentiator. UI strings also need a gender switch (verbs and pronouns) |
| Per-user verse assignment, stable and non-repeating | Each person's verse feels personal rather than the same VOTD as everyone | MEDIUM | Already planned. Cheap, high emotional value |
| Names of God and blessings as first-person identity content | Fills the "who I am in Him" gap that reader apps and memorizers both skip. Culturally native | LOW-MEDIUM | Content-heavy, not engineering-heavy. Content quality is the moat |
| FSRS (not fixed tiers) with a guilt-free review queue | Fighter Verses uses fixed tiers. Most free apps have weak or unclear SRS. A proper adaptive scheduler plus a capped, forgiving queue is rare in a faith app | MEDIUM | See SRS UX decisions |
| Answered-prayer archive linked to gratitude | Turns an answer into a gratitude entry in one tap. Rare. Competitors treat them as separate | LOW-MEDIUM | Already planned as "gratitude tie-in" |
| One-tap "صليت" from widget and notification | Lowers the cost of the core action. Tapping the widget goes straight to the neglected person | MEDIUM-HIGH | Interactive widget actions are limited. iOS 17+ App Intents work, Android widgets can take actions. At minimum, a deep link to the card |
| Share verse as a designed image card (WhatsApp/Instagram story ready) | Arab Christian content travels through WhatsApp images. Zero competitor friction | MEDIUM | **GAP / P2.** Just render a styled view to PNG with the system share sheet |
| Teaching layers (first-run line, coach marks, empty states, permanent "?") | Competitors often under-explain (a Fighter Verses reviewer wanted a simpler explanation of its review system) | MEDIUM | Already planned. Strong for a non-tech audience |
| Moderated "suggest to everyone" for personal items | Content grows from the community without exposing private data | MEDIUM | Already planned. Keep it explicit opt-in per item |
| Zero accounts, private by default, user-owned Drive backup | Trust. Competitors often require sign-in and cloud accounts | HIGH | Already the architecture. State it clearly in marketing and onboarding |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Streak that resets to zero with loss-aversion pressure (red flames, "you lost your 40-day streak") | Streaks are the default habit-app lever | Research and practitioner write-ups consistently report guilt-driven use that ends in abandonment (a user describes quitting at day 40 after pure guilt). Contradicts "encouraging not accusing" and the five principles | Show cumulative totals ("٤٢ يوم شكر") and a soft "current run" that never says "lost". Missing a day shows nothing or a welcome-back line. Optional silent grace (a missed day does not break the run). Celebrate returns |
| Streak freezes you buy or earn | Duolingo pattern | Critics call freezes a patch on a flawed mechanic, and they add economy and UI to maintain | Grace by design, no inventory to manage |
| Overdue review pile shown as a red "٢٣٠ متأخر" number | Anki users know it | The backlog count is the number-one quit trigger for SRS apps | Cap what is shown per session (for example 10-20 cards), reschedule the rest quietly, show "اكتفينا النهارده" when the session is done. Offer a "catch-up gently" button after a long absence |
| "You haven't prayed for X in N days" shaming alerts | Natural way to expose neglect | Turns the differentiator into the guilt the product promises not to create | Neutral invitation: "خلّينا نفتكر [اسم] النهارده". No day counts in notifications |
| Leaderboards, group challenges, social feeds, friend streaks | Bible Memory App has groups (9,000+) | Contradicts a private, personal tool. Heavy moderation burden. Out of scope per PROJECT.md | Share a verse as text or image. Nothing social inside the app |
| Full Bible reader | Users want to read near the verse | The Arabic Bible market is crowded (ArabBible, Nafoora, YouVersion). Huge scope, copyright and content burden, and it dilutes the four-tool focus | Tap a verse reference to open the user's installed Bible app via a link. Only the user's own verses live in Ro'i |
| Agpeya, hymns, liturgical content | Natural neighbor for an Egyptian Christian audience | Denomination-specific, large, already well served by several apps, and PROJECT.md says "not a specific denomination" | Link out. Revisit only with real demand |
| AI features (chat with scripture, AI-written prayers, AI verse picks) | Trendy in faith apps | Prayer content is deeply personal and the app has a "nothing leaves the device" promise. Risk of theological error and Arabic-quality problems | None. Names/blessings content is curated by humans |
| Sending prayer or journal text to analytics | Product insight | Violates the privacy principle and store disclosures | Generic events only (already decided) |
| Adding new top-level tiles for each new idea | Easy to bolt on | Breaks the "four tools" rule and the explainability principle | Nest new things as screens inside an existing tool (already decided) |
| End-user accounts and login | Sync and cross-device | Collects identity for no benefit, adds support and privacy burden | Anonymous device ID plus the user's own Google Drive |
| Gamified XP, levels, badges, coins | Engagement | Wrong tone for devotion, trivializes the practice | Quiet milestones: "حفظت ١٠ آيات"; first answered prayer is acknowledged warmly |
| Showing prayer text or full names in widgets and notifications by default | Convenience | Lock-screen and shared-phone exposure of sensitive content | Default to pseudonym/first name only. Setting to hide entirely. Never put request text on the lock screen |
| Ads or paywalled core features | Monetization | Not in scope. Remember Me being free and open source sets the user's price expectation | v1 is free. Revisit later if ever needed |

## Design notes for the hard parts

### SRS UX decisions (HIGH confidence on the algorithm side)

- **Use four buttons, Again / Hard / Good / Easy, in warm Egyptian Arabic** (for example: "نسيتها" / "بصعوبة" / "افتكرتها" / "سهلة"). Anki and FSRS docs treat Good as the normal success, Again as the only right answer for a forgotten card, and warn that pressing Hard on a forgotten card inflates intervals. Teach this in one line in the first-run coach mark: "لو نسيتها، اختار نسيتها".
- **Do not show interval previews on buttons by default.** FSRS guidance is to rate on recall difficulty, not on the wait you want. Previews tempt users to game the buttons. Optionally show it in the help page.
- **Cap the daily load.** FSRS is adaptive, so after missed days it can be rescheduled without punishment. Surface a bounded session, not a raw backlog. Existing "daily new-verse cap" covers new cards. **GAP**: also a review cap or "short session" mode.
- **Decide the meaning of "memorized"** up front (for example, stability beyond some threshold such as 21+ days, or a count of successful Good/Easy reviews). The stats screen depends on it.
- **Verses are not generic flashcards.** A verse is long and is memorized as a whole. Recall modes (first letters, partial reveal, full-word) are scaffolding that happens before or alongside the SRS rating, not replacements. The SRS rating should come after the user attempts recall in the chosen mode.
- **Verse lifecycle states** (new, learning, review, memorized, suspended) and a manual "suspend this verse" are table stakes for people who add the wrong verse. **GAP**.
- **Undo last rating** is a small, high-value escape hatch. **GAP**, LOW.
- **Do not rely on an on-device parameter optimizer.** Default FSRS parameters are fine for v1. Revisit only if reviews show mis-scheduling.

### Prayer fairness and neglect design

- The fairness unit is `lastPrayedAt` per card (and optionally per person). "Most neglected" = oldest `lastPrayedAt`, with never-prayed cards ranked appropriately (new cards should not all jump above everything forever).
- A **daily focus set** (a small bounded list, for example 3-5 cards) is what the widget and notification show. This is more usable than a long list and removes the decision. Pinned cards always appear.
- **Random** sort should be weighted toward neglected cards, not uniform, so it also feels fair. Uniform random is what competitors have.
- Counts should be per card and visible, since My Prayer Room shows this and it lets people see their faithfulness, not their lapses.
- **Answered archive**: outcome note, date answered, total prayers counted, one-tap "thank God" that creates a gratitude entry. An anniversary reminder a year after an answer is a cheap, beloved touch (Answered List does it). P2.
- **Partially answered / ongoing / "no, but" outcomes** are real in prayer life. Keep the outcome as free text rather than a rigid enum.
- **Pause/rest** a card so a long-running request does not dominate "neglect". **GAP**.
- Cards about people are about third parties. Pseudonyms are already allowed. Never include request text in notification or widget bodies by default.

### Streaks without guilt

- Count **days with practice** (cumulative) as the headline number. It only goes up.
- A "current run" is secondary and forgiving: a missed day is a pause, not a reset (a grace rule, no inventory).
- Missed-day copy is always an invitation. Never mention the miss in notifications.
- Streaks apply per tool where they make sense (gratitude days, review days). Do not build one combined streak that couples unrelated tools.
- Optional: a setting to hide streaks entirely (SoftHabits and Polar Habits show an audience that wants this).

### Widgets (HIGH complexity, native work)

- One per tool is planned. Suggested content: ليا أنا shows the current verse. حفظ shows a due count plus tap to review. تشفع shows today's focus person (name only). دفتر الشكر shows tonight's prompt or a past line.
- Widget data should be written by the app to a shared container (App Group on iOS, shared storage or DataStore on Android) so the widget never touches the main SQLite directly.
- Widgets cannot be pushed on demand. They refresh on a timeline, so design content that is valid for hours (verse of the week, today's focus list chosen once per day).
- Privacy defaults per above.
- Prompt the user to add a widget **after** they have their first verse, not during the first minute.

### Onboarding

- Three screens plus a first win, as planned. The first win should be seeing "your verse" and receiving a first verse to learn, within about a minute.
- **Notification permission**: ask after the first win ("remind me tonight for my gratitude line?"), not on launch.
- **Drive sign-in is currently planned for first launch.** It competes with the first-minute win and adds a Google permission screen before the user has any data to protect. Recommendation: offer it right after the first meaningful data exists (first verse added or first gratitude entry) or on day 2, and keep it re-offerable from Settings. This preserves the PROJECT.md intent (skippable, explained) and moves only the timing. Flag this decision for the owner.
- **First launch requires internet.** An offline first launch should show the friendly retry screen. Also make the content download show clear progress and be resumable, since this is the first thing a new user experiences.

### Arabic / RTL / Egyptian specifics

- **Numerals**: decide Arabic-Indic (٠١٢) versus Western digits once and apply everywhere. Egyptian users commonly see both. Make verse chapter:verse formatting consistent in RTL runs.
- **Scripture vs UI language**: Scripture in فصحى verbatim, UI in Egyptian colloquial. Fonts must handle both and tashkeel.
- **Gendered UI strings**: not just content. Buttons and system messages ("صليت", "افتكرتها") need masculine/feminine variants where the verb form changes. The personalization engine should cover UI strings too.
- **Weekly rhythm**: Sunday is the natural default day for the weekly verse for an Egyptian church audience. Reminder defaults should respect that Friday and Sunday are church-related for many users, and allow edits.
- **Search normalization** as above.
- **Audio**: Arabic apps get repeated requests for background audio when the phone locks. If the app plays the user's recordings, support background and lock-screen playback.
- **Share to WhatsApp** is the primary share target. Test text with RTL plus references renders correctly in WhatsApp.

## Feature Dependencies

```
Public content sync (SQLite + contentVersion)
    └──requires──> Backend + admin panel (or at least a seeded import)
                       └──requires──> Sanity one-time import

Personalization engine (name + gender)
    └──requires──> Onboarding name/gender capture
    └──enhances──> ليا أنا, names of God, blessings, UI strings

Per-user verse assignment
    └──requires──> Content pool synced locally
    └──requires──> Stable per-user seed (device ID) + "already received" ledger

حفظ الآيات review session
    └──requires──> ts-fsrs scheduling state per verse (local SQLite)
    └──requires──> Verse pool OR "add own verse"
    └──enhances──> Daily "today" summary and due-count widget

Recall modes (first-letter, fill-in, reveal %)
    └──requires──> Arabic-aware tokenization (normalized text + tashkeel handling)

Audio recording
    └──requires──> Mic permission + local file storage
    └──enhances──> Drive sync (recordings are files)

تشفع neglect sort
    └──requires──> lastPrayedAt / prayCount per card ("صليت" action)
    └──enhances──> Daily focus set ──enhances──> Prayer widget + notification

Answered archive
    └──requires──> Prayer cards
    └──enhances──> Gratitude entry (tie-in)

Gratitude notebook
    └──requires──> Local notifications (nightly)

Widgets
    └──requires──> Shared data container written by the app
    └──requires──> Deep-link routing in expo-router
    └──requires──> Dev build with native modules (not Expo Go)

Notifications
    └──requires──> Notification permission (ask in context, after first win)

Drive sync
    └──requires──> Per-record updatedAt + tombstones on every user table (design from day 1)
    └──requires──> Google Sign-In (native config) + drive.appdata
    └──enhances──> Restore on new device

Today summary (unified)
    └──requires──> All four tools' "due" queries
    └──enhances──> Widgets and the notification content

Teaching layers
    └──requires──> Each tool's screens to exist (coach marks anchor to UI)

Streaks-as-guilt ──conflicts──> "Encouraging not accusing" tone principle
Social features ──conflicts──> Private local-first architecture
Full Bible reader ──conflicts──> Four-tool nesting rule and scope
```

### Dependency Notes

- **Sync fields must exist before data does.** Every user-owned table needs `updatedAt`, a stable id, and tombstone support from the first migration. Retrofitting after users have data is painful. This forces a schema decision in the earliest phase even though Drive sync ships later.
- **Neglect sort requires the "صليت" action.** The two features ship together or the sort has nothing to sort by.
- **Widgets depend on the data model and deep links being stable**, so they come after the four tools work in-app. Plan native widget work as its own phase, since it carries the most platform risk.
- **Personalization is a foundation.** If `{الاسم}` composition is not in place before content screens are built, every screen gets rewritten. Build the composer first.
- **Teaching layers depend on finished screens**, so coach marks go in as each tool finishes, with a final polish pass at the end.
- **Recall modes depend on Arabic tokenization**, which needs a normalized text pipeline shared with search. Build it once.

## MVP Definition

PROJECT.md defines v1 as shipped to both stores, so "MVP" here means the ordering inside v1, not cutting scope.

### Launch With (v1 core, build first)

- [ ] Content sync and personalization engine — foundation for everything
- [ ] Onboarding (3 screens) plus Home grid plus a unified "today" line — first win and the "remembers for you" promise
- [ ] ليا أنا: weekly verse, favorites, copy/share — cheapest visible value
- [ ] حفظ الآيات: FSRS review session, due-today, add own verse, two recall modes at minimum — the most complex tool, start early
- [ ] تشفع: cards, "صليت", people grouping, most-neglected sort, answered archive — the key differentiator
- [ ] دفتر الشكر: daily line, nightly reminder, month view — simplest tool, high retention value
- [ ] Local notifications per tool
- [ ] Settings, dark mode, font size
- [ ] Teaching layers — shipped per tool
- [ ] Privacy basics (no content in analytics, private widget defaults)

### Add Within v1 (before store submission)

- [ ] Widgets (iOS and Android) — native phase, the biggest schedule risk
- [ ] Google Drive sync plus restore — needs the sync-ready schema from day one
- [ ] Admin panel and moderation — can run in parallel with mobile work
- [ ] Remaining recall modes (reveal 25/50, full-word), audio recording
- [ ] Names of God, blessings, personal items, "suggest to all"

### Add After Validation (v1.x)

- [ ] Share verse as image card — if users share a lot as text
- [ ] Prayer anniversary reminder — after real answered-prayer data exists
- [ ] Weighted-random prayer focus tuning — once usage data shows how people use sorts
- [ ] App lock (biometric) — if users ask. Strong candidate given data sensitivity, so consider promoting it
- [ ] Manual export of data — low cost, promote if Drive sync proves flaky

### Future Consideration (v2+)

- [ ] Other languages — deferred per PROJECT.md
- [ ] iCloud or other sync providers — deferred
- [ ] Gamified challenges (the 7-day gratitude idea) — deferred. Must follow the guilt-free rules if ever added
- [ ] Link-out to a Bible reader app — only with demand

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Personalization engine (name/gender) | HIGH | MEDIUM | P1 |
| Content sync + offline | HIGH | MEDIUM | P1 |
| FSRS review session | HIGH | MEDIUM | P1 |
| Most-neglected sort + "صليت" | HIGH | MEDIUM | P1 |
| Answered-prayer archive | HIGH | LOW-MEDIUM | P1 |
| Gratitude daily line + nightly reminder | HIGH | LOW | P1 |
| Weekly/monthly verse (per-user) | HIGH | MEDIUM | P1 |
| Arabic search normalization | HIGH | MEDIUM | P1 |
| Font size + tashkeel-correct font | HIGH | LOW-MEDIUM | P1 |
| Local notifications | HIGH | MEDIUM | P1 |
| Teaching layers | MEDIUM-HIGH | MEDIUM | P1 |
| Unified "today" summary line | HIGH | LOW-MEDIUM | P1 |
| Widgets (iOS + Android) | HIGH | HIGH | P1 |
| Drive sync + restore | HIGH | HIGH | P1 |
| Admin panel + moderation | MEDIUM (indirect) | HIGH | P1 |
| Recall modes (first-letter, reveal, full-word) | MEDIUM-HIGH | MEDIUM-HIGH | P1 |
| Audio record/playback | MEDIUM | MEDIUM | P1 (per PROJECT.md) |
| Suspend verse, undo rating, pause prayer card | MEDIUM | LOW | P1 |
| Streak/progress display (guilt-free) | MEDIUM | LOW | P1 |
| Review session cap / catch-up mode | MEDIUM-HIGH | LOW-MEDIUM | P1 |
| Gratitude backfill for yesterday | MEDIUM | LOW | P2 |
| Share as image card | MEDIUM | MEDIUM | P2 |
| Prayer anniversary reminder | MEDIUM | LOW | P2 |
| App lock (biometric) | MEDIUM-HIGH | LOW-MEDIUM | P2 (consider P1) |
| Manual data export | MEDIUM | LOW | P2 |
| Widget quick actions ("صليت" in widget) | MEDIUM | HIGH | P3 |
| Hide-streaks setting | LOW-MEDIUM | LOW | P3 |

**Priority key:** P1 = needed for the v1 store release. P2 = add when possible. P3 = later.

## Competitor Feature Analysis

| Feature | Remember Me / Bible Memory App | PrayerMate / Echo / prayer journals | Arabic Bible & Agpeya apps | Our Approach |
|---------|--------------------------------|-------------------------------------|----------------------------|--------------|
| Scheduling | Fixed tiers (Fighter Verses) or unclear/PRO-gated SRS | Cycling or random shuffle | None | FSRS with a capped, forgiving queue |
| Recall modes | First-letter, typing, fill-in, audio, speech (varies) | n/a | n/a | First-letter, full-word, reveal %, own recording |
| Prayer fairness | n/a | Shuffle, count per card, no neglect ordering found | n/a | Most-neglected default plus a small daily focus set |
| Answered prayers | n/a | History, threading, anniversary (Answered List) | n/a | Archive with outcome, count, and gratitude tie-in |
| Gratitude | n/a | n/a | Some "spiritual trackers" (COAST) log activities | One line per day, nightly nudge, month view |
| Streaks | Rings/counts | Streak in PrayerList Pro | Streaks and 7 reminders in Agpeya apps | Cumulative days; forgiving run; never a loss message |
| Reminders | Basic | Alarm-style reminders (a reviewer's top feature) | Up to 7 per day | One per tool, user-set time |
| Widgets | Rare | Not found | Not found | One per tool, deep-linked, privacy-safe defaults |
| Sync/backup | iCloud-only or account-based | Accounts, share groups | Local | User's own Google Drive appdata; no accounts |
| Arabic/RTL/gender | Not Arabic-first | Not Arabic | Arabic text, little gender awareness | Native RTL, gendered content and UI, Egyptian tone |
| Social | Groups (Bible Memory App), share groups (PrayerMate) | Share groups, group prayer | None | Deliberately none |
| Sharing | Varies | Email/message people from app | Share text | Copy/share text now; image card later |

## Gaps in PROJECT.md found by this research

For the requirements author. Each is small, but several touch the data model, so they are cheaper now.

1. **Sync-ready schema** (`updatedAt`, tombstones, stable ids) from the first migration, even though Drive sync ships later.
2. **Unified "today" summary** on Home (not a new tile).
3. **Arabic search normalization** and normalized text column; needed by search, recall modes, and tokenization.
4. **Font size setting** and a tashkeel-correct bundled font.
5. **Verse suspend, undo last rating, review session cap or catch-up mode**, and a defined meaning of "memorized".
6. **Prayer card pause/rest** and weighted-random sort.
7. **Gratitude backfill** for a missed recent day.
8. **Widget and notification privacy defaults** for prayer content; **app lock** as a P2 candidate.
9. **Manual export** as a backup escape hatch independent of Google.
10. **Gendered UI strings**, not only gendered content.
11. **Timing of the Drive sign-in prompt**: move after the first win, not at first launch.
12. **Background/lock-screen playback** for recorded audio.
13. **Define what "streak" means per tool** and write the forgiving rule into requirements so it is not decided ad hoc during implementation.

## Sources

- [Fighter Verses (App Store)](https://apps.apple.com/us/app/fighter-verses/id411711646) — MEDIUM (vendor listing)
- [Remember Me vs. Other Bible Memory Apps](https://www.remem.me/compare) — MEDIUM, vendor self-comparison; conflicts with its own listing on SRS
- [Remember Me / Bible Memory (App Store)](https://apps.apple.com/us/app/id1600128209) — MEDIUM
- [The Bible Memory App (App Store)](https://apps.apple.com/us/app/id496790833) — MEDIUM
- [PrayerMate (App Store)](https://apps.apple.com/us/app/-/id434815549) — MEDIUM
- [App Review: PrayerMate](https://thathappycertainty.com/app-review-prayermate) — MEDIUM (single reviewer)
- [Answered List (App Store)](https://apps.apple.com/us/app/id6761426687) — MEDIUM (anniversary reminder)
- [Prayer Tracker (App Store)](https://apps.apple.com/app/id6760599830) and [My Prayer Room (App Store)](https://apps.apple.com/us/app/-/id6465793069) — MEDIUM (random Focus Today, shuffle, count per card)
- [PrayerList Pro (App Store)](https://apps.apple.com/bb/app/prayerlist-pro/id6758590684) — MEDIUM
- [ArabBible (App Store)](https://apps.apple.com/us/app/arabbible/id532352819), [Nafoora](https://apps.apple.com/se/app/nafoora/id6444741273), [Arabic English Audio Bible](https://apps.apple.com/us/app/id756603898) — MEDIUM (Arabic Bible feature set and reviews)
- [Agpeya (App Store)](https://apps.apple.com/app/id629345116), [Coptic Agpeya](https://apps.apple.com/us/app/coptic-agpeya/id1536308081), [COAST Agpeya](https://apps.apple.com/us/app/id6754831062) — MEDIUM (Egyptian-audience expectations: offline, Arabic audio, reminders, tracking)
- [Anki deck options / FSRS docs](https://docs.ankiweb.net/deck-options.html) and [Anki FSRS FAQ](https://faqs.ankiweb.net/what-spaced-repetition-algorithm) — HIGH (button semantics, Hard misuse)
- [Anki forum: Desired Retention UI](https://forums.ankiweb.net/t/desired-retention-ui-overhaul/57678?page=4) — LOW-MEDIUM (proposal thread)
- [Smashing Magazine: Designing a Streak System](https://smashingmagazine.com/2026/02/designing-streak-system-ux-psychology/), [Recovery-first streak design (Yu-kai Chou)](https://yukaichou.com/gamification-analysis/recovery-first-streak-design/), [Mobbin: study of 859 streak designs](https://mobbin.com/blog/streaks-are-about-losing-a-study-of-859-streak-designs) — MEDIUM (practitioner analysis, not controlled studies)
- [Bible widget apps (App Store listings)](https://apps.apple.com/app/id6747867741) — LOW-MEDIUM (shows VOTD widget ubiquity; YouVersion's own widget behavior and Hallow/Abide/Pray.com onboarding were not verified)
- Project context: `/Users/andrew/Documents/Work/Dev/Projects/Personalss/روعي/.planning/PROJECT.md`

**Not verified (treat as LOW):** exact onboarding flows of Hallow, Abide, Pray.com, and YouVersion; real-world Egyptian user preferences for numerals and fonts; whether any competitor has quietly added least-recently-prayed ordering since the listings were published. Check store listings again at roadmap time.

---
*Feature research for: Arabic Christian devotional/memorization/intercession/gratitude app*
*Researched: 2026-11-24*
