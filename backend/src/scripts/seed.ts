import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  seedContentFileSchema,
  uuidv7,
  type SeedBlessingItem,
  type SeedNameOfGodItem,
  type SeedVerseItem,
} from '@roi/shared';
import type Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { loadEnv } from '../config/env';
import { resolveBackendPath } from '../config/paths';
import { rebuildAllSnapshots } from '../content/snapshot-builder';
import {
  CONTENT_META_SINGLETON_ID,
  openBackendDatabase,
  type BackendDatabase,
} from '../db/client';
import { auditLog, blessings, contentMeta, namesOfGod, verses } from '../db/schema';

export interface RunSeedOptions {
  readonly db: BackendDatabase;
  readonly sqlite: Database.Database;
  readonly dataDir: string;
  readonly filePath?: string;
  readonly dryRun?: boolean;
  readonly actorEmail?: string;
  readonly nowMs?: number;
}

export interface KindDiffCounts {
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
}

export interface SeedResult {
  readonly dryRun: boolean;
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly contentVersion: number;
  readonly byKind: {
    readonly verses: KindDiffCounts;
    readonly namesOfGod: KindDiffCounts;
    readonly blessings: KindDiffCounts;
  };
}

interface PlanEntry<TRow> {
  readonly kind: 'insert' | 'update';
  readonly row: TRow;
}

interface ContentPlan<TRow> {
  readonly entries: PlanEntry<TRow>[];
  readonly counts: KindDiffCounts;
}

function serializeTags(tags: string[] | null | undefined): string | null {
  return tags != null ? JSON.stringify(tags) : null;
}

function diffContentItems<TSeed extends { id: string }, TRow extends { id: string }>(
  incoming: readonly TSeed[],
  existingRows: readonly TRow[],
  isSame: (item: TSeed, existing: TRow) => boolean,
  toRow: (item: TSeed, existing: TRow | undefined) => TRow,
): ContentPlan<TRow> {
  const existingById = new Map(existingRows.map((row) => [row.id, row]));
  const entries: PlanEntry<TRow>[] = [];
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  for (const item of incoming) {
    const existing = existingById.get(item.id);
    if (!existing) {
      entries.push({ kind: 'insert', row: toRow(item, undefined) });
      inserted += 1;
      continue;
    }
    if (isSame(item, existing)) {
      unchanged += 1;
      continue;
    }
    entries.push({ kind: 'update', row: toRow(item, existing) });
    updated += 1;
  }

  return {
    entries,
    counts: { inserted, updated, unchanged },
  };
}

function isSameVerse(
  item: SeedVerseItem,
  existing: typeof verses.$inferSelect,
): boolean {
  return (
    existing.ref === item.ref &&
    existing.text === item.text &&
    (existing.textFemale ?? null) === (item.textFemale ?? null) &&
    (existing.sortOrder ?? null) === (item.sortOrder ?? null) &&
    (existing.tagsJson ?? null) === serializeTags(item.tags) &&
    (existing.deletedAt ?? null) === (item.deletedAt ?? null)
  );
}

function isSameNameOfGod(
  item: SeedNameOfGodItem,
  existing: typeof namesOfGod.$inferSelect,
): boolean {
  return (
    existing.title === item.title &&
    existing.text === item.text &&
    (existing.textFemale ?? null) === (item.textFemale ?? null) &&
    (existing.sortOrder ?? null) === (item.sortOrder ?? null) &&
    (existing.tagsJson ?? null) === serializeTags(item.tags) &&
    (existing.deletedAt ?? null) === (item.deletedAt ?? null)
  );
}

function isSameBlessing(
  item: SeedBlessingItem,
  existing: typeof blessings.$inferSelect,
): boolean {
  return (
    existing.title === item.title &&
    existing.text === item.text &&
    (existing.textFemale ?? null) === (item.textFemale ?? null) &&
    (existing.verseRef ?? null) === (item.verseRef ?? null) &&
    (existing.sortOrder ?? null) === (item.sortOrder ?? null) &&
    (existing.tagsJson ?? null) === serializeTags(item.tags) &&
    (existing.deletedAt ?? null) === (item.deletedAt ?? null)
  );
}

/**
 * Validate a local JSON seed file against `@roi/shared` schemas and perform an idempotent,
 * transactional upsert with `content_meta` version bump, `audit_log` entry, and atomic
 * `.json.gz` snapshot rebuild (or compute diff counts without mutating when `dryRun: true`).
 */
export function runSeed(options: RunSeedOptions): SeedResult {
  const {
    db,
    sqlite,
    dataDir,
    filePath = resolveBackendPath('seed', 'initial-content.json'),
    dryRun = false,
    actorEmail = 'cli:seed',
    nowMs = Date.now(),
  } = options;

  const resolvedPath = resolve(filePath);
  const rawJson: unknown = JSON.parse(readFileSync(resolvedPath, 'utf8'));
  const seedData = seedContentFileSchema.parse(rawJson);

  const currentMeta = db
    .select()
    .from(contentMeta)
    .where(eq(contentMeta.id, CONTENT_META_SINGLETON_ID))
    .get();
  const currentVersion = currentMeta?.contentVersion ?? 0;

  const existingVerses = db.select().from(verses).all();
  const existingNames = db.select().from(namesOfGod).all();
  const existingBlessings = db.select().from(blessings).all();

  const nextVersion = currentVersion + 1;

  const versePlan = diffContentItems(
    seedData.verses,
    existingVerses,
    isSameVerse,
    (item, existing) => ({
      id: item.id,
      ref: item.ref,
      text: item.text,
      textFemale: item.textFemale ?? null,
      version: nextVersion,
      sortOrder: item.sortOrder ?? null,
      tagsJson: serializeTags(item.tags),
      createdAt: existing?.createdAt ?? nowMs,
      updatedAt: nowMs,
      deletedAt: item.deletedAt ?? null,
    }),
  );

  const namePlan = diffContentItems(
    seedData.namesOfGod,
    existingNames,
    isSameNameOfGod,
    (item, existing) => ({
      id: item.id,
      title: item.title,
      text: item.text,
      textFemale: item.textFemale ?? null,
      version: nextVersion,
      sortOrder: item.sortOrder ?? null,
      tagsJson: serializeTags(item.tags),
      createdAt: existing?.createdAt ?? nowMs,
      updatedAt: nowMs,
      deletedAt: item.deletedAt ?? null,
    }),
  );

  const blessingPlan = diffContentItems(
    seedData.blessings,
    existingBlessings,
    isSameBlessing,
    (item, existing) => ({
      id: item.id,
      title: item.title,
      text: item.text,
      textFemale: item.textFemale ?? null,
      verseRef: item.verseRef ?? null,
      version: nextVersion,
      sortOrder: item.sortOrder ?? null,
      tagsJson: serializeTags(item.tags),
      createdAt: existing?.createdAt ?? nowMs,
      updatedAt: nowMs,
      deletedAt: item.deletedAt ?? null,
    }),
  );

  const inserted =
    versePlan.counts.inserted +
    namePlan.counts.inserted +
    blessingPlan.counts.inserted;
  const updated =
    versePlan.counts.updated +
    namePlan.counts.updated +
    blessingPlan.counts.updated;
  const unchanged =
    versePlan.counts.unchanged +
    namePlan.counts.unchanged +
    blessingPlan.counts.unchanged;

  const byKind = {
    verses: versePlan.counts,
    namesOfGod: namePlan.counts,
    blessings: blessingPlan.counts,
  };

  if (dryRun || inserted + updated === 0) {
    return {
      dryRun,
      inserted,
      updated,
      unchanged,
      contentVersion: currentVersion,
      byKind,
    };
  }

  const applyTx = sqlite.transaction(() => {
    db.insert(contentMeta)
      .values({
        id: CONTENT_META_SINGLETON_ID,
        contentVersion: nextVersion,
        updatedAt: nowMs,
      })
      .onConflictDoUpdate({
        target: contentMeta.id,
        set: {
          contentVersion: nextVersion,
          updatedAt: nowMs,
        },
      })
      .run();

    for (const entry of versePlan.entries) {
      db.insert(verses)
        .values(entry.row)
        .onConflictDoUpdate({
          target: verses.id,
          set: {
            ref: entry.row.ref,
            text: entry.row.text,
            textFemale: entry.row.textFemale,
            version: entry.row.version,
            sortOrder: entry.row.sortOrder,
            tagsJson: entry.row.tagsJson,
            updatedAt: entry.row.updatedAt,
            deletedAt: entry.row.deletedAt,
          },
        })
        .run();
    }

    for (const entry of namePlan.entries) {
      db.insert(namesOfGod)
        .values(entry.row)
        .onConflictDoUpdate({
          target: namesOfGod.id,
          set: {
            title: entry.row.title,
            text: entry.row.text,
            textFemale: entry.row.textFemale,
            version: entry.row.version,
            sortOrder: entry.row.sortOrder,
            tagsJson: entry.row.tagsJson,
            updatedAt: entry.row.updatedAt,
            deletedAt: entry.row.deletedAt,
          },
        })
        .run();
    }

    for (const entry of blessingPlan.entries) {
      db.insert(blessings)
        .values(entry.row)
        .onConflictDoUpdate({
          target: blessings.id,
          set: {
            title: entry.row.title,
            text: entry.row.text,
            textFemale: entry.row.textFemale,
            verseRef: entry.row.verseRef,
            version: entry.row.version,
            sortOrder: entry.row.sortOrder,
            tagsJson: entry.row.tagsJson,
            updatedAt: entry.row.updatedAt,
            deletedAt: entry.row.deletedAt,
          },
        })
        .run();
    }

    db.insert(auditLog)
      .values({
        id: uuidv7(nowMs, randomBytes),
        actorEmail,
        action: 'seed_import',
        entityType: 'seed',
        entityId: basename(resolvedPath),
        contentVersion: nextVersion,
        summaryJson: JSON.stringify({
          file: basename(resolvedPath),
          inserted,
          updated,
          unchanged,
          byKind,
        }),
        createdAt: nowMs,
      })
      .run();
  });

  applyTx();
  rebuildAllSnapshots(db, dataDir, nowMs);

  return {
    dryRun: false,
    inserted,
    updated,
    unchanged,
    contentVersion: nextVersion,
    byKind,
  };
}

function parseSeedCliArgs(argv: readonly string[]): {
  filePath: string;
  dryRun: boolean;
} {
  let filePath = resolveBackendPath('seed', 'initial-content.json');
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--file') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('Missing path after --file');
      }
      filePath = next;
      i += 1;
    } else if (arg?.startsWith('--file=')) {
      filePath = arg.slice('--file='.length);
    }
  }

  return { filePath, dryRun };
}

function isCliEntrypoint(): boolean {
  if (process.env.VITEST === 'true') {
    return false;
  }
  if (typeof require !== 'undefined' && typeof module !== 'undefined') {
    return require.main === module;
  }
  try {
    if (
      typeof import.meta !== 'undefined' &&
      typeof import.meta.url === 'string' &&
      process.argv[1]
    ) {
      return resolve(fileURLToPath(import.meta.url)) === resolve(process.argv[1]);
    }
  } catch {
    // Ignore when import.meta.url is unavailable in bundled CJS contexts.
  }
  return false;
}

function main(): void {
  const env = loadEnv(process.env);
  const { filePath, dryRun } = parseSeedCliArgs(process.argv.slice(2));
  const handle = openBackendDatabase(env.DATA_DIR);

  try {
    const result = runSeed({
      db: handle.db,
      sqlite: handle.sqlite,
      dataDir: env.DATA_DIR,
      filePath,
      dryRun,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    handle.close();
  }
}

if (isCliEntrypoint()) {
  try {
    main();
  } catch (error) {
    process.stderr.write(
      `Seed failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  }
}
