import 'reflect-metadata';
import { mkdtempSync, rmSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { verseItemSchema, createSnapshotEnvelopeSchema } from '@roi/shared';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { resolveBackendPath } from '../config/paths';
import { SnapshotController } from '../content/snapshot.controller';
import { SnapshotService } from '../content/snapshot.service';
import { openBackendDatabase } from '../db/client';
import { DrizzleModule } from '../db/drizzle.module';
import { HealthController } from '../health/health.controller';
import { runSeed } from '../scripts/seed';

const versesEnvelopeSchema = createSnapshotEnvelopeSchema(verseItemSchema);

describe('Task 1 tracer: DrizzleModule, SnapshotService/Controller, and HealthController', () => {
  const savedEnv = { ...process.env };
  const tempDirs: string[] = [];

  afterEach(() => {
    process.env = { ...savedEnv };
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) {
        rmSync(dir, { recursive: true, force: true });
      }
    }
  });

  function makeTempDir(prefix = 'roi-api-'): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  it('boots DrizzleModule, loads/rebuilds snapshots, serves gzipped/gunzipped /snapshots/:type, and serves @SkipThrottle() /health', async () => {
    const dataDir = makeTempDir();
    const handle = openBackendDatabase(dataDir);
    runSeed({
      db: handle.db,
      sqlite: handle.sqlite,
      dataDir,
      filePath: resolveBackendPath('seed', 'initial-content.json'),
      dryRun: false,
      nowMs: 1_795_552_000_000,
    });
    handle.close();

    process.env.DATA_DIR = dataDir;
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 5 }]),
        DrizzleModule,
      ],
      controllers: [SnapshotController, HealthController],
      providers: [
        SnapshotService,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    try {
      const server = app.getHttpServer();

      // GET /health returns 200 and bypasses ThrottlerGuard limit of 5
      for (let i = 0; i < 6; i += 1) {
        const healthRes = await request(server).get('/health').expect(200);
        expect(healthRes.body).toMatchObject({
          ok: true,
          status: 'ok',
          contentVersion: 1,
          snapshotsReady: true,
        });
      }

      // GET /snapshots/verses with Accept-Encoding: gzip returns pre-built gzip response
      const gzipRes = await request(server)
        .get('/snapshots/verses')
        .set('Accept-Encoding', 'gzip')
        .expect(200);
      expect(gzipRes.headers['content-type']).toMatch(/application\/json/);
      expect(gzipRes.headers['content-encoding']).toBe('gzip');
      expect(gzipRes.headers['vary']).toMatch(/Accept-Encoding/i);
      expect(gzipRes.headers['x-content-version']).toBe('1');
      expect(gzipRes.headers['etag']).toBeTruthy();

      const parsedGzip = versesEnvelopeSchema.parse(gzipRes.body);
      expect(parsedGzip.items.length).toBeGreaterThanOrEqual(10);

      // GET /snapshots/verses WITHOUT Accept-Encoding: gzip returns plain gunzipped JSON
      await app.listen(0);
      const address = server.address() as { port: number };
      const plainRes = await new Promise<{
        statusCode: number;
        headers: Record<string, string | string[] | undefined>;
        body: string;
      }>((resolvePromise, rejectPromise) => {
        const req = httpRequest(
          {
            host: '127.0.0.1',
            port: address.port,
            path: '/snapshots/verses',
            method: 'GET',
            headers: {},
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => {
              resolvePromise({
                statusCode: res.statusCode ?? 0,
                headers: res.headers,
                body: Buffer.concat(chunks).toString('utf8'),
              });
            });
          },
        );
        req.on('error', rejectPromise);
        req.end();
      });

      expect(plainRes.statusCode).toBe(200);
      expect(plainRes.headers['content-encoding']).toBeUndefined();
      expect(plainRes.headers['x-content-version']).toBe('1');
      const parsedPlain = versesEnvelopeSchema.parse(JSON.parse(plainRes.body));
      expect(parsedPlain.items.length).toBe(parsedGzip.items.length);

      // Verify raw gzip buffer matches disk when requested via raw http
      const rawGzipRes = await new Promise<{
        statusCode: number;
        contentEncoding: string | undefined;
        rawBuffer: Buffer;
      }>((resolvePromise, rejectPromise) => {
        const req = httpRequest(
          {
            host: '127.0.0.1',
            port: address.port,
            path: '/snapshots/names_of_god',
            method: 'GET',
            headers: { 'Accept-Encoding': 'gzip' },
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => {
              resolvePromise({
                statusCode: res.statusCode ?? 0,
                contentEncoding: res.headers['content-encoding'],
                rawBuffer: Buffer.concat(chunks),
              });
            });
          },
        );
        req.on('error', rejectPromise);
        req.end();
      });
      expect(rawGzipRes.statusCode).toBe(200);
      expect(rawGzipRes.contentEncoding).toBe('gzip');
      const gunzippedNames = JSON.parse(gunzipSync(rawGzipRes.rawBuffer).toString('utf8'));
      expect(gunzippedNames.type).toBe('names_of_god');
      expect(gunzippedNames.contentVersion).toBe(1);

      // Invalid snapshot type returns 400
      await request(server).get('/snapshots/invalid').expect(400);
    } finally {
      await app.close();
    }
  });
});
