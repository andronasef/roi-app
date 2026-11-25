import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import {
  TORTURE_FIXTURES,
  blessingItemSchema,
  createSnapshotEnvelopeSchema,
  nameOfGodItemSchema,
  seedContentFileSchema,
  snapshotEnvelopeSchema,
  verseItemSchema,
  type SeedContentFile,
} from '@roi/shared';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveBackendPath } from '../config/paths';
import { readSnapshotFromDisk, rebuildAllSnapshots } from '../content/snapshot-builder';
import { openBackendDatabase } from '../db/client';
import { auditLog, blessings, contentMeta, namesOfGod, verses } from '../db/schema';
import { runSeed } from '../scripts/seed';

const versesEnvelopeSchema = createSnapshotEnvelopeSchema(verseItemSchema);
const namesEnvelopeSchema = createSnapshotEnvelopeSchema(nameOfGodItemSchema);
const blessingsEnvelopeSchema = createSnapshotEnvelopeSchema(blessingItemSchema);

describe('local JSON seed fixture, snapshot builder, and idempotent --dry-run CLI', () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  function makeTempDir(prefix = 'roi-seed-'): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  it('validates backend/seed/initial-content.json with TORTURE_FIXTURES, 10+ names/blessings, and zero Sanity fields', () => {
    const seedPath = resolveBackendPath('seed', 'initial-content.json');
    const raw = readFileSync(seedPath, 'utf8');
    expect(raw.toLowerCase()).not.toContain('sanity');

    const parsed = seedContentFileSchema.parse(JSON.parse(raw));
    expect(parsed.verses.length).toBeGreaterThanOrEqual(TORTURE_FIXTURES.length);
    expect(parsed.namesOfGod.length).toBeGreaterThanOrEqual(10);
    expect(parsed.blessings.length).toBeGreaterThanOrEqual(10);

    const verseIds = new Set(parsed.verses.map((v) => v.id));
    for (const fixture of TORTURE_FIXTURES) {
      expect(verseIds.has(fixture.id)).toBe(true);
    }
    const tokenVerse = parsed.verses.find((v) => v.id === 'token');
    expect(tokenVerse?.text).toContain('{الاسم}');
  });

  it('supports --dry-run without mutating SQLite rows, content_meta, audit_log, or snapshots', () => {
    const dataDir = makeTempDir();
    const handle = openBackendDatabase(dataDir);

    try {
      const seedPath = resolveBackendPath('seed', 'initial-content.json');
      const expectedSeed = seedContentFileSchema.parse(
        JSON.parse(readFileSync(seedPath, 'utf8')),
      );
      const expectedTotal =
        expectedSeed.verses.length +
        expectedSeed.namesOfGod.length +
        expectedSeed.blessings.length;

      const dryResult = runSeed({
        db: handle.db,
        sqlite: handle.sqlite,
        dataDir,
        filePath: seedPath,
        dryRun: true,
        nowMs: 1_795_552_000_000,
      });

      expect(dryResult.dryRun).toBe(true);
      expect(dryResult.inserted).toBe(expectedTotal);
      expect(dryResult.updated).toBe(0);
      expect(dryResult.unchanged).toBe(0);
      expect(dryResult.contentVersion).toBe(0);

      expect(handle.db.select().from(verses).all()).toHaveLength(0);
      expect(handle.db.select().from(namesOfGod).all()).toHaveLength(0);
      expect(handle.db.select().from(blessings).all()).toHaveLength(0);
      expect(handle.db.select().from(auditLog).all()).toHaveLength(0);
      expect(handle.db.select().from(contentMeta).all()[0]?.contentVersion).toBe(0);

      expect(existsSync(join(dataDir, 'snapshots', 'verses.json.gz'))).toBe(false);
      expect(existsSync(join(dataDir, 'snapshots', 'names_of_god.json.gz'))).toBe(false);
      expect(existsSync(join(dataDir, 'snapshots', 'blessings.json.gz'))).toBe(false);
    } finally {
      handle.close();
    }
  });

  it('seeds atomically, logs audit_log, builds valid .json.gz snapshots, stays idempotent, and bumps version on edits', () => {
    const dataDir = makeTempDir();
    const handle = openBackendDatabase(dataDir);

    try {
      const seedPath = resolveBackendPath('seed', 'initial-content.json');
      const seedData = seedContentFileSchema.parse(
        JSON.parse(readFileSync(seedPath, 'utf8')),
      );
      const totalItems =
        seedData.verses.length + seedData.namesOfGod.length + seedData.blessings.length;

      const firstRun = runSeed({
        db: handle.db,
        sqlite: handle.sqlite,
        dataDir,
        filePath: seedPath,
        dryRun: false,
        nowMs: 1_795_552_100_000,
      });

      expect(firstRun.dryRun).toBe(false);
      expect(firstRun.inserted).toBe(totalItems);
      expect(firstRun.updated).toBe(0);
      expect(firstRun.unchanged).toBe(0);
      expect(firstRun.contentVersion).toBe(1);

      expect(handle.db.select().from(verses).all()).toHaveLength(seedData.verses.length);
      expect(handle.db.select().from(namesOfGod).all()).toHaveLength(
        seedData.namesOfGod.length,
      );
      expect(handle.db.select().from(blessings).all()).toHaveLength(
        seedData.blessings.length,
      );
      expect(handle.db.select().from(contentMeta).all()[0]?.contentVersion).toBe(1);

      const auditsAfterFirst = handle.db.select().from(auditLog).all();
      expect(auditsAfterFirst).toHaveLength(1);
      expect(auditsAfterFirst[0]?.action).toBe('seed_import');
      expect(auditsAfterFirst[0]?.actorEmail).toBe('cli:seed');
      expect(auditsAfterFirst[0]?.contentVersion).toBe(1);

      // Verify gzipped snapshot files decompress and match @roi/shared contracts
      const versesGz = readFileSync(join(dataDir, 'snapshots', 'verses.json.gz'));
      const namesGz = readFileSync(join(dataDir, 'snapshots', 'names_of_god.json.gz'));
      const blessingsGz = readFileSync(join(dataDir, 'snapshots', 'blessings.json.gz'));

      const versesEnv = versesEnvelopeSchema.parse(
        JSON.parse(gunzipSync(versesGz).toString('utf8')),
      );
      const namesEnv = namesEnvelopeSchema.parse(
        JSON.parse(gunzipSync(namesGz).toString('utf8')),
      );
      const blessingsEnv = blessingsEnvelopeSchema.parse(
        JSON.parse(gunzipSync(blessingsGz).toString('utf8')),
      );

      expect(snapshotEnvelopeSchema.safeParse(versesEnv).success).toBe(true);
      expect(versesEnv.contentVersion).toBe(1);
      expect(versesEnv.items).toHaveLength(seedData.verses.length);
      expect(namesEnv.contentVersion).toBe(1);
      expect(namesEnv.items).toHaveLength(seedData.namesOfGod.length);
      expect(blessingsEnv.contentVersion).toBe(1);
      expect(blessingsEnv.items).toHaveLength(seedData.blessings.length);

      // Second run on identical JSON must be idempotent
      const secondRun = runSeed({
        db: handle.db,
        sqlite: handle.sqlite,
        dataDir,
        filePath: seedPath,
        dryRun: false,
        nowMs: 1_795_552_200_000,
      });

      expect(secondRun.inserted).toBe(0);
      expect(secondRun.updated).toBe(0);
      expect(secondRun.unchanged).toBe(totalItems);
      expect(secondRun.contentVersion).toBe(1);
      expect(handle.db.select().from(contentMeta).all()[0]?.contentVersion).toBe(1);
      expect(handle.db.select().from(auditLog).all()).toHaveLength(1);
      expect(handle.db.select().from(verses).all()).toHaveLength(seedData.verses.length);

      // Modify one item in a temporary seed file -> version bumps to 2, second audit row
      const editedDir = makeTempDir('roi-seed-edit-');
      const editedPath = join(editedDir, 'edited.json');
      const modifiedSeed: SeedContentFile = {
        ...seedData,
        blessings: seedData.blessings.map((item, idx) =>
          idx === 0
            ? {
                ...item,
                text: 'بَرَكَةٌ مُحَدَّثَةٌ لِيَوْمِكَ يَا {الاسم}.',
              }
            : item,
        ),
      };
      writeFileSync(editedPath, JSON.stringify(modifiedSeed, null, 2), 'utf8');

      const thirdRun = runSeed({
        db: handle.db,
        sqlite: handle.sqlite,
        dataDir,
        filePath: editedPath,
        dryRun: false,
        nowMs: 1_795_552_300_000,
      });

      expect(thirdRun.inserted).toBe(0);
      expect(thirdRun.updated).toBe(1);
      expect(thirdRun.unchanged).toBe(totalItems - 1);
      expect(thirdRun.contentVersion).toBe(2);
      expect(handle.db.select().from(contentMeta).all()[0]?.contentVersion).toBe(2);
      expect(handle.db.select().from(auditLog).all()).toHaveLength(2);

      const diskBlessings = readSnapshotFromDisk(dataDir, 'blessings');
      expect(diskBlessings?.contentVersion).toBe(2);
      expect(diskBlessings?.envelope.type).toBe('blessings');
      if (diskBlessings?.envelope.type === 'blessings') {
        expect(diskBlessings.envelope.items[0]?.text).toBe(
          'بَرَكَةٌ مُحَدَّثَةٌ لِيَوْمِكَ يَا {الاسم}.',
        );
      }
    } finally {
      handle.close();
    }
  });

  it('excludes tombstoned rows from rebuilt active snapshots while keeping them in SQLite', () => {
    const dataDir = makeTempDir();
    const handle = openBackendDatabase(dataDir);

    try {
      const tempSeedDir = makeTempDir('roi-seed-tombstone-');
      const tempSeedPath = join(tempSeedDir, 'seed.json');
      const now = 1_795_552_400_000;
      const payload: SeedContentFile = {
        verses: [
          {
            id: 'v-active',
            ref: 'مزمور ٢٣: ١',
            text: 'الرب راعي فلا يعوزني شيء.',
            sortOrder: 1,
          },
          {
            id: 'v-tombstone',
            ref: 'آية محذوفة',
            text: 'نص محذوف.',
            sortOrder: 2,
            deletedAt: now,
          },
        ],
        namesOfGod: [],
        blessings: [],
      };
      writeFileSync(tempSeedPath, JSON.stringify(payload), 'utf8');

      runSeed({
        db: handle.db,
        sqlite: handle.sqlite,
        dataDir,
        filePath: tempSeedPath,
        dryRun: false,
        nowMs: now,
      });

      expect(handle.db.select().from(verses).all()).toHaveLength(2);

      const rebuilt = rebuildAllSnapshots(handle.db, dataDir, now + 1000);
      expect(rebuilt.contentVersion).toBe(1);

      const versesSnapshot = readSnapshotFromDisk(dataDir, 'verses');
      expect(versesSnapshot?.envelope.items).toHaveLength(1);
      expect(versesSnapshot?.envelope.items[0]?.id).toBe('v-active');
    } finally {
      handle.close();
    }
  });
});
