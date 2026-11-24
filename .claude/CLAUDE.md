<!-- GSD:project-start source:PROJECT.md -->

## Project

**روعي (Ro'i)**

Ro'i is a personal spiritual-companion mobile app (iOS + Android, Arabic-only, Egyptian Christian audience) that gathers a user's life with God in one place — His word, their identity in Him, and their prayer — and turns scattered mental notes into daily habits with follow-up. It has four core tools: **ليا أنا** (identity: weekly/monthly verse, names of God, blessings, favorites), **حفظ الآيات** (spaced-repetition verse memorization), **تشفع** (intercession tracking), and **دفتر الشكر** (daily gratitude line). User data is entirely local; a small backend serves shared public content and moderated suggestions.

Name carries two meanings: **راعِيّ** ("The Lord is my shepherd") and **رُوعي** (my needs are looked after and remembered). The app is not the shepherd; it reminds you that you are shepherded.

Tagline: «كلمتك، وهويتك، وصلاتك… في مكان واحد، وحد بيرعاك وإنت جواه.»

**Core Value:** **It remembers for you.** A busy, forgetful, God-loving person opens the app and it tells them what's due today (verses to review, who to pray for, tonight's gratitude line) — without guilt, without hunting through notes.

### Constraints

- **Tech stack (mobile)**: Expo + expo-router, development build (not Expo Go, needed for Firebase); Drizzle + expo-sqlite; react-native-mmkv; NativeWind + React Native Reusables; Zustand; TanStack Query + graphql-request + GraphQL Codegen; react-hook-form + zod; expo-notifications (local); expo-audio; ts-fsrs; i18next + expo-localization (RTL); FlashList; Reanimated + Gesture Handler; safe-area-context + keyboard-controller; @react-native-firebase crashlytics + analytics; RNRepo (optional, beta) — chosen to match owner's stack and offline-first design
- **Tech stack (backend)**: NestJS + @nestjs/graphql code-first, SQLite + Drizzle (same ORM as mobile), in-memory public content cache keyed by `contentVersion` (one pre-built serialized file per content type — all verses in one, all names of God in one, all blessings in one — rebuilt ONLY when an admin changes something, no scheduled refresh; clients never re-pull the whole library — they send their last `contentVersion` and receive only changed/new/deleted items, while the first download serves the pre-built file), plus API hardening: rate limiting on all public endpoints (stricter on suggestion submissions), request validation with zod, GraphQL query depth/complexity limits, disabled introspection in production, CORS restricted to the admin origin, security headers (helmet), payload size limits, anonymous device-ID abuse protection, admin auth via verified Google ID token + email allowlist with short-lived sessions, audit log of admin changes, and secrets via environment only, Docker on Dokploy with persistent volume
- **Privacy**: all personal data local; no network egress of personal content except explicit actions — the data is among the most sensitive kinds
- **Google integration**: Google Sign-In (`@react-native-google-signin/google-signin`) + Drive REST API v3 limited to `drive.appdata` scope (non-sensitive scope, avoids Google's restricted-scope verification); background sync is best-effort (iOS does not guarantee timing), so also sync on app open/foreground
- **Platforms**: iOS and Android both required in v1, including widgets (native work needed)
- **Language**: Arabic only; RTL
- **Distribution**: App Store + Google Play review compliance (privacy policy, disclosures)

<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->

## Technology Stack

## 1. Verdict on the owner's stack

| # | Finding | Action |
|---|---------|--------|
| 1 | **NativeWind `latest` = 4.2.7 (Tailwind 3).** v5 (Tailwind 4) is only at `5.0.0-rc.1`; maintainer targets stable "end of November 2026" but that is a target, SDK 58 testing was still pending. React Native Reusables' registry and templates still ship NativeWind `^4.2.x` + `tailwindcss ^3.4.x` (Uniwind is an official alternative since Dec 2025). | Use **NativeWind 4.2.7 + tailwindcss 3.4.19**. Do NOT install `tailwindcss@latest` (4.3.5) in the mobile app. Re-evaluate v5 after v1 ships. |
| 2 | **`graphql@17.1.0` is `latest`, but `graphql-request@7.4.0` (peer `14 - 16`) and `@apollo/server@5.5.2` (peer `^16.11.0`) reject it.** | Pin **`graphql@^16.15.0`** in every workspace (mobile, backend, admin). |
| 3 | **`typescript@7.0.2` is `latest`**, but Expo SDK 58 template uses `~6.0.3` and `@nestjs/graphql@14.2.1` peers `^5.5 \|\| ^6`. | Pin **`typescript@~6.0.3`** everywhere. |
| 4 | **Reanimated 4.8.0 / worklets 0.14.0 are `latest`, SDK 58 pins 4.7.1 / 0.13.0** (reanimated↔worklets versions are a hard pair; mismatch = native build/runtime error). Same for `react-native-keyboard-controller` (SDK pins 1.22.7, latest 1.24.0), gesture-handler (SDK ~3.3.0), screens, safe-area-context. | **Always `npx expo install <pkg>`** for anything Expo tracks; never hand-pick "latest". |
| 5 | **React Native Firebase 27 is SPM-only on iOS** (Firebase iOS SDK 13) and requires `useFrameworks: "dynamic"` (static fails), Xcode 26.2+, iOS 15+, minSdk 24, New Architecture, JDK 17. RNFB docs list Expo 58.0.0 as its tested setup. | Set `expo-build-properties` → `ios.useFrameworks: "dynamic"`; Google Sign-In must use matching `iosDependencyManager: "spm"` (see §4). This is the main native integration risk **[spike]**. |

## 2. Recommended Stack — Mobile (validated + pinned)

### Core Framework

| Technology | Version | Purpose | Why / Notes | Confidence |
|------------|---------|---------|-------------|------------|
| Expo SDK | **58** (`expo ~58.0.26`) | App platform, dev builds | Current SDK; RNFB 27 tested on it; `expo-widgets` Android shipped in 58. Native-only: set `platforms: ["ios","android"]`. SDK 58 breaking items to know: iOS scene-based lifecycle (prebuild generates `SceneDelegate.swift`), Android R8 on by default in release, `expo-notifications` shows foreground notifications by default, `expo-sqlite` libSQL removed (irrelevant to us). | HIGH |
| React Native / React | 0.88.1 / 19.3.x (pinned by SDK) | Runtime | New Architecture only (RNFB, FlashList v2, Reanimated 4 all require it). | HIGH |
| expo-router | ~58.0.32 | Navigation + deep links | Needs `react-native-screens ~4.30.1`, `react-native-safe-area-context ~5.11.1`, gesture-handler, reanimated (all SDK-pinned). Deep-link scheme also serves widget taps. | HIGH |
| expo-dev-client | ~58.0.21 | Dev builds | Required (Firebase, Google Sign-In, widgets, MMKV are all native). | HIGH |
| expo-build-properties | ~58.0.12 | iOS `useFrameworks: "dynamic"`, deployment target | Required by RNFB 27. | HIGH |
| TypeScript | ~6.0.3 | Language | See finding 3. | HIGH |
| Node (tooling) | **24 LTS (Krypton, 24.22.x)** | Dev/CI/backend runtime | `ts-fsrs@6` declares `engines.node >= 24`; `@graphql-codegen/cli@8` needs >= 22.18; Expo needs 22.13+/24.3+. 24 satisfies all. | HIGH |

### Data / State

| Technology | Version | Purpose | Why / Notes | Confidence |
|------------|---------|---------|-------------|------------|
| expo-sqlite | ~58.0.18 | On-device DB | Supports WAL, `enableChangeListener`, custom `directory` (documented App Group shared-container pattern), optional SQLCipher via config plugin (`useSQLCipher`). | HIGH |
| drizzle-orm / drizzle-kit | **0.45.4 / 0.31.11** (stable `latest`) | Schema + migrations (mobile AND backend) | Drizzle's own Expo docs now point to the `@rc` tag (`1.0.0-rc.6`, 7 months of RC). Recommendation: **stay on stable 0.45.x for v1** because device migrations are irreversible against user data; 1.0 migration later is a documented `drizzle-kit up`. Needs `drizzle.config.ts` with `driver: 'expo'`, Metro `sourceExts.push('sql')`, babel `inline-import` for `.sql`, `useMigrations`. | MEDIUM (stable-vs-RC is a judgment call) |
| react-native-mmkv | 4.3.2 (+ `react-native-nitro-modules` 0.37.x) | Settings/flags KV | v4 is a Nitro module; install both via `expo install`. Nitro + `useFrameworks: dynamic` has no public report either way **[spike]**. | MEDIUM |
| zustand | 5.1.0 | UI state | Fine. | HIGH |
| @tanstack/react-query | 5.108.x | Server-state for content sync | Fine. | HIGH |
| graphql-request | 7.4.0 | GraphQL client | Peer graphql ≤16 → pin graphql 16 (finding 2). | HIGH |
| @graphql-codegen/cli + client-preset | 8.0.0 + 7.0.0 | Typed documents | Both need Node ≥ 22.18; both accept graphql 16 or 17. | HIGH |
| ts-fsrs | **6.0.1** | Spaced repetition | v6 (2026-10-28) is a breaking rewrite: `DefaultScheduler` is **async-constructed** (`await DefaultScheduler({...})`), default model is **FSRS-7**, legacy `fsrs()`/`FSRS` facade is deprecated (FSRS-6), `elapsed_days` removed, card shape is `cardId, stability, stabilityFast, difficulty, dueAt, lastReviewAt, reps, lapses, scheduledDays, learningStep, state, scheduleStatus`. Start on the new API (don't build on the deprecated one). **Persist the full card object as a JSON column plus an explicit `fsrsModel` column**, so a later model change/migration and Drive-sync merges are explicit. Pure TS, no native code; confirm Hermes runs it in the spike. Fallback: `ts-fsrs@5.4.2` (FSRS-6, `fsrs()` API). | MEDIUM |

### UI

| Technology | Version | Purpose | Why / Notes | Confidence |
|------------|---------|---------|-------------|------------|
| nativewind | **4.2.7** (+ `react-native-css-interop 0.2.7`) | Tailwind-in-RN | See finding 1. Not yet verified against SDK 58 / RN 0.88 by its maintainers (v4 tested through ~SDK 56 by Reusables). Fallback if it breaks in the spike: **Uniwind 1.14.0** (Tailwind 4, Expo-only, Reusables has an official `minimal-uniwind` template and CLI auto-detects it). | MEDIUM |
| tailwindcss | **^3.4.19** (mobile) | Styling engine | NativeWind v4 peers Tailwind 3 (`css-interop` pins `~3`). | HIGH |
| React Native Reusables | CLI `@react-native-reusables/cli` 0.7.1 + `@rn-primitives/*` 1.5.x | shadcn-style components (copied into repo) | Components are copied source, so no runtime version lock. Latest primitives are 1.5.2 (registry) / portal 1.5.3. Reusables showcase runs Expo 56 / RN 0.85; SDK 58 is one major newer, so smoke-test every primitive you adopt (dialog, select, tabs, switch) with RTL + Reanimated 4. | MEDIUM |
| react-native-reanimated + worklets | **4.7.1 + 0.13.0** (pinned by SDK 58) | Animation | Hard-paired. Do not take 4.8/0.14 until the SDK does. | HIGH |
| react-native-gesture-handler | ~3.3.0 (pinned) | Gestures | v3 major (SDK 58). | HIGH |
| react-native-keyboard-controller | **1.22.7** (pinned by SDK 58; 1.24.0 is npm latest) | Keyboard handling | Peers reanimated ≥3, no upper bound; works with 4.7.1. Take SDK pin. | HIGH |
| react-native-safe-area-context | ~5.11.1 (pinned) | Insets | | HIGH |
| @shopify/flash-list | ~2.3.2 (pinned) | Lists | v2 is New-Arch only (fine). Vertical RTL lists are fine; test any horizontal list in RTL. | HIGH |
| lucide-react-native | whatever the Reusables CLI installs | Icons | Reusables pins `^0.577`; npm `latest` is 1.78. Don't hand-upgrade. | MEDIUM |
| react-native-svg | 15.16.0 (pinned) | SVG (also needed by `react-native-marked`) | | HIGH |
| react-native-marked | 8.3.4 | Render rich-text articles (names of God, blessings) from Markdown subset | Mature (2022), actively released (2026-11-04), custom renderers, RN Text-based so Arabic shaping + long-press copy work. Fallback: `react-native-enriched-markdown` 1.2.0 (native text views, young, Jan 2026). | MEDIUM |

### Forms, i18n, platform services

| Technology | Version | Purpose | Notes | Confidence |
|------------|---------|---------|-------|------------|
| react-hook-form + @hookform/resolvers | 7.92.0 / latest | Forms | Resolvers peer `zod ^3.25 \|\| ^4`. | HIGH |
| zod | **4.6.7** | Validation, shared schemas | Same major in mobile, backend, admin (one shared package). | HIGH |
| i18next / react-i18next / expo-localization | 27.2.6 / 18.0.3 / ~58.0.5 | i18n + RTL | **Set `expo-localization` plugin `forcesRTL: true`** (documented option, default false). Arabic-only app must be RTL even on English-locale phones; `supportsRTL` alone follows device language. `forcesRTL` needs a native rebuild. | HIGH |
| expo-notifications | ~58.1.9 | Local reminders | Use repeating calendar/weekly/daily triggers (4 reminders) to stay well under iOS's 64-pending-local-notification cap. Content is static (can't say "3 people to pray for" without the app running). Android 13+ `POST_NOTIFICATIONS`; exact alarms not needed. | HIGH |
| expo-audio | ~58.0.12 | Record/play verse recitations | `expo-av` is gone; SDK 58 adds WAV/PCM recording. Use a low-bitrate AAC preset for voice to keep Drive uploads small. Needs `RECORD_AUDIO` + `NSMicrophoneUsageDescription`. | HIGH |
| expo-secure-store | ~58.0.3 | Small secrets (device ID, sync cursor) | | HIGH |
| expo-clipboard / expo-sharing | ~58.0.4 / ~58.0.23 | Long-press copy / share outside app | | HIGH |
| @react-native-firebase/app, crashlytics, analytics | **27.1.1** | Generic events + crash reports | See finding 5. Disable auto-collection until consent; never log prayer/name/verse text; no screen names that embed user content. Forced test crashes need a **Release** build (debug builds don't reach Crashlytics). | HIGH (versions) / MEDIUM (combo) |
| expo-background-task + expo-task-manager | ~58.0.13 / ~58.0.14 | Best-effort background sync | See §4. **Do not use `expo-background-fetch`** (superseded). | HIGH |

## 3. Undecided piece #1 — Home-screen widgets (4 tools × iOS + Android)

### Decision

| Platform | Use | Version | Why |
|----------|-----|---------|-----|
| **iOS** | **`expo-widgets`** (primary) | ~58.0.29 (stable since SDK 56) | Official, config-plugin generated WidgetKit extension + App Group, widgets written in TS with `@expo/ui/swift-ui`. Home-widget tap deep link is available via the SwiftUI `widgetURL(url)` modifier (one per widget). Timelines supported (`updateTimeline`). 4 entries in `widgets[]` = one widget per tool. |
| **Android** | **`react-native-android-widget`** | 0.26.0 (peer `expo >= 54`, repo active, pushed 2026-11-22) | Mature (2023) and solves the three Android needs `expo-widgets` Android (new in SDK 58, a month old) does not document: (1) `clickAction="OPEN_URI"` with `clickActionData={{ uri: 'roi://...' }}` deep-links into the right tool via expo-router; (2) the widget task handler runs in headless RN JS, so it can **open the same expo-sqlite/Drizzle DB directly** and render fresh data on `WIDGET_UPDATE`; (3) updates via `updatePeriodMillis` (≥30 min), `requestWidgetUpdate()` from the app, or native broadcast. Leave `expo-widgets` `enableAndroid: false` (default) so the two don't both generate Android widgets. |
| iOS fallback | `@bacons/apple-targets` 5.0.0 (hand-written SwiftUI target, source kept outside `ios/`) | | Use only if the RTL spike below fails. Full SwiftUI control (`.environment(\.layoutDirection, .rightToLeft)`), reads App Group files natively. Cost: you now maintain Swift. |

### How widgets get data (and how NOT to)

- **iOS (`expo-widgets`): widgets cannot query anything.** They run in an isolated runtime: no hooks, no async, no imports, no top-level constants, no access to the app sandbox or SQLite. The **app pushes props**: `MyWidget.updateTimeline([{date, props}, ...])` / `updateSnapshot(props)`. So the pattern is: a small `buildWidgetSnapshot(db)` function in the app reads Drizzle and pushes props for all four widgets. Trigger it: after each mutation that affects a widget (review finished, "صليت", gratitude saved, favorite changed), on app background, and at the end of each background sync task.
- **Do NOT share the main SQLite file with an iOS extension.** Expo documents the App Group `directory` option for expo-sqlite, but a WAL database held open by a suspended app in a shared container is the classic `0xdead10cc` termination risk, and the `expo-widgets` runtime can't read it anyway. Props push (or a JSON snapshot via `apple-targets` fallback) is the safe pattern.
- **Android (`react-native-android-widget`):** the handler may read the DB read-only (separate connection; WAL allows concurrent readers). Register the handler in a custom `index.ts` **before** `import 'expo-router/entry'` and point `package.json#main` to it.

### Known gaps to settle in the Phase 0 spike

## 4. Undecided piece #2 — Google Sign-In + Drive `drive.appdata` sync

### Decision

| Concern | Choice | Notes |
|---------|--------|-------|
| Sign-in + consent | **`@react-native-google-signin/google-signin` 17.0.0** (the free "Original" API; the owner's choice) | Expo config plugin; `iosUrlScheme` or Firebase `GoogleService-Info.plist`. v17 adds opt-in **SPM** resolution: set plugin `iosDependencyManager: "spm"` **and** keep `useFrameworks: "dynamic"`, so GoogleSignIn shares one copy of GTMSessionFetcher/GoogleUtilities/AppCheckCore with RNFB 27 (CocoaPods mode risks duplicate-symbol link errors). SPM mode requires iOS 15+. **[spike]** |
| Scope | `https://www.googleapis.com/auth/drive.appdata` only | Official docs call it a non-sensitive scope → no Google restricted/sensitive-scope verification. Request it **after** the explanatory screen via `GoogleSignin.addScopes({scopes:[...]})` (re-offerable from Settings) or in `configure({scopes})`. |
| Drive client | **Hand-rolled `fetch` wrapper (~100–150 lines)** against Drive REST v3 | Don't use `googleapis` (Node-only, huge) or third-party RN Drive wrappers (stale). Endpoints: `files.list?spaces=appDataFolder&fields=...`, `files.create` with `parents:['appDataFolder']` (multipart upload for the JSON), `files.update?uploadType=media`, `files.get?alt=media`, resumable upload for recordings > 5 MB. appDataFolder cannot be shared/trashed/moved; files vanish if the user uninstalls the app from Drive. |
| Token handling | `GoogleSignin.getTokens()` before every sync batch | iOS: always returns a valid (auto-refreshed) token. Android: token can be stale → on 401 call `clearCachedAccessToken(accessToken)` then `getTokens()` once and retry. Do **not** use `offlineAccess`/`serverAuthCode` (that exists to hand a code to a backend — forbidden by the privacy constraint). |
| Foreground sync | On app open/foreground (primary path) | Guaranteed; handles restore on new device. |
| Background sync | `expo-background-task` ~58.0.13 + `expo-task-manager` (`TaskManager.defineTask` at module scope, `registerTaskAsync` with `minimumInterval` ≈ 1 day) | WorkManager (Android, min 15 min) / `BGTaskScheduler` processing task (iOS). iOS timing is system-decided (battery, network, usage patterns), never runs in the simulator, and is skipped if the user swipes the app away. Plug-in auto-adds `UIBackgroundModes: processing` and `BGTaskSchedulerPermittedIdentifiers`. Treat as best-effort exactly as PROJECT.md says. |
| Persisted data | Single JSON data file + recordings as separate files | See sync-design notes. |

### Sync-design notes that affect library choice

- **One file per device (`data-<deviceId>.json`), merged on read** is safer than one shared file: Drive v3 has no `If-Match`/ETag precondition for media updates, so two devices updating one file can lose writes. Single-writer-per-file removes the race; per-record last-write-wins + tombstones resolve at merge time. (Pitfall owner can accept or reject; costs a `files.list` per sync.)
- **Background auth is the weak link [spike]:** the Original API restores the Google session via `signInSilently()` (iOS Keychain / Android Play Services). Verify on real devices that `signInSilently()` + `getTokens()` succeeds inside a headless background task, including while the phone is locked. If it doesn't, background sync degrades to "foreground only" (acceptable per constraints) — do not build an own-OAuth refresh-token layer for v1.
- **Android legacy risk:** the free "Original" package wraps Google's legacy `GoogleSignInClient`, which Google has deprecated in favor of Credential Manager + `AuthorizationClient` (no removal date published; still functional). The paid "Universal Sign-In" implementation uses the new APIs. Acceptable for v1; record it as tech debt and re-check at each Play target-SDK bump.
- **OAuth consent screen must be set to "In production"** (not "Testing") before store release, otherwise Google refresh/consent expires after 7 days for external users. Non-sensitive scope → no verification review, but needs privacy-policy URL and app homepage.
- Recording upload: use `expo-file-system` (SDK 58: `File.write()` is now async) to read bytes and send via `fetch`; verify blob/stream support on the target `File` API in the spike.

## 5. Undecided piece #3 — Admin panel + Google ID-token verification

### Frontend stack (small SPA, separate static origin)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vite | 8.3.8 | Build/dev | Static SPA; deploy as its own Dokploy static/nginx app on an admin subdomain (this is what "CORS restricted to the admin origin" implies). No SSR needed. |
| React / react-dom | 19.3.x | UI | Same as mobile. |
| react-router | 8.5.2 (library mode; needs Node ≥ 22.22 to build) | Routing | ~6 screens (list, edit, suggestions queue, audit log). |
| Tailwind CSS | **4.3.5 + @tailwindcss/vite** | Styling | Admin uses Tailwind **4**, mobile uses Tailwind **3**: keep them in separate workspaces with separate `node_modules` resolution, or hoisting will pull one version into the other (classic monorepo trap). |
| shadcn/ui (CLI 4.23) | | Components | Same design language as Reusables; copy-in components. |
| @tanstack/react-query + graphql-request + GraphQL Codegen client-preset | 5.108 / 7.4 / 7.0 | Data | Identical to mobile; generated types shared. |
| react-hook-form + zod 4 | | Forms | Import the **same zod schemas** from a shared workspace package (`packages/shared`): token rule (`{الاسم}` only), both-fields-required when switch off, one-sided-name warning, and the personalization `compose(text, textFemale, name, gender)` function used by mobile and by the live preview. |
| @react-oauth/google | 0.13.5 | Google Identity Services button → returns ID-token credential | Official GIS wrapper; no Google SDK on the backend needed beyond verification. |

### Rich-text editor: **Tiptap 3.35.0** (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`)

- **Storage format: Markdown subset string with the literal `{الاسم}` token** (bold, italic, h2/h3, bullet list, blockquote). This keeps the owner's `text`/`textFemale` string model, keeps backend validation trivial (regex: reject any `{…}` that isn't `{الاسم}`), and lets mobile do `string.replace` before rendering with `react-native-marked`. Verses (plain text) use a stripped-down editor (no marks) with the same chip node.
- Chip ↔ token conversion: use `@tiptap/markdown` 3.35.0 with a custom inline spec, **but note it is documented as "early release"**. Fallback: a ~60-line hand-written ProseMirror-JSON ⇄ Markdown-subset serializer with round-trip unit tests (the token is the only non-standard construct). Decide in the admin phase; unit-test the round trip either way. **[spike]**
- Known edge: ProseMirror drag-and-drop of custom node views has had "node removed on drop" reports — include drag-reposition in the editor's acceptance test (drag chip mid-sentence, undo/redo, copy-paste between male/female fields, paste of plain text containing `{الاسم}` must become a chip).
- Set `dir="rtl"` on the editor and the preview; use Tailwind logical utilities (`ms-*`, `ps-*`, `text-start`) throughout the admin.

### Google ID-token verification (backend)

| Piece | Choice | Notes |
|-------|--------|-------|
| Verification | **`google-auth-library` 11.3.4** `OAuth2Client.verifyIdToken({ idToken, audience: WEB_CLIENT_ID })` | Official; validates signature (cached Google certs), `aud`, `iss`, `exp`. Then require `payload.email_verified === true` and `payload.email` ∈ allowlist (env var, lower-cased compare). Engines Node ≥ 22. (`jose` 6.2.18 + Google JWKS is an acceptable lighter alternative, but you hand-write the claim checks.) |
| Session | Mint own short-lived JWT (**`@nestjs/jwt` 12.0.5**, 15–30 min) returned in the GraphQL response; admin SPA keeps it **in memory** and sends `Authorization: Bearer`; silent re-auth through Google GIS | Bearer-in-memory avoids cookie/CSRF handling for a cross-origin admin. |
| Guard | Nest guard on every admin resolver; mutations write to `audit_log` (who, what, before/after) | |

## 6. Undecided piece #4 — NestJS GraphQL backend + hardening

### Versions (all verified compatible)

| Technology | Version | Notes |
|------------|---------|-------|
| NestJS (`@nestjs/core`, `common`, `platform-express`) | **12.6.0** | Nest 12 is current; Node ≥ 20. |
| `@nestjs/graphql` + `@nestjs/apollo` | **14.2.1** each | Peers: Nest 12, graphql `^16.11 \|\| ^17`, TS `^5.5 \|\| ^6`. |
| `@apollo/server` | **5.5.2** | Peer graphql `^16.11.0` → forces graphql 16. |
| `@as-integrations/express5` | 1.1.2 | Required by `@nestjs/apollo` for Express 5. |
| `graphql` | **^16.15.0** | Pin (finding 2). |
| Drizzle ORM + `better-sqlite3` | 0.45.4 + 13.2.0 (Node ≥ 22; prebuilt for Node 24) | Same ORM as mobile. `PRAGMA journal_mode=WAL; busy_timeout; foreign_keys=ON`. Single container instance only (SQLite on a persistent Dokploy volume). |
| `class-validator` | 0.15.1 | Only needed because `@nestjs/graphql` lists it as peer; **don't use it for validation.** |
| `@nestjs/config` | 12.1.1 | Env-only secrets. |
| Docker base | `node:24-alpine` (or `-slim` if better-sqlite3 musl prebuild is missing) | |

### Hardening stack (maps 1:1 to PROJECT.md constraints)

| Constraint | Implementation |
|------------|----------------|
| Rate limiting (stricter on suggestions) | **`@nestjs/throttler` 6.8.0** (supports Nest ≤ 12). Subclass `ThrottlerGuard` and override `getRequestResponse` to use `GqlExecutionContext.create(ctx).getContext().req`. Global default (e.g. 60/min/IP), `@Throttle({ default: { limit: 5, ttl: 3_600_000 } })` on `submitSuggestion`. Tracker = IP **and** device ID. In-memory store is fine (single instance). **Set `app.set('trust proxy', 1)`** or every client shares Traefik's IP and the limit becomes global. |
| Depth/complexity/aliases/tokens | **`@escape.tech/graphql-armor` 3.2.0** (`new ApolloArmor().protect()` → spread `plugins` + `validationRules` into the `ApolloDriverConfig`). One package covers max-depth, cost-limit, max-aliases, max-directives, max-tokens, and block-field-suggestions. Prefer it over `graphql-depth-limit` (1.1.0, unmaintained since 2018) + hand-wired `graphql-query-complexity` 2.0.0. Tune: depth ≈ 6, small cost budget; the public API is tiny. |
| Introspection off in prod | `introspection: NODE_ENV !== 'production'`, `ApolloServerPluginLandingPageDisabled()` in prod, `hideSchemaDetailsFromClientErrors: true`, `includeStacktraceInErrorResponses: false`, keep `csrfPrevention: true` (default) and `allowBatchedHttpRequests: false` (default). |
| CORS | `app.enableCors({ origin: [ADMIN_ORIGIN], methods: ['POST','GET'] })`. Mobile apps ignore CORS, so non-browser abuse is handled by throttling + validation. |
| Security headers | **`helmet` 8.3.0** via `app.use(helmet())`; in production no landing page means the default CSP is fine (only relax it in dev for Apollo Sandbox). |
| Payload limits | `app.use(json({ limit: '100kb' }))` (Express 5 body-parser); GraphQL string fields also capped by zod (`max()`), e.g. suggestion text ≤ 1000 chars. |
| Input validation with zod | **Write a ~10-line `ZodValidationPipe`** (`schema.safeParse` → `BadRequestException`) and reuse the shared zod schemas. **Do NOT use `nestjs-zod` 5.6.0: its peer range stops at `@nestjs/common ^11`, so it doesn't declare Nest 12 support** (and its value is REST/OpenAPI, not GraphQL). |
| Anonymous device-ID abuse | A client-supplied UUID is trivially forged. On first launch the app calls `registerDevice`; server returns an **HMAC-signed device token** (`jose`/`@nestjs/jwt`, long-lived, secret in env). Throttle registration by IP; throttle suggestions by token **and** IP. (Play Integrity / App Attest are the heavier option; defer.) |
| Admin auth + audit | §5. Audit log table written inside the same SQLite transaction as the content change. |
| Content cache | Pre-built serialized file per content type (verses/names/blessings), rebuilt only on admin writes, keyed by `contentVersion`; serve the first-download files as pre-gzipped static responses from a plain Express route (not through GraphQL) with `ETag`/`Cache-Control`; deltas via a GraphQL query taking `sinceVersion` that returns changed + tombstoned ids. |

## 7. Alternatives considered

| Category | Recommended | Alternative | Why not (now) |
|----------|-------------|-------------|---------------|
| Styling | NativeWind 4.2.7 + Tailwind 3.4.19 | NativeWind 5 RC / Uniwind 1.14 | v5 is RC, SDK 58 testing pending, not "for production use" per its docs; Reusables registry still targets v4. Uniwind is the pre-agreed fallback (supported by Reusables CLI). |
| iOS widgets | expo-widgets 58 | `@bacons/apple-targets` 5.0.0 | More native code to own; only needed if RTL spike fails. |
| Android widgets | react-native-android-widget 0.26.0 | expo-widgets Android | New in SDK 58, subset of Compose components, no documented tap→URL, timelines/config iOS-only, runtime can't read DB. Revisit in SDK 59/60. |
| Drive auth | google-signin 17 `getTokens` | Own OAuth PKCE with refresh token in SecureStore (`expo-auth-session`) | More reliable in background but re-implements consent UI and needs custom-scheme redirect handling; defer unless the background-auth spike fails. |
| Drive auth | google-signin Original (free) | Universal Sign-In (paid) | Paid; only needed when legacy Android GSI is actually removed. |
| ORM | Drizzle 0.45.4 stable | Drizzle 1.0 RC | RC for 7 months; device migrations are irreversible. Move after GA. |
| Rich text | Tiptap 3 | Lexical 0.53 / bare ProseMirror | Lexical is pre-1.0; ProseMirror needs you to rebuild what Tiptap already gives (React node views, commands, history). |
| GraphQL server | Apollo 5 via `@nestjs/apollo` | `@nestjs/mercurius` / Yoga | Armor + Nest docs + throttler examples are Apollo-first; no reason to diverge. |
| Hardening | graphql-armor | graphql-depth-limit + graphql-query-complexity | Unmaintained depth lib; two packages to wire vs one. |
| Nest validation | own 10-line zod pipe | nestjs-zod | Doesn't declare Nest 12; REST-oriented. |
| Background | expo-background-task | expo-background-fetch | Superseded. |
| Audio | expo-audio | expo-av | Removed from SDK. |

## 8. Installation (sketch; run via `npx expo install` where marked)

# Mobile (Expo SDK 58) — Expo-tracked packages resolve to SDK-pinned versions

# UI components (copied source): npx @react-native-reusables/cli@latest add <components>

# app.json plugins that matter:

#  ["expo-build-properties", { "ios": { "useFrameworks": "dynamic" } }]

#  ["expo-localization", { "supportsRTL": true, "forcesRTL": true }]

#  ["@react-native-google-signin/google-signin", { "iosDependencyManager": "spm" }]   // + googleServicesFile paths

#  "@react-native-firebase/app", "@react-native-firebase/crashlytics"

#  ["expo-widgets", { "widgets": [ 4 × {name, displayName, ios:{supportedFamilies:[...]}, android:null } ] }]

#  react-native-android-widget plugin (widgets: 4 providers)

# Backend

# Admin panel

## 9. Phase 0 "stack integration spike" (gate before building features)

## 10. Confidence summary

| Area | Confidence | Basis |
|------|------------|-------|
| Expo SDK 58 baseline + pinned versions | HIGH | `bundledNativeModules.json`, SDK 58 changelog, npm peers |
| RNFB 27 requirements | HIGH | rnfirebase.io Expo page + release notes |
| NativeWind 4 + Reusables on SDK 58 | MEDIUM | Reusables verified on SDK 56; SDK 58 untested by maintainers |
| ts-fsrs 6 on Hermes/RN | MEDIUM | 4-week-old major, pure TS but unverified in RN |
| Widgets (iOS expo-widgets, Android RNAW) | MEDIUM | Official docs + repo docs; RTL/tap/headless behavior needs spike |
| Google Sign-In + Drive appdata | MEDIUM-HIGH | Official Drive docs; background-auth behavior unproven |
| Admin Tiptap chip | MEDIUM-HIGH | Standard Tiptap node pattern; `@tiptap/markdown` self-described early |
| NestJS 12 + Apollo 5 + hardening | HIGH | Registry peers + official docs; `GqlThrottlerGuard` wiring is the documented override pattern |

## Sources

- npm registry (`latest` dist-tags, peer deps, engines, publish dates) for every package listed — 2026-11-24 — HIGH
- Expo `bundledNativeModules.json` @ `sdk-58`; Expo SDK 58 changelog (expo.dev/changelog/sdk-58) — HIGH
- Expo docs v58: `sdk/widgets`, `sdk/ui/swift-ui/modifiers` (`widgetURL`, `environment`), `sdk/background-task`, `sdk/sqlite` (shared-container, SQLCipher), `sdk/localization` (`forcesRTL`) — HIGH
- React Native Firebase v27 Expo setup (rnfirebase.io) and GitHub releases v27.0.0–27.1.1 — HIGH
- react-native-google-signin docs (`/docs/original`, `/docs/setting-up/expo`, `/docs/one-tap`) and GitHub release v17.0.0 — HIGH/MEDIUM
- Google Drive API guide "Store application-specific data" (appDataFolder, non-sensitive scope); Android legacy-GSI migration guide — HIGH
- NativeWind v5 install doc + release-plan discussion #1818 (rc status, end-of-Nov target); React Native Reusables repo (registry/showcase/template package.json, changelog "Uniwind Integration") — HIGH
- react-native-android-widget repo docs (`handling-clicks`, `update-widget`, `limitations`) — HIGH/MEDIUM
- Tiptap docs (node views React, markdown "early release") and ProseMirror forum drag/drop threads — MEDIUM
- ts-fsrs v6.0.0/6.0.1 release notes and quick-start guide — HIGH
- Apollo Server 5 / GraphQL Armor docs; Drizzle Expo guide — MEDIUM-HIGH

<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->

## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->

## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->

## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-fast` for a trivial task inline, with no subagents and no PLAN.md
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
