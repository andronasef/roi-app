# Project Research Summary

**Project:** روعي (Ro'i), an Arabic/RTL Christian spiritual-companion app (Expo, iOS + Android) with a NestJS/GraphQL/SQLite backend and an admin web panel
**Domain:** Offline-first, local-first devotional app (verse memorization, intercessory prayer list, gratitude journal, identity verses), with widgets and optional Google Drive backup
**Researched:** 2026-11-24
**Confidence:** MEDIUM-HIGH. Versions and platform facts are verified. Several native-module combinations, widget RTL behavior and background Drive auth are unproven, so they sit behind a Phase 0 spike.

## Executive Summary

Ro'i is a private, account-less, offline-first mobile app with four tools: ليا أنا, حفظ الآيات, تشفع and دفتر الشكر. A thin content service (NestJS + GraphQL + SQLite) and a small admin SPA support it. The four research files agree on how to build it:
- All personal data lives in on-device SQLite behind repositories.
- Public content is a read-only mirror, delta-synced by one global monotonic version.
- Backup is record-level JSON in the user's own Drive `appDataFolder`.
- Widgets only render snapshots that the app pushes.
- Personalization (`{الاسم}`, gendered text) happens at render time through one shared pure function.

No competitor combines memorization, intercession and gratitude in Arabic. The differentiators are:
- "Most neglected" prayer ordering.
- FSRS with a capped, guilt-free queue.
- Gender- and name-aware Arabic content.

The owner's stack is valid and current. It uses **Expo SDK 58**, **NativeWind 4.2.7 + Tailwind 3.4.19**, **Drizzle 0.45.x stable** and **ts-fsrs 6**. Pin `graphql@^16.15` and `typescript@~6.0.3` in every workspace, because the npm `latest` tags break peer ranges. The three undecided pieces are resolved as follows:
- **Widgets:** `expo-widgets` on iOS and `react-native-android-widget` on Android.
- **Drive:** `@react-native-google-signin` plus a hand-rolled Drive `fetch` client.
- **Admin editor:** Tiptap 3 with a name-chip node, stored as a Markdown subset.
- **Backend:** NestJS 12, Apollo 5, graphql-armor, throttler and `google-auth-library`.

The main risks are structural, not feature-level:
1. Sync-readiness (UUIDs, `updatedAt`, tombstones) must exist in migration 0001, even though Drive ships late.
2. The native stack has never been proven together: RNFB 27, Google Sign-In SPM, MMKV/Nitro, two widget systems and the Reanimated pins.
3. RTL, bidi, tashkeel and Arabic search normalization are infrastructure, not polish.
4. First launch needs internet, so backend uptime and content import are release dependencies and a store-rejection risk.
5. Privacy promises must be enforced in code.

Mitigate these with a heavy Phase 1 that includes a kitchen-sink device spike and a shared-package foundation. Start the Play 12-tester, 14-day clock around the memorization phase.

## Key Findings

### Recommended Stack
Expo SDK 58 (RN 0.88, React 19.3, New Architecture only) in a monorepo with `packages/shared`. Install Expo-tracked packages only with `npx expo install`. The Reanimated 4.7.1 + worklets 0.13.0 pair is hard-locked.

**Core technologies:**
- **Expo SDK 58, expo-router, expo-dev-client:** platform, navigation and deep links. A dev build is required because every integration is native.
- **expo-sqlite + Drizzle 0.45.4:** on-device DB. The backend uses the same ORM with better-sqlite3 in WAL mode. Avoid the 1.0 RC because device migrations are irreversible.
- **ts-fsrs 6.0.1:** new async `DefaultScheduler` API. Persist the card as JSON plus a `fsrsModel` column. Fallback is 5.4.2.
- **NativeWind 4.2.7 + Tailwind 3.4.19 + React Native Reusables:** fallback is Uniwind 1.14. Admin uses Tailwind 4, so keep the workspaces separate.
- **TanStack Query, Zustand, MMKV 4:** Query for repo reads and network, Zustand for ephemeral UI, MMKV for device flags.
- **expo-widgets (iOS) and react-native-android-widget 0.26 (Android):** the iOS widget gets props pushed from the app. The Android handler can read the DB headlessly. The iOS fallback is `@bacons/apple-targets`.
- **@react-native-google-signin 17 + Drive REST wrapper:** `drive.appdata` scope only, with no `offlineAccess`.
- **React Native Firebase 27 (analytics, crashlytics):** needs `useFrameworks: "dynamic"`, Xcode 26.2+, and SPM mode for Google Sign-In.
- **expo-localization `forcesRTL: true`:** required. `supportsRTL` alone follows the phone language.
- **expo-notifications, expo-audio, expo-background-task:** do not use expo-av or expo-background-fetch.
- **Backend:** NestJS 12.6, @nestjs/graphql and @nestjs/apollo 14.2.1, @apollo/server 5.5.2, graphql-armor, throttler 6.8, helmet, and a hand-written zod pipe. Avoid nestjs-zod, which does not declare Nest 12.
- **Admin:** Vite 8, React 19, Tiptap 3.35, @react-oauth/google, google-auth-library 11, and an in-memory bearer JWT.

### Expected Features
**Must have (table stakes):**
- Full RTL, a tashkeel-correct bundled font, adjustable font size, and dark mode.
- Diacritic- and variant-insensitive Arabic search.
- Offline use after first sync, plus local reminders per tool.
- Memorization: add own verse plus a pool, reveal/hide cards, several recall modes, four-button FSRS rating, a due-today session, a daily cap and audio recording.
- Intercession: cards, "صليت", people grouping, an answered archive, pin and shuffle.
- Gratitude: one line per day, a nightly reminder and a month view.
- Identity: a weekly/monthly verse that stays fixed once shown, favorites, and copy/share with the reference.
- Drive backup/restore, a manual export escape hatch, and widgets.

**Should have (differentiators):**
- "Most neglected" prayer ordering with a small daily focus set. No competitor was found with this.
- FSRS with a capped, forgiving queue.
- Gender- and name-aware content, including gendered UI strings.
- Per-user non-repeating verse assignment.
- One unified "today" line on Home, not a new tile.
- Answered-prayer to gratitude tie-in.
- Teaching layers.
- Moderated "suggest to everyone".
- Privacy-safe widget defaults.

**Defer (v2+):**
- Share-as-image card, prayer anniversary reminder, widget quick actions and a hide-streaks setting.
- Biometric app lock. It is a strong v1.x candidate and may move into v1.
- Other languages, iCloud sync and gamified challenges.
- Never build: loss-aversion streaks, social features, a full Bible reader, Agpeya content, AI features, accounts, ads.

**Gaps in PROJECT.md to fold into requirements** (several touch the schema):
- A sync-ready schema.
- A unified "today" line.
- Search normalization.
- A font size setting.
- Suspend verse, undo rating, a review cap, and a definition of "memorized".
- Pause a prayer card.
- Gratitude backfill.
- A forgiving streak definition.
- Gendered UI strings.
- Widget and notification privacy defaults.
- Drive sign-in prompt after the first win.

### Architecture Approach
There are three deployables (mobile, API, admin) plus `packages/shared`. Shared holds the zod schemas, token rules, `personalize()`, `normalizeArabic()` and the period/seed functions. On mobile, routes stay thin, `features/*` own repositories and pure domain logic, and every user write goes through a repository **write funnel** (`afterWrite`). The funnel fans out to query invalidation, widget snapshot rebuild, notification reconcile, and a derived Drive-dirty state.

**Major components:**
1. **Repositories + pure domain:** the only door to user data. Covers personalize, assignment, the FSRS wrapper, prayer sort, period keys, the notification plan and the widget snapshot.
2. **Content mirror and sync client:** snapshot files over plain HTTP (pre-gzipped, immutable) and deltas over GraphQL `contentSync(since)`. Apply in one transaction and write `contentVersion` last.
3. **Drive sync engine:** a table registry and versioned record-level JSON. It follows pull, merge, push. Tombstones are kept indefinitely. Prayed and review events are append-only, and audio is synced as separate immutable files.
4. **Boot state machine:** migrate, ensure seed, content gate, onboarding, then non-blocking jobs. Deep links are held until ready.
5. **Widget bridge and notification planner:** pure snapshot and plan functions with idempotent reconcile.
6. **Backend ContentService + ContentCache:** one write transaction (row, version bump, audit), then a post-commit cache rebuild.
7. **Admin SPA:** a Tiptap chip editor sharing `personalize()` with the phone so the preview cannot drift.

### Critical Pitfalls
1. **Sync-readiness bolted on late.** Every user table gets a client UUID, `createdAt`, `updatedAt` and `deletedAt` in migration 0001. All deletes are soft. Counters are derived from event rows. Write and test a pure `merge()` in P0.
2. **Drive merge destroys data.** An empty device must never overwrite a backup. Always pull, merge, push. Check the remote revision before pushing, keep tombstones long, show a restore preview, and keep one previous revision.
3. **Native-config collisions and unproven background auth.** Run a kitchen-sink EAS dev and release build on real phones in P0. Make foreground sync the product and treat background sync as a bonus after a spike.
4. **RTL, bidi, tashkeel and normalization treated as polish.** Force RTL, lint out physical-direction classes, and add bidi isolate helpers and a torture-fixtures screen. Share one `normalizeArabic()` and `graphemes()`. Test on an English-language phone.
5. **Assignments and content edits that move under the user.** Persist assignments in a history table with a synced `userSeed`, and use local-date period keys. Soft-delete content with versioned tombstones, and copy verse text into the user's cards.
6. **First launch needs internet, so the backend is a release dependency.** Run an uptime monitor, a tested backup, a Dokploy volume and a single replica. Import production content before submission, write review notes, and start the Play 12-tester, 14-day clock early.
7. **Privacy promises not enforced in code.** Use a closed-enum analytics wrapper and `scrubError()`, and never call `setUserId`. Notifications and widgets carry generic copy by default, and Android `allowBackup` is set deliberately.

## Implications for Roadmap

### Phase 1: Foundation and Integration Spike (heavy by design)
**Rationale:** Everything expensive to retrofit lives here, and the spike turns the unproven native combinations into decisions before features depend on them.
**Delivers:**
- Monorepo and `packages/shared` (zod, token rules, `personalize()`, `normalizeArabic()`, `graphemes()`, period/day-boundary utilities, `merge()` with tests).
- Identity: bundle IDs, app group, OAuth clients and SHA-1s, privacy policy URL, and store accounts.
- Kitchen-sink EAS dev and release builds on a real iPhone and Android.
- RTL/i18n/theme/font infrastructure with a torture-fixtures screen.
- Sync-ready Drizzle schema with fixture-DB migration tests.
- The analytics wrapper.
- Privacy decisions (app lock, SQLCipher, blur).
**Avoids:** Pitfalls 1, 5, 6, 7, 13, 15, 20, 21.

### Phase 2: Backend Content Core and Sanity Import
**Rationale:** The mobile first-launch gate needs real content and a stable `schema.graphql`. This can run in parallel with mobile foundation work.
**Delivers:**
- Content version counter, ContentService, ContentCache, `contentSync` and the snapshot HTTP route.
- An idempotent Sanity import with a dry run and a token report.
- Hardening: throttler, armor, helmet, CORS, trust proxy, introspection off.
- Dokploy volume, a backup restore drill, and an uptime monitor.
**Avoids:** Pitfalls 8, 16, 17, 18, 19.

### Phase 3: Admin Panel and Moderation
**Rationale:** The owner needs it to author and fix content before launch.
**Delivers:**
- Google ID-token login with an allowlist, and an audit log.
- A Tiptap chip editor (male and female fields, drag, round-trip test) with a live preview through shared `personalize()`.
- A suggestions review queue.
**Avoids:** Pitfalls 18, 19.

### Phase 4: Mobile Shell, Content Sync and Personalization
**Rationale:** The boot machine, content gate and compose function underlie every tool.
**Delivers:**
- Boot machine, a transactional resumable first download, a friendly offline screen, and delta sync.
- Repositories and the `afterWrite` funnel, with TanStack `networkMode: 'always'` for repo reads.
- Onboarding, name/gender capture, personalization (including gendered UI strings), and the Home grid with the "today" line.
**Avoids:** Pitfalls 8, 9, 23, 24, 32.

### Phase 5: ليا أنا and دفتر الشكر
**Rationale:** Cheapest visible value. It exercises content, assignment and personalization end to end, and validates the funnel and notifications.
**Delivers:**
- Persisted seeded weekly/monthly assignment, favorites, and copy/share with the reference.
- Gratitude: daily line, backfill, month view and a nightly reminder.
- The notification planner (idempotent reconcile).
**Avoids:** Pitfalls 9, 12, 25, 33.

### Phase 6: تشفع (Intercession)
**Rationale:** The key differentiator. The event-row model must exist before widgets and Drive.
**Delivers:** Cards, "صليت" events, a derived neglect sort with a daily focus set, weighted-random sort, pause/rest, and an answered archive with the gratitude tie-in.
**Avoids:** counters under last-write-wins merge (Architecture pattern 3), and Pitfall 25.

### Phase 7: حفظ الآيات (Memorization)
**Rationale:** The largest tool. Start the Play 12-tester clock once a stable internal build exists after this phase.
**Delivers:**
- ts-fsrs session with `enable_short_term: false`, local-day rollover, a review cap and gentle catch-up.
- Suspend, undo, and a defined "memorized".
- Recall modes on Arabic graphemes.
- Audio recording with relative paths, AAC m4a, and interruption handling.
**Avoids:** Pitfalls 7, 10, 14, 25, 28.

### Phase 8: Names of God, Blessings, Personal Items, Suggestions
**Rationale:** Content-heavy rather than engineering-heavy. It needs a stable admin and rich-text renderer.
**Delivers:** Rich-text rendering, personal items, and opt-in "suggest to everyone" with dedup and throttling.
**Avoids:** Pitfalls 18, 33.

### Phase 9: Widgets (both platforms)
**Rationale:** Needs stable data models and deep-link routes. Native risk is highest here, so it gets its own phase.
**Delivers:** Four widgets per platform. The app pushes snapshots on write, foreground and background. Defaults are privacy-safe (counts and neutral copy, names opt-in), copy tolerates staleness, and `roi://` deep links work.
**Avoids:** Pitfall 11.

### Phase 10: Drive Backup and Restore
**Rationale:** Needs stable local schemas. It is independent of widgets and can run in parallel with them.
**Delivers:**
- Sign-in as a state machine (scope-missing, needs-reauth).
- Versioned export/import with upcasters, pull-merge-push with a revision check, a restore preview, Wi-Fi-only audio sync, and a manual export.
- Foreground sync first, background as a bonus.
**Avoids:** Pitfalls 2, 3, 4, 14, 22, 30.

### Phase 11: Teaching Layers, Polish, Privacy and Release Hardening
**Rationale:** Coach marks anchor to finished screens, and store work completes last.
**Delivers:**
- Teaching layers and a coach-mark RTL spike.
- A per-SDK data table for privacy labels, privacy manifests, `usesNonExemptEncryption`, and the `allowBackup` decision.
- App Review notes, a Play 16 KB check, a symbolicated test crash, and an OAuth "In production" check on a Play-installed build.
**Avoids:** Pitfalls 15, 16, 27, 29, 31, 35.

### Phase Ordering Rationale
- Sync-readiness, normalization, RTL and the native spike are in Phase 1 because retrofitting them means a rewrite.
- Phases 2-3 (backend/admin) and Phase 4 (mobile shell) can run in parallel once `schema.graphql` exists.
- Tools run from the simplest write path, to the event model, to the largest tool.
- Widgets and Drive follow at least two stable tools and are independent of each other.
- Backend uptime is a release gate.

### Research Flags
Phases likely needing deeper research (`/gsd-plan-phase --research-phase <N>`):
- **Phase 1:** the integration spike. RNFB 27 with dynamic frameworks, Google SPM, Nitro/MMKV, NativeWind 4 on SDK 58, ts-fsrs 6 on Hermes, monorepo hoisting, and Reusables overlays in RTL.
- **Phase 3:** `@tiptap/markdown` is an early release, and chip drag/drop edge cases may force a hand-written serializer.
- **Phase 9:** iOS RTL in expo-widgets, the `widgetURL` deep link, Arabic fonts in widget runtimes, and Android bitmap sizing across launchers.
- **Phase 10:** headless `signInSilently()` and `getTokens()` while locked, legacy Android Google Sign-In, and large recording upload.
- **Phase 11:** the coach-mark library in RTL on Android, and current store guidelines (4.8, privacy manifests).

Phases with standard patterns (skip research-phase):
- Phases 2, 4, 5, 6, 7 and 8. Docs are solid, and the remaining risk is unit-testable domain logic or already-specified UX.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Versions verified against the npm registry and Expo's `bundledNativeModules.json`. NativeWind 4 on SDK 58, ts-fsrs 6 on Hermes and the combined native build are unproven. |
| Features | MEDIUM | Competitor facts are self-reported store listings. SRS and streak conclusions are HIGH. Egyptian-user preferences are inferred. |
| Architecture | MEDIUM-HIGH | Layering, content sync, assignment and merge are well-known patterns. Widget and Android Google auth details are MEDIUM. |
| Pitfalls | MEDIUM | Several items are verified, but many rely on training knowledge ([T]) and need confirmation in the owning phase. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address
Conflicts between the research files, with the call on each:
- **iOS widgets.** STACK.md recommends `expo-widgets`. ARCHITECTURE.md prefers `@bacons/apple-targets` and calls expo-widgets alpha. **Call:** spike both in Phase 1, default to `expo-widgets`, and fall back to apple-targets if RTL or the deep link fails.
- **iOS frameworks.** PITFALLS.md says `useFrameworks: "static"`. STACK.md, checked against RNFB 27, says `"dynamic"`. **Call:** trust STACK.md. The Phase 1 spike is the final authority.
- **Drive file layout.** ARCHITECTURE.md specifies one data file with a revision check. STACK.md suggests one file per device because Drive v3 has no ETag precondition on media updates. **Call:** decide in Phase 10 research. The per-device file is safer, and the merge function is the same either way.
- **Notification triggers.** PITFALLS.md says one repeating trigger per type. ARCHITECTURE.md says one-shots for the next ~14 days. **Call:** use one-shots with the pure planner, which stays well under 64. Fall back to repeating triggers if reliability suffers.
- **Workspace manager.** ARCHITECTURE.md says pnpm. STACK.md prefers a hoisted layout and warns about the Tailwind 3 vs 4 hoisting trap. **Call:** hoisted layout, verified in the Phase 1 spike.
- **GraphQL driver.** Apollo, verified in STACK.md.

Other gaps:
- **Owner product decisions needed:**
  - Week-start day (Saturday or Sunday).
  - Digit policy (Arabic-Indic or Western).
  - Missing-name fallback.
  - The meaning of "memorized".
  - Audio length cap and Wi-Fi-only rule.
  - Whether weekly/monthly pools are the whole library or a flagged subset.
  - Drive sign-in timing.
  - Whether biometric app lock moves into v1.
- **Unverified claims:** competitor onboarding flows, and whether any competitor now has least-recently-prayed ordering. Re-check store listings at roadmap time.
- **Items marked [T] to confirm in-phase:**
  - iOS 64-notification cap.
  - OEM alarm behavior.
  - SQLite `foreign_keys` pragma inside transactions.
  - FTS5 and Arabic marks.
  - Play 16 KB and target-API rules.
  - Egypt DST and tzdata.
  - Egyptian Law 151/2020 on religious data.
- **Tech debt to record:** the free Google Sign-In "Original" API wraps Android's legacy client. Re-check at each Play target-SDK bump.

## Sources

### Primary (HIGH confidence)
- npm registry (dist-tags, peer deps, engines, dates) for every pinned package, checked 2026-11-24.
- Expo `bundledNativeModules.json` @ sdk-58, the SDK 58 changelog, and Expo docs v58 (widgets, sqlite, localization, background-task).
- rnfirebase.io Expo setup and v27 release notes.
- Google Drive API appdata guide, and Google OAuth "Testing" token expiry.
- Google Play personal-account testing requirement (12 testers, 14 days).
- ts-fsrs v6 release notes, and Anki/FSRS docs.

### Secondary (MEDIUM confidence)
- NativeWind v5 release discussion and the React Native Reusables repo.
- react-native-android-widget docs.
- Tiptap node view and markdown docs, and ProseMirror drag/drop threads.
- @react-native-google-signin docs.
- Apple Guideline 4.8 revision and the Expo privacy manifest guide.
- Competitor App Store listings and streak-design write-ups.

### Tertiary (LOW confidence)
- Community Glance/Expo Android widget article (validate in Phase 9).
- The [T] items in PITFALLS.md.
- Hallow/Abide/YouVersion onboarding assumptions.

Detailed source lists are in STACK.md, FEATURES.md, ARCHITECTURE.md and PITFALLS.md.

---
*Research completed: 2026-11-24*
*Ready for roadmap: yes*
