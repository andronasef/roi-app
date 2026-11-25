import 'reflect-metadata';
import { Injectable } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  contentKindSchema,
  seedContentFileSchema,
  snapshotEnvelopeSchema,
  submitSuggestionInputSchema,
} from '@roi/shared';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { loadEnv } from '../config/env';
import { resolveBackendPath, resolveBackendRoot } from '../config/paths';

@Injectable()
class InnerDependency {
  getValue(): string {
    return 'swc-di-ok';
  }
}

@Injectable()
class OuterService {
  constructor(private readonly inner: InnerDependency) {}

  read(): string {
    return this.inner.getValue();
  }
}

describe('backend Phase 2 foundation (SWC DI, shared schemas, env, paths)', () => {
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

  it('supports NestJS constructor DI with emitDecoratorMetadata under Vitest SWC', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [InnerDependency, OuterService],
    }).compile();

    const outer = moduleRef.get(OuterService);
    expect(outer.read()).toBe('swc-di-ok');
  });

  it('imports @roi/shared Phase 2 schemas cleanly in @roi/backend', () => {
    expect(contentKindSchema.parse('verse')).toBe('verse');
    expect(
      submitSuggestionInputSchema.parse({
        kind: 'blessing',
        title: 'بركة الصباح',
        text: 'سلام يا {الاسم}',
        verseRef: null,
      }).kind,
    ).toBe('blessing');
    expect(
      snapshotEnvelopeSchema.safeParse({
        type: 'verses',
        contentVersion: 1,
        generatedAt: 1_795_552_000_000,
        items: [],
      }).success,
    ).toBe(true);
    expect(
      seedContentFileSchema.safeParse({
        verses: [],
        namesOfGod: [],
        blessings: [],
      }).success,
    ).toBe(true);
  });

  it('loadEnv() applies defaults including roi-app-515721 Google client IDs, empty ADMIN_ORIGINS, and empty ADMIN_EMAILS', () => {
    const env = loadEnv({});
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3000);
    expect(env.DATA_DIR).toBe('./data');
    expect(env.ADMIN_ORIGINS).toEqual([]);
    expect(env.ADMIN_EMAILS).toEqual([]);
    expect(env.ADMIN_JWT_SECRET).toBeUndefined();
    expect(env.ADMIN_GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.GOOGLE_CLIENT_IDS).toEqual([
      '23662840492-h4j3v57k9dpm0suqa61qpkv7qh78qq9v.apps.googleusercontent.com',
      '23662840492-laqcbt3hkft72a3mu0ofcokeskr7sr7a.apps.googleusercontent.com',
    ]);
  });

  it('loadEnv() parses comma-separated ADMIN_ORIGINS, ADMIN_EMAILS, GOOGLE_CLIENT_IDS, PORT, DATA_DIR, and admin auth fields', () => {
    const env = loadEnv({
      NODE_ENV: 'production',
      PORT: '8080',
      DATA_DIR: '/data',
      ADMIN_ORIGINS: ' https://admin.roi.app , https://staging.roi.app/ ',
      ADMIN_EMAILS: ' Owner@Example.com , CoAdmin@Example.org , ',
      ADMIN_JWT_SECRET: '  super-secret-value-at-least-32-chars-long  ',
      ADMIN_GOOGLE_CLIENT_ID: '  web-client-override.apps.googleusercontent.com  ',
      GOOGLE_CLIENT_IDS: 'client-a, client-b',
    });
    expect(env.NODE_ENV).toBe('production');
    expect(env.PORT).toBe(8080);
    expect(env.DATA_DIR).toBe('/data');
    expect(env.ADMIN_ORIGINS).toEqual(['https://admin.roi.app', 'https://staging.roi.app/']);
    expect(env.ADMIN_EMAILS).toEqual(['owner@example.com', 'coadmin@example.org']);
    expect(env.ADMIN_JWT_SECRET).toBe('super-secret-value-at-least-32-chars-long');
    expect(env.ADMIN_GOOGLE_CLIENT_ID).toBe('web-client-override.apps.googleusercontent.com');
    expect(env.GOOGLE_CLIENT_IDS).toEqual(['client-a', 'client-b']);

    const blankOptional = loadEnv({
      ADMIN_JWT_SECRET: '   ',
      ADMIN_GOOGLE_CLIENT_ID: '',
    });
    expect(blankOptional.ADMIN_JWT_SECRET).toBeUndefined();
    expect(blankOptional.ADMIN_GOOGLE_CLIENT_ID).toBeUndefined();
  });

  it('loadEnv() rejects invalid PORT, NODE_ENV, or empty DATA_DIR', () => {
    expect(() => loadEnv({ PORT: 'not-a-port' })).toThrow();
    expect(() => loadEnv({ PORT: '0' })).toThrow();
    expect(() => loadEnv({ NODE_ENV: 'staging' })).toThrow();
    expect(() => loadEnv({ DATA_DIR: '   ' })).toThrow();
  });

  it('resolveBackendRoot() resolves backend workspace root in Vitest ESM and honors BACKEND_ROOT override', () => {
    const root = resolveBackendRoot();
    expect(resolve(root)).toBe(resolve(__dirname, '../..'));
    expect(resolveBackendPath('drizzle')).toBe(join(root, 'drizzle'));

    const customDir = mkdtempSync(join(tmpdir(), 'roi-backend-root-'));
    tempDirs.push(customDir);
    mkdirSync(join(customDir, 'drizzle'), { recursive: true });
    writeFileSync(join(customDir, 'package.json'), '{"name":"@roi/backend"}');
    process.env.BACKEND_ROOT = customDir;

    expect(resolveBackendRoot()).toBe(resolve(customDir));
    expect(resolveBackendPath('seed', 'initial-content.json')).toBe(
      join(resolve(customDir), 'seed', 'initial-content.json'),
    );
  });
});
