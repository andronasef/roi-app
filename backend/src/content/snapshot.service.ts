import { Inject, Injectable, ServiceUnavailableException, type OnModuleInit } from '@nestjs/common';
import { snapshotTypeSchema, type SnapshotType } from '@roi/shared';
import { eq } from 'drizzle-orm';
import type { BackendEnv } from '../config/env';
import { CONTENT_META_SINGLETON_ID, type BackendDatabase } from '../db/client';
import { BACKEND_ENV, DRIZZLE_DB } from '../db/drizzle.module';
import { contentMeta } from '../db/schema';
import {
  readSnapshotFromDisk,
  rebuildAllSnapshots,
  type RebuildSnapshotsResult,
  type SnapshotArtifact,
} from './snapshot-builder';

@Injectable()
export class SnapshotService implements OnModuleInit {
  private readonly cache = new Map<SnapshotType, SnapshotArtifact>();

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: BackendDatabase,
    @Inject(BACKEND_ENV) private readonly env: BackendEnv,
  ) {}

  onModuleInit(): void {
    this.loadOrRebuild();
  }

  private getDbContentVersion(): number {
    const metaRow = this.db
      .select()
      .from(contentMeta)
      .where(eq(contentMeta.id, CONTENT_META_SINGLETON_ID))
      .get();
    return metaRow?.contentVersion ?? 0;
  }

  private loadOrRebuild(): void {
    const dbVersion = this.getDbContentVersion();
    const loaded: Partial<Record<SnapshotType, SnapshotArtifact>> = {};
    let needsRebuild = false;

    for (const type of snapshotTypeSchema.options) {
      const artifact = readSnapshotFromDisk(this.env.DATA_DIR, type);
      if (!artifact || artifact.contentVersion !== dbVersion) {
        needsRebuild = true;
        break;
      }
      loaded[type] = artifact;
    }

    if (needsRebuild) {
      this.refreshCache();
      return;
    }

    this.cache.clear();
    for (const type of snapshotTypeSchema.options) {
      const artifact = loaded[type];
      if (artifact) {
        this.cache.set(type, artifact);
      }
    }
  }

  /** Rebuild all `.json.gz` snapshots from SQLite and swap the in-memory cache. */
  refreshCache(nowMs = Date.now()): RebuildSnapshotsResult {
    const rebuilt = rebuildAllSnapshots(this.db, this.env.DATA_DIR, nowMs);
    this.cache.clear();
    for (const type of snapshotTypeSchema.options) {
      this.cache.set(type, rebuilt.snapshots[type]);
    }
    return rebuilt;
  }

  /** Return the cached pre-built snapshot artifact for the requested type. */
  getSnapshot(type: SnapshotType): SnapshotArtifact {
    const cached = this.cache.get(type);
    if (cached) {
      return cached;
    }
    throw new ServiceUnavailableException(`Snapshot for '${type}' is not ready`);
  }

  /** Return true when all three public content snapshots are cached and ready. */
  areSnapshotsReady(): boolean {
    return snapshotTypeSchema.options.every((type) => this.cache.has(type));
  }
}
