# Walking Skeleton — روعي (Ro'i)

**Phase:** 1
**Generated:** 2026-11-24

## Capability Proven End-to-End

On the owner's real iPhone and Android phone set to English, a development build and a release build open a right-to-left Arabic app. The app writes and reads its own SQLite database through migrated Drizzle tables. It renders voweled Scripture in the bundled fonts and opens from a home-screen widget tap. Every native integration (Firebase, Google Sign-In, MMKV, Reanimated, widgets) passes together on the spike screen.

## Architectural Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Expo SDK 58 + expo-router, development builds only (no Expo Go), New Architecture | Firebase, Google Sign-In, MMKV and widgets are native; SDK 58 pins the Reanimated, gesture-handler and screens versions |
| Repo layout | bun workspaces with the isolated linker; sibling folders `app/` (Expo), `backend/`, `admin/`, `shared/` (`@roi/shared`, consumed as source TS) | Matches the owner's Meme-Creator layout while keeping one shared package for zod schemas, personalization, dates and merge logic (D-01, D-02) |
| App internals | `app/` routes, `components/ui` (Reusables), `constants/` (all tunable values), `features/<name>/`, `services/`, `hooks/`, `locales/`, `plugins/`, `scripts/`, `drizzle/`, `__tests__` next to code; `@/*` alias | Owner's Meme-Creator conventions; no module-scope literals in feature files |
| Data layer | expo-sqlite + Drizzle 0.45.4 (stable). Every table uses `syncCols()`: text UUIDv7 id, `created_at` and `updated_at` as epoch ms, `deleted_at` tombstone. Events live in append-only tables (`prayer_events`, `review_events`) and counts are COUNT queries; there is a checked-in fixture DB per released schema | Sync-ready from day one for the Phase 8 Drive merge (D-11, D-12, D-13, D-14) |
| Settings / flags | react-native-mmkv 4 (`services/storage.ts`) | Fast synchronous KV for theme, font size and flags |
| Styling | NativeWind 4.2.7 + Tailwind 3.4.19, with color tokens as CSS variables in `global.css` and non-color tokens in `constants/theme.ts`; Scripture uses 5 size steps and the font chosen in the spike | Locked in D-05, D-06, D-07; Uniwind is the documented fallback |
| RTL | `expo-localization` with `forcesRTL`, plus the iOS `CFBundleDevelopmentRegion` set to ar; logical (start/end) classes only, enforced by a guard test | Arabic-only app must be RTL on English-language phones (FND-01) |
| Auth | No end-user accounts. Google Sign-In is proven only as a capability (signIn, getTokens, signOut; no offline access, no server auth code) | Privacy constraint: all personal data stays local; Drive sync in Phase 8 reuses this |
| Telemetry | Firebase Analytics + Crashlytics through one module (`services/telemetry.ts`) with an event allow-list, error codes, a global error scrubber, and consent-off by default | REL-01: no personal text leaves the phone |
| Widgets | iOS `expo-widgets` (props pushed from the app); Android `react-native-android-widget` (headless handler reading SQLite, registered in `index.ts` before `expo-router/entry`) | Research decision; Phase 7 builds one widget per tool on this path |
| Builds and deployment | EAS development builds for both platforms; iOS release through the EAS preview profile; Android release built locally with the owner's `key.jks` (Meme-Creator signing mod in `app.config.js`); Firebase files at the app root, gitignored, and uploaded to EAS as secret file variables | Owner's familiar flow; the store pipeline (GitHub Actions, production profile) waits for Phase 9 |
| Tests and lint | Vitest projects per workspace under real Node 24 (never bun's runtime), a TZ matrix for date logic, `eslint-config-expo` + `react-native-a11y` with zero warnings | D-03; accessibility baseline from the owner's conventions |

## Stack Touched in Phase 1

- [ ] Project scaffold: bun workspaces, Expo app, shared package, backend and admin stubs, Vitest, ESLint, TypeScript ~6.0.3 (01-03, 01-04, 01-05, 01-06)
- [ ] Routing: home, the dev-gated torture screen and spike screen, and a widget deep link (01-06, 01-10, 01-13, 01-14)
- [ ] Database: a real write (last-open date, settings upsert, prayer and review events) and a real read (counts), with migrations proven on a fixture and in release builds (01-07, 01-11, 01-16)
- [ ] UI: theme switch, Scripture size slider steps, search box, Reusables Dialog and Select in RTL (01-08, 01-09, 01-10)
- [ ] Deployment: EAS development builds and release builds installed on both real phones (01-15, 01-16)

## Out of Scope (Deferred to Later Slices)

- Real backend and admin code (GraphQL schema, content cache, hardening, Docker on Dokploy): Phases 2 and 3
- Content download, contentVersion deltas, TanStack Query, graphql-request, GraphQL Codegen: Phase 2
- i18next (Phase 1 uses a plain `locales/ar.json`), zustand, react-hook-form: added by the first phase that needs them
- Local notifications and reminders: Phase 6
- Feature widgets for the four tools: Phase 7 (the skeleton has one spike widget per platform)
- Google Drive backup, restore and background sync: Phase 8
- Biometric lock, consent UX wording, privacy disclosures, GitHub Actions android-release on tags, store submission: Phase 9

## Subsequent Slice Plan

Each later phase adds one vertical slice on top of this skeleton without changing its architectural decisions:

- Phase 2: a new user downloads the public content once from the deployed backend and then uses it offline
- Phase 3: the content owner authors and moderates verses, names and blessings in the Google-gated admin panel
- Phase 4: a new user onboards, sets their name and gender, and reads their personalized identity content (ليا أنا)
- Phase 5: a user records intercession cards and a daily gratitude line (تشفع, دفتر الشكر)
- Phase 6: a user runs spaced-repetition verse reviews and sees what is due today on Home, with reminders (حفظ الآيات)
- Phase 7: a user adds one privacy-safe widget per tool that deep-links into the app
- Phase 8: a user backs up to their own Google Drive and restores on a new phone
- Phase 9: a new user installs Ro'i from the stores with teaching layers, a biometric lock and full privacy disclosures
