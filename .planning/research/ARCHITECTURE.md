# Architecture Research

**Domain:** Offline-first mobile app (Expo/RN) with local SQLite user data, delta-synced public content from a small backend, optional per-user Google Drive (appdata) sync, native home-screen widgets, small admin web panel
**Researched:** 2026-11-24
**Confidence:** MEDIUM-HIGH (layering, content sync, assignment, Drive merge model = design judgment on well-known patterns, HIGH; widget library choice and Google auth on Android = MEDIUM, needs phase spikes)

## Standard Architecture

### System Overview

Three deployables, one shared package. Personal data never crosses the dashed line to our backend.

```
 DEVICE (Expo dev build, iOS + Android)                         YOUR BACKEND (Dokploy, 1 container)
┌────────────────────────────────────────────────────┐        ┌───────────────────────────────────┐
│ app/ (expo-router)  thin screens, route guards      │        │ NestJS (GraphQL code-first)       │
│        │ uses hooks                                  │        │  PublicContentResolver            │
│ features/{leya,hifz,tashfu,shukr,home,onboarding}   │        │  SuggestionResolver (throttled)   │
│   hooks (TanStack Query) ─► repositories ─► domain  │        │  Admin*Resolver (AdminGuard)      │
│        │                         │           (pure) │        │        │                          │
│ Zustand (ephemeral UI)           ▼                  │        │  ContentService ─txn─► SQLite     │
│                          ┌──────────────┐           │ HTTPS  │        │ event content.changed    │
│                          │ SQLite (Drizzle)         │◄──────►│  ContentCache (RAM: snapshots +  │
│                          │ content_*  (mirror)      │ delta  │   version-ordered delta index)   │
│                          │ user_*     (synced)      │ + file │  Suggestions (pending queue)     │
│                          │ sync_state / settings    │        │  AdminAuth (Google ID token)     │
│                          └──────┬───────┘           │        │  AuditLog                        │
│   write funnel (afterWrite) ────┼──► WidgetSnapshot │        └───────────────▲───────────────────┘
│                                 ├──► NotificationPlanner                    │ GraphQL
│                                 └──► DriveSync (dirty)                      │
│ Native widgets (SwiftUI / Android) ◄─ shared storage JSON                ┌──┴─────────────────┐
└──────────────┬──────────────────────────────────────┘                   │ Admin SPA (Vite)   │
               ┊ (opt-in, user's own Google account)                      │ Google sign-in,    │
               ▼                                                           │ chip editor, review│
        Google Drive appDataFolder (data file + audio files)              └────────────────────┘

 packages/shared  (zod schemas, token rules, personalize(), period/seed pure fns) ─► used by all three
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `app/` routes | Screen composition only; route guards (boot gate, onboarding); deep-link targets | expo-router file routes, no queries/SQL inline |
| Feature modules | One per tool; owns its screens, hooks, repository, domain rules | `features/hifz/{screens,components,hooks,repo,domain}` |
| Repositories | The ONLY code that touches Drizzle for user data; stamps `updatedAt`, soft-deletes, fires `afterWrite` | Plain functions/objects per aggregate, return plain objects |
| Domain (pure) | personalize, verse assignment, FSRS wrapper, prayer sort, period keys, notification plan, widget snapshot builder | Pure TS, unit-tested, no RN imports |
| SQLite layer | Schema, migrations, single db handle | `drizzle-orm/expo-sqlite`, drizzle-kit `driver: 'expo'`, `useMigrations` at boot |
| Content sync client | Snapshot download, delta apply, version bookkeeping | One module `sync/content`, transaction-atomic |
| Drive sync engine | Export/merge/upload of user data + audio | `sync/drive`, table registry, zod-validated file |
| Query layer | TanStack Query: SQLite reads (via repos) + network (content, suggestions) | Key factories per feature |
| Zustand | Ephemeral/session UI state + device-local flags (MMKV persist) | review-session cursor, sync status, coach marks |
| Notification planner | Reconciles desired local notifications from settings + state | Pure `plan()` + idempotent `reconcile()` |
| Widget bridge | Writes personalized snapshot JSON, requests widget reload | `widgets/snapshot.ts` + native modules |
| Backend ContentService | Single write path: txn (row + version bump + audit) then event | Drizzle + better-sqlite3 |
| ContentCache | Pre-built per-type snapshot buffers + version-ordered delta slice | In-memory, rebuilt on `content.changed` only |
| Admin auth | Verify Google ID token, allowlist, short-lived session | `google-auth-library`, guard on all admin resolvers |
| Admin SPA | CRUD + chip editor + suggestion review | Vite/React; shared zod + shared `personalize()` for live preview |

## Recommended Project Structure

```
roi/                              # pnpm workspace (+ turbo optional)
├── apps/
│   ├── mobile/
│   │   ├── app/                  # expo-router: (gate)/, (onboarding)/, (tabs-or-home)/, [tool]/..., +native-intent
│   │   └── src/
│   │       ├── db/               # schema.ts, client.ts, migrations (drizzle-kit out), syncable.ts (registry)
│   │       ├── features/         # leya/ hifz/ tashfu3/ shukr/ home/ onboarding/ settings/ help/
│   │       ├── domain/           # personalize (re-export shared), assignment/, fsrs/, periods/, prayer-sort/
│   │       ├── sync/
│   │       │   ├── content/      # first-sync gate, delta apply, apply-in-txn
│   │       │   └── drive/        # auth.ts, driveClient.ts, exportImport.ts, merge.ts, migrate.ts, audio.ts
│   │       ├── notifications/    # plan.ts (pure), reconcile.ts
│   │       ├── widgets/          # snapshot.ts (pure), bridge.ts (native write + reload)
│   │       ├── api/              # graphql documents, generated types, graphql-request client
│   │       ├── stores/           # zustand slices (ephemeral) + mmkv storage adapter
│   │       ├── boot/             # boot state machine (migrate → seed → gate → ready → background jobs)
│   │       └── ui/               # NativeWind + RN Reusables wrappers, RTL helpers
│   ├── api/
│   │   ├── schema.graphql        # emitted by code-first, COMMITTED (codegen input for mobile + admin)
│   │   ├── drizzle/              # migrations
│   │   ├── scripts/import-sanity.ts
│   │   └── src/
│   │       ├── main.ts           # helmet, CORS (admin origin), body limit, trust proxy
│   │       ├── config/           # zod-validated env
│   │       ├── db/               # drizzle provider, schema.ts, WAL pragma
│   │       ├── content/          # content.service, public.resolver, admin.resolver, types (code-first)
│   │       ├── content-cache/    # cache.service, snapshot.controller (HTTP file route)
│   │       ├── suggestions/      # submit + admin review, dedup hash, device guard
│   │       ├── admin-auth/       # google verify, allowlist, session JWT, AdminGuard
│   │       ├── audit/            # audit.service (written inside content txn)
│   │       ├── security/         # throttler (GraphQL-aware), depth/complexity plugins
│   │       └── health/
│   └── admin/                    # Vite + React SPA, graphql-request + codegen, tiptap chip editor
└── packages/
    └── shared/                   # tsup-built: zod content/suggestion schemas, TOKEN, personalize(), validateTokens()
```

### Structure Rationale

- **features/ not layers-at-root:** the four tools are the product's bounded contexts ("nest, never add tiles"). Each feature owns its repo + domain; cross-feature code lives only in `db/`, `sync/`, `notifications/`, `widgets/`.
- **repo is the only DB door:** sync, widgets, notifications all hook the write funnel in one place instead of being sprinkled in screens.
- **domain/ pure:** assignment, FSRS mapping, sort, notification plan, and widget snapshot are the logic that breaks silently; pure functions are cheap to test.
- **committed `schema.graphql`:** decouples codegen from a running server; mobile/admin builds are reproducible.
- **`packages/shared` is small on purpose:** only things that MUST be identical on admin, backend and mobile (token rules, content zod, `personalize()`), so the admin live preview cannot drift from what the phone renders.

## Architectural Patterns

### Pattern 1: Content mirror vs user data (two table families)

**What:** `content_verses / content_names / content_blessings` are a read-only mirror of server rows (server UUID ids, `version`, applied by sync only). `user_*` tables are user-owned, UUID ids generated on device, with `createdAt/updatedAt/deletedAt`. User rows reference content by `(type, contentId)` only where loss is tolerable (favorites); anything the user must keep working COPIES the text.
**When to use:** always here.
**Trade-offs:** memorized verse = copy of text (+ optional `sourceVerseId`) so an admin edit/delete never breaks a review card and Drive restore does not depend on content being downloaded first. Favorites of a deleted item: hide, do not crash.

```typescript
// user-owned, sync-ready from the FIRST migration
export const memVerses = sqliteTable('mem_verses', {
  id: text('id').primaryKey(),               // uuid v4 generated on device (never autoincrement)
  reference: text('reference').notNull(),
  text: text('text').notNull(),              // copy; may contain {الاسم}
  textFemale: text('text_female'),
  sourceVerseId: text('source_verse_id'),    // nullable link to content
  fsrs: text('fsrs', { mode: 'json' }),      // card state (LWW with the row)
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),// epoch ms
  deletedAt: integer('deleted_at'),          // tombstone; on delete ALSO blank text fields (privacy)
});
```

### Pattern 2: Write funnel (repository `afterWrite`)

**What:** every user-data mutation goes `repo.fn()` → single txn that stamps `updatedAt` → after commit emits `dataChanged(table)`. Subscribers: TanStack invalidation, widget snapshot rebuild (debounced), notification reconcile (debounced), Drive "dirty" marker (derived: `updatedAt > lastUploadedAt`, no flag needed).
**When to use:** all writes, including restore and sync-merge (those emit one `bulkChanged`).
**Trade-offs:** one tiny event bus; prevents "widget shows yesterday's data" bugs.

### Pattern 3: State-based LWW merge with append-only events for anything countable

**What:** per-record last-write-wins by `updatedAt` for rows; **never LWW a counter**. "Prayed" is an event row (`prayer_events(id, prayerId, at)`); count, last-prayed, neglect order and streaks are DERIVED. FSRS review log is append-only (union merge); card state is LWW. Gratitude record id is deterministic `shukr:{yyyy-mm-dd}` so two devices writing the same day collide into one record instead of duplicating.
**When to use:** Drive merge (Section: Drive sync).
**Trade-offs:** slightly more queries (derive counts) — trivial at this data size; removes the entire lost-increment bug class.

### Pattern 4: Boot state machine

```
migrate (useMigrations, blocks) ─► ensure userSeed/installId ─► content gate
   contentVersion == null ─► FirstSync screen (retry; offline friendly msg) ─► (success)
─► onboardingDone? ─► Onboarding : Home
─► NON-BLOCKING after ready: content delta · Drive sync (if linked) · assign current periods ·
   notification reconcile · widget snapshot
```
Deep links (widgets/notifications) arriving during gate/onboarding are held and replayed after ready (route guard in `app/_layout`).

### Pattern 5: Content delta sync with global monotonic version

**What:** server keeps ONE counter `contentVersion` (row in `meta`). Every content row change (including delete = tombstone row, `deletedAt` set) gets `version = ++counter` inside the same txn. Client stores its `contentVersion`.
- `contentSync(since: Int, limit)` → `{ latestVersion, mode: SNAPSHOT|DELTA, snapshots?: [{type, version, url, bytes}], upserts{verses,names,blessings}, deletedIds{...}, hasMore, cursor }`.
- `since == 0` (or older than tombstone horizon, none in v1) → `SNAPSHOT` mode: client GETs three pre-built, pre-gzipped files (`/content/{type}.{version}.json.gz`, `Cache-Control: immutable`, ETag = version) from a plain HTTP route (not through GraphQL: free gzip/ETag/CDN, no complexity limits).
- After applying snapshots set `contentVersion = min(snapshot.builtAtVersion)` then immediately run a DELTA — upserts/tombstones are idempotent so any race with a concurrent admin edit converges.
- DELTA: rows `version > since ORDER BY version LIMIT n`, paged by cursor; apply page + new `contentVersion` in ONE SQLite txn.
**When to use:** all public content.
**Trade-offs:** tombstones retained forever (tiny); a horizon + forced resync is the later escape hatch.

```typescript
// server: only place that bumps the version
db.transaction((tx) => {
  const v = bumpVersion(tx);                         // meta.contentVersion += 1
  upsertRow(tx, { ...input, version: v });           // or set deletedAt for delete
  audit(tx, { admin, action, entity, before, after });
});
events.emit('content.changed', { type });            // AFTER commit -> cache.rebuild(type)
```

### Pattern 6: Per-user seeded assignment with persisted history

**What:** table `assigned_verses(kind 'weekly'|'monthly', periodKey, verseId, assignedAt)` (synced). On access: (1) row exists for `(kind, periodKey)` → return it; (2) else candidates = pool − all `verseId` ever assigned for that kind (pool exhausted → clear exclusion, start new cycle); (3) pick with seeded PRNG: `rng = sfc32/mulberry32(hash(userSeed|kind|periodKey))`, candidates sorted by id, `idx = floor(rng()*n)`; (4) persist. Missing/tombstoned verse for an existing row → treat as unassigned and re-pick.
- `userSeed`: 128-bit random from `expo-crypto`, created once, **stored in the synced settings** so a restored device continues the same sequence (two devices with same seed + same history compute the same pick anyway). Keep a separate `installId` (anonymous header for suggestions/abuse limits) — never the same value, never reused as seed.
- `periodKey`: own function with a FIXED week start (decide Sat/Sun once), in device-local date; month = `YYYY-MM`. Not tied to the user's notification-day setting (changing a setting must not re-roll the verse).
- Spread: independent per-user seeds give uniform dispersion; do NOT seed by date alone (everyone gets the same verse). Strict global uniqueness is impossible offline (already accepted in PROJECT.md).
**Why history table and not "seeded permutation index":** a permutation breaks when admin adds/removes verses; history is robust and is exactly what "never repeat" requires.
**Trade-offs:** needs a real PRNG + string hash in TS (no `Math.random`); add a distribution unit test (N seeds → near-uniform picks, no repeats across a full cycle).

### Pattern 7: Personalization at render time, one string format

**What:** content wire format is plain strings: `text`, optional `textFemale`, token `{الاسم}`. Rich text (names, blessings) is a constrained Markdown subset in those same strings (not Portable Text/ProseMirror JSON) so ONE function covers verses, names, blessings, and user-added items:
```typescript
// packages/shared
export const NAME_TOKEN = '{الاسم}';
export function personalize(item: {text:string; textFemale?: string|null}, p: {name?:string; gender?:'male'|'female'}) {
  const raw = p.gender === 'female' && item.textFemale ? item.textFemale : item.text;
  return p.name?.trim() ? raw.replaceAll(NAME_TOKEN, p.name.trim()) : stripToken(raw); // defined fallback!
}
```
Never store composed text (changing name/gender must update everything; copy/share/widget/notification call `personalize` at the moment of use). Admin chip editor serializes chip node ⇄ literal token on save/load; zod rejects any other `{...}` token and "both fields required when switch off". Personalizable fields come as `field` + `fieldFemale` pairs (title/body for blessings, body for names).
**Trade-offs:** Markdown renderer on RN is a small custom/lightweight component; token substitution happens BEFORE markdown parse (escape the name so a name containing `*` cannot inject formatting).

### Pattern 8: Widget snapshot (widgets never run app logic)

**What:** app computes a small, display-ready, already-personalized JSON per widget (`{kind, title, lines[], deepLink, generatedAt}`) and writes it to platform shared storage; native widget only renders it and opens `roi://…`. Rebuild triggers: `afterWrite`, content sync, Drive restore/merge, foreground, a daily background task (period rollover, "due today" staleness). Widgets must degrade gracefully when stale ("افتح روعي" prompt), because iOS/Android refresh is best-effort.
- iOS: SwiftUI WidgetKit extension + App Group; app writes JSON to `UserDefaults(suiteName:)`, calls reload; tap = `widgetURL`/`Link("roi://hifz/review")`.
- Android: app writes snapshot (SharedPreferences/DataStore or the library's task data) and triggers widget update; tap = PendingIntent/`OPEN_URI` to the same `roi://` URL.
- Single deep-link table (`roi://leya/weekly`, `roi://hifz/review`, `roi://tashfu3/next`, `roi://shukr/today`) handled by expo-router; same URLs used by notifications.
- **Privacy default:** widgets show counts/neutral copy ("٣ ناس محتاجين صلاتك"), never prayer text or names; "show names" opt-in setting.
**Why not read SQLite from the widget:** duplicates assignment/personalization/sort logic in Swift and Kotlin and fights file locking/WAL.

### Pattern 9: Notifications are derived state

**What:** `plan(settings, state, now) → Trigger[]` pure; `reconcile()` diffs against scheduled and applies. Schedule one-shots for the next ~14 days (iOS caps pending at 64) rather than repeating triggers so "skip tonight's gratitude reminder if already written" and "no review reminder if nothing due" work. Re-run on settings change, relevant writes, app open, restore. Copy is generic (lock-screen privacy); the weekly-verse notification cannot contain the verse (not assigned yet) — use neutral text.

## Data Flow

### Request Flow (typical user write)

```
Tap "صليت"
   ↓
screen → useMutation → prayerRepo.markPrayed(id)
   ↓ txn: insert prayer_events row (updatedAt, uuid)
   ↓ afterWrite('prayers')
   ├─► queryClient.invalidate(['tashfu3'])         → UI re-reads via repo
   ├─► widgetSnapshot.schedule()                    → JSON → shared storage → reload
   ├─► notifications.reconcile.schedule()
   └─► (Drive) detected as dirty at next sync
```

### State Management

```
SQLite ──(repo)──► TanStack Query (reads; networkMode:'always'!) ──► components
Zustand: ephemeral/session UI + device-local flags only. Never mirrors DB rows.
MMKV: installId, onboardingDone, coachMarksSeen, theme, Drive link status, lastSeenRemoteStamp
SQLite settings table (synced, LWW per key): name, gender, home grid layout, per-tool settings, userSeed
```
Rule: synced preferences in SQLite `settings` (key, value, updatedAt); device-local plumbing in MMKV.

### Key Data Flows

1. **First launch:** boot → migrate → seed ids → `contentSync(0)` → SNAPSHOT files → apply txn → delta → gate opens → onboarding (can overlap screens 1-2 with the download; gate at screen 3 which needs content). Returning-user shortcut ("عندك بيانات قديمة؟" on screen 1) goes to Drive restore.
2. **Content refresh:** foreground (throttled, e.g. ≥6h) → `contentSync(contentVersion)` → empty = nothing, else upsert/tombstone in one txn → invalidate content queries → re-run period assignment check → widget snapshot.
3. **Admin publish:** Admin SPA mutation → AdminGuard → ContentService txn (row + version + audit) → `content.changed` → ContentCache rebuilds that type's snapshot + delta index → next client check sees new `latestVersion`.
4. **Suggestion:** user taps "suggest to everyone" → zod validate → GraphQL mutation with `x-install-id` → throttled → dedup hash → `pending` row → admin reviews/edits → accept = content txn (new content row) + suggestion marked accepted + audit.
5. **Drive sync** (below).
6. **Widget tap:** `roi://hifz/review` → OS launches app → expo-router resolves route; guard defers if boot/onboarding not ready.

### Drive sync data model

```
Drive appDataFolder:
  ro3i-data.json        one JSON doc: { schemaVersion, minReaderVersion, exportedAt, deviceId,
                                        tables: { settings[], mem_verses[], review_log[], prayers[],
                                                  people[], prayer_events[], gratitude[], favorites[],
                                                  user_items[], assigned_verses[], recordings[] } }
  rec-{recordingId}.m4a one immutable file per recording (appProperties: recordingId)
```
- **Every synced row:** `id` (uuid; deterministic for natural keys like gratitude day), `updatedAt` (epoch ms), `deletedAt` (tombstone). Delete = set `deletedAt`, bump `updatedAt`, BLANK personal fields. Keep tombstones indefinitely (tiny) — purging risks resurrection from a long-offline device.
- **Merge (state-based, commutative, idempotent):** for each remote record r vs local l: absent → insert; `r.updatedAt > l.updatedAt` → replace; tie → deletion wins, then lexicographic `deviceId`. Append-only tables (`review_log`, `prayer_events`) union by id. Clamp `updatedAt` > now+24h to now (clock skew).
- **Single-file race:** two devices can both download→merge→upload and one upload may overwrite the other's. It still converges because each device KEEPS its local state and re-merges next sync; lost uploads are re-sent. Corollary: never "replace local with remote" except restore onto an empty DB.
- **Flow:** single-flight mutex → get token → `files.list spaces=appDataFolder` → compare `modifiedTime`/`md5Checksum` with `lastSeenRemoteStamp` → download if changed → zod-validate → version check → merge in ONE txn → if local has rows with `updatedAt > lastUploadedAt` (or merge changed things) → export and upload (multipart upload fine for a small JSON, ≤5MB guidance) → store new stamp → emit `bulkChanged` → audio pass.
- **Schema versioning, two axes:** (1) local DB = forward-only Drizzle migrations run at boot; (2) Drive file `schemaVersion` + chain of pure upcasters `v1→v2→…`. Newer-than-app file ⇒ **refuse to sync and show "update the app"**, never overwrite. Export format is a hand-written serializer with zod per table, decoupled from raw DB column layout. Start numbering at v1 on day one.
- **Audio:** `recordings` row (id, memVerseId, `fileName` RELATIVE (iOS container path changes across updates), sizeBytes, driveFileId, uploadedAt, updatedAt, deletedAt). Upload pending files after data file (Wi-Fi-only toggle, length/size cap — counts toward user's Drive quota); "re-record" = new id + tombstone old (files immutable → no merge). Restore downloads audio lazily on first play.
- **Restore on new device:** sign-in → find file → "we found data from <date>" → content gate must already be done → import into empty DB (adopt `userSeed`, `assigned_verses`, settings incl. name/gender ⇒ mark onboarding complete) → `notifications.reconcile`, widget snapshot, invalidate all.
- **Auth:** `@react-native-google-signin/google-signin` with `addScopes(drive.appdata)`; on iOS `getTokens()` refreshes; on Android a stale token yields 401 → `clearCachedAccessToken()` then `getTokens()` (documented behavior). Background tasks are best-effort; sync correctness may never depend on them.

### Backend flows

```
public:  contentSync(since) ─► ContentCache (RAM) ─► response            (no DB hit)
         GET /content/:type.:version.json.gz ─► pre-built Buffer (ETag/immutable)
admin:   adminLogin(idToken) ─verify aud/email_verified/allowlist─► 15–30 min JWT (kept in memory)
         upsert/delete ─► AdminGuard ─► ContentService txn ─► event ─► cache.rebuild(type)
         suggestions: list/edit/accept/reject ─► accept = same content txn
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–10k users | Single container, better-sqlite3 WAL, in-RAM cache. Delta check = one cheap cached request per app open. |
| 10k–500k | Put CDN (e.g. Cloudflare) in front of `/content/*` (immutable, versioned) and cache `contentSync` by `since`. Still one instance. |
| 500k+ | SQLite single-writer is only a concern for suggestions; move suggestions to a queue or Postgres. Content reads stay RAM/CDN. Unlikely needed. |

### Scaling Priorities

1. **First bottleneck:** public traffic on the GraphQL endpoint (not the DB). Fix: CDN + `If-None-Match` on delta/manifest, throttle.
2. **Second bottleneck:** spam on suggestions (device ID is spoofable). Fix: per-IP + per-install throttles, dedup hash, then Firebase App Check/Play Integrity/App Attest.
3. **Non-scale risk that matters more:** losing the SQLite file (admin work). Fix: Litestream or scheduled `VACUUM INTO` to object storage from day one.

## Anti-Patterns

### Anti-Pattern 1: Auto-increment ids or hard deletes on user tables
**What people do:** `integer primary key autoincrement`, `DELETE FROM`.
**Why it's wrong:** ids collide on restore/merge; deleted records resurrect from other devices; retrofitting is a data migration.
**Do this instead:** device-generated UUIDs, `updatedAt/deletedAt` on every user table in migration 0001, even though Drive sync ships late.

### Anti-Pattern 2: Counters / "last prayed" as mutable fields under LWW
**Do this instead:** event rows, derive counts and neglect order (Pattern 3).

### Anti-Pattern 3: Storing composed (personalized) text or caching it in DB/widget source of truth
**Why:** a name/gender change leaves stale text everywhere. **Instead:** store raw `text/textFemale`, personalize at use.

### Anti-Pattern 4: Letting TanStack Query pause SQLite reads when offline
**What:** default `networkMode: 'online'` pauses queries with no network — local reads would hang in airplane mode. **Instead:** `networkMode: 'always'` for repo-backed queries (set via `queryClient` defaults for the DB query-key space) and keep it `online` only for network fetches.

### Anti-Pattern 5: Zustand as a second database
**Do this instead:** Zustand = ephemeral UI + device flags; entities live in SQLite behind repos; never copy query results into stores.

### Anti-Pattern 6: Business logic in screens/route files or in native widget code
**Instead:** domain/ pure functions; widgets are dumb renderers of snapshot JSON.

### Anti-Pattern 7: Scheduled/lazy cache rebuild on the server, or version bump outside the txn
**Why:** violates "rebuilt only on admin change" and can publish a version whose rows aren't committed. **Instead:** bump inside the txn, rebuild on post-commit event (and once at boot).

### Anti-Pattern 8: Sync correctness relying on background tasks
**Instead:** app-open/foreground is the primary trigger; background is a bonus.

### Anti-Pattern 9: Duplicating zod and GraphQL input shapes without a drift check
**Instead:** zod in `packages/shared` is authoritative (validation pipe on server, form validation in admin/mobile); GraphQL input classes are thin; committed `schema.graphql` + codegen type-check catches shape drift; ONE zod major version across the workspace.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google Drive v3 (`drive.appdata`) | REST via `fetch` with bearer token; `parents:['appDataFolder']`, `spaces=appDataFolder`; files cannot move out of the appdata space | Non-sensitive scope (no restricted-scope verification). Appdata is tied to the app's Google client; disconnecting the app from the account removes it. |
| Google Sign-In (mobile) | `@react-native-google-signin/google-signin` "original" API for scopes/`addScopes`/`getTokens` | Android Google Identity is in flux (Credential Manager + AuthorizationClient); verify scope/token support before Drive phase. |
| Google Sign-In (admin web) | Google Identity Services → ID token → backend `verifyIdToken` | Check `aud`, `email_verified`, allowlist (DB table seeded from env for bootstrap). |
| Sanity | One-off `import-sanity.ts`; deterministic UUIDv5 from Sanity `_id` so re-runs upsert | Run before launch; not a runtime dependency. |
| Firebase Crashlytics/Analytics | Generic events only | Wrap in `telemetry.ts` allowlist so content cannot leak by accident. |
| Dokploy/Traefik | Docker image, persistent volume, `trust proxy` for real client IP | Throttling by IP is meaningless without it. |
| expo-widgets / `@bacons/apple-targets` / `react-native-android-widget` | See widget decision below | All need dev build; none work in Expo Go. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| screen ↔ repo | hooks → repo functions only | No Drizzle in components |
| repo ↔ {widgets, notifications, Drive, query cache} | `afterWrite` event bus | The only coupling point |
| content sync ↔ user data | none (content tables separate) | User rows copy text where needed |
| Drive engine ↔ features | table registry (`name, schema, serialize, merge`) | New synced table = register + bump schemaVersion |
| mobile ↔ backend | GraphQL (delta, suggestion) + HTTP file route (snapshots) | Personal data never sent |
| admin ↔ backend | GraphQL, bearer JWT, CORS locked to admin origin | Introspection off in prod |
| shared ↔ all | `packages/shared` built with tsup (CJS+ESM+d.ts) | Nest consumes built output; Metro/Vite fine with exports |

## Key Decisions and Flagged Choices

| Decision | Recommendation | Confidence |
|----------|----------------|------------|
| SQLite read hook | TanStack Query over repos (explicit invalidation); `useLiveQuery` is an acceptable alternative for simple lists but don't mix. | MEDIUM |
| Snapshot delivery | HTTP route with versioned filenames, not GraphQL. | HIGH (design) |
| Rich text format | Markdown subset in `text`/`textFemale` strings. Must be decided in the content-model phase; affects admin editor and RN renderer. | MEDIUM |
| iOS widgets | Native SwiftUI via `@bacons/apple-targets` (App Group UserDefaults + `widgetURL`) as default; `expo-widgets` (SDK 58, documented for iOS+Android but described by Expo as alpha; docs do not describe tap-to-open URLs for home-screen widgets and widget code runs props-only in an isolated runtime) is the alternative to spike. | MEDIUM |
| Android widgets | `react-native-android-widget` (OPEN_URI click actions to deep links per its changelog) or native Glance via config plugin (Glance: `actionStartActivity(Intent(roi://…))`, SharedPreferences/DataStore for data, `updatePeriodMillis` ≥30 min and Doze-unreliable → push redraw from app). | MEDIUM-LOW |
| Monorepo | pnpm workspaces; Expo auto-configures Metro since SDK 52; isolated installs supported SDK 54+, fall back to `nodeLinker: hoisted` on native build errors; one version of react/react-native/expo; audit with `pnpm why`. | HIGH |
| Drizzle on Expo | `drizzle-kit` `driver:'expo'`, add `sql` to Metro `sourceExts`, `inline-import` Babel plugin, `useMigrations` at boot; `useLiveQuery` needs `enableChangeListener`. | HIGH |
| Backend DB driver | `better-sqlite3` + WAL; debian-slim base image (native module). | MEDIUM |
| GraphQL server driver | Pick the maintained Nest driver at scaffold time (Apollo vs Yoga); verify against current `@nestjs/graphql` docs. | LOW (not verified) |

## Suggested Build Order (dependencies drive phases)

```
0. Workspace + packages/shared (zod, token rules, personalize, period/seed fns + tests)
        │
        ├─► 1. Backend content core: Drizzle schema, version counter, ContentService, ContentCache,
        │      contentSync + /content files, Sanity import, Docker/Dokploy deploy + backups
        │         └─► 2. Admin auth + audit + Admin SPA (chip editor, preview) ─► 6'. suggestions review
        │
        └─► 3. Mobile foundation: expo-router shell, RTL/i18n/theme, Drizzle schema (SYNC-READY ids/
               updatedAt/deletedAt from migration 0001), boot machine, content sync client, first-launch
               gate, personalization, repo + afterWrite funnel, TanStack defaults (networkMode)
                    │
                    ├─► 4. Tools, in order: ليا أنا (exercises content+assignment+personalization end to end)
                    │       → دفتر الشكر (simplest write path, validates funnel + notifications)
                    │       → تشفع (events model, sort) → حفظ الآيات (FSRS, audio; largest)
                    │      + Home grid, teaching layers, per-tool settings, NotificationPlanner grow with each tool
                    │
                    ├─► 5. Widgets (needs stable data models → snapshot builder; SPIKE earlier, see flags)
                    │
                    └─► 6. Drive sync (needs stable local schema; engine + restore + audio)
                    
        7. Suggestions (mobile submit + admin review), privacy/telemetry allowlist, store compliance, release
```

Implications for the roadmap:
- **Sync-readiness is a phase-3 schema concern even though Drive ships in phase 6.** Retrofitting ids/tombstones is a rewrite.
- Backend phases 1–2 and mobile phase 3 are parallelizable after phase 0 once `schema.graphql` for `contentSync` exists (mobile can develop against a seeded local backend).
- Widgets and Drive both depend on the write funnel and stable schemas, so they come after at least two tools exist; both are independent of each other.
- **Research flags:** (a) Widgets — do a de-risking spike in phase 3 (one widget, one deep link, both OSes, dev build + EAS) before committing the approach; (b) Drive/Google auth on Android and background token behavior — phase-specific research; (c) RN Markdown rendering for Arabic RTL with mixed numerals; (d) content model for rich fields (names/blessings) before the Sanity import mapping.

## Open Product Questions Affecting Architecture

- Weekly boundary day (fixed Sat/Sun?) and whether the weekly/monthly pools are the whole verse library or a flagged subset (needs `isIdentityVerse`-style flag on the content model).
- Fallback for a missing name (user skipped): strip token vs neutral address word — defined in `personalize()`.
- Whether onboarding shows the Drive offer before or after the first win (recommend after, with a "عندك بيانات قديمة؟" restore link on screen 1).
- Audio caps (max length, Wi-Fi-only upload) given Drive quota.

## Sources

- Expo docs, expo-widgets (SDK 58 reference) — https://docs.expo.dev/versions/latest/sdk/widgets/ (HIGH for stated limits)
- Expo blog, home-screen widgets and Live Activities (alpha status) — https://expo.dev/blog/home-screen-widgets-and-live-activities-in-expo (HIGH)
- `@bacons/apple-targets` (App Group + ExtensionStorage/UserDefaults, experimental) — https://github.com/EvanBacon/expo-apple-targets (MEDIUM)
- Android widgets in Expo with Glance (SharedPreferences/DataStore, update limits, deep links) — https://reactnativerelay.com/article/react-native-android-widgets-expo-glance-2026 (LOW-MEDIUM, community article)
- react-native-android-widget — https://github.com/saleksovski/react-native-android-widget (LOW: README gave no details; OPEN_URI from search snippet of changelog)
- Google Drive appdata guide — https://developers.google.com/workspace/drive/api/guides/appdata (HIGH)
- React Native Google Sign-In API (addScopes, getTokens, Android 401 / clearCachedAccessToken) — https://react-native-google-signin.github.io/docs/original (HIGH)
- Drizzle + Expo SQLite setup — https://orm.drizzle.team/docs/get-started/expo-new ; live queries release notes https://orm.drizzle.team/docs/latest-releases/drizzle-orm-v0311 (HIGH/MEDIUM)
- Expo monorepo guide — https://docs.expo.dev/guides/monorepos/ (HIGH)
- TanStack Query `networkMode` behavior, LWW/state-based merge and event-sourced counters, WidgetKit snapshot pattern: established patterns from prior knowledge (MEDIUM; not re-verified this session)

---
*Architecture research for: offline-first Expo app + delta-synced content backend + Drive appdata sync + native widgets*
*Researched: 2026-11-24*
