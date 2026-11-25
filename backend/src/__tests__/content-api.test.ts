import 'reflect-metadata';
import { mkdtempSync, rmSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { Test } from '@nestjs/testing';
import {
  contentDeltaResponseSchema,
  createSnapshotEnvelopeSchema,
  verseItemSchema,
} from '@roi/shared';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { resolveBackendPath } from '../config/paths';
import { ContentService } from '../content/content.service';
import { openBackendDatabase } from '../db/client';
import { verses } from '../db/schema';
import { runSeed } from '../scripts/seed';

const versesEnvelopeSchema = createSnapshotEnvelopeSchema(verseItemSchema);

const CONTENT_DELTA_QUERY = /* GraphQL */ `
  query ContentDelta($sinceVersion: Int!) {
    contentDelta(sinceVersion: $sinceVersion) {
      contentVersion
      verses {
        id
        ref
        text
        textFemale
        version
        sortOrder
        tags
        createdAt
        updatedAt
        deletedAt
      }
      namesOfGod {
        id
        title
        text
        textFemale
        version
        sortOrder
        tags
        createdAt
        updatedAt
        deletedAt
      }
      blessings {
        id
        title
        verseRef
        text
        textFemale
        version
        sortOrder
        tags
        createdAt
        updatedAt
        deletedAt
      }
    }
  }
`;

function seedTempDir(tempDirs: string[]): string {
  const dataDir = mkdtempSync(join(tmpdir(), 'roi-api-'));
  tempDirs.push(dataDir);
  const handle = openBackendDatabase(dataDir);
  try {
    runSeed({
      db: handle.db,
      sqlite: handle.sqlite,
      dataDir,
      filePath: resolveBackendPath('seed', 'initial-content.json'),
      dryRun: false,
      nowMs: 1_795_552_000_000,
    });
  } finally {
    handle.close();
  }
  return dataDir;
}

describe('Content HTTP & GraphQL API (BE-01, BE-02, BE-04, BE-06)', () => {
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

  it('serves /health, gzipped & gunzipped /snapshots/:type, and monotonic contentDelta with tombstones', async () => {
    const dataDir = seedTempDir(tempDirs);
    process.env.DATA_DIR = dataDir;
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    try {
      const server = app.getHttpServer();
      const contentService = app.get(ContentService);

      // GET /health returns 200 with snapshotsReady: true
      const healthRes = await request(server).get('/health').expect(200);
      expect(healthRes.body).toMatchObject({
        ok: true,
        status: 'ok',
        contentVersion: 1,
        snapshotsReady: true,
      });

      // GET /snapshots/verses with Accept-Encoding: gzip returns pre-built gzip buffer
      await app.listen(0);
      const address = server.address() as { port: number };

      const rawGzipRes = await new Promise<{
        statusCode: number;
        headers: Record<string, string | string[] | undefined>;
        rawBuffer: Buffer;
      }>((resolvePromise, rejectPromise) => {
        const req = httpRequest(
          {
            host: '127.0.0.1',
            port: address.port,
            path: '/snapshots/verses',
            method: 'GET',
            headers: { 'Accept-Encoding': 'gzip' },
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => {
              resolvePromise({
                statusCode: res.statusCode ?? 0,
                headers: res.headers,
                rawBuffer: Buffer.concat(chunks),
              });
            });
          },
        );
        req.on('error', rejectPromise);
        req.end();
      });

      expect(rawGzipRes.statusCode).toBe(200);
      expect(rawGzipRes.headers['content-type']).toMatch(/application\/json/);
      expect(rawGzipRes.headers['content-encoding']).toBe('gzip');
      expect(rawGzipRes.headers['vary']).toMatch(/Accept-Encoding/i);
      expect(rawGzipRes.headers['x-content-version']).toBe('1');
      expect(rawGzipRes.headers['etag']).toBeTruthy();

      const gunzippedVerses = versesEnvelopeSchema.parse(
        JSON.parse(gunzipSync(rawGzipRes.rawBuffer).toString('utf8')),
      );
      expect(gunzippedVerses.items.length).toBeGreaterThanOrEqual(10);

      // GET /snapshots/verses without gzip Accept-Encoding returns plain JSON
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
      expect(parsedPlain.items).toHaveLength(gunzippedVerses.items.length);

      // GET /snapshots/invalid returns 400
      await request(server).get('/snapshots/invalid').expect(400);

      // GraphQL contentDelta(sinceVersion: 0) returns all seeded items
      const deltaV0Res = await request(server)
        .post('/graphql')
        .send({ query: CONTENT_DELTA_QUERY, variables: { sinceVersion: 0 } })
        .expect(200);
      expect(deltaV0Res.body.errors).toBeUndefined();
      const deltaV0 = contentDeltaResponseSchema.parse(deltaV0Res.body.data.contentDelta);
      expect(deltaV0.contentVersion).toBe(1);
      expect(deltaV0.verses).toHaveLength(gunzippedVerses.items.length);
      expect(deltaV0.namesOfGod.length).toBeGreaterThanOrEqual(10);
      expect(deltaV0.blessings.length).toBeGreaterThanOrEqual(10);

      // GraphQL contentDelta(sinceVersion: 1) returns empty arrays
      const deltaV1Res = await request(server)
        .post('/graphql')
        .send({ query: CONTENT_DELTA_QUERY, variables: { sinceVersion: 1 } })
        .expect(200);
      expect(deltaV1Res.body.errors).toBeUndefined();
      const deltaV1 = contentDeltaResponseSchema.parse(deltaV1Res.body.data.contentDelta);
      expect(deltaV1.contentVersion).toBe(1);
      expect(deltaV1.verses).toHaveLength(0);
      expect(deltaV1.namesOfGod).toHaveLength(0);
      expect(deltaV1.blessings).toHaveLength(0);

      // Negative sinceVersion is rejected
      const negRes = await request(server)
        .post('/graphql')
        .send({ query: CONTENT_DELTA_QUERY, variables: { sinceVersion: -1 } });
      expect(negRes.body.errors?.length).toBeGreaterThan(0);

      // Apply version-2 mutation: update 1 verse and soft-delete another verse
      const updatedId = deltaV0.verses[0]!.id;
      const deletedId = deltaV0.verses[1]!.id;
      const mutationNow = 1_795_552_999_000;

      const mutationResult = contentService.applyContentMutation({
        actorEmail: 'admin@roi.app',
        action: 'update_and_tombstone',
        entityType: 'verse',
        entityId: updatedId,
        nowMs: mutationNow,
        mutate: ({ db, nextVersion, nowMs }) => {
          db.update(verses)
            .set({
              text: 'نَصٌّ مُحَدَّثٌ يَا {الاسم}.',
              version: nextVersion,
              updatedAt: nowMs,
            })
            .where(eq(verses.id, updatedId))
            .run();
          db.update(verses)
            .set({
              version: nextVersion,
              updatedAt: nowMs,
              deletedAt: nowMs,
            })
            .where(eq(verses.id, deletedId))
            .run();
          return { updatedId, deletedId };
        },
      });
      expect(mutationResult.contentVersion).toBe(2);

      // contentDelta(sinceVersion: 1) returns ONLY the updated and soft-deleted rows
      const deltaV2Res = await request(server)
        .post('/graphql')
        .send({ query: CONTENT_DELTA_QUERY, variables: { sinceVersion: 1 } })
        .expect(200);
      expect(deltaV2Res.body.errors).toBeUndefined();
      const deltaV2 = contentDeltaResponseSchema.parse(deltaV2Res.body.data.contentDelta);
      expect(deltaV2.contentVersion).toBe(2);
      expect(deltaV2.namesOfGod).toHaveLength(0);
      expect(deltaV2.blessings).toHaveLength(0);
      expect(deltaV2.verses).toHaveLength(2);

      const deltaUpdated = deltaV2.verses.find((v) => v.id === updatedId);
      const deltaDeleted = deltaV2.verses.find((v) => v.id === deletedId);
      expect(deltaUpdated?.text).toBe('نَصٌّ مُحَدَّثٌ يَا {الاسم}.');
      expect(deltaUpdated?.deletedAt).toBeNull();
      expect(deltaDeleted?.deletedAt).toBe(mutationNow);

      // Snapshot cache was refreshed without the tombstoned verse
      const snapV2 = await request(server)
        .get('/snapshots/verses')
        .set('Accept-Encoding', 'gzip')
        .expect(200);
      expect(snapV2.headers['x-content-version']).toBe('2');
      const snapV2Body = versesEnvelopeSchema.parse(snapV2.body);
      expect(snapV2Body.items).toHaveLength(gunzippedVerses.items.length - 1);
      expect(snapV2Body.items.some((item) => item.id === deletedId)).toBe(false);
    } finally {
      await app.close();
    }
  });

  it('enforces GqlThrottlerGuard (HTTP 429) on GraphQL while @SkipThrottle() keeps /health accessible, and disables introspection in production', async () => {
    const dataDir = seedTempDir(tempDirs);
    process.env.DATA_DIR = dataDir;
    process.env.NODE_ENV = 'production';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    try {
      const server = app.getHttpServer();

      // Production disables GraphQL introspection
      const introRes = await request(server)
        .post('/graphql')
        .send({ query: '{ __schema { queryType { name } } }' });
      expect(introRes.body.data).toBeUndefined();
      expect(introRes.body.errors?.length).toBeGreaterThan(0);

      // Exceed 60 requests/min limit on GraphQL contentDelta -> 429
      let throttledStatus = 0;
      let throttledCode: unknown;
      for (let i = 0; i < 65; i += 1) {
        const res = await request(server)
          .post('/graphql')
          .send({ query: CONTENT_DELTA_QUERY, variables: { sinceVersion: 1 } });
        if (res.status === 429) {
          throttledStatus = res.status;
          throttledCode = res.body?.errors?.[0]?.extensions?.code;
          break;
        }
      }
      expect(throttledStatus).toBe(429);
      expect(throttledCode).toBe('TOO_MANY_REQUESTS');

      // /health remains accessible via @SkipThrottle()
      await request(server).get('/health').expect(200);
    } finally {
      await app.close();
    }
  });

  it('rebuilds missing snapshots on boot for empty DATA_DIR, enforces ApolloArmor maxAliases, and returns 503 on /health when SQLite fails', async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'roi-api-empty-'));
    tempDirs.push(emptyDir);
    process.env.DATA_DIR = emptyDir;
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication();
    await app.init();

    try {
      const server = app.getHttpServer();

      // Empty DB still builds v0 snapshots on boot
      const healthRes = await request(server).get('/health').expect(200);
      expect(healthRes.body).toMatchObject({
        ok: true,
        status: 'ok',
        contentVersion: 0,
        snapshotsReady: true,
      });

      const emptySnap = await request(server)
        .get('/snapshots/verses')
        .set('Accept-Encoding', 'gzip')
        .expect(200);
      expect(emptySnap.headers['x-content-version']).toBe('0');
      expect(versesEnvelopeSchema.parse(emptySnap.body).items).toHaveLength(0);

      // ApolloArmor maxAliases (limit 5) rejects 6 aliases
      const aliasedQuery = `{
        a1: contentDelta(sinceVersion: 0) { contentVersion }
        a2: contentDelta(sinceVersion: 0) { contentVersion }
        a3: contentDelta(sinceVersion: 0) { contentVersion }
        a4: contentDelta(sinceVersion: 0) { contentVersion }
        a5: contentDelta(sinceVersion: 0) { contentVersion }
        a6: contentDelta(sinceVersion: 0) { contentVersion }
      }`;
      const armorRes = await request(server)
        .post('/graphql')
        .send({ query: aliasedQuery });
      expect(armorRes.body.errors?.length).toBeGreaterThan(0);

      // Closing SQLite makes /health return 503 Service Unavailable
      await moduleRef.close();
      await request(server).get('/health').expect(503);
    } finally {
      await app.close().catch(() => {});
    }
  });
  it('serves fresh snapshots after an out-of-process seed (no restart needed)', async () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'roi-api-drift-'));
    tempDirs.push(emptyDir);
    process.env.DATA_DIR = emptyDir;
    process.env.NODE_ENV = 'test';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication();
    await app.init();

    try {
      const server = app.getHttpServer();
      const before = await request(server).get('/snapshots/verses').set('Accept-Encoding', 'gzip');
      expect(before.headers['x-content-version']).toBe('0');

      const handle = openBackendDatabase(emptyDir);
      try {
        runSeed({
          db: handle.db,
          sqlite: handle.sqlite,
          dataDir: emptyDir,
          filePath: resolveBackendPath('seed', 'initial-content.json'),
          dryRun: false,
          nowMs: 1_795_552_000_000,
        });
      } finally {
        handle.close();
      }

      const after = await request(server).get('/snapshots/verses').set('Accept-Encoding', 'gzip');
      expect(after.headers['x-content-version']).toBe('1');
      expect(versesEnvelopeSchema.parse(after.body).items.length).toBeGreaterThan(0);
    } finally {
      await app.close().catch(() => {});
    }
  });
});
