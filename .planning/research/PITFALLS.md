# Pitfalls Research

**Domain:** Offline-first Arabic/RTL spiritual-habit mobile app (Expo dev build, local SQLite, FSRS, home-screen widgets, local notifications, audio recording, Google Drive `appdata` backup, Firebase analytics/crash, dual-store release) plus a small NestJS + SQLite content backend and admin panel on Dokploy.
**Researched:** 2026-11-24
**Confidence:** MEDIUM overall. Items marked **[V]** were checked against official or primary docs in this session. Items marked **[T]** come from established platform behavior and training knowledge and need a quick confirmation in the owning phase's research. Items marked **[SPIKE]** are genuinely uncertain and should be proven on real devices before the roadmap commits to them.

**Phase labels used below** (suggested; the roadmapper may rename). The mapping only matters in relative order:

| Label | Scope |
|-------|-------|
| **P0 Foundation** | Identity (bundle IDs, OAuth, app group), dev build + native config spike, RTL/i18n/theme/fonts, DB schema + migrations, sync-ready data model |
| **P1 Backend + Admin + Import** | NestJS, content API, admin panel, Sanity import, Dokploy deploy |
| **P2 Content sync + Personalization + ليا أنا** | First-launch download, delta sync, name/gender composition, per-user verse assignment |
| **P3 حفظ الآيات** | FSRS, review sessions, recall modes, audio recording |
| **P4 تشفع + دفتر الشكر** | Prayer cards, neglect sort, gratitude lines |
| **P5 Home, onboarding, notifications** | Tile grid, teaching layers, local notifications |
| **P6 Widgets** | iOS + Android widgets |
| **P7 Drive sync** | Google sign-in, appdata backup/restore, background sync |
| **P8 Privacy + Release hardening** | Analytics/crash hygiene, store forms, review prep, 12-tester clock |

---

## Critical Pitfalls

These cause rewrites, store rejection, data loss, or a privacy incident.

### Pitfall 1: Sync-readiness bolted on after the schema ships

**What goes wrong:**
Tables are built with auto-increment integer IDs, no `updatedAt`, hard deletes, and absolute file paths. Drive sync (P7) then needs UUIDs, per-record timestamps, tombstones, and a schema version, so every table needs a migration on devices that already hold real user data. Prayer cards and recordings end up with colliding IDs when two devices merge.

**Why it happens:**
Drive sync is scheduled last, so P3/P4 are built "just local". Local-first apps feel like they have no sync concern until restore-on-new-device is tested.

**How to avoid:**
In P0, give every user-data table: `id` (UUID/ULID generated client-side), `createdAt`, `updatedAt` (ms int), `deletedAt` (nullable tombstone), and a `deviceId`-independent origin. All deletes are soft deletes. Deletes are filtered in queries through one shared helper. Keep a `meta` table with `schemaVersion` and a synced `userSeed` (see Pitfall 9). Define the Drive file format (versioned JSON, record-level, header with `schemaVersion` + `appVersion`) in P0 even though upload ships in P7. Write a pure `merge(local, remote)` function with unit tests before any UI depends on it.

**Warning signs:**
Any table without `updatedAt`/`deletedAt`. Any `DELETE FROM` on user data. Any `autoIncrement` primary key on user data. Drizzle schema files that differ from the planned export shape.

**Phase to address:** P0 (schema), verified in P7.

---

### Pitfall 2: Drive merge that lets an empty device overwrite a full backup

**What goes wrong:**
A new or reinstalled device finishes first launch, runs "sync on app open", sees a local DB that is empty and newer than the remote file's timestamp, and uploads its empty state. The user's years of prayer cards are overwritten. Variants: last-write-wins by wall clock where one phone's clock is wrong; tombstones purged after 30 days so a stale device resurrects deleted prayers; a delete on device A races an edit on device B and the edit silently wins; two devices upload a single monolithic file at the same time and one loses.

**Why it happens:**
LWW sounds simple. Nobody models the first-sync, clock-skew, and tombstone-expiry cases. A single JSON blob with no revision check makes concurrent upload a coin flip.

**How to avoid:**
Order is always **pull, merge, push**, never push first. Track `lastSyncedRevision` (Drive `headRevisionId` or file `version`) and refuse to push unless the remote revision equals the one last merged; otherwise re-pull and re-merge. Treat "local is pristine (no user rows, never synced)" as pull-only. Resolve LWW per record on `updatedAt`, clamp future timestamps (reject `updatedAt` more than a few minutes ahead of the device clock at write time), and use `deletedAt` vs `updatedAt` comparisons so a later edit beats an earlier delete deliberately, not accidentally. Keep tombstones at least 180 days, or until every known device has acknowledged them (store a `lastSeenByDevice` map). Keep recordings as separate Drive files keyed by record ID, uploaded before the data file references them. Add a "restore preview" count ("found 214 prayers, 38 verses") before applying on a fresh device. Keep one previous remote revision as a recovery copy before each overwrite.

**Warning signs:**
Sync code with no "first sync" branch. No test with two simulated devices. Tombstone cleanup job added "to keep file small". Sync status UI that says "synced" without a revision.

**Phase to address:** P7, with the pure merge function and tests started in P0.

---

### Pitfall 3: Google OAuth consent left in "Testing", wrong SHA-1, or partial scope grant

**What goes wrong:**
(a) While the consent screen is in **Testing**, authorizations expire after 7 days and offline refresh tokens die with them, so backup silently stops a week after every tester signs in. **[V]** (b) Google Sign-In works in debug builds and fails in the Play release with `DEVELOPER_ERROR` (code 10) because Play App Signing re-signs the app and its SHA-1 was never registered as an Android OAuth client. **[T]** (c) With granular consent, a user can sign in but untick the Drive permission; the app assumes it has `drive.appdata` and every Drive call returns 403. **[T]** (d) The user revokes access in their Google account, or clears hidden app data in Drive settings, and sync fails forever with no visible state. (e) Adding any second scope (for example `drive.file` "to be safe") moves the app out of non-sensitive territory and into verification.

**Why it happens:**
OAuth setup is done once in the Cloud Console and then forgotten. Debug-vs-release signing differences only show on a Play-installed build.

**How to avoid:**
Request exactly `openid`, `email`, `profile`, `https://www.googleapis.com/auth/drive.appdata` and nothing else. Move the consent screen to **In production** before the first external tester, and re-test with a freshly consented account (tokens minted during Testing stay short-lived). Register three Android SHA-1s in the OAuth client set: local debug, EAS upload key, and the **Play App Signing** key shown in Play Console. Create the iOS client ID and wire the reversed-client-ID URL scheme through the config plugin. After sign-in, always check which scopes were actually granted and show a clear "Drive permission missing, tap to fix" state. Model sync as a state machine (`disconnected | ok | needs-reauth | scope-missing | error(lastError)`), shown in Settings with last-success time. Never swallow a 401/403.

**Warning signs:**
"Sign-in works for me" while no one has tested a Play-installed build. Testers reporting backup stopped after about a week. A sync function with a bare `try/catch` and no state.

**Phase to address:** P0 (create the Cloud project, clients, SHA-1s early), P7 (state machine), P8 (verify against a Play internal-track build).

---

### Pitfall 4: Getting a Drive access token in the background without an Activity or a user

**What goes wrong:**
`@react-native-google-signin/google-signin` is built around foreground use. Its Android token refresh path is documented as a cache-clear-then-`getTokens()` dance, `addScopes` is documented as iOS-only in the "original" API, and the newer Android Authorization/Credential Manager flow differs from the legacy flow. **[V, partial]** A WorkManager/BGTask JS task has no foreground Activity, so silent token acquisition can throw or return a stale token. Result: "sync roughly daily in the background" never actually works on one platform, and nobody notices because foreground sync works.

**Why it happens:**
The library API looks symmetric across platforms, and background JS is only tested by waiting for the OS to fire it.

**How to avoid:**
Make **foreground sync the product**: on app open, on return to foreground, and a debounced push when the app moves to background after local edits. Treat OS-scheduled background sync as a bonus, never as the promise. Run a **[SPIKE]** in P7's first plan: can a headless task obtain a valid Drive access token on Android and iOS without UI? If not, fall back to storing a refresh token via an installed-app PKCE flow in SecureStore, or accept foreground-only sync and say so honestly in Settings copy. Surface "last synced" and nudge when more than N days have passed.

**Warning signs:**
Background-sync code never exercised outside a debugger. Settings screen claiming "synced daily" with no timestamp. No test on an Android device after a long idle.

**Phase to address:** P7 (spike first).

---

### Pitfall 5: RTL forced only on Arabic-language phones, and mirrored/physical-direction bugs everywhere else

**What goes wrong:**
The app is developed on a phone or simulator set to Arabic, so `I18nManager.isRTL` is true. A user whose phone is set to English (common in Egypt) gets Arabic text in an LTR layout: back buttons, tabs, lists, and tile grid all mirrored wrong. Calling `forceRTL(true)` requires an app restart to take effect, so the first launch after install renders LTR. Beyond that, `translateX` animations, swipe gestures, progress bars, chevron icons, horizontal FlashLists, drag-to-reorder tiles, and `row-reverse` layouts do not all flip the same way, and double-flipping is common.

**Why it happens:**
RN auto-swaps `left/right` style props in RTL but not transforms, gesture deltas, or icon glyphs. NativeWind class names written physically (`ml-4`, `left-0`, `text-left`) hide the difference until tested on both locales. **[T]**

**How to avoid:**
In P0: set `I18nManager.allowRTL(true)` and `forceRTL(true)` at startup, and handle the first-launch restart (do it before any content renders, ideally hidden behind the splash; the first-launch internet screen is a natural place for the one-time reload). On iOS also restrict `CFBundleLocalizations` to `ar` and `CFBundleDevelopmentRegion` to `ar` so native chrome resolves RTL. Test every screen on an **English-language device/simulator**, and again on an Arabic one. Use logical NativeWind utilities (`ms-/me-/ps-/pe-/start-/end-/text-start`) exclusively. Lint-ban `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`. Wrap directional icons in one `<DirectionalIcon>` that mirrors chevrons/arrows by `I18nManager.isRTL`. Write one helper for animation direction (`dir = isRTL ? -1 : 1`) and use it for every Reanimated translate and gesture delta. Never combine `flexDirection: 'row-reverse'` with forced RTL. Add a screen-by-screen RTL checklist to every phase's verification.

**Warning signs:**
All screenshots taken on one device language. Any `row-reverse`. Any hard-coded `translateX` without a direction multiplier. Back-swipe or tile reorder behaving mirrored.

**Phase to address:** P0 (infrastructure + lint rule), enforced in every UI phase.

---

### Pitfall 6: Mixed Arabic/Latin/digit text rendering (bidi) and tashkeel clipping

**What goes wrong:**
Verse references like `مزمور 23:1-6` render as `6-1:23` or with the colon on the wrong side. A user name typed in Latin ("Mina") substituted for `{الاسم}` drags neighboring punctuation to the wrong visual position. Text starting with a Latin word aligns left inside an RTL screen. Brackets and quotes around substituted names mirror unexpectedly. Dates from `toLocaleDateString('ar')` come out in the Umm al-Qura/Hijri calendar or with unexpected digits on some devices. Fonts clip the diacritics above and below letters. Any non-zero `letterSpacing` (including NativeWind `tracking-*`) breaks Arabic cursive joining. **[T]**

**Why it happens:**
The Unicode bidi algorithm gives neutral characters (digits, colon, hyphen, parentheses) direction from context. Developers test with pure-Arabic strings only.

**How to avoid:**
Create one `<Bidi>`/`isolate()` helper that wraps any inserted or non-Arabic run in Unicode isolates (FSI/LRI + PDI, U+2068/U+2066 + U+2069) and apply it to: composed names, verse references, numbers with separators, and user-entered text echoed inside sentences. Decide once between Western digits and Arabic-Indic digits for UI and use one formatter everywhere. Format dates explicitly with a Gregorian, fixed-numeral locale (for example `ar-EG-u-ca-gregory-nu-latn` or hand-format from parts) and test on a real device since Hermes `Intl` behavior varies. Pick one Arabic-capable font family with real bold/regular files (custom fonts need a family per weight on Android; `fontWeight: 'bold'` alone fails), set generous `lineHeight` (at least 1.6x for fully voweled text), and set `includeFontPadding` deliberately on Android. Forbid `letterSpacing` on Arabic via a text component default. Set `writingDirection: 'rtl'` and `textAlign: 'auto'`/start, not `left`. Build a "torture fixtures" screen in dev with: fully voweled verse, Latin name, `{الاسم}` substitution, `Genesis 1:1-3`, emoji, numbers, long text, so every text component is visually checked on both OSes.

**Warning signs:**
Diacritics touching the line above. A reference that reads backwards. Names with parentheses looking wrong. Any custom font added without per-weight files.

**Phase to address:** P0 (font, Text component, helpers, fixtures screen), re-verified in P2 (composition) and P3 (recall UI).

---

### Pitfall 7: Arabic search and recall logic that ignores diacritics, alef/ya variants, and Unicode ordering

**What goes wrong:**
Searching "الرب" does not find "الرَّبُّ". A user typing `ي` does not match stored `ى`; `ا` does not match `أ/إ/آ/ٱ`; `ه` does not match `ة` as users expect. SQLite `LIKE` does nothing about this, and FTS5's default `unicode61` tokenizer treats Arabic combining marks as separators and splits words apart (its `remove_diacritics` option targets Latin diacritics). **[T]** In recall modes, splitting text with `split('')` or code-unit slicing orphans diacritics from base letters, so "first-letter" hints show a bare fatha. Shadda+fatha stored in different orders (typical of text imported from a CMS) break equality, dedupe, and word comparison. Full-word recall that compares typed text to fully voweled verse text marks every correct answer wrong because users do not type tashkeel.

**Why it happens:**
Search is treated as `LIKE '%q%'`. Recall modes are built on strings, not on Arabic grapheme units.

**How to avoid:**
One `normalizeArabic()` function in a shared package, used for **both** stored search columns and queries: NFC normalize (canonical reordering fixes shadda/fatha order); strip U+064B-U+065F, U+0670, U+06D6-U+06ED, tatweel U+0640; map `أ إ آ ٱ` to `ا`; `ى` to `ي`; (decide explicitly) `ة` to `ه`; map Arabic-Indic and Persian digits to ASCII; collapse whitespace. Store a `searchText` column at write time and query that with `LIKE` (the pool is small enough that FTS5 is YAGNI; skip it unless the verse pool turns out to be Bible-sized). Build recall modes on a `graphemes(text)` helper that groups a base letter with its trailing marks (use explicit code point ranges rather than relying on Hermes `\p{M}`/`Intl.Segmenter`). Compare typed answers using `normalizeArabic()` on both sides. Run the same normalizer in the Sanity import and the admin save path so stored text is canonical. Unit-test with real fully voweled verses.

**Warning signs:**
Search tested only on unvoweled words. `split('')` in recall code. Duplicate verses that look identical in the admin.

**Phase to address:** P0 (shared normalizer package + tests), P1 (import/admin use it), P3 (recall modes).

---

### Pitfall 8: Public-content deletes and edits that clients can never learn about, and user data that dangles

**What goes wrong:**
The admin hard-deletes a verse. Delta sync ("send me everything since `contentVersion` N") cannot express a deletion, so the verse lives on every device forever. Or the opposite: the delete propagates, and a user's memorization card, favorite, or assigned weekly verse now points at a missing row and crashes or silently vanishes. Delta paging that sorts by `updatedAt` instead of a monotonic version skips rows edited during the page. A half-finished first download (app killed) leaves partial content with `contentVersion` already advanced, so the missing rows never arrive.

**Why it happens:**
Delta sync is designed for inserts/updates only. The user-reference problem is invisible until content is edited in production.

**How to avoid:**
Backend: soft-delete content with `deletedAtVersion`; allocate `contentVersion` as a monotonic integer incremented in the same transaction as the change; page deltas by `(version, id)` cursor; keep tombstones long and send "full resync required" if a client's version is older than retained tombstones. Client: download inside one transaction and write `contentVersion` **last**; resume or restart cleanly if interrupted. User data that references public content keeps a **local snapshot** of the text it needs (card text, favorite text, assigned-verse text) or tolerates a missing reference by showing the snapshot. The first-launch full file and the delta path must produce identical local state; test by applying delta N times versus a fresh full download.

**Warning signs:**
A `DELETE` on a content table in backend code. A client that stores `contentVersion` before the rows. A card query that `JOIN`s content without a fallback.

**Phase to address:** P1 (backend model), P2 (client sync), P3 (snapshot on card creation).

---

### Pitfall 9: "Seeded random, stable, never repeats" verse assignment that is not actually stable

**What goes wrong:**
The weekly/monthly verse is computed as a pure function of `(deviceId, period)`. When the content pool changes (admin adds or removes a verse), indexes shift and the user's verse for the **current** week changes on reopening. "Never repeat" cannot be honored without history. After restoring from Drive onto a new device, the device ID changes, so both the seed and the history change and the user's current verse flips. Week boundaries are computed in UTC, so the verse changes at 2 or 3 AM Cairo time or on timezone change (Egypt also changed DST rules in 2023). If first launch has an empty pool, the assignment is computed against nothing.

**Why it happens:**
Pure seeded functions feel deterministic and need no storage. The pool is assumed immutable.

**How to avoid:**
**Persist** the assignment at first access for a period key: `assignments(periodType, periodKey, contentId, snapshot)`. Choose the next verse by a seeded shuffle of `(pool minus assignment history)`, and when the pool is exhausted start a new cycle. Generate `userSeed` once, store it in the synced `meta`, and never derive it from hardware identifiers, so restore preserves it. Compute `periodKey` from **local** calendar date with an explicit week-start day (Saturday vs Sunday is a product decision; write it down) and never recompute an existing key. Assign lazily after content exists. Store snapshot text so later content edits or deletions do not change what the user already received. Compose name/gender at render time, never at assignment time.

**Warning signs:**
No `assignments` table. A verse that changes after a content sync. Week/month keys built from `Date.toISOString()`.

**Phase to address:** P0 (table + `userSeed` in meta), P2 (assignment logic).

---

### Pitfall 10: FSRS scheduling that fights the daily-review model and local day boundaries

**What goes wrong:**
`ts-fsrs` defaults enable short-term learning steps (minutes), so a "Again" card is due in 1-10 minutes and does not fit a once-a-day session or the "due today" count. `fuzz` randomizes intervals, so tests are non-deterministic. "Due today" computed as `due <= now` hides cards due at 6 PM until 6 PM and flickers the counter. Streaks computed from UTC dates break at 2-3 AM Cairo time and around timezone changes or DST. A user returning after three weeks sees 80 due cards and quits ("makes me feel like a failure", the opposite of the product tone). Upgrading `ts-fsrs` changes the `Card` shape (for example learning steps replacing `elapsed_days`) and breaks serialized state. Date objects stored as strings round-trip incorrectly. The auxiliary recall modes (reveal 25%/50%, first-letter, full-word) quietly feeding ratings into FSRS produce inconsistent grades.

**Why it happens:**
The library is designed around Anki-style learning steps and timestamps; the product wants a calm daily deck.

**How to avoid:**
Decide up front and test: `enable_short_term: false` (or one fixed same-day relearn pass), `enable_fuzz` off in tests and on only if wanted, `request_retention` stored in settings. Define "day" as a **local date string** with a configurable rollover (for example 4 AM) and compute `dueToday = due < startOfNextLocalDay`. Streak = consecutive local dates with at least one review; never show a harsh reset (show "welcome back", cap the shown backlog, offer "just 10 today", sort most-overdue first with a daily review cap). Persist card state as primitive ints (ms) plus the library version; keep an append-only `reviewLog` so state can be rebuilt after a library change. Only the explicit self-rating (Again/Hard/Good/Easy) writes to FSRS; practice modes never do. Inject `now` into every scheduling call so tests can time-travel. Do not reset card state when the verse text is edited.

**Warning signs:**
Cards due in minutes. Counters changing within a session. Tests using `new Date()` directly. Streak tests only in one timezone.

**Phase to address:** P3, with day-boundary utilities in P0.

---

### Pitfall 11: Widgets that cannot read the app's data, go stale, or leak prayer names

**What goes wrong:**
- Expo's official `expo-widgets` runs widget components in an **isolated runtime**: no hooks, no state, no async work, no imports, no module-level constants; data arrives only via props/snapshots pushed from the app. **[V]** A widget cannot query SQLite itself. Teams discover this after designing widgets around live queries.
- Android widget support in `expo-widgets` is opt-in and limited to a subset of Compose components (unsupported ones render "View not found"); timelines, configurable widgets and `updateTimeline` are iOS-only, Android uses `updateSnapshot`. **[V]**
- Widget refresh is not guaranteed. iOS budgets timeline reloads and Android periodic updates are coarse. A "5 verses due" widget shows 5 after the user finished them. **[T]**
- Deep links from widget taps are not described for ordinary widgets in the Expo docs. **[V]** **[SPIKE]**
- Prayer cards and names show on the home screen and lock screen where anyone nearby can read them.
- The widget extension and app both need correct App Group/entitlement/provisioning setup; first EAS build with an extension target fails on credentials.
- Arabic font and RTL inside widgets are separate from the RN app (the widget bundle does not inherit RN font loading). **[T]**
- Widget images must be written to the shared app-group directory and referenced by path. **[V]**
- Absolute file paths and iOS container UUIDs change between installs.

**Why it happens:**
Widgets look like "small screens of the app" but are separate processes with separate runtimes and OS-controlled refresh.

**How to avoid:**
Design widgets around **snapshot data the app pushes**: compute the display model (`{title, line1, line2, deepLink, generatedAt}`) in the app after each relevant mutation and on foreground, write it with `updateSnapshot` (and `updateTimeline` entries on iOS for known-future content such as tomorrow's verse, which is deterministic from the stored assignment). Choose widget content that degrades gracefully when stale: "افتح للمراجعة" rather than an exact count, or show `generatedAt`-aware text. Default widgets to **non-sensitive** content (counts, verse of the week, gratitude prompt); show prayer names only if the user opts in. Run a **[SPIKE]** in P6's first plan covering: tap deep link into expo-router on cold start and warm start, custom Arabic font in both widget runtimes, RTL layout in SwiftUI and Compose widgets, and widget memory limits. Add `widgetsDirectory`/app group ID and the extension bundle ID to P0's identity decisions, and register them in Apple Developer and EAS credentials in P0 so P6 is not blocked. Budget extra time: every widget change requires a native rebuild.

**Warning signs:**
Widget code importing from the app. A widget design doc that says "queries today's due count". No stale-state design. Widgets built before notifications and home logic exist.

**Phase to address:** P0 (identity/app group, build spike), P6 (widgets), P8 (privacy defaults check).

---

### Pitfall 12: Local notifications that hit the iOS cap, leak content, or silently never fire

**What goes wrong:**
- iOS keeps only **64** pending local notifications; scheduling one per prayer card or one per day for 90 days silently drops the rest. **[T]**
- Notification text shows prayer names/verse text on the lock screen. **[T]**
- Android 13+ requires the `POST_NOTIFICATIONS` runtime permission, and the prompt only appears once a notification **channel** exists; channel importance/sound cannot be changed after creation by the app. **[T]**
- Android 12+/14 exact alarms need `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM` handling; the permission can appear in the merged manifest and trigger a Play policy declaration. **[T]**
- Aggressive OEM battery management (Xiaomi, Oppo, Realme, Samsung, Huawei, all very common in Egypt) kills alarms or delays them; force-stop cancels scheduled alarms; scheduled alarms must survive reboot. **[T]**
- Times are computed as "now + N hours" and drift across Egypt's DST changes.
- Permission denied once means the app cannot ask again (iOS) and the settings UI shows toggles that do nothing.
- Asking for permission at first launch before the user has seen value gets denied.

**Why it happens:**
Notifications are tested on one dev phone for one day.

**How to avoid:**
Schedule at most **one repeating trigger per notification type** (daily/weekly calendar triggers count once) rather than per item: review reminder, prayer reminder, gratitude, weekly verse. On every app open run one idempotent `reconcileNotifications()` that cancels by known identifiers and reschedules from current settings. Use generic copy by default ("وقت مراجعتك"), never item content. Create channels once, one per tool, with the final importance decided in P5. Ask for permission in context (after the first gratitude line or when enabling a reminder), explain the benefit, and show a "notifications are off, open Settings" row when denied. Review the merged Android manifest and remove unused alarm permissions with `blockedPermissions`, accepting inexact timing unless exact is truly needed. Test on a real Samsung/Xiaomi device after reboot and after force-stop; add a gentle in-app "if reminders don't arrive" help entry for battery optimization. Trigger by local wall-clock hour/minute, not by elapsed milliseconds.

**Warning signs:**
`scheduleNotificationAsync` in a loop over items. Item text in notification bodies. No reboot test. Permission requested in onboarding screen 1.

**Phase to address:** P5.

---

### Pitfall 13: On-device SQLite migrations that brick the app or silently lose data

**What goes wrong:**
- The app runs migrations at launch; one failing migration crash-loops every user on update, with no recovery path.
- Drizzle/SQLite table-recreate migrations (SQLite cannot alter many column constraints) rely on `PRAGMA foreign_keys=OFF`, which is a **no-op inside a transaction**; with `ON DELETE CASCADE`, recreating a parent table can wipe child rows. **[T]** Verify against the Drizzle version in use.
- `drizzle-kit` migration output for Expo needs the Metro `.sql` source extension and the babel inline-import plugin; missing it works in dev and breaks in release builds. **[T]**
- Editing an already-shipped migration, or generating two migrations from diverging branches, produces schemas that differ between fresh installs and upgraded installs.
- Foreground code and a background task/widget refresh open the DB concurrently and hit `database is locked`.
- Restoring a Drive backup produced by a **newer** schema onto an **older** app version corrupts or fails.
- Raw `.db` file backups cannot be merged and are version-fragile.

**Why it happens:**
Migrations are only ever tested from empty to latest on a dev phone.

**How to avoid:**
Never edit a shipped migration; only append. Prefer additive migrations (new nullable columns, new tables); for destructive changes, make a new table, copy, swap, with `foreign_keys` handled outside the transaction or avoid cascades on user tables. Before running pending migrations, copy the DB file to a backup name and keep it until the next successful launch; on failure show a recovery screen instead of crashing. Set `PRAGMA journal_mode=WAL` and `busy_timeout`. Keep a CI test that builds the DB at **every historical schema version** (fixture DBs committed to the repo) and migrates it to latest. Back up to Drive as versioned **record-level JSON**, with `schemaVersion` in the header; refuse to restore a newer `schemaVersion` and tell the user to update the app. Smoke test a **release** build (not just dev) for migrations on both platforms in P0.

**Warning signs:**
`drizzle-kit push` used against anything but dev. No fixture DBs. Migration run inside React render with no error UI.

**Phase to address:** P0 (infrastructure and tests), then every phase that changes schema.

---

### Pitfall 14: Stored file paths and the audio recorder lifecycle

**What goes wrong:**
Recordings are saved with an absolute URI in SQLite. After an app update or restore, the iOS app container path changes and every recording is "missing". Recordings captured into the cache directory are purged by the OS. A phone call, Siri, an alarm, a route change (AirPods), or going to background interrupts recording and leaves a truncated or zero-byte file with a DB row pointing to it. Playback is silent on iOS when the mute switch is on because the audio mode was never set. Recording fails permanently when the mic permission is denied and the user is never told how to recover. Format drift (iOS default presets producing different containers than Android) makes a backed-up recording unplayable on the other platform. Enabling background recording drags in a foreground-service permission and Play review friction.

**Why it happens:**
The happy path (tap record, tap stop) is tested; interruptions and path persistence are not.

**How to avoid:**
Store only a **relative filename** (`rec_<uuid>.m4a`) and resolve against the documents directory at runtime. Record directly into documents (or move on stop). Fix one cross-platform format (AAC in `.m4a`, mono, modest bitrate) via explicit options. Treat the DB row as committed only after the file exists with non-zero duration. Handle interruptions and app-background by stopping and saving the partial take with a visible "recording was interrupted" state. Set audio mode for playback in silent mode and switch the session category between record and play deliberately. Release players/recorders on unmount. Handle permission states (undetermined, denied, blocked) with an explicit "open Settings" path. Do not enable background recording. Provide usage-description strings that are specific. Sync recordings to Drive as separate files on Wi-Fi only, with size shown to the user. Test: call interruption, Bluetooth connect/disconnect, backgrounding mid-record, permission denied, reinstall + restore.

**Warning signs:**
`file://...` stored in the DB. No test with an incoming call. A recorder created in a component body without cleanup.

**Phase to address:** P3 (recorder), P7 (sync of audio).

---

### Pitfall 15: Analytics/Crashlytics leaking religious and prayer data

**What goes wrong:**
- Automatic screen tracking sends route paths; with expo-router, paths or params can contain item IDs, names, or search text.
- Error messages thrown from validation, SQL, or GraphQL layers include user content (a zod error echoing the prayer text; Drizzle's `logger` printing bound params) and flow into `crashlytics().recordError`/`log`.
- `setUserId` is set to a device ID, Google email, or anything stable and identifying.
- Events carry free-form properties (`verse_ref`, `person_group`).
- iOS IDFA/ad personalization signals are left on, which drags in App Tracking Transparency and wrong privacy labels.
- Religious belief is a special category of personal data under GDPR and is treated as sensitive in Egypt's data protection law (Law 151 of 2020). Usage analytics from a Christian prayer app tied to a device can be an inference of religion, especially in a minority-sensitive context, even if no text is sent. **[T]** (legal point: confirm with counsel; not legal advice.)
- Crash reports are unreadable because dSYM/Hermes source maps/R8 mapping were never uploaded. **[T]**

**Why it happens:**
Firebase "just works" with defaults tuned for ad-supported apps, and the privacy promise is made in the PRD but not enforced in code.

**How to avoid:**
Wrap Firebase in one `track(event: AllowedEvent)` function with a **closed enum of event names and no free-form properties** (typed so arbitrary strings fail compilation). Disable automatic screen-view collection and send only a fixed set of screen names. Never call `setUserId`. Disable ad ID / ad personalization signals and Google Signals; do not link the IDFA module. Add a `scrubError()` that replaces error messages with codes before `recordError`; run the Drizzle logger and any `console.*` only in `__DEV__`. Ship Analytics **off until the user opts in** (one gentle line in onboarding or Settings), and Crashlytics on with clear disclosure (or also opt-in); set `setCrashlyticsCollectionEnabled(!__DEV__)`. Keep GA4 data retention at the minimum. Set up symbol/source-map upload in the EAS build pipeline and verify with a deliberate test crash on a release build. Make the privacy policy and both stores' disclosures match this exact behavior. Add a CI grep that fails the build on `analytics()`/`crashlytics()` usage outside the wrapper.

**Warning signs:**
`analytics().logEvent(name, params)` called directly in screens. Screen names derived from `usePathname()`. Release crash reports showing minified JS frames.

**Phase to address:** P0 (wrapper and policy), P8 (store forms and verification), with enforcement in every phase.

---

### Pitfall 16: Store review failures that are predictable from this app's shape

**What goes wrong:**
1. **Backend unavailable during review.** First launch requires internet and the backend; if Dokploy is down, the DB has no content, or the review team's US network is blocked/throttled by rate limiting or geo rules, the reviewer sees the "turn on the internet" screen forever: rejection under 2.1 (App Completeness).
2. **Sign in with Apple / login services (Guideline 4.8).** Since the January 2024 revision, Sign in with Apple is not literally required, but apps that use a third-party login to set up or authenticate the user's **primary account** must offer an equivalent privacy-preserving option. **[V]** Ro'i has no account, and Google is only for optional backup, so it should be exempt, but reviewers read quickly and forum reports show vague rejections. Needs a prepared explanation and a fallback plan.
3. **Privacy manifest / required-reason APIs and third-party SDK signatures.** Statically linked libraries need manifests supplied through `expo.ios.privacyManifests`; missing entries trigger App Store Connect warnings or rejection. **[V partial]**
4. **Privacy labels and Play Data Safety not matching SDK behavior** (Firebase collects crash data, diagnostics, device identifiers, app interactions; Google Sign-In collects email).
5. **Encryption export compliance.** Missing `ITSAppUsesNonExemptEncryption=false` prompts on every upload; HTTPS-only use normally qualifies as exempt.
6. **Vague permission purpose strings** (microphone, notifications) or none localized/consistent.
7. **Google Play new-personal-account rule:** a closed test with at least 12 opted-in testers for 14 continuous days before production access; rejection restarts the clock. **[V]** This puts at least two weeks on the critical path. Organization accounts are exempt but require a D-U-N-S number that can take weeks.
8. **Android 15 16 KB page-size requirement** and the current target API requirement can reject an upload that includes an older native library. **[T]**
9. **User-generated content (Guideline 1.2)** for "suggest to everyone": acceptable when moderated before publication, but needs visible contact info and a reporting/contact path.
10. **Android `allowBackup`** left true uploads the private DB to the user's Google backup and restores a stale DB over a fresh install, contradicting the privacy claim and fighting Drive sync.

**Why it happens:**
Release prep is left to the end, and the first-launch-needs-internet decision converts any server hiccup into a store rejection.

**How to avoid:**
- Treat the backend as part of the release: uptime monitor and alert, production content imported before the first submission, a health endpoint, and Apple/Google IP ranges not rate-limited (limit by device ID and per-IP at generous thresholds). Put the pre-built content files behind a CDN or static host, with GraphQL only for deltas. Re-evaluate bundling a minimal seed (the owner decided not to; flag the single-point-of-failure consequence in the roadmap).
- Prepare English **App Review Notes** that explain: no account, Google optional and for Drive backup only, first launch needs internet, how to proceed, widgets, and contact.
- Maintain `privacyManifests`, `usesNonExemptEncryption: false`, localized purpose strings (Expo `locales`), `android.blockedPermissions`, `allowBackup: false` (or explicit `dataExtractionRules`) in app config, reviewed each release.
- Fill privacy forms from a single source-of-truth table of "what each SDK collects" built in P8.
- Start the Play closed-test clock the moment a stable internal build exists (a P2/P3-era build is enough); recruit testers early.
- Publish privacy policy at a stable HTTPS URL before the first OAuth/TestFlight external build.

**Warning signs:**
No uptime monitor. No review notes draft. App config with no `privacyManifests` section. Play Console account type unknown. "We'll do store forms last week."

**Phase to address:** P0 (accounts, identity, policy URL), P1 (backend uptime and review-safe limits), P8 (forms, notes, submission), with the Play clock started around P3.

---

### Pitfall 17: SQLite on Dokploy: lost data on redeploy, corrupt backups, and two writers

**What goes wrong:**
The DB lives inside the container filesystem and vanishes on redeploy. Or it is on a volume but backups copy the `.db` file while WAL is active (file plus `-wal`/`-shm`), producing a backup that is missing recent writes or corrupt. A start-first rolling deploy briefly runs old and new containers against the same file, or replicas > 1 with an in-memory cache that diverges. A network filesystem breaks WAL locking. `better-sqlite3` compiled on Alpine (musl) or an architecture mismatch fails at container start. A failing auto-migration at startup crash-loops the only instance. After the Sanity import, the DB is the **only** copy of the content; the Sanity project may then be abandoned.

**Why it happens:**
SQLite is treated as "just a file". Dokploy's volume and deployment settings are defaults.

**How to avoid:**
Mount a persistent volume at a fixed path (for example `/data/app.db`) and verify with a redeploy test during P1. One replica, stop-first update order. WAL mode, `busy_timeout`, `synchronous=NORMAL`. Back up with the SQLite online backup API or `VACUUM INTO` (or Litestream to S3-compatible storage), scheduled and **restore-tested** once; keep the backup off the same host. Use a Debian/glibc Node image (or verified prebuilt binaries) for `better-sqlite3`. Run migrations before the server starts accepting traffic with a clear failure log. Keep a versioned **content seed export** (JSON from the admin) in git or object storage so content can be rebuilt. Keep the Sanity dataset and an NDJSON export archived until a restore from backup has been proven in production.

**Warning signs:**
DB path under `/app`. `cp app.db` in a backup cron. Deploy logs showing two containers overlapping. No documented restore procedure.

**Phase to address:** P1.

---

### Pitfall 18: GraphQL abuse and rate limiting that does not actually work behind the proxy

**What goes wrong:**
- `@nestjs/throttler` with GraphQL needs a custom `getRequest` based on the GraphQL execution context; the default HTTP-based guard does not see the request and either errors or does nothing. **[T]**
- Behind Dokploy's reverse proxy (Traefik), without `trust proxy` every client appears to have the proxy's IP: one abuser throttles everyone, or limits are never reached per client.
- Limiting by HTTP request count is bypassed by GraphQL **aliases and batching**: one request containing 500 aliased `submitSuggestion` mutations.
- The anonymous device ID is client-supplied and trivially rotated, so it is not an abuse control on its own.
- Suggestion inbox flooding or stored XSS/bidi-override spoofing (U+202E) in text that the admin panel then renders.
- Introspection disabled in production but the Apollo sandbox/landing page left on. Helmet's default CSP breaking the admin SPA. CORS treated as a security control (it only constrains browsers).
- Admin auth: ID-token verification skipping `aud`/`iss`/`email_verified`; allowlist compared case-sensitively or by a Gmail-aliasable address; cookie-based sessions without CSRF protection on GraphQL mutations.
- Serving a multi-MB pre-built JSON through GraphQL as a string scalar without compression or ETag.

**Why it happens:**
Defaults work in local dev with no proxy and one client.

**How to avoid:**
Configure `trust proxy` for the Traefik hop and test with two real IPs. Rate-limit per IP at the proxy and per operation in the app (custom throttler for the GraphQL context, much stricter for mutations). Disable query batching, cap alias count, depth, and complexity (for example graphql-armor or equivalent); cap request body size. Per device: a daily submission cap and a pending-queue cap; globally: a pending-queue ceiling and an admin bulk-reject action. Suggestions are **plain text only**, length-limited, stripped of Unicode format/control characters except the safe set (RLM/LRM/ZWNJ/ZWJ), and always rendered escaped in the admin. Verify Google ID tokens fully (signature, `aud` = your client ID, `iss`, `exp`, `email_verified`), compare normalized lowercase emails, bind the session to the Google `sub` after first login, use httpOnly + SameSite cookies, and require a custom header or JSON content type to block CSRF. Apply compression and `ETag`/`Cache-Control` to the content endpoint (or serve the files as static assets). Keep an append-only admin audit log.

**Warning signs:**
Throttler tests only with curl from localhost. One IP in every log line. A schema that accepts arrays of mutations in one document without limits.

**Phase to address:** P1.

---

### Pitfall 19: Sanity import that loses structure or corrupts the personalization token

**What goes wrong:**
Portable Text blocks are flattened to plain text (losing lists, emphasis, links) or converted to HTML the RN app cannot render. The `{الاسم}` token is split across marked spans (`{` in one span, `الاسم}` in the next) or mangled by bidi display and copy-paste, so the zod "only `{الاسم}` allowed" validation rejects or, worse, passes broken content. Draft and published documents (`drafts.` prefix) are both imported, producing duplicates. Re-running the import creates duplicates because Sanity `_id` was not kept as an external ID. Image/asset references point at Sanity's CDN. Text arrives unnormalized (inconsistent diacritic ordering, tatweel, stray bidi controls). There is no `textFemale` in Sanity, so every item is "shared" until someone writes female variants.

**Why it happens:**
Import is written as a one-off script and run once on trust.

**How to avoid:**
Define the **canonical stored rich-text format first** (a small JSON AST or restricted Markdown, with marks limited to what the mobile renderer and admin editor both support), and make the admin preview use the same renderer logic as the app so they cannot drift. Make the importer **idempotent** (keep Sanity `_id` as `externalId`, upsert), skip `drafts.*`, run `normalizeArabic`-style canonicalization (NFC, strip bidi controls and tatweel in non-display fields), validate every item with the shared zod schema, and **fail loudly** with a report (counts, rejected items with reasons, tokens found per item). Dry-run first and review a sample by eye on a device, including fully voweled verses. Handle assets by downloading them or dropping them deliberately. Do the import against a staging DB, then export a seed from staging into production.

**Warning signs:**
Importer with no dry-run and no report. Portable Text → `.map(b => b.children.map(c => c.text).join(''))`. A token regex run on rendered, not raw, strings.

**Phase to address:** P1.

---

### Pitfall 20: Native-config collisions in an Expo dev build (Firebase + widgets + Google Sign-In + MMKV + Reanimated)

**What goes wrong:**
React Native Firebase on iOS needs static frameworks (`useFrameworks: "static"` via `expo-build-properties`) **[V]**, and newer RNFB versions have an SPM-versus-static-frameworks conflict that fails the build unless SPM is disabled **[V]**. Static frameworks, a widget extension target, MMKV, Reanimated, and the New Architecture can each break the others. Statically linked libraries need privacy manifests supplied by you **[V]**. `google-services.json`/`GoogleService-Info.plist` leak into the repo or are missing in CI. Prebuild-generated native folders edited by hand are overwritten. RNRepo is beta and prebuilt binaries add a variable to every build failure. A dev client that works locally fails on EAS because of credentials or Podfile ordering. Every native-affecting dependency added late forces a full native rebuild and store-compat retest.

**Why it happens:**
Each library is added in the phase that needs it, so the combined native configuration is first exercised at release time.

**How to avoid:**
P0 includes a **"kitchen-sink build spike"**: one EAS development build and one EAS preview/release build of an empty app that contains **all** native dependencies (Firebase analytics + crashlytics, Google Sign-In, expo-sqlite, MMKV, expo-audio, expo-notifications, expo-widgets on both platforms, Reanimated, keyboard-controller, a custom font), on a real iPhone and a real Android phone. Pin the Expo SDK and RNFB versions. Use only config plugins (never hand-edit `ios/`/`android/`). Store Firebase files as EAS file secrets. Do not enable RNRepo for release builds unless it has been proven in the spike. Decide the OTA story (EAS Update with a fingerprint-based `runtimeVersion` policy, or none) in P0, since it changes how quickly a production bug can be fixed after review.

**Warning signs:**
First `eas build` happens in P8. A dependency added after P0 that has native code. `ios/` committed with manual edits.

**Phase to address:** P0.

---

## Moderate Pitfalls

### Pitfall 21: Device-ID semantics confused across uses
**What goes wrong:** One "device ID" serves as verse seed, abuse key, and analytics ID; reinstall or restore changes it; Android has no persistent keychain equivalent.
**Prevention:** Separate concerns: `userSeed` (synced), `installId` (random UUID in MMKV, for rate-limit hints only), no analytics user ID. Never use hardware IDs.
**Phase:** P0/P2.

### Pitfall 22: Settings and navigation state outside the backup
**What goes wrong:** MMKV holds tile order, notification times, onboarding-complete, and name/gender; the Drive file only contains SQLite rows, so restore lands on a "new user" experience (or onboarding re-appears over restored data).
**Prevention:** Decide one home for user preferences (a synced `settings` table) and keep MMKV only for ephemeral/cache state. Restore must set onboarding-complete.
**Phase:** P0/P7.

### Pitfall 23: First-launch download is not atomic or reachability-aware
**What goes wrong:** NetInfo reports connected on a captive portal or dead Wi-Fi; the download fails halfway; thousands of single `await insert()` calls make first launch take minutes.
**Prevention:** Detect failure by actual request, not NetInfo alone; show progress; insert in one transaction with batched/prepared statements; write `contentVersion` last; retry with backoff and keep the friendly screen. Sequence: content download, then optional restore, then onboarding.
**Phase:** P2.

### Pitfall 24: Missing name/gender fallback in composition
**What goes wrong:** `{الاسم}` shows raw braces when the user skipped the name; gender unset picks the wrong form; the name is substituted inside rich-text marks.
**Prevention:** One `compose(item, profile)` function with defined fallbacks (no name: use a neutral phrase or drop the token cleanly; no gender: shared text), applied to every surface including widgets, notifications, copy-to-share, and recorded text; unit-tested; never leave raw braces.
**Phase:** P2.

### Pitfall 25: Unbounded backlog and guilt-inducing UI
**What goes wrong:** Streak resets, red "overdue 63" counters, and daily "you missed" notifications contradict the core value ("without guilt").
**Prevention:** Cap displayed work, soften copy, no streak-loss messaging, optional pause. Write a tone checklist for notification and empty-state copy.
**Phase:** P3/P4/P5.

### Pitfall 26: NativeWind / React Native Reusables overlays in RTL
**What goes wrong:** Popovers, dropdowns, selects, and dialogs positioned from physical coordinates open on the wrong side; portal content ignores the RTL root; keyboard-controller offsets are mirrored; FlashList horizontal lists start at the wrong edge; `numColumns` grid order reads backwards for the tile grid.
**Prevention:** Include each overlay component in the RTL checklist as it is first used; wrap the portal host in the same direction context; test tile reorder with gestures; treat grid order as logical (index), not left/right.
**Phase:** P0 (component audit), P5 (home grid).

### Pitfall 27: Coach-mark overlay measurement in RTL
**What goes wrong:** Spotlight positions computed from `measure`/`measureInWindow` are off on Android in RTL for some RN versions; marks highlight the wrong element.
**Prevention:** **[SPIKE]** on a real Android device before choosing a coach-mark library; if unreliable, anchor marks by layout containers instead of absolute coordinates.
**Phase:** P5.

### Pitfall 28: Time-zone data and Egypt DST
**What goes wrong:** Egypt reinstated DST in 2023; older Android devices without updated tzdata compute local time incorrectly, so "today" is off by an hour around transitions and daily reminders fire at the wrong time.
**Prevention:** Use device local time APIs only (no hard-coded offset), rollover at 4 AM rather than midnight to absorb hour shifts, and test day-boundary logic with fake clocks across the DST transition dates. **[T]**
**Phase:** P0 utilities, P3/P5.

### Pitfall 29: Sensitive data at rest and in the app switcher
**What goes wrong:** Prayer lists are plaintext in SQLite, visible in the app-switcher snapshot, included in iOS device/iCloud backups, and readable by anyone who unlocks the phone, in a context where privacy matters for a religious minority.
**Prevention:** Decide explicitly in P0: (a) optional app lock (biometric/PIN), (b) blur on background, (c) SQLCipher via expo-sqlite config or accept plaintext and document why, (d) iCloud-backup exclusion for recordings. Design the Drive file header so optional client-side encryption can be added later without a format break.
**Phase:** P0 decision, P8 implementation.

### Pitfall 30: Drive file shape and quotas
**What goes wrong:** The entire dataset is re-uploaded on every foreground; recordings accumulate in the user's Drive quota without telling them; the `appdata` folder is cleared by the user in Drive settings and the app does not notice.
**Prevention:** Dirty flag + gzip + upload only when changed; show backup size; Wi-Fi-only for audio; treat "remote file missing after previously existing" as an explicit state and ask before re-uploading.
**Phase:** P7.

### Pitfall 31: Home-screen name and Arabic app name rendering
**What goes wrong:** The Arabic display name is truncated or wrongly ordered in launchers, App Store name conflicts, or localized Info.plist strings are missing so the name shows English on some devices.
**Prevention:** Set display names through config (localized), check on iOS and several Android launchers, and reserve the store name early.
**Phase:** P0/P8.

---

## Minor Pitfalls

### Pitfall 32: Zustand/TanStack Query double sources of truth
**What goes wrong:** Local SQLite data cached in TanStack Query and mirrored in Zustand, with stale lists after a sync merge.
**Prevention:** SQLite is the source of truth; use Drizzle live queries or one invalidation point after writes/syncs; reserve TanStack Query for network (content API).
**Phase:** P0.

### Pitfall 33: Long-press copy/share exports raw tokens or markup
**What goes wrong:** Shared text contains `{الاسم}` or editor markup.
**Prevention:** Share only through `compose()` output plus plain-text serializer, with reference formatted via the bidi helper and no tracking.
**Phase:** P2.

### Pitfall 34: Dark mode, status bar, and widget parity
**What goes wrong:** Dark theme missing in widgets or on native components; low-contrast Arabic text with thin fonts.
**Prevention:** Include widgets and native alerts in the dark-mode checklist; choose a font weight that survives small sizes.
**Phase:** P0/P6.

### Pitfall 35: Store screenshots and metadata not RTL-reviewed
**What goes wrong:** Screenshot frames mirrored incorrectly; store text truncated.
**Prevention:** Generate screenshots from real RTL builds; proof Arabic store metadata with a native reader.
**Phase:** P8.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Integer auto-increment IDs on user tables | Simpler inserts | Merge collisions; forced migration with live data | Never |
| Hard-delete user records | Less code | Resurrected deletes after sync; no undo | Never |
| Store absolute file URIs | Works in dev | Broken after update/restore | Never |
| Derive weekly verse by pure function of seed + period | No table | Verse flips when pool changes; repeats | Never |
| Skip `normalizeArabic` and use raw `LIKE` | Fast to ship | Search "doesn't work"; reimport required | Never |
| Per-feature analytics calls | Fast instrumentation | Privacy leak surface | Never |
| Hand-edited `ios/` / `android/` | Fixes a build fast | Overwritten by prebuild; unreproducible | Only as a one-time debugging experiment, never committed |
| Raw `.db` file as the Drive backup | Trivial implementation | Unmergeable, version-fragile | Never (record-level JSON) |
| One physical-direction NativeWind class "just this once" | Faster styling | RTL regressions invisible on Arabic test phones | Never; lint it |
| Skipping the staged Sanity import dry-run | Saves hours | Corrupted content in production | Never |
| Foreground-only sync without OS background task | Much simpler, more reliable | Slightly staler backups | Acceptable for v1 if the UI says so honestly |
| Bundled-content fallback omitted (owner decision) | Single source of truth | Backend outage = unusable new installs, store rejection risk | Acceptable only with uptime monitor + CDN for pre-built files |
| No FTS5, only normalized `LIKE` | Less complexity | Slow if pool grows to Bible-size | Acceptable while pool is under a few thousand rows |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google consent screen | Leaving status at Testing | Move to In production early; scopes limited to `openid email profile drive.appdata` |
| Google Sign-In (Android) | Registering only debug SHA-1 | Register debug, upload key, and Play App Signing SHA-1; test a Play-installed build |
| Google Sign-In (scopes) | Assuming Drive scope was granted | Inspect granted scopes after sign-in; handle partial grant |
| Drive REST | Using `drive`/`drive.file` scope; writing to My Drive | `spaces=appDataFolder`, `parents:['appDataFolder']`; only `drive.appdata` |
| Drive REST | Blind overwrite of the data file | Check `headRevisionId`/version before update; pull-merge-push |
| Firebase (RNFB) | Default collection on in all builds | Disable in dev; opt-in analytics; wrapper with closed event enum |
| Firebase (iOS) | Static frameworks / SPM mismatch | `useFrameworks: static`, check RNFB's SPM setting, prove in P0 spike |
| expo-notifications | Scheduling per item | One repeating trigger per type, idempotent reconcile on open |
| expo-notifications (Android) | Creating channel after requesting permission, then needing to change importance | Create final channels first; decide importance up front |
| expo-widgets | Expecting hooks/DB access in widget code | Push precomputed snapshots from the app |
| expo-audio | Cache-dir URIs, default presets | Documents dir, relative filenames, explicit AAC m4a |
| expo-sqlite + Drizzle | Missing Metro/babel config for `.sql` migrations in release | Test migrations in a release build |
| NestJS throttler | Using HTTP guard under GraphQL | Custom guard with `GqlExecutionContext`; `trust proxy` behind Traefik |
| Dokploy | DB in container layer; overlapping deploys | Volume mount, one replica, stop-first, tested restore |
| Sanity export | Importing drafts, flattening Portable Text | Skip `drafts.*`, canonical rich-text format, idempotent upsert on `_id` |
| App Store Connect | Privacy labels from memory | Table of per-SDK data collection; update on every SDK change |
| Play Console | Starting closed test at the end | Start 12-tester/14-day clock as soon as a stable build exists |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Per-row `await insert` during first download | First launch takes minutes, UI frozen | Single transaction, batched/prepared statements | A few thousand rows |
| Unmemoized heavy `useLiveQuery` on list screens | Jank on every write/sync | Narrow queries, indexes on `(deletedAt, due)` and `lastPrayedAt`, FlashList with `estimatedItemSize` | Hundreds of cards |
| Variable-height Arabic rich text in FlashList | Jumpy scrolling, wrong item heights | Accurate estimated sizes, avoid nested scroll views | Long articles on low-end Android |
| Full-library re-pull | Wasted data, backend load | Delta by `contentVersion`, precompressed pre-built file | Tens of thousands of installs |
| Large JSON string through GraphQL | High latency, memory spikes | Compression + ETag, or static file hosting for the full export | Multi-MB payloads |
| Uploading entire Drive file every foreground | Battery and quota use | Dirty flag, debounce, gzip | Large recording sets |
| Widget refresh on every mutation | Throttled by OS, battery | Coalesce updates; push on foreground/background transition | Frequent edits |
| SQLite `database is locked` from concurrent contexts | Random write failures | WAL, `busy_timeout`, single serialized write queue | Background task + foreground |
| Reanimated worklets doing JS work for long lists | Dropped frames | Keep gestures on UI thread, simple animated styles | Low-end Android |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Logging DB params or error text containing prayer content | Content leaks into Crashlytics/logs | `scrubError`, logger off outside dev, event wrapper |
| Using email or device ID as analytics user ID | Re-identification | No `setUserId`, ever |
| Plaintext prayers in DB and Drive file | Anyone with device or Drive access reads religious content | Explicit decision on app lock/SQLCipher; encryption-ready file header; disclose in policy |
| Android `allowBackup=true` | Private DB in cloud backup, restore conflicts | Disable or restrict via extraction rules |
| Suggestions rendered unsanitized in admin | Stored XSS, bidi-override spoofing | Plain text only, strip format controls, escape on render |
| Admin allowlist by raw email string | Alias/case bypass | Normalized email + bind to Google `sub` + `email_verified` |
| GraphQL cookie session without CSRF defence | Cross-site admin mutations | SameSite cookies + custom header/JSON-only content type |
| Alias-batched mutations bypass limits | Inbox flooding | Disable batching, alias/complexity caps, per-operation limits |
| Secrets in Docker build args or committed `.env` | Credential leak | Runtime env only; Dokploy env; scan image |
| Firebase config files committed publicly | Key exposure (low impact, but noise) | EAS file secrets, restrict API keys by bundle/package |
| Widgets showing prayer names on lock/home screen | Shoulder-surfing in a sensitive context | Non-sensitive defaults; names opt-in |
| Notification text containing item content | Lock-screen disclosure | Generic copy only |
| No app-switcher blur | Prayer list visible in task switcher | Blur on background (optional setting) |
| Drive tokens stored in MMKV plain | Token theft | SecureStore/Keychain for any refresh token |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Asking for Google sign-in and notification permission up front | Denials, feels like a gate | Value first; ask in context after the first win; clear "later" |
| Dark pattern streaks and overdue counters | Guilt, uninstall | Gentle copy, capped backlog, "welcome back" |
| Raw `{الاسم}` or wrong gender form visible | Breaks the personal feel | `compose()` with fallbacks; chip editor and preview |
| Mixed-direction references that read backwards | Looks broken to Arabic readers | Bidi isolates around references and numbers |
| "Offline" screen without explanation on first launch | Perceived broken app (and review rejection) | Friendly Arabic copy, retry, progress, cause hints |
| Sync status invisible | User trusts a backup that is not working | Settings row with last-success time and actionable error state |
| Widgets showing stale counts | Erodes trust in the "remembers for you" promise | Stale-tolerant wording, push after each mutation |
| Coach marks that block RTL controls | Users stuck | One-time, skippable, replayable from the (?) button |
| Formal Fusha UI copy | Cold tone | Egyptian Arabic for UI; Fusha only for verbatim Scripture (a content-lint check in review) |
| Egyptian vs Arabic-Indic digits inconsistent | Looks sloppy | One digit policy, one formatter |

## "Looks Done But Isn't" Checklist

- [ ] **RTL:** verified on an English-language phone as well as Arabic, on both OSes, including first launch after fresh install.
- [ ] **Arabic text:** fully voweled verses show diacritics unclipped in the chosen font on low-end Android; `letterSpacing` is zero everywhere.
- [ ] **Search:** query without tashkeel finds voweled text; alef/ya variants match.
- [ ] **Recall modes:** first-letter hint never shows an orphan mark; typed answers without tashkeel are accepted.
- [ ] **Migrations:** every historical schema fixture upgrades cleanly in a **release** build on both platforms.
- [ ] **Soft deletes:** no user-data `DELETE` statements remain; tombstones sync.
- [ ] **Drive sync:** second-device restore tested; empty device does not overwrite; revoked access and missing scope show a state; Play-installed build signs in.
- [ ] **OAuth:** consent screen is In production; token still valid after 8+ days.
- [ ] **Background sync:** actually observed to run on a real Android and iOS device (or explicitly dropped).
- [ ] **Verse assignment:** current-week verse does not change after content sync, restore, or timezone change.
- [ ] **FSRS:** due counts stable across a day boundary and DST dates; no minute-level due times; backlog UI is gentle.
- [ ] **Notifications:** pending count under 64 on iOS; fire after reboot on a Samsung/Xiaomi device; denied-permission state handled; no item content in text.
- [ ] **Widgets:** tap deep link works cold and warm; Arabic font and RTL render; stale state degrades gracefully; no prayer names by default; every widget has an Android picker preview.
- [ ] **Audio:** call interruption, backgrounding, permission denied, reinstall + restore all handled; file paths are relative.
- [ ] **Analytics:** no free-form event properties; no auto screen names with paths; test crash on a release build is symbolicated.
- [ ] **Backend:** redeploy keeps data; backup restored once on a clean machine; rate limiting works per client behind Traefik; introspection and sandbox off; admin token verified fully.
- [ ] **Import:** idempotent; token validation report clean; drafts excluded; reviewed on device.
- [ ] **Store:** privacy policy URL live; App Privacy and Data Safety match SDK table; `ITSAppUsesNonExemptEncryption` set; privacy manifests present; review notes written; Play 12-tester clock started; 16 KB alignment check passes; backend healthy at submission time.
- [ ] **Backup config:** Android `allowBackup` decision made; iOS recordings backup decision made.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Missing UUID/tombstone columns in shipped schema | HIGH | Ship a migration adding columns and backfilling UUIDs; one-time re-key; heavy testing on fixture DBs |
| Empty-device overwrote Drive backup | HIGH | Use retained previous revision (Drive revision history) if kept; otherwise data is gone; prevention is the only real fix |
| OAuth stuck in Testing | LOW | Publish to production; users re-authorize once |
| Wrong SHA-1 in release | LOW | Add Play App Signing SHA-1 to the Android client; no app update needed (usually) |
| Bad migration shipped | HIGH | Hotfix release; pre-migration backup file restores users; communicate in-app |
| Verse assignment flipped for existing users | MEDIUM | Ship fix with `assignments` backfilled from current visible value; accept one-time change |
| Analytics leak discovered | MEDIUM | Disable collection remotely (feature flag/Remote Config), request data deletion in Firebase, update policy, ship scrubber |
| Content DB lost on Dokploy | HIGH (LOW with seed export) | Restore from tested backup or reimport seed; if neither exists, re-extract from Sanity |
| Store rejection for backend downtime | LOW | Fix backend, reply in Resolution Center, resubmit; add monitoring |
| Rejection for Guideline 4.8 | MEDIUM | Clarify in notes; if needed, make Google backup clearly secondary or add an equivalent option |
| Notifications silently failing on OEMs | MEDIUM | In-app help + reconcile on open; consider exact-alarm path if truly needed |
| Stale widgets | LOW | Push snapshot on more triggers; rewrite copy to tolerate staleness |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| 1 Sync-readiness in schema | P0 | Schema review: all user tables have UUID/updatedAt/deletedAt; merge unit tests pass |
| 2 Empty-device overwrite / LWW | P7 (merge fn tests from P0) | Two-simulated-device tests; fresh-install restore on real phone |
| 3 OAuth Testing/SHA-1/scope | P0 setup, P7, P8 | Play internal build signs in; token valid after 8 days; partial-scope test |
| 4 Background token without Activity | P7 spike | Spike report; documented decision foreground-only vs background |
| 5 RTL forced/physical directions | P0, every UI phase | English-language device run of every screen; lint passes |
| 6 Bidi, digits, tashkeel clipping | P0, P2, P3 | Torture-fixtures screen reviewed on iOS + low-end Android |
| 7 Arabic search/recall normalization | P0 package, P1, P3 | Unit tests on fully voweled verses; search finds unvoweled queries |
| 8 Content deletes/delta/dangling refs | P1, P2, P3 | Delta-vs-full equivalence test; deleting content does not break cards |
| 9 Verse assignment stability | P0 table, P2 | Pool edit, restore, timezone change do not alter current verse |
| 10 FSRS day boundary/backlog | P3 | Fake-clock tests across midnight/DST; backlog UX review |
| 11 Widget data/staleness/privacy | P0 identity, P6 | Spike results; stale-state review; privacy default check |
| 12 Notification limits/permissions/OEM | P5 | Pending count audit; reboot + OEM test; denied-state UX |
| 13 SQLite migrations | P0, ongoing | Fixture-DB upgrade tests; release-build smoke |
| 14 File paths/audio lifecycle | P3, P7 | Interruption/restore test matrix |
| 15 Analytics/crash privacy | P0 wrapper, P8 | CI grep; release test crash symbolicated; policy matches behavior |
| 16 Store review failures | P0, P1, P8 | Pre-submission checklist; monitor green; review notes ready; Play clock complete |
| 17 Dokploy SQLite durability | P1 | Redeploy persistence test; restore drill |
| 18 GraphQL abuse/rate limits/admin auth | P1 | Abuse test with aliases and two IPs; token-verification tests |
| 19 Sanity import | P1 | Dry-run report; idempotency re-run; device spot-check |
| 20 Native-config collisions | P0 | Kitchen-sink EAS dev + release builds on both platforms |
| 21-24 Moderate (IDs, settings backup, first download, composition) | P0/P2/P7 | Targeted tests listed above |
| 25-28 Moderate (tone, overlays, coach marks, DST) | P3-P5 | Copy review, RTL overlay checklist |
| 29-31 Moderate (data at rest, Drive shape, naming) | P0/P7/P8 | Decision log entries |

## Cross-Cutting Roadmap Recommendations

1. **P0 must be heavier than usual.** Identity (bundle IDs, package name, app group, OAuth clients), the kitchen-sink native build, RTL/bidi/font infrastructure, normalizer package, sync-ready schema with migration tests, analytics wrapper, and the privacy decisions (app lock, encryption) are all expensive to retrofit.
2. **Put research flags on P6 (widgets) and P7 (Drive sync background token).** Both have **[SPIKE]** items. Plan each phase with a first plan that is a time-boxed spike.
3. **Start the Play 12-tester clock early** (around P3, once an internal build is stable), not at release.
4. **Backend uptime is a release dependency**, because first launch requires internet and the reviewer must see content.
5. **Order P3/P4 before P6/P7** but keep the sync-ready and widget-snapshot interfaces defined in P0 so those phases are additive, not invasive.

## Sources

- Expo Widgets (official docs): isolated runtime, Android opt-in subset, data sharing via app group, iOS-only timelines. https://docs.expo.dev/versions/unversioned/sdk/widgets **[V, HIGH]**
- Expo blog on home screen widgets and Live Activities. https://expo.dev/blog/home-screen-widgets-and-live-activities-in-expo **[MEDIUM]**
- Google OAuth consent "Testing" status: authorizations and offline refresh tokens expire after 7 days; 100 test users cap (Google Cloud support page and Google developer group threads). https://support.google.com/cloud/answer/10311615 **[V, HIGH]**
- Apple Guideline 4.8 (Login Services) revision and developer-forum rejections. https://developer.apple.com/forums/thread/765145 and https://9to5mac.com/2024/01/27/sign-in-with-apple-rules-app-store/ **[V, MEDIUM]**; verify against current App Review Guidelines text before submission.
- Google Play personal developer account testing requirement (12 testers, 14 days). https://support.google.com/googleplay/android-developer/answer/14151465 **[V, HIGH]**
- React Native Firebase docs and issues on static frameworks and SPM conflict. https://rnfirebase.io/ and https://github.com/invertase/react-native-firebase/issues/9161 **[V, MEDIUM-HIGH]**
- Expo Apple privacy / privacy manifests guide. https://docs.expo.dev/guides/apple-privacy/ **[MEDIUM]**
- `@react-native-google-signin/google-signin` docs (original vs universal, `getTokens`, `addScopes` platform notes). https://react-native-google-signin.github.io/docs/original **[V, MEDIUM]**; Android Authorization/Credential Manager flow not verified, hence the P7 spike.
- Items marked **[T]** (iOS 64-pending-notification cap, Android notification channel/permission behavior, exact-alarm permission, OEM battery behavior, SQLite `PRAGMA foreign_keys` inside transactions, FTS5 `unicode61` and Arabic marks, Unicode bidi behavior of neutrals, RN RTL transform/gesture behavior, Play 16 KB page-size and target-API rules, Egypt DST/tzdata, Law 151/2020 sensitivity of religious data, `@nestjs/throttler` GraphQL context, Traefik `trust proxy`) come from established platform knowledge and should be confirmed in the owning phase's research before relying on exact numbers or version-specific behavior.

---
*Pitfalls research for: offline-first Arabic RTL spiritual-habit app (Expo + SQLite + widgets + Drive appdata sync) with NestJS/SQLite content backend*
*Researched: 2026-11-24*
