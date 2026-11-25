import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import {
  blessingItemSchema,
  createSnapshotEnvelopeSchema,
  nameOfGodItemSchema,
  snapshotEnvelopeSchema,
  snapshotTypeSchema,
  verseItemSchema,
  type BlessingItem,
  type NameOfGodItem,
  type SnapshotEnvelope,
  type SnapshotType,
  type VerseItem,
} from '@roi/shared';
import { eq, isNull } from 'drizzle-orm';
import { CONTENT_META_SINGLETON_ID, type BackendDatabase } from '../db/client';
import { blessings, contentMeta, namesOfGod, verses } from '../db/schema';

export interface SnapshotArtifact {
  readonly type: SnapshotType;
  readonly path: string;
  readonly buffer: Buffer;
  readonly etag: string;
  readonly contentVersion: number;
  readonly itemCount: number;
  readonly envelope: SnapshotEnvelope;
}

export interface RebuildSnapshotsResult {
  readonly contentVersion: number;
  readonly generatedAt: number;
  readonly snapshots: Record<SnapshotType, SnapshotArtifact>;
}

const versesEnvelopeSchema = createSnapshotEnvelopeSchema(verseItemSchema);
const namesEnvelopeSchema = createSnapshotEnvelopeSchema(nameOfGodItemSchema);
const blessingsEnvelopeSchema = createSnapshotEnvelopeSchema(blessingItemSchema);

export function parseTagsJson(tagsJson: string | null): string[] | null {
  if (!tagsJson) {
    return null;
  }
  const parsed: unknown = JSON.parse(tagsJson);
  return Array.isArray(parsed) ? (parsed as string[]) : null;
}

function compareContentOrder(
  a: { sortOrder: number | null; createdAt: number; id: string },
  b: { sortOrder: number | null; createdAt: number; id: string },
): number {
  const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) {
    return orderA - orderB;
  }
  if (a.createdAt !== b.createdAt) {
    return a.createdAt - b.createdAt;
  }
  return a.id.localeCompare(b.id);
}

function computeEtag(contentVersion: number, buffer: Buffer): string {
  const hash = createHash('sha256').update(buffer).digest('hex').slice(0, 16);
  return `"v${contentVersion}-${hash}"`;
}

function writeAtomicSnapshot(
  snapshotsDir: string,
  type: SnapshotType,
  envelope: SnapshotEnvelope,
): SnapshotArtifact {
  const validated = snapshotEnvelopeSchema.parse(envelope);
  const buffer = gzipSync(Buffer.from(JSON.stringify(validated), 'utf8'));
  const finalPath = join(snapshotsDir, `${type}.json.gz`);
  const tmpPath = join(snapshotsDir, `${type}.json.gz.tmp`);

  writeFileSync(tmpPath, buffer);
  renameSync(tmpPath, finalPath);

  return {
    type,
    path: finalPath,
    buffer,
    etag: computeEtag(validated.contentVersion, buffer),
    contentVersion: validated.contentVersion,
    itemCount: validated.items.length,
    envelope: validated,
  };
}

/**
 * Rebuild all active `.json.gz` snapshots (`verses`, `names_of_god`, `blessings`)
 * atomically inside `<dataDir>/snapshots/`. Excludes soft-deleted tombstones (`deletedAt !== null`).
 */
export function rebuildAllSnapshots(
  db: BackendDatabase,
  dataDir: string,
  nowMs = Date.now(),
): RebuildSnapshotsResult {
  const metaRow = db
    .select()
    .from(contentMeta)
    .where(eq(contentMeta.id, CONTENT_META_SINGLETON_ID))
    .get();
  const contentVersion = metaRow?.contentVersion ?? 0;

  const snapshotsDir = join(dataDir, 'snapshots');
  mkdirSync(snapshotsDir, { recursive: true });

  const activeVerses: VerseItem[] = db
    .select()
    .from(verses)
    .where(isNull(verses.deletedAt))
    .all()
    .sort(compareContentOrder)
    .map((row) =>
      verseItemSchema.parse({
        id: row.id,
        ref: row.ref,
        text: row.text,
        textFemale: row.textFemale,
        version: row.version,
        sortOrder: row.sortOrder,
        tags: parseTagsJson(row.tagsJson),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
      }),
    );

  const activeNames: NameOfGodItem[] = db
    .select()
    .from(namesOfGod)
    .where(isNull(namesOfGod.deletedAt))
    .all()
    .sort(compareContentOrder)
    .map((row) =>
      nameOfGodItemSchema.parse({
        id: row.id,
        title: row.title,
        text: row.text,
        textFemale: row.textFemale,
        version: row.version,
        sortOrder: row.sortOrder,
        tags: parseTagsJson(row.tagsJson),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
      }),
    );

  const activeBlessings: BlessingItem[] = db
    .select()
    .from(blessings)
    .where(isNull(blessings.deletedAt))
    .all()
    .sort(compareContentOrder)
    .map((row) =>
      blessingItemSchema.parse({
        id: row.id,
        title: row.title,
        text: row.text,
        textFemale: row.textFemale,
        verseRef: row.verseRef,
        version: row.version,
        sortOrder: row.sortOrder,
        tags: parseTagsJson(row.tagsJson),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        deletedAt: row.deletedAt,
      }),
    );

  const versesEnvelope = versesEnvelopeSchema.parse({
    type: 'verses',
    contentVersion,
    generatedAt: nowMs,
    items: activeVerses,
  }) as Extract<SnapshotEnvelope, { type: 'verses' }>;

  const namesEnvelope = namesEnvelopeSchema.parse({
    type: 'names_of_god',
    contentVersion,
    generatedAt: nowMs,
    items: activeNames,
  }) as Extract<SnapshotEnvelope, { type: 'names_of_god' }>;

  const blessingsEnvelope = blessingsEnvelopeSchema.parse({
    type: 'blessings',
    contentVersion,
    generatedAt: nowMs,
    items: activeBlessings,
  }) as Extract<SnapshotEnvelope, { type: 'blessings' }>;

  const snapshots: Record<SnapshotType, SnapshotArtifact> = {
    verses: writeAtomicSnapshot(snapshotsDir, 'verses', versesEnvelope),
    names_of_god: writeAtomicSnapshot(snapshotsDir, 'names_of_god', namesEnvelope),
    blessings: writeAtomicSnapshot(snapshotsDir, 'blessings', blessingsEnvelope),
  };

  return {
    contentVersion,
    generatedAt: nowMs,
    snapshots,
  };
}

/**
 * Read and validate a pre-built `.json.gz` snapshot from `<dataDir>/snapshots/<type>.json.gz`.
 * Returns `null` when the file does not exist.
 */
export function readSnapshotFromDisk(
  dataDir: string,
  type: SnapshotType,
): SnapshotArtifact | null {
  const validType = snapshotTypeSchema.parse(type);
  const filePath = join(dataDir, 'snapshots', `${validType}.json.gz`);

  let buffer: Buffer;
  try {
    buffer = readFileSync(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }

  const parsedJson: unknown = JSON.parse(gunzipSync(buffer).toString('utf8'));
  const envelope = snapshotEnvelopeSchema.parse(parsedJson);
  if (envelope.type !== validType) {
    throw new Error(
      `Snapshot type mismatch at ${filePath}: expected ${validType}, got ${envelope.type}`,
    );
  }

  return {
    type: validType,
    path: filePath,
    buffer,
    etag: computeEtag(envelope.contentVersion, buffer),
    contentVersion: envelope.contentVersion,
    itemCount: envelope.items.length,
    envelope,
  };
}
