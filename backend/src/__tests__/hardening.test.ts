import 'reflect-metadata';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { loadEnv } from '../config/env';
import { resolveBackendPath } from '../config/paths';
import { openBackendDatabase } from '../db/client';
import { configureApp, isMainEntrypoint } from '../main';
import { runSeed } from '../scripts/seed';

function createSeededTempDir(tempDirs: string[]): string {
  const dataDir = mkdtempSync(join(tmpdir(), 'roi-hardening-'));
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

describe('HTTP & GraphQL Security Hardening (BE-04, D-06, D-09)', () => {
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

  it('guards entrypoint execution under Vitest so importing main.ts never auto-listens', () => {
    expect(process.env.VITEST).toBe('true');
    expect(isMainEntrypoint()).toBe(false);
  });

  it('enforces Helmet CSP, strict ADMIN_ORIGINS CORS, 100kb cap, production GraphQL lock, ApolloArmor, and trust proxy=1 IP isolation', async () => {
    const dataDir = createSeededTempDir(tempDirs);
    process.env.DATA_DIR = dataDir;
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_ORIGINS = 'https://admin.roi.app,https://panel.roi.app';

    const env = loadEnv(process.env);
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app, env);
    await app.init();

    try {
      const server = app.getHttpServer();

      // 1. Helmet security headers including CSP in production
      const healthRes = await request(server).get('/health').expect(200);
      expect(healthRes.headers['x-content-type-options']).toBe('nosniff');
      expect(healthRes.headers['content-security-policy']).toBeTruthy();

      // 2. Production GraphiQL disabled & __schema introspection rejected
      const graphiqlRes = await request(server).get('/graphql').set('Accept', 'text/html');
      expect(graphiqlRes.text).not.toMatch(/GraphiQL/i);

      const introRes = await request(server)
        .post('/graphql')
        .send({ query: '{ __schema { queryType { name } } }' });
      expect(introRes.body.data).toBeUndefined();
      expect(introRes.body.errors?.length).toBeGreaterThan(0);

      // 3. Strict ADMIN_ORIGINS CORS allowlist (allowing native no-Origin & listed origins, rejecting unlisted origins)
      const allowedCors = await request(server)
        .options('/graphql')
        .set('Origin', 'https://admin.roi.app')
        .set('Access-Control-Request-Method', 'POST');
      expect(allowedCors.headers['access-control-allow-origin']).toBe('https://admin.roi.app');

      const disallowedCors = await request(server)
        .options('/graphql')
        .set('Origin', 'https://evil.example')
        .set('Access-Control-Request-Method', 'POST');
      expect(disallowedCors.headers['access-control-allow-origin']).toBeUndefined();

      const disallowedPost = await request(server)
        .post('/graphql')
        .set('Origin', 'https://evil.example')
        .send({ query: '{ contentDelta(sinceVersion: 1) { contentVersion } }' });
      expect(disallowedPost.headers['access-control-allow-origin']).toBeUndefined();

      const nativeNoOrigin = await request(server)
        .post('/graphql')
        .send({ query: '{ contentDelta(sinceVersion: 1) { contentVersion } }' })
        .expect(200);
      expect(nativeNoOrigin.body.data.contentDelta.contentVersion).toBe(1);

      // 4. 100kb JSON body cap -> 413 Payload Too Large
      const oversizedPayload = JSON.stringify({
        query: '{ contentDelta(sinceVersion: 1) { contentVersion } }',
        variables: { padding: 'x'.repeat(120 * 1024) },
      });
      await request(server)
        .post('/graphql')
        .set('Content-Type', 'application/json')
        .send(oversizedPayload)
        .expect(413);

      // 5. ApolloArmor depth > 6 and alias > 5 rejection
      const deepQuery = `{
        contentDelta(sinceVersion: 1) {
          verses {
            ... on VerseDto {
              ... on VerseDto {
                ... on VerseDto {
                  ... on VerseDto {
                    ... on VerseDto {
                      ... on VerseDto {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }`;
      const deepRes = await request(server).post('/graphql').send({ query: deepQuery });
      expect(deepRes.body.data).toBeUndefined();
      expect(deepRes.body.errors?.length).toBeGreaterThan(0);

      const aliasQuery = `{
        a1: contentDelta(sinceVersion: 1) { contentVersion }
        a2: contentDelta(sinceVersion: 1) { contentVersion }
        a3: contentDelta(sinceVersion: 1) { contentVersion }
        a4: contentDelta(sinceVersion: 1) { contentVersion }
        a5: contentDelta(sinceVersion: 1) { contentVersion }
        a6: contentDelta(sinceVersion: 1) { contentVersion }
      }`;
      const aliasRes = await request(server).post('/graphql').send({ query: aliasQuery });
      expect(aliasRes.body.data).toBeUndefined();
      expect(aliasRes.body.errors?.length).toBeGreaterThan(0);

      // 6. trust proxy = 1 isolates throttler buckets per X-Forwarded-For IP
      let ip1Throttled = false;
      for (let i = 0; i < 65; i += 1) {
        const res = await request(server)
          .post('/graphql')
          .set('X-Forwarded-For', '198.51.100.10')
          .send({ query: '{ contentDelta(sinceVersion: 1) { contentVersion } }' });
        if (res.status === 429) {
          ip1Throttled = true;
          break;
        }
      }
      expect(ip1Throttled).toBe(true);

      const ip2Res = await request(server)
        .post('/graphql')
        .set('X-Forwarded-For', '198.51.100.11')
        .send({ query: '{ contentDelta(sinceVersion: 1) { contentVersion } }' })
        .expect(200);
      expect(ip2Res.body.data.contentDelta.contentVersion).toBe(1);
    } finally {
      await app.close();
    }
  });

  it('disables Helmet CSP and allows GraphQL introspection in development mode', async () => {
    const dataDir = createSeededTempDir(tempDirs);
    process.env.DATA_DIR = dataDir;
    process.env.NODE_ENV = 'development';
    process.env.ADMIN_ORIGINS = '';

    const env = loadEnv(process.env);
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app, env);
    await app.init();

    try {
      const server = app.getHttpServer();
      const healthRes = await request(server).get('/health').expect(200);
      expect(healthRes.headers['x-content-type-options']).toBe('nosniff');
      expect(healthRes.headers['content-security-policy']).toBeUndefined();

      const introRes = await request(server)
        .post('/graphql')
        .send({ query: '{ __schema { queryType { name } } }' })
        .expect(200);
      expect(introRes.body.data.__schema.queryType.name).toBe('Query');
    } finally {
      await app.close();
    }
  });
});
