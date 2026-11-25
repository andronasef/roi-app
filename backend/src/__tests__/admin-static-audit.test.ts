import 'reflect-metadata';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { AppModule } from '../app.module';
import { loadEnv } from '../config/env';
import { resolveAdminDistDir, resolveBackendPath } from '../config/paths';
import { openBackendDatabase } from '../db/client';
import { configureApp } from '../main';
import { runSeed } from '../scripts/seed';

const INDEX_HTML = '<!doctype html><html><body><div id="root"></div></body></html>';

describe('Admin SPA static serving + GIS CSP (D-14, T-03-17, T-03-18)', () => {
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

  function tempDir(prefix: string): string {
    const dir = mkdtempSync(join(tmpdir(), prefix));
    tempDirs.push(dir);
    return dir;
  }

  async function bootApp(adminDistDir: string | null): Promise<NestExpressApplication> {
    const dataDir = tempDir('roi-admin-static-data-');
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
    process.env.DATA_DIR = dataDir;
    process.env.NODE_ENV = 'production';
    process.env.ADMIN_ORIGINS = '';

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>();
    configureApp(app, loadEnv(process.env), adminDistDir);
    await app.init();
    return app;
  }

  it('resolveAdminDistDir honours ADMIN_DIST_DIR only when it contains index.html', () => {
    const dist = tempDir('roi-admin-dist-');
    process.env.ADMIN_DIST_DIR = dist;
    // The monorepo ../admin/dist fallback may or may not be built; the env dir is empty here.
    expect(resolveAdminDistDir()).not.toBe(dist);
    writeFileSync(join(dist, 'index.html'), INDEX_HTML);
    expect(resolveAdminDistDir()).toBe(dist);
  });

  it('serves the SPA shell, history routes, immutable assets and 404s missing assets', async () => {
    const dist = tempDir('roi-admin-dist-');
    mkdirSync(join(dist, 'assets'));
    writeFileSync(join(dist, 'index.html'), INDEX_HTML);
    writeFileSync(join(dist, 'assets', 'app.js'), 'console.log(1);');

    const app = await bootApp(dist);
    try {
      const server = app.getHttpServer();

      // Production Helmet CSP carries the GIS allowances (T-03-17).
      const csp = (await request(server).get('/admin').expect(200)).headers[
        'content-security-policy'
      ];
      expect(csp).toContain('https://accounts.google.com/gsi/client');
      expect(csp).toContain('frame-src');
      expect(csp).toContain('https://accounts.google.com/gsi/');
      expect(csp).toContain("font-src 'self' data:");
      expect(csp).toContain('https://*.googleusercontent.com');

      for (const path of ['/admin', '/admin/verses', '/admin/suggestions/abc']) {
        const res = await request(server).get(path).expect(200);
        expect(res.text).toContain('<div id="root">');
        expect(res.headers['cache-control']).toBe('no-cache, no-store, must-revalidate');
      }

      const asset = await request(server).get('/admin/assets/app.js').expect(200);
      expect(asset.text).toBe('console.log(1);');
      expect(asset.headers['cache-control']).toContain('immutable');
      expect(asset.headers['cache-control']).toContain('max-age=31536000');

      // Missing asset must 404, not be masked by the SPA fallback (T-03-18).
      const missing = await request(server).get('/admin/assets/does-not-exist.js').expect(404);
      expect(missing.text).not.toContain('<div id="root">');

      // Non-admin routes unaffected.
      await request(server).get('/admin/').expect(200);
      await request(server).get('/health').expect(200);
    } finally {
      await app.close();
    }
  });

  it('mounts no /admin routes when the SPA is unbuilt', async () => {
    const app = await bootApp(null);
    try {
      await request(app.getHttpServer()).get('/admin').expect(404);
    } finally {
      await app.close();
    }
  });
});
