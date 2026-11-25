import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import type Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { SnapshotService } from '../content/snapshot.service';
import { CONTENT_META_SINGLETON_ID, type BackendDatabase } from '../db/client';
import { DRIZZLE_DB, SQLITE_DB } from '../db/drizzle.module';
import { contentMeta } from '../db/schema';

export interface HealthResponse {
  readonly ok: boolean;
  readonly status: 'ok';
  readonly contentVersion: number;
  readonly snapshotsReady: boolean;
}

@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    @Inject(SQLITE_DB) private readonly sqlite: Database.Database,
    @Inject(DRIZZLE_DB) private readonly db: BackendDatabase,
    private readonly snapshotService: SnapshotService,
  ) {}

  @Get()
  check(): HealthResponse {
    try {
      this.sqlite.prepare('SELECT 1').get();
      const metaRow = this.db
        .select()
        .from(contentMeta)
        .where(eq(contentMeta.id, CONTENT_META_SINGLETON_ID))
        .get();
      const contentVersion = metaRow?.contentVersion ?? 0;
      const snapshotsReady = this.snapshotService.areSnapshotsReady();

      if (!snapshotsReady) {
        throw new ServiceUnavailableException({
          ok: false,
          status: 'error',
          contentVersion,
          snapshotsReady: false,
        });
      }

      return {
        ok: true,
        status: 'ok',
        contentVersion,
        snapshotsReady: true,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException({
        ok: false,
        status: 'error',
        snapshotsReady: false,
      });
    }
  }
}
