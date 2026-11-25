import {
  snapshotEnvelopeSchema,
  snapshotTypeSchema,
  type SnapshotType,
} from '@roi/shared';
import { Directory, File, Paths } from 'expo-file-system';
import { z } from 'zod';

import {
  CONTENT_STAGES,
  STAGING_DIR_NAME,
  STAGING_MANIFEST_FILE,
} from '../../constants/sync';
import type { SnapshotEnvelopeByType } from './api';

/** Checkpoint manifest persisted inside content-staging/manifest.json. */
export interface StagingManifest {
  contentVersion: number;
  completed: SnapshotType[];
}

/** Disk staging adapter isolating partial downloads from SQLite until commit. */
export interface StagingStore {
  readManifest(): Promise<StagingManifest | null>;
  writeStage<T extends SnapshotType>(
    type: T,
    envelope: SnapshotEnvelopeByType[T],
  ): Promise<StagingManifest>;
  readStage<T extends SnapshotType>(
    type: T,
  ): Promise<SnapshotEnvelopeByType[T] | null>;
  clear(): Promise<void>;
}

const stagingManifestSchema = z.object({
  contentVersion: z.number().int().nonnegative(),
  completed: z.array(snapshotTypeSchema),
});

function stageFilename(type: SnapshotType): string {
  return `${type}.json`;
}

function getStagingDirectory(): Directory {
  return new Directory(Paths.document, STAGING_DIR_NAME);
}

function ensureStagingDirectory(): Directory {
  const dir = getStagingDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

async function writeTextFile(file: File, content: string): Promise<void> {
  if (!file.exists) {
    file.create({ intermediates: true, overwrite: true });
  }
  await file.write(content);
}

async function readManifestFromDir(
  dir: Directory,
): Promise<StagingManifest | null> {
  if (!dir.exists) {
    return null;
  }
  const manifestFile = new File(dir, STAGING_MANIFEST_FILE);
  if (!manifestFile.exists) {
    return null;
  }
  try {
    const raw = await manifestFile.text();
    const parsed = stagingManifestSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Create the on-device staging store backed by expo-file-system Directory/File APIs.
 * Keeps partial snapshot downloads in Paths.document/content-staging without touching SQLite.
 */
export function createExpoStagingStore(): StagingStore {
  return {
    async readManifest() {
      return readManifestFromDir(getStagingDirectory());
    },

    async writeStage<T extends SnapshotType>(
      type: T,
      envelope: SnapshotEnvelopeByType[T],
    ): Promise<StagingManifest> {
      const dir = ensureStagingDirectory();
      const stageFile = new File(dir, stageFilename(type));
      await writeTextFile(stageFile, JSON.stringify(envelope));

      const previous = await readManifestFromDir(dir);
      const completed =
        previous && previous.contentVersion === envelope.contentVersion
          ? CONTENT_STAGES.filter(
              (stage) => stage === type || previous.completed.includes(stage),
            )
          : [type];

      const nextManifest: StagingManifest = {
        contentVersion: envelope.contentVersion,
        completed: [...completed],
      };

      const manifestFile = new File(dir, STAGING_MANIFEST_FILE);
      await writeTextFile(manifestFile, JSON.stringify(nextManifest));

      return nextManifest;
    },

    async readStage<T extends SnapshotType>(
      type: T,
    ): Promise<SnapshotEnvelopeByType[T] | null> {
      const dir = getStagingDirectory();
      if (!dir.exists) {
        return null;
      }
      const stageFile = new File(dir, stageFilename(type));
      if (!stageFile.exists) {
        return null;
      }
      try {
        const raw = await stageFile.text();
        const envelope = snapshotEnvelopeSchema.parse(JSON.parse(raw));
        if (envelope.type !== type) {
          return null;
        }
        return envelope as SnapshotEnvelopeByType[T];
      } catch {
        return null;
      }
    },

    async clear(): Promise<void> {
      const dir = getStagingDirectory();
      if (dir.exists) {
        dir.delete();
      }
    },
  };
}
