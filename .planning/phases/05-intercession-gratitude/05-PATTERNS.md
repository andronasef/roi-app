# Phase 5: Intercession & Gratitude - Pattern Map

**Mapped:** 2026-11-26
**Files analyzed:** 27 (11 modified, 16 new)
**Analogs found:** 25 / 27

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `app/package.json` | config | config | `app/package.json` | exact |
| `app/app.json` | config | config | `app/app.json` | exact |
| `app/constants/app.ts` | config | config | `app/constants/app.ts` | exact |
| `app/services/storage.ts` | service | CRUD | `app/services/storage.ts` | exact |
| `app/features/db/schema.ts` | model | CRUD | `app/features/db/schema.ts` | exact |
| `app/features/db/events.ts` | service | CRUD | `app/features/db/events.ts` | exact |
| `app/drizzle/0003_*.sql` | migration | CRUD | `app/drizzle/0002_tiresome_mojo.sql` | exact |
| `app/features/db/__tests__/migrate.test.ts` | test | CRUD | `app/features/db/__tests__/migrate.test.ts` | exact |
| `app/features/profile/repository.ts` | service | CRUD | `app/features/profile/repository.ts` | exact |
| `app/features/home/HomeScreen.tsx` | component | request-response | `app/features/home/HomeScreen.tsx` | exact |
| `app/features/settings/SettingsScreen.tsx` | component | CRUD | `app/features/settings/SettingsScreen.tsx` | exact |
| `app/features/intercession/models.ts` | model | transform | `app/features/leyaana/LeyaanaScreen.tsx` | role-match |
| `app/features/intercession/repository.ts` | service | CRUD | `app/features/leyaana/personal-items.ts` | exact |
| `app/features/intercession/__tests__/intercession.test.ts` | test | CRUD | `app/features/leyaana/__tests__/personal-items.test.ts` | exact |
| `app/features/intercession/IntercessionScreen.tsx` | component | CRUD | `app/features/leyaana/LeyaanaScreen.tsx` | exact |
| `app/features/intercession/IntercessionDialogs.tsx` | component | CRUD | `app/features/leyaana/PersonalItemDialog.tsx` | exact |
| `app/app/intercession/index.tsx` | route | request-response | `app/app/leyaana/index.tsx` | exact |
| `app/app/intercession/person.tsx` | route | request-response | `app/app/leyaana/index.tsx` | exact |
| `app/app/intercession/prayer.tsx` | route | request-response | `app/app/leyaana/index.tsx` | exact |
| `app/app/intercession/answered.tsx` | route | request-response | `app/app/leyaana/index.tsx` | exact |
| `app/features/gratitude/models.ts` | model | transform | `app/features/leyaana/LeyaanaScreen.tsx` | role-match |
| `app/features/gratitude/repository.ts` | service | CRUD | `app/features/profile/repository.ts` | exact |
| `app/features/gratitude/__tests__/gratitude.test.ts` | test | CRUD | `app/features/leyaana/__tests__/personal-items.test.ts` | exact |
| `app/features/gratitude/GratitudeScreen.tsx` | component | CRUD | `app/features/leyaana/LeyaanaScreen.tsx` + `app/features/sync/ContentGate.tsx` | role-match |
| `app/app/gratitude.tsx` | route | request-response | `app/app/leyaana/index.tsx` | exact |
| `app/features/notifications/scheduler.ts` | service | event-driven | None (new capability) | no-analog |
| `app/features/notifications/__tests__/scheduler.test.ts` | test | event-driven | `app/features/home/__tests__/home.test.ts` | role-match |

## Pattern Assignments

### `app/features/db/schema.ts` (model, CRUD)

**Analog:** `app/features/db/schema.ts` (modify in place)

**Prayer & PrayerEvents table pattern** (lines 21-39):
```typescript
/** Intercession prayers persisted on device and eligible for Drive sync. */
export const prayers = sqliteTable('prayers', {
  ...syncCols(),
  body: text('body').notNull(),
  personName: text('person_name'),
  sinceLocalDate: text('since_local_date'),
});

/** Append-only prayer events; counts come from live (non-tombstoned) rows. */
export const prayerEvents = sqliteTable(
  'prayer_events',
  {
    ...syncCols(),
    prayerId: text('prayer_id').notNull(),
    prayedAt: integer('prayed_at').notNull(),
    localDate: text('local_date').notNull(),
  },
  (t) => [index('prayer_events_parent_idx').on(t.prayerId, t.deletedAt)],
);
```
- Extend `prayers` with nullable `pinnedAt: integer('pinned_at')`, `answeredAt: integer('answered_at')`, and `outcome: text('outcome')`.
- Extend `prayerEvents` with nullable `note: text('note')`.
- Keep `gratitudeLines` (`localDate` unique + `gratitudeId(localDate)` in lines 63-72) unchanged.

---

### `app/features/db/events.ts` (service, CRUD)

**Analog:** `app/features/db/events.ts` (modify in place)

**Append-only `logPrayed` pattern** (lines 39-59):
```typescript
/** Insert one append-only prayer event and return its UUIDv7 id. */
export function logPrayed(
  db: SyncDatabase,
  clock: Clock,
  prayerId: string,
): string {
  const now = clock.now();
  const id = uuidv7(now, clock.rand);
  db.insert(prayerEvents)
    .values({
      id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      prayerId,
      prayedAt: now,
      localDate: localDateKey(new Date(now)),
    })
    .run();
  return id;
}
```
- Extend signature with optional `note?: string | null` and normalize empty strings to `null` before inserting.

---

### `app/features/db/__tests__/migrate.test.ts` (test, CRUD)

**Analog:** `app/features/db/__tests__/migrate.test.ts` (modify in place)

**Fixture & journal verification pattern** (lines 26-43, 111-114):
```typescript
function readJournalEntryCount(): number {
  const journal = JSON.parse(readFileSync(JOURNAL_PATH, 'utf8')) as Journal;
  return journal.entries.length;
}

describe('fixture database migrations', () => {
  it.each(['v1', 'v2'])(
    'migrates copied fixture %s to latest while keeping all rows, tombstones, and events intact',
    (version) => {
      const tempDir = mkdtempSync(path.join(tmpdir(), 'roi-migrate-'));
      const tempDbPath = path.join(tempDir, `${version}.sqlite`);
      copyFileSync(path.join(FIXTURES_DIR, `${version}.sqlite`), tempDbPath);

      const sqlite = new Database(tempDbPath);
      try {
        const db = drizzle(sqlite, { schema });
        migrate(db, { migrationsFolder: DRIZZLE_DIR });
```
- After running `drizzle-kit generate` for `0003`, verify `v1` and `v2` fixtures migrate cleanly and assert the new `prayers` (`pinnedAt`, `answeredAt`, `outcome`) and `prayer_events` (`note`) columns exist and default to `null`.

---

### `app/constants/app.ts` (config, config)

**Analog:** `app/constants/app.ts` (modify in place)

**Settings keys & routes pattern** (lines 11-26):
```typescript
export const SETTINGS_KEYS = {
  SPIKE_WIDGET: 'spike_widget_count',
  USER_PROFILE: 'user_profile',
  HOME_TILES: 'home_tiles',
  VERSE_SEED: 'verse_seed',
} as const;

export const ROUTES = {
  home: '/',
  settings: '/settings',
  leyaana: '/leyaana',
  leyaanaHistory: '/leyaana/history',
  leyaanaBrowse: '/leyaana/browse',
  torture: '/torture',
  spike: '/spike',
} as const;
```
- Add `INTERCESSION_SORT: 'intercession_sort'` and `GRATITUDE_REMINDER: 'gratitude_reminder'` to `SETTINGS_KEYS`.
- Add `intercession: '/intercession'`, `intercessionPerson: '/intercession/person'`, `intercessionPrayer: '/intercession/prayer'`, `intercessionAnswered: '/intercession/answered'`, and `gratitude: '/gratitude'` to `ROUTES`.

---

### `app/services/storage.ts` (service, CRUD)

**Analog:** `app/services/storage.ts` (modify in place)

**MMKV preference getter/setter pattern** (lines 9-20, 58-72):
```typescript
export const storage = createMMKV({ id: 'roi-preferences' });

export const STORAGE_KEYS = {
  THEME: 'pref.theme',
  // ...
  HOME_INTRO_DISMISSED: 'pref.home_intro_dismissed',
} as const;

export function getHomeIntroDismissed(): boolean {
  return storage.getBoolean(STORAGE_KEYS.HOME_INTRO_DISMISSED) ?? false;
}

export function setHomeIntroDismissed(dismissed: boolean): void {
  storage.set(STORAGE_KEYS.HOME_INTRO_DISMISSED, dismissed);
}
```
- Add `GRATITUDE_NOTIFICATION_ID: 'notif.gratitude_id'` to `STORAGE_KEYS` with `getGratitudeNotificationId()` / `setGratitudeNotificationId()` for device-local OS scheduled notification IDs.

---

### `app/features/profile/repository.ts` & `app/features/home/HomeScreen.tsx` (service & component)

**Analog:** `app/features/profile/repository.ts` (modify in place) & `app/features/home/HomeScreen.tsx` (modify in place)

**Enable Home tools pattern** (`repository.ts` lines 32-34):
```typescript
export const IMPLEMENTED_HOME_TOOLS: ReadonlySet<HomeToolId> =
  new Set<HomeToolId>(['leyaana']);
```
- Update to `new Set<HomeToolId>(['leyaana', 'intercession', 'gratitude'])`.

**Tile route wiring pattern** (`HomeScreen.tsx` lines 50-75):
```typescript
const HOME_TOOL_META: Record<HomeToolId, HomeToolDisplayMeta> = {
  // ...
  intercession: {
    title: 'تشفع',
    subtitle: 'متابعة صلواتك عن الناس',
    icon: HeartHandshake,
    route: ROUTES.home,
  },
  gratitude: {
    title: 'دفتر الشكر',
    subtitle: 'سطر شكر كل يوم',
    icon: NotebookPen,
    route: ROUTES.home,
  },
};
```
- Point `intercession.route` to `ROUTES.intercession` and `gratitude.route` to `ROUTES.gratitude`.

---

### `app/features/intercession/repository.ts` (service, CRUD)

**Analog:** `app/features/leyaana/personal-items.ts`

**Imports & Zod validation pattern** (lines 1-14, 35-41):
```typescript
import { and, desc, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from '@roi/shared';
import { z } from 'zod';

import { softDelete, type Clock, type SyncDatabase } from '../db/events';
import { favorites, personalItems } from '../db/schema';
```

**Insert + select-back pattern** (lines 76-108):
```typescript
export function createPersonalItem(
  db: SyncDatabase,
  clock: Clock,
  input: CreatePersonalItemInput,
): PersonalItemRow {
  const validated = normalizeAndValidatePersonalInput(...);
  const now = clock.now();
  const id = uuidv7(now, clock.rand);

  db.insert(personalItems)
    .values({
      id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      // ...
    })
    .run();

  return db
    .select()
    .from(personalItems)
    .where(eq(personalItems.id, id))
    .get()!;
}
```

**Soft-delete pattern** (lines 160-182):
```typescript
export function deletePersonalItem(
  db: SyncDatabase,
  clock: Clock,
  id: string,
): boolean {
  const existing = db
    .select()
    .from(personalItems)
    .where(and(eq(personalItems.id, id), isNull(personalItems.deletedAt)))
    .get();
  if (!existing) {
    return false;
  }

  softDelete(db, clock, personalItems, id);
  return true;
}
```
- Apply this exact structure for `createPrayer`, `updatePrayer`, `togglePinPrayer`, `markPrayerAnswered`, `reopenPrayer`, `deletePrayer` (soft-deleting prayer + its live `prayerEvents`), and `logBatchPrayed`.

---

### `app/features/gratitude/repository.ts` (service, CRUD)

**Analog:** `app/features/profile/repository.ts` (`upsertSettingValue`) + `app/features/db/events.ts` (`softDelete`)

**Natural-key upsert pattern** (`app/features/profile/repository.ts` lines 74-98):
```typescript
function upsertSettingValue(
  db: SyncDatabase,
  clock: Clock,
  key: string,
  value: string,
): void {
  const now = clock.now();
  db.insert(settings)
    .values({
      id: key,
      value,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: {
        value,
        updatedAt: now,
        deletedAt: null,
      },
    })
    .run();
}
```
- Use `gratitudeId(localDate)` as the `id` in `gratitudeLines` with `.onConflictDoUpdate({ target: gratitudeLines.id, set: { body, updatedAt: now, deletedAt: null } })` to revive soft-deleted rows cleanly without violating `local_date` uniqueness.
- When `body.trim() === ''`, call `softDelete(db, clock, gratitudeLines, gratitudeId(localDate))`.

---

### `app/features/intercession/__tests__/intercession.test.ts` & `app/features/gratitude/__tests__/gratitude.test.ts` (test, CRUD)

**Analog:** `app/features/leyaana/__tests__/personal-items.test.ts`

**Deterministic clock & in-memory migrated SQLite pattern** (lines 20-47):
```typescript
const MIGRATIONS_FOLDER = path.resolve(__dirname, '../../../drizzle');

function createDeterministicClock(startMs = 1_763_769_600_000): Clock {
  let currentMs = startMs;
  let counter = 1;
  return {
    now: () => {
      const value = currentMs;
      currentMs += 1_000;
      return value;
    },
    rand: (n: number) => {
      const bytes = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        bytes[i] = (counter + i) & 0xff;
      }
      counter += 1;
      return bytes;
    },
  };
}

function openMigratedMemoryDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return { sqlite, db };
}
```

---

### `app/features/intercession/IntercessionScreen.tsx` & `app/features/gratitude/GratitudeScreen.tsx` (component, CRUD)

**Analog:** `app/features/leyaana/LeyaanaScreen.tsx` (header, tabs, `useFocusEffect`, toast) + `app/features/sync/ContentGate.tsx` (Reanimated)

**Imports & Arabic formatting pattern** (`LeyaanaScreen.tsx` lines 1-39):
```typescript
import {
  EGYPTIAN_MONTHS,
  formatArabicDate,
  personalize,
  toArabicDigits,
} from '@roi/shared';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '../../components/ui/icon';
import { Text } from '../../components/ui/text';
import { ROUTES } from '../../constants/app';
import { MAX_FONT_SIZE_MULTIPLIER } from '../../constants/theme';
```

**Reanimated imports pattern** (`ContentGate.tsx` lines 15-20):
```typescript
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
```

---

### `app/app/intercession/*.tsx` & `app/app/gratitude.tsx` (route, request-response)

**Analog:** `app/app/leyaana/index.tsx` (lines 1-5):
```typescript
import { LeyaanaScreen } from '@/features/leyaana/LeyaanaScreen';

export default function LeyaanaRoute() {
  return <LeyaanaScreen />;
}
```
- Keep Expo Router route files as thin wrappers importing screen components from `@/features/intercession/*` and `@/features/gratitude/GratitudeScreen`.

---

### `app/features/settings/SettingsScreen.tsx` (component, CRUD)

**Analog:** `app/features/settings/SettingsScreen.tsx` (modify in place)

**Grouped-card section & radio/toggle pattern** (lines 290-337):
```typescript
{/* Section: ... */}
<View className="gap-3">
  <Text
    accessibilityRole="header"
    maxFontSizeMultiplier={MAX_FONT_SIZE_MULTIPLIER}
    className="text-start text-xl font-bold text-foreground"
  >
    {/* Section Title */}
  </Text>
  <View className="gap-4 rounded-2xl border border-border bg-card p-4">
    {/* Controls with min-h-[44px], accessibilityRole, accessibilityLabel, accessibilityState */}
  </View>
</View>
```
- Add **تشفع** (default sort selector) and **دفتر الشكر** (nightly reminder toggle + time picker) cards following this exact grouped-card structure, sharing the underlying settings repository/modal with the in-tool gear buttons (`D-11`).

## Shared Patterns

### Soft Delete & Append-Only Events (No Hard Deletes)
**Source:** `app/features/db/__tests__/schema.test.ts` (lines 95-109) & `app/features/db/events.ts` (lines 86-156)
**Apply to:** All repository and DB helper files (`intercession/repository.ts`, `gratitude/repository.ts`, `db/events.ts`)
```typescript
const hardDeletePattern = /\b(?:db|tx)\s*\.\s*delete\s*\(/;
```
- Never call `db.delete(...)` anywhere in `app/{app,features,services,hooks}`. Always use `softDelete(db, clock, table, id)` or update `deletedAt` + `updatedAt`.
- Prayer counts and `lastPrayedAt` must always be computed from live (`deletedAt IS NULL`) rows in `prayer_events`, never stored as columns on `prayers`.

### RTL & Accessibility Lint Gate
**Source:** `app/features/home/HomeScreen.tsx` (lines 160-180, 335-341) & `app/eslint.config.js`
**Apply to:** All screen and dialog components
- Use logical Tailwind classes (`text-start`, `ms-*`, `ps-*`, `self-start`) and `MAX_FONT_SIZE_MULTIPLIER` on headings/inputs.
- Every `Pressable` and `Switch` must have `min-h-[44px] min-w-[44px]` (for touch targets), `accessibilityRole`, `accessibilityLabel`, and `accessibilityState` (for `disabled` / `checked` / `selected`) to pass `expo lint --max-warnings 0`.

### Privacy-Safe Telemetry
**Source:** `app/constants/telemetry.ts` (lines 11-23) & `app/features/settings/SettingsScreen.tsx` (lines 170-174)
**Apply to:** `intercession/repository.ts` / UI handlers and `gratitude/repository.ts` / UI handlers
```typescript
try {
  track('prayer_logged'); // or 'gratitude_saved'
} catch {
  // Best-effort telemetry; never pass prayer text, person names, or gratitude lines.
}
```

### Local Calendar Keys & Arabic-Indic Formatting
**Source:** `shared/src/period.ts` & `shared/src/arabic.ts`
**Apply to:** `intercession/models.ts`, `gratitude/models.ts`, and all UI screens
- Use `localDateKey(new Date(now))` and `monthKey(new Date(now))` (never `.toISOString().slice(0, 10)`).
- Use `normalizeArabic()`, `matches()`, `toArabicDigits()`, `formatArabicDate()`, and `EGYPTIAN_MONTHS` (never `Intl.DateTimeFormat`).

## No Analog Found

Files with no close match in the codebase (planner should use `05-RESEARCH.md` patterns):

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `app/features/notifications/scheduler.ts` | service | event-driven | `expo-notifications` is newly added in Phase 5; use `05-RESEARCH.md` Pattern 5 (`SchedulableTriggerInputTypes.DAILY`, Android channel, `setNotificationHandler`) + `app/services/storage.ts` MMKV ID persistence |
| `app/features/gratitude/GratitudeScreen.tsx` (expandable editor overlay) | component | UI animation | Existing Reanimated usage in `ContentGate.tsx` is a progress bar; full-screen expandable editor overlay should follow `05-RESEARCH.md` Pattern 4 (`useSharedValue` + `withTiming` + `ReduceMotion`) |

## Metadata

**Analog search scope:** `app/app/`, `app/features/`, `app/constants/`, `app/services/`, `app/components/`, `app/drizzle/`
**Files scanned:** 18
**Pattern extraction date:** 2026-11-26
