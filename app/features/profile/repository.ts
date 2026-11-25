import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { uuidv7 } from '@roi/shared';

import { SETTINGS_KEYS } from '../../constants/app';
import type { Clock, SyncDatabase } from '../db/events';
import { settings } from '../db/schema';

export type Gender = 'male' | 'female';

export const userProfileSchema = z.object({
  name: z.string(),
  gender: z.enum(['male', 'female']),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: '',
  gender: 'male',
};

export const HOME_TOOL_IDS = [
  'leyaana',
  'memorize',
  'intercession',
  'gratitude',
] as const;

export type HomeToolId = (typeof HOME_TOOL_IDS)[number];

/** Phase 5 enables ليا أنا, تشفع, and دفتر الشكر; حفظ الآيات stays hidden until Phase 6 (D-13). */
export const IMPLEMENTED_HOME_TOOLS: ReadonlySet<HomeToolId> =
  new Set<HomeToolId>(['leyaana', 'intercession', 'gratitude']);

export const LAST_VISIBLE_TOOL_ERROR =
  'لازم تفضل أداة واحدة ظاهرة على الأقل في الشاشة الرئيسية';

export const homeTileSchema = z.object({
  id: z.enum(HOME_TOOL_IDS),
  visible: z.boolean(),
  order: z.number().int().nonnegative(),
});

export const homeTilesSchema = z.array(homeTileSchema).min(1);

export type HomeTileConfig = z.infer<typeof homeTileSchema>;

export const DEFAULT_HOME_TILES: readonly HomeTileConfig[] = [
  { id: 'leyaana', visible: true, order: 0 },
  { id: 'memorize', visible: true, order: 1 },
  { id: 'intercession', visible: true, order: 2 },
  { id: 'gratitude', visible: true, order: 3 },
];

export type ToggleHomeTileResult =
  | { ok: true; tiles: HomeTileConfig[] }
  | {
      ok: false;
      reason: 'last_visible' | 'not_found';
      message: string;
      tiles: HomeTileConfig[];
    };

function readSettingValue(db: SyncDatabase, key: string): string | null {
  const row = db
    .select({ value: settings.value })
    .from(settings)
    .where(and(eq(settings.id, key), isNull(settings.deletedAt)))
    .get();
  return row?.value ?? null;
}

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

function parseJsonSafe(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeHomeTiles(
  raw: unknown,
  implementedTools: ReadonlySet<HomeToolId> = IMPLEMENTED_HOME_TOOLS,
): HomeTileConfig[] {
  const parsed = homeTilesSchema.safeParse(raw);
  if (!parsed.success) {
    return DEFAULT_HOME_TILES.map((tile) => ({ ...tile }));
  }

  const byId = new Map<HomeToolId, HomeTileConfig>();
  for (const tile of parsed.data) {
    if (!byId.has(tile.id)) {
      byId.set(tile.id, { ...tile });
    }
  }

  const canonicalIndex = new Map<HomeToolId, number>(
    HOME_TOOL_IDS.map((id, index) => [id, index]),
  );

  const complete = HOME_TOOL_IDS.map((id, index) => {
    const existing = byId.get(id);
    return existing
      ? { ...existing }
      : { id, visible: true, order: index };
  });

  complete.sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return (canonicalIndex.get(a.id) ?? 0) - (canonicalIndex.get(b.id) ?? 0);
  });

  const reindexed = complete.map((tile, index) => ({
    ...tile,
    order: index,
  }));

  // Ensure corrupted configs cannot leave zero visible implemented tools.
  const hasVisibleImplemented = reindexed.some(
    (tile) => implementedTools.has(tile.id) && tile.visible,
  );
  if (!hasVisibleImplemented) {
    const firstImplemented = reindexed.find((tile) =>
      implementedTools.has(tile.id),
    );
    if (firstImplemented) {
      firstImplemented.visible = true;
    }
  }

  return reindexed;
}

/** Read the syncable user profile from SQLite settings with safe canonical defaults. */
export function readUserProfile(db: SyncDatabase): UserProfile {
  const raw = readSettingValue(db, SETTINGS_KEYS.USER_PROFILE);
  if (!raw) {
    return { ...DEFAULT_USER_PROFILE };
  }
  const parsed = userProfileSchema.safeParse(parseJsonSafe(raw));
  if (!parsed.success) {
    return { ...DEFAULT_USER_PROFILE };
  }
  return {
    name: parsed.data.name.trim(),
    gender: parsed.data.gender,
  };
}

/** Persist the user's name and gender into the syncable SQLite settings table. */
export function saveUserProfile(
  db: SyncDatabase,
  clock: Clock,
  profile: UserProfile,
): UserProfile {
  const validated = userProfileSchema.parse({
    name: profile.name.trim(),
    gender: profile.gender,
  });
  upsertSettingValue(
    db,
    clock,
    SETTINGS_KEYS.USER_PROFILE,
    JSON.stringify(validated),
  );
  return validated;
}

/** Read all 4 canonical Home tile configs from SQLite settings with safe fallback. */
export function readHomeTiles(db: SyncDatabase): HomeTileConfig[] {
  const raw = readSettingValue(db, SETTINGS_KEYS.HOME_TILES);
  if (!raw) {
    return DEFAULT_HOME_TILES.map((tile) => ({ ...tile }));
  }
  return normalizeHomeTiles(parseJsonSafe(raw));
}

/** Persist normalized Home tile configs to the syncable SQLite settings table. */
export function saveHomeTiles(
  db: SyncDatabase,
  clock: Clock,
  tiles: readonly HomeTileConfig[],
  implementedTools: ReadonlySet<HomeToolId> = IMPLEMENTED_HOME_TOOLS,
): HomeTileConfig[] {
  const normalized = normalizeHomeTiles(tiles, implementedTools);
  upsertSettingValue(
    db,
    clock,
    SETTINGS_KEYS.HOME_TILES,
    JSON.stringify(normalized),
  );
  return normalized;
}

/**
 * Filter Home tiles to implemented tools that are visible, ordered by `order` ascending.
 * All 4 tool configs remain persisted in SQLite settings even when unbuilt tools are hidden (D-06).
 */
export function getVisibleHomeTools(
  tiles: readonly HomeTileConfig[],
  implementedTools: ReadonlySet<HomeToolId> = IMPLEMENTED_HOME_TOOLS,
): HomeTileConfig[] {
  return [...tiles]
    .filter((tile) => implementedTools.has(tile.id) && tile.visible)
    .sort((a, b) => a.order - b.order);
}

/**
 * Toggle visibility of a Home tile, refusing to hide the last visible implemented tool (D-07).
 */
export function toggleHomeTileVisibility(
  db: SyncDatabase,
  clock: Clock,
  toolId: HomeToolId,
  implementedTools: ReadonlySet<HomeToolId> = IMPLEMENTED_HOME_TOOLS,
): ToggleHomeTileResult {
  const current = readHomeTiles(db);
  const target = current.find((tile) => tile.id === toolId);
  if (!target) {
    return {
      ok: false,
      reason: 'not_found',
      message: LAST_VISIBLE_TOOL_ERROR,
      tiles: current,
    };
  }

  const nextVisible = !target.visible;
  if (!nextVisible && implementedTools.has(toolId)) {
    const remainingVisibleImplemented = current.filter(
      (tile) =>
        implementedTools.has(tile.id) && tile.id !== toolId && tile.visible,
    );
    if (remainingVisibleImplemented.length === 0) {
      return {
        ok: false,
        reason: 'last_visible',
        message: LAST_VISIBLE_TOOL_ERROR,
        tiles: current,
      };
    }
  }

  const updated = current.map((tile) =>
    tile.id === toolId ? { ...tile, visible: nextVisible } : tile,
  );
  const saved = saveHomeTiles(db, clock, updated, implementedTools);
  return { ok: true, tiles: saved };
}

/**
 * Move a Home tile one step up or down and persist the deterministic 0..3 order to SQLite settings.
 */
export function moveHomeTile(
  db: SyncDatabase,
  clock: Clock,
  toolId: HomeToolId,
  direction: 'up' | 'down',
  scopeTools?: ReadonlySet<HomeToolId>,
): HomeTileConfig[] {
  const current = readHomeTiles(db);
  const eligibleIndices = current
    .map((tile, index) => ({ tile, index }))
    .filter(({ tile }) => !scopeTools || scopeTools.has(tile.id))
    .map(({ index }) => index);

  const posInScope = eligibleIndices.findIndex(
    (index) => current[index]?.id === toolId,
  );
  if (posInScope === -1) {
    return current;
  }

  const swapPosInScope = direction === 'up' ? posInScope - 1 : posInScope + 1;
  if (swapPosInScope < 0 || swapPosInScope >= eligibleIndices.length) {
    return current;
  }

  const fromIndex = eligibleIndices[posInScope]!;
  const toIndex = eligibleIndices[swapPosInScope]!;
  const next = current.map((tile) => ({ ...tile }));
  const temp = next[fromIndex]!;
  next[fromIndex] = next[toIndex]!;
  next[toIndex] = temp;

  const reindexed = next.map((tile, index) => ({ ...tile, order: index }));
  return saveHomeTiles(db, clock, reindexed);
}

/**
 * Read or lazily create the per-user deterministic verse seed stored in syncable SQLite settings.
 */
export function readOrCreateVerseSeed(db: SyncDatabase, clock: Clock): string {
  const existing = readSettingValue(db, SETTINGS_KEYS.VERSE_SEED);
  if (existing && existing.trim().length > 0) {
    return existing;
  }
  const seed = uuidv7(clock.now(), clock.rand);
  upsertSettingValue(db, clock, SETTINGS_KEYS.VERSE_SEED, seed);
  return seed;
}
